import * as fs from "fs";
import * as path from "path";
import { isProgrammAbgelaufen } from "@/lib/programm-status";
import type { Foerderprogramm } from "@/lib/foerderSchema";

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
   * eigentliche Luecke ist groesser: `bewerbungsfristEnde` fehlt bei den meisten
   * Programmen, und dann ist "laeuft rollend" von "Frist nicht erfasst" nicht
   * unterscheidbar. Die Wahrheit steht im Freitext `bewerbungsfristText` (bei
   * allen 189 gesetzt), den kein Code liest.
   *
   * Dieser Test behauptet nicht, dass das in Ordnung ist — er haelt die Groesse
   * der Luecke fest, damit sie sichtbar bleibt und beim Schliessen auffaellt.
   */
  it("haelt fest, wie viele verkaeufliche Programme kein maschinenlesbares Fristende haben", () => {
    const verkaeuflich = KATALOG.filter((p) => istVerkaeuflich(p, JETZT));
    const ohneFristEnde = verkaeuflich.filter((p) => !p.bewerbungsfristEnde);

    // Alle Programme haben einen menschenlesbaren Fristtext — nur liest ihn niemand.
    const ohneFristText = KATALOG.filter(
      (p) => !(p as { bewerbungsfristText?: string }).bewerbungsfristText
    );
    expect(ohneFristText).toEqual([]);

    // Momentaufnahme 17.07.2026: 97 verkaeuflich, davon 95 ohne Fristende.
    // Diese Zahl DARF sinken (Luecke wird geschlossen). Steigt sie, waechst das
    // ungepruefte Risiko — dann ist die Erwartung bewusst anzupassen.
    expect(ohneFristEnde.length).toBeLessThanOrEqual(95);
  });
});
