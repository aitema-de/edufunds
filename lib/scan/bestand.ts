/**
 * Bestandsvergleich je Quelle — aus „finde Förderprogramme" wird „was ist neu seit letzter Woche".
 *
 * WARUM DIESE UMSTELLUNG DAS EIGENTLICHE VERFAHREN IST:
 * Bund, Länder und nationale Stiftungen sind eine **aufzählbare** Menge. Man muss sie nicht
 * suchen, man muss sie beobachten. Die gut gestellte Frage ist deshalb nicht „welche
 * Förderprogramme gibt es" (unbeantwortbar, laut, teuer), sondern „welche URL stand letzte
 * Woche noch nicht in der Sitemap dieses Ministeriums" (deterministisch, leise, billig).
 * Das LLM sieht danach statt 1.114 URLs die drei neuen.
 *
 * Der Bestand liegt als sortierte URL-Liste je Quelle unter data/scan-state/<id>.json —
 * sortiert, damit der Git-Diff die Veraenderung zeigt und nicht eine Umsortierung.
 */

import fs from "node:fs/promises";
import path from "node:path";

export interface BestandsDatei {
  quelle: string;
  erstlauf: string;
  letzterLauf: string;
  urlAnzahl: number;
  urls: string[];
}

export interface BestandsDiff {
  /** Erster Lauf dieser Quelle: Bestand wird aufgenommen, es gibt bewusst KEINE Kandidaten. */
  erstlauf: boolean;
  neu: string[];
  entfallen: string[];
  /** Gesetzt, wenn der Vergleich unplausibel ist — dann lieber abbrechen als fluten. */
  fehler?: string;
}

/**
 * Ab wann ist „viel Neues" kein Fund mehr, sondern ein Umbau?
 *
 * Wenn ein Portal seine URL-Struktur aendert (neue Domain, neuer Pfad, Sprachpraefix), sieht
 * schlagartig JEDE URL neu aus. Ohne Bremse wuerden daraus hunderte Kandidaten, jeder mit einer
 * teuren LLM-Extraktion, und der PR waere Muell. Kleine Quellen bleiben von der Bremse
 * unbehelligt: erst ab 50 neuen URLs greift sie ueberhaupt.
 */
export const UMBAU_SCHWELLE_ABSOLUT = 50;
export const UMBAU_ANTEIL = 0.5;

export function vergleicheBestand(
  alt: string[] | null,
  neu: string[],
  opts: { schwelleAbsolut?: number; anteil?: number } = {}
): BestandsDiff {
  const einmalig = [...new Set(neu)];
  if (alt === null) {
    return { erstlauf: true, neu: [], entfallen: [] };
  }
  const altMenge = new Set(alt);
  const neuMenge = new Set(einmalig);
  const hinzu = einmalig.filter((u) => !altMenge.has(u));
  const entfallen = alt.filter((u) => !neuMenge.has(u));

  const schwelle = Math.max(
    opts.schwelleAbsolut ?? UMBAU_SCHWELLE_ABSOLUT,
    alt.length * (opts.anteil ?? UMBAU_ANTEIL)
  );
  if (hinzu.length > schwelle) {
    return {
      erstlauf: false,
      neu: [],
      entfallen,
      fehler:
        `${hinzu.length} neue URLs auf einmal (Bestand vorher ${alt.length}, Schwelle ${Math.round(schwelle)}) — ` +
        `das ist kein Fund, sondern ein Umbau der Quelle. Kandidaten verworfen, damit kein ` +
        `Muell-PR entsteht. Quelle pruefen, dann data/scan-state/ fuer diese Quelle loeschen, ` +
        `damit der Bestand neu aufgenommen wird.`,
    };
  }
  return { erstlauf: false, neu: hinzu, entfallen };
}

function pfadFuer(dir: string, quelle: string): string {
  // Quellen-IDs sind Slugs (ASCII, kebab-case) — trotzdem defensiv, der Wert landet in einem Pfad.
  const sicher = quelle.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(dir, `${sicher}.json`);
}

/** Bestand laden. null = diese Quelle wurde noch nie gesehen (Erstlauf). */
export async function ladeBestand(dir: string, quelle: string): Promise<string[] | null> {
  try {
    const roh = await fs.readFile(pfadFuer(dir, quelle), "utf8");
    const datei = JSON.parse(roh) as BestandsDatei;
    return Array.isArray(datei.urls) ? datei.urls : null;
  } catch {
    return null;
  }
}

export async function speichereBestand(
  dir: string,
  quelle: string,
  urls: string[],
  jetzt: string
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const ziel = pfadFuer(dir, quelle);
  let erstlauf = jetzt;
  try {
    const vorher = JSON.parse(await fs.readFile(ziel, "utf8")) as BestandsDatei;
    if (vorher.erstlauf) erstlauf = vorher.erstlauf;
  } catch {
    /* Erstlauf */
  }
  const sortiert = [...new Set(urls)].sort();
  const datei: BestandsDatei = {
    quelle,
    erstlauf,
    letzterLauf: jetzt,
    urlAnzahl: sortiert.length,
    urls: sortiert,
  };
  await fs.writeFile(ziel, JSON.stringify(datei, null, 2) + "\n", "utf8");
}
