/**
 * Simulierter Nutzer — echte Interview-Sessions statt konservierter Frage-Antwort-Paare.
 *
 * WARUM DIESES SKRIPT EXISTIERT
 * -----------------------------
 * `data/eval/pipeline-korpus.json` enthaelt 25 handautorisierte Interviews als FIXE
 * Frage-Antwort-Paare. Fuer alles, was NACH dem Interview passiert (Pipeline, Finanzplan,
 * Gutachterurteil), ist das genau richtig: identischer Input, vergleichbare Messung.
 *
 * Fuer Aenderungen AM INTERVIEW ist es wertlos. Schaerft man den Interviewer, stellt er
 * andere Fragen — bekommt aber dieselben vorkonservierten Antworten zurueck. Die Messung
 * danach zeigt dasselbe wie vorher. Ein Gate, das gruen luegt (Baseline-Eintrag 30.07.,
 * Abschnitt "Messgrenze").
 *
 * Dieses Skript schliesst die Luecke: ein Modell spielt die Schule, antwortet aus einem
 * eingefrorenen Personenprofil und laeuft gegen die ECHTEN Interview-Routen. Damit
 * entstehen echte Sessions in der Datenbank — mit den Fragen, die der aktuelle Stand von
 * `lib/wizard/prompts.ts` wirklich stellt.
 *
 * DIE DREI SCHRITTE
 * -----------------
 *   profil    Baut aus den 25 Korpus-Eintraegen je ein Personenprofil und friert es in
 *             `data/eval/simuser-profile.json` ein. Einmalig, danach unveraendert —
 *             sonst vergleicht man spaeter zwei verschiedene Personen miteinander.
 *   lauf      Fuehrt Interviews gegen /api/wizard/start + /api/wizard/answer.
 *             Schreibt Sessions nach `data/eval/simuser-runs/<label>/` und einen
 *             Korpus im pipeline-korpus-Format daneben.
 *   korpus    Erzeugt diesen Korpus aus einem gespeicherten Lauf neu — ohne die
 *             25 Interviews noch einmal zu fahren.
 *   bericht   Deterministische Ausbeute-Metriken; mit --vergleich <label> als Diff.
 *
 * WAS DAS PROFIL DARF UND WAS NICHT
 * ---------------------------------
 * Das Profil enthaelt MEHR als der Korpus-Eintrag: eine Schulleitung weiss Dinge ueber
 * ihre Schule, die im urspruenglichen Interview nie erfragt wurden. Ohne dieses
 * Zusatzwissen koennte eine schaerfere Frage per Definition nichts zutage foerdern —
 * die Messung waere nach oben gedeckelt.
 *
 * Der Preis dafuer ist eine harte Regel: Zusatzwissen darf NIE einem Nichtwissen aus dem
 * Korpus widersprechen. Wer im Korpus sagt "keine Ahnung, was das kostet", bekommt keine
 * Kostenschaetzung ins Profil. Sonst misst man am Ende nur, dass ein williger Automat
 * Zahlen nachliefert, die eine echte Schule nicht haette. Der Befehl `profil` prueft das
 * deterministisch und bricht bei Verstoessen ab.
 *
 * LAUF
 * ----
 *   npx tsx --env-file=.env.local scripts/eval-simuser.ts profil
 *   npx tsx --env-file=.env.local scripts/eval-simuser.ts lauf --label vorher --base http://localhost:3101
 *   npx tsx --env-file=.env.local scripts/eval-simuser.ts bericht --label nachher --vergleich vorher
 *
 * Exit-Codes: 0 ok · 1 inhaltliche Verletzung (Profil-Widerspruch, Zahlen-Leck) · 2 CLI/Setup.
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import OpenAI from "openai";
import type { WizardFacts } from "../lib/wizard/types";
import { analysiereTiefe, tiefeQuote, zahlAngaben, zahlKern } from "../lib/wizard/facts-tiefe";
import type { TiefeBefund, TiefeId } from "../lib/wizard/facts-tiefe";

const execFile = promisify(execFileCb);

const REPO = resolve(__dirname, "..");
const KORPUS_PATH = resolve(REPO, "data/eval/pipeline-korpus.json");
const PROFIL_PATH = resolve(REPO, "data/eval/simuser-profile.json");
const RUNS_DIR = resolve(REPO, "data/eval/simuser-runs");
const LOG = "[simuser]";

// ============================================================================
// Typen
// ============================================================================

interface KorpusMessage {
  role: "ai" | "user";
  kind: "question" | "answer" | "note";
  content: string;
}

interface KorpusEintrag {
  id: string;
  category: string;
  programmId: string;
  schulProfil: Record<string, unknown>;
  userAnswers: KorpusMessage[];
  facts: WizardFacts;
  expected_forbidden_markers: Array<{ marker: string; description: string }>;
  expected_geber_gruppe: string;
  notes?: string;
}

export interface SimProfil {
  id: string;
  programmId: string;
  kategorie: string;
  schule: Record<string, unknown>;
  /** Wer spricht — Schulleitung, Lehrkraft, Vereinsvorstand. */
  rolle: string;
  /** Sprachregister dieser Person, aus der Korpus-Kategorie abgeleitet. */
  stil: string;
  /** Fakten, die im Korpus-Eintrag stehen. Unveraendert uebernommen. */
  belegt: string[];
  /** Zusatzwissen der Person, das im Korpus nie erfragt wurde. */
  hintergrund: string[];
  /** Was diese Person ausdruecklich NICHT weiss. Bindend fuer die Simulation. */
  nichtWissen: string[];
}

interface ProfilDatei {
  version: number;
  erzeugtAm: string;
  modell: string;
  quelle: string;
  profile: SimProfil[];
}

interface LaufEintrag {
  id: string;
  programmId: string;
  kategorie: string;
  sessionToken: string;
  phase: string;
  turns: number;
  maxQuestions: number;
  messages: KorpusMessage[];
  facts: WizardFacts;
  dauerMs: number;
  /** Zahlen in den Simulanten-Antworten, die im Profil keine Deckung haben. */
  zahlenLeck: string[];
  /**
   * Antwort-Runden, nach denen sich die Faktentabelle NICHT veraendert hat.
   *
   * Das ist der Detektor gegen eine stille Messverfaelschung: `extractFacts` faengt
   * seine Fehler selbst ab und behaelt bei einem 429 des Anbieters kommentarlos den
   * alten Stand (lib/wizard/facts-extractor.ts). Im ersten Lauf sind so 23 von rund
   * 280 Extraktionen ausgefallen — 13 Interviews endeten mit leerer Faktentabelle,
   * obwohl 12 Fragen beantwortet worden waren. Ohne diese Zahl waere daraus ein
   * Befund ueber die Fragenqualitaet geworden statt einer Anbieter-Drosselung.
   */
  stagnation: number;
  fehler?: string;
}

interface LaufMeta {
  label: string;
  erzeugtAm: string;
  base: string;
  commitSha: string;
  dirty: boolean;
  simModell: string;
  n: number;
}

// ============================================================================
// LLM — der Simulant laeuft ueber Mistral (EU), wie das Produkt selbst.
// ============================================================================

const MISTRAL_BASE = "https://api.mistral.ai/v1";

function mistral(): OpenAI {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    console.error(`${LOG} MISTRAL_API_KEY fehlt — mit --env-file=.env.local starten.`);
    process.exit(2);
  }
  return new OpenAI({ apiKey: key, baseURL: MISTRAL_BASE, timeout: 180_000 });
}

async function mitRetry<T>(label: string, fn: () => Promise<T>, versuche = 4): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= versuche; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      // 429 ist bei parallelen Laeufen der Normalfall — laenger warten, nicht aufgeben.
      const rateLimit = /429|rate.?limit|capacity/i.test(msg);
      const warte = rateLimit ? 6000 * i : 1500 * i;
      console.warn(`${LOG} ${label} Versuch ${i}/${versuche}: ${msg.slice(0, 160)}`);
      if (i < versuche) await new Promise((r) => setTimeout(r, warte));
    }
  }
  throw last;
}

// ============================================================================
// Schritt 1 — Profilbau
// ============================================================================

