/**
 * Tiefen-Analyse (lib/wizard/facts-tiefe.ts) — die fuenf Luecken aus der
 * Gutachter-Messung vom 30.07.2026.
 *
 * Das Modul speist zwei Stellen gleichzeitig: den Interviewer-Prompt und die
 * Ausbeute-Metrik des simulierten Nutzers. Ein Fehler hier verschiebt also nicht nur
 * eine Frage, sondern auch die Zahl, an der man die Verbesserung ablesen will.
 * Deshalb sind die Grenzfaelle hier ausdruecklich mitgeprueft.
 */
import { analysiereTiefe, tiefeQuote, zahlAngaben, zahlKern } from "@/lib/wizard/facts-tiefe";
import type { TiefeId } from "@/lib/wizard/facts-tiefe";
import type { WizardFacts } from "@/lib/wizard/types";

function status(facts: WizardFacts, id: TiefeId) {
  return analysiereTiefe(facts).find((b) => b.id === id)!.status;
}

describe("zahlAngaben", () => {
  it("ignoriert Jahreszahlen — sonst gilt jeder Satz mit Jahresangabe als belegt", () => {
    expect(zahlAngaben("Startchancen-Schule seit 2024")).toHaveLength(0);
    expect(zahlAngaben("seit 2024 sind 68 % betroffen")).toEqual(["68 %"]);
  });

  it("erkennt Prozent- und Euro-Angaben", () => {
    expect(zahlAngaben("12 % der Kinder, 4.500 EUR Material")).toHaveLength(2);
  });
});

describe("zahlKern", () => {
  /**
   * Der Vergleich von Zahlangaben laeuft ueber diesen Kern. Ohne ihn vergleicht man
   * Schreibweisen statt Zahlen — "45.000 EUR" in der Nutzerantwort gegen `45000` in der
   * Faktentabelle sah wie eine Erfindung aus, obwohl es dieselbe Zahl ist (drei
   * Fehlalarme in der Treue-Pruefung, 31.07.2026).
   */
  it("loest den deutschen Tausenderpunkt auf", () => {
    expect(zahlKern("45.000 EUR")).toBe(45000);
    expect(zahlKern("1.234.567")).toBe(1234567);
  });

  it("erkennt dieselbe Zahl in beiden Schreibweisen als gleich", () => {
    expect(zahlKern("8.000 Euro")).toBe(zahlKern("8000"));
  });

  it("behandelt deutsches Komma als Dezimaltrenner", () => {
    expect(zahlKern("1,5")).toBe(1.5);
  });

  it("laesst den JSON-Dezimalpunkt unangetastet", () => {
    // JSON.stringify(1.5) liefert "1.5" — das darf NICHT zu 15 werden.
    expect(zahlKern("1.5")).toBe(1.5);
  });

  it("streift Einheiten und Zeichen ab", () => {
    expect(zahlKern("12 %")).toBe(12);
    expect(zahlKern("300 Eur")).toBe(300);
  });

  it("gibt null zurueck, wenn keine Ziffer da ist", () => {
    expect(zahlKern("keine Angabe")).toBeNull();
  });
});

describe("Ist-Zahlen zum Bedarf", () => {
  it("ist offen, wenn die Bedarfsfelder keine Zahl tragen", () => {
    const f: WizardFacts = {
      schule: { besonderheiten: "viele Kinder mit Foerderbedarf" },
      projekt: { kurzbeschreibung: "Wir wollen die Leseförderung ausbauen" },
    };
    expect(status(f, "bedarf-ist-zahlen")).toBe("offen");
  });

  it("wird erfuellt, sobald zwei Bedarfsfelder Zahlen tragen", () => {
    const f: WizardFacts = {
      schule: { besonderheiten: "68 % SGB-II-Anteil" },
      projekt: { kurzbeschreibung: "40 % der Kinder ohne ausreichende Deutschkenntnisse" },
    };
    expect(status(f, "bedarf-ist-zahlen")).toBe("erfuellt");
  });

  it("zaehlt die Schuelerzahl NICHT als Bedarfsbeleg — sie ist die Groesse der Schule", () => {
    const f: WizardFacts = {
      schule: { schuelerzahl: 420, besonderheiten: "schwieriges Umfeld" },
    };
    expect(status(f, "bedarf-ist-zahlen")).toBe("offen");
  });
});

describe("Kosten und Mengen je Posten", () => {
  it("ist offen, wenn Posten benannt aber unbeziffert sind", () => {
    const f: WizardFacts = { budget: { hauptposten: ["Tablets", "Fortbildung"] } };
    expect(status(f, "kosten-je-posten")).toBe("offen");
  });

  it("ist nur teilweise erfuellt, wenn nur die Gesamtsumme feststeht", () => {
    const f: WizardFacts = {
      budget: { beantragt_eur: 25000, hauptposten: ["Tablets", "Fortbildung"] },
    };
    expect(status(f, "kosten-je-posten")).toBe("teilweise");
  });

  it("ist erfuellt, wenn die Mehrheit der Posten beziffert ist", () => {
    const f: WizardFacts = {
      budget: { hauptposten: ["30 Tablets, ca. 12.000 EUR", "Fortbildung 2.000 EUR"] },
    };
    expect(status(f, "kosten-je-posten")).toBe("erfuellt");
  });

  it("gilt als geklaert, wenn der Nutzer die Kostenfrage selbst als offen benannt hat", () => {
    const f: WizardFacts = {
      programmpassung: { offene_luecken: ["Konkrete Budgethoehe noch offen"] },
    };
    expect(status(f, "kosten-je-posten")).toBe("geklaert");
  });
});

