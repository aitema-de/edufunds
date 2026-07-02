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

/**
 * P4-B M-Erweiterung: kostenrelative Beantragungshöhe-Empfehlung im Antrags-Ergebnis.
 *
 * Anders als {@link buildFoerderhoeheHinweis} (Programm-seitige Orientierung an der
 * Match-Liste) bezieht diese Variante das tatsächliche Projektvolumen (Finanzplan-
 * Gesamtsumme) ein: die beantragbare Obergrenze ist der NIEDRIGERE aus
 *   - absolutem Förderdeckel (foerderhoehe.maxEur bzw. Katalog-foerdersummeMax) und
 *   - Quoten-Deckel (foerderhoehe.maxProzentGesamtkosten × Projektvolumen).
 *
 * Weiterhin rein arithmetisch — nichts wird erfunden. Ohne Projektvolumen fällt die
 * Aussage auf die reine Programm-Obergrenze zurück; ohne belastbare Zahl bleibt sie
 * qualitativ und verweist auf den (oft konditionalen) Freitext.
 */
export interface Foerderhoehe {
  minEur?: number | null;
  maxEur?: number | null;
  maxProzentGesamtkosten?: number | null;
  bemerkung?: string | null;
}

export interface BeantragungsEmpfehlungInput {
  /** Strukturierte Förderhöhe aus dem Richtlinien-Dossier (falls vorhanden). */
  foerderhoehe?: Foerderhoehe | null;
  /** Fallback aus dem Programmkatalog, wenn kein Dossier vorliegt. */
  katalog?: FoerdersummeInput | null;
  /** Finanzplan-Gesamtvolumen in EUR (nicht Cent). Undefined, wenn unbeziffert. */
  gesamtkostenEur?: number | null;
}

export interface BeantragungsEmpfehlung {
  /** Hauptsatz mit der Orientierungszahl — oder qualitativ, wenn keine Zahl vorliegt. */
  headline: string;
  /** Optionale Begründung, wie die Obergrenze zustande kommt (Deckel/Quote). */
  basis?: string;
  /** Maßgebliches Detail/Warnhinweis (Dossier-bemerkung oder Katalog-Freitext). */
  detail?: string;
  /** true, wenn eine belastbare Empfehlung mit Zahl abgeleitet werden konnte. */
  hatEmpfehlung: boolean;
}

export function buildBeantragungsEmpfehlung(
  input: BeantragungsEmpfehlungInput
): BeantragungsEmpfehlung {
  const fh = input.foerderhoehe ?? undefined;
  const maxEur = zahl(fh?.maxEur) ?? zahl(input.katalog?.foerdersummeMax);
  const quote =
    typeof fh?.maxProzentGesamtkosten === "number" &&
    fh.maxProzentGesamtkosten > 0 &&
    fh.maxProzentGesamtkosten <= 100
      ? fh.maxProzentGesamtkosten
      : undefined;
  const gesamt = zahl(input.gesamtkostenEur);
  const detail = fh?.bemerkung?.trim() || input.katalog?.foerdersummeText?.trim() || undefined;

  // Deckel-Kandidaten sammeln; der Quoten-Deckel greift nur mit bekanntem Volumen.
  const caps: Array<{ wert: number; grund: string }> = [];
  if (maxEur) caps.push({ wert: maxEur, grund: `Förderdeckel ${eur(maxEur)}` });
  if (quote && gesamt) {
    caps.push({
      wert: Math.round((gesamt * quote) / 100),
      grund: `${quote}% von ${eur(gesamt)} Projektkosten`,
    });
  }

  if (caps.length === 0) {
    return {
      headline:
        "Wie viel Sie beantragen sollten, richtet sich nach den Programmbedingungen und Ihren Projektkosten.",
      detail,
      hatEmpfehlung: false,
    };
  }

  const limit = caps.reduce((a, b) => (b.wert < a.wert ? b : a));
  const headline = gesamt
    ? `Für Ihr Projektvolumen von ${eur(gesamt)} können Sie bei diesem Programm bis zu ${eur(limit.wert)} beantragen.`
    : `Dieses Programm fördert bis zu ${eur(limit.wert)}.`;
  const basis =
    caps.length > 1
      ? `Maßgeblich ist der niedrigere Wert (${limit.grund}); begrenzend wirken ${caps
          .map((c) => c.grund)
          .join(" und ")}.`
      : `Grundlage: ${limit.grund}.`;

  return { headline, basis, detail, hatEmpfehlung: true };
}
