/**
 * Beantragungshöhe-Orientierung (Pilot-Feedback 24.06., P4-B).
 *
 * Tester-Wunsch: „Gäbe es auch die Möglichkeit, einschätzen zu lassen, wie viel
 * man wohl beantragen sollte?" — beantwortet an der Match-Liste, wo der Nutzer
 * die Programme vergleicht und noch vor Antragsstart die Größenordnung braucht.
 *
 * BEWUSST rein deterministisch: die Ausgabe wird ausschließlich aus den bereits
 * kuratierten Katalog-Feldern (foerdersummeMin/Max/Text) abgeleitet — KEIN LLM,
 * keine erfundenen Zahlen, kein Eval-Risiko. Liegt außerhalb von lib/wizard/,
 * damit der Pipeline-Eval-Workflow nicht anschlägt.
 *
 * Wichtige Nuance aus den Katalogdaten: der Freitext (foerdersummeText) ist oft
 * die eigentliche, konditionale Aussage (z. B. „5€ pro Bewegungseinheit … max.
 * 1.000€", „Sachleistung, keine Geldförderung"). Eine nackte Max-Zahl allein
 * wäre irreführend. Deshalb wird der Freitext als maßgebliches Detail immer
 * mitgeführt und die Zahl ausdrücklich nur als grobe Orientierung gerahmt.
 */

export interface FoerdersummeInput {
  foerdersummeMin?: number | null;
  foerdersummeMax?: number | null;
  foerdersummeText?: string | null;
}

export interface FoerderhoeheHinweis {
  /** Bezifferte Orientierungszeile — oder qualitativ, wenn keine belastbare Zahl vorliegt. */
  headline: string;
  /** Maßgebliches Detail aus dem Katalog (häufig konditional). Nur gesetzt, wenn Freitext vorliegt. */
  detail?: string;
  /** true, wenn eine belastbare Euro-Zahl vorliegt (steuert die UI-Rahmung). */
  hatZahl: boolean;
}

function eur(n: number): string {
  return `${n.toLocaleString("de-DE")} €`;
}

/** Positive, endliche Zahl? Sonst (null/0/NaN/negativ) → undefined. */
function zahl(v: number | null | undefined): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

/**
 * Leitet aus den Katalog-Fördersummen eine Orientierungsangabe ab.
 * Rein arithmetisch/textuell — nichts wird erfunden.
 */
export function buildFoerderhoeheHinweis(input: FoerdersummeInput): FoerderhoeheHinweis {
  const min = zahl(input.foerdersummeMin);
  const max = zahl(input.foerdersummeMax);
  const detail = input.foerdersummeText?.trim() || undefined;

  let headline: string;
  let hatZahl = true;

  if (min && max && min !== max) {
    headline = `Dieses Programm fördert typischerweise ${eur(min)} bis ${eur(max)}`;
  } else if (max) {
    headline = `Dieses Programm fördert bis zu ${eur(max)}`;
  } else if (min) {
    headline = `Dieses Programm fördert ab ${eur(min)}`;
  } else {
    headline = "Die Förderhöhe richtet sich nach den Programmbedingungen";
    hatZahl = false;
  }

  return { headline, detail, hatZahl };
}
