/**
 * WIZ-01b (Pilot-Befund "Textumfang", 15.07.2026): misst Pflichtabschnitt-Praesenz +
 * Mindestlaenge im finalText (dem sichtbaren Artefakt) — nicht in sections[] (dem
 * Zwischenprodukt, das immer vollstaendig ist). Genau diese Blindstelle liess den
 * Kollaps auf ~2 Abschnitte durchrutschen.
 */
import { scoreWiz01FinalText } from "@/scripts/eval-pipeline-internals";
import type { GenerationArtefacts } from "@/lib/wizard/types";
import type { Richtlinie } from "@/lib/wizard/richtlinien-schema";

const richtlinie = {
  antragsstruktur: {
    abschnitte: [
      { id: "a1", name: "Ausgangslage", pflicht: true },
      { id: "a2", name: "Ziele und Wirkung", pflicht: true },
      { id: "a3", name: "Maßnahmen", pflicht: true },
      { id: "a4", name: "Nachhaltigkeit", pflicht: true },
    ],
  },
} as unknown as Richtlinie;

function artefacts(finalText: string, sections: string[] = []): GenerationArtefacts {
  return {
    finalText,
    sections: sections.map((n) => ({ name: n, text: "x".repeat(400) })),
  } as GenerationArtefacts;
}

const fullBody = "Ausreichend langer Abschnittstext. ".repeat(20); // > 200 Zeichen

it("100 % Coverage, wenn alle Pflichtabschnitte im finalText stehen", () => {
  const finalText = ["# Titel", "## Ausgangslage", fullBody, "## Ziele und Wirkung", fullBody, "## Maßnahmen", fullBody, "## Nachhaltigkeit", fullBody].join("\n\n");
  const r = scoreWiz01FinalText(artefacts(finalText), richtlinie);
  expect(r.coveragePercent).toBe(100);
  expect(r.missingAbschnitte).toEqual([]);
  expect(r.shortAbschnitte).toEqual([]);
});

it("faengt den Kollaps: finalText mit nur 2 Abschnitten trotz vollstaendiger sections[]", () => {
  // sections[] enthaelt alle 4 (WIZ-01 waere 100 %), finalText nur 2 → WIZ-01b muss failen.
  const finalText = ["# Titel", "## Ausgangslage", fullBody, "## Maßnahmen", fullBody].join("\n\n");
  const r = scoreWiz01FinalText(
    artefacts(finalText, ["Ausgangslage", "Ziele und Wirkung", "Maßnahmen", "Nachhaltigkeit"]),
    richtlinie
  );
  expect(r.pflichtAbschnitteCovered).toBe(2);
  expect(r.coveragePercent).toBe(50);
  expect(r.missingAbschnitte).toEqual(expect.arrayContaining(["Ziele und Wirkung", "Nachhaltigkeit"]));
});

it("flaggt vorhandene, aber zu kurze Abschnitte (< minZeichen)", () => {
  const finalText = ["# Titel", "## Ausgangslage", fullBody, "## Ziele und Wirkung", "Zu kurz.", "## Maßnahmen", fullBody, "## Nachhaltigkeit", fullBody].join("\n\n");
  const r = scoreWiz01FinalText(artefacts(finalText), richtlinie);
  expect(r.coveragePercent).toBe(100); // vorhanden
  expect(r.shortAbschnitte.map((s) => s.name)).toContain("Ziele und Wirkung");
});

it("tolerante Zuordnung: '## Ziele & Wirkung' zaehlt als 'Ziele und Wirkung'", () => {
  const finalText = ["# Titel", "## Ausgangslage", fullBody, "## Ziele & Wirkung", fullBody, "## Maßnahmen", fullBody, "## Nachhaltigkeit", fullBody].join("\n\n");
  const r = scoreWiz01FinalText(artefacts(finalText), richtlinie);
  expect(r.missingAbschnitte).toEqual([]);
});