const PROFILBAU_SYSTEM = `Du baust aus einem geprueften Testdatensatz ein PERSONENPROFIL fuer einen simulierten Interview-Teilnehmer.

## Wozu
Eine Testperson soll in einem Interview realistisch antworten koennen — auch auf Fragen, die im
Ausgangsdatensatz nie gestellt wurden. Dafuer braucht sie mehr als die dort protokollierten Saetze:
sie braucht das Wissen, das eine Schulleitung ueber die eigene Schule nun einmal hat.

## Zwei Sorten Wissen, streng getrennt
"belegt"      Steht woertlich oder direkt ableitbar im Ausgangsdatensatz. Uebernimm es unveraendert —
              vor allem Zahlen, Namen und Zeitangaben. Ein Punkt pro Fakt, knapp und konkret.
"hintergrund" Zusaetzliches Wissen, das diese Person ueber ihre Schule plausibel haette, das im
              Datensatz aber nie erfragt wurde. AUSSCHLIESSLICH in diesen fuenf Bereichen:
                1. Ist-Zahlen zum Bedarf (wie viele Kinder/Klassen sind betroffen, seit wann)
                2. Kosten und Mengen je Posten (grobe Hausnummern, Stueckzahlen, Stundenumfaenge)
                3. Wer und Wann (Zustaendigkeiten im Kollegium, Ablauf ueber das Schuljahr)
                4. Ausgangswert und Zielwert je Indikator (womit gemessen, Stand heute, Ziel)
                5. Beschluesse und Zusagen des Traegers (Gremien, Vereinbarungen, Gespraechsstand)

## Harte Regeln
1. "hintergrund" darf NIEMALS einem Punkt aus "nichtWissen" widersprechen. Wer im Datensatz sagt
   "keine Ahnung, was das kostet", bekommt KEINE Kostenschaetzung ins Hintergrundwissen — auch keine
   vage. Das ist die wichtigste Regel hier: sie unterscheidet eine realistische Testperson von einem
   Automaten, der auf jede Frage brav eine Zahl liefert.
2. "nichtWissen" muss JEDE Nichtwissens-Aeusserung des Datensatzes abbilden ("weiss ich nicht",
   "keine Ahnung", "muesste ich nachfragen", "haben wir noch nicht drueber nachgedacht", "glaub ich
   nicht"). Formuliere sie als Sachaussage: "Weiss nicht, ob es ein Medienkonzept gibt."
3. Erfinde nichts, was der Datensatz ausschliesst. Wer sagt "kein Beschluss vorhanden", hat keinen.
4. Zahlen im Hintergrundwissen muessen zum Schulprofil passen (eine Schule mit 312 Kindern hat keine
   40 Klassen und kein Budget von 2 Millionen).
5. Halte die Umfangsgrenze ein, die im Auftrag steht. Sie ist keine Empfehlung: eine Person aus
   einem "vag"-Fall, die ploetzlich zu allem Zahlen liefert, ist nicht mehr derselbe Testfall.

## Selbstpruefung vor der Ausgabe
Geh deine "hintergrund"-Liste Punkt fuer Punkt durch und streiche jeden, zu dem in "nichtWissen"
etwas zum selben Gegenstand steht. Beispiel fuer den Fehler, den es zu vermeiden gilt:
  nichtWissen: "Weiss nicht, wie viele Tablets aus DigitalPakt 1 angeschafft wurden."
  hintergrund: "Die Tablets sind etwa 30 Stueck."   <- FALSCH, streichen.

## Ausgabe
AUSSCHLIESSLICH valides JSON, kein Markdown-Fence. Alle drei Listen enthalten NUR Zeichenketten,
keine Objekte:
{
  "rolle": "Schulleiterin | Lehrkraft | Vereinsvorstand | ...",
  "stil": "1-2 Saetze, wie diese Person spricht (Satzlaenge, Sicherheit, Fuellwoerter)",
  "belegt": ["..."],
  "hintergrund": ["..."],
  "nichtWissen": ["..."]
}`;

/**
 * Umfangsgrenzen je Korpus-Kategorie.
 *
 * Die Obergrenze schuetzt den Kontrast zwischen den Kategorien: Der Gutachter-Befund vom
 * 30.07. lebt davon, dass "vag" (3,00) und "hochwertig" (4,13) verschiedene Faelle sind.
 * Wuerde die vage Person ploetzlich zu allem Auskunft geben, verschwaende der Unterschied
 * — und mit ihm die Aussage, dass das Produkt bei guter Faktenlage im Zielkorridor liegt.
 *
 * Die Untergrenze bei nichtWissen sichert die Gegenrichtung: eine Person, die im Korpus
 * auf fast alles "weiss nicht" antwortet, muss diese Luecken behalten.
 *
 * Warum "vag" trotzdem 5 statt 0 Hintergrundpunkte bekommt: Auch wer nichts ueber
 * Foerderverfahren weiss, kennt die eigene Schule — Klassenzahl, ungefaehre Groessen,
 * wer sich um was kuemmert. Genau dieses Wissen war im Korpus nie erfragt worden. Ohne
 * es waere die Messung nach oben gedeckelt und eine schaerfere Frage koennte per
 * Konstruktion nichts zutage foerdern.
 */
const UMFANG: Record<string, { hg: number; nw: number }> = {
  vag: { hg: 5, nw: 5 },
  mittel: { hg: 9, nw: 3 },
  hochwertig: { hg: 14, nw: 1 },
};
const UMFANG_DEFAULT = { hg: 14, nw: 1 };

function buildProfilPrompt(e: KorpusEintrag): string {
  const dialog = e.userAnswers
    .map((m) => (m.role === "ai" ? `FRAGE: ${m.content}` : `ANTWORT: ${m.content}`))
    .join("\n");
  const g = UMFANG[e.category] ?? UMFANG_DEFAULT;
  return `KATEGORIE DES DATENSATZES: ${e.category}
UMFANGSGRENZE FUER DIESEN FALL: hoechstens ${g.hg} Punkte in "hintergrund", mindestens ${g.nw} Punkte in "nichtWissen".

SCHULPROFIL (unveraenderlich, so uebernehmen):
${JSON.stringify(e.schulProfil, null, 1)}

PROTOKOLLIERTES INTERVIEW:
${dialog}

VON HAND GEPRUEFTE FAKTENLAGE ZU DIESEM FALL:
${JSON.stringify(e.facts, null, 1)}

${e.notes ? `ANMERKUNG DER TESTDATEN-PFLEGE: ${e.notes}\n` : ""}
Baue das Personenprofil gemaess Schema.`;
}

/** Zweiter Anlauf: die Befunde der Pruefung zurueckgeben und gezielt korrigieren lassen. */
function buildReparaturPrompt(e: KorpusEintrag, p: SimProfil, pr: ProfilPruefung): string {
  const g = UMFANG[e.category] ?? UMFANG_DEFAULT;
  const zeilen: string[] = [];
  if (pr.widersprueche.length) {
    zeilen.push(
      `WIDERSPRUECHE (streiche jeden dieser hintergrund-Punkte ersatzlos — die Person weiss das nicht):`
    );
    for (const w of pr.widersprueche) {
      zeilen.push(`  - hintergrund: "${w.hintergrund}"`);
      zeilen.push(`    kollidiert mit nichtWissen: "${w.nichtWissen}"`);
    }
  }
  if (pr.budgetVerletzung) {
    zeilen.push(
      `UMFANG: ${pr.budgetVerletzung}. Kuerze "hintergrund" auf hoechstens ${g.hg} Punkte —` +
        ` behalte die, die eine Schulleitung am selbstverstaendlichsten parat haette,` +
        ` und streiche zuerst alles Rechnerische und Verfahrenskundliche.`
    );
  }
  return `Du hast fuer diesen Testfall bereits ein Profil gebaut. Die maschinelle Pruefung hat Fehler gefunden.

BISHERIGES PROFIL:
${JSON.stringify({ rolle: p.rolle, stil: p.stil, belegt: p.belegt, hintergrund: p.hintergrund, nichtWissen: p.nichtWissen }, null, 1)}

BEFUNDE:
${zeilen.join("\n")}

Gib das KORRIGIERTE Profil im selben JSON-Schema aus. "belegt" und "nichtWissen" bleiben unveraendert,
ausser ein Punkt steht doppelt drin. Aendere nur, was die Befunde verlangen.`;
}

