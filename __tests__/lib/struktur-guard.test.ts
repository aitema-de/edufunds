/**
 * Struktur-Guard (Pilot-Befund "Textumfang", 15.07.2026): Der ausgelieferte finalText
 * darf nicht auf wenige Abschnitte kollabieren, wenn die Revision Pflichtabschnitte
 * verschmilzt/streicht. ensureSectionsPresent setzt fehlende Abschnitte deterministisch
 * aus sections[] wieder ein — ohne vorhandene (revidierte) Abschnitte zu verschlechtern.
 */
import { ensureSectionsPresent } from "@/lib/wizard/struktur-guard";
import type { StrukturOutline } from "@/lib/wizard/struktur-guard";

const outline: StrukturOutline = {
  titel: "MINT-Lernwerkstatt",
  abschnitte: [
    { name: "Ausgangslage", fokus: "Problem" },
    { name: "Ziele und Wirkung", fokus: "Wirkung" },
    { name: "Maßnahmen", fokus: "Schritte" },
    { name: "Nachhaltigkeit", fokus: "Verstetigung" },
  ],
};

const sections = [
  { name: "Ausgangslage", text: "Ausgangslage-Inhalt aus der Section-Stufe." },
  { name: "Ziele und Wirkung", text: "Ziele-Inhalt aus der Section-Stufe." },
  { name: "Maßnahmen", text: "Maßnahmen-Inhalt aus der Section-Stufe." },
  { name: "Nachhaltigkeit", text: "Nachhaltigkeits-Inhalt aus der Section-Stufe." },
];

it("no-op, wenn alle Abschnitte im finalText vorhanden sind", () => {
  const finalText = [
    "# MINT-Lernwerkstatt",
    "## Ausgangslage",
    "Revidierter Ausgangslage-Text.",
    "## Ziele und Wirkung",
    "Revidierter Ziele-Text.",
    "## Maßnahmen",
    "Revidierter Maßnahmen-Text.",
    "## Nachhaltigkeit",
    "Revidierter Nachhaltigkeits-Text.",
  ].join("\n\n");
  const res = ensureSectionsPresent(finalText, outline, sections);
  expect(res.reinjected).toEqual([]);
  expect(res.text).toBe(finalText);
});

it("setzt einen gestrichenen Abschnitt aus sections[] wieder ein (an vorgesehener Position)", () => {
  // Revision hat "Nachhaltigkeit" verloren.
  const finalText = [
    "# MINT-Lernwerkstatt",
    "## Ausgangslage",
    "Revidierter Ausgangslage-Text.",
    "## Ziele und Wirkung",
    "Revidierter Ziele-Text.",
    "## Maßnahmen",
    "Revidierter Maßnahmen-Text.",
  ].join("\n\n");
  const res = ensureSectionsPresent(finalText, outline, sections);
  expect(res.reinjected).toEqual(["Nachhaltigkeit"]);
  expect(res.text).toContain("## Nachhaltigkeit");
  expect(res.text).toContain("Nachhaltigkeits-Inhalt aus der Section-Stufe.");
  // Vorhandene, revidierte Abschnitte bleiben unangetastet.
  expect(res.text).toContain("Revidierter Ausgangslage-Text.");
  // Reihenfolge: Nachhaltigkeit kommt nach Maßnahmen.
  expect(res.text.indexOf("## Maßnahmen")).toBeLessThan(res.text.indexOf("## Nachhaltigkeit"));
});

it("rebaut bei komplettem Kollaps (nur 1 Abschnitt sichtbar) alle fehlenden ein", () => {
  const finalText = ["# MINT-Lernwerkstatt", "## Ausgangslage", "Nur die Ausgangslage überlebte."].join(
    "\n\n"
  );
  const res = ensureSectionsPresent(finalText, outline, sections);
  expect(res.reinjected).toEqual(["Ziele und Wirkung", "Maßnahmen", "Nachhaltigkeit"]);
  for (const a of outline.abschnitte) expect(res.text).toContain(`## ${a.name}`);
});

it("erkennt verschmolzene Überschriften tolerant (Ziele & Wirkung ~ Ziele und Wirkung)", () => {
  const finalText = [
    "# MINT-Lernwerkstatt",
    "## Ausgangslage",
    "A.",
    "## Ziele & Wirkung", // & statt und — darf NICHT als fehlend gelten
    "Z.",
    "## Maßnahmen",
    "M.",
    "## Nachhaltigkeit",
    "N.",
  ].join("\n\n");
  const res = ensureSectionsPresent(finalText, outline, sections);
  expect(res.reinjected).toEqual([]);
});

it("no-op bei weniger als 2 vorgesehenen Abschnitten", () => {
  const single: StrukturOutline = { titel: "T", abschnitte: [{ name: "Nur einer", fokus: "x" }] };
  const res = ensureSectionsPresent("# T\n\nText ohne Überschrift.", single, [
    { name: "Nur einer", text: "x" },
  ]);
  expect(res.reinjected).toEqual([]);
});
