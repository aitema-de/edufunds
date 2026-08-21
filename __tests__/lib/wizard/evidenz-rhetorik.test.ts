/**
 * Evidenz-Rhetorik ohne Quelle (Tester-Feedback #008).
 *
 * Die Sätze hier sind echt — aus dem Lauf `2026-08-20T14-40-26`, also aus
 * Anträgen, die das Prompt-Verbot aus Paket 5 bereits gesehen hatten und die
 * Formulierung trotzdem enthielten.
 */
import {
  entferneEvidenzFloskeln,
  findeEvidenzBehauptungen,
  findeEvidenzSatzformen,
  istEvidenzBehauptung,
} from "@/lib/wizard/evidenz-rhetorik";

describe("Adverbien werden gestrichen", () => {
  it("nimmt das Adverb aus dem Nebensatz, ohne den Satz zu zerlegen", () => {
    const t = "Weil projektbasiertes Lernen nachweislich die Selbstwirksamkeit stärkt, ermöglichen die Einheiten mehr Eigenarbeit.";
    const r = entferneEvidenzFloskeln(t);
    expect(r.text).toBe("Weil projektbasiertes Lernen die Selbstwirksamkeit stärkt, ermöglichen die Einheiten mehr Eigenarbeit.");
    expect(r.entfernt).toHaveLength(1);
  });

  it("funktioniert auch nach dem Verb", () => {
    const t = "Methoden wie Improvisationstheater stärken nachweislich die soziale Kompetenz.";
    expect(entferneEvidenzFloskeln(t).text).toBe(
      "Methoden wie Improvisationstheater stärken die soziale Kompetenz."
    );
  });

  it("lässt keine doppelten Leerzeichen zurück", () => {
    const t = "Eine Erfahrung, die nachweislich das Selbstvertrauen stärkt.";
    const r = entferneEvidenzFloskeln(t);
    expect(r.text).toBe("Eine Erfahrung, die das Selbstvertrauen stärkt.");
    expect(r.text).not.toMatch(/ {2}/);
  });

  it("räumt mehrere Fundstellen im selben Text ab", () => {
    const t = "A stärkt nachweislich B. Bekanntlich hilft C. Und D erhöht erwiesenermaßen E.";
    const r = entferneEvidenzFloskeln(t);
    expect(r.entfernt).toHaveLength(3);
    expect(r.text).not.toMatch(/nachweislich|Bekanntlich|erwiesenermaßen/i);
    expect(r.text).toContain("A stärkt B.");
  });
});

describe("Was stehen bleiben muss", () => {
  it("mit genannter Quelle bleibt die Aussage unangetastet", () => {
    const t = "Laut der PISA-Studie 2022 stärkt projektbasiertes Lernen nachweislich die Selbstwirksamkeit.";
    const r = entferneEvidenzFloskeln(t);
    expect(r.text).toBe(t);
    expect(r.entfernt).toHaveLength(0);
  });

  it("eine Jahresangabe in Klammern gilt als Quelle", () => {
    const t = "Der Ansatz erhöht nachweislich die Motivation (Deci 2017).";
    expect(entferneEvidenzFloskeln(t).text).toBe(t);
  });

  it("Satzformen werden NICHT umgeschrieben, nur gemeldet", () => {
    const t = "Studien zeigen, dass außerschulische Lernorte die Motivation fördern.";
    const r = entferneEvidenzFloskeln(t);
    expect(r.text).toBe(t);
    expect(r.verbleibend).toHaveLength(1);
    expect(r.verbleibend[0].form).toBe("aussage");
  });

  it("harmloser Text bleibt zeichengleich", () => {
    const t = "Die Schule hat 312 Schülerinnen und Schüler und plant eine Leseecke.";
    expect(entferneEvidenzFloskeln(t).text).toBe(t);
  });

  it("leerer Text wirft nicht", () => {
    expect(entferneEvidenzFloskeln("").text).toBe("");
    expect(findeEvidenzBehauptungen("")).toEqual([]);
  });
});

/**
 * Nebensatz-Einleitungen (Nachtrag 21.08.2026).
 *
 * Alle Sätze hier sind echt — aus dem Lauf `2026-08-21T07-00-07`, also aus
 * Anträgen, die das Prompt-Verbot aus Paket 5 UND den Adverb-Detektor bereits
 * durchlaufen hatten.
 */