describe("Wer und Wann im Arbeitsplan", () => {
  it("ist offen ohne Zustaendigkeit und ohne Zeitbezug", () => {
    const f: WizardFacts = { projekt: { aktivitaeten: ["Materialbeschaffung", "Workshops"] } };
    expect(status(f, "arbeitsplan-wer-wann")).toBe("offen");
  });

  it("ist teilweise erfuellt, wenn nur der Zeitraum feststeht", () => {
    const f: WizardFacts = {
      projekt: { aktivitaeten: ["Materialbeschaffung"], zeitraum: "Schuljahr 2026/27" },
    };
    expect(status(f, "arbeitsplan-wer-wann")).toBe("teilweise");
  });

  it("ist erfuellt mit Zustaendigkeit UND Zeitbezug", () => {
    const f: WizardFacts = {
      projekt: {
        aktivitaeten: ["Kleingruppen durch zwei Lehrkraefte ab dem zweiten Halbjahr"],
        zeitraum: "Schuljahr 2026/27",
      },
    };
    expect(status(f, "arbeitsplan-wer-wann")).toBe("erfuellt");
  });
});

describe("Ausgangswert und Zielwert je Indikator", () => {
  it("ist nur teilweise erfuellt, wenn der Indikator eine einzelne Zahl nennt", () => {
    const f: WizardFacts = { wirkung: { messbare_indikatoren: ["50 Teilnehmende pro Jahr"] } };
    expect(status(f, "indikator-baseline-ziel")).toBe("teilweise");
  });

  it("ist erfuellt bei Ausgangs- UND Zielwert", () => {
    const f: WizardFacts = {
      wirkung: { messbare_indikatoren: ["Elternabend-Teilnahmequote 30% -> 50%"] },
    };
    expect(status(f, "indikator-baseline-ziel")).toBe("erfuellt");
  });

  it("erkennt auch die Sprachform 'von X auf Y'", () => {
    const f: WizardFacts = {
      wirkung: { erwartete_ergebnisse: ["Fehlzeiten von 12 % auf unter 8 % senken"] },
    };
    expect(status(f, "indikator-baseline-ziel")).toBe("erfuellt");
  });

  it("ist offen ohne jede Zahl", () => {
    const f: WizardFacts = { wirkung: { messbare_indikatoren: ["Lesekompetenz steigt"] } };
    expect(status(f, "indikator-baseline-ziel")).toBe("offen");
  });
});

describe("Beschluesse und Zusagen des Traegers", () => {
  it("ist offen ohne jeden Traegerbezug", () => {
    const f: WizardFacts = { wirkung: { nachhaltigkeit: "Wir fuehren das Angebot fort." } };
    expect(status(f, "traeger-zusage")).toBe("offen");
  });

  it("ist erfuellt bei benannter Vereinbarung in der Nachhaltigkeit", () => {
    const f: WizardFacts = {
      wirkung: { nachhaltigkeit: "Formale Vereinbarung mit dem Bezirksamt liegt vor." },
    };
    expect(status(f, "traeger-zusage")).toBe("erfuellt");
  });

  it("gilt als geklaert, wenn der Nutzer den Beschluss ausdruecklich verneint hat", () => {
    const f: WizardFacts = {
      programmpassung: { offene_luecken: ["Kein Beschluss des Traegers vorhanden"] },
    };
    expect(status(f, "traeger-zusage")).toBe("geklaert");
  });
});

describe("tiefeQuote", () => {
  it("ist 0 bei komplett leeren Fakten", () => {
    expect(tiefeQuote(analysiereTiefe({}))).toBe(0);
  });

  it("laesst geklaerte Punkte aus dem Nenner fallen — eine ehrliche Fehlanzeige darf nicht druecken", () => {
    const ohne = tiefeQuote([
      { id: "bedarf-ist-zahlen", label: "", status: "erfuellt", nachfrage: "", beleg: "" },
      { id: "kosten-je-posten", label: "", status: "offen", nachfrage: "", beleg: "" },
    ])!;
    const mit = tiefeQuote([
      { id: "bedarf-ist-zahlen", label: "", status: "erfuellt", nachfrage: "", beleg: "" },
      { id: "kosten-je-posten", label: "", status: "offen", nachfrage: "", beleg: "" },
      { id: "traeger-zusage", label: "", status: "geklaert", nachfrage: "", beleg: "" },
    ])!;
    expect(mit).toBe(ohne);
    expect(mit).toBe(0.5);
  });

  it("gibt null zurueck, wenn ALLE Punkte geklaert sind (nichts Messbares)", () => {
    expect(
      tiefeQuote([{ id: "traeger-zusage", label: "", status: "geklaert", nachfrage: "", beleg: "" }])
    ).toBeNull();
  });

  it("wertet teilweise als halben Punkt", () => {
    expect(
      tiefeQuote([
        { id: "bedarf-ist-zahlen", label: "", status: "teilweise", nachfrage: "", beleg: "" },
        { id: "kosten-je-posten", label: "", status: "teilweise", nachfrage: "", beleg: "" },
      ])
    ).toBe(0.5);
  });
});
