/**
 * Dossier-Qualitäts-Audit (P3-D, Pilot-Feedback 24.06.).
 *
 * Ergänzt den Schema-Validator (`scripts/validate-richtlinien.ts` prüft nur
 * strukturelle Gültigkeit) um eine QUALITÄTS-/VOLLSTÄNDIGKEITS-Dimension: Wie
 * reich ist ein Dossier an den Feldern, aus denen die Generierung ihre
 * programmspezifische Kriterien-Ausrichtung zieht?
 *
 * Hintergrund: Die Prompts speisen Leitfragen, Best Practices, Reject-Gründe und
 * Vorbild-Formulierungen bereits aktiv in Outline/Section-Generierung ein. Die
 * Ausrichtung an den Förderkriterien ist damit nur so scharf wie das Dossier
 * reich ist — Datenqualität ist der eigentliche Hebel. Dieses Audit macht sie
 * messbar. Rein deterministisch, kein LLM.
 */

export interface DossierAuditInput {
  version?: string;
  veraltet?: boolean;
  antragsstruktur?: { abschnitte?: Array<{ id?: string; leitfragen?: string[] }> };
  kostenpositionen?: Array<{ bedingungen?: string[]; beispielePasst?: string[]; beispielePasstNicht?: string[] }>;
  foerderhoehe?: { minEur?: number | null; maxEur?: number | null; maxProzentGesamtkosten?: number | null; bemerkung?: string | null };
  bestPractices?: unknown[];
  rejectGruende?: unknown[];
  vorbildFormulierungen?: unknown[];
}

export interface DossierAuditSignals {
  abschnitte: number;
  mitLeitfragen: number;
  bestPractices: number;
  rejectGruende: number;
  vorbildFormulierungen: number;
  foerderhoeheStrukturiert: boolean;
  kostenMitDetails: number;
  stub: boolean;
  veraltet: boolean;
}

export interface DossierAudit {
  /** 0..8 — Summe der erfüllten Qualitätsdimensionen. */
  score: number;
  maxScore: number;
  /**
   * true, wenn das Dossier auf die generische Struktur zurückfällt bzw. keine
   * Kriterien zum Ausrichten liefert (0 Abschnitte oder 0 Leitfragen). Das
   * untergräbt P3-D direkt und hat Vorrang vor dem reinen Score.
   */
  critical: boolean;
  criticalReasons: string[];
  /** Nicht-kritische Qualitätslücken (fehlende Anreicherungs-Felder). */
  missing: string[];
  signals: DossierAuditSignals;
}

export const MAX_SCORE = 8;

export function auditDossier(d: DossierAuditInput): DossierAudit {
  const abschnitteArr = d.antragsstruktur?.abschnitte ?? [];
  const abschnitte = abschnitteArr.length;
  const mitLeitfragen = abschnitteArr.filter((a) => (a.leitfragen?.length ?? 0) > 0).length;
  const kp = d.kostenpositionen ?? [];
  const kostenMitDetails = kp.filter(
    (k) => (k.bedingungen?.length ?? 0) > 0 || (k.beispielePasst?.length ?? 0) > 0 || (k.beispielePasstNicht?.length ?? 0) > 0
  ).length;
  const fh = d.foerderhoehe ?? {};
  // Strukturiert = bezifferte Grenzen ODER eine substanzielle Regel-Bemerkung.
  // Viele Programme haben nachweislich keine publizierten Betraege (Pauschalen-
  // Modelle, Einzelfallentscheid) — dort ist die ausformulierte Regel der
  // vollstaendige Erfassungsstand, kein Datenloch.
  const foerderhoeheStrukturiert =
    typeof fh.minEur === "number" ||
    typeof fh.maxEur === "number" ||
    typeof fh.maxProzentGesamtkosten === "number" ||
    (fh.bemerkung ?? "").trim().length >= 80;
  const bestPractices = d.bestPractices?.length ?? 0;
  const rejectGruende = d.rejectGruende?.length ?? 0;
  const vorbildFormulierungen = d.vorbildFormulierungen?.length ?? 0;
  const stub = /stub/i.test(d.version ?? "");
  const veraltet = !!d.veraltet;

  const signals: DossierAuditSignals = {
    abschnitte,
    mitLeitfragen,
    bestPractices,
    rejectGruende,
    vorbildFormulierungen,
    foerderhoeheStrukturiert,
    kostenMitDetails,
    stub,
    veraltet,
  };

  // Kritische Lücken: Wizard fällt auf generische Struktur zurück / keine
  // Kriterien zum Ausrichten.
  const criticalReasons: string[] = [];
  if (abschnitte === 0) criticalReasons.push("keine Antragsabschnitte (generische Struktur)");
  else if (mitLeitfragen === 0) criticalReasons.push("keine Leitfragen (keine Kriterien-Ausrichtung)");

  // Score-Dimensionen (je 1 Punkt).
  const dims: Array<[boolean, string]> = [
    [abschnitte > 0, "Antragsabschnitte"],
    [abschnitte > 0 && mitLeitfragen === abschnitte, "Leitfragen für alle Abschnitte"],
    [bestPractices > 0, "Best Practices"],
    [rejectGruende > 0, "Reject-Gründe"],
    [vorbildFormulierungen > 0, "Vorbild-Formulierungen"],
    [foerderhoeheStrukturiert, "strukturierte Förderhöhe"],
    [kostenMitDetails > 0, "Kostenpositionen mit Bedingungen/Beispielen"],
    [!stub && !veraltet, "aktuell (kein Stub/veraltet)"],
  ];

  let score = 0;
  const missing: string[] = [];
  for (const [ok, label] of dims) {
    if (ok) score++;
    else missing.push(label);
  }

  return {
    score,
    maxScore: MAX_SCORE,
    critical: criticalReasons.length > 0,
    criticalReasons,
    missing,
    signals,
  };
}
