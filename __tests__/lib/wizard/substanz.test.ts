import {
  pruefeSubstanz,
  substanzQuote,
  substanzFindings,
} from "@/lib/wizard/substanz";

/**
 * Substanz-Detektor (Kolja, 22.07.2026): Ein Inhaltsabschnitt muss BEGRUENDEN,
 * nicht nur beschreiben. Kalibrier-Anker: Im Baseline-Korpus (64 Laeufe / 413
 * Abschnitte) enthielten 374 Abschnitte NULL kausale Konnektive — die
 * Baseline-Quote ist 0,7 %. Ein Detektor, der dort hohe Quoten saehe, waere
 * kaputt.
 */

const BEGRUENDET = `Die zwei Praxistage folgen dem Ansatz des Praxislernens:
Jugendliche mit Abschlussgefaehrdung erleben Selbstwirksamkeit zuerst im
betrieblichen Handeln, weil dort Erfolg unmittelbar sichtbar wird — daher
koppeln wir jede Praxisphase an ein Reflexionsgespraech. Auf dieser Grundlage
waechst die Lernmotivation auch im schulischen Teil.`;

const DESKRIPTIV = `Wir kaufen 20 Tablets und richten eine Robotik-AG ein. Die
AG findet dienstags statt. Teilnehmen koennen 15 Kinder der Klassen 3 und 4.
Die Geraete werden im Medienraum gelagert. Eine Lehrkraft betreut die AG.`;

describe("pruefeSubstanz", () => {
  it("begruendeter Text besteht, deskriptiver faellt durch", () => {
    expect(pruefeSubstanz("Paedagogisches Konzept", BEGRUENDET).hatSubstanz).toBe(true);
    expect(pruefeSubstanz("Unsere Robotik-AG", DESKRIPTIV).hatSubstanz).toBe(false);
  });

  it("Theorie-Etikett OHNE Begruendungslogik reicht nicht", () => {
    // Genau der Leerformel-Fall: Konzeptname als Schmuckwort, kein WARUM.
    const etikett = `Unser innovatives Projekt foerdert Teilhabe und
    Selbstwirksamkeit. Die AG findet woechentlich statt und nutzt moderne Tablets.`;
    const b = pruefeSubstanz("Konzept", etikett);
    expect(b.theorieMarker).toBeGreaterThanOrEqual(1);
    expect(b.hatSubstanz).toBe(false); // Konnektive fehlen
  });

  it("Formal-Abschnitte sind nicht relevant — dort waere das Gate Rauschen", () => {
    for (const name of [
      "Finanzplan / Kosten- und Finanzierungsuebersicht",
      "Arbeits- und Zeitplan",
      "Antragsteller und Institution",
      "Budget und Ressourcen",
    ]) {
      expect(pruefeSubstanz(name, DESKRIPTIV).relevant).toBe(false);
    }
  });

  it("kreative Ueberschriften gelten als inhaltlich (Ausschluss- statt Einschlussliste)", () => {
    // Die Pipeline erzeugt solche Titel; eine Schluesselwort-Einschlussliste
    // verlor im Kalibrierlauf 240/413 Abschnitte aus der Messung.
    expect(pruefeSubstanz("Unsere Schule: Ein MINT-Leuchtturm in Fellbach", DESKRIPTIV).relevant).toBe(true);
    expect(pruefeSubstanz("Gemeinsam aktiv: So gestalten wir den Digitalkurs", DESKRIPTIV).relevant).toBe(true);
  });
});

describe("substanzQuote", () => {
  it("misst den Anteil begruendeter Inhaltsabschnitte", () => {
    const q = substanzQuote([
      { name: "Konzept", text: BEGRUENDET },
      { name: "Aktivitaeten", text: DESKRIPTIV },
      { name: "Finanzplan", text: DESKRIPTIV }, // irrelevant, zaehlt nicht
    ]);
    expect(q).toBe(0.5);
  });

  it("ohne relevante Abschnitte: null, NICHT 100 %", () => {
    // Sonst gewinnt ein Antrag, der nur aus Finanzplan und Zeitplan besteht.
    expect(substanzQuote([{ name: "Finanzplan", text: "..." }])).toBeNull();
  });
});

describe("substanzFindings — Anschluss an die Revisions-Schleife", () => {
  it("erzeugt je fehlender Substanz ein Finding mit konkretem Reparatur-Vorschlag", () => {
    const f = substanzFindings([
      { name: "Konzept", text: BEGRUENDET },
      { name: "Aktivitaeten", text: DESKRIPTIV },
    ]);
    expect(f).toHaveLength(1);
    expect(f[0].abschnitt).toBe("Aktivitaeten");
    expect(f[0].kategorie).toBe("substanz");
    // "mittel", nicht "hoch": darf nicht dieselbe Eskalation ausloesen wie
    // eine Halluzination (hasOpenHighFindings haengt an "hoch").
    expect(f[0].schwere).toBe("mittel");
    // Der Vorschlag muss die Revision ANLEITEN, nicht nur meckern — und die
    // Halluzinations-Angst ausraeumen, sonst traut sich die Revision nicht.
    expect(f[0].vorschlag).toMatch(/Kausals(ae|ä)tze/);
    expect(f[0].vorschlag).toMatch(/KEINE Halluzination/);
  });

  it("benennt, WAS fehlt (Theorie vs. Konnektive), statt pauschal zu ruegen", () => {
    const nurEtikett = `Das Projekt staerkt Teilhabe und Inklusion. Es finden
    woechentliche Treffen statt. Wir kaufen Material.`;
    const f = substanzFindings([{ name: "Ziele", text: nurEtikett }]);
    expect(f[0].vorschlag).toContain("Begruendungslogik");
    expect(f[0].vorschlag).not.toContain("fachliche Einordnung UND");
  });

  it("laesst vollstaendige Antraege in Ruhe", () => {
    expect(substanzFindings([{ name: "Konzept", text: BEGRUENDET }])).toHaveLength(0);
  });
});
