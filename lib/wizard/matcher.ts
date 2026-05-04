/**
 * Matching: Anliegen + Schul-Kontext → gerankte Liste passender Foerderprogramme
 * ODER Klaerungsfrage bei vagem Anliegen.
 *
 * Nutzt das Interview-Modell mit Plain-Text-Pipe-Format. JSON-Mode ist bei
 * DeepSeek 5–10× langsamer (zu viel internes Reasoning um JSON-Strukturen),
 * deshalb hier Format `id|score|passt_weil|achtung_bei` pro Zeile (4 Spalten,
 * D-01) ODER `CLARIFY|<frage>` als erste Zeile bei vagem Anliegen (D-05).
 *
 * Tagged-Union-Return: `{ kind: "ranking", ... }` oder `{ kind: "clarification", ... }`
 * (D-08). Frontend dispatched auf `kind` und rendert entsprechend.
 */

import foerderprogrammeData from "@/data/foerderprogramme.json";
import prioritaetenData from "@/data/richtlinien-prioritaeten.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { MODEL_FLASH, generateText } from "./llm";
import { addUsage, emptyLedger, type CostLedger } from "./pricing";

const programme = foerderprogrammeData as Foerderprogramm[];

/**
 * Map programmId → Queue-Score. Wird zum Top-N-Prefilter genutzt, damit der
 * LLM-Prompt schlank bleibt (DeepSeek skaliert hart mit Input-Groesse).
 */
const QUEUE_SCORES: Map<string, number> = new Map(
  ((prioritaetenData as { items?: Array<{ programmId: string; score: number; status?: string }> }).items ?? [])
    .filter((q) => q.status !== "skip")
    .map((q) => [q.programmId, q.score] as const)
);

/** Wieviele Programme maximal an den LLM uebergeben werden. */
const MAX_LLM_CANDIDATES = 20;
/** Wieviele Treffer der LLM maximal liefern soll. */
const MAX_MATCHES = 3;
/** Hard-Cap fuer Output-Tokens. Reicht satt fuer 3 Pipe-Zeilen
 * (4 Spalten + ggf. CLARIFY-Variante, ~200 Tokens echte Nutzlast). Notbremse, kein aktiver Cut. */
// 600 = Erhoehung fuer Phase-2.1-Prompt-Erweiterung (war 400)
const MATCHER_MAX_TOKENS = 600;

export interface MatchInput {
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
  /** D-09: wenn true, unterdrueckt CLARIFY-Dispatch — der Matcher MUSS ranken. */
  forceRanking?: boolean;
  /** D-09: bei zweitem Aufruf nach Klaerungsfrage — urspruengliches Anliegen als Kontext. */
  previousAnliegen?: string;
}

/**
 * Ein einzelner Match-Treffer im Ranking-Pfad.
 * D-04: altes Pauschal-Feld ist hart entfernt — ersetzt durch `passt_weil` + `achtung_bei`.
 */
export interface MatchHit {
  id: string;
  score: number;
  /** D-01: max ~25 Worte, konkreter Bezug zum Anliegen. */
  passt_weil: string;
  /** D-01: max ~20 Worte, kann leer sein (Trailing-Pipe im Pipe-Format). */
  achtung_bei: string;
  programm: Foerderprogramm;
}

/**
 * Tagged-Union (D-08): entweder gerankte Treffer ODER Klaerungsfrage.
 * Feldname `costs` (nicht `cost` — Codebase-Konvention, siehe pricing.ts).
 */
export type MatchResult =
  | {
      kind: "ranking";
      matches: MatchHit[];
      costs: CostLedger;
      totalCandidates: number;
      filteredOut: number;
    }
  | {
      kind: "clarification";
      question: string;
      costs: CostLedger;
    };

/**
 * Vor-Filter: Programme ausschliessen, die aufgrund harter Kriterien nicht passen.
 * Reduziert Token-Verbrauch und Halluzinationen des Matchers.
 */
