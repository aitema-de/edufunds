/**
 * Probe 09.06. — Hebel 1b: Fakt-Verifikations-Pass.
 * Das deterministische Zahlen-Gate faengt nur Zahlen/Eigennamen. Dieser Pass
 * prueft NARRATIVE, ueberpruefbare Behauptungen (Partner/Termine/Zusagen/Mengen/
 * Kanaele) gegen die Nutzer-Ground-Truth (Facts + Antworten, OHNE Entwurf) und
 * entschaerft sie — uebernommen aber nur bei deterministisch nachgewiesener
 * Verbesserung (Never-Worse), mit Detektor-Anker gegen erfundene Zitate.
 */
import {
  anchorClaims,
  buildGroundTruth,
  verifyFacts,
} from "@/lib/wizard/fact-verification";
import type { WizardFacts } from "@/lib/wizard/types";
import type { Usage } from "@/lib/wizard/pricing";

const U: Usage = { promptTokens: 1, candidatesTokens: 1 };

describe("buildGroundTruth", () => {
  it("vereint Facts-Blattwerte und User-Antworten — OHNE Entwurf", () => {
    const facts: WizardFacts = {
      schule: { name: "Astrid-Lindgren-Grundschule", schuelerzahl: 240 },
      projekt: { titel: "Leseclub", ziele: ["mehr Lesefreude"] },
    };
    const gt = buildGroundTruth(facts, ["wir haben rund 20 Tablets"]);
    expect(gt).toContain("Astrid-Lindgren-Grundschule");
    expect(gt).toContain("240");
    expect(gt).toContain("Leseclub");
    expect(gt).toContain("20 Tablets");
  });

  it("ist leer/kurz, wenn der Nutzer praktisch nichts angegeben hat", () => {
    const gt = buildGroundTruth({}, []);
    expect(gt.trim().length).toBe(0);
  });
});

describe("anchorClaims — Detektor-Anker", () => {
  const finalText =
    "# Leseprojekt\n\nIn Kooperation mit der Stadtbuecherei Musterstadt richten wir woechentliche Lesestunden ein. Ab September 2026 startet die Pilotphase.";

  it("behaelt nur Behauptungen, deren Zitat woertlich im Text steht", () => {
    const raw = {
      claims: [
        { zitat: "In Kooperation mit der Stadtbuecherei Musterstadt", art: "partner", warum: "nicht genannt" },
        { zitat: "Frau Dr. Erfunden leitet das Projekt", art: "zusage", warum: "frei erfunden vom Detektor" },
      ],
    };
    const out = anchorClaims(raw, finalText);
    expect(out).toHaveLength(1);
    expect(out[0].zitat).toContain("Stadtbuecherei Musterstadt");
    expect(out[0].art).toBe("partner");
  });

  it("dedupliziert und faellt auf 'sonstiges' bei unbekannter art zurueck", () => {
    const raw = {
      claims: [
        { zitat: "Ab September 2026 startet die Pilotphase", art: "quatsch", warum: "x" },
        { zitat: "ab september 2026 startet die pilotphase", art: "termin", warum: "y" },
      ],
    };
    const out = anchorClaims(raw, finalText);
    expect(out).toHaveLength(1);
    expect(out[0].art).toBe("sonstiges");
  });

  it("liefert [] bei fehlender/kaputter claims-Struktur", () => {
    expect(anchorClaims({}, finalText)).toHaveLength(0);
    expect(anchorClaims({ claims: "nope" }, finalText)).toHaveLength(0);
    expect(anchorClaims(null, finalText)).toHaveLength(0);
  });
});

