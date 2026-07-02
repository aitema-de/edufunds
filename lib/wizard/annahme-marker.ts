/**
 * KI-Annahmen-Marker `[Annahme: …]` (Produktentscheidung 02.07.2026, ClickUp 86caht7eq)
 * -------------------------------------------------------------------------------------
 * Balance "Kennzeichnen statt verbieten": Der Assistent DARF plausible Ist-Zustaende,
 * Rahmenbedingungen und Ausgestaltungen vorschlagen — aber alles ohne Nutzerbeleg muss
 * im Text selbst eindeutig gekennzeichnet sein, damit der Nutzer die Wahl hat
 * (uebernehmen / anpassen / streichen) und unbestaetigte Annahmen NIE unmarkiert in
 * den Export gelangen.
 *
 * Zwei Quellen von Markern:
 *   1. Generierungszeit: Section-/Revision-Prompts setzen `[Annahme: …]` selbst.
 *   2. Sicherheitsnetz: die Fakt-Verifikation (fact-verification.ts) liefert
 *      "vorschlag"-Zitate, die hier DETERMINISTISCH nachtraeglich umhuellt werden.
 *
 * Abgrenzung zu `[TODO: …]`: TODO = fehlende Angabe, die der Nutzer beschaffen muss
 * (Luecke). Annahme = vom Assistenten unterstellter, plausibler Inhalt, den der
 * Nutzer nur bestaetigen oder verwerfen muss.
 *
 * Alle Funktionen sind pure/deterministisch (kein LLM) und client-sicher.
 */

/** Ein Marker: `[Annahme: <inhalt>]` — Inhalt ohne eckige Klammern, einzeilig bevorzugt. */
const ANNAHME_RE = /\[Annahme:\s*([^\]]*?)\s*\]/g;

/** Kombinierte Marker-Erkennung fuer UI-Highlighting (Annahme + TODO). */
export const MARKER_SPLIT_RE = /(\[(?:Annahme|TODO):[^\]]*\])/g;

export interface WrapResult {
  text: string;
  /** Zitate, die neu umhuellt wurden (nicht schon markiert / nicht auffindbar → fehlen hier). */
  marked: string[];
}

/** Alle Annahme-Inhalte (getrimmt, dedupliziert, in Textreihenfolge). */
export function extractAnnahmen(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  ANNAHME_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ANNAHME_RE.exec(text)) !== null) {
    const inhalt = m[1].trim();
    if (!inhalt || seen.has(inhalt)) continue;
    seen.add(inhalt);
    out.push(inhalt);
  }
  return out;
}

/**
 * Findet den vollstaendigen Marker-String zu einem Annahme-Inhalt (whitespace-tolerant).
 * null, wenn kein Marker mit exakt diesem (getrimmten) Inhalt existiert.
 */
export function findMarker(text: string, inhalt: string): string | null {
  const wanted = inhalt.trim();
  if (!wanted) return null;
  ANNAHME_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ANNAHME_RE.exec(text)) !== null) {
    if (m[1].trim() === wanted) return m[0];
  }
  return null;
}

/** Liegt Index `idx` innerhalb eines `[Annahme: …]`- oder `[TODO: …]`-Markers? */
function insideMarker(text: string, idx: number): boolean {
  const open = Math.max(text.lastIndexOf("[Annahme:", idx), text.lastIndexOf("[TODO:", idx));
  if (open === -1) return false;
  const close = text.indexOf("]", open);
  return close !== -1 && idx < close;
}

/**
 * Umhuellt das ERSTE Vorkommen jedes Zitats mit `[Annahme: …]` — ausser das
 * Vorkommen liegt bereits in einem Marker oder das Zitat enthaelt selbst
 * eckige Klammern (wuerde die Syntax brechen).
 */
export function wrapAnnahmen(text: string, zitate: readonly string[]): WrapResult {
  let out = text;
  const marked: string[] = [];
  for (const raw of zitate) {
    const zitat = (raw ?? "").trim();
    if (zitat.length < 4 || zitat.includes("[") || zitat.includes("]")) continue;
    if (findMarker(out, zitat)) continue; // schon markiert
    const idx = out.indexOf(zitat);
    if (idx === -1 || insideMarker(out, idx)) continue;
    out = `${out.slice(0, idx)}[Annahme: ${zitat}]${out.slice(idx + zitat.length)}`;
    marked.push(zitat);
  }
  return { text: out, marked };
}

/**
 * Loest einen Marker auf:
 *  - "uebernehmen": Marker entfernen, Inhalt bleibt als normaler Text (bestaetigt).
 *  - "ersetzen":    Marker durch `ersatz` ersetzen (Nutzer-Formulierung).
 *  - "streichen":   Marker samt Inhalt entfernen (+ Whitespace glaetten).
 * Faellt auf das nackte Zitat zurueck, wenn kein Marker existiert (Alt-Sessions
 * vor der Marker-Einfuehrung).
 */
export function resolveAnnahme(
  text: string,
  inhalt: string,
  aktion: "uebernehmen" | "ersetzen" | "streichen",
  ersatz?: string
): string {
  const marker = findMarker(text, inhalt);
  const target = marker ?? inhalt;
  if (!text.includes(target)) return text;
  const replacement =
    aktion === "uebernehmen" ? inhalt.trim() : aktion === "ersetzen" ? (ersatz ?? "").trim() : "";
  const next = text.replace(target, replacement);
  return aktion === "streichen" ? glaetten(next) : next;
}

/** Whitespace-Glaettung nach dem Streichen (wie TextVorschlaegeEditor.stripWhitespace). */
function glaetten(s: string): string {
  return s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