/** Vollnamen der Bundeslaender → Daten-Codes wie sie in foerderprogramme.json stehen. */
const BUNDESLAND_NAME_TO_CODE: Record<string, string> = {
  "BADEN-WÜRTTEMBERG": "DE-BW",
  "BADEN-WUERTTEMBERG": "DE-BW",
  "BAYERN": "DE-BY",
  "BERLIN": "DE-BE",
  "BRANDENBURG": "DE-BB",
  "BREMEN": "DE-HB",
  "HAMBURG": "DE-HH",
  "HESSEN": "DE-HE",
  "MECKLENBURG-VORPOMMERN": "DE-MV",
  "NIEDERSACHSEN": "DE-NI",
  "NORDRHEIN-WESTFALEN": "DE-NW",
  "RHEINLAND-PFALZ": "DE-RP",
  "SAARLAND": "DE-SL",
  "SACHSEN": "DE-SN",
  "SACHSEN-ANHALT": "DE-ST",
  "SCHLESWIG-HOLSTEIN": "DE-SH",
  "THÜRINGEN": "DE-TH",
  "THUERINGEN": "DE-TH",
};

/** Akzeptiert Vollname (z. B. „Baden-Württemberg") ODER Code (z. B. „DE-BW") und liefert den Code. */
function normalizeBundesland(raw: string | undefined): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (!upper) return null;
  // Schon Code-Form?
  if (/^DE-[A-Z]{2}$/.test(upper)) return upper;
  return BUNDESLAND_NAME_TO_CODE[upper] ?? null;
}

function prefilter(input: MatchInput, all: Foerderprogramm[]): Foerderprogramm[] {
  const blCode = normalizeBundesland(input.bundesland);
  return all.filter((p) => {
    // Abgelaufene Fristen ausschliessen
    if ((p as any).status && (p as any).status === "abgelaufen") return false;

    // Landesprogramme filtern: wenn User bundesland gesetzt hat und
    // Programm explizit andere Laender fordert
    if (blCode && Array.isArray((p as any).bundeslaender) && (p as any).bundeslaender.length > 0) {
      const entries = ((p as any).bundeslaender as string[]).map((x) => x.toLowerCase());
      // "alle" bedeutet bundesweit; sonst exakter Match auf BL-Code
      const isBundesweit = entries.includes("alle");
      const matchesBL = entries.includes(blCode.toLowerCase());
      if (!isBundesweit && !matchesBL) return false;
    }

    return true;
  });
}

/**
 * Baut eine kompakte Karten-Darstellung pro Programm (für den LLM-Prompt).
 * Bewusst minimal — DeepSeek-Latency skaliert mit Input-Groesse, daher nur die
 * Felder, die der Matcher fuer Score + Begruendung braucht. Frist/Geber/Typ/
 * Zielgruppe werden erst spaeter (Programm-Detail-Seite) ausgespielt.
 */
interface CompactProgrammCard {
  id: string;
  name: string;
  foerdersumme?: number | string;
  kategorien?: string[];
  kurz?: string;
}

function toCard(p: Foerderprogramm): CompactProgrammCard {
  return {
    id: p.id,
    name: p.name,
    foerdersumme: (p as any).foerdersummeMax ?? (p as any).foerdersummeText,
    kategorien: ((p as any).kategorien ?? []).slice(0, 4),
    kurz: ((p as any).kurzbeschreibung ?? "").substring(0, 120),
  };
}

