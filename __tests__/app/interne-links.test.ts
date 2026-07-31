/**
 * @jest-environment node
 *
 * Kein interner Link darf ins Leere zeigen.
 *
 * Befund 30.07.2026: /registrieren verlinkte unter "Bereits registriert? Hier
 * anmelden" auf /login — eine Seite, die es nie gab (HTTP 404). Aufgefallen ist es
 * nur, weil Nexts Link-Prefetch die tote Route im Hintergrund anfragte und der
 * visuelle Sweep deshalb nie "networkidle" erreichte. Ein Mensch haette den Klick
 * gemacht und waere auf der 404-Seite gelandet — im Registrierungsweg, also genau
 * dort, wo man niemanden verliert.
 *
 * Der Test liest die tatsaechlich existierenden Routen aus dem App-Router-Baum
 * (nicht aus einer gepflegten Liste — die veraltet) und prueft jeden statischen
 * internen href dagegen.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const APP = join(process.cwd(), "app");

/** Alle Seiten-Routen aus dem Dateisystem, dynamische Segmente als Regex-Teil. */
function routenAusDateisystem(): { statisch: Set<string>; dynamisch: RegExp[] } {
  const statisch = new Set<string>();
  const dynamisch: RegExp[] = [];

  function lauf(dir: string, urlPfad: string) {
    for (const name of readdirSync(dir)) {
      const voll = join(dir, name);
      if (statSync(voll).isDirectory()) {
        // Routengruppen (gruppe) tauchen nicht in der URL auf.
        const segment = /^\(.*\)$/.test(name) ? "" : `/${name}`;
        lauf(voll, urlPfad + segment);
      } else if (name === "page.tsx" || name === "page.ts" || name === "route.ts") {
        const pfad = urlPfad === "" ? "/" : urlPfad;
        if (pfad.includes("[")) {
          dynamisch.push(new RegExp("^" + pfad.replace(/\[[^\]]+\]/g, "[^/]+") + "$"));
        } else {
          statisch.add(pfad);
        }
      }
    }
  }
  lauf(APP, "");
  return { statisch, dynamisch };
}

/** Statische interne hrefs aus allen tsx-Dateien. */
function interneLinks(): Array<{ datei: string; zeile: number; href: string }> {
  const treffer: Array<{ datei: string; zeile: number; href: string }> = [];
  const wurzeln = [APP, join(process.cwd(), "components")];

  function lauf(pfad: string) {
    if (!statSync(pfad).isDirectory()) {
      if (!/\.tsx$/.test(pfad)) return;
      const zeilen = readFileSync(pfad, "utf8").split("\n");
      zeilen.forEach((z, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(z)) return;
        // Nur statische hrefs: href="/..." — Template-Literale und Variablen
        // lassen sich hier nicht sinnvoll aufloesen und bleiben aussen vor.
        for (const m of z.matchAll(/href="(\/[^"#?]*)"/g)) {
          treffer.push({ datei: pfad.slice(process.cwd().length + 1), zeile: i + 1, href: m[1] });
        }
      });
      return;
    }
    for (const name of readdirSync(pfad)) lauf(join(pfad, name));
  }
  for (const w of wurzeln) lauf(w);
  return treffer;
}

describe("Interne Links zeigen auf existierende Routen", () => {
  const { statisch, dynamisch } = routenAusDateisystem();
  const links = interneLinks();

  // Ziele ausserhalb des App-Routers: statische Dateien unter public/.
  const PUBLIC_PRAEFIXE = ["/logo", "/favicon", "/images", "/fonts", "/foerderrechner", "/edufunds"];

  const tot = links.filter(({ href }) => {
    const pfad = href.replace(/\/$/, "") || "/";
    if (statisch.has(pfad)) return false;
    if (dynamisch.some((r) => r.test(pfad))) return false;
    if (PUBLIC_PRAEFIXE.some((p) => pfad.startsWith(p))) return false;
    return true;
  });

  it("findet ueberhaupt Links (der Test darf nicht leer durchlaufen)", () => {
    expect(links.length).toBeGreaterThan(20);
  });

  it("kein href zeigt auf eine nicht existierende Route", () => {
    expect(tot.map((t) => `${t.datei}:${t.zeile} -> ${t.href}`)).toEqual([]);
  });
});
