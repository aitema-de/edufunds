/**
 * P4-A Teil 1 (Pilot-Feedback 24.06.) — On-Demand-Passagen-Reformulierung.
 *
 * Der Tester wünschte, Formulierungen wählen zu können. Statt zwei teurer
 * Voll-Entwürfe (L) oder eines Pipeline-Umbaus für echte Abschnittsvarianten
 * (XL) formulieren wir EINE vom Nutzer gewählte Passage auf Wunsch um — als
 * streng faktenerhaltende Paraphrase, gesichert durch das bestehende
 * Halluzinations-Diff-Gate (`detectIntroduced`).
 *
 * BEWUSST AUSSERHALB von `lib/wizard/`: der CI-Pipeline-Eval-Workflow ist auf
 * `lib/wizard/**` pfad-gefiltert und prüft die VOLLTEXT-Pipeline (WIZ-01/02) —
 * für eine Passagen-Paraphrase der falsche Test. Die passende Absicherung ist
 * `scripts/smoke-reformulierung.ts` (Fakt-Erhalt + Register-Wechsel). Der
 * Import aus `lib/wizard/hallucination-gate` modifiziert wizard/ nicht und
 * triggert den Path-Filter daher nicht.
 */

import type { WizardFacts } from "@/lib/wizard/types";
import { buildAllowedCorpus, detectIntroduced } from "@/lib/wizard/hallucination-gate";

export type ReformulierDirektive = "kuerzer" | "foermlicher" | "konkreter";

export const REFORMULIER_DIREKTIVEN: Record<
  ReformulierDirektive,
  { label: string; instruktion: string }
> = {
  kuerzer: {
    label: "Kürzer",
    instruktion:
      "Straffe die Passage auf das Wesentliche: kürzere Sätze, keine Wiederholungen, keine Füllwörter. " +
      "Alle Fakten, Zahlen, Namen und Aussagen bleiben erhalten — du entfernst nur Redundanz, keine Inhalte.",
  },
  foermlicher: {
    label: "Förmlicher",
    instruktion:
      "Hebe das Register auf eine sachlich-förmliche Antragssprache: neutraler, präziser Ton, keine " +
      "Umgangssprache. Inhalt, Länge und alle Fakten bleiben im Kern unverändert.",
  },
  konkreter: {
    label: "Konkreter",
    instruktion:
      "Formuliere anschaulicher und stärker am konkreten Vorhaben verankert — aber ausschließlich mit den " +
      "bereits in der Passage vorhandenen Fakten. Erfinde KEINE neuen Details, Zahlen, Partner, Termine oder Zusagen.",
  },
};

export function isReformulierDirektive(v: unknown): v is ReformulierDirektive {
  return v === "kuerzer" || v === "foermlicher" || v === "konkreter";
}

/** Minimale/maximale Passagenlänge — zu kurz lohnt nicht, zu lang = Missbrauch/Kosten. */
export const MIN_PASSAGE_LEN = 40;
export const MAX_PASSAGE_LEN = 4000;

const MARKER_RE = /\[Annahme:[^\]]*\]/g;

/** Alle `[Annahme: …]`-Marker (P1-Ehrlichkeit) einer Passage — für die Erhalt-Prüfung. */
export function extractMarkers(text: string): string[] {
  return text.match(MARKER_RE) ?? [];
}

const SYSTEM = [
  "Du bist ein Lektor für Förderanträge und formulierst eine einzelne Passage eines Antragstexts um.",
  "",
  "STRIKTE REGELN:",
  "- Ändere AUSSCHLIESSLICH Stil, Register oder Länge gemäß der Anweisung.",
  "- Übernimm jeden Fakt, jede Zahl, jeden Eigennamen und jedes Datum WORTWÖRTLICH.",
  "- Erhalte jeden Marker der Form [Annahme: …] unverändert und an sinnvoller Stelle im Text.",
  "- Führe KEINE neuen Fakten, Zahlen, Beträge, Namen, Mengen, Termine, Zusagen oder Behauptungen ein.",
  "- Antworte AUSSCHLIESSLICH mit der umformulierten Passage — kein Vorwort, keine Erklärung, keine Anführungszeichen, keine Markdown-Überschrift.",
].join("\n");

export function buildReformulierungPrompt(
  passage: string,
  direktive: ReformulierDirektive
): { system: string; user: string } {
  const user = [
    `Anweisung: ${REFORMULIER_DIREKTIVEN[direktive].instruktion}`,
    "",
    "Passage:",
    passage.trim(),
  ].join("\n");
  return { system: SYSTEM, user };
}

/**
 * Modelloutput säubern: eventuelle umschließende Anführungszeichen und ein
 * versehentliches Vorwort ("Hier die umformulierte Fassung:") entfernen.
 */