/** Bedeutungstragende Wortstaemme — fuer den Widerspruchs-Abgleich. */
const STOPP = new Set([
  "nicht", "keine", "kein", "weiss", "ahnung", "genau", "wirklich", "vielleicht", "eigentlich",
  "irgendwie", "schule", "unsere", "unser", "haben", "hatten", "koennen", "wuerde", "wurde",
  "muessen", "muesste", "sollte", "werden", "worden", "diese", "dieser", "dieses", "damit",
  "dafuer", "davon", "darueber", "noch", "schon", "aber", "oder", "auch", "sehr", "mehr",
]);

/**
 * Modelle liefern in Listen gelegentlich Objekte statt Zeichenketten (gesehen bei
 * pv-res-003: `{bereich, punkt}`). Ohne Vereinheitlichung crasht jede spaetere
 * Textpruefung — und zwar erst, nachdem die Datei schon geschrieben ist.
 */
function alsTextliste(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const kern = o.punkt ?? o.text ?? o.fakt ?? o.inhalt;
        if (typeof kern === "string") return kern;
        return Object.values(o).filter((y) => typeof y === "string").join(" — ");
      }
      return String(x ?? "");
    })
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function stichwoerter(s: string): Set<string> {
  const n = s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]/g, " ");
  return new Set(
    n.split(/\s+/).filter((w) => w.length >= 5 && !STOPP.has(w)).map((w) => w.slice(0, 8))
  );
}

function ueberschneidung(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

const NICHTWISSEN_MUSTER =
  /weiss (?:ich )?nicht|weiß (?:ich )?nicht|keine ahnung|muesste ich|müsste ich|müssten wir|muessten wir|glaub(?:e)? ich nicht|bin (?:mir )?nicht sicher|noch nicht (?:drueber |darüber )?nachgedacht|nichts konkretes|kenne ich nicht|liegt (?:schriftlich )?nichts vor|gibt es (?:glaube ich )?nicht/i;

interface ProfilPruefung {
  id: string;
  widersprueche: Array<{ hintergrund: string; nichtWissen: string }>;
  fehlendeNichtwissen: string[];
  budgetVerletzung: string | null;
}

/**
 * Deterministische Pruefung des erzeugten Profils. Der wichtigste Punkt ist der
 * Widerspruchs-Check: ein Hintergrundfakt, der ein Nichtwissen ueberschreibt, macht
 * aus der Testperson einen Automaten und die ganze Messung wertlos.
 */
export function pruefeProfil(p: SimProfil, e: KorpusEintrag): ProfilPruefung {
  const nwSets = p.nichtWissen.map((x) => ({ text: x, w: stichwoerter(x) }));

  const widersprueche: Array<{ hintergrund: string; nichtWissen: string }> = [];
  for (const h of p.hintergrund) {
    const hw = stichwoerter(h);
    for (const nw of nwSets) {
      if (ueberschneidung(hw, nw.w) >= 2) {
        widersprueche.push({ hintergrund: h, nichtWissen: nw.text });
        break;
      }
    }
  }

  // Jede Nichtwissens-Antwort des Korpus muss sich im Profil wiederfinden. Abgeglichen
  // wird gegen die FRAGE, auf die sie fiel — die traegt das Thema, die Antwort selbst
  // besteht meist nur aus Fuellwoertern ("keine Ahnung, irgendwie").
  const fehlendeNichtwissen: string[] = [];
  for (let i = 0; i < e.userAnswers.length; i++) {
    const m = e.userAnswers[i];
    if (m.role !== "user" || !NICHTWISSEN_MUSTER.test(m.content)) continue;
    const frage = [...e.userAnswers.slice(0, i)].reverse().find((x) => x.role === "ai");
    if (!frage) continue;
    const fw = stichwoerter(frage.content);
    const gedeckt = nwSets.some((nw) => ueberschneidung(fw, nw.w) >= 1);
    if (!gedeckt) fehlendeNichtwissen.push(frage.content.slice(0, 90));
  }

  const g = UMFANG[e.category] ?? UMFANG_DEFAULT;
  let budgetVerletzung: string | null = null;
  if (p.hintergrund.length > g.hg) {
    budgetVerletzung = `${p.hintergrund.length} Hintergrund-Punkte (max ${g.hg} fuer "${e.category}")`;
  } else if (p.nichtWissen.length < g.nw) {
    budgetVerletzung = `${p.nichtWissen.length} nichtWissen-Punkte (min ${g.nw} fuer "${e.category}")`;
  }

  return { id: p.id, widersprueche, fehlendeNichtwissen, budgetVerletzung };
}

async function befehlProfil(flags: Flags): Promise<number> {
  const korpus = JSON.parse(await readFile(KORPUS_PATH, "utf8")) as KorpusEintrag[];
  const auswahl = filterKorpus(korpus, flags);

  let vorhanden: ProfilDatei | null = null;
  if (existsSync(PROFIL_PATH)) {
    vorhanden = JSON.parse(await readFile(PROFIL_PATH, "utf8")) as ProfilDatei;
  }
  const cache = new Map<string, SimProfil>((vorhanden?.profile ?? []).map((p) => [p.id, p]));

  const client = mistral();
  const profile: SimProfil[] = [];

  for (const [i, e] of auswahl.entries()) {
    if (!flags.refresh && cache.has(e.id)) {
      profile.push(cache.get(e.id)!);
      console.log(`${LOG} ${i + 1}/${auswahl.length} ${e.id}: aus Cache`);
      continue;
    }
    const baue = async (userPrompt: string): Promise<SimProfil> => {
      const roh = await mitRetry(`profil ${e.id}`, async () => {
        const res = await client.chat.completions.create({
          model: flags.profilModell,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: PROFILBAU_SYSTEM },
            { role: "user", content: userPrompt },
          ],
        });
        const t = (res.choices[0]?.message?.content ?? "").trim();
        return JSON.parse(t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")) as Record<
          string,
          unknown
        >;
      });
      return {
        id: e.id,
        programmId: e.programmId,
        kategorie: e.category,
        schule: e.schulProfil,
        rolle: typeof roh.rolle === "string" ? roh.rolle : "Schulleitung",
        stil: typeof roh.stil === "string" ? roh.stil : "",
        belegt: alsTextliste(roh.belegt),
        hintergrund: alsTextliste(roh.hintergrund),
        nichtWissen: alsTextliste(roh.nichtWissen),
      };
    };

    // Bauen, pruefen, gezielt nachbessern. Zwei Anlaeufe: der erste Durchgang setzt
    // die Widerspruchsfreiheit erfahrungsgemaess nicht durch (das Modell schreibt
    // "weiss nicht, wie viele Tablets" und drei Zeilen weiter "etwa 30 Stueck"),
    // mit den konkreten Befunden im Prompt raeumt es das zuverlaessig auf.
    let p = await baue(buildProfilPrompt(e));
    let pr = pruefeProfil(p, e);
    for (let versuch = 1; versuch <= 2 && (pr.widersprueche.length || pr.budgetVerletzung); versuch++) {
      console.log(
        `${LOG}   ${e.id}: Nachbesserung ${versuch} — ${pr.widersprueche.length} Widerspruch/Widersprueche` +
          `${pr.budgetVerletzung ? `, ${pr.budgetVerletzung}` : ""}`
      );
      const korrigiert = await baue(buildReparaturPrompt(e, p, pr));
      const prNeu = pruefeProfil(korrigiert, e);
      // Nur uebernehmen, wenn es wirklich besser wird — sonst haette eine misslungene
      // Nachbesserung ein brauchbares Profil verschlechtert.
      const besser =
        prNeu.widersprueche.length < pr.widersprueche.length ||
        (prNeu.widersprueche.length === pr.widersprueche.length &&
          !prNeu.budgetVerletzung &&
          !!pr.budgetVerletzung);
      if (!besser) break;
      p = korrigiert;
      pr = prNeu;
    }

    profile.push(p);
    console.log(
      `${LOG} ${i + 1}/${auswahl.length} ${e.id} (${e.category}): ${p.belegt.length} belegt · ${p.hintergrund.length} hintergrund · ${p.nichtWissen.length} nichtWissen` +
        (pr.widersprueche.length ? ` · ❌ ${pr.widersprueche.length} Widerspruch verbleibt` : "")
    );
  }

  // Nicht neu gebaute Profile unveraendert mitschreiben — die Datei bleibt vollstaendig.
  const ids = new Set(profile.map((p) => p.id));
  for (const p of vorhanden?.profile ?? []) if (!ids.has(p.id)) profile.push(p);
  profile.sort((a, b) => a.id.localeCompare(b.id));

  const datei: ProfilDatei = {
    version: 1,
    erzeugtAm: new Date().toISOString(),
    modell: flags.profilModell,
    quelle: "data/eval/pipeline-korpus.json",
    profile,
  };
  await writeFile(PROFIL_PATH, JSON.stringify(datei, null, 2) + "\n", "utf8");
  console.log(`${LOG} geschrieben: ${PROFIL_PATH} (${profile.length} Profile)`);

  // Pruefung ueber ALLE Profile, nicht nur die neu gebauten.
  const korpusById = new Map(korpus.map((e) => [e.id, e]));
  const pruefungen = profile
    .filter((p) => korpusById.has(p.id))
    .map((p) => pruefeProfil(p, korpusById.get(p.id)!));

  const mitWiderspruch = pruefungen.filter((x) => x.widersprueche.length > 0);
  const mitLuecke = pruefungen.filter((x) => x.fehlendeNichtwissen.length > 0);
  const mitBudget = pruefungen.filter((x) => x.budgetVerletzung);

  console.log(`\n${LOG} ===== Profil-Pruefung =====`);
  console.log(`${LOG}   Profile: ${pruefungen.length}`);
  console.log(`${LOG}   Widerspruch Hintergrund vs. nichtWissen: ${mitWiderspruch.length}  (HART)`);
  console.log(`${LOG}   Korpus-Nichtwissen ohne Entsprechung:    ${mitLuecke.length}  (Hinweis)`);
  console.log(`${LOG}   Umfangsgrenze verletzt:                  ${mitBudget.length}  (Hinweis)`);

  for (const x of mitWiderspruch) {
    console.error(`${LOG}   ❌ ${x.id}`);
    for (const w of x.widersprueche) {
      console.error(`${LOG}        hintergrund: ${w.hintergrund}`);
      console.error(`${LOG}        nichtWissen: ${w.nichtWissen}`);
    }
  }
  for (const x of mitLuecke) {
    console.warn(`${LOG}   ⚠️  ${x.id}: ${x.fehlendeNichtwissen.length} Nichtwissen ohne Entsprechung`);
    for (const f of x.fehlendeNichtwissen.slice(0, 3)) console.warn(`${LOG}        zur Frage: ${f}`);
  }
  for (const x of mitBudget) console.warn(`${LOG}   ⚠️  ${x.id}: ${x.budgetVerletzung}`);

  if (mitWiderspruch.length > 0) {
    console.error(
      `\n${LOG} ABBRUCH: Hintergrundwissen widerspricht dem Nichtwissen. Diese Profile wuerden` +
        ` messen, dass ein williger Automat Zahlen nachliefert — nicht, dass das Interview besser fragt.` +
        ` Betroffene Eintraege von Hand korrigieren oder mit --refresh --only=<id> neu bauen.`
    );
    return 1;
  }
  return 0;
}