describe("Nebensatz-Einleitungen werden gestrichen", () => {
  it("streicht «weil Studien zeigen, dass» und behält die Konjunktion", () => {
    const t =
      "Das Angebot grenzt sich von der Pflichtstruktur ab, weil Studien zeigen, dass freiwillige Angebote die Teilhabe erhöhen.";
    const r = entferneEvidenzFloskeln(t);
    expect(r.text).toBe(
      "Das Angebot grenzt sich von der Pflichtstruktur ab, weil freiwillige Angebote die Teilhabe erhöhen."
    );
    expect(r.entfernt).toHaveLength(1);
    expect(r.entfernt[0].form).toBe("einleitung");
  });

  it("die Verbletztstellung bleibt korrekt — das ist der ganze Trick", () => {
    const t =
      "An der Grundschule besteht kein Angebot, weil empirische Studien zeigen, dass isolierte Einsätze digitaler Medien zu ungleichmäßigen Kompetenzen führen.";
    const r = entferneEvidenzFloskeln(t);
    // "führen" steht weiterhin am Satzende — kein Umbau nötig.
    expect(r.text).toBe(
      "An der Grundschule besteht kein Angebot, weil isolierte Einsätze digitaler Medien zu ungleichmäßigen Kompetenzen führen."
    );
  });

  it("erfasst auch «da» und «Forschungsergebnisse belegen»", () => {
    const t = "Wir setzen darauf, da aktuelle Forschungsergebnisse belegen, dass Rahmung nötig ist.";
    expect(entferneEvidenzFloskeln(t).text).toBe("Wir setzen darauf, da Rahmung nötig ist.");
  });

  it("mit genannter Quelle bleibt die Einleitung stehen", () => {
    const t = "Wir setzen darauf, weil Studien zeigen, dass es wirkt (Hattie 2009).";
    expect(entferneEvidenzFloskeln(t).text).toBe(t);
  });
});

describe("Hauptsatzform geht an den Repair, nicht an die Streichung", () => {
  it("bleibt im Text stehen und wird als Satzform gemeldet", () => {
    const t = "Studien zeigen, dass außerschulische Lernorte die Motivation fördern.";
    const r = entferneEvidenzFloskeln(t);
    expect(r.text).toBe(t);
    expect(r.verbleibend).toHaveLength(1);
    expect(findeEvidenzSatzformen(t)).toHaveLength(1);
  });

  it("🚫 Aussagen über das EIGENE Vorhaben sind keine Belegbehauptung", () => {
    // Echter Satz, pv-edge-006-run2. Ohne den «, dass»-Filter würde der Repair
    // ihn anfassen und verschlechtern — 3 von 15 Treffern sind so gebaut.
    const t = "Peer-Reviews sichern die Kohärenz, sodass die Ergebnisse wissenschaftlich fundiert sind.";
    expect(findeEvidenzSatzformen(t)).toHaveLength(0);
    expect(entferneEvidenzFloskeln(t).text).toBe(t);
  });

  it("eine bereits gestrichene Einleitung geht NICHT zusätzlich an den Repair", () => {
    const t = "Wir tun das, weil Studien zeigen, dass es hilft.";
    expect(findeEvidenzSatzformen(entferneEvidenzFloskeln(t).text)).toHaveLength(0);
  });
});

describe("istEvidenzBehauptung — der Filter für die Bestätigungsliste", () => {
  it("erkennt die Forschungsbehauptung, die dem Nutzer vorgelegt wurde", () => {
    // Echter Eintrag aus factVerification.vorschlaege, pv-res-002-run1.
    expect(
      istEvidenzBehauptung("weil Studien zeigen, dass Jugendliche besonders anfällig für Desinformation sind")
    ).toBe(true);
  });

  it("lässt eine gewöhnliche Annahme durch", () => {
    expect(istEvidenzBehauptung("die AG findet einmal wöchentlich am Nachmittag statt")).toBe(false);
  });

  it("eine Annahme mit genannter Quelle darf bestätigt werden", () => {
    expect(istEvidenzBehauptung("laut Schulstatistik 2024 sind 40 % der Kinder betroffen")).toBe(false);
  });
});

/**
 * Komposita — die Lücke, die erst der Lauf `2026-08-21T12-16-38` zeigte.
 *
 * Das Modell weicht auf zusammengesetzte Formen aus. `\bForschung\b` fängt davon
 * nichts, weil vor dem Kompositum keine Wortgrenze steht. Gefunden hat das ein
 * roher grep gegen die Snapshots, nicht der Detektor selbst — der zählt nur, was
 * er kennt.
 */
