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
 * NACHTRAG 21.08.2026 — die Satzformen, zweiter Anlauf
 * ----------------------------------------------------
 * Die erste Fassung liess ALLE Satzformen („Studien zeigen, dass …") stehen, mit
 * der Begruendung, sie brauchten einen neuen Hauptsatz. Das stimmt nur fuer die
 * Haelfte. Am Lauf `2026-08-21T07-00-07` nachgezaehlt (15 Fundstellen):
 *
 *   - 8 stehen als EINLEITUNG eines Nebensatzes: „weil Studien zeigen, dass X".
 *     Die sind streichbar, ohne etwas umzubauen — `weil`-Satz und `dass`-Satz
 *     haben beide Verbletztstellung, der Inhalt rueckt unveraendert nach vorn.
 *     → `entferneEvidenzFloskeln` erledigt sie deterministisch.
 *   - 3 sind echte Hauptsatz-Formen. Die gehen an den LLM-Repair der
 *     Fakt-Verifikation (`findeEvidenzSatzformen` → fact-verification.ts).
 *   - 3 sind gar keine Belegbehauptungen, sondern Aussagen ueber das eigene
 *     Vorhaben („sodass die Ergebnisse wissenschaftlich fundiert sind"). Die
 *     bleiben unangetastet — deshalb greift der Repair nur bei `, dass`-Formen.
 *
 * ⚠️ Die Kennzahl schwankt stark: 14 → 5 → 15 ueber drei Laeufe bei unveraendertem
 * Verhalten. Wer hier einen Prompt-Effekt messen will, misst Rauschen.
 *
 * 🚫 Ein `[Annahme: …]`-Marker heilt eine Forschungsbehauptung NICHT: Der Nutzer
 * kann einen Forschungsstand nicht aus eigenem Wissen bestätigen. Deshalb wird
 * hier entschärft und nicht markiert — dieselbe Logik wie bei
 * Programm-Konditionen (prompts.ts).
 *
 * 🔴 Diese Regel stand hier ab dem 21.08.2026 — und wurde verletzt, weil sie
 * niemand nachprüfte. `pipeline.ts` wickelte `factVerification.remaining` per
 * `wrapAnnahmen` ein und baute die Bestätigungsliste aus ALLEN Markern im Text.
 * Am Lauf `2026-08-21T07-00-07` landeten so 5 Forschungsbehauptungen in der
 * Liste, die der Nutzer mit „Übernehmen / Anpassen / Streichen" bearbeitet —
 * darunter „weil Studien zeigen, dass Jugendliche besonders anfällig für
 * Desinformation sind". Genau das, was der Absatz oben ausschliesst.
 * → `istEvidenzBehauptung` ist die Nachprüfung dazu.
 *
 * Alle Funktionen sind pur/deterministisch (kein LLM) und client-sicher.
 */

export type EvidenzForm = "adverb" | "einleitung" | "aussage";

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
 * Belegbehauptung als EINLEITUNG eines Nebensatzes: „weil Studien zeigen, dass X".
 *
 * 🔑 Diese Form IST deterministisch streichbar — anders als die Hauptsatzform.
 * Der Grund ist die deutsche Verbstellung: Sowohl der `weil`-Satz als auch der
 * `dass`-Satz haben das Verb am Ende. Wird die Einleitung samt „, dass" entfernt,
 * rückt der Inhalt des dass-Satzes unverändert an die Stelle des weil-Satzes und
 * bleibt grammatisch korrekt:
 *
 *   „weil Studien zeigen, dass Jugendliche anfällig für Desinformation sind"
 *   → „weil Jugendliche anfällig für Desinformation sind"
 *
 * Das ist dieselbe Operation wie beim Adverb — kein Satzumbau, eine Streichung.
 * Gemessen am Lauf `2026-08-21T07-00-07`: 8 der 11 echten Fundstellen sind so
 * gebaut, überwiegend mit „weil".
 *
 * Die Konjunktion wird in Gruppe 1 festgehalten und bleibt stehen.
 */
const EINLEITUNG_RE =
  /\b(weil|da|zumal|denn|obwohl)\s+(?:(?:aktuelle|neuere|empirische|zahlreiche|verschiedene|internationale|p(?:ä|ae)dagogische|wissenschaftliche|viele|mehrere)\s+)?(?:Studien|Untersuchungen|Forschungsergebnisse|Forschung|Metaanalysen|Evaluationen)\s+(?:zeigen|zeigt|belegen|belegt|weisen\s+darauf\s+hin|legen\s+nahe|nahelegen)\s*,\s*dass\s+/gi;

/**
 * Satzformen, die eine Quelle behaupten. Zum ZÄHLEN — bewusst weit gefasst, damit
 * die Kennzahl mit den Läufen vor dem 21.08.2026 vergleichbar bleibt.
 */
const AUSSAGE_RE =
  /\b(?:Studien|Untersuchungen|Forschung(?:sergebnisse)?|die\s+Forschung)\s+(?:zeigen|belegen|weisen|belegt|zeigt)\b|\bwissenschaftlich\s+(?:erwiesen|belegt|fundiert)\b|\bempirisch\s+(?:belegt|erwiesen)\b|\bes\s+ist\s+(?:wissenschaftlich\s+)?belegt\b/gi;

/**
 * Dieselben Satzformen, aber nur mit folgendem „, dass"-Satz — die Teilmenge, bei
 * der ein EINGRIFF vertretbar ist.
 *
 * 🔑 Warum enger als AUSSAGE_RE: Über den Lauf `2026-08-21T07-00-07` sind 3 der
 * 15 Treffer von AUSSAGE_RE gar keine Fremdbeleg-Behauptungen, sondern Aussagen
 * über das eigene Vorhaben — „sodass die Ergebnisse sowohl wissenschaftlich
 * fundiert als auch praxisnah sind", „sodass die Wirksamkeit des Projekts
 * empirisch belegt werden kann". Die sind legitim; ein Repair würde sie
 * verschlechtern. Zum Zählen ist die Unschärfe egal, zum Anfassen nicht.
 */
const AUSSAGE_DASS_RE =
  /\b(?:(?:aktuelle|neuere|empirische|zahlreiche|verschiedene|internationale|p(?:ä|ae)dagogische|wissenschaftliche|viele|mehrere)\s+)?(?:Studien|Untersuchungen|Forschungsergebnisse|Forschung|Metaanalysen)\s+(?:zeigen|zeigt|belegen|belegt|weisen\s+darauf\s+hin)\s*,\s*dass\b|\b(?:wissenschaftlich|empirisch)\s+(?:erwiesen|belegt)\s+\w*\s*,?\s*dass\b|\bes\s+ist\s+(?:wissenschaftlich\s+)?belegt\s*,\s*dass\b/gi;

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

/** Spannen aller Einleitungs-Treffer — um Doppelzählung mit AUSSAGE_RE zu vermeiden. */
function einleitungsSpannen(text: string): Array<[number, number]> {
  const frisch = new RegExp(EINLEITUNG_RE.source, EINLEITUNG_RE.flags);
  const out: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = frisch.exec(text)) !== null) out.push([m.index, m.index + m[0].length]);
  return out;
}