// ============================================================================
// Schritt 2 — Interview gegen die echten Routen
// ============================================================================

const SIMUSER_SYSTEM = `Du spielst eine reale Person und antwortest in einem Interview, das ein Antragsassistent mit dir fuehrt. Du gibst GENAU EINE Antwort auf die zuletzt gestellte Frage.

## Deine Wissensakte ist die einzige Wirklichkeit
- Alles, was du weisst, steht in deiner Wissensakte. Darueber hinaus existiert nichts.
- Steht die Antwort nicht in der Akte, dann weisst du es NICHT. Sag das so, wie diese Person es sagen
  wuerde — nicht als Fehlermeldung, sondern im eigenen Ton ("da muesste ich nachfragen", "das haben
  wir noch nicht durchgerechnet").
- Was unter NICHT BEKANNT steht, weisst du auch dann nicht, wenn die Frage noch so direkt danach
  fragt oder eine Schaetzung erbittet. Kein "ungefaehr", kein "so in etwa".
- Erfinde NIEMALS Zahlen, Betraege, Namen, Daten, Beschluesse oder Partner, die nicht in der Akte
  stehen. Lieber "weiss ich nicht" als eine plausible Zahl.
- Du widersprichst nie dem, was du frueher im Gespraech gesagt hast.

## Wie du antwortest
- Du antwortest auf DIE GESTELLTE FRAGE. Nicht auf andere, nicht vorsorglich auf alles. Wonach nicht
  gefragt wurde, bleibt ungesagt — auch wenn es in der Akte steht.
- Wird konkret nach einer Zahl, einem Zeitpunkt oder einer Zustaendigkeit gefragt und die Akte hat
  sie: nenne sie. Wird nur allgemein gefragt, antwortest du auch allgemein.
- Laenge: 1 bis 5 Saetze. Gesprochene Sprache, kein Formular.
- Keine Aufzaehlungszeichen, keine Ueberschriften, keine Meta-Kommentare ueber diese Aufgabe.
- Gib NUR die Antwort aus.`;

function buildSimuserPrompt(p: SimProfil, verlauf: KorpusMessage[], frage: string): string {
  const bisher = verlauf.length
    ? verlauf
        .map((m) => (m.role === "ai" ? `Gefragt wurde: ${m.content}` : `Du hast geantwortet: ${m.content}`))
        .join("\n")
    : "(noch nichts — das ist die erste Frage)";

  return `DU BIST: ${p.rolle}

DEINE SCHULE:
${JSON.stringify(p.schule, null, 1)}

DEIN SPRACHSTIL: ${p.stil}

WISSENSAKTE — was du sicher weisst:
${p.belegt.map((x) => `- ${x}`).join("\n") || "- (nichts weiter)"}

WISSENSAKTE — was du ausserdem ueber deine Schule weisst, wenn jemand danach fragt:
${p.hintergrund.map((x) => `- ${x}`).join("\n") || "- (nichts weiter)"}

NICHT BEKANNT — das weisst du nicht, egal wie gefragt wird:
${p.nichtWissen.map((x) => `- ${x}`).join("\n") || "- (nichts)"}

BISHERIGES GESPRAECH:
${bisher}

AKTUELLE FRAGE AN DICH:
${frage}

Antworte als diese Person, nur auf diese Frage.`;
}

/**
 * Zahlen-Leck: Zahlangaben in den Antworten des Simulanten, fuer die es im Profil
 * keine Deckung gibt. Ein Leck heisst, die Simulation erfindet Fakten — dann misst
 * der ganze Lauf die Auskunftsfreude eines Modells statt die Qualitaet der Fragen.
 */
export function findeZahlenLeck(antworten: string[], p: SimProfil): string[] {
  const quelle = [
    JSON.stringify(p.schule),
    ...p.belegt,
    ...p.hintergrund,
  ].join(" ");
  const erlaubt = new Set(
    zahlAngaben(quelle).map(zahlKern).filter((n): n is number => n !== null)
  );
  const leck: string[] = [];
  for (const a of antworten) {
    for (const z of zahlAngaben(a)) {
      const kern = zahlKern(z);
      // Kleine Zaehlwoerter ("zwei", "3 Klassen") sind Alltagssprache, keine Faktenerfindung;
      // erst ab 10 wird eine Zahl zur pruefbaren Angabe.
      if (kern === null || kern < 10) continue;
      if (!erlaubt.has(kern)) leck.push(z.trim());
    }
  }
  return [...new Set(leck)];
}

interface StartAntwort {
  sessionToken: string;
  phase: string;
  question: { content: string; rationale?: string } | null;
  ready: { summary: string } | null;
  totalQuestions: number;
  maxQuestions: number;
  facts: WizardFacts;
}

/**
 * Jede simulierte Schule bekommt eine eigene Absenderadresse.
 *
 * Ohne das laufen alle 25 Interviews aus einer IP in denselben Rate-Limit-Bucket
 * (`wizard`, 200 Aufrufe/Stunde in lib/rate-limit.ts). Ein Lauf braucht rund 550 —
 * beim ersten Versuch sind daran 12 von 25 Interviews gescheitert. Das Limit ist
 * richtig, es modelliert eine einzelne Schule; nur sind 25 Schulen eben 25 Clients.
 *
 * Adressen aus 203.0.113.0/24 (RFC 5737, ausdruecklich fuer Dokumentation und Tests
 * reserviert) — sie koennen niemandem gehoeren. `getClientIP` liest den X-Forwarded-For
 * von rechts und nimmt die erste oeffentliche Adresse; lokal ohne Proxy ist das genau
 * diese. In Produktion haengt nginx die echte Client-Adresse rechts an, ein
 * mitgeschickter Wert wird dort also nicht wirksam.
 */
