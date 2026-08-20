/**
 * Die REIHENFOLGE in buildSectionPrompt ist funktional, nicht kosmetisch.
 *
 * Mistrals Prompt-Cache greift auf dem gemeinsamen PRAEFIX. Bis zum 19.08.2026
 * standen die abschnitts-spezifischen Teile (OFFIZIELLE VORGABEN, ABSCHNITT,
 * FOKUS) zwischen den invarianten Bloecken — der Praefix riss dadurch fast
 * sofort ab, obwohl rund 19.900 der ~20.300 Tokens je Aufruf identisch sind.
 * Gemessen: gemeinsamer Praefix je Abschnittspaar 297 -> 19.910 Tokens.
 *
 * Das zaehlt, weil gecachte Tokens das Minutenkontingent fast nichts kosten
 * (query-cost 7.534 -> 30) und genau dieses Kontingent der Engpass ist, an dem
 * am 13.08.2026 eine Generierung starb.
 *
 * Dieser Test schlaegt an, sobald jemand etwas Abschnitts-Spezifisches wieder
 * nach vorn zieht.
 */
import { buildSectionPrompt } from "@/lib/wizard/prompts";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { WizardFacts } from "@/lib/wizard/types";

const PROGRAMM = {
  id: "test-programm",
  name: "Testförderung Bildung",
  foerdergeber: "Testgeber",
  foerdergeberTyp: "stiftung",
  schulformen: ["grundschule"],
  bundeslaender: ["alle"],
  kategorien: ["bildung"],
  bewerbungsart: "online",
  infoLink: "https://example.org",
  kurzbeschreibung: "Testprogramm für den Präfix-Test.",
  status: "aktiv",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  quelle: "example.org",
  kiAntragGeeignet: true,
} as unknown as Foerderprogramm;

// Bewusst umfangreich: Der Praefix-Gewinn entsteht an den grossen invarianten
// Bloecken (FAKTEN, Nutzerantworten), nicht an Ueberschriften.
const FACTS = {
  schule: { name: "Grundschule am Tor", ort: "Berlin", schulform: "grundschule" },
  projekt: { titel: "Leseclub", beschreibung: "Lesepatenschaften ".repeat(60) },
  wirkung: { ziele: "Lesekompetenz stärken ".repeat(60) },
  budget: { gesamt: 5000 },
} as unknown as WizardFacts;

const ANTWORTEN = [
  "Wir sind ein Schulförderverein und planen einen Leseclub. ".repeat(20),
  "Die Kinder sollen wöchentlich vorlesen üben. ".repeat(20),
];

function prompt(name: string, fokus: string) {
  return buildSectionPrompt(
    PROGRAMM,
    FACTS,
    { name, fokus },
    "Leseclub an der Grundschule am Tor",
    undefined,
    ANTWORTEN,
    null
  );
}

function gemeinsamerPraefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

describe("buildSectionPrompt — gemeinsamer Präfix über Abschnitte hinweg", () => {
  const a = prompt("Zielgruppe und Bedarf", "Wer profitiert und warum");
  const b = prompt("Inhaltliches Konzept", "Was genau passiert");

  it("zwei Abschnitte desselben Antrags teilen den ganz überwiegenden Teil des Prompts", () => {
    const geteilt = gemeinsamerPraefix(a, b);
    const anteil = geteilt / Math.min(a.length, b.length);
    // Vor der Umstellung lag der Anteil bei rund 1 %.
    expect(anteil).toBeGreaterThan(0.8);
  });

  it("das Abschnitts-Spezifische steht HINTER dem Invarianten", () => {
    // Wenn ABSCHNITT/FOKUS wieder nach oben wandern, bricht der Cache.
    expect(a.indexOf("FAKTEN:")).toBeLessThan(a.indexOf("ABSCHNITT:"));
    expect(a.indexOf("PROGRAMM:")).toBeLessThan(a.indexOf("ABSCHNITT:"));
    expect(a.indexOf("ABSCHNITT:")).toBeLessThan(a.indexOf("FOKUS:"));
  });

  it("der Schreibauftrag steht am Ende, nach der Nennung des Abschnitts", () => {
    expect(a.indexOf("Schreibe den Abschnitt.")).toBeGreaterThan(a.indexOf("ABSCHNITT:"));
  });

  it("inhaltlich fehlt nichts — alle Blöcke sind weiterhin da", () => {
    for (const block of [
      "PROGRAMM:",
      "TONALITÄT FÜR DIESEN FÖRDERGEBER-TYP",
      "ANTRAGSTITEL:",
      "FAKTEN:",
      "ROHE USER-ANTWORTEN",
      "Erfinde KEINE Aktenzeichen",
      "PROGRAMM-KONDITIONEN SIND TABU",
      "GELDBETRÄGE UND MENGEN IM TEXT",
      "ABSCHNITT:",
      "FOKUS:",
      "Schreibe den Abschnitt.",
    ]) {
      expect(a).toContain(block);
    }
  });

  it("die Abschnitts-Angaben selbst unterscheiden sich weiterhin", () => {
    expect(a).toContain("ABSCHNITT: Zielgruppe und Bedarf");
    expect(b).toContain("ABSCHNITT: Inhaltliches Konzept");
    expect(a).not.toEqual(b);
  });
});
