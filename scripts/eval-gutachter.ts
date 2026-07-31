/**
 * WIZ-05 — Gutachterurteil auf der 5-Punkte-Skala, mit Vergleichsarm "ungeuebter Mensch".
 *
 * WARUM DIESES SKRIPT EXISTIERT
 * -----------------------------
 * Die vorhandenen Achsen (WIZ-01..04, Finanzplan) messen Teilaspekte in Prozent:
 * Abschnitts-Coverage, Halluzinations-Detektion, Tonalitaets-Passung, Begruendungs-Substanz.
 * Keine davon beantwortet die zwei Fragen, an denen der Go-Live haengt:
 *
 *   (1) Welche Note von 5 wuerde ein Foerdermittel-Gutachter dem Antrag geben?
 *   (2) Ist das mindestens so gut wie ein Antrag, den eine ungeuebte Person selbst schreibt?
 *
 * Deshalb hier: eine ANKER-BASIERTE 1-5-Rubrik (Entscheidungs-Anker, nicht Schulnoten-Gefuehl)
 * und ein gepaarter Vergleichsarm.
 *
 * DIE ZWEI ARME
 * -------------
 *   ki    — `result.artefacts.finalText` aus den Pipeline-Snapshots. Das ist genau das
 *           Artefakt, das der zahlende Kunde herunterlaedt (Lehre aus
 *           feedback-eval-muss-user-artefakt-messen: nicht den Entwurf messen).
 *   laie  — SIMULIERTER Antrag einer ungeuebten Person. Ehrliche Bezeichnung: das ist
 *           kein echter Mensch. Die Simulation ist aber strukturell fair gebaut:
 *             * Sie bekommt EXAKT dieselben Interview-Antworten (die im Korpus von Hand
 *               als realistische Laien-Aussagen autorisiert wurden).
 *             * Sie bekommt das Richtlinien-Dossier NICHT — genau das ist der Unterschied
 *               zwischen "Schule schreibt selbst" und "EduFunds schreibt": die Schule
 *               kennt ihr Projekt, nicht die Bewertungskriterien des Gebers.
 *             * Ein Durchgang, keine Revision, keine Substanz-Nachbesserung.
 *             * Laienuebliche Laenge statt Formularausnutzung.
 *           Damit ist der gemessene Abstand der Beitrag der Plattform, nicht der des Modells.
 *
 * BIAS-KONTROLLEN
 * ---------------
 *   * Blind: der Judge sieht keine Arm-Kennzeichnung, nur "ANTRAG".
 *   * Judge-Panel: zwei Modelle, beide != dem Generator-Modell der Pipeline
 *     (mistral-small). Referenz ist `gemini-2.5-pro` (anderer Anbieter, damit keine
 *     Selbstbevorzugung innerhalb einer Modellfamilie moeglich ist), Gegenprobe
 *     `mistral-large`. Werte werden immer auch pro Judge einzeln berichtet.
 *   * Laengen-Neutralisierung: der Judge wird ausdruecklich angewiesen, Laenge nicht als
 *     Qualitaet zu lesen (der KI-Arm nutzt Formularlimits aus, der Laien-Arm ist kurz).
 *   * Positions-Bias: der gepaarte Vergleich laeuft in BEIDEN Reihenfolgen; nur ein in
 *     beiden Richtungen gleich lautendes Urteil zaehlt als Sieg, sonst "unentschieden".
 *   * Kein Zwangsurteil: jedes Kriterium darf "nicht_bewertbar" sein
 *     (feedback-extraktions-schema-ohne-unbekannt-erzeugt-fakten).
 *
 * LAUF
 * ----
 *   npx tsx --env-file=.env.local scripts/eval-gutachter.ts --arms=ki,laie --judges=gemini,mistral-large
 *   npx tsx --env-file=.env.local scripts/eval-gutachter.ts --arms=ki --judges=gemini --limit=5
 *
 * Flags:
 *   --snapshots <dir>  Snapshot-Verzeichnis (default data/eval/pipeline-snapshots/baseline)
 *   --run=<n>          Welcher Run-Index pro Korpus-Eintrag (default 1)
 *   --arms=a,b         ki | ki-ohne-marker | laie (default ki,laie)
 *   --judges=a,b       gemini | mistral-large | deepseek | mistral (default gemini,mistral-large)
 *   --limit=<n>        nur die ersten n Eintraege
 *   --only=<id,id>     nur diese Korpus-IDs
 *   --no-pairwise      gepaarten Vergleich auslassen
 *   --laie-model=<id>  Modell fuer den Laien-Arm (default mistral-small-latest = Prod-Modell)
 *   --refresh-laie     Laien-Cache verwerfen und neu generieren
 *   --out <pfad>       Report-Basispfad ohne Endung (default data/eval/gutachter-reports/<ISO>)
 *
 * Exit-Codes: 0 = Lauf ok, 1 = Gate verletzt (siehe GATE), 2 = CLI/Setup-Fehler.
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// GATE — was "gut genug" heisst
// ============================================================================

/**
 * Koljas Zielkorridor: "Qualitaet der Antraege zwischen 4 und 5 von 5" und
 * "mindestens die Qualitaet ungeuebter menschlicher Antragsteller".
 * Beides wird hier zu pruefbaren Schwellen:
 */
export const GATE = {
  /** Mittelwert des KI-Arms ueber alle Eintraege und Judges. */
  kiMeanMin: 4.0,
  /** Kein einzelner Antrag darf unter diese Marke fallen (Ausreisser-Schutz). */
  kiMinEntryMin: 3.5,
  /** Der KI-Arm muss den Laien-Arm im gepaarten Vergleich klar schlagen. */
  laieWinRateMax: 0.1,
  /** Mindest-Abstand der Mittelwerte in Skalenpunkten. */
  minDeltaToLaie: 0.5,
} as const;

// ============================================================================
// Rubrik — Anker sind Entscheidungen, nicht Gefuehle
// ============================================================================

export interface RubrikKriterium {
  id: string;
  name: string;
  gewichtung: number;
  frage: string;
  /** Anker fuer 1 / 3 / 5 — die Zwischenstufen 2 und 4 interpoliert der Judge. */
  anker: { 1: string; 3: string; 5: string };
}

