/**
 * Offene Punkte im Export (Entscheidung 1C, 31.07.2026).
 *
 * Der Kern der Entscheidung ist eine Abgrenzung: Die Marker duerfen aus dem
 * Antragskoerper verschwinden, aber NICHT aus dem Dokument. Wer sie still
 * loeschte, wuerde die Note heben und den Kunden schlechter stellen — die
 * Marker sind die einzige Bremse davor, einen Antrag mit Luecken einzureichen.
 * Genau diese Abgrenzung nageln die Tests hier fest.
 */
import {
  baueExportText,
  baueOffenePunkteBlock,
  bereinigeAntragstext,
  sammleOffenePunkte,
} from "@/lib/wizard/offene-punkte";

const TEXT = `# Medienkonzept

## Bestandsaufnahme

Die Schule verfuegt ueber 10 Whiteboards. [TODO: genaue Stueckzahl und Alter der Tablets vor Einreichung erfassen]
[Annahme: Die WLAN-Abdeckung reicht in allen Unterrichtsraeumen aus.] Damit ist die Grundlage gelegt.

## Finanzen

Die Kosten verteilen sich auf drei Posten. [TODO: Honorarsaetze beim Traeger erfragen]`;

describe("sammleOffenePunkte", () => {
  it("findet TODOs und Annahmen getrennt", () => {
    const p = sammleOffenePunkte(TEXT);
    expect(p.todos).toHaveLength(2);
    expect(p.todos[0]).toMatch(/Stueckzahl und Alter der Tablets/);
    expect(p.annahmen).toHaveLength(1);
    expect(p.annahmen[0]).toMatch(/WLAN-Abdeckung/);
  });

  it("dedupliziert wiederholte Marker", () => {
    const p = sammleOffenePunkte("[TODO: X] bla [TODO: X] blubb [TODO: Y]");
    expect(p.todos).toEqual(["X", "Y"]);
  });

  it("liefert leere Listen bei markerfreiem Text", () => {
    const p = sammleOffenePunkte("Ein ganz normaler Absatz ohne Marker.");
    expect(p).toEqual({ todos: [], annahmen: [] });
  });
});

describe("bereinigeAntragstext", () => {
  const sauber = bereinigeAntragstext(TEXT);

  it("entfernt die TODO-Klammern vollstaendig", () => {
    expect(sauber).not.toMatch(/\[TODO:/);
  });

  it("behaelt den Inhalt der Annahme, entfernt nur die Klammer", () => {
    expect(sauber).not.toMatch(/\[Annahme:/);
    expect(sauber).toMatch(/Die WLAN-Abdeckung reicht in allen Unterrichtsraeumen aus\./);
  });

  it("laesst den uebrigen Text unangetastet", () => {
    expect(sauber).toMatch(/Die Schule verfuegt ueber 10 Whiteboards\./);
    expect(sauber).toMatch(/# Medienkonzept/);
    expect(sauber).toMatch(/## Finanzen/);
  });

  it("laesst keine doppelten Leerzeichen oder Leerzeichen vor Satzzeichen zurueck", () => {
    expect(sauber).not.toMatch(/ {2,}/);
    expect(sauber).not.toMatch(/\s+[.,;:]/);
  });

  it("erfindet nichts — der bereinigte Text ist nie laenger als das Original", () => {
    expect(sauber.length).toBeLessThanOrEqual(TEXT.length);
  });
});

describe("baueOffenePunkteBlock", () => {
  it("ist leer, wenn nichts offen ist (kein Vorspann ohne Anlass)", () => {
    expect(baueOffenePunkteBlock({ todos: [], annahmen: [] })).toBe("");
  });

  it("sagt unmissverstaendlich, dass die Seite nicht eingereicht wird", () => {
    const block = baueOffenePunkteBlock({ todos: ["A"], annahmen: [] });
    expect(block).toMatch(/NICHT in die Einreichung/);
  });

  it("fuehrt TODOs und Annahmen getrennt und mit Anzahl", () => {
    const block = baueOffenePunkteBlock({ todos: ["A", "B"], annahmen: ["C"] }, "Medienkonzept");
    expect(block).toMatch(/Diese Angaben fehlen noch \(2\)/);
    expect(block).toMatch(/Diese Annahmen bitte pruefen \(1\)|Diese Annahmen bitte prüfen \(1\)/);
    expect(block).toMatch(/- \[ \] A/);
    expect(block).toMatch(/- \[ \] C/);
  });

  it("nutzt das programmspezifische Dokumentlabel", () => {
    const block = baueOffenePunkteBlock({ todos: ["A"], annahmen: ["B"] }, "Medienkonzept");
    expect(block).toMatch(/Medienkonzept/);
  });
});

describe("baueExportText — das Zusammenspiel", () => {
  const exportText = baueExportText(TEXT, { dokumentLabel: "Medienkonzept", footer: "\n\nFUSSNOTE" });

  it("stellt die Arbeitsliste VOR den Antrag", () => {
    expect(exportText.indexOf("Offene Punkte")).toBeLessThan(exportText.indexOf("# Medienkonzept"));
  });

  it("KEIN offener Punkt geht verloren — jeder taucht im Export auf", () => {
    // Der entscheidende Test: Die Marker verschwinden aus dem Koerper, aber der
    // Inhalt bleibt im Dokument. Sonst reicht jemand unbemerkt Luecken ein.
    for (const punkt of sammleOffenePunkte(TEXT).todos) {
      expect(exportText).toContain(punkt);
    }
    for (const punkt of sammleOffenePunkte(TEXT).annahmen) {
      expect(exportText).toContain(punkt);
    }
  });

  it("der Antragskoerper selbst traegt keine Marker mehr", () => {
    const koerper = exportText.slice(exportText.indexOf("# Medienkonzept"));
    expect(koerper).not.toMatch(/\[TODO:/);
    expect(koerper).not.toMatch(/\[Annahme:/);
  });

  it("haengt die Fusszeile ans Ende", () => {
    expect(exportText.endsWith("FUSSNOTE")).toBe(true);
  });

  it("ohne Marker bleibt der Export praktisch der Originaltext plus Fusszeile", () => {
    const ohne = baueExportText("Ein sauberer Antrag.", { footer: "\nF" });
    expect(ohne).toBe("Ein sauberer Antrag.\nF");
  });
});