const MATCHER_SYSTEM = `Du bist Foerdermittel-Berater fuer Schulen in Deutschland.
Aufgabe: Anliegen + Liste von Foerderprogrammen → entweder die ${MAX_MATCHES} BESTEN Treffer
oder eine kurze Klaerungsfrage, falls das Anliegen zu vage ist.

## Kriterien (Reihenfolge = Gewicht) — kein thematischer Drift
1. Thematische Passung — domain-spezifisch hat IMMER Vorrang vor allgemein
   (z.B. "Mathe-Wettbewerbe" → Mathe-spezifische Programme schlagen
   generische Schul-Wettbewerbe; "NABU-Standort" → NABU/Natur-Programme
   schlagen Klima/Inklusion; "Mehrsprachige Buecher" → Sprache/Lesen-Programme
   schlagen allgemeine Bibliotheks-Programme)
2. Formale Passung (Schultyp, Bundesland, Summe)
3. Praktikabilitaet  4. Wirkungstiefe

## Wichtig — KEIN Drift in Defaults
- Bei klar thematischer Anfrage NICHT auf "aktion-mensch-schulkooperation"
  zurueckfallen, wenn das Anliegen keinen Inklusions-Bezug hat
- Bei klar thematischer Anfrage NICHT auf "bmbf-digitalpakt-2" zurueckfallen,
  wenn das Anliegen keinen Digital/Hardware-Bezug hat
- Bei klar thematischer Anfrage (Mathe/Sport/Kultur/Sprache/Natur) IMMER
  mind. ein Domain-spezifisches Programm im Top-3, falls eines existiert
- Wenn ein Programm thematisch klar passt, Score >= 60 setzen — NICHT
  kuenstlich niedrig, weil andere formale Aspekte fehlen (BL/Schultyp).
  Lieber Score 65 mit "achtung_bei: Bundesland im Profil ergaenzen" als
  leere Liste.

## Verboten
- Programme erfinden (nur IDs aus der Liste)
- Score < 50 (lieber leere Liste als Gefaelligkeit)
- Pipe-Char \`|\` im Inhalt von passt_weil/achtung_bei

## AUSGABE — zwei moegliche Formen:

### Form A — wenn Anliegen VAGE (mind. 2 von 3 Pflicht-Slots fehlen):
CLARIFY|<konkrete Frage mit konkreten Optionen>

Pflicht-Slots:
- Bundesland: gilt als gefuellt, wenn das Anliegen ODER das Schul-Profil ein konkretes Bundesland nennt
- Zielgruppe/Schultyp: gilt als gefuellt, wenn ein Schultyp/Klassenstufe/Schuelergruppe genannt ist
- Thematischer Fokus: gilt als gefuellt, wenn das Anliegen GENAU EIN klares
  Themenfeld nennt (z.B. "digital", "Sport", "Lesen", "Inklusion", "Kultur").
  Gilt als FEHLEND in folgenden Faellen:
  (a) keines genannt
  (b) mehrere widerspruechliche genannt ("Sport, Kultur und Digitales")
  (c) drei oder mehr unentschiedene Optionen ("Theater, MINT-AG oder
      Austausch — was passt wirtschaftlich?")
  (d) Phrasen wie "irgendwas zwischen X und Y", "wir wissen noch nicht
      wo der Hebel am groessten ist", "viele Ideen, aber nichts Konkretes"

Beispiel CLARIFY:
CLARIFY|Fuer welches Bundesland sucht ihr und welcher Schwerpunkt steht im Vordergrund — z.B. Digitalisierung, Sport, Kultur oder etwas anderes?

Beispiel CLARIFY (mehrere widerspruechliche Themen):
CLARIFY|Ihr nennt Theater, MINT-AG und Austausch — das sind sehr verschiedene Foerderschienen. Welcher Bereich steht fuer euch im Vordergrund?

Beispiel CLARIFY (unentschiedene Strategie):
CLARIFY|"Irgendwas zwischen Inklusion, Demokratielernen und Internationalisierung" ist zu breit. Welcher der drei Bereiche soll der Schwerpunkt sein?

### Form B — wenn Anliegen KLAR genug (exakt ${MAX_MATCHES} oder weniger Zeilen):
id|score|passt_weil|achtung_bei

Regeln Form B:
- id: exakt aus der Liste, kein Whitespace drum
- score: ganze Zahl 50-100
- passt_weil: max ~25 Worte, sachlich, mit konkretem Bezug zum Anliegen
- achtung_bei: max ~20 Worte, kann LEER sein — dann Trailing-Pipe (\`id|score|text|\`)
- Genau 4 Spalten — bei leerem achtung_bei: Trailing-Pipe ist PFLICHT, sonst wird die Zeile verworfen
- Pipe-Char \`|\` im Text VERBOTEN

Beispiele Form B:
bmbf-digitalpakt-2|92|Bundesweite Foerderung digitaler Schulinfrastruktur, deckt Hardware ab.|Antragsfrist naht — Einreichung vor Juli pruefen.
kultur-macht-stark|75|Foerdert ausserschulische Kulturprojekte wie Theater-AGs.|

### NEGATIVBEISPIELE — was NICHT erlaubt ist:
CLARIFY|Was wollt ihr genau?                       <- zu vage, keine Optionen
bmbf-digitalpakt-2|90|Passt.|                      <- passt_weil zu kurz
kultur-macht-stark|85|gut.                         <- FEHLENDE Trailing-Pipe (3 statt 4 Spalten)
prog-x|70|Text mit | im Inhalt.|Achtung.           <- Pipe im Text verboten

## NEGATIVBEISPIELE — was NICHT erlaubt ist (Drift):
Anliegen "Mathe-Wettbewerbe ausbauen" -> Top-3 mit playmobil-hobpreis|ferry-porsche-challenge|claussen-simon
  <- FALSCH: kaenguru-der-mathematik / mathe-im-advent / bundeswettbewerb-mathematik haetten Vorrang
Anliegen "Schul-Aquarium und NABU-Standort" -> Top-3 mit kultur-macht-stark|klimalab|aktion-mensch
  <- FALSCH: nabu-schulen / bfn-artenvielfalt / stiftung-kinder-forschen sind Domain-spezifisch
Anliegen "Mehrsprachige Bibliothek (600 Buecher Tuerkisch/Arabisch)" -> leere Liste
  <- FALSCH: lesen-macht-stark / sprache-macht-stark / mercator-integration passen klar

KEINE Vorrede, KEINE Markdown-Bullets/Fences, KEINE Erklaerung danach.
Sortiert nach Score absteigend. Wenn weniger als ${MAX_MATCHES} Programme passen, weniger Zeilen ausgeben.`;

