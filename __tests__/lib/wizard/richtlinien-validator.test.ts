import {
  RichtlinieStrictSchema,
  RichtlinieLegacySchema,
  validateForeignKeys,
} from "@/lib/wizard/richtlinien-validator";
import aktionMensch from "@/data/richtlinien/aktion-mensch-schulkooperation.json";

// Minimaler valider Antragsstruktur-Block fuer in-line-Fixtures.
const MIN_ANTRAGSSTRUKTUR = {
  abschnitte: [
    { id: "buendnis", name: "Buendnis", pflicht: true },
    { id: "konzept", name: "Konzept", pflicht: true },
    { id: "finanzplan", name: "Finanzplan", pflicht: true },
  ],
  einreichungsweg: "online",
};

const MIN_BASE = {
  version: "2026-05-06-test",
  quellen: ["https://example.org"],
  foerderhoehe: { maxEur: 1000 },
  kostenpositionen: [],
  eigenmittel: { pflicht: false },
  kumulierung: { erlaubt: true },
  antragsstruktur: MIN_ANTRAGSSTRUKTUR,
};

const MIN_STRICT_NEW_FIELDS = {
  bestPractices: [
    {
      thema: "Zielgruppen-Schaerfe",
      was_funktionierte:
        "Klare Definition der Schueler-Zielgruppe nach Klassenstufe",
    },
  ],
  rejectGruende: [
    {
      grund: "Zielgruppe zu vage definiert",
      haeufigkeit: "haeufig" as const,
    },
  ],
  vorbildFormulierungen: [
    {
      abschnitt_id: "konzept",
      formulierung:
        "Das Projekt foerdert nachhaltig die digitale Souveraenitaet der Klassen 7-9.",
    },
  ],
  fristLogik: { typ: "rolling" as const },
};

describe("RichtlinieStrictSchema", () => {
  describe("strict mode", () => {
    it("sollte ein Legacy-Dossier ohne 4 neue Felder ablehnen", () => {
      const result = RichtlinieStrictSchema.safeParse(aktionMensch);
      expect(result.success).toBe(false);
    });

    it("sollte ein Dossier mit allen 4 neuen Feldern akzeptieren", () => {
      const dossier = { ...MIN_BASE, ...MIN_STRICT_NEW_FIELDS };
      const result = RichtlinieStrictSchema.safeParse(dossier);
      expect(result.success).toBe(true);
    });
  });

  describe("fristLogik (Discriminated Union)", () => {
    const baseValid = { ...MIN_BASE, ...MIN_STRICT_NEW_FIELDS };

    it("sollte rolling akzeptieren ohne stichtage", () => {
      const d = { ...baseValid, fristLogik: { typ: "rolling" } };
      expect(RichtlinieStrictSchema.safeParse(d).success).toBe(true);
    });

    it("sollte fixe_stichtage mit nicht-leerem stichtage[]-Array akzeptieren", () => {
      const d = {
        ...baseValid,
        fristLogik: { typ: "fixe_stichtage", stichtage: ["2026-04-10"] },
      };
      expect(RichtlinieStrictSchema.safeParse(d).success).toBe(true);
    });

    it("sollte fixe_stichtage MIT leerem stichtage[] ablehnen", () => {
      const d = {
        ...baseValid,
        fristLogik: { typ: "fixe_stichtage", stichtage: [] },
      };
      expect(RichtlinieStrictSchema.safeParse(d).success).toBe(false);
    });

    it("sollte stichtage in deutschem Format (10.04.2026) ablehnen", () => {
      const d = {
        ...baseValid,
        fristLogik: { typ: "fixe_stichtage", stichtage: ["10.04.2026"] },
      };
      expect(RichtlinieStrictSchema.safeParse(d).success).toBe(false);
    });

    it("sollte stichtage in ISO-Format (2026-04-10) akzeptieren", () => {
      const d = {
        ...baseValid,
        fristLogik: {
          typ: "fixe_stichtage",
          stichtage: ["2026-04-10", "2026-09-30"],
          jaehrlich_wiederkehrend: true,
        },
      };
      expect(RichtlinieStrictSchema.safeParse(d).success).toBe(true);
    });
  });
});

describe("RichtlinieLegacySchema", () => {
  it("sollte ein Dossier ohne neue Felder akzeptieren", () => {
    const result = RichtlinieLegacySchema.safeParse(aktionMensch);
    expect(result.success).toBe(true);
  });

  it("sollte ein Dossier mit teilweise gefuellten neuen Feldern akzeptieren", () => {
    const d = {
      ...MIN_BASE,
      bestPractices: [
        {
          thema: "Test-Thema",
          was_funktionierte: "Funktionierende Massnahme A",
        },
      ],
      // rejectGruende, vorbildFormulierungen, fristLogik fehlen — Legacy erlaubt das
    };
    expect(RichtlinieLegacySchema.safeParse(d).success).toBe(true);
  });
});

describe("validateForeignKeys", () => {
  it("sollte FK-Verletzung erkennen wenn abschnitt_id nicht in antragsstruktur.abschnitte", () => {
    const dossier = {
      antragsstruktur: MIN_ANTRAGSSTRUKTUR,
      vorbildFormulierungen: [
        { abschnitt_id: "finanzplan-alt", formulierung: "x" },
      ],
    };
    const issues = validateForeignKeys(dossier, "test-programm");
    expect(issues).toHaveLength(1);
    expect(issues[0].abschnitt_id).toBe("finanzplan-alt");
    expect(issues[0].reason).toMatch(/FK-Verletzung/);
  });

  it("sollte leere Issues-Liste zurueckgeben bei vollstaendig konsistentem Dossier", () => {
    const dossier = {
      antragsstruktur: MIN_ANTRAGSSTRUKTUR,
      vorbildFormulierungen: [
        { abschnitt_id: "konzept", formulierung: "x" },
        { abschnitt_id: "finanzplan", formulierung: "y" },
      ],
    };
    const issues = validateForeignKeys(dossier, "test-programm");
    expect(issues).toHaveLength(0);
  });

  it("sollte vorbildFormulierungen=undefined als keine Issues behandeln", () => {
    const dossier = { antragsstruktur: MIN_ANTRAGSSTRUKTUR };
    const issues = validateForeignKeys(dossier, "test-programm");
    expect(issues).toHaveLength(0);
  });
});