describe("verifyFacts — No-op-Pfade", () => {
  const groundTruth = "Schule: Astrid-Lindgren-Grundschule. Idee: Leseclub gruenden.";
  const kontext = "Leseförderung — Grundschulen";

  it("No-op (kein Repair-Call), wenn der Detektor nichts Ankerbares findet", async () => {
    const revise = jest.fn();
    const res = await verifyFacts("# Antrag\n\nEin ehrlicher Antrag.", groundTruth, kontext, {
      detect: async () => ({ value: { claims: [] }, usage: U }),
      revise,
      models: { detect: "d", revise: "r" },
    });
    expect(revise).not.toHaveBeenCalled();
    expect(res.repaired).toBe(false);
    expect(res.flagged).toHaveLength(0);
    expect(res.usages).toHaveLength(1); // nur der Detektor-Call
  });

  it("verwirft vom Detektor erfundene Zitate (Anker) → No-op", async () => {
    const revise = jest.fn();
    const res = await verifyFacts("# Antrag\n\nEin ehrlicher Antrag ohne Erfindungen.", groundTruth, kontext, {
      detect: async () => ({ value: { claims: [{ zitat: "steht so gar nicht im Text", art: "partner", warum: "x" }] }, usage: U }),
      revise,
      models: { detect: "d", revise: "r" },
    });
    expect(revise).not.toHaveBeenCalled();
    expect(res.repaired).toBe(false);
  });
});

describe("verifyFacts — Never-Worse-Akzeptanzgate", () => {
  const groundTruth = "Schule: Astrid-Lindgren-Grundschule. Idee: Leseclub gruenden.";
  const kontext = "Leseförderung — Grundschulen";
  const finalText =
    "# Leseprojekt\n\nIn Kooperation mit der Stadtbuecherei Musterstadt richten wir woechentliche Lesestunden ein. So foerdern wir die Lesefreude der Kinder nachhaltig und schaffen einen festen Treffpunkt im Schulalltag.";
  const detectHit = {
    value: { claims: [{ zitat: "In Kooperation mit der Stadtbuecherei Musterstadt", art: "partner", warum: "nicht vom Nutzer genannt" }] },
    usage: U,
  };

  it("uebernimmt den Repair, wenn er die geflaggte Behauptung entfernt", async () => {
    const cleaned =
      "# Leseprojekt\n\nGemeinsam mit einem noch zu gewinnenden Kooperationspartner richten wir woechentliche Lesestunden ein. So foerdern wir die Lesefreude der Kinder nachhaltig und schaffen einen festen Treffpunkt im Schulalltag.";
    const res = await verifyFacts(finalText, groundTruth, kontext, {
      detect: async () => detectHit,
      revise: async () => ({ value: cleaned, usage: U }),
      models: { detect: "d", revise: "r" },
    });
    expect(res.repaired).toBe(true);
    expect(res.finalText).toBe(cleaned);
    expect(res.remaining).toHaveLength(0);
    expect(res.flagged).toHaveLength(1);
  });

  it("verwirft den Repair, der die Behauptung gegen eine andere Erfindung tauscht (nie verschlimmern)", async () => {
    // Stadtbuecherei raus, aber dafuer eine neue erfundene Rechtsform-Entitaet rein
    // → harte-Halluzinations-Zahl/Name steigt → Never-Worse lehnt ab.
    const notBetter =
      "# Leseprojekt\n\nIn Kooperation mit dem Lesefoerderverein Musterstadt e.V. richten wir woechentliche Lesestunden ein. So foerdern wir die Lesefreude der Kinder nachhaltig und schaffen einen festen Treffpunkt im Schulalltag.";
    const res = await verifyFacts(finalText, groundTruth, kontext, {
      detect: async () => detectHit,
      revise: async () => ({ value: notBetter, usage: U }),
      models: { detect: "d", revise: "r" },
    });
    expect(res.repaired).toBe(false);
    expect(res.finalText).toBe(finalText);
  });

  it("verwirft einen Repair, der den Text massiv kuerzt (Anti-Truncation)", async () => {
    const res = await verifyFacts(finalText, groundTruth, kontext, {
      detect: async () => detectHit,
      revise: async () => ({ value: "# Leseprojekt\n\nLesestunden.", usage: U }),
      models: { detect: "d", revise: "r" },
    });
    expect(res.repaired).toBe(false);
    expect(res.finalText).toBe(finalText);
  });

  it("verwirft den Repair, der die Behauptung gar nicht entfernt", async () => {
    const res = await verifyFacts(finalText, groundTruth, kontext, {
      detect: async () => detectHit,
      revise: async () => ({ value: finalText, usage: U }), // unveraendert
      models: { detect: "d", revise: "r" },
    });
    expect(res.repaired).toBe(false);
    expect(res.finalText).toBe(finalText);
  });
});
