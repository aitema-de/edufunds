/**
 * Evidenz-Rhetorik ohne Quelle — deterministisch erkennen und entschärfen.
 *
 * WARUM ES DIESE DATEI GIBT
 * -------------------------
 * Die Pilot-Testerin am 19.08.2026: „Etwas skeptisch machen mich Formulierungen
 * wie ‚nachweislich'. In einem Abschnitt wird behauptet, außerschulische Lernorte
 * würden nachweislich Selbstbestimmung und intrinsische Motivation fördern. Das
 * mag stimmen, aber ich weiß als Leserin nicht, woher diese Aussage kommt."
 *
 * Paket 5 hat das Verbot in den Prompt geschrieben. Gemessen über 75 Anträge hat
 * es die Fundstellen von 84 auf 66 gedrückt — und **63 „nachweislich" blieben in
 * 29 von 75 Anträgen stehen**. Damit ist es genau der Fall, den verbots-gate.ts
 * schon beschreibt: „Die Verbote gehen nicht unter — es prüft sie nur niemand nach."
 *
 * WARUM DETERMINISTISCH UND WARUM NUR DAS ADVERB
 * ----------------------------------------------
 * Alle 66 Fundstellen im Lauf `2026-08-20T14-40-26` sind adverbial gebaut:
 * „weil projektbasiertes Lernen NACHWEISLICH die Selbstwirksamkeit stärkt",
 * „Methoden … stärken NACHWEISLICH die soziale Kompetenz". Das Wort zu streichen
 * ist grammatisch immer korrekt und ändert genau eine Sache: Aus einem behaupteten
 * Beleg wird eine Aussage. Das ist, was die Testerin verlangt hat („entweder es
 * gibt eine belastbare Quelle, oder sie formuliert vorsichtiger").
 *
 * 🚫 Die SATZ-Formen („Studien zeigen, dass …") werden NICHT automatisch
 * umgeschrieben. Sie brauchen einen neuen Hauptsatz, und eine deterministische
 * Operation, die Sätze umbaut, richtet mehr Schaden an als der Befund wert ist.
 * Sie werden gezählt und gemeldet — die Reparatur bleibt beim Prompt.
 *
 * 🚫 Ein `[Annahme: …]`-Marker heilt eine Forschungsbehauptung NICHT: Der Nutzer
 * kann einen Forschungsstand nicht aus eigenem Wissen bestätigen. Deshalb wird
 * hier entschärft und nicht markiert — dieselbe Logik wie bei
 * Programm-Konditionen (prompts.ts).
 *
 * Alle Funktionen sind pur/deterministisch (kein LLM) und client-sicher.
 */

export type EvidenzForm = "adverb" | "aussage";

export interface EvidenzTreffer {
  form: EvidenzForm;
  /** Die konkrete Fundstelle, z. B. "nachweislich". */
  fund: string;
  /** Der Satz drumherum — für Meldung und Nachvollzug. */
  zitat: string;
}

/**
 * Adverbien, die einen Beleg behaupten, ohne einen zu liefern. Streichbar, ohne
 * den Satz zu zerlegen.
 */
const ADVERB_RE =
  /\b(nachweislich|erwiesenerma(?:ß|ss)en|nachgewiesenerma(?:ß|ss)en|bekanntlich|unbestritten)\b/gi;

/**
 * Satzformen, die eine Quelle behaupten. Nur zählen, nicht anfassen — sie
 * brauchen einen neuen Hauptsatz.
 */
const AUSSAGE_RE =
  /\b(?:Studien|Untersuchungen|Forschung(?:sergebnisse)?|die\s+Forschung)\s+(?:zeigen|belegen|weisen|belegt|zeigt)\b|\bwissenschaftlich\s+(?:erwiesen|belegt|fundiert)\b|\bempirisch\s+(?:belegt|erwiesen)\b|\bes\s+ist\s+(?:wissenschaftlich\s+)?belegt\b/gi;

/**
 * Zeichen dafür, dass der Satz seine Quelle NENNT. Dann ist die Behauptung
 * belegt und bleibt unangetastet — auch „nachweislich".
 */
