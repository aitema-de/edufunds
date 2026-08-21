/**
 * Evidenz-Rhetorik ohne Quelle (Tester-Feedback #008).
 *
 * Die Sätze hier sind echt — aus dem Lauf `2026-08-20T14-40-26`, also aus
 * Anträgen, die das Prompt-Verbot aus Paket 5 bereits gesehen hatten und die
 * Formulierung trotzdem enthielten.
 */
import {
  baueEvidenzHinweis,
  entferneEvidenzAdverbien,
  findeEvidenzBehauptungen,
} from "@/lib/wizard/evidenz-rhetorik";

describe("Adverbien werden gestrichen", () => {
  it("nimmt das Adverb aus dem Nebensatz, ohne den Satz zu zerlegen", () => {
    const t = "Weil projektbasiertes Lernen nachweislich die Selbstwirksamkeit stärkt, ermöglichen die Einheiten mehr Eigenarbeit.";
    const r = entferneEvidenzAdverbien(t);
    expect(r.text).toBe("Weil projektbasiertes Lernen die Selbstwirksamkeit stärkt, ermöglichen die Einheiten mehr Eigenarbeit.");
    expect(r.entfernt).toHaveLength(1);
  });

  it("funktioniert auch nach dem Verb", () => {
    const t = "Methoden wie Improvisationstheater stärken nachweislich die soziale Kompetenz.";
    expect(entferneEvidenzAdverbien(t).text).toBe(
      "Methoden wie Improvisationstheater stärken die soziale Kompetenz."
    );
  });

  it("lässt keine doppelten Leerzeichen zurück", () => {
    const t = "Eine Erfahrung, die nachweislich das Selbstvertrauen stärkt.";
    const r = entferneEvidenzAdverbien(t);
    expect(r.text).toBe("Eine Erfahrung, die das Selbstvertrauen stärkt.");
    expect(r.text).not.toMatch(/ {2}/);
  });

  it("räumt mehrere Fundstellen im selben Text ab", () => {
    const t = "A stärkt nachweislich B. Bekanntlich hilft C. Und D erhöht erwiesenermaßen E.";
    const r = entferneEvidenzAdverbien(t);
    expect(r.entfernt).toHaveLength(3);
    expect(r.text).not.toMatch(/nachweislich|Bekanntlich|erwiesenermaßen/i);
    expect(r.text).toContain("A stärkt B.");
  });
});

describe("Was stehen bleiben muss", () => {
  it("mit genannter Quelle bleibt die Aussage unangetastet", () => {
    const t = "Laut der PISA-Studie 2022 stärkt projektbasiertes Lernen nachweislich die Selbstwirksamkeit.";
    const r = entferneEvidenzAdverbien(t);
    expect(r.text).toBe(t);
    expect(r.entfernt).toHaveLength(0);
  });

  it("eine Jahresangabe in Klammern gilt als Quelle", () => {
    const t = "Der Ansatz erhöht nachweislich die Motivation (Deci 2017).";
    expect(entferneEvidenzAdverbien(t).text).toBe(t);
  });

  it("Satzformen werden NICHT umgeschrieben, nur gemeldet", () => {
    const t = "Studien zeigen, dass außerschulische Lernorte die Motivation fördern.";
    const r = entferneEvidenzAdverbien(t);
    expect(r.text).toBe(t);
    expect(r.verbleibend).toHaveLength(1);
    expect(r.verbleibend[0].form).toBe("aussage");
  });

  it("harmloser Text bleibt zeichengleich", () => {
    const t = "Die Schule hat 312 Schülerinnen und Schüler und plant eine Leseecke.";
    expect(entferneEvidenzAdverbien(t).text).toBe(t);
  });

  it("leerer Text wirft nicht", () => {
    expect(entferneEvidenzAdverbien("").text).toBe("");
    expect(findeEvidenzBehauptungen("")).toEqual([]);
  });
});

describe("baueEvidenzHinweis", () => {
  it("meldet die verbliebenen Satzformen", () => {
    const r = entferneEvidenzAdverbien("Studien zeigen, dass X wirkt. Untersuchungen belegen Y.");
    const h = baueEvidenzHinweis(r.verbleibend)!;
    expect(h).toContain("2 Stellen");
    expect(h).toContain("Quelle");
  });

  it("schweigt, wenn nichts offen ist", () => {
    expect(baueEvidenzHinweis([])).toBeNull();
  });
});