/** Alle Evidenz-Behauptungen ohne Quellenangabe im Text. */
export function findeEvidenzBehauptungen(text: string): EvidenzTreffer[] {
  const out: EvidenzTreffer[] = [];
  if (!text?.trim()) return out;
  const spannen = einleitungsSpannen(text);

  for (const [form, re] of [
    ["adverb", ADVERB_RE],
    ["einleitung", EINLEITUNG_RE],
    ["aussage", AUSSAGE_RE],
  ] as Array<[EvidenzForm, RegExp]>) {
    const frisch = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = frisch.exec(text)) !== null) {
      const zitat = satzUm(text, m.index);
      if (QUELLENANGABE_RE.test(zitat)) continue; // belegt — bleibt stehen
      // Eine Einleitung matcht auch AUSSAGE_RE. Nur einmal zählen, als "einleitung".
      if (form === "aussage" && spannen.some(([s, e]) => m!.index >= s && m!.index < e)) continue;
      out.push({ form, fund: m[0].trim(), zitat });
    }
  }
  return out;
}

/**
 * Belegbehauptungen, die deterministisch NICHT streichbar sind und deshalb an den
 * LLM-Repair der Fakt-Verifikation gehen (fact-verification.ts). Nur die
 * „, dass"-Formen — siehe AUSSAGE_DASS_RE für den Grund.
 */
export function findeEvidenzSatzformen(text: string): EvidenzTreffer[] {
  const out: EvidenzTreffer[] = [];
  if (!text?.trim()) return out;
  const spannen = einleitungsSpannen(text);
  const frisch = new RegExp(AUSSAGE_DASS_RE.source, AUSSAGE_DASS_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = frisch.exec(text)) !== null) {
    const zitat = satzUm(text, m.index);
    if (QUELLENANGABE_RE.test(zitat)) continue;
    // Streichbare Einleitungen erledigt entferneEvidenzFloskeln selbst.
    if (spannen.some(([s, e]) => m!.index >= s && m!.index < e)) continue;
    out.push({ form: "aussage", fund: m[0].trim(), zitat });
  }
  return out;
}

