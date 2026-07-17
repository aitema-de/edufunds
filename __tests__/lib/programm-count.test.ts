import * as fs from "fs";
import * as path from "path";
import { PROGRAMM_COUNT_ROUNDED, PROGRAMM_COUNT_LABEL } from "@/lib/programm-count";
import { isProgrammAbgelaufen } from "@/lib/programm-status";
import type { Foerderprogramm } from "@/lib/foerderSchema";

/**
 * `lib/programm-count.ts` ist die einzige Quelle fuer die nach aussen
 * kommunizierte Programm-Anzahl. Seine Doku beklagt, dass die Zahl frueher an
 * vielen Stellen hartkodiert war (50+, 130+, "ueber 135", 160+) und
 * auseinanderdriftete.
 *
 * Am 17.07.2026 war die Drift zurueck: In der Preis-Tabelle stand
 * `Zugriff auf alle ${"189"} Programme` — die rohe Array-Laenge inklusive der
 * archivierten. Der Finder zeigte 157. Die Zusage war also falsch, bevor
 * ueberhaupt jemand etwas geaendert hatte.
 *
 * Diese Tests halten die zwei Regeln aus der Doku fest.
 */

const KATALOG: Foerderprogramm[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/foerderprogramme.json"), "utf-8")
);

function aktivImFinder(): number {
  const jetzt = new Date();
  return KATALOG.filter((p) => !isProgrammAbgelaufen(p, jetzt)).length;
}

describe("PROGRAMM_COUNT gegen den echten Katalog", () => {
  it("ueberzeichnet nicht, was der Finder liefert", () => {
    // Kernregel der Doku: "die Zahl darf nicht ueberzeichnen, was der Finder
    // tatsaechlich liefert". "150+" bei 153 sichtbaren Programmen ist ehrlich,
    // "189" waere es nicht.
    expect(PROGRAMM_COUNT_ROUNDED).toBeLessThanOrEqual(aktivImFinder());
  });

  it("ist auf die naechste Zehnerstelle abgerundet", () => {
    expect(PROGRAMM_COUNT_ROUNDED % 10).toBe(0);
  });

  it("ist nicht unnoetig bescheiden (Pflege-Erinnerung bei Wachstum)", () => {
    // Schlaegt an, sobald der aktive Katalog die naechste Zehnerstelle reisst —
    // dann gehoert die Konstante EINMAL erhoeht (so steht es im PFLEGE-Hinweis).
    expect(aktivImFinder()).toBeLessThan(PROGRAMM_COUNT_ROUNDED + 10);
  });

  it("das Label haengt an der Konstante", () => {
    expect(PROGRAMM_COUNT_LABEL).toBe(`${PROGRAMM_COUNT_ROUNDED}+`);
  });
});

describe("Keine hartkodierte Programm-Anzahl im UI", () => {
  const WURZELN = ["app", "components"];
  const AUSNAHMEN = [/node_modules/, /\.next/, /__tests__/];

  function quelldateien(dir: string): string[] {
    const out: string[] = [];
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (AUSNAHMEN.some((r) => r.test(p))) continue;
      if (e.isDirectory()) out.push(...quelldateien(p));
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
  }

  it("nennt nirgends eine Programm-Anzahl als Literal", () => {
    // Faengt "189 Programme", "alle 130 Foerderprogramme", `${"189"} Programme`.
    const muster = /\b\d{2,4}\s*(?:\}|"|`|\))*\s*\+?\s*(?:Programme|Förderprogramme|Foerderprogramme)\b/;
    const treffer: string[] = [];

    for (const wurzel of WURZELN) {
      for (const datei of quelldateien(path.join(process.cwd(), wurzel))) {
        const inhalt = fs.readFileSync(datei, "utf-8");
        inhalt.split("\n").forEach((zeile, i) => {
          if (muster.test(zeile)) {
            treffer.push(`${path.relative(process.cwd(), datei)}:${i + 1}: ${zeile.trim().slice(0, 90)}`);
          }
        });
      }
    }

    // Erwartung: leer. Die Anzahl kommt aus PROGRAMM_COUNT_ROUNDED/_LABEL.
    expect(treffer).toEqual([]);
  });
});
