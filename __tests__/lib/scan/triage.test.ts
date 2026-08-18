import { bewerteText } from "../../../lib/scan/triage";

const fuellText = (kern: string) => kern + " " + "Weitere Hinweise zur Seite. ".repeat(20);

describe("Triage — lohnt die teure Extraktion?", () => {
  it("laesst ein echtes Schulförderprogramm durch", () => {
    const u = bewerteText(
      fuellText(
        "Mit dem Programm fördern wir Projekte an Schulen mit bis zu 5.000 Euro Zuschuss. " +
          "Anträge können bis zum 30.09. eingereicht werden."
      ),
      "Förderung Leseprojekte"
    );
    expect(u.weiter).toBe(true);
    expect(u.signale.geld.length).toBeGreaterThan(0);
    expect(u.signale.zielgruppe.length).toBeGreaterThan(0);
  });

  it("verwirft eine Seite ohne Geld-Signal", () => {
    const u = bewerteText(
      fuellText("Unsere Schule stellt sich vor. Anträge auf Aufnahme sind jederzeit möglich."),
      "Über uns"
    );
    expect(u.weiter).toBe(false);
    expect(u.begruendung).toMatch(/Kein Geld-Signal/);
  });

  it("verwirft Förderung ohne jeden Bezug zu Bildung, Kindern oder Gemeinnützigkeit", () => {
    // Der reale Fall aus dem NBank-Delta-Test.
    const u = bewerteText(
      fuellText(
        "Zuwendungen bis zu 500.000 Euro für die Anschaffung brennstoffzellenbetriebener " +
          "kommunaler Spezialfahrzeuge. Anträge sind bis zum Stichtag einzureichen."
      ),
      "Anschaffung Brennstoffzellenbetriebener Kommunaler Spezialfahrzeuge"
    );
    expect(u.weiter).toBe(false);
    expect(u.begruendung).toMatch(/Kein Bezug zu Schule/);
  });

  it("verwirft ein ausgelaufenes Programm trotz aller anderen Signale", () => {
    const u = bewerteText(
      fuellText(
        "Das Programm förderte Schulprojekte mit bis zu 10.000 Euro. Die Antragstellung ist " +
          "beendet, das Programm ist ausgelaufen."
      ),
      "Schulprojekte 2019"
    );
    expect(u.weiter).toBe(false);
    expect(u.begruendung).toMatch(/laeuft nicht mehr/);
  });

  it("verwirft den Bericht ÜBER eine Förderung, nicht die Förderung selbst", () => {
    const u = bewerteText(
      fuellText(
        "Die Schule freut sich über 3.000 Euro aus dem Fördertopf. Bei der Übergabe waren " +
          "Kinder und Lehrkräfte anwesend."
      ),
      "Spendenübergabe an der Grundschule"
    );
    expect(u.weiter).toBe(false);
    expect(u.begruendung).toMatch(/Bericht/);
  });

  it("erkennt Zielgruppen, die das Wort Schule gar nicht enthalten", () => {
    // Wenn die Triage hier verwirft, gehen genau die Programme verloren, die EduFunds ausmachen.
    for (const kern of [
      "Förderung von MINT-Projekten mit bis zu 20.000 Euro, Antragsfrist 31.03.",
      "Zuschuss für den Ganztag: bis zu 8.000 Euro je Träger, Bewerbung bis Mai.",
      "Wir fördern Leseförderung mit Zuwendungen; antragsberechtigt sind gemeinnützige Vereine.",
    ]) {
      expect(bewerteText(fuellText(kern), "").weiter).toBe(true);
    }
  });

  it("reicht im Zweifel weiter, statt still zu verwerfen", () => {
    // Kurzer oder leerer Text ist ein Messproblem, kein Urteil.
    const u = bewerteText("Seite lädt.", "Irgendein Programm");
    expect(u.weiter).toBe(true);
    expect(u.begruendung).toMatch(/zu kurz/);
  });

  it("laesst sich nicht vom Navigationsmenü täuschen", () => {
    // Gemessener Fall NBank 18.08.2026: der Menüpunkt „Ausgelaufene Förderungen" steht im Text
    // JEDER Seite der Domain, auch auf laufenden Programmen. Ein blosses Stichwort
    // „ausgelaufen" in der Ausschlussliste hätte alle 144 Programme lautlos verworfen.
    const navigation =
      "NBank Förderprogramme Übersicht Aktuelle Förderprogramme Ausgelaufene Förderungen " +
      "Beratung und Dienstleistungen Corporate ";
    const u = bewerteText(
      navigation +
        fuellText(
          "Wir fördern berufliche Bildung mit einem Zuschuss von bis zu 20.000 Euro. " +
            "Anträge sind laufend möglich."
        ),
      "Überbetriebliche berufliche Bildung"
    );
    expect(u.weiter).toBe(true);
  });

  it("erkennt die echte Auslauf-Formulierung im Fliesstext", () => {
    const u = bewerteText(
      fuellText(
        "Ausbildungsverbünde: Wir förderten mit bis zu 30.000 Euro für Schulen und Betriebe. " +
          "Eine Antragstellung in diesem Förderprogramm ist nicht mehr möglich."
      ),
      "Ausbildungsverbünde"
    );
    expect(u.weiter).toBe(false);
    expect(u.begruendung).toMatch(/laeuft nicht mehr/);
  });

  it("begründet jede Ablehnung nachvollziehbar", () => {
    const u = bewerteText(fuellText("Impressum und Kontaktangaben unserer Geschäftsstelle."), "Impressum");
    expect(u.weiter).toBe(false);
    expect(u.begruendung.length).toBeGreaterThan(20);
  });

  it("wertet den Programmnamen mit, nicht nur den Seitentext", () => {
    const nurName = bewerteText(
      fuellText("Zuwendungen bis zu 5.000 Euro. Anträge bis zum Stichtag."),
      "Förderprogramm für Grundschulen"
    );
    expect(nurName.weiter).toBe(true);
  });
});