function testAdresse(index: number): string {
  return `203.0.113.${(index % 250) + 1}`;
}

async function postJson<T>(url: string, body: unknown, ip?: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ip ? { "X-Forwarded-For": ip } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${url} — ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as T;
}

async function fuehreInterview(
  p: SimProfil,
  flags: Flags,
  client: OpenAI,
  index: number
): Promise<LaufEintrag> {
  const t0 = Date.now();
  const ip = testAdresse(index);
  const verlauf: KorpusMessage[] = [];
  const antworten: string[] = [];

  const start = await mitRetry(`start ${p.id}`, () =>
    postJson<StartAntwort>(
      `${flags.base}/api/wizard/start`,
      { programmId: p.programmId, seedFacts: { schule: p.schule } },
      ip
    )
  );

  let phase = start.phase;
  let frage = start.question?.content ?? null;
  let facts = start.facts;
  let turns = 0;
  let stagnation = 0;
  const maxQuestions = start.maxQuestions;
  if (frage) verlauf.push({ role: "ai", kind: "question", content: frage });

  // Harte Obergrenze unabhaengig von maxQuestions: eine Fehlfunktion im Interviewer
  // darf nicht in eine Endlosschleife auf Kosten des LLM-Budgets laufen.
  const HARTE_GRENZE = 20;

  while (frage && phase === "interviewing" && turns < HARTE_GRENZE) {
    // Antwort erzeugen und SOFORT gegen das Profil pruefen. Ohne diese Schleife
    // erfindet der Simulant Zahlen ("28 der 45 Lehrkraefte", "Luecke von 25.000 EUR")
    // — und dann belohnt die Messung eine schaerfere Frage genau dafuer, dass sie dem
    // Modell mehr Gelegenheit zum Erfinden gibt. Deshalb wird die Erfindung benannt
    // und neu formuliert, statt sie hinterher nur zu zaehlen.
    const basisPrompt = buildSimuserPrompt(p, verlauf.slice(0, -1), frage!);
    let antwort = "";
    let korrekturPrompt = basisPrompt;
    for (let versuch = 0; versuch <= 2; versuch++) {
      antwort = await mitRetry(`sim ${p.id} #${turns + 1}`, async () => {
        const res = await client.chat.completions.create({
          model: flags.simModell,
          temperature: flags.temperatur,
          messages: [
            { role: "system", content: SIMUSER_SYSTEM },
            { role: "user", content: korrekturPrompt },
          ],
        });
        const t = (res.choices[0]?.message?.content ?? "").trim();
        if (!t) throw new Error("leere Antwort des Simulanten");
        return t;
      });
      const erfunden = findeZahlenLeck([antwort], p);
      if (erfunden.length === 0) break;
      korrekturPrompt = `${basisPrompt}

DEIN ENTWURF WAR:
"${antwort}"

DARIN STEHEN ZAHLEN, DIE NICHT IN DEINER WISSENSAKTE VORKOMMEN: ${erfunden.join(", ")}.
Diese Zahlen kennst du nicht — auch nicht ungefaehr, auch nicht als Rechnung aus anderen Zahlen.
Formuliere die Antwort neu: nenne nur Zahlen, die woertlich in der Akte stehen, und sag beim Rest
in deinen eigenen Worten, dass du das nicht genau weisst.`;
    }

    verlauf.push({ role: "user", kind: "answer", content: antwort });
    antworten.push(antwort);
    turns++;

    const res = await mitRetry(`answer ${p.id} #${turns}`, () =>
      postJson<StartAntwort>(
        `${flags.base}/api/wizard/answer`,
        { sessionToken: start.sessionToken, answer: antwort },
        ip
      )
    );
    phase = res.phase;
    // Unveraenderte Faktentabelle nach einer Antwort: entweder gab die Antwort nichts
    // her — oder die Extraktion ist still ausgefallen. Beides muss sichtbar sein.
    if (JSON.stringify(res.facts ?? {}) === JSON.stringify(facts ?? {})) stagnation++;
    facts = res.facts;
    frage = res.question?.content ?? null;
    if (frage) verlauf.push({ role: "ai", kind: "question", content: frage });
  }

  return {
    id: p.id,
    programmId: p.programmId,
    kategorie: p.kategorie,
    sessionToken: start.sessionToken,
    phase,
    turns,
    maxQuestions,
    messages: verlauf,
    facts,
    dauerMs: Date.now() - t0,
    zahlenLeck: findeZahlenLeck(antworten, p),
    stagnation,
  };
}

/**
 * Uebernimmt die Halluzinations-Marker des Ausgangs-Eintrags — laesst aber die fallen,
 * die der Simulant inzwischen selbst gesagt hat. Sonst wuerde WIZ-02 eine legitime
 * Angabe des Nutzers als Erfindung der Pipeline zaehlen.
 *
 * Im Zweifel BEHALTEN. Ein zu Unrecht behaltener Marker macht die Halluzinations-Messung
 * strenger als noetig; ein zu Unrecht verworfener macht sie blind — und blind ist die
 * teurere Richtung. Deshalb zwei Bedingungen: der Marker braucht mindestens ZWEI
 * bedeutungstragende Woerter, und alle muessen im Dialog vorkommen. Ein Marker wie
 * "SGB VIII § 13 Jugendhilfe" traegt nur eines ("jugendhilfe") — dass der Nutzer das
 * Jugendamt erwaehnt, legitimiert die erfundene Paragraphenstelle nicht.
 */
export function filtereMarker(
  marker: Array<{ marker: string; description: string }>,
  dialog: string
): { behalten: Array<{ marker: string; description: string }>; entfernt: string[] } {
  const dw = stichwoerter(dialog);
  const behalten: Array<{ marker: string; description: string }> = [];
  const entfernt: string[] = [];
  for (const m of marker) {
    const mw = stichwoerter(m.marker);
    if (mw.size >= 2 && [...mw].every((w) => dw.has(w))) entfernt.push(m.marker);
    else behalten.push(m);
  }
  return { behalten, entfernt };
}

async function gitStand(): Promise<{ sha: string; dirty: boolean }> {
  try {
    const { stdout } = await execFile("git", ["rev-parse", "HEAD"], { cwd: REPO });
    const { stdout: st } = await execFile("git", ["status", "--porcelain"], { cwd: REPO });
    return { sha: stdout.trim().slice(0, 8), dirty: st.trim().length > 0 };
  } catch {
    return { sha: "unknown", dirty: false };
  }
}

