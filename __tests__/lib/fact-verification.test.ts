/**
 * Fakt-Verifikations-Pass (dreistufig, Produktvision 2026-06-10):
 * - "widerspruch"/"tatsache" → per Repair neutralisieren (Never-Worse).
 * - "vorschlag" → im Text BEHALTEN + dem Nutzer als bestätigbar auflisten.
 * Detektor-Anker (Zitat muss wörtlich im Text stehen) verwirft erfundene Zitate.
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
    expect(gt).toContain("Leseclub");
    expect(gt).toContain("20 Tablets");
  });
});

describe("anchorClaims — Detektor-Anker + dreistufige Klassifikation", () => {
  const finalText =
    "# Leseprojekt\n\nIn Kooperation mit der Stadtbuecherei Musterstadt richten wir woechentliche Lesestunden ein. Ab September 2026 startet die Pilotphase.";

  it("behaelt nur Behauptungen, deren Zitat woertlich im Text steht", () => {
    const raw = {
      claims: [
        { zitat: "In Kooperation mit der Stadtbuecherei Musterstadt", art: "tatsache", warum: "nicht genannt" },
        { zitat: "Frau Dr. Erfunden leitet das Projekt", art: "tatsache", warum: "frei erfunden vom Detektor" },
      ],
    };
    const out = anchorClaims(raw, finalText);
    expect(out).toHaveLength(1);
    expect(out[0].zitat).toContain("Stadtbuecherei Musterstadt");
    expect(out[0].art).toBe("tatsache");
  });

  it("dedupliziert und faellt auf 'vorschlag' bei unbekannter art zurueck (im Zweifel behalten)", () => {
    const raw = {
      claims: [
        { zitat: "Ab September 2026 startet die Pilotphase", art: "quatsch", warum: "x" },
        { zitat: "ab september 2026 startet die pilotphase", art: "tatsache", warum: "y" },
      ],
    };
    const out = anchorClaims(raw, finalText);
    expect(out).toHaveLength(1);
    expect(out[0].art).toBe("vorschlag");
  });

  it("liefert [] bei fehlender/kaputter claims-Struktur", () => {
    expect(anchorClaims({}, finalText)).toHaveLength(0);
    expect(anchorClaims({ claims: "nope" }, finalText)).toHaveLength(0);
    expect(anchorClaims(null, finalText)).toHaveLength(0);
  });
});

describe("verifyFacts — Vorschläge bleiben, kein Repair", () => {
  const groundTruth = "Schule: Astrid-Lindgren-Grundschule. Idee: Leseclub gruenden.";
  const kontext = "Leseförderung — Grundschulen";
  const finalText =
    "# Leseprojekt\n\nWir richten woechentliche Lesestunden ein und verbreiten die Ergebnisse ueber den Schul-Newsletter.";

  it("No-op (kein Repair-Call), wenn der Detektor nichts findet", async () => {
    const revise = jest.fn();
    const res = await verifyFacts(finalText, groundTruth, kontext, {
      detect: async () => ({ value: { claims: [] }, usage: U }),
      revise,
      models: { detect: "d", revise: "r" },
    });
    expect(revise).not.toHaveBeenCalled();
    expect(res.neutralisiert).toHaveLength(0);
    expect(res.vorschlaege).toHaveLength(0);
    expect(res.usages).toHaveLength(1);
  });

  it("behaelt einen 'vorschlag' im Text, ruft KEINEN Repair und listet ihn auf", async () => {
    const revise = jest.fn();
    const res = await verifyFacts(finalText, groundTruth, kontext, {
      detect: async () => ({
        value: { claims: [{ zitat: "verbreiten die Ergebnisse ueber den Schul-Newsletter", art: "vorschlag", warum: "sinnvolle Option" }] },
        usage: U,
      }),
      revise,
      models: { detect: "d", revise: "r" },
    });
    expect(revise).not.toHaveBeenCalled();
    expect(res.finalText).toBe(finalText); // Text unveraendert
    expect(res.vorschlaege).toEqual(["verbreiten die Ergebnisse ueber den Schul-Newsletter"]);
    expect(res.neutralisiert).toHaveLength(0);
    expect(res.repaired).toBe(false);
  });

  it("verwirft vom Detektor erfundene Zitate (Anker)", async () => {
    const revise = jest.fn();
    const res = await verifyFacts(finalText, groundTruth, kontext, {
      detect: async () => ({ value: { claims: [{ zitat: "steht so gar nicht im Text", art: "tatsache", warum: "x" }] }, usage: U }),
      revise,
      models: { detect: "d", revise: "r" },
    });
    expect(revise).not.toHaveBeenCalled();
    expect(res.neutralisiert).toHaveLength(0);
  });
});

describe("verifyFacts — Neutralisierung mit Never-Worse-Gate", () => {
  const groundTruth = "Schule: Astrid-Lindgren-Grundschule. Idee: Leseclub gruenden.";
  const kontext = "Leseförderung — Grundschulen";
  const finalText =
    "# Leseprojekt\n\nDer Schultraeger hat die Anschaffung bereits zugesagt. So foerdern wir die Lesefreude der Kinder nachhaltig und schaffen einen festen Treffpunkt im Schulalltag.";
  const detectHit = {
    value: { claims: [{ zitat: "Der Schultraeger hat die Anschaffung bereits zugesagt", art: "tatsache", warum: "ungesicherte Zusage" }] },
    usage: U,
  };

  it("uebernimmt den Repair, wenn er die falsche Tatsache entschaerft", async () => {
    const cleaned =
      "# Leseprojekt\n\nDie Zustimmung des Schultraegers ist noch einzuholen. So foerdern wir die Lesefreude der Kinder nachhaltig und schaffen einen festen Treffpunkt im Schulalltag.";
    const res = await verifyFacts(finalText, groundTruth, kontext, {
      detect: async () => detectHit,
      revise: async () => ({ value: cleaned, usage: U }),
      models: { detect: "d", revise: "r" },
    });
    expect(res.repaired).toBe(true);
    expect(res.finalText).toBe(cleaned);
    expect(res.neutralisiert).toHaveLength(1);
    expect(res.remaining).toHaveLength(0);
  });

  it("verwirft einen Repair, der eine neue harte Halluzination einführt (nie verschlimmern)", async () => {
    const notBetter =
      "# Leseprojekt\n\nIn Kooperation mit dem Lesefoerderverein Musterstadt e.V. ist alles geklaert. So foerdern wir die Lesefreude der Kinder nachhaltig und schaffen einen festen Treffpunkt im Schulalltag.";
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
      revise: async () => ({ value: "# Leseprojekt\n\nLesen.", usage: U }),
      models: { detect: "d", revise: "r" },
    });
    expect(res.repaired).toBe(false);
    expect(res.finalText).toBe(finalText);
  });

  it("neutralisiert Widersprüche/Tatsachen, behält gleichzeitig gefundene Vorschläge", async () => {
    const text =
      "# Leseprojekt\n\nDer Schultraeger hat die Anschaffung bereits zugesagt. Wir verbreiten die Ergebnisse ueber den Schul-Newsletter.";
    const cleaned =
      "# Leseprojekt\n\nDie Zustimmung des Schultraegers ist noch einzuholen. Wir verbreiten die Ergebnisse ueber den Schul-Newsletter.";
    const res = await verifyFacts(text, groundTruth, kontext, {
      detect: async () => ({
        value: {
          claims: [
            { zitat: "Der Schultraeger hat die Anschaffung bereits zugesagt", art: "tatsache", warum: "ungesicherte Zusage" },
            { zitat: "verbreiten die Ergebnisse ueber den Schul-Newsletter", art: "vorschlag", warum: "sinnvolle Option" },
          ],
        },
        usage: U,
      }),
      revise: async () => ({ value: cleaned, usage: U }),
      models: { detect: "d", revise: "r" },
    });
    expect(res.repaired).toBe(true);
    expect(res.neutralisiert).toEqual(["Der Schultraeger hat die Anschaffung bereits zugesagt"]);
    expect(res.vorschlaege).toEqual(["verbreiten die Ergebnisse ueber den Schul-Newsletter"]);
  });
});
