/**
 * Reihenfolge: Erst markieren, dann entschärfen.
 *
 * `wrapAnnahmen` sucht seine Zitate WÖRTLICH im Text. Wird vorher ein Adverb
 * gestrichen, läuft das Zitat ins Leere — und ausgerechnet eine ungedeckte
 * Wirkungsbehauptung verlöre ihre `[Annahme: …]`-Kennzeichnung. Dieselbe Bauart
 * von Fehler wie beim Herleitungs-Marker nach dem Verbots-Gate.
 */
import { extractAnnahmen, wrapAnnahmen } from "@/lib/wizard/annahme-marker";
import { entferneEvidenzAdverbien } from "@/lib/wizard/evidenz-rhetorik";

const text =
  "Die Kinder erfahren Selbstwirksamkeit. Eine Erfahrung, die nachweislich das Selbstvertrauen stärkt.";
const zitat = "Eine Erfahrung, die nachweislich das Selbstvertrauen stärkt";

it("markiert zuerst und entschärft danach — Text und Liste bleiben zeichengleich", () => {
  const w = wrapAnnahmen(text, [zitat]);
  expect(w.marked).toHaveLength(1);

  const ev = entferneEvidenzAdverbien(w.text);
  const liste = extractAnnahmen(w.text).map((z) => entferneEvidenzAdverbien(z).text);

  expect(ev.text).not.toContain("nachweislich");
  expect(ev.text).toContain("[Annahme:");
  // Der Eintrag der Bestätigungsliste steht so noch im Text — sonst findet die UI
  // die Stelle nicht mehr, die sie übernehmen oder streichen soll.
  expect(liste).toHaveLength(1);
  expect(ev.text).toContain(liste[0]);
});

it("Gegenprobe: in der falschen Reihenfolge geht die Markierung verloren", () => {
  const zuerstBereinigt = entferneEvidenzAdverbien(text).text;
  const w = wrapAnnahmen(zuerstBereinigt, [zitat]);
  expect(w.marked).toHaveLength(0);
  expect(w.text).not.toContain("[Annahme:");
});
