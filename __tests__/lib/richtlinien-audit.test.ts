/**
 * Dossier-Qualitäts-Audit (P3-D). Deterministische Scoring-Logik.
 */
import { auditDossier, MAX_SCORE, type DossierAuditInput } from "@/lib/richtlinien-audit";

const voll: DossierAuditInput = {
  version: "2026-05-19",
  antragsstruktur: {
    abschnitte: [
      { id: "a", leitfragen: ["Was?"] },
      { id: "b", leitfragen: ["Wie?"] },
    ],
  },
  kostenpositionen: [{ bedingungen: ["nur Vollzeit"] }],
  foerderhoehe: { maxEur: 20000 },
  bestPractices: [{}],
  rejectGruende: [{}],
  vorbildFormulierungen: [{}],
};

describe("auditDossier", () => {
  it("vergibt vollen Score für ein vollständiges Dossier", () => {
    const a = auditDossier(voll);
    expect(a.score).toBe(MAX_SCORE);
    expect(a.critical).toBe(false);
    expect(a.missing).toEqual([]);
  });

  it("markiert 0 Abschnitte als kritisch (generische Struktur)", () => {
    const a = auditDossier({ ...voll, antragsstruktur: { abschnitte: [] } });
    expect(a.critical).toBe(true);
    expect(a.criticalReasons[0]).toMatch(/keine Antragsabschnitte/);
  });

  it("markiert fehlende Leitfragen als kritisch (keine Kriterien-Ausrichtung)", () => {
    const a = auditDossier({
      ...voll,
      antragsstruktur: { abschnitte: [{ id: "a" }, { id: "b" }] },
    });
    expect(a.critical).toBe(true);
    expect(a.criticalReasons[0]).toMatch(/keine Leitfragen/);
  });

  it("zieht nicht-kritische Lücken vom Score ab und listet sie", () => {
    const a = auditDossier({
      ...voll,
      bestPractices: [],
      rejectGruende: [],
    });
    expect(a.critical).toBe(false);
    expect(a.score).toBe(MAX_SCORE - 2);
    expect(a.missing).toEqual(expect.arrayContaining(["Best Practices", "Reject-Gründe"]));
  });

  it("erkennt Leitfragen nur, wenn ALLE Abschnitte welche haben", () => {
    const a = auditDossier({
      ...voll,
      antragsstruktur: { abschnitte: [{ id: "a", leitfragen: ["x"] }, { id: "b" }] },
    });
    // nicht kritisch (mind. 1 Abschnitt mit Leitfragen), aber Score-Dimension fehlt.
    expect(a.critical).toBe(false);
    expect(a.missing).toContain("Leitfragen für alle Abschnitte");
  });

  it("wertet maxProzentGesamtkosten als strukturierte Förderhöhe", () => {
    const a = auditDossier({ ...voll, foerderhoehe: { maxProzentGesamtkosten: 80 } });
    expect(a.signals.foerderhoeheStrukturiert).toBe(true);
  });

  it("behandelt reinen Freitext-Deckel als unstrukturiert", () => {
    const a = auditDossier({ ...voll, foerderhoehe: {} });
    expect(a.signals.foerderhoeheStrukturiert).toBe(false);
    expect(a.missing).toContain("strukturierte Förderhöhe");
  });

  it("markiert Stub-Versionen als nicht aktuell", () => {
    const a = auditDossier({ ...voll, version: "2026-05-19-stub" });
    expect(a.signals.stub).toBe(true);
    expect(a.missing).toContain("aktuell (kein Stub/veraltet)");
  });
});
