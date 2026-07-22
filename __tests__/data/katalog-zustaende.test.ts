import * as fs from "fs";
import * as path from "path";
import {
  FristZustandSchema,
  UmfangZustandSchema,
  EinreichungsFormSchema,
} from "@/lib/foerder-zustaende-schema";

/**
 * Runtime-Pruefung der expliziten Zustaende im KATALOG
 * (`data/foerderprogramme.json`) — der Datei, die ueber den Verkauf entscheidet.
 *
 * Warum als Test und nicht in scripts/validate-data.ts: Dieses Skript steht in
 * keinem npm-Script und in keiner CI (s. Kommentar dort). `npm test` laeuft in
 * .github/workflows/ci.yml — nur hier greift eine Pruefung wirklich.
 *
 * Warum ueberhaupt: `fristZustand` ist in TypeScript typisiert, kommt aber als
 * JSON herein und wird von `JSON.parse` nur BEHAUPTET. Ein Tippfehler in `art`
 * (z. B. "stichtage" statt "stichtag") ist damit fuer den Compiler unsichtbar.
 * Das Gate ist seit 17.07.2026 fail-closed und wuerde so ein Programm aus dem
 * Katalog nehmen — dieser Test sagt, WARUM es verschwunden ist, statt es still
 * geschehen zu lassen. Beim Nachziehen der ~97 offenen Programme ist das der
 * Unterschied zwischen "faellt sofort auf" und "faellt beim Umsatz auf".
 */

type Programm = {
  id?: string;
  fristZustand?: unknown;
  umfangZustand?: unknown;
  einreichungsForm?: unknown;
};

const KATALOG: Programm[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/foerderprogramme.json"), "utf-8")
);

const FELDER = [
  { name: "fristZustand", schema: FristZustandSchema },
  { name: "umfangZustand", schema: UmfangZustandSchema },
  { name: "einreichungsForm", schema: EinreichungsFormSchema },
] as const;

describe("Katalog: explizite Zustaende sind strukturell gueltig", () => {
  it.each(FELDER)("$name entspricht dem Schema (oder fehlt)", ({ name, schema }) => {
    const fehler: string[] = [];

    for (const p of KATALOG) {
      const wert = (p as Record<string, unknown>)[name];
      if (wert === undefined) continue; // noch nicht migriert -> legitim
      const r = schema.safeParse(wert);
      if (!r.success) {
        const details = r.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ");
        fehler.push(`${p.id ?? "(ohne id)"} -> ${details}`);
      }
    }

    expect(fehler).toEqual([]);
  });

  it("Dossier und Katalog widersprechen sich nicht beim fristZustand", () => {
    // Beide Seiten tragen das Feld. Wenn sie auseinanderlaufen, entscheidet der
    // Katalog ueber den Verkauf, waehrend das Dossier die Pipeline mit einer
    // anderen Wahrheit fuettert — genau die Trennung, die den Foerderfonds
    // Demokratie verkaufbar gemacht hat.
    //
    // Verglichen wird nur, was die ENTSCHEIDUNG traegt (art, Stichtage,
    // Wiederkehr). `quelle` ist Prosa und darf je Seite unterschiedlich
    // ausfuehrlich sein.
    const kern = (z: unknown) => {
      const o = (z ?? {}) as Record<string, unknown>;
      return JSON.stringify({
        art: o.art,
        stichtage: Array.isArray(o.stichtage) ? [...o.stichtage].sort() : undefined,
        jaehrlichWiederkehrend: o.jaehrlichWiederkehrend === true,
      });
    };

    const dir = path.join(process.cwd(), "data/richtlinien");
    const konflikte: string[] = [];

    for (const p of KATALOG) {
      if (!p.id || p.fristZustand === undefined) continue;
      const f = path.join(dir, `${p.id}.json`);
      if (!fs.existsSync(f)) continue;
      let dossier: { fristZustand?: unknown };
      try {
        dossier = JSON.parse(fs.readFileSync(f, "utf-8"));
      } catch {
        continue; // Dossier-Syntax prueft validate-richtlinien.ts
      }
      if (dossier.fristZustand === undefined) continue;
      if (kern(dossier.fristZustand) !== kern(p.fristZustand)) {
        konflikte.push(
          `${p.id}: Katalog ${kern(p.fristZustand)} vs. Dossier ${kern(dossier.fristZustand)}`
        );
      }
    }

    expect(konflikte).toEqual([]);
  });
});
