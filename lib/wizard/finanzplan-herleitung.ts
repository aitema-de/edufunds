/**
 * Herleitungs-Pflicht für große Posten — Paket 4 aus Tester-Feedback #008.
 *
 * WARUM ES DIESE DATEI GIBT
 * -------------------------
 * Der Tester vom 19.08.2026 wollte keine besseren Texte, sondern eine
 * Endkontrolle: „Zahlen nicht nur generieren, sondern am Ende konsequent
 * gegeneinander prüfen." Die Pakete 1–3 haben das für Summen, Prozentsätze und
 * Dubletten erledigt. Offen blieb der Fall, den ein Gutachter zuerst anfasst:
 * ein großer Posten, der als nackte Zahl dasteht („Kulturpädagogische
 * Fachkräfte — 18.000 EUR"), ohne dass irgendwo steht, wie er zustande kommt.
 *
 * Von Kolja am 20.08.2026 präzisiert:
 *   - Schwelle 2.000 EUR (nicht 5.000).
 *   - Honorare IMMER über Stundenzahl × Stundensatz, unabhängig vom Betrag —
 *     das ist ein Grundsatz, keine Betragsfrage. Genau danach fragt der Geber.
 *   - Es gibt GENAU ZWEI zulässige Formen:
 *       1. eine echte Rechnung aus Nutzerangaben ("2 Fachkräfte × 60 Std. × 150 EUR"),
 *       2. ein sichtbarer `[TODO: …]`-Marker, der die fehlende Größe benennt.
 *   - NIEMALS erfundene Faktoren. Das ist die Grenze der
 *     Anti-Halluzinations-Architektur.
 *
 * WARUM DER MARKER UND NICHT NUR EINE WARNUNG
 * -------------------------------------------
 * Form 2 ist bereits gebaut: `[TODO: …]`-Marker werden on-screen hervorgehoben
 * (components/Wizard/MarkerHighlight.tsx), landen im Export geschlossen in der
 * Arbeitsliste „Offene Punkte" und werden aus dem Antragskörper entfernt
 * (lib/wizard/offene-punkte.ts). Der Finanzplan-Markdown ist Teil dieses
 * Exports — ein Marker in einer `begründung` läuft also ohne weiteres Zutun in
 * dieselbe Arbeitsliste. Ein bloßer Hinweis täte das nicht.
 *
 * Das Ergänzen eines Markers erfindet NICHTS: Es benennt die Lücke, die schon
 * da ist. Genau deshalb darf dieser Schritt deterministisch und ohne Rückfrage
 * laufen, während das Ergänzen einer Rechnung (Form 1) verboten bleibt — dafür
 * bräuchte es Faktoren, die niemand genannt hat.
 *
 * Alle Funktionen sind pur/deterministisch (kein LLM) und client-sicher.
 */
import type { Finanzposten } from "./types";
import { lesProzentBezug } from "./finanzplan-arithmetik";

/** Ab dieser Höhe muss ein Posten sichtbar hergeleitet sein (Kolja, 20.08.2026). */
export const HERLEITUNGS_SCHWELLE_EUR = 2000;

export type HerleitungsGrund = "honorar-ohne-zeitgeruest" | "grosser-posten-ohne-herleitung";

export interface HerleitungsBefund {
  postenId: string;
  bezeichnung: string;
  betragEur: number;
  grund: HerleitungsGrund;
  /** Der Marker, der die Lücke ehrlich benennt (Form 2). */
  marker: string;
}

// ---------------------------------------------------------------------------
// Erkennung: Steht in der Begründung ein nachvollziehbarer Rechenweg?
//
// Bewusst großzügig: Ein falsch-positiver Marker hängt sich an einen Posten,
// der längst hergeleitet ist, und schickt den Nutzer einer Lücke hinterher,
// die es nicht gibt. Die Rechnung selbst prüft eine andere Stelle
// (checkRechnungGehtAuf in finanzplan-generator.ts) — hier geht es nur um die
// Frage, OB eine da ist.
// ---------------------------------------------------------------------------

/**
 * "30 × 400", "2 Fachkräfte × 60 Std. × 150 EUR", "12 * 250" — ein
 * Multiplikationszeichen mit einer Zahl dahinter. Links davon darf ein Wort
 * stehen ("2 Fachkräfte × 60 Std."), deshalb wird die zweite Zahl über
 * `zaehleZahlen` verlangt statt über direkte Nachbarschaft.
 */