function buildUserPrompt(input: MatchInput, cards: CompactProgrammCard[]): string {
  const ctx: string[] = [];
  ctx.push(`ANLIEGEN DER SCHULE:\n${input.anliegen.trim()}`);
  const profile: string[] = [];
  if (input.schulname) profile.push(`Name: ${input.schulname}`);
  if (input.schultyp) profile.push(`Schultyp: ${input.schultyp}`);
  if (input.bundesland) profile.push(`Bundesland: ${input.bundesland}`);
  if (input.geschaetztesBudgetEur)
    profile.push(`Geschaetztes Budget: ${input.geschaetztesBudgetEur.toLocaleString("de-DE")} EUR`);
  if (profile.length) ctx.push(`\nSCHUL-PROFIL:\n${profile.join("\n")}`);
  ctx.push(`\nKANDIDATENLISTE (${cards.length} Programme):\n${JSON.stringify(cards)}`);
  ctx.push(`\nLiefere die ${MAX_MATCHES} besten Treffer im Pipe-Format. IDs exakt wie in der Liste.`);

  // D-09: Conditional-Bloecke fuer forceRanking + previousAnliegen
  if (input.forceRanking) {
    ctx.push(
      `\n[HINWEIS]: Auch wenn das Anliegen vage erscheint — KEIN CLARIFY. Direkt ranken (ggf. mit niedrigen Scores).`
    );
  }
  if (input.previousAnliegen) {
    ctx.push(
      `\nURSPRUENGLICHES ANLIEGEN (Kontext-Referenz):\n${input.previousAnliegen.trim()}`
    );
  }
  return ctx.join("\n");
}

/**
 * Internes Roh-Format nach Pipe-Parser.
 * 4 Spalten exakt — Soft-Failure verwirft Zeilen mit !=4 Spalten (D-02).
 */
interface RawMatch {
  id: string;
  score: number;
  passt_weil: string;
  achtung_bei: string;
}

/**
 * Parser fuer das Pipe-Format `id|score|passt_weil|achtung_bei`.
 * D-01: exakt 4 Spalten erforderlich.
 * D-02: Zeilen mit Spalten != 4 werden Soft-Failure (continue) verworfen — kein Throw.
 * D-05: CLARIFY|-Zeilen werden hier ignoriert (Dispatch passiert in runMatch).
 *
 * Robust gegen Vorrede, Bullet-Praefixe, Markdown-Fences.
 * Trailing-Pipe (`id|score|text|`) wird korrekt als leeres `achtung_bei: ""` geparst,
 * da JavaScript `"a|b|c|".split("|")` 4 Elemente zurueckgibt (letztes leer).
 */
