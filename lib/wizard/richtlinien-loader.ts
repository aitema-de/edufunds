/**
 * Server-seitiger Loader fuer Richtlinien-Dossiers.
 * Dossiers liegen als JSON unter data/richtlinien/<programmId>.json.
 * Fuer jedes Programm ohne Dossier gibt dieser Loader null zurueck —
 * der Wizard zeigt dann einen Hinweis und nutzt generische Logik.
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { Richtlinie } from "./richtlinien-schema";

const DIR = path.join(process.cwd(), "data", "richtlinien");

const cache = new Map<string, Richtlinie | null>();

export async function loadRichtlinie(programmId: string): Promise<Richtlinie | null> {
  if (cache.has(programmId)) return cache.get(programmId)!;
  try {
    const raw = await fs.readFile(path.join(DIR, `${programmId}.json`), "utf8");
    const parsed = JSON.parse(raw) as Richtlinie;
    cache.set(programmId, parsed);
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      cache.set(programmId, null);
      return null;
    }
    throw err;
  }
}

export async function listRichtlinienIds(): Promise<string[]> {
  try {
    const files = await fs.readdir(DIR);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
