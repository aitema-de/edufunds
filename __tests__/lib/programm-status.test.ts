import { isProgrammAbgelaufen, isStatusNichtAnbietbar, STATUS_ANBIETBAR } from "@/lib/programm-status";
import { PROGRAMM_STATUS } from "@/lib/foerderSchema";
import type { Foerderprogramm } from "@/lib/foerderSchema";

/**
 * Diese Funktion entscheidet, welche Foerderprogramme im Finder/Matcher
 * erscheinen — und damit, wofuer ein Kunde 29,90 EUR bezahlt. Sie hatte bis
 * 17.07.2026 keinen Test.
 *
 * Anlass: Am 17.07.2026 wurde ein Antrag fuer ein Programm verkauft, dessen
 * einziger Stichtag am 30.09.2019 lag.
 */

const HEUTE = new Date("2026-07-17T12:00:00Z");

function programm(over: Partial<Foerderprogramm> = {}): Foerderprogramm {
  return { id: "test", name: "Test", status: "aktiv", ...over } as Foerderprogramm;
}

describe("isStatusNichtAnbietbar — Allowlist, fail-closed", () => {
  it("laesst genau 'aktiv' durch", () => {
    expect(isStatusNichtAnbietbar(programm({ status: "aktiv" }))).toBe(false);
  });

  it.each(["archiviert", "review_needed"] as const)("sperrt '%s'", (status) => {
    expect(isStatusNichtAnbietbar(programm({ status } as Partial<Foerderprogramm>))).toBe(true);
  });

  // Der eigentliche Zweck der Allowlist: Werte, die keine Sperrliste kennt.
  // 'pausiert'/'auslaufend' waren im alten Schema erlaubt, standen aber auf
  // keiner Sperrliste — solche Programme waeren weiter verkauft worden.
  it.each(["pausiert", "auslaufend", "beendet", "abgelaufen", "AKTIV", "aktiv ", "", "irgendwas"])(
    "sperrt den unbekannten/abweichenden Wert %p",
    (status) => {
      expect(isStatusNichtAnbietbar(programm({ status } as unknown as Partial<Foerderprogramm>))).toBe(true);
    }
  );

  it("sperrt ein fehlendes status-Feld", () => {
    const ohneStatus = { id: "x", name: "X" } as Foerderprogramm;
    expect(isStatusNichtAnbietbar(ohneStatus)).toBe(true);
  });

  it("STATUS_ANBIETBAR ist Teil der deklarierten Status-Werte", () => {
    expect(PROGRAMM_STATUS).toContain(STATUS_ANBIETBAR);
  });
});

describe("isProgrammAbgelaufen", () => {
  it("aktiv ohne Fristende gilt als laufend", () => {
    expect(isProgrammAbgelaufen(programm(), HEUTE)).toBe(false);
  });

  it("aktiv mit Fristende in der Zukunft gilt als laufend", () => {
    expect(isProgrammAbgelaufen(programm({ bewerbungsfristEnde: "2026-12-31" }), HEUTE)).toBe(false);
  });

  it("aktiv mit Fristende in der Vergangenheit ist abgelaufen", () => {
    expect(isProgrammAbgelaufen(programm({ bewerbungsfristEnde: "2019-09-30" }), HEUTE)).toBe(true);
  });

  it("archiviert ist abgelaufen, auch mit Fristende in der Zukunft", () => {
    expect(
      isProgrammAbgelaufen(
        programm({ status: "archiviert", bewerbungsfristEnde: "2099-01-01" } as Partial<Foerderprogramm>),
        HEUTE
      )
    ).toBe(true);
  });

  it("ein unparsbares Fristende macht ein aktives Programm nicht abgelaufen", () => {
    // Kein stiller Ausschluss wegen eines Tippfehlers im Datum.
    expect(isProgrammAbgelaufen(programm({ bewerbungsfristEnde: "demnaechst" }), HEUTE)).toBe(false);
  });

  it("nutzt per Default die echte Uhr (kein Test-Datum noetig)", () => {
    expect(isProgrammAbgelaufen(programm({ bewerbungsfristEnde: "1999-01-01" }))).toBe(true);
  });
});

describe("Regression: der reale Fall vom 17.07.2026", () => {
  // Kein Test kann die fehlende Frist erfinden — aber er haelt fest, WAS die
  // Luecke ist: ohne bewerbungsfristEnde ist das Programm nicht von einem
  // rollenden zu unterscheiden. Der Schutz muss deshalb aus den Daten kommen.
  it("ohne Fristende laesst das Gate ein totes Programm durch (dokumentierte Luecke)", () => {
    const foerderfondsDemokratie = programm({ id: "foerderfonds-demokratie", status: "aktiv" });
    expect(isProgrammAbgelaufen(foerderfondsDemokratie, HEUTE)).toBe(false);
  });

  it("redaktionell auf 'archiviert' gesetzt, greift das Gate", () => {
    const nachKorrektur = programm({
      id: "foerderfonds-demokratie",
      status: "archiviert",
    } as Partial<Foerderprogramm>);
    expect(isProgrammAbgelaufen(nachKorrektur, HEUTE)).toBe(true);
  });
});