const QUELLENANGABE_RE =
  /\b(laut|gem(?:ä|ae)(?:ß|ss)|zufolge|nach\s+Angaben|nach\s+der\s+Studie|Quelle\s*:|vgl\.|siehe)\b|\(\s*(?:[A-ZÄÖÜ][a-zäöüß]+\s+)?(?:19|20)\d{2}\s*\)|https?:\/\//i;

/** Der Satz um eine Fundstelle herum (für das Zitat in der Meldung). */
function satzUm(text: string, index: number): string {
  const vorher = Math.max(
    text.lastIndexOf(". ", index),
    text.lastIndexOf("\n", index),
    text.lastIndexOf("! ", index),
    text.lastIndexOf("? ", index)
  );
  const start = vorher < 0 ? 0 : vorher + 1;
  const punkt = text.slice(index).search(/[.!?](\s|$)/);
  const ende = punkt < 0 ? Math.min(text.length, index + 220) : index + punkt + 1;
  return text.slice(start, ende).trim();
}

/** Alle Evidenz-Behauptungen ohne Quellenangabe im Satz. */
export function findeEvidenzBehauptungen(text: string): EvidenzTreffer[] {
  const out: EvidenzTreffer[] = [];
  if (!text?.trim()) return out;

  for (const [form, re] of [
    ["adverb", ADVERB_RE],
    ["aussage", AUSSAGE_RE],
  ] as Array<[EvidenzForm, RegExp]>) {
    const frisch = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = frisch.exec(text)) !== null) {
      const zitat = satzUm(text, m.index);
      if (QUELLENANGABE_RE.test(zitat)) continue; // belegt — bleibt stehen
      out.push({ form, fund: m[0], zitat });
    }
  }
  return out;
}

export interface EvidenzBereinigung {
  text: string;
  /** Gestrichene Adverbien. */
  entfernt: EvidenzTreffer[];
  /** Erkannte Satzformen, die absichtlich stehen bleiben. */
  verbleibend: EvidenzTreffer[];
}

/**
 * Streicht die belegbehauptenden ADVERBIEN aus dem Text. Sonst wird nichts
 * angefasst: keine Umstellung, keine Ersetzung, keine neue Formulierung.
 *
 * Das Adverb wird samt EINEM angrenzenden Leerzeichen entfernt, damit keine
 * doppelten Leerzeichen entstehen. Sätze mit Quellenangabe bleiben unberührt.
 */
export function entferneEvidenzAdverbien(text: string): EvidenzBereinigung {
  const entfernt: EvidenzTreffer[] = [];
  const verbleibend = findeEvidenzBehauptungen(text).filter((t) => t.form === "aussage");
  if (!text?.trim()) return { text: text ?? "", entfernt, verbleibend };

  const frisch = new RegExp(ADVERB_RE.source, ADVERB_RE.flags);
  let out = "";
  let gelesen = 0;
  let m: RegExpExecArray | null;
  while ((m = frisch.exec(text)) !== null) {
    const zitat = satzUm(text, m.index);
    if (QUELLENANGABE_RE.test(zitat)) continue; // belegt — stehen lassen
    entfernt.push({ form: "adverb", fund: m[0], zitat });

    // Das Wort samt GENAU EINEM angrenzenden Leerzeichen herausnehmen, bevorzugt
    // dem davor. Sonst bleibt eine doppelte Luecke oder ein Leerzeichen vor dem
    // Satzzeichen stehen.
    let von = m.index;
    let bis = m.index + m[0].length;
    if (text[von - 1] === " ") von -= 1;
    else if (text[bis] === " ") bis += 1;

    out += text.slice(gelesen, von);
    gelesen = bis;
  }
  out += text.slice(gelesen);

  return { text: out, entfernt, verbleibend };
}

/** Hinweis für die Satzformen, die stehen bleiben — sichtbar, aber nicht repariert. */
export function baueEvidenzHinweis(verbleibend: EvidenzTreffer[]): string | null {
  if (verbleibend.length === 0) return null;
  return (
    `${verbleibend.length} Stelle${verbleibend.length === 1 ? "" : "n"} im Text beruft sich auf ` +
    `Studien oder Forschung, ohne eine Quelle zu nennen (z. B. „${verbleibend[0].fund}"). ` +
    `Fördergeber lesen so etwas als Behauptung — bitte eine Quelle ergänzen oder die Aussage ` +
    `als Annahme des Vorhabens formulieren.`
  );
}
