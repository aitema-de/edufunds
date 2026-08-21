/**
 * Reihenfolge: Erst markieren, dann entschärfen.
 *
 * `wrapAnnahmen` sucht seine Zitate WÖRTLICH im Text. Wird vorher ein Adverb
 * gestrichen, läuft das Zitat ins Leere — und ausgerechnet eine ungedeckte
 * Wirkungsbehauptung verlöre ihre `[Annahme: …]`-Kennzeichnung. Dieselbe Bauart
 * von Fehler wie beim Herleitungs-Marker nach dem Verbots-Gate.
 */
import { extractAnnahmen, resolveAnnahme, wrapAnnahmen } from "@/lib/wizard/annahme-marker";
import {
  entferneEvidenzFloskeln,
  istEvidenzBehauptung,
} from "@/lib/wizard/evidenz-rhetorik";

const text =
  "Die Kinder erfahren Selbstwirksamkeit. Eine Erfahrung, die nachweislich das Selbstvertrauen stärkt.";
const zitat = "Eine Erfahrung, die nachweislich das Selbstvertrauen stärkt";

it("markiert zuerst und entschärft danach — Text und Liste bleiben zeichengleich", () => {
  const w = wrapAnnahmen(text, [zitat]);
  expect(w.marked).toHaveLength(1);

  const ev = entferneEvidenzFloskeln(w.text);
  const liste = extractAnnahmen(w.text).map((z) => entferneEvidenzFloskeln(z).text);

  expect(ev.text).not.toContain("nachweislich");
  expect(ev.text).toContain("[Annahme:");
  // Der Eintrag der Bestätigungsliste steht so noch im Text — sonst findet die UI
  // die Stelle nicht mehr, die sie übernehmen oder streichen soll.
  expect(liste).toHaveLength(1);
  expect(ev.text).toContain(liste[0]);
});

it("Gegenprobe: in der falschen Reihenfolge geht die Markierung verloren", () => {
  const zuerstBereinigt = entferneEvidenzFloskeln(text).text;
  const w = wrapAnnahmen(zuerstBereinigt, [zitat]);
  expect(w.marked).toHaveLength(0);
  expect(w.text).not.toContain("[Annahme:");
});

/**
 * 🔴 Der Fehler, der am 21.08.2026 auffiel: Eine Forschungsbehauptung landete in
 * der interaktiven Bestätigungsliste („Übernehmen / Anpassen / Streichen").
 *
 * Der Nutzer kann einen Forschungsstand nicht aus eigenem Wissen bestätigen —
 * `evidenz-rhetorik.ts` sagt das seit dem ersten Commit ausdrücklich. Geprüft hat
 * es niemand: `pipeline.ts` wickelte `factVerification.remaining` per
 * `wrapAnnahmen` ein und baute die Liste aus ALLEN Markern im Text. Gemessen am
 * Lauf `2026-08-21T07-00-07`: 5 solcher Einträge in 3 von 75 Anträgen.
 *
 * Die Sätze hier sind die echten Fundstellen.
 */
describe("Forschungsbehauptungen kommen nicht in die Bestätigungsliste", () => {
  const echtesZitat =
    "weil Studien zeigen, dass Jugendliche besonders anfällig für Desinformation sind";

  it("wird gar nicht erst eingehüllt (Filter der Annahmen-Stufe)", () => {
    const zitate = ["die AG findet wöchentlich statt", echtesZitat];
    const gefiltert = zitate.filter((z) => !istEvidenzBehauptung(z));
    const w = wrapAnnahmen(`Wir planen eine AG. ${echtesZitat}.`, gefiltert);
    expect(w.marked).not.toContain(echtesZitat);
  });

  it("und wenn das Modell den Marker selbst setzt, heilt die Streichung ihn", () => {
    const t = `Medienkritik ist zentral, [Annahme: ${echtesZitat}].`;
    const ev = entferneEvidenzFloskeln(t);
    // Die Belegbehauptung ist weg, die Annahme darüber bleibt bestätigbar.
    expect(ev.text).toBe(
      "Medienkritik ist zentral, [Annahme: weil Jugendliche besonders anfällig für Desinformation sind]."
    );
    const liste = extractAnnahmen(ev.text);
    expect(liste).toHaveLength(1);
    expect(istEvidenzBehauptung(liste[0])).toBe(false);
    // Zeichengleichheit: der Listeneintrag steht so im Text.
    expect(ev.text).toContain(liste[0]);
  });

  it("Hauptsatzform überlebt die Streichung — und wird deshalb aussortiert", () => {
    const hauptsatz = "Studien zeigen, dass positive Erfahrungen die Motivation steigern";
    const t = `Wir setzen darauf. [Annahme: ${hauptsatz}].`;
    const ev = entferneEvidenzFloskeln(t);
    expect(ev.text).toContain(hauptsatz); // deterministisch nicht heilbar
    // Genau dafür löst die Pipeline den Marker auf, statt ihn zu listen.
    const rest = extractAnnahmen(ev.text).filter((z) => istEvidenzBehauptung(z));
    expect(rest).toHaveLength(1);
    const aufgeloest = resolveAnnahme(ev.text, rest[0], "uebernehmen");
    expect(aufgeloest).not.toContain("[Annahme:");
    expect(extractAnnahmen(aufgeloest)).toHaveLength(0);
  });
});