async function befehlLauf(flags: Flags): Promise<number> {
  if (!existsSync(PROFIL_PATH)) {
    console.error(`${LOG} ${PROFIL_PATH} fehlt — zuerst "eval-simuser.ts profil" laufen lassen.`);
    return 2;
  }
  if (!flags.label) {
    console.error(`${LOG} --label <name> ist Pflicht (er benennt den Vergleichsstand).`);
    return 2;
  }

  // Erreichbarkeit vorab pruefen — sonst laeuft man in 25 identische Verbindungsfehler.
  try {
    const res = await fetch(`${flags.base}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(
      `${LOG} ${flags.base} nicht erreichbar (${e instanceof Error ? e.message : e}).` +
        ` Dev-Server starten und ggf. --base setzen.`
    );
    return 2;
  }

  const datei = JSON.parse(await readFile(PROFIL_PATH, "utf8")) as ProfilDatei;
  const korpus = JSON.parse(await readFile(KORPUS_PATH, "utf8")) as KorpusEintrag[];
  const korpusById = new Map(korpus.map((e) => [e.id, e]));

  let profile = datei.profile;
  if (flags.only) profile = profile.filter((p) => flags.only!.includes(p.id));
  if (flags.limit) profile = profile.slice(0, flags.limit);
  if (!profile.length) {
    console.error(`${LOG} keine Profile ausgewaehlt.`);
    return 2;
  }

  // Die Profildatei liegt im Repo und kann von Hand editiert worden sein. Vor dem Lauf
  // deshalb erneut pruefen — ein widerspruechliches Profil wuerde messen, dass ein
  // williger Automat Zahlen nachliefert, und das faellt hinterher niemandem mehr auf.
  const widerspruechlich = profile
    .filter((p) => korpusById.has(p.id))
    .map((p) => pruefeProfil(p, korpusById.get(p.id)!))
    .filter((x) => x.widersprueche.length > 0);
  if (widerspruechlich.length) {
    console.error(
      `${LOG} ABBRUCH: ${widerspruechlich.length} Profil(e) enthalten Hintergrundwissen, das dem` +
        ` eigenen Nichtwissen widerspricht: ${widerspruechlich.map((x) => x.id).join(", ")}.` +
        ` Erst "eval-simuser.ts profil --refresh --only=<id>" oder Handkorrektur.`
    );
    return 1;
  }

  const ziel = resolve(RUNS_DIR, flags.label);
  await mkdir(ziel, { recursive: true });
  const client = mistral();
  const stand = await gitStand();

  console.log(
    `${LOG} Lauf "${flags.label}" · ${profile.length} Interviews · ${flags.base} · ` +
      `Sim-Modell ${flags.simModell} · ${flags.parallel} parallel · Code ${stand.sha}${stand.dirty ? "+dirty" : ""}`
  );

  const ergebnisse: LaufEintrag[] = [];
  // Index aus der stabilen Profil-Reihenfolge, nicht aus der Abarbeitungs-Reihenfolge:
  // so bekommt derselbe Fall bei jedem Lauf dieselbe Absenderadresse.
  const warteschlange = profile.map((p, i) => ({ p, i }));
  let fertig = 0;

  async function arbeiter(): Promise<void> {
    for (;;) {
      const naechster = warteschlange.shift();
      if (!naechster) return;
      const { p, i: index } = naechster;
      try {
        const e = await fuehreInterview(p, flags, client, index);
        ergebnisse.push(e);
        await writeFile(resolve(ziel, `${p.id}.json`), JSON.stringify(e, null, 2), "utf8");
        const t = analysiereTiefe(e.facts);
        const q = tiefeQuote(t);
        fertig++;
        console.log(
          `${LOG} ${fertig}/${profile.length} ${p.id} (${p.kategorie}): ${e.turns} Fragen · ` +
            `Tiefe ${q === null ? "n/a" : (q * 100).toFixed(0) + "%"} · ${Math.round(e.dauerMs / 1000)}s` +
            (e.stagnation > 0 ? ` · ${e.stagnation} Runde(n) ohne Faktenzuwachs` : "") +
            (e.zahlenLeck.length ? ` · ⚠️ Zahlen-Leck: ${e.zahlenLeck.join(", ")}` : "")
        );
      } catch (err) {
        fertig++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${LOG} ${fertig}/${profile.length} ${p.id}: FEHLER — ${msg.slice(0, 200)}`);
        const e: LaufEintrag = {
          id: p.id,
          programmId: p.programmId,
          kategorie: p.kategorie,
          sessionToken: "",
          phase: "failed",
          turns: 0,
          maxQuestions: 0,
          messages: [],
          facts: {},
          dauerMs: 0,
          zahlenLeck: [],
          stagnation: 0,
          fehler: msg,
        };
        ergebnisse.push(e);
        await writeFile(resolve(ziel, `${p.id}.json`), JSON.stringify(e, null, 2), "utf8");
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, flags.parallel) }, arbeiter));
  ergebnisse.sort((a, b) => a.id.localeCompare(b.id));

  // `n` aus dem Verzeichnis, nicht aus diesem Durchgang: ein Nachlauf mit --only
  // ergaenzt einen Lauf, statt ihn zu ersetzen — dann wuerde `n` sonst die Zahl der
  // nachgeholten Faelle behaupten und die Belegdatei waere schlicht falsch.
  const imVerzeichnis = (await readdir(ziel)).filter(
    (d) => d.endsWith(".json") && !d.startsWith("_")
  ).length;
  const meta: LaufMeta = {
    label: flags.label,
    erzeugtAm: new Date().toISOString(),
    base: flags.base,
    commitSha: stand.sha,
    dirty: stand.dirty,
    simModell: flags.simModell,
    n: imVerzeichnis,
  };
  await writeFile(resolve(ziel, "_meta.json"), JSON.stringify(meta, null, 2), "utf8");

  console.log(`\n${LOG} Sessions: ${ziel}`);
  // Korpus IMMER aus dem gesamten Verzeichnis bauen, nicht nur aus diesem Durchgang.
  await schreibeKorpus(flags.label, await ladeLauf(flags.label), korpusById, meta);

  const lecks = ergebnisse.filter((e) => e.zahlenLeck.length > 0);
  const fehler = ergebnisse.filter((e) => e.fehler);
  console.log(
    `${LOG} Zahlen-Leck: ${lecks.length}/${ergebnisse.length} Interviews · Fehler: ${fehler.length}`
  );
  berichteAus(ergebnisse, flags.label);

  if (fehler.length) return 1;
  if (lecks.length > Math.ceil(ergebnisse.length * 0.2)) {
    console.error(
      `${LOG} ABBRUCH: mehr als 20 % der Interviews enthalten erfundene Zahlen. Der Lauf misst dann` +
        ` die Auskunftsfreude des Simulanten, nicht die Qualitaet der Fragen.`
    );
    return 1;
  }

  // Stagnation heisst: die Antwort ist angekommen, aber in der Faktentabelle steht
  // nichts Neues. Zwei Ursachen, beide entwerten jede faktenbasierte Kennzahl —
  // deshalb wird hier gemeldet statt gemittelt:
  //
  //   1. Die Extraktion faellt aus. `extractFacts` faengt eigene Fehler ab und behaelt
  //      kommentarlos den alten Stand; unter Anbieter-Drosselung sieht ein Lauf dann
  //      aus wie einer mit schlechten Fragen. Erkennbar an "facts-extractor" im
  //      Server-Log. Gegenmittel: kleineres --parallel.
  //   2. Die Extraktion laeuft fehlerfrei und liefert trotzdem nichts. Das ist der
  //      Befund vom 31.07.2026 — `scripts/probe-facts-extractor.ts` zeigt 23 von 25
  //      handautorisierten Interviews mit null Slots. Dann liegt es NICHT am Lauf,
  //      und Fall 1 wegzuoptimieren aendert nichts.
  //
  // Welcher Fall vorliegt, entscheidet das Server-Log; die Probe klaert es endgueltig.
  const ausbeute = berechneAusbeute(ergebnisse);
  if (ausbeute.stagnationsquote > 0.4) {
    console.error(
      `${LOG} ⚠️  ${(ausbeute.stagnationsquote * 100).toFixed(0)} % der Antwort-Runden haben die` +
        ` Faktentabelle nicht veraendert, ${ausbeute.ohneErtrag} Interviews blieben ganz ohne Ertrag.\n` +
        `${LOG}     Alle Kennzahlen, die auf \`facts\` beruhen (Tiefen-Quote, Zahlangaben in Fakten),` +
        ` sind damit nach unten gedeckelt.\n` +
        `${LOG}     Erst pruefen: "facts-extractor" im Server-Log?` +
        ` JA -> Drosselung, mit kleinerem --parallel wiederholen.` +
        ` NEIN -> die Extraktion selbst liefert nichts (Befund 31.07.2026),` +
        ` dann gilt nur "Zahlangaben in Antworten" als Mass fuer den Interviewer.\n` +
        `${LOG}     Gegenprobe: npx tsx --env-file=.env.local scripts/probe-facts-extractor.ts`
    );
    return 1;
  }
  return 0;
}

/**
 * Schreibt den Korpus im pipeline-korpus-Format, damit eval-pipeline.ts (--korpus)
 * und darueber eval-gutachter.ts auf DIESEN Sessions laufen koennen statt auf den
 * handautorisierten. Eigener Schritt, damit er sich nach einer Korrektur an der
 * Marker-Logik nachziehen laesst, ohne 25 Interviews neu zu fahren.
 */