export function parsePipeMatches(text: string, validIds: Set<string>): RawMatch[] {
  const out: RawMatch[] = [];
  for (const rawLine of text.split("\n")) {
    // Markdown-Fences und Leerzeilen verwerfen
    if (/^\s*```/.test(rawLine) || !rawLine.trim()) continue;
    // fuehrende Bullets/Nummern entfernen ("- ", "* ", "1. ", "1) ")
    const cleaned = rawLine.trim().replace(/^[-*•]\s+|^\d+[.)]\s+/, "");
    // CLARIFY-Zeilen werden in runMatch dispatched, nicht hier
    if (cleaned.startsWith("CLARIFY|")) continue;

    const parts = cleaned.split("|");
    // D-02: Soft-Failure bei Spalten != 4
    if (parts.length !== 4) continue;

    const [id, scoreStr, passt_weil, achtung_bei] = parts.map((s) => s.trim());
    const score = parseInt(scoreStr, 10);
    // WR-05: Score-Range 0-100 hart pruefen — pathologische LLM-Outputs (z.B. score=999) raus.
    // score < 50 wird weiterhin in runMatch gefiltert (zentrale Geschaeftslogik), aber
    // hier zentralisieren wir die formale Range-Validierung.
    if (!id || !validIds.has(id) || isNaN(score) || score < 0 || score > 100) continue;

    out.push({
      id,
      score,
      passt_weil: passt_weil ?? "",
      achtung_bei: achtung_bei ?? "",
    });
  }
  return out;
}

export async function runMatch(input: MatchInput): Promise<MatchResult> {
  if (!input.anliegen || input.anliegen.trim().length < 20) {
    throw new Error(
      "Bitte beschreibe dein Anliegen etwas ausfuehrlicher (mind. 20 Zeichen)."
    );
  }

  const filtered = prefilter(input, programme);

  // Top-N nach Queue-Score: aussichtsreichste Programme zuerst, Rest faellt
  // weg. Ein Programm ohne Queue-Eintrag bekommt Score 0 (landet hinten).
  const topN = [...filtered]
    .sort((a, b) => (QUEUE_SCORES.get(b.id) ?? 0) - (QUEUE_SCORES.get(a.id) ?? 0))
    .slice(0, MAX_LLM_CANDIDATES);
  const cards = topN.map(toCard);

  const { value: rawText, usage } = await generateText(
    MODEL_FLASH,
    MATCHER_SYSTEM,
    buildUserPrompt(input, cards),
    { maxTokens: MATCHER_MAX_TOKENS }
  );

  const costs = addUsage(emptyLedger(), MODEL_FLASH, usage);

  // D-05/D-08/D-09: CLARIFY-Dispatch VOR Parser.
  // Nur die ALLERERSTE Zeile zaehlt — spaetere CLARIFY|-Zeilen werden in
  // parsePipeMatches per `continue` ignoriert.
  // forceRanking=true unterdrueckt den Dispatch komplett.
  const firstLine = rawText.trim().split("\n")[0]?.trim() ?? "";
  if (!input.forceRanking && firstLine.startsWith("CLARIFY|")) {
    const question = firstLine.slice("CLARIFY|".length).trim();
    return { kind: "clarification", question, costs };
  }

  // Standard-Ranking-Pfad
  const validIds = new Set(programme.map((p) => p.id));
  const rawMatches = parsePipeMatches(rawText, validIds);

  const matches: MatchHit[] = [];
  for (const m of rawMatches) {
    if (m.score < 50) continue;
    const p = programme.find((x) => x.id === m.id);
    if (!p) continue;
    matches.push({
      id: m.id,
      score: Math.round(m.score),
      passt_weil: m.passt_weil,
      achtung_bei: m.achtung_bei,
      programm: p,
    });
  }

  matches.sort((a, b) => b.score - a.score);

  return {
    kind: "ranking",
    matches: matches.slice(0, MAX_MATCHES),
    costs,
    totalCandidates: filtered.length,
    filteredOut: programme.length - filtered.length,
  };
}
