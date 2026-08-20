/**
 * Die JSON-Schlüssel in den Prompts müssen ASCII bleiben.
 *
 * WARUM ES DIESEN TEST GIBT
 * -------------------------
 * Am 18.08.2026 hat der Sweep „echte Umlaute statt ae/oe/ue" (1187efe) auch die
 * SCHLÜSSEL der Ausgabeschemata umgeschrieben. Aus `"begruendung"` wurde
 * `"begründung"`, aus `"schuelerzahl"` wurde `"schülerzahl"`, aus
 * `"aktivitaeten"` wurde `"aktivitäten"`, und der Enum-Wert `"belegluecke"`
 * wurde zu `"beleglücke"`. Die Parser lasen unverändert ASCII.
 *
 * Nichts davon hat einen Fehler geworfen. Die Felder kamen einfach nicht mehr
 * an — gemessen über den Korpus: 386 von 386 Finanzplan-Posten hatten vorher
 * eine Begründung, 0 von 237 danach. Zwei Tage lang stand in jedem erzeugten
 * Finanzplan eine nackte Zahl ohne jede Erklärung, und der Pilot-Tester hat
 * genau das gemeldet („ich kann nicht nachvollziehen, wie dieser Betrag
 * zustande kommt").
 *
 * Ein Prompt ist eine Schnittstelle. Ihre Feldnamen sind Code, kein Fließtext —
 * dieselbe Grenze wie bei SQL-Namen, Slugs und Enum-Werten
 * (siehe CLAUDE.md, Abschnitt „Sprache").
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  CRITIQUE_SYSTEM,
  FACTS_EXTRACTOR_SYSTEM,
  FINANZPLAN_SYSTEM,
} from "@/lib/wizard/prompts";

const QUELLE = readFileSync(join(process.cwd(), "lib/wizard/prompts.ts"), "utf8");

/** Alle Vorkommen von `"name":` — die Form, in der ein JSON-Schlüssel im Prompt steht. */
function jsonSchluessel(text: string): string[] {
  return [...text.matchAll(/"([A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_]*)"\s*:/g)].map((m) => m[1]);
}

const nurAscii = (s: string) => /^[\x20-\x7E]*$/.test(s);

describe("JSON-Schlüssel in den Prompts", () => {
  it("enthält keinen Schlüssel mit Umlaut oder ß", () => {
    const verletzer = [...new Set(jsonSchluessel(QUELLE))].filter((k) => !nurAscii(k));
    expect(verletzer).toEqual([]);
  });

  it("nennt die Facts-Slots so, wie WizardFacts sie liest", () => {
    expect(FACTS_EXTRACTOR_SYSTEM).toContain('"schuelerzahl"');
    expect(FACTS_EXTRACTOR_SYSTEM).toContain('"aktivitaeten"');
    // Geprüft wird der SLOT-Name, nicht das deutsche Wort: "Gesamtschülerzahl"
    // im Fließtext ist richtig so und muss Umlaute behalten.
    for (const slot of ['"schülerzahl"', "schule.schülerzahl", '"aktivitäten"', "projekt.aktivitäten", "aktivitäten ="]) {
      expect(FACTS_EXTRACTOR_SYSTEM).not.toContain(slot);
    }
  });

  it("nennt den Finanzplan-Slot so, wie der Parser ihn liest", () => {
    expect(FINANZPLAN_SYSTEM).toContain('"begruendung"');
    expect(FINANZPLAN_SYSTEM).not.toContain('"begründung":');
  });

  it("nennt den Kategorie-Enumwert so, wie die Pipeline ihn kennt", () => {
    // Der Wert steht in KATEGORIE_VALID (pipeline.ts) und in CritiqueKategorie
    // (types.ts) — beide ASCII. Eine Umlaut-Variante fällt still auf
    // "sonstiges" zurück, und jedes Halluzinations-Finding verliert seine
    // Kategorie.
    expect(CRITIQUE_SYSTEM).toContain("belegluecke");
    expect(CRITIQUE_SYSTEM).not.toContain("beleglücke");
  });
});