export const RUBRIK: RubrikKriterium[] = [
  {
    id: "bedarf",
    name: "Bedarfs- und Problemdarstellung",
    gewichtung: 15,
    frage:
      "Ist der Bedarf aus der Situation der Schule heraus belegt (Zahlen, Ist-Stand, konkrete Luecke)?",
    anker: {
      1: "Kein Bedarf erkennbar oder reine Wunschliste ohne Ausgangslage.",
      3: "Bedarf behauptet und plausibel, aber ohne Zahlen oder konkrete Ist-Beschreibung.",
      5: "Bedarf mit konkreten Zahlen/Beobachtungen der eigenen Schule belegt; die Luecke ist benannt und quantifiziert.",
    },
  },
  {
    id: "wirkungslogik",
    name: "Ziele, Indikatoren und Wirkungslogik",
    gewichtung: 20,
    frage:
      "Sind Ziele so formuliert, dass ihre Erreichung pruefbar ist, und ist die Kette Massnahme -> Zwischenergebnis -> Wirkung nachvollziehbar begruendet?",
    anker: {
      1: "Ziele fehlen oder sind Floskeln ('Lernerfolg verbessern'); keine Wirkungslogik.",
      3: "Ziele benannt, aber nicht pruefbar; Wirkung wird behauptet statt begruendet.",
      5: "Pruefbare Ziele mit Indikatoren und eine begruendete Kausalkette, warum die Massnahme genau diese Wirkung erzeugt.",
    },
  },
  {
    id: "umsetzung",
    name: "Umsetzung und Arbeitsplan",
    gewichtung: 15,
    frage:
      "Ist konkret beschrieben, WER WAS WANN tut, und ist das mit den Ressourcen der Schule realistisch?",
    anker: {
      1: "Keine Massnahmen oder nur Absichtserklaerungen.",
      3: "Massnahmen aufgelistet, aber ohne Verantwortliche, Reihenfolge oder Zeitbezug.",
      5: "Massnahmen mit Verantwortlichkeiten, Abfolge und Zeitbezug; die Machbarkeit ist erkennbar mitgedacht.",
    },
  },
  {
    id: "passung",
    name: "Passung zum Programm und Vollstaendigkeit",
    gewichtung: 20,
    frage:
      "Bedient der Antrag die im Geber-Steckbrief genannten Pflichtpunkte und vermeidet er die typischen Ablehnungsgruende?",
    anker: {
      1: "Zentrale Pflichtpunkte fehlen; der Antrag laeuft am Programm vorbei.",
      3: "Die Haelfte der Pflichtpunkte ist adressiert, mehrere nur pauschal.",
      5: "Alle genannten Pflichtpunkte sind substanziell bedient; die typischen Ablehnungsgruende sind sichtbar vermieden.",
    },
  },
  {
    id: "finanzen",
    name: "Finanzplan und Mittelbegruendung",
    gewichtung: 15,
    frage:
      "Sind Posten benannt, aus dem Vorhaben abgeleitet und in sich stimmig (inkl. Eigenmittel/Folgekosten, soweit gefordert)?",
    anker: {
      1: "Kein Finanzteil oder eine nackte Summe ohne Herkunft.",
      3: "Posten vorhanden, aber ohne Ableitung aus dem Vorhaben oder mit unklaren Bezuegen.",
      5: "Posten aus dem Vorhaben abgeleitet, begruendet, rechnerisch stimmig; Eigenanteil/Folgekosten adressiert.",
    },
  },
  {
    id: "nachhaltigkeit",
    name: "Verstetigung nach Foerderende",
    gewichtung: 10,
    frage: "Ist beschrieben, was nach dem Foerderzeitraum bleibt — strukturell, nicht als Versprechen?",
    anker: {
      1: "Nicht erwaehnt.",
      3: "Zusage ohne Mechanik ('wird fortgefuehrt').",
      5: "Konkrete Verankerung (Curriculum, Personal, Betriebs-/Wartungsweg, Beschluss) mit benannten Zustaendigkeiten.",
    },
  },
  {
    id: "form",
    name: "Sprache und formale Reife",
    gewichtung: 5,
    frage:
      "Liest sich der Text wie ein einreichungsfaehiger Antrag — praezise, gegliedert, ohne Bruchstellen?",
    anker: {
      1: "Notizhaft, unstrukturiert oder sprachlich unfertig.",
      3: "Verstaendlich, aber redundant, floskelhaft oder ungleichmaessig.",
      5: "Praezise, gegliedert, durchgehend auf Antragsniveau; keine Platzhalter oder Bruchstellen.",
    },
  },
];

const GEWICHT_SUMME = RUBRIK.reduce((s, k) => s + k.gewichtung, 0);

export const JUDGE_SYSTEM = `Du bist ein erfahrener Gutachter fuer Bildungsfoerderung und entscheidest ueber Antraege.
Du bewertest EINEN vorgelegten Antrag gegen eine Rubrik mit Skala 1-5.

## Skala (Entscheidungs-Anker, nicht Schulnote)
5 = bewilligungsfaehig ohne Nachfragen.
4 = foerderwuerdig; hoechstens kleinere Nachfragen.
3 = grenzwertig; ohne substanzielle Nachbesserung nicht bewilligungsfaehig.
2 = deutlich unzureichend; erhebliche Nachforderungen.
1 = unbrauchbar; Ablehnung.

## Bewertungsregeln
- Du bewertest NUR, was im Antrag steht. Du ergaenzt nichts aus eigener Kenntnis.
- LAENGE IST KEIN QUALITAETSMERKMAL. Ein kurzer, praeziser Antrag kann 5 sein; ein langer,
  redundanter Antrag kann 2 sein. Bewerte Informationsdichte, nicht Zeichenzahl.
- Ausdruecklich als Annahme markierte Stellen (z. B. "[Annahme: ...]") sind ehrliche
  Luecken-Kennzeichnung. Sie senken die Bewertung des betroffenen Kriteriums leicht,
  gelten aber NICHT als Taeuschung.
- Innere Widersprueche (Zahlen, die nicht zusammenpassen; Aussagen, die sich aufheben)
  senken die Bewertung deutlich.
- Wenn ein Kriterium anhand des Textes nicht beurteilbar ist, setze "nicht_bewertbar": true
  und score: null. Rate nicht.

## Ausgabe
AUSSCHLIESSLICH valides JSON, kein Markdown-Fence:
{
  "kriterien": [
    { "id": "kriterium-id", "score": 1|2|3|4|5|null, "nicht_bewertbar": false,
      "beleg": "max 160 Zeichen woertliches Zitat aus dem Antrag oder 'nicht erwaehnt'",
      "maengel": "1 Satz: was fehlt genau" }
  ],
  "gesamturteil": 1|2|3|4|5,
  "entscheidung": "bewilligen" | "bewilligen_mit_nachfragen" | "nachbesserung" | "ablehnen",
  "summary": "1-2 Saetze Gesamteindruck"
}`;