describe("Komposita auf -forschung / -studien", () => {
  it.each([
    "die Partizipationsforschung zeigt",
    "die Netzwerkforschung zeigt",
    "die Implementationsforschung zeigt",
    "die Schulqualitätsforschung belegt",
  ])("erkennt «%s» als Belegbehauptung", (fund) => {
    expect(istEvidenzBehauptung(`weil ${fund}, dass es wirkt`)).toBe(true);
  });

  it("streicht das Kompositum in der Nebensatzform", () => {
    // Echter Satz, pv-edge-003-run3.
    const t =
      "Die Maßnahmen werden im regulären Schulbetrieb umgesetzt, weil die Implementationsforschung zeigt, dass Innovationen nur in bestehenden Strukturen wirken.";
    expect(entferneEvidenzFloskeln(t).text).toBe(
      "Die Maßnahmen werden im regulären Schulbetrieb umgesetzt, weil Innovationen nur in bestehenden Strukturen wirken."
    );
  });

  it("die Hauptsatzform des Kompositums geht an den Repair", () => {
    const t = "Die Partizipationsforschung belegt, dass Mitbestimmung die Motivation erhöht.";
    expect(findeEvidenzSatzformen(t)).toHaveLength(1);
  });

  it("🚫 „Forschung“ als normales Wort ist kein Treffer", () => {
    const t = "Die Schule kooperiert mit der Forschung an der Universität Hannover.";
    expect(entferneEvidenzFloskeln(t).text).toBe(t);
    expect(istEvidenzBehauptung(t)).toBe(false);
  });
});

/**
 * Eigener Beleg gegen fremde Forschung — die Grenze, die zählt.
 *
 * Beide Sätze standen in pv-004-run3 wenige Zeilen auseinander. Der eine ist das
 * gemeldete Problem, der andere die stärkste Substanz des Antrags.
 */
describe("Eigenbeleg bleibt unangetastet", () => {
  it("🚫 «Unsere externen Evaluationen zeigen, dass …» ist ein eigener Beleg", () => {
    const t = "Unsere externen Evaluationen zeigen, dass die Portfolio-Praxis zu messbaren Fortschritten führte.";
    expect(entferneEvidenzFloskeln(t).text).toBe(t);
    expect(findeEvidenzSatzformen(t)).toHaveLength(0);
    expect(istEvidenzBehauptung(t)).toBe(false);
  });

  it("aber «weil formative Evaluationen zeigen, dass …» ist eine Fremdbehauptung", () => {
    const t = "Eine Vorher-Nachher-Erhebung wird durchgeführt, weil formative Evaluationen zeigen, dass nur systematische Daten die Entwicklung sichtbar machen.";
    expect(entferneEvidenzFloskeln(t).text).toBe(
      "Eine Vorher-Nachher-Erhebung wird durchgeführt, weil nur systematische Daten die Entwicklung sichtbar machen."
    );
  });

  it("«empirische Befunde zeigen, dass …» wird erfasst", () => {
    const t = "Das Projekt ist darauf ausgerichtet, weil empirische Befunde zeigen, dass partizipative Formate die Handlungskompetenz stärken.";
    expect(entferneEvidenzFloskeln(t).text).toBe(
      "Das Projekt ist darauf ausgerichtet, weil partizipative Formate die Handlungskompetenz stärken."
    );
  });

  it("🚫 «Die bisherige Praxis zeigt, dass …» bleibt — eigene Erfahrung", () => {
    const t = "Die bisherige Praxis zeigt, dass die Zielgruppe klassisch kaum erreicht wird.";
    expect(entferneEvidenzFloskeln(t).text).toBe(t);
  });
});

it("🔑 «An unserer Schule …, weil die Partizipationsforschung zeigt» — das Possessiv gehört zur Schule, nicht zum Beleg", () => {
  // Echter Satz, pv-004-run3. Ein Eigenbeleg-Ausschluss, der den ganzen Satz prüft,
  // lässt diese Fremdbehauptung durch.
  const t =
    "An unserer Schule ist Verantwortungsübernahme gelebte Praxis, weil die Partizipationsforschung zeigt, dass Einbindung die Identifikation erhöht.";
  expect(entferneEvidenzFloskeln(t).text).toBe(
    "An unserer Schule ist Verantwortungsübernahme gelebte Praxis, weil Einbindung die Identifikation erhöht."
  );
});
