import {
  nameAusLink,
  filtereProgrammLinks,
  bewerteSeite,
  type GeholteSeite,
} from "../../../lib/scan/browser-scan";

const seite = (u: Partial<GeholteSeite>): GeholteSeite => ({
  text: "x".repeat(2000),
  links: [],
  endUrl: "https://www.aktion-mensch.de/foerderung/foerderangebote",
  status: 200,
  ...u,
});

const QUELLE = "https://www.aktion-mensch.de/foerderung/foerderangebote";

describe("nameAusLink — Programmname aus Linktext oder Slug", () => {
  it("schneidet das Navigationswort ab statt den ganzen Linktext zu verwerfen", () => {
    expect(nameAusLink("Zur Anschubförderung Arbeit", "https://x.de/a/anschubfoerderung-arbeit")).toBe(
      "Anschubförderung Arbeit"
    );
    expect(nameAusLink("Zum Förderangebot Sport und Kultur", "https://x.de/a/sport-kultur")).toBe(
      "Förderangebot Sport und Kultur"
    );
  });

  it("behaelt die echten Umlaute des Linktextes — der Slug hat sie verloren", () => {
    expect(nameAusLink("Zur Pauschalförderung", "https://x.de/a/pauschalfoerderung")).toBe(
      "Pauschalförderung"
    );
  });

  it("faellt bei reinen Aufforderungen auf den Slug zurueck", () => {
    expect(nameAusLink("Mehr erfahren", "https://x.de/a/digitalpakt-schule")).toBe(
      "Digitalpakt Schule"
    );
    expect(nameAusLink("", "https://x.de/a/klima-projekt")).toBe("Klima Projekt");
  });

  it("stellt im Slug-Fallback eindeutige Umlaute wieder her", () => {
    expect(nameAusLink("", "https://x.de/a/foerderung-schuelerlabor")).toBe("Förderung Schülerlabor");
    expect(nameAusLink("", "https://x.de/a/buergerstiftung-gruendung")).toBe(
      "Bürgerstiftung Gründung"
    );
  });

  it("laesst Woerter in Ruhe, in denen ae/oe/ue kein Umlaut-Ersatz ist", () => {
    // Der Sweep-Gotcha: ein pauschales oe->oe wuerde "Quelle" und "neue" zerstoeren.
    expect(nameAusLink("", "https://x.de/a/neue-quelle-europa")).toBe("Neue Quelle Europa");
  });

  it("entfernt Dateiendungen aus dem Slug", () => {
    expect(nameAusLink("", "https://x.de/a/schulfonds.html")).toBe("Schulfonds");
  });
});

describe("filtereProgrammLinks — nur echte Detailseiten", () => {
  it("erntet Detaillinks und leitet Namen ab", () => {
    const treffer = filtereProgrammLinks(
      [
        { href: "https://x.de/foerderung/angebote/alpha", text: "Zum Förderangebot Alpha" },
        { href: "https://x.de/foerderung/angebote/beta", text: "Zur Förderung Beta" },
      ],
      "/foerderung/angebote/"
    );
    expect(treffer.map((t) => t.name)).toEqual(["Förderangebot Alpha", "Förderung Beta"]);
  });

  it("verwirft Sprungmarken auf die Uebersicht selbst", () => {
    // Aktion Mensch verlinkt die eigene Uebersicht fuenfmal per #152814 — ohne diesen
    // Filter stuenden fuenf Geisterprogramme im Katalog.
    const treffer = filtereProgrammLinks(
      [
        { href: "https://x.de/foerderung/angebote#152814", text: "Inklusiver Sozialraum" },
        { href: "https://x.de/foerderung/angebote/", text: "Übersicht" },
        { href: "https://x.de/foerderung/angebote/echt", text: "Zum Förderangebot Echt" },
      ],
      "/foerderung/angebote/"
    );
    expect(treffer).toHaveLength(1);
    expect(treffer[0].detailUrl).toBe("https://x.de/foerderung/angebote/echt");
  });

  it("entdoppelt URLs, die sich nur im Anker oder Schraegstrich unterscheiden", () => {
    const treffer = filtereProgrammLinks(
      [
        { href: "https://x.de/a/eins", text: "Zum Förderangebot Eins" },
        { href: "https://x.de/a/eins#top", text: "Zum Förderangebot Eins" },
        { href: "https://x.de/a/eins/", text: "Zum Förderangebot Eins" },
      ],
      "/a/"
    );
    expect(treffer).toHaveLength(1);
  });

  it("ignoriert mailto, javascript und andere Nicht-HTTP-Ziele", () => {
    const treffer = filtereProgrammLinks(
      [
        { href: "mailto:info@x.de", text: "Kontakt" },
        { href: "javascript:void(0)", text: "Menü" },
        { href: "https://x.de/a/gut", text: "Zum Förderangebot Gut" },
      ],
      "/a/"
    );
    expect(treffer).toHaveLength(1);
  });
});

