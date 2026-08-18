/**
 * Verdrahtungs-Nachweis fuer das Verbots-Gate (WIZ-05-Befund 31.07.2026).
 *
 * Warum als Pipeline-Test und nicht nur als Modul-Test: Der Defekt aus pv-005 war
 * kein Detektor-Fehler, sondern ein PLATZIERUNGS-Fehler — der Finanzplan wird nach
 * beiden Ehrlichkeits-Gates erzeugt und lief deshalb durch keines. Ein gruener
 * Modul-Test haette das nicht bemerkt. Dieser Test haelt die Reihenfolge fest.
 */

import type { Foerderprogramm } from "@/lib/foerderSchema";

jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "mistral-small-latest",
  MODEL_PRO: "mistral-small-latest",
  generateJson: jest.fn(),
  generateText: jest.fn(),
}));

const programm: Foerderprogramm = {
  id: "stub-program",
  name: "Stub-Programm",
  foerdergeber: "Test",
  foerdergeberTyp: "stiftung",
} as unknown as Foerderprogramm;

const FINAL_TEXT = `Bedarf
Die Schule braucht Unterstützung für die Projekttage im kommenden Schuljahr.

Maßnahmen
Wir führen zwei Projekttage durch und binden die Klassen aktiv ein.`;

// Der belegte Fall aus pv-005: korrektes "Schaetzung:"-Praefix UND die in
// FINANZPLAN_SYSTEM woertlich verbotene Tarif-Splittung.
const POSTEN_MIT_TARIF = [
  {
    kategorie: "personal",
    bezeichnung: "Freistellung Lehrkräfte",
    betragEur: 1792,
    eigenanteil: false,
    begruendung:
      "Schätzung: 2 Lehrkräfte × 2 Projekttage × 8 Std/Tag × 56 EUR/Std (TV-L E11, Mittelwert)",
  },
];

function mockLlm(posten: unknown[]) {
  const { generateJson, generateText } = require("@/lib/wizard/llm");
  (generateJson as jest.Mock).mockResolvedValue({
    value: {
      titel: "Stub-Antrag",
      abschnitte: [{ name: "Bedarf", fokus: "Stub" }],
      findings: [],
      zusammenfassung: "Stub",
      resolutions: [],
      claims: [],
      posten,
      hinweise: [],
      issues: [],
    },
    usage: { promptTokens: 0, candidatesTokens: 0 },
  });
  (generateText as jest.Mock).mockResolvedValue({
    value: FINAL_TEXT,
    usage: { promptTokens: 0, candidatesTokens: 0 },
  });
}

describe("Pipeline — Verbots-Gate auf dem Finanzplan", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("entfernt die erfundene Tarifgruppe aus der Begründung, ohne den Betrag anzufassen", async () => {
    const { runPipeline } = require("@/lib/wizard/pipeline");
    mockLlm(POSTEN_MIT_TARIF);

    const res = await runPipeline(
      programm,
      { projekt: { titel: "Projekttage" } },
      null,
      () => {},
      ["Wir wollen zwei Projekttage machen, Kosten wissen wir noch nicht."]
    );

    const plan = res.artefacts.finanzplan;
    expect(plan.posten).toHaveLength(1);
    expect(plan.posten[0].begruendung).not.toMatch(/TV-L/);
    // Der geschaetzte Betrag und die Rechnung bleiben — sie sind das
    // vorgeschriebene Ehrlichkeits-Mittel, nicht der Defekt.
    expect(plan.posten[0].betragEur).toBe(1792);
    expect(plan.posten[0].begruendung).toContain("56 EUR/Std");
    // Die Kuerzung wird dem Nutzer sichtbar gemacht.
    expect((plan.hinweise ?? []).join(" ")).toMatch(/nicht aus Ihren Angaben/);
  });

  it("erzeugt für eine Preis-Bewerbung GAR KEINEN Finanzplan", async () => {
    // Architektur-Umbau 03.08.2026: Die Antragsart entscheidet ueber die Artefakte.
    // Belegt an pv-004 (Deutscher Schulpreis): mit angehaengtem Finanzplan faellt
    // das Gutachterurteil bei gemini von 4,18 auf 2,40.
    const { runPipeline } = require("@/lib/wizard/pipeline");
    mockLlm(POSTEN_MIT_TARIF);

    const preis = {
      ...programm,
      name: "Deutscher Schulpreis",
    } as unknown as Foerderprogramm;
    const richtlinie = {
      version: "1.0",
      antragsstruktur: {
        abschnitte: [
          { id: "q1", name: "Qualitätsbereich 1: Leistung" },
          { id: "q2", name: "Qualitätsbereich 2: Umgang mit Vielfalt" },
        ],
      },
      foerderhoehe: {},
      eigenmittel: {},
      kumulierung: {},
    } as never;

    const res = await runPipeline(preis, { projekt: { titel: "Schulentwicklung" } }, richtlinie, () => {}, [
      "Wir arbeiten seit Jahren an unserem Schulklima.",
    ]);

    expect(res.artefacts.finanzplan).toBeUndefined();
    // Der Antragstext entsteht trotzdem vollstaendig.
    expect(res.artefacts.finalText).toBeTruthy();
  });

  it("lässt einen sauberen Finanzplan unverändert und setzt keinen Hinweis", async () => {
    const { runPipeline } = require("@/lib/wizard/pipeline");
    mockLlm([
      {
        kategorie: "sachkosten",
        bezeichnung: "Material",
        betragEur: 800,
        eigenanteil: false,
        begruendung: "Schätzung: Verbrauchsmaterial für die Projekttage, Menge noch festzulegen.",
      },
    ]);

    const res = await runPipeline(
      programm,
      { projekt: { titel: "Projekttage" } },
      null,
      () => {},
      ["Wir wollen zwei Projekttage machen, Kosten wissen wir noch nicht."]
    );

    const plan = res.artefacts.finanzplan;
    expect(plan.posten[0].begruendung).toContain("Verbrauchsmaterial");
    expect((plan.hinweise ?? []).join(" ")).not.toMatch(/nicht aus Ihren Angaben/);
  });
});