const MULTIPLIKATION_RE = /(?:[×✕·*]|\s\bx\b)\s*(?:ca\.\s*|rund\s*|etwa\s*)?\d/i;

/**
 * "20 Tablets à 400 EUR" — die Stückpreis-Schreibweise. Ohne `\b` vor dem "à":
 * JS zählt "à" nicht als Wortzeichen, eine Wortgrenze gibt es zwischen
 * Leerzeichen und "à" also gar nicht.
 */
const A_STUECK_RE = /à\s*(?:ca\.\s*|rund\s*|etwa\s*)?\d/i;

/** "… = 12.000 EUR" — eine Rechenkette mit ausgewiesenem Ergebnis. */
const ERGEBNIS_RE = /=\s*(?:ca\.\s*|rund\s*|etwa\s*)?[\d.][\d.,\s]*(?:EUR|€)/i;

/** "150 EUR je Stunde", "400 EUR/Gerät" — Einzelpreis mit Bezugseinheit. */
const PRO_EINHEIT_RE = /[\d.,]+\s*(?:EUR|€)\s*(?:\/|\bje\b|\bpro\b|\bpr[oó]\b)/i;

/** Eine Zeit-/Mengeneinheit, an der ein Honorar hängen kann. */
const ZEIT_EINHEIT_RE =
  /\b(std\.?|stunden?|stundensatz|stundensätze|tag|tage|tagen|tagessatz|tagessätze|projekttag|projekttage|termin|termine|sitzung|sitzungen|workshop|workshops|einheit|einheiten|doppelstunde|doppelstunden|unterrichtsstunden?|schulstunden?|wochen?|monate?n?)\b/i;

/** Ein bereits gesetzter Lücken-Marker — die zweite zulässige Form. */
const TODO_MARKER_RE = /\[TODO:[^\]]*\]/i;

function zaehleZahlen(text: string): number {
  return (text.match(/\d[\d.,]*/g) ?? []).length;
}

/** true, wenn die Begründung einen sichtbaren Rechenweg enthält (Form 1). */
export function hatRechenweg(begruendung?: string | null): boolean {
  const t = begruendung ?? "";
  if (!t) return false;
  if (MULTIPLIKATION_RE.test(t) && zaehleZahlen(t) >= 2) return true;
  if (A_STUECK_RE.test(t) || ERGEBNIS_RE.test(t)) return true;
  // "400 EUR je Gerät" allein ist noch keine Herleitung — erst zusammen mit
  // einer Menge ("für 30 Geräte") wird daraus eine nachvollziehbare Rechnung.
  if (PRO_EINHEIT_RE.test(t) && zaehleZahlen(t) >= 2) return true;
  return false;
}

/** true, wenn die Begründung die Lücke bereits ehrlich markiert (Form 2). */
export function hatTodoMarker(begruendung?: string | null): boolean {
  return TODO_MARKER_RE.test(begruendung ?? "");
}

/**
 * Ein Honorar ist hergeleitet, wenn der Rechenweg an einer Zeit-/Termineinheit
 * hängt — "3 Workshops à 500 EUR" genügt, "Honorar laut Angebot: 3.000 EUR"
 * nicht. Grund: Der Geber prüft Honorare über Umfang × Satz; eine Pauschale
 * ohne Zeitgerüst ist die Stelle, an der zuerst nachgefragt wird.
 */
function honorarHergeleitet(begruendung?: string | null): boolean {
  const t = begruendung ?? "";
  return hatRechenweg(t) && ZEIT_EINHEIT_RE.test(t);
}

/** Kürzt die Bezeichnung für den Marker-Text (er steht später ohne Posten-Kontext in der Arbeitsliste). */
function kurzeBezeichnung(bezeichnung: string): string {
  const sauber = (bezeichnung ?? "").replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
  return sauber.length > 60 ? `${sauber.slice(0, 57)}…` : sauber;
}

/**
 * Der Befund zu einem einzelnen Posten — oder null, wenn er in Ordnung ist.
 *
 * Eigenanteil-Posten bleiben außen vor: Sie stammen entweder direkt aus der
 * Nutzerangabe (`applyStatedEigenanteil`) oder aus einer Richtlinien-Quote,
 * beides deterministisch gerechnet. Ein Herleitungs-Marker wäre dort ein
 * Hinweis auf eine Lücke, die es nicht gibt.
 */