describe("bewerteSeite — die Schranken, die 2026 gefehlt haben", () => {
  it("meldet Fehler statt leerer Liste, wenn die Seite fast nichts rendert", () => {
    // Der Bildungsserver-Fall: 58 Zeichen "Keine Datenbank gewaehlt!" — der Wochenlauf
    // meldete daraufhin "0 gefunden" und wurde gruen.
    const b = bewerteSeite(
      seite({ text: "Fehler: Keine Datenbank gewählt! Kein Suchbegriff gewählt!" }),
      { quellUrl: QUELLE, pfadFilter: "/foerderung/foerderangebote/" }
    );
    expect(b.candidates).toBeUndefined();
    expect(b.fehler).toMatch(/rendert nur 5[0-9] Zeichen/);
    expect(b.fehler).toMatch(/Keine Datenbank/);
  });

  it("erkennt die Umleitung auf eine fremde Sperrseite", () => {
    // Der Radware-Fall: 302 auf validate.perfdrive.com, Seite antwortet mit 200.
    const b = bewerteSeite(
      seite({ endUrl: "https://validate.perfdrive.com/?ssa=abc", text: "y".repeat(900) }),
      { quellUrl: "https://www.foerderdatenbank.de/suche" }
    );
    expect(b.fehler).toMatch(/Umleitung von www\.foerderdatenbank\.de nach validate\.perfdrive\.com/);
  });

  it("meldet Fehler, wenn die Seite laedt, aber kein Link mehr zum pfadFilter passt", () => {
    const b = bewerteSeite(
      seite({ links: [{ href: "https://www.aktion-mensch.de/lotterie", text: "Lotterie" }] }),
      { quellUrl: QUELLE, pfadFilter: "/foerderung/foerderangebote/" }
    );
    expect(b.fehler).toMatch(/kein einziger Link unter/);
    expect(b.fehler).toMatch(/pfadFilter/);
  });

  it("liefert Kandidaten, wenn die Seite tragfaehig ist", () => {
    const b = bewerteSeite(
      seite({
        links: [
          {
            href: "https://www.aktion-mensch.de/foerderung/foerderangebote/sport-kultur",
            text: "Zum Förderangebot Sport und Kultur",
          },
        ],
      }),
      { quellUrl: QUELLE, pfadFilter: "/foerderung/foerderangebote/" }
    );
    expect(b.fehler).toBeUndefined();
    expect(b.candidates).toEqual([
      {
        name: "Förderangebot Sport und Kultur",
        detailUrl: "https://www.aktion-mensch.de/foerderung/foerderangebote/sport-kultur",
      },
    ]);
  });

  it("reicht ohne pfadFilter den gerenderten Text an das LLM weiter", () => {
    const b = bewerteSeite(seite({ text: "Programmtext ".repeat(100) }), { quellUrl: QUELLE });
    expect(b.textFuerLlm).toMatch(/Programmtext/);
    expect(b.fehler).toBeUndefined();
  });

  it("akzeptiert eine quellenspezifisch abgesenkte Mindestlaenge", () => {
    const b = bewerteSeite(seite({ text: "kurz, aber vollstaendig" }), {
      quellUrl: QUELLE,
      mindestTextZeichen: 10,
    });
    expect(b.fehler).toBeUndefined();
  });
});
