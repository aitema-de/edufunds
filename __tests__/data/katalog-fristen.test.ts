import * as fs from "fs";
import * as path from "path";
import { isProgrammAbgelaufen } from "@/lib/programm-status";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { brauchtFristHinweis } from "@/lib/foerder-zustaende";

/**
 * Verbindet zwei Datenquellen, die bis 17.07.2026 nichts voneinander wussten:
 *
 *  - `data/foerderprogramme.json` entscheidet, was angeboten und verkauft wird.
 *  - `data/richtlinien/<id>.json` kennt die Stichtage (`fristLogik`).
 *
 * Am 17.07.2026 wurde ein Antrag fuer den Foerderfonds Demokratie verkauft
 * (29,90 EUR, echtes Geld). Dessen Dossier trug seit jeher:
 *
 *     "fristLogik": { "typ": "fixe_stichtage",
 *                     "stichtage": ["2019-09-30"],
 *                     "jaehrlich_wiederkehrend": false }
 *
 * Das Wissen war also da — es hat nur nie jemand mit dem Verkauf verknuepft.
 * Dieser Test ist die Verknuepfung. Er braucht kein LLM und kein Netz.
 *
 * Bewusst KONSERVATIV: Er schlaegt nur an, wenn das Dossier selbst sagt, dass
 * der Stichtag nicht wiederkehrt. Wiederkehrende Programme zwischen zwei Runden
 * sind damit erlaubt — die faengt dieser Test NICHT (s. Luecken-Test unten).
 */

type FristLogik = {
  typ?: string;
  stichtage?: string[];
  jaehrlich_wiederkehrend?: boolean;
};

const KATALOG: Foerderprogramm[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/foerderprogramme.json"), "utf-8")
);

const RICHTLINIEN_DIR = path.join(process.cwd(), "data/richtlinien");

function dossierFristLogik(id: string): FristLogik | null {
  const f = path.join(RICHTLINIEN_DIR, `${id}.json`);
  if (!fs.existsSync(f)) return null;
  try {
    return (JSON.parse(fs.readFileSync(f, "utf-8")).fristLogik as FristLogik) ?? null;
  } catch {
    return null;
  }
}

/** Wird das Programm im Finder/Matcher angeboten und ist es per KI verkaufbar? */
function istVerkaeuflich(p: Foerderprogramm, jetzt: Date): boolean {
  return !isProgrammAbgelaufen(p, jetzt) && Boolean((p as { kiAntragGeeignet?: boolean }).kiAntragGeeignet);
}

describe("Katalog x Dossier: kein Verkauf mit belegt totem Stichtag", () => {
  // Feste Uhr: Der Test soll nicht irgendwann von selbst rot werden, sondern
  // wenn jemand die DATEN aendert. Beim Anheben faellt auf, was neu ablaeuft.
  const JETZT = new Date("2026-07-17T00:00:00Z");

  it("kein verkaeufliches Programm hat einen abgelaufenen, nicht wiederkehrenden Stichtag", () => {
    const verstoesse: string[] = [];

    for (const p of KATALOG) {
      if (!istVerkaeuflich(p, JETZT)) continue;

      const fl = dossierFristLogik(p.id);
      if (!fl?.stichtage?.length) continue;
      if (fl.jaehrlich_wiederkehrend) continue; // wiederkehrend -> kein Urteil

      const letzter = [...fl.stichtage].sort().at(-1)!;
      const d = new Date(letzter);
      if (Number.isNaN(d.getTime())) continue;

      if (d < JETZT) {
        const jahre = ((JETZT.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000)).toFixed(1);
        verstoesse.push(`${p.id}: letzter Stichtag ${letzter} (vor ${jahre} Jahren), nicht wiederkehrend`);
      }
    }

    expect(verstoesse).toEqual([]);
  });

  it("die vier am 17.07.2026 belegten Faelle sind nicht mehr verkaeuflich", () => {
    const faelle = [
      "foerderfonds-demokratie",
      "ferry-porsche-challenge",
      "konzeptwettbewerb-schuelerforschungszentren",
      "ermoeglichungsbudget-fuer-innovative-schul-und",
    ];
    for (const id of faelle) {
      const p = KATALOG.find((x) => x.id === id);
      expect(p).toBeDefined();
      expect(istVerkaeuflich(p!, JETZT)).toBe(false);
    }
  });
});