export function befundFuerPosten(p: Finanzposten): HerleitungsBefund | null {
  if (p.eigenanteil) return null;
  if (!Number.isFinite(p.betragEur) || p.betragEur <= 0) return null;
  if (hatTodoMarker(p.begruendung)) return null;
  // Ein Prozent-Posten trägt seine Herleitung im Namen ("Verwaltungspauschale
  // (7 % der anerkannten Ausgaben)") — und die Pipeline rechnet ihn nach
  // (korrigiereProzentPosten). Ein Marker wäre hier eine Lücke, die es nicht gibt.
  if (lesProzentBezug(p.bezeichnung ?? "", p.kategorie)) return null;

  const name = kurzeBezeichnung(p.bezeichnung);

  // 1. Honorare — Grundsatz, unabhängig vom Betrag.
  if (p.kategorie === "honorare") {
    if (honorarHergeleitet(p.begruendung)) return null;
    return {
      postenId: p.id,
      bezeichnung: p.bezeichnung,
      betragEur: p.betragEur,
      grund: "honorar-ohne-zeitgeruest",
      marker: `[TODO: Honorar „${name}" über Stundenzahl × Stundensatz aufschlüsseln und vor Einreichung belegen]`,
    };
  }

  // 2. Alle übrigen Posten ab der Schwelle.
  if (p.betragEur < HERLEITUNGS_SCHWELLE_EUR) return null;
  if (hatRechenweg(p.begruendung)) return null;
  return {
    postenId: p.id,
    bezeichnung: p.bezeichnung,
    betragEur: p.betragEur,
    grund: "grosser-posten-ohne-herleitung",
    marker: `[TODO: Betrag für „${name}" herleiten (Menge × Einzelpreis) und vor Einreichung belegen]`,
  };
}

/** Alle Posten ohne zulässige Herleitung. Reine Prüfung, ändert nichts. */
export function pruefeHerleitung(posten: Finanzposten[]): HerleitungsBefund[] {
  const out: HerleitungsBefund[] = [];
  for (const p of posten ?? []) {
    const b = befundFuerPosten(p);
    if (b) out.push(b);
  }
  return out;
}

/**
 * Ergänzt für jeden Befund den `[TODO: …]`-Marker in der Begründung.
 *
 * Nicht-destruktiv: Bestehender Text bleibt Wort für Wort erhalten, der Marker
 * kommt hinten dran. Es wird kein Betrag und kein Faktor angefasst — die
 * Software weiß nicht, wie viele Stunden jemand geplant hat, und darf es auch
 * nicht raten.
 */
export function ergaenzeHerleitungsMarker(posten: Finanzposten[]): {
  posten: Finanzposten[];
  befunde: HerleitungsBefund[];
} {
  const befunde = pruefeHerleitung(posten);
  if (befunde.length === 0) return { posten, befunde };

  const nachId = new Map(befunde.map((b) => [b.postenId, b]));
  const neu = posten.map((p) => {
    const b = nachId.get(p.id);
    if (!b) return p;
    const alt = (p.begruendung ?? "").trim();
    const getrennt = alt ? `${alt.replace(/\s*$/, "")} ${b.marker}` : b.marker;
    return { ...p, begruendung: getrennt };
  });
  return { posten: neu, befunde };
}

/**
 * Ein einzelner Sammelhinweis für den Plan — nicht einer je Posten. Die
 * `hinweise` sind der knappste Platz im Finanzplan; die Details stehen
 * ohnehin als Marker am jeweiligen Posten und später in der Arbeitsliste.
 */
export function baueHerleitungsHinweis(befunde: HerleitungsBefund[]): string | null {
  if (befunde.length === 0) return null;
  const honorare = befunde.filter((b) => b.grund === "honorar-ohne-zeitgeruest").length;
  const gross = befunde.length - honorare;
  const teile: string[] = [];
  if (gross > 0) {
    teile.push(
      `${gross} Posten über ${HERLEITUNGS_SCHWELLE_EUR.toLocaleString("de-DE")} EUR ohne nachvollziehbare Rechnung`
    );
  }
  if (honorare > 0) {
    teile.push(`${honorare} Honorarposten ohne Stundenzahl × Stundensatz`);
  }
  return (
    `${teile.join(" und ")}: Die betroffenen Posten sind mit „[TODO: …]" markiert. ` +
    `Der Assistent darf die fehlenden Größen nicht erfinden — bitte vor Einreichung ergänzen. ` +
    `Gutachter prüfen genau diese Herleitung zuerst.`
  );
}