async function schreibeKorpus(
  label: string,
  ergebnisse: LaufEintrag[],
  korpusById: Map<string, KorpusEintrag>,
  meta: LaufMeta
): Promise<void> {
  const abgeleitet = [];
  const markerNotizen: string[] = [];
  for (const e of ergebnisse) {
    if (e.fehler || !e.messages.length) continue;
    const quelle = korpusById.get(e.id);
    if (!quelle) continue;
    // NUR die Nutzerantworten. Dass der Interviewer nach einem Schulentwicklungsplan
    // FRAGT, macht ihn nicht zur belegten Angabe — und WIZ-02 misst ebenfalls nur
    // gegen die Antworten (scoreWiz02 filtert auf role === "user").
    const dialog = e.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" \n ");
    const { behalten, entfernt } = filtereMarker(quelle.expected_forbidden_markers, dialog);
    if (entfernt.length) markerNotizen.push(`${e.id}: ${entfernt.join(" | ")}`);
    abgeleitet.push({
      id: e.id,
      category: e.kategorie,
      programmId: e.programmId,
      schulProfil: quelle.schulProfil,
      userAnswers: e.messages,
      facts: e.facts,
      expected_forbidden_markers: behalten,
      expected_geber_gruppe: quelle.expected_geber_gruppe,
      notes:
        `Erzeugt von scripts/eval-simuser.ts, Lauf "${label}" (${meta.erzeugtAm}, Code ${meta.commitSha}${meta.dirty ? "+dirty" : ""}). ` +
        `Antworten stammen vom simulierten Nutzer aus data/eval/simuser-profile.json, nicht von Hand. ` +
        (entfernt.length
          ? `Verworfene Halluzinations-Marker (der Nutzer hat sie selbst gesagt): ${entfernt.join(" | ")}.`
          : `Halluzinations-Marker unveraendert vom Ausgangs-Eintrag uebernommen.`),
    });
  }
  const korpusPfad = resolve(RUNS_DIR, `korpus-${label}.json`);
  await writeFile(korpusPfad, JSON.stringify(abgeleitet, null, 2) + "\n", "utf8");
  console.log(`${LOG} Korpus:   ${korpusPfad}  (${abgeleitet.length} Eintraege)`);
  if (markerNotizen.length) {
    console.log(`${LOG} Marker verworfen, weil der Simulant sie selbst nannte:`);
    for (const n of markerNotizen) console.log(`${LOG}   ${n}`);
  }
}

async function befehlKorpus(flags: Flags): Promise<number> {
  if (!flags.label) {
    console.error(`${LOG} --label <name> ist Pflicht.`);
    return 2;
  }
  const ergebnisse = await ladeLauf(flags.label);
  const korpus = JSON.parse(await readFile(KORPUS_PATH, "utf8")) as KorpusEintrag[];
  const metaPfad = resolve(RUNS_DIR, flags.label, "_meta.json");
  const meta: LaufMeta = existsSync(metaPfad)
    ? (JSON.parse(await readFile(metaPfad, "utf8")) as LaufMeta)
    : {
        label: flags.label,
        erzeugtAm: "unbekannt",
        base: "",
        commitSha: "unknown",
        dirty: false,
        simModell: "",
        n: ergebnisse.length,
      };
  await schreibeKorpus(flags.label, ergebnisse, new Map(korpus.map((e) => [e.id, e])), meta);
  return 0;
}

// ============================================================================
// Schritt 3 — Bericht
// ============================================================================

interface Ausbeute {
  n: number;
  fragenMittel: number;
  tiefeMittel: number;
  proTiefe: Record<TiefeId, { erfuellt: number; teilweise: number; offen: number; geklaert: number }>;
  zahlenInFacts: number;
  /** Verschiedene Zahlangaben in den Nutzerantworten — misst den Interviewer direkt. */
  zahlenInAntworten: number;
  proKategorie: Record<string, { n: number; fragen: number; tiefe: number }>;
  lecks: number;
  /** Anteil der Antwort-Runden, die die Faktentabelle nicht veraendert haben. */
  stagnationsquote: number;
  /** Interviews, die ausser dem eingespeisten Schulprofil NICHTS erbracht haben. */
  ohneErtrag: number;
}

const TIEFE_IDS: TiefeId[] = [
  "bedarf-ist-zahlen",
  "kosten-je-posten",
  "arbeitsplan-wer-wann",
  "indikator-baseline-ziel",
  "traeger-zusage",
];

/** Zaehlt pruefbare Zahlangaben in den extrahierten Fakten — die Waehrung des Finanzplans. */
export function zahlenInFacts(facts: WizardFacts): number {
  return zahlAngaben(JSON.stringify(facts ?? {})).length;
}

/**
 * Zahlangaben in den ANTWORTEN — die Messung, die den Interviewer isoliert.
 *
 * Warum es beide Zahlen braucht: `zahlenInFacts` misst, was in der Faktentabelle
 * ankommt, und haengt damit an `extractFacts`. Solange der Extraktor unzuverlaessig
 * ist (Befund 31.07.2026: 23 von 25 handautorisierten Interviews ergeben null Slots),
 * wuerde eine bessere Frage dort NICHT sichtbar — die Verbesserung versickert vor der
 * Messstelle. Diese Zahl liest direkt die Antworten und misst damit genau das, was der
 * Interviewer beeinflussen kann.
 *
 * Belastbar ist sie nur, weil der Simulant keine Zahlen erfinden darf (findeZahlenLeck
 * + Korrekturschleife). Jede gezaehlte Zahl steht so im eingefrorenen Profil.
 */
export function zahlenInAntworten(messages: KorpusMessage[]): number {
  const antworten = messages.filter((m) => m.role === "user").map((m) => m.content);
  const alle = antworten.flatMap((a) =>
    zahlAngaben(a).map((z) => z.replace(/\s+/g, " ").trim().toLowerCase())
  );
  return new Set(alle).size;
}

export function berechneAusbeute(eintraege: LaufEintrag[]): Ausbeute {
  const gute = eintraege.filter((e) => !e.fehler);
  const proTiefe = Object.fromEntries(
    TIEFE_IDS.map((id) => [id, { erfuellt: 0, teilweise: 0, offen: 0, geklaert: 0 }])
  ) as Ausbeute["proTiefe"];

  const quoten: number[] = [];
  const proKategorie: Record<string, { n: number; fragen: number; tiefe: number }> = {};

  for (const e of gute) {
    const befunde: TiefeBefund[] = analysiereTiefe(e.facts);
    for (const b of befunde) proTiefe[b.id][b.status]++;
    const q = tiefeQuote(befunde);
    if (q !== null) quoten.push(q);
    const k = (proKategorie[e.kategorie] ??= { n: 0, fragen: 0, tiefe: 0 });
    k.n++;
    k.fragen += e.turns;
    k.tiefe += q ?? 0;
  }
  for (const k of Object.values(proKategorie)) {
    k.fragen = k.fragen / k.n;
    k.tiefe = k.tiefe / k.n;
  }

  const runden = gute.reduce((s, e) => s + e.turns, 0);
  const stagniert = gute.reduce((s, e) => s + (e.stagnation ?? 0), 0);
  // "Ohne Ertrag" = ausser `schule` (das kam als Seed aus dem Profil, nicht aus dem
  // Interview) steht nichts in der Tabelle. Ein solches Interview ist kein schwaches
  // Ergebnis, sondern gar keines — und darf nicht als 0 % Tiefe mitgemittelt werden,
  // als haette das Interview gearbeitet.
  const ohneErtrag = gute.filter((e) => {
    const rest = { ...(e.facts ?? {}) } as Record<string, unknown>;
    delete rest.schule;
    return Object.keys(rest).length === 0;
  }).length;

  return {
    n: gute.length,
    stagnationsquote: runden ? stagniert / runden : NaN,
    ohneErtrag,
    fragenMittel: gute.length ? gute.reduce((s, e) => s + e.turns, 0) / gute.length : NaN,
    tiefeMittel: quoten.length ? quoten.reduce((a, b) => a + b, 0) / quoten.length : NaN,
    proTiefe,
    zahlenInFacts: gute.length
      ? gute.reduce((s, e) => s + zahlenInFacts(e.facts), 0) / gute.length
      : NaN,
    zahlenInAntworten: gute.length
      ? gute.reduce((s, e) => s + zahlenInAntworten(e.messages), 0) / gute.length
      : NaN,
    proKategorie,
    lecks: gute.filter((e) => e.zahlenLeck.length > 0).length,
  };
}

function proz(x: number): string {
  return Number.isFinite(x) ? `${(x * 100).toFixed(0)} %` : "n/a";
}
function zahl(x: number): string {
  return Number.isFinite(x) ? x.toFixed(1) : "n/a";
}
function diff(neu: number, alt: number, einheit: "proz" | "zahl"): string {
  if (!Number.isFinite(neu) || !Number.isFinite(alt)) return "";
  const d = neu - alt;
  const s = einheit === "proz" ? `${(d * 100).toFixed(0)} pp` : d.toFixed(1);
  return d === 0 ? "  ±0" : d > 0 ? `  +${s}` : `  ${s}`;
}