export const PAIRWISE_SYSTEM = `Du bist ein erfahrener Gutachter fuer Bildungsfoerderung.
Dir liegen ZWEI Antraege zum SELBEN Vorhaben und SELBEN Foerderprogramm vor (ANTRAG A, ANTRAG B).
Du entscheidest, welcher Antrag eher bewilligt wuerde.

Regeln:
- LAENGE IST KEIN QUALITAETSMERKMAL. Bewerte Informationsdichte und Pruefbarkeit, nicht Zeichenzahl.
- Beide Antraege stammen aus derselben Faktenlage. Unterschiede in der Faktenmenge sind daher
  ein Qualitaetsunterschied in der Aufbereitung, kein Vorteil "besserer Daten".
- Du darfst "unentschieden" waehlen, wenn kein belastbarer Unterschied besteht.

Ausgabe AUSSCHLIESSLICH als valides JSON, kein Markdown-Fence:
{ "besser": "A" | "B" | "unentschieden",
  "deutlichkeit": "knapp" | "klar" | "eindeutig",
  "grund": "1-2 Saetze, worin der Unterschied besteht" }`;

export const LAIE_SYSTEM = `Du schreibst als LEHRKRAFT ohne Antragserfahrung einen Foerderantrag fuer die eigene Schule.

Deine Ausgangslage — halte sie strikt ein, sie ist der Kern der Aufgabe:
- Du kennst dein Vorhaben, aber NICHT die Bewertungskriterien des Geldgebers. Du hast keine
  Richtlinie gelesen, kein Merkblatt, keine Handreichung. Du weisst nicht, welche Abschnitte
  erwartet werden.
- Du schreibst den Antrag an einem Nachmittag in einem Durchgang, ohne Ueberarbeitung,
  neben dem Unterricht. Niemand liest gegen.
- Du hast keine Zeit fuer Recherche. Fachbegriffe, Bildungsstrategien oder Theoriebezuege
  benutzt du nicht — die kennst du nicht oder traust dich nicht, sie zu verwenden.
- Du schreibst engagiert und ehrlich, aber unsystematisch: mal zu knapp, mal ausschweifend,
  Zahlen nur, wo du sie wirklich hast. Wo du etwas nicht weisst, schreibst du es vage
  ("muessten wir noch klaeren") oder laesst es weg.
- Typische Laenge: 2.000 bis 4.500 Zeichen. Ueberschriften nutzt du hoechstens sparsam.

Verboten (das waere kein Laien-Antrag mehr):
- Keine erfundenen Zahlen, Beschluesse, Partner oder Ergebnisse. Was nicht in den Angaben
  steht, existiert nicht.
- Keine Gliederung nach Antrags-Systematik, keine Indikatoren-Tabellen, keine
  Wirkungsketten-Terminologie, keine Zitate von Strategien oder Studien.
- Keine Meta-Kommentare ueber diese Aufgabe. Gib NUR den Antragstext aus.`;

// ============================================================================
// Typen
// ============================================================================

/**
 * Arme
 * ----
 *   ki               — finalText genau wie generiert (das, was der Kunde zuerst sieht).
 *   ki-ohne-marker   — DIAGNOSE-ARM, kein Produktzustand. Derselbe Text, aber
 *                      deterministisch von den Arbeitsmarkern befreit: `[TODO: …]`
 *                      entfernt, `[Annahme: X]` auf X reduziert.
 *
 *                      Warum: Beide Judges nennen als Hauptmangel nicht fehlende
 *                      Argumente, sondern "unfertiger Entwurf — zahlreiche
 *                      TODO-Vermerke". Die Marker sind aber eine bewusste
 *                      Produktentscheidung ("Kennzeichnen statt verbieten",
 *                      02.07.2026, lib/wizard/annahme-marker.ts): der Nutzer soll
 *                      die Luecken SEHEN und aufloesen, bevor er einreicht.
 *                      Dieser Arm trennt daher die zwei Ursachen sauber:
 *                        Abstand ki -> ki-ohne-marker = Formabzug durch Marker
 *                        Rest gegenueber 5,0            = echte Substanzluecke
 *                      Es wird NICHTS erfunden — nur Arbeitsnotizen entfernt, die
 *                      im eingereichten Antrag ohnehin nicht stehen wuerden.
 *   laie             — simulierter Antrag einer ungeuebten Person (s. Dateikopf).
 */
export type Arm = "ki" | "ki-ohne-marker" | "laie";
export type JudgeName = "gemini" | "deepseek" | "mistral" | "mistral-large";

export interface JudgeKriteriumErgebnis {
  id: string;
  score: number | null;
  nicht_bewertbar?: boolean;
  beleg?: string;
  maengel?: string;
}

export interface JudgeErgebnis {
  kriterien: JudgeKriteriumErgebnis[];
  gesamturteil: number;
  entscheidung: string;
  summary: string;
}

export interface ArmBewertung {
  arm: Arm;
  judge: JudgeName;
  /** Gewichteter Mittelwert aus den Kriterien — in CODE gerechnet, nicht vom Modell. */
  gewichtet: number | null;
  /** Freies Gesamturteil des Judges (Kontrollwert gegen Rubrik-Drift). */
  gesamturteil: number;
  entscheidung: string;
  rohwerte: JudgeErgebnis;
  fehler?: string;
}

export interface PairErgebnis {
  judge: JudgeName;
  /** Urteil nach Auflösung der Positionsrotation: "ki" | "laie" | "unentschieden". */
  gewinner: Arm | "unentschieden";
  konsistent: boolean;
  details: Array<{ reihenfolge: string; besser: string; deutlichkeit: string; grund: string }>;
}

