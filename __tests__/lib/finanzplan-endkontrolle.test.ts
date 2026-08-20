/**
 * Paket 4 (Tester-Feedback #008, 20.08.2026) — die Endkontrolle im
 * Zusammenspiel. Der Tester wollte nicht bessere Texte, sondern dass das
 * Werkzeug die Zahlen am Ende gegeneinander prüft. Dieser Test fährt genau
 * diese Kette an einem Plan ab, wie ihn das LLM liefert:
 *
 *   1. Prozent-Posten wird still richtig gerechnet (der Nutzer sieht den
 *      Fehler gar nicht erst) und die Änderung offengelegt.
 *   2. Grosse Posten und Honorare ohne Rechnung bekommen einen ehrlichen
 *      `[TODO: …]`-Marker — nie einen erfundenen Faktor.
 */
import { generateFinanzplan } from "@/lib/wizard/finanzplan-generator";
import type { WizardFacts } from "@/lib/wizard/types";

const generateJsonMock = jest.fn();

jest.mock("@/lib/wizard/llm", () => {
  const actual = jest.requireActual("@/lib/wizard/llm");
  return {
    ...actual,
    generateJson: (...args: unknown[]) => generateJsonMock(...args),
  };
});

const programm = { id: "p", name: "Test", foerdergeberTyp: "bund" } as never;
const usage = { promptTokens: 10, candidatesTokens: 10 };

beforeEach(() => generateJsonMock.mockReset());

const facts = { schule: { name: "GS" }, projekt: {} } as unknown as WizardFacts;

it("rechnet die Pauschale nach und markiert unhergeleitete Posten", async () => {
  generateJsonMock.mockResolvedValueOnce({
    value: {
      posten: [
        {
          kategorie: "honorare",
          bezeichnung: "Kulturpädagogische Fachkräfte",
          betragEur: 18000,
          begruendung: "Honorare für die Projektwoche.",
        },
        {
          kategorie: "sachkosten",
          bezeichnung: "Materialien",
          betragEur: 10000,
          begruendung: "Material für die Projektwoche.",
        },
        {
          kategorie: "investitionen",
          bezeichnung: "Tablets",
          betragEur: 12000,
          begruendung: "30 Tablets × 400 EUR = 12.000 EUR",
        },
        {
          kategorie: "overhead",
          bezeichnung: "Verwaltungspauschale (7 %)",
          betragEur: 3000,
          begruendung: "Verwaltungsaufwand des Trägers.",
        },
      ],
    },
    usage,
  });

  const { plan } = await generateFinanzplan(programm, facts, null, [
    "Wir rechnen mit rund 40.000 EUR.",
  ]);
  const nach = (bez: string) => plan.posten.find((p) => p.bezeichnung === bez)!;

  // 1. Prozent-Posten: 7 % von 40.000 EUR = 2.800 EUR, still korrigiert.
  expect(nach("Verwaltungspauschale (7 %)").betragEur).toBe(2800);
  expect(plan.hinweise!.some((h) => h.includes("korrigiert") && h.includes("2.800"))).toBe(true);

  // 2. Honorar ohne Zeitgerüst → Marker, Betrag unangetastet.
  expect(nach("Kulturpädagogische Fachkräfte").begruendung).toContain(
    "[TODO: Honorar „Kulturpädagogische Fachkräfte\" über Stundenzahl × Stundensatz"
  );
  expect(nach("Kulturpädagogische Fachkräfte").betragEur).toBe(18000);

  // 3. Grosser Posten ohne Rechnung → Marker.
  expect(nach("Materialien").begruendung).toContain("[TODO: Betrag für „Materialien\"");

  // 4. Posten MIT Rechnung bleibt unberührt — kein Marker, kein neuer Text.
  expect(nach("Tablets").begruendung).toBe("30 Tablets × 400 EUR = 12.000 EUR");

  // 5. Der Prozent-Posten trägt seine Herleitung im Namen — kein Marker.
  expect(nach("Verwaltungspauschale (7 %)").begruendung).not.toContain("[TODO:");

  // 6. Ein Sammelhinweis nennt beide Befundarten.
  expect(
    plan.hinweise!.some((h) => h.includes("Honorarposten") && h.includes("nicht erfinden"))
  ).toBe(true);
});

/**
 * Die Sackgassen-Regel (Feedback #008): Ein `error` sperrt die Freigabe
 * (okFuerFreigabe) und darf deshalb nur stehen, wo der Nutzer einen Ausweg
 * hat. Eine fehlende Herleitung ist eine Ermessensfrage des Antragstellers —
 * sie meldet, sie sperrt nicht.
 */
import { validateFinanzplan } from "@/lib/wizard/finanzplan-validator";
import type { Finanzplan } from "@/lib/wizard/types";

it("eine fehlende Herleitung meldet, aber sperrt die Freigabe nicht", () => {
  const plan = {
    posten: [
      {
        id: "a",
        kategorie: "sachkosten",
        bezeichnung: "Ausstattung",
        betragEur: 9000,
        begruendung: "Ausstattung für das Projekt.",
      },
      {
        id: "b",
        kategorie: "honorare",
        bezeichnung: "Referentin",
        betragEur: 900,
        begruendung: "Honorar für die Fortbildung.",
      },
    ],
    generiertAm: "x",
  } as unknown as Finanzplan;

  const res = validateFinanzplan(plan, null);
  const herleitung = res.warnungen.filter((w) => /Herleitung|Stundensatz|zustande kommt/.test(w.message));
  expect(herleitung).toHaveLength(2);
  expect(herleitung.every((w) => w.level === "warning")).toBe(true);
  expect(res.okFuerFreigabe).toBe(true);
});