function berichteAus(eintraege: LaufEintrag[], label: string, vergleich?: { label: string; a: Ausbeute }): void {
  const a = berechneAusbeute(eintraege);
  const v = vergleich?.a;

  console.log(`\n${LOG} ===== Ausbeute "${label}"${v ? ` gegen "${vergleich!.label}"` : ""} =====`);
  console.log(`${LOG}   Interviews:            ${a.n}`);
  console.log(
    `${LOG}   Fragen je Interview:   ${zahl(a.fragenMittel)}${v ? diff(a.fragenMittel, v.fragenMittel, "zahl") : ""}`
  );
  console.log(
    `${LOG}   Tiefen-Quote:          ${proz(a.tiefeMittel)}${v ? diff(a.tiefeMittel, v.tiefeMittel, "proz") : ""}`
  );
  console.log(
    `${LOG}   Zahlangaben in Antworten: ${zahl(a.zahlenInAntworten)}${v ? diff(a.zahlenInAntworten, v.zahlenInAntworten, "zahl") : ""}` +
      `   <- misst den Interviewer direkt (haengt nicht am Extraktor)`
  );
  console.log(
    `${LOG}   Zahlangaben in Fakten:    ${zahl(a.zahlenInFacts)}${v ? diff(a.zahlenInFacts, v.zahlenInFacts, "zahl") : ""}` +
      `   <- was davon in der Faktentabelle ankommt`
  );
  console.log(`${LOG}   Interviews mit Zahlen-Leck: ${a.lecks}`);
  console.log(
    `${LOG}   Runden ohne Faktenzuwachs: ${proz(a.stagnationsquote)}${v ? diff(a.stagnationsquote, v.stagnationsquote, "proz") : ""}` +
      `   ⚠️ hoch = Extraktion faellt aus (Anbieter-429), nicht schlechte Fragen`
  );
  console.log(
    `${LOG}   Interviews ganz ohne Ertrag:  ${a.ohneErtrag}${v ? `   (vorher ${v.ohneErtrag})` : ""}`
  );

  console.log(`${LOG}`);
  console.log(`${LOG}   Je Tiefendimension (erfuellt / teilweise / offen / geklaert):`);
  for (const id of TIEFE_IDS) {
    const t = a.proTiefe[id];
    const alt = v?.proTiefe[id];
    const delta = alt ? `   (vorher ${alt.erfuellt}/${alt.teilweise}/${alt.offen}/${alt.geklaert})` : "";
    console.log(
      `${LOG}     ${id.padEnd(24)} ${String(t.erfuellt).padStart(2)} / ${String(t.teilweise).padStart(2)} / ${String(t.offen).padStart(2)} / ${String(t.geklaert).padStart(2)}${delta}`
    );
  }

  console.log(`${LOG}`);
  console.log(`${LOG}   Je Kategorie:`);
  for (const [k, s] of Object.entries(a.proKategorie).sort()) {
    const alt = v?.proKategorie[k];
    console.log(
      `${LOG}     ${k.padEnd(12)} n=${s.n}  Fragen ${zahl(s.fragen)}  Tiefe ${proz(s.tiefe)}` +
        (alt ? `   (vorher ${zahl(alt.fragen)} / ${proz(alt.tiefe)})` : "")
    );
  }
}

async function ladeLauf(label: string): Promise<LaufEintrag[]> {
  const dir = resolve(RUNS_DIR, label);
  if (!existsSync(dir)) {
    console.error(`${LOG} Lauf "${label}" nicht gefunden: ${dir}`);
    process.exit(2);
  }
  const dateien = (await readdir(dir)).filter((d) => d.endsWith(".json") && !d.startsWith("_"));
  const out: LaufEintrag[] = [];
  for (const d of dateien) out.push(JSON.parse(await readFile(resolve(dir, d), "utf8")) as LaufEintrag);
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

async function befehlBericht(flags: Flags): Promise<number> {
  if (!flags.label) {
    console.error(`${LOG} --label <name> ist Pflicht.`);
    return 2;
  }
  const eintraege = await ladeLauf(flags.label);
  let vergleich: { label: string; a: Ausbeute } | undefined;
  if (flags.vergleich) {
    const alt = await ladeLauf(flags.vergleich);
    vergleich = { label: flags.vergleich, a: berechneAusbeute(alt) };
    // Nur gemeinsame IDs vergleichen — sonst mischt sich ein Teillauf in die Zahlen.
    const gemeinsam = new Set(alt.map((e) => e.id));
    const fehlend = eintraege.filter((e) => !gemeinsam.has(e.id)).map((e) => e.id);
    if (fehlend.length) {
      console.warn(
        `${LOG} ⚠️  ${fehlend.length} Eintraege sind nur im neuen Lauf (${fehlend.join(", ")}) —` +
          ` die Mittelwerte stehen damit auf unterschiedlichen Mengen.`
      );
    }
  }
  berichteAus(eintraege, flags.label, vergleich);
  return 0;
}

// ============================================================================
// CLI
// ============================================================================

interface Flags {
  befehl: "profil" | "lauf" | "korpus" | "bericht";
  base: string;
  label: string | null;
  vergleich: string | null;
  only: string[] | null;
  limit: number | null;
  parallel: number;
  refresh: boolean;
  simModell: string;
  profilModell: string;
  temperatur: number;
}

function filterKorpus(korpus: KorpusEintrag[], flags: Flags): KorpusEintrag[] {
  let out = korpus;
  if (flags.only) out = out.filter((e) => flags.only!.includes(e.id));
  if (flags.limit) out = out.slice(0, flags.limit);
  return out;
}

export function parseFlags(argv: string[]): Flags {
  const befehl = argv[0] as Flags["befehl"];
  if (!["profil", "lauf", "korpus", "bericht"].includes(befehl)) {
    console.error(
      `${LOG} Nutzung: eval-simuser.ts <profil|lauf|korpus|bericht> [flags]\n` +
        `  --base <url>        Basis-URL der laufenden App (default http://localhost:3101)\n` +
        `  --label <name>      Name des Laufs (Pflicht bei lauf/bericht)\n` +
        `  --vergleich <name>  Vorlauf, gegen den berichtet wird\n` +
        `  --only=id,id        nur diese Korpus-IDs\n` +
        `  --limit=<n>         nur die ersten n\n` +
        `  --parallel=<n>      gleichzeitige Interviews (default 3)\n` +
        `  --refresh           Profile neu bauen statt aus Cache\n` +
        `  --sim-modell=<id>   Modell des Simulanten (default mistral-small-latest)\n` +
        `  --profil-modell=<id> Modell fuer den Profilbau (default mistral-large-latest)\n` +
        `  --temperatur=<n>    Temperatur des Simulanten (default 0 — Unterschiede sollen von den Fragen kommen)`
    );
    process.exit(2);
  }
  const f: Flags = {
    befehl,
    base: process.env.SIMUSER_BASE ?? "http://localhost:3101",
    label: null,
    vergleich: null,
    only: null,
    limit: null,
    parallel: 3,
    refresh: false,
    simModell: "mistral-small-latest",
    profilModell: "mistral-large-latest",
    temperatur: 0,
  };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") f.base = argv[++i];
    else if (a === "--label") f.label = argv[++i];
    else if (a === "--vergleich") f.vergleich = argv[++i];
    else if (a === "--refresh") f.refresh = true;
    else if (a.startsWith("--only=")) f.only = a.slice(7).split(",");
    else if (a.startsWith("--limit=")) f.limit = Number(a.slice(8));
    else if (a.startsWith("--parallel=")) f.parallel = Number(a.slice(11));
    else if (a.startsWith("--sim-modell=")) f.simModell = a.slice(13);
    else if (a.startsWith("--profil-modell=")) f.profilModell = a.slice(16);
    else if (a.startsWith("--temperatur=")) f.temperatur = Number(a.slice(13));
    else {
      console.error(`${LOG} unbekanntes Flag: ${a}`);
      process.exit(2);
    }
  }
  f.base = f.base.replace(/\/$/, "");
  return f;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const code =
    flags.befehl === "profil"
      ? await befehlProfil(flags)
      : flags.befehl === "lauf"
        ? await befehlLauf(flags)
        : flags.befehl === "korpus"
          ? await befehlKorpus(flags)
          : await befehlBericht(flags);
  process.exit(code);
}

if (process.argv[1] && /eval-simuser\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(`${LOG} Abbruch:`, e);
    process.exit(2);
  });
}