export interface EintragErgebnis {
  korpusId: string;
  programmId: string;
  programmName: string;
  geberTyp: string;
  /** Input-Qualitaet aus dem Korpus: "vag" | "kurz" | "ausfuehrlich" (o. Ae.). */
  kategorie: string;
  markerZahl: { todo: number; annahme: number };
  laengen: Partial<Record<Arm, number>>;
  bewertungen: ArmBewertung[];
  pair?: PairErgebnis[];
}

/**
 * Entfernt die Arbeitsmarker deterministisch. Kein LLM, keine Erfindung:
 * `[TODO: …]` fliegt raus (samt evtl. doppelten Leerzeichen), `[Annahme: X]`
 * wird auf X reduziert. Exportiert fuer Tests.
 */
export function markerEntfernen(text: string): { text: string; todo: number; annahme: number } {
  const todo = (text.match(/\[TODO:[^\]]*\]/g) ?? []).length;
  const annahme = (text.match(/\[Annahme:[^\]]*\]/g) ?? []).length;
  const bereinigt = text
    .replace(/\s*\[TODO:[^\]]*\]/g, "")
    .replace(/\[Annahme:\s*([^\]]*?)\s*\]/g, "$1")
    // Doppelte Leerzeichen und leer gewordene Klammerreste einsammeln.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/\n{3,}/g, "\n\n");
  return { text: bereinigt, todo, annahme };
}

// ============================================================================
// Provider-Clients — bewusst lokal, damit Judge und Generator unabhaengig vom
// modulweiten LLM_PROVIDER aus lib/wizard/llm.ts gewaehlt werden koennen.
// ============================================================================

/**
 * Judge-Modelle. Stand 30.07.2026 mit `scripts/smoke-provider-matrix.ts` geprueft:
 * gemini + mistral antworten, `deepseek-chat` gibt 401 (Key ungueltig) — deshalb
 * ist DeepSeek als Judge deklariert, aber nicht im Default-Panel.
 *
 * Panel-Wahl: `gemini-2.5-pro` ist der Referenz-Judge, weil er von einem ANDEREN
 * Anbieter als der Generator (mistral-small) kommt — Selbstbevorzugung innerhalb
 * einer Modellfamilie ist damit ausgeschlossen. `mistral-large` laeuft als zweiter
 * Judge mit: gleiche Familie wie der Generator, deshalb NICHT als Referenz taugend,
 * aber als Gegenprobe brauchbar — beide Arme entstehen aus mistral-small, eine
 * Familienpraeferenz wuerde beide gleich beguenstigen und den PAARVERGLEICH nicht
 * verschieben. Die Judge-Werte werden immer auch einzeln berichtet.
 */
const MODELLE: Record<JudgeName, { base?: string; model: string; keyEnv: string }> = {
  gemini: { model: "gemini-2.5-pro", keyEnv: "GEMINI_API_KEY" },
  deepseek: { base: "https://api.deepseek.com", model: "deepseek-chat", keyEnv: "DEEPSEEK_API_KEY" },
  mistral: { base: "https://api.mistral.ai/v1", model: "mistral-small-latest", keyEnv: "MISTRAL_API_KEY" },
  "mistral-large": { base: "https://api.mistral.ai/v1", model: "mistral-large-latest", keyEnv: "MISTRAL_API_KEY" },
};

function keyOrDie(env: string): string {
  const v = process.env[env];
  if (!v) {
    console.error(`[gutachter] ${env} fehlt — Lauf mit --env-file=.env.local starten.`);
    process.exit(2);
  }
  return v;
}

async function callJson<T>(provider: JudgeName, system: string, user: string, modelOverride?: string): Promise<T> {
  const cfg = MODELLE[provider];
  const model = modelOverride ?? cfg.model;
  const key = keyOrDie(cfg.keyEnv);

  const parse = (raw: string): T => {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    return JSON.parse(cleaned) as T;
  };

  if (provider === "gemini") {
    const gm = new GoogleGenerativeAI(key).getGenerativeModel({
      model,
      systemInstruction: system,
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    });
    const res = await gm.generateContent(user);
    return parse(res.response.text());
  }

  const client = new OpenAI({ apiKey: key, baseURL: cfg.base, timeout: 180_000 });
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return parse(res.choices[0]?.message?.content ?? "");
}