/**
 * Trägt ein Textstück (z. B. ein `[Annahme: …]`-Inhalt) eine Belegbehauptung
 * ohne Quelle?
 *
 * 🚫 Gebraucht für die Bestätigungsliste: Eine Forschungsbehauptung darf dem
 * Nutzer NICHT zum Bestätigen vorgelegt werden — er kann einen Forschungsstand
 * nicht aus eigenem Wissen bestätigen. Siehe den Kopf dieser Datei.
 */
export function istEvidenzBehauptung(zitat: string): boolean {
  if (!zitat?.trim()) return false;
  if (QUELLENANGABE_RE.test(zitat)) return false;
  for (const re of [EINLEITUNG_RE, AUSSAGE_DASS_RE, AUSSAGE_RE]) {
    if (new RegExp(re.source, re.flags).test(zitat)) return true;
  }
  return false;
}

export interface EvidenzBereinigung {
  text: string;
  /** Gestrichene Adverbien und Nebensatz-Einleitungen. */
  entfernt: EvidenzTreffer[];
  /** Erkannte Hauptsatz-Formen, die absichtlich stehen bleiben. */
  verbleibend: EvidenzTreffer[];
}

/**
 * Streicht die belegbehauptenden ADVERBIEN und die streichbaren NEBENSATZ-
 * EINLEITUNGEN aus dem Text. Sonst wird nichts angefasst: keine Umstellung,
 * keine Ersetzung, keine neue Formulierung.
 *
 * Das Adverb wird samt EINEM angrenzenden Leerzeichen entfernt, damit keine
 * doppelten Leerzeichen entstehen. Bei der Einleitung bleibt die Konjunktion
 * („weil", „da", …) stehen. Sätze mit Quellenangabe bleiben unberührt.
 */
export function entferneEvidenzFloskeln(text: string): EvidenzBereinigung {
  const entfernt: EvidenzTreffer[] = [];
  if (!text?.trim()) {
    return { text: text ?? "", entfernt, verbleibend: [] };
  }

  // 1. Nebensatz-Einleitungen: „weil Studien zeigen, dass X" → „weil X".
  let zwischen = "";
  {
    const frisch = new RegExp(EINLEITUNG_RE.source, EINLEITUNG_RE.flags);
    let gelesen = 0;
    let m: RegExpExecArray | null;
    while ((m = frisch.exec(text)) !== null) {
      const zitat = satzUm(text, m.index);
      if (QUELLENANGABE_RE.test(zitat)) continue; // belegt — stehen lassen
      entfernt.push({ form: "einleitung", fund: m[0].trim(), zitat });
      zwischen += text.slice(gelesen, m.index) + `${m[1]} `;
      gelesen = m.index + m[0].length;
    }
    zwischen += text.slice(gelesen);
  }

  // 2. Adverbien — unverändert gegenüber der Fassung vom 21.08.2026.
  let out = "";
  {
    const frisch = new RegExp(ADVERB_RE.source, ADVERB_RE.flags);
    let gelesen = 0;
    let m: RegExpExecArray | null;
    while ((m = frisch.exec(zwischen)) !== null) {
      const zitat = satzUm(zwischen, m.index);
      if (QUELLENANGABE_RE.test(zitat)) continue; // belegt — stehen lassen
      entfernt.push({ form: "adverb", fund: m[0].trim(), zitat });

      // Das Wort samt GENAU EINEM angrenzenden Leerzeichen herausnehmen, bevorzugt
      // dem davor. Sonst bleibt eine doppelte Luecke oder ein Leerzeichen vor dem
      // Satzzeichen stehen.
      let von = m.index;
      let bis = m.index + m[0].length;
      if (zwischen[von - 1] === " ") von -= 1;
      else if (zwischen[bis] === " ") bis += 1;

      out += zwischen.slice(gelesen, von);
      gelesen = bis;
    }
    out += zwischen.slice(gelesen);
  }

  // Was JETZT noch dasteht, ist die nicht-streichbare Hauptsatzform.
  const verbleibend = findeEvidenzBehauptungen(out).filter((t) => t.form === "aussage");
  return { text: out, entfernt, verbleibend };
}