describe("Katalog: dokumentierte Luecke, die dieser Test NICHT schliesst", () => {
  const JETZT = new Date("2026-07-17T00:00:00Z");

  /**
   * Der Test oben kann nur urteilen, wo ein Dossier einen Stichtag kennt. Die
   * eigentliche Luecke ist groesser: bei den meisten Programmen fehlt jede
   * maschinenlesbare Frist, und dann ist "laeuft rollend" von "Frist nicht
   * erfasst" nicht unterscheidbar. Die Wahrheit steht im Freitext
   * `bewerbungsfristText` (bei allen 189 gesetzt), den kein Verkaufs-Code liest.
   *
   * Seit 17.07.2026 gibt es dafuer den expliziten `fristZustand`
   * (lib/foerder-zustaende.ts). Ein Programm gilt hier als abgedeckt, sobald es
   * ENTWEDER `bewerbungsfristEnde` (Legacy) ODER einen BELEGTEN `fristZustand`
   * traegt. Diese Zahl ist die noch offene Migrations-Luecke; sie DARF nur sinken.
   *
   * ⚠️ `art: "unbekannt"` zaehlt AUSDRUECKLICH NICHT als Abdeckung. Seit dem
   * 22.07.2026 ist "unbekannt" verkaufsfaehig (mit Hinweis) — wuerde es als
   * abgedeckt zaehlen, koennte man diesen Zaehler auf 0 bringen, indem man alle
   * 89 offenen Programme pauschal auf "unbekannt" setzt, ohne eine einzige
   * Quelle gelesen zu haben. Der Zaehler misst VERIFIKATION, nicht Befuellung.
   */
  it("haelt fest, wie viele verkaeufliche Programme keine VERIFIZIERTE Frist haben", () => {
    const verkaeuflich = KATALOG.filter((p) => istVerkaeuflich(p, JETZT));
    const belegt = (p: Foerderprogramm) => {
      const fz = (p as { fristZustand?: { art?: string } }).fristZustand;
      return Boolean(fz && fz.art !== "unbekannt");
    };
    const ohneFrist = verkaeuflich.filter((p) => !p.bewerbungsfristEnde && !belegt(p));

    // Alle Programme haben einen menschenlesbaren Fristtext — nur liest ihn niemand.
    const ohneFristText = KATALOG.filter(
      (p) => !(p as { bewerbungsfristText?: string }).bewerbungsfristText
    );
    expect(ohneFristText).toEqual([]);

    // Momentaufnahme 17.07.2026: 97 verkaeuflich, davon 95 ohne Frist.
    // Stand 22.07.2026: 89 verkaeuflich, davon 60 ohne VERIFIZIERTE Frist —
    // nach Primaerquellen-Pruefung aller 36 "rolling"-Programme UND der 24,
    // deren letzter Stichtag verstrichen war. Rest: 29 mit Stichtag in der
    // Zukunft (dort ist das Risiko am kleinsten) + 5 Nachzuegler.
    // Diese Zahl DARF sinken (Luecke wird geschlossen). Steigt sie, waechst das
    // ungepruefte Risiko — dann ist die Erwartung bewusst anzupassen.
    expect(ohneFrist.length).toBeLessThanOrEqual(60);
  });
});