async function callText(provider: JudgeName, system: string, user: string, modelOverride?: string): Promise<string> {
  const cfg = MODELLE[provider];
  const model = modelOverride ?? cfg.model;
  const key = keyOrDie(cfg.keyEnv);

  if (provider === "gemini") {
    const gm = new GoogleGenerativeAI(key).getGenerativeModel({ model, systemInstruction: system });
    const res = await gm.generateContent(user);
    return res.response.text().trim();
  }
  const client = new OpenAI({ apiKey: key, baseURL: cfg.base, timeout: 180_000 });
  const res = await client.chat.completions.create({
    model,
    temperature: 0.4,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return (res.choices[0]?.message?.content ?? "").trim();
}

async function mitRetry<T>(label: string, fn: () => Promise<T>, versuche = 3): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= versuche; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[gutachter] ${label} Versuch ${i}/${versuche} fehlgeschlagen: ${msg.slice(0, 180)}`);
      if (i < versuche) await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw last;
}

// ============================================================================
// Prompt-Bau
// ============================================================================

interface Snapshot {
  korpus_id: string;
  input: {
    programm: { id: string; name: string; foerdergeber?: string; foerdergeberTyp?: string; foerdersummeText?: string };
    facts: Record<string, unknown>;
    richtlinie: Record<string, any> | null;
    messages: Array<{ role: string; kind?: string; content: string }>;
  };
  result: { artefacts: { finalText?: string; finanzplan?: unknown } };
  meta: { runIndex: number };
}

/** Der Pruef-Steckbrief: was der Geber laut Dossier verlangt. Beide Arme werden dagegen bewertet. */
export function buildSteckbrief(snap: Snapshot): string {
  const p = snap.input.programm;
  const r = snap.input.richtlinie ?? {};
  const abschnitte: Array<{ name: string; pflicht?: boolean; leitfragen?: string[] }> =
    r.antragsstruktur?.abschnitte ?? [];
  const rejects: Array<{ grund: string }> = r.rejectGruende ?? [];

  const pflicht = abschnitte
    .filter((a) => a.pflicht !== false)
    .map((a) => `- ${a.name}${a.leitfragen?.length ? `: ${a.leitfragen.slice(0, 2).join(" / ")}` : ""}`)
    .join("\n");

  return `PROGRAMM: ${p.name}
GELDGEBER: ${p.foerdergeber ?? "unbekannt"} (Typ: ${p.foerdergeberTyp ?? "unbekannt"})
FOERDERSUMME: ${p.foerdersummeText ?? "nicht angegeben"}
DOKUMENTART: ${r.dokumentLabel ?? "Antrag"}

VOM GEBER ERWARTETE PUNKTE:
${pflicht || "- keine Struktur dokumentiert"}

TYPISCHE ABLEHNUNGSGRUENDE BEI DIESEM GEBER:
${rejects.length ? rejects.map((x) => `- ${x.grund}`).join("\n") : "- keine dokumentiert"}`;
}

function rubrikBlock(): string {
  return RUBRIK.map(
    (k) => `[${k.id}] ${k.name} (Gewichtung ${k.gewichtung} %)
  Frage: ${k.frage}
  1 = ${k.anker[1]}
  3 = ${k.anker[3]}
  5 = ${k.anker[5]}`
  ).join("\n\n");
}

export function buildJudgePrompt(snap: Snapshot, antragText: string): string {
  return `${buildSteckbrief(snap)}

RUBRIK:
${rubrikBlock()}

ANTRAG (zu bewerten):
--- ANFANG ANTRAG ---
${antragText}
--- ENDE ANTRAG ---

Bewerte streng gegen die Rubrik und die Skalen-Anker. JSON gemaess Schema im System-Prompt.`;
}

export function buildPairPrompt(snap: Snapshot, a: string, b: string): string {
  return `${buildSteckbrief(snap)}

ANTRAG A:
--- ANFANG A ---
${a}
--- ENDE A ---

ANTRAG B:
--- ANFANG B ---
${b}
--- ENDE B ---

Welcher Antrag wuerde eher bewilligt? JSON gemaess Schema im System-Prompt.`;
}

/** Der Laie bekommt Interview-Antworten + Programmname — aber KEIN Dossier. */
export function buildLaiePrompt(snap: Snapshot): string {
  const p = snap.input.programm;
  const schule = (snap.input.facts as any)?.schule ?? {};
  const dialog = snap.input.messages
    .map((m) => (m.role === "user" ? `ICH: ${m.content}` : `GEFRAGT WURDE: ${m.content}`))
    .join("\n");

  return `Du beantragst Foerderung bei: ${p.name} (${p.foerdergeber ?? "Geldgeber"}).
Mehr weisst du ueber das Programm nicht — du hast nur von der Foerdermoeglichkeit gehoert.

DEINE SCHULE:
${JSON.stringify(schule, null, 1)}

WAS DU UEBER DEIN VORHABEN SAGEN KANNST (so hast du es im Gespraech formuliert):
${dialog}

Schreibe daraus den Foerderantrag, so wie du ihn ohne Antragserfahrung einreichen wuerdest.
Nur der Antragstext, keine Einleitung an mich.`;
}

// ============================================================================
// Scoring
// ============================================================================

export function gewichte(e: JudgeErgebnis): number | null {
  let summe = 0;
  let gewicht = 0;
  for (const k of RUBRIK) {
    const treffer = e.kriterien.find((x) => x.id === k.id);
    if (!treffer || treffer.score == null || treffer.nicht_bewertbar) continue;
    const s = Math.min(5, Math.max(1, treffer.score));
    summe += s * k.gewichtung;
    gewicht += k.gewichtung;
  }
  // Unter der Haelfte der Gewichtung ist kein Urteil, sondern ein Messfehler.
  if (gewicht < GEWICHT_SUMME / 2) return null;
  return summe / gewicht;
}

export function mittel(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

export function stdabw(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mittel(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Loest die Positionsrotation auf: nur beidseitig gleiches Urteil ist ein Sieg. */
export function pairAuswertung(
  vorwaerts: { besser: string },
  rueckwaerts: { besser: string }
): { gewinner: Arm | "unentschieden"; konsistent: boolean } {
  // vorwaerts: A = ki, B = laie   |   rueckwaerts: A = laie, B = ki
  const v: Arm | "unentschieden" = vorwaerts.besser === "A" ? "ki" : vorwaerts.besser === "B" ? "laie" : "unentschieden";
  const r: Arm | "unentschieden" = rueckwaerts.besser === "A" ? "laie" : rueckwaerts.besser === "B" ? "ki" : "unentschieden";
  if (v === r) return { gewinner: v, konsistent: true };
  return { gewinner: "unentschieden", konsistent: false };
}

// ============================================================================
// CLI
// ============================================================================

interface CliFlags {
  snapshots: string;
  run: number;
  arms: Arm[];
  judges: JudgeName[];
  limit: number | null;
  only: string[] | null;
  pairwise: boolean;
  laieModel: string;
  refreshLaie: boolean;
  out: string | null;
}

export function parseFlags(argv: string[]): CliFlags {
  const f: CliFlags = {
    snapshots: "data/eval/pipeline-snapshots/baseline",
    run: 1,
    arms: ["ki", "laie"],
    judges: ["gemini", "mistral-large"],
    limit: null,
    only: null,
    pairwise: true,
    laieModel: "mistral-small-latest",
    refreshLaie: false,
    out: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--snapshots") f.snapshots = argv[++i];
    else if (a.startsWith("--run=")) f.run = Number(a.slice(6));
    else if (a.startsWith("--arms=")) f.arms = a.slice(7).split(",") as Arm[];
    else if (a.startsWith("--judges=")) f.judges = a.slice(9).split(",") as JudgeName[];
    else if (a.startsWith("--limit=")) f.limit = Number(a.slice(8));
    else if (a.startsWith("--only=")) f.only = a.slice(7).split(",");
    else if (a === "--no-pairwise") f.pairwise = false;
    else if (a.startsWith("--laie-model=")) f.laieModel = a.slice(13);
    else if (a === "--refresh-laie") f.refreshLaie = true;
    else if (a === "--out") f.out = argv[++i];
  }
  return f;
}

const LAIE_CACHE = "data/eval/laien-antraege";

async function laieAntrag(snap: Snapshot, flags: CliFlags): Promise<string> {
  const pfad = resolve(LAIE_CACHE, `${snap.korpus_id}.json`);
  if (!flags.refreshLaie && existsSync(pfad)) {
    const j = JSON.parse(await readFile(pfad, "utf8"));
    if (j.text) return j.text as string;
  }
  const text = await mitRetry(`laie ${snap.korpus_id}`, () =>
    callText("mistral", LAIE_SYSTEM, buildLaiePrompt(snap), flags.laieModel)
  );
  await mkdir(LAIE_CACHE, { recursive: true });
  await writeFile(
    pfad,
    JSON.stringify({ korpusId: snap.korpus_id, model: flags.laieModel, zeichen: text.length, text }, null, 2),
    "utf8"
  );
  return text;
}

async function ladeSnapshots(flags: CliFlags): Promise<Snapshot[]> {
  const dir = resolve(flags.snapshots);
  if (!existsSync(dir)) {
    console.error(`[gutachter] Snapshot-Verzeichnis fehlt: ${dir}`);
    process.exit(2);
  }
  const dateien = (await readdir(dir)).filter((d) => d.endsWith(`-run${flags.run}.json`)).sort();
  let snaps: Snapshot[] = [];
  for (const d of dateien) {
    snaps.push(JSON.parse(await readFile(resolve(dir, d), "utf8")) as Snapshot);
  }
  if (flags.only) snaps = snaps.filter((s) => flags.only!.includes(s.korpus_id));
  if (flags.limit) snaps = snaps.slice(0, flags.limit);
  return snaps;
}

// ============================================================================
// Report
// ============================================================================

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "n/a";
}

function buildMarkdown(ergebnisse: EintragErgebnis[], flags: CliFlags, gate: ReturnType<typeof pruefeGate>): string {
  const zeilen: string[] = [];
  zeilen.push(`# WIZ-05 Gutachterurteil (1-5) — KI-Arm vs. simulierter Laien-Arm`);
  zeilen.push("");
  zeilen.push(`- Snapshots: \`${flags.snapshots}\` (run${flags.run}), n = ${ergebnisse.length}`);
  zeilen.push(`- Judges: ${flags.judges.join(", ")} (Generator der Pipeline war mistral-small — Judges bewusst andere Modelle)`);
  zeilen.push(`- Laien-Arm: **Simulation** (${flags.laieModel}), gleiche Interview-Antworten, KEIN Richtlinien-Dossier, ein Durchgang`);
  zeilen.push("");

  zeilen.push(`## Ergebnis`);
  zeilen.push("");
  zeilen.push(`| Arm | Mittel (1-5) | Stdabw | Min | Max | Ø Zeichen |`);
  zeilen.push(`|---|---|---|---|---|---|`);
  for (const arm of flags.arms) {
    const werte = ergebnisse
      .flatMap((e) => e.bewertungen.filter((b) => b.arm === arm).map((b) => b.gewichtet))
      .filter((x): x is number => x != null);
    const laengen = ergebnisse.map((e) => e.laengen[arm] ?? 0).filter((x) => x > 0);
    zeilen.push(
      `| ${arm} | **${fmt(mittel(werte))}** | ${fmt(stdabw(werte))} | ${fmt(Math.min(...werte))} | ${fmt(Math.max(...werte))} | ${Math.round(mittel(laengen))} |`
    );
  }
  zeilen.push("");

  // Judge-Spreizung: wenn beide Judges weit auseinander liegen, ist der Mittelwert wenig wert.
  zeilen.push(`### Pro Judge`);
  zeilen.push("");
  zeilen.push(`| Judge | ${flags.arms.join(" | ")} |`);
  zeilen.push(`|---|${flags.arms.map(() => "---").join("|")}|`);
  for (const j of flags.judges) {
    const zellen = flags.arms.map((arm) => {
      const werte = ergebnisse
        .flatMap((e) => e.bewertungen.filter((b) => b.arm === arm && b.judge === j).map((b) => b.gewichtet))
        .filter((x): x is number => x != null);
      return fmt(mittel(werte));
    });
    zeilen.push(`| ${j} | ${zellen.join(" | ")} |`);
  }
  zeilen.push("");

  // Nach Input-Qualitaet: entscheidend fuer die Interpretation. Ein Antrag kann nicht
  // besser werden als die Angaben, aus denen er entsteht — Zahlen erfinden waere
  // Halluzination, nicht Qualitaet.
  const kategorienListe = [...new Set(ergebnisse.map((e) => e.kategorie))].sort();
  zeilen.push(`### Nach Input-Qualitaet (Korpus-Kategorie)`);
  zeilen.push("");
  zeilen.push(`| Kategorie | n | ${flags.arms.join(" | ")} | Ø TODO-Marker |`);
  zeilen.push(`|---|---|${flags.arms.map(() => "---").join("|")}|---|`);
  for (const kat of kategorienListe) {
    const teil = ergebnisse.filter((e) => e.kategorie === kat);
    const zellen = flags.arms.map((arm) => {
      const werte = teil
        .flatMap((e) => e.bewertungen.filter((b) => b.arm === arm).map((b) => b.gewichtet))
        .filter((x): x is number => x != null);
      return fmt(mittel(werte));
    });
    const todos = mittel(teil.map((e) => e.markerZahl.todo));
    zeilen.push(`| ${kat} | ${teil.length} | ${zellen.join(" | ")} | ${fmt(todos)} |`);
  }
  zeilen.push("");

  zeilen.push(`### Pro Kriterium (Mittel 1-5)`);
  zeilen.push("");
  zeilen.push(`| Kriterium | Gew. | ${flags.arms.join(" | ")} |`);
  zeilen.push(`|---|---|${flags.arms.map(() => "---").join("|")}|`);
  for (const k of RUBRIK) {
    const zellen = flags.arms.map((arm) => {
      const werte = ergebnisse
        .flatMap((e) =>
          e.bewertungen
            .filter((b) => b.arm === arm)
            .map((b) => b.rohwerte?.kriterien?.find((x) => x.id === k.id))
            .map((x) => (x && x.score != null && !x.nicht_bewertbar ? x.score : null))
        )
        .filter((x): x is number => x != null);
      return fmt(mittel(werte));
    });
    zeilen.push(`| ${k.name} | ${k.gewichtung} % | ${zellen.join(" | ")} |`);
  }
  zeilen.push("");

  if (flags.pairwise && ergebnisse.some((e) => e.pair?.length)) {
    const alle = ergebnisse.flatMap((e) => e.pair ?? []);
    const kiSiege = alle.filter((p) => p.gewinner === "ki").length;
    const laieSiege = alle.filter((p) => p.gewinner === "laie").length;
    const unentschieden = alle.filter((p) => p.gewinner === "unentschieden").length;
    const inkonsistent = alle.filter((p) => !p.konsistent).length;
    zeilen.push(`### Gepaarter Blindvergleich (beide Reihenfolgen, ${alle.length} Paar-Urteile)`);
    zeilen.push("");
    zeilen.push(`- KI besser: **${kiSiege}** (${((kiSiege / alle.length) * 100).toFixed(0)} %)`);
    zeilen.push(`- Laie besser: **${laieSiege}** (${((laieSiege / alle.length) * 100).toFixed(0)} %)`);
    zeilen.push(`- unentschieden: ${unentschieden}, davon positionsabhaengig (inkonsistent): ${inkonsistent}`);
    zeilen.push("");
  }

  zeilen.push(`## Gate`);
  zeilen.push("");
  for (const p of gate.pruefungen) {
    zeilen.push(`- ${p.ok ? "✅" : "❌"} ${p.name}: ${p.ist} (Soll ${p.soll})`);
  }
  zeilen.push("");
  zeilen.push(`**Gesamt: ${gate.ok ? "PASS" : "FAIL"}**`);
  zeilen.push("");

  zeilen.push(`## Schwaechste Eintraege (KI-Arm)`);
  zeilen.push("");
  const proEintrag = ergebnisse
    .map((e) => ({
      id: e.korpusId,
      programm: e.programmId,
      wert: mittel(
        e.bewertungen.filter((b) => b.arm === "ki").map((b) => b.gewichtet).filter((x): x is number => x != null)
      ),
    }))
    .filter((x) => Number.isFinite(x.wert))
    .sort((a, b) => a.wert - b.wert);
  zeilen.push(`| Korpus-ID | Programm | KI-Note |`);
  zeilen.push(`|---|---|---|`);
  for (const e of proEintrag.slice(0, 10)) zeilen.push(`| ${e.id} | ${e.programm} | ${fmt(e.wert)} |`);
  zeilen.push("");

  zeilen.push(`## Haeufigste Maengel im KI-Arm (Judge-Zitate)`);
  zeilen.push("");
  for (const k of RUBRIK) {
    const maengel = ergebnisse
      .flatMap((e) => e.bewertungen.filter((b) => b.arm === "ki"))
      .map((b) => b.rohwerte?.kriterien?.find((x) => x.id === k.id))
      .filter((x): x is JudgeKriteriumErgebnis => !!x && x.score != null && x.score <= 3)
      .map((x) => x.maengel)
      .filter(Boolean) as string[];
    if (!maengel.length) continue;
    zeilen.push(`**${k.name}** (${maengel.length} × Note ≤ 3)`);
    for (const m of maengel.slice(0, 3)) zeilen.push(`  - ${m}`);
    zeilen.push("");
  }

  return zeilen.join("\n");
}

export function pruefeGate(ergebnisse: EintragErgebnis[], arms: Arm[]) {
  const kiWerte = ergebnisse
    .flatMap((e) => e.bewertungen.filter((b) => b.arm === "ki").map((b) => b.gewichtet))
    .filter((x): x is number => x != null);
  const laieWerte = ergebnisse
    .flatMap((e) => e.bewertungen.filter((b) => b.arm === "laie").map((b) => b.gewichtet))
    .filter((x): x is number => x != null);

  const kiMean = mittel(kiWerte);
  const proEintrag = ergebnisse.map((e) =>
    mittel(e.bewertungen.filter((b) => b.arm === "ki").map((b) => b.gewichtet).filter((x): x is number => x != null))
  );
  const messbar = proEintrag.filter((x) => Number.isFinite(x));
  // Math.min(...[]) waere Infinity und wuerde das Gate still gruen faerben —
  // genau die Sorte Wächter, der durchwinkt statt zu pruefen.
  const schwaechster = messbar.length ? Math.min(...messbar) : NaN;

  const pairs = ergebnisse.flatMap((e) => e.pair ?? []);
  const laieWinRate = pairs.length ? pairs.filter((p) => p.gewinner === "laie").length / pairs.length : 0;

  const pruefungen: Array<{ name: string; ok: boolean; ist: string; soll: string }> = [
    {
      name: "Messbarkeit (KI-Urteile vorhanden)",
      ok: kiWerte.length > 0 && messbar.length === ergebnisse.length,
      ist: `${messbar.length}/${ergebnisse.length} Eintraege bewertet, ${kiWerte.length} Einzelurteile`,
      soll: `alle Eintraege`,
    },
    { name: "KI-Mittel", ok: kiMean >= GATE.kiMeanMin, ist: fmt(kiMean), soll: `≥ ${GATE.kiMeanMin}` },
    {
      name: "schwaechster Antrag",
      ok: Number.isFinite(schwaechster) && schwaechster >= GATE.kiMinEntryMin,
      ist: fmt(schwaechster),
      soll: `≥ ${GATE.kiMinEntryMin}`,
    },
  ];
  if (arms.includes("laie") && laieWerte.length) {
    pruefungen.push({
      name: "Abstand zum Laien-Arm",
      ok: kiMean - mittel(laieWerte) >= GATE.minDeltaToLaie,
      ist: fmt(kiMean - mittel(laieWerte)),
      soll: `≥ ${GATE.minDeltaToLaie}`,
    });
    if (pairs.length) {
      pruefungen.push({
        name: "Laien-Siegquote (gepaart)",
        ok: laieWinRate <= GATE.laieWinRateMax,
        ist: `${(laieWinRate * 100).toFixed(0)} %`,
        soll: `≤ ${GATE.laieWinRateMax * 100} %`,
      });
    }
  }
  return { ok: pruefungen.every((p) => p.ok), pruefungen, kiMean, laieMean: mittel(laieWerte), laieWinRate };
}

// ============================================================================
// Hauptlauf
// ============================================================================

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const snaps = await ladeSnapshots(flags);
  if (!snaps.length) {
    console.error("[gutachter] keine Snapshots gefunden");
    process.exit(2);
  }
  console.log(
    `[gutachter] ${snaps.length} Eintraege · Arme ${flags.arms.join("+")} · Judges ${flags.judges.join("+")} · pairwise ${flags.pairwise}`
  );

  // Input-Kategorie aus dem Korpus (vag / kurz / ausfuehrlich). Ohne sie liest man
  // einen Mittelwert, in dem "Nutzer weiss nichts" und "Nutzer liefert Substanz"
  // vermischt sind — und genau das entscheidet ueber die erreichbare Note.
  const kategorien = new Map<string, string>();
  try {
    const korpus = JSON.parse(await readFile("data/eval/pipeline-korpus.json", "utf8")) as Array<{
      id: string;
      category?: string;
    }>;
    for (const k of korpus) kategorien.set(k.id, k.category ?? "unbekannt");
  } catch {
    console.warn("[gutachter] Korpus nicht lesbar — Kategorien bleiben leer.");
  }

  const ergebnisse: EintragErgebnis[] = [];
  const t0 = Date.now();

  for (const [i, snap] of snaps.entries()) {
    const kiText = snap.result?.artefacts?.finalText ?? "";
    if (!kiText) {
      console.warn(`[gutachter] ${snap.korpus_id}: kein finalText im Snapshot — uebersprungen`);
      continue;
    }
    const bereinigt = markerEntfernen(kiText);
    const texte: Partial<Record<Arm, string>> = { ki: kiText, "ki-ohne-marker": bereinigt.text };
    if (flags.arms.includes("laie")) texte.laie = await laieAntrag(snap, flags);

    const eintrag: EintragErgebnis = {
      korpusId: snap.korpus_id,
      programmId: snap.input.programm.id,
      programmName: snap.input.programm.name,
      geberTyp: snap.input.programm.foerdergeberTyp ?? "unbekannt",
      kategorie: kategorien.get(snap.korpus_id) ?? "unbekannt",
      markerZahl: { todo: bereinigt.todo, annahme: bereinigt.annahme },
      laengen: {
        ki: kiText.length,
        "ki-ohne-marker": bereinigt.text.length,
        laie: texte.laie?.length ?? 0,
      },
      bewertungen: [],
      pair: [],
    };

    for (const judge of flags.judges) {
      for (const arm of flags.arms) {
        const text = texte[arm];
        if (!text) continue;
        try {
          const roh = await mitRetry(`judge ${judge}/${arm}/${snap.korpus_id}`, () =>
            callJson<JudgeErgebnis>(judge, JUDGE_SYSTEM, buildJudgePrompt(snap, text))
          );
          eintrag.bewertungen.push({
            arm,
            judge,
            gewichtet: gewichte(roh),
            gesamturteil: roh.gesamturteil,
            entscheidung: roh.entscheidung,
            rohwerte: roh,
          });
        } catch (e) {
          eintrag.bewertungen.push({
            arm,
            judge,
            gewichtet: null,
            gesamturteil: NaN,
            entscheidung: "fehler",
            rohwerte: { kriterien: [], gesamturteil: NaN, entscheidung: "fehler", summary: "" },
            fehler: e instanceof Error ? e.message : String(e),
          });
        }
      }

      if (flags.pairwise && texte.laie) {
        try {
          const vor = await mitRetry(`pair-vor ${judge}/${snap.korpus_id}`, () =>
            callJson<{ besser: string; deutlichkeit: string; grund: string }>(
              judge,
              PAIRWISE_SYSTEM,
              buildPairPrompt(snap, kiText, texte.laie!)
            )
          );
          const rueck = await mitRetry(`pair-rueck ${judge}/${snap.korpus_id}`, () =>
            callJson<{ besser: string; deutlichkeit: string; grund: string }>(
              judge,
              PAIRWISE_SYSTEM,
              buildPairPrompt(snap, texte.laie!, kiText)
            )
          );
          const auf = pairAuswertung(vor, rueck);
          eintrag.pair!.push({
            judge,
            gewinner: auf.gewinner,
            konsistent: auf.konsistent,
            details: [
              { reihenfolge: "A=ki,B=laie", besser: vor.besser, deutlichkeit: vor.deutlichkeit, grund: vor.grund },
              { reihenfolge: "A=laie,B=ki", besser: rueck.besser, deutlichkeit: rueck.deutlichkeit, grund: rueck.grund },
            ],
          });
        } catch (e) {
          console.warn(`[gutachter] Paarvergleich ${judge}/${snap.korpus_id} fehlgeschlagen: ${e}`);
        }
      }
    }

    ergebnisse.push(eintrag);
    const kiNote = mittel(
      eintrag.bewertungen.filter((b) => b.arm === "ki").map((b) => b.gewichtet).filter((x): x is number => x != null)
    );
    const laieNote = mittel(
      eintrag.bewertungen.filter((b) => b.arm === "laie").map((b) => b.gewichtet).filter((x): x is number => x != null)
    );
    console.log(
      `[gutachter] ${i + 1}/${snaps.length} ${snap.korpus_id}: ki ${fmt(kiNote)}${
        flags.arms.includes("laie") ? ` · laie ${fmt(laieNote)}` : ""
      }`
    );
  }

  const gate = pruefeGate(ergebnisse, flags.arms);
  const iso = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const basis = flags.out ?? `data/eval/gutachter-reports/${iso}`;
  await mkdir(resolve(basis, ".."), { recursive: true });
  await writeFile(
    resolve(`${basis}.json`),
    JSON.stringify(
      { iso, flags, gate, dauerSek: Math.round((Date.now() - t0) / 1000), ergebnisse },
      null,
      2
    ),
    "utf8"
  );
  const md = buildMarkdown(ergebnisse, flags, gate);
  await writeFile(resolve(`${basis}.md`), md, "utf8");

  console.log("\n" + md.split("## Schwaechste")[0]);
  console.log(`[gutachter] Report: ${basis}.json / .md`);
  process.exit(gate.ok ? 0 : 1);
}

if (process.argv[1] && /eval-gutachter\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error("[gutachter] Abbruch:", e);
    process.exit(2);
  });
}