export function cleanVariante(raw: string): string {
  let t = raw.trim();
  // führendes Meta-Vorwort bis zum ersten Doppelpunkt am Zeilenanfang (nur kurze Zeile)
  const firstLineBreak = t.indexOf("\n");
  const firstLine = firstLineBreak === -1 ? t : t.slice(0, firstLineBreak);
  if (/^[^.]{0,60}:\s*$/.test(firstLine) && firstLineBreak !== -1) {
    t = t.slice(firstLineBreak + 1).trim();
  }
  // umschließende Anführungszeichen (ASCII, deutsch „…“, Guillemets »…«)
  const quotePairs: Array<[string, string]> = [
    ['"', '"'],
    ["„", "“"], // „ …  “
    ["»", "«"], // » … «
  ];
  for (const [open, close] of quotePairs) {
    if (t.length >= 2 && t.startsWith(open) && t.endsWith(close)) {
      t = t.slice(open.length, t.length - close.length).trim();
      break;
    }
  }
  return t;
}

export interface VariantenBefund {
  ok: boolean;
  /** Grund bei ok=false — für den Nutzerhinweis + Retry-Verschärfung. */
  grund?: "marker_verloren" | "neue_angaben" | "leer" | "unveraendert";
  /** Vom Gate erkannte, nicht gedeckte Zahlen/Entitäten (für die Retry-Verschärfung). */
  eingefuehrt?: string[];
}

/**
 * Deterministischer Backstop: die Variante darf (a) keinen [Annahme:]-Marker der
 * Passage verlieren und (b) keine Zahl/Entität einführen, die nicht wörtlich in
 * Passage + Facts + Nutzerantworten steht. Kein LLM.
 */
export function bewerteVariante(
  passage: string,
  variante: string,
  facts: WizardFacts,
  userAnswers?: string[]
): VariantenBefund {
  const v = variante.trim();
  if (v.length === 0) return { ok: false, grund: "leer" };
  if (v === passage.trim()) return { ok: false, grund: "unveraendert" };

  // (a) Marker-Erhalt (P1-Ehrlichkeit)
  for (const marker of extractMarkers(passage)) {
    if (!variante.includes(marker)) {
      return { ok: false, grund: "marker_verloren" };
    }
  }

  // (b) Halluzinations-Diff-Gate, auf die Passage skaliert.
  const corpus = buildAllowedCorpus(passage, facts, userAnswers);
  const introduced = detectIntroduced(variante, corpus);
  const eingefuehrt = [...introduced.numbers, ...introduced.entities];
  if (eingefuehrt.length > 0) {
    return { ok: false, grund: "neue_angaben", eingefuehrt };
  }
  return { ok: true };
}

export interface ReformulierDeps {
  /** Injizierte LLM-Generierung (Route: generateText(MODEL_PRO, …)). Testbar. */
  generate: (system: string, user: string) => Promise<{ value: string }>;
}

export interface ReformulierEingabe {
  passage: string;
  direktive: ReformulierDirektive;
  facts: WizardFacts;
  userAnswers?: string[];
}

export type ReformulierErgebnis =
  | { ok: true; variante: string }
  | { ok: false; grund: VariantenBefund["grund"] | "zu_kurz" | "zu_lang" };

/**
 * Formuliert eine Passage um und gibt nur eine gate-geprüfte Variante zurück.
 * Bei einem Gate-Verstoß EIN verschärfter Retry (mit den konkreten Fundstellen),
 * dann Aufgabe (Original behalten) — nie eine ungeprüfte Variante ausliefern.
 */
export async function reformulatePassage(
  eingabe: ReformulierEingabe,
  deps: ReformulierDeps
): Promise<ReformulierErgebnis> {
  const passage = eingabe.passage.trim();
  if (passage.length < MIN_PASSAGE_LEN) return { ok: false, grund: "zu_kurz" };
  if (passage.length > MAX_PASSAGE_LEN) return { ok: false, grund: "zu_lang" };

  const { system, user } = buildReformulierungPrompt(passage, eingabe.direktive);

  const versuch = async (extraSystem?: string): Promise<VariantenBefund & { variante: string }> => {
    const res = await deps.generate(extraSystem ? `${system}\n\n${extraSystem}` : system, user);
    const variante = cleanVariante(res.value ?? "");
    const befund = bewerteVariante(passage, variante, eingabe.facts, eingabe.userAnswers);
    return { ...befund, variante };
  };

  let r = await versuch();
  if (r.ok) return { ok: true, variante: r.variante };

  // Verschärfter Retry nur, wenn das LLM neue Angaben eingeführt hat — mit
  // den konkreten Fundstellen. Marker-/Leer-/Unverändert-Fehler retryen wir
  // nicht (deterministisch nicht besser lösbar).
  if (r.grund === "neue_angaben" && r.eingefuehrt?.length) {
    const strenger =
      "WICHTIG: Der vorige Versuch hat unerlaubt neue Angaben eingeführt: " +
      r.eingefuehrt.join(", ") +
      ". Formuliere erneut und verwende AUSSCHLIESSLICH Angaben, die wörtlich in der Passage stehen.";
    r = await versuch(strenger);
    if (r.ok) return { ok: true, variante: r.variante };
  }

  return { ok: false, grund: r.grund };
}