describe("Fail-closed: expliziter fristZustand entscheidet ueber Verkauf", () => {
  const JETZT = new Date("2026-07-17T00:00:00Z");

  // Minimales Programm; das Gate liest nur status, kiAntragGeeignet, fristZustand,
  // bewerbungsfristEnde. Der Rest ist fuer die Frist-Entscheidung irrelevant.
  function prog(overrides: Partial<Foerderprogramm>): Foerderprogramm {
    return {
      id: "test",
      status: "aktiv",
      kiAntragGeeignet: true,
      ...overrides,
    } as Foerderprogramm;
  }

  it("Frist unbekannt => verkaeuflich MIT Hinweis (Entscheidung 22.07.2026)", () => {
    // Bis 22.07.2026 sperrte "unbekannt". Das warf "Quelle schweigt" mit
    // "belegt geschlossen" zusammen und haette bei der Migration von 89
    // Programmen einen grossen Teil des Katalogs verschrottet. Seitdem:
    // schweigende Quelle => verkaeuflich, aber Hinweis-Pflicht in der UI.
    // Nachweislich tot heisst jetzt "geschlossen" (s. u.).
    const p = prog({ fristZustand: { art: "unbekannt" } } as Partial<Foerderprogramm>);
    expect(istVerkaeuflich(p, JETZT)).toBe(true);
    expect(brauchtFristHinweis(p.fristZustand)).toBe(true);
  });

  it("Frist geschlossen (belegt keine offene Runde) => NICHT verkaeuflich", () => {
    const p = prog({
      fristZustand: {
        art: "geschlossen",
        quelle: "Website 22.07.2026: 'Die Ausschreibung ist beendet.'",
      },
    } as Partial<Foerderprogramm>);
    expect(istVerkaeuflich(p, JETZT)).toBe(false);
  });

  it("Frist keine (belegt rollend) => verkaeuflich", () => {
    const p = prog({
      fristZustand: { art: "keine", quelle: "Website: laufende Antragstellung" },
    } as Partial<Foerderprogramm>);
    expect(istVerkaeuflich(p, JETZT)).toBe(true);
  });

  it("Stichtag in der Vergangenheit, nicht wiederkehrend => NICHT verkaeuflich", () => {
    const p = prog({
      fristZustand: {
        art: "stichtag",
        stichtage: ["2019-09-30"],
        jaehrlichWiederkehrend: false,
        quelle: "PDF Runde 1",
      },
    } as Partial<Foerderprogramm>);
    expect(istVerkaeuflich(p, JETZT)).toBe(false);
  });

  it("Stichtag in der Zukunft => verkaeuflich; wiederkehrend => verkaeuflich", () => {
    const zukunft = prog({
      fristZustand: {
        art: "stichtag",
        stichtage: ["2026-12-01"],
        quelle: "Website",
      },
    } as Partial<Foerderprogramm>);
    const wiederkehrend = prog({
      fristZustand: {
        art: "stichtag",
        stichtage: ["2020-06-30"],
        jaehrlichWiederkehrend: true,
        quelle: "Website: jaehrlich bis 30.06.",
      },
    } as Partial<Foerderprogramm>);
    expect(istVerkaeuflich(zukunft, JETZT)).toBe(true);
    expect(istVerkaeuflich(wiederkehrend, JETZT)).toBe(true);
  });

  it("foerderfonds-demokratie ist ueber den fristZustand-Pfad tot (Stichtag 2019, nicht wiederkehrend)", () => {
    const p = KATALOG.find((x) => x.id === "foerderfonds-demokratie");
    expect(p).toBeDefined();
    // Daten belegen es (unabhaengig vom redaktionellen status="archiviert"):
    expect((p as { fristZustand?: { art?: string } }).fristZustand?.art).toBe("stichtag");
    // Selbst wenn der Status auf aktiv stuende, bliebe es nicht verkaeuflich:
    const alsAktiv = { ...(p as Foerderprogramm), status: "aktiv" as const, kiAntragGeeignet: true };
    expect(istVerkaeuflich(alsAktiv, JETZT)).toBe(false);
  });
});
