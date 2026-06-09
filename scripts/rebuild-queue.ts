/**
 * Rebuild der Dossier-Extraktions-Prio-Queue (data/richtlinien-prioritaeten.json)
 * aus dem aktuellen Stand von data/foerderprogramme.json.
 *
 * Nutzung:
 *   npx tsx scripts/rebuild-queue.ts            # schreibt die Queue
 *   npx tsx scripts/rebuild-queue.ts --dry-run  # zeigt Diff, schreibt nicht
 *
 * Vorgehen:
 *   1. Liest data/foerderprogramme.json + bestehende Queue.
 *   2. Filtert kiAntragGeeignet === true.
 *   3. Berechnet Score nach unten dokumentierter Formel (matched die
 *      bestehenden Queue-Scores byte-genau, also ohne Verschiebungen
 *      der Reihenfolge).
 *   4. Behaelt fuer programme, die schon in der Queue stehen,
 *      status (done/skip) + skipReason bei. Neue programme bekommen
 *      status="open". Programme ohne Treffer in foerderprogramme.json
 *      fallen aus der Queue raus.
 *   5. Sortiert absteigend nach score.
 *   6. Schreibt mit aktualisierter generatedAt + total. description und
 *      criteria bleiben, falls vorhanden.
 *
 * Score-Formel:
 *   score = log10(foerdersummeMax) * 10
 *         + bundeslaender.length * 2          (kein Sonderfall "alle")
 *         + typBonus[foerdergeberTyp]          (bund:20, eu:15, stiftung:10, sonst:0)
 *         + min(kategorien.length, 5) * 2
 *         + min(schulformen.length, 5) * 2
 */

import fs from "node:fs/promises";
import path from "node:path";

const FP_PATH = path.join(process.cwd(), "data", "foerderprogramme.json");
const QUEUE_PATH = path.join(process.cwd(), "data", "richtlinien-prioritaeten.json");

const TYP_BONUS: Record<string, number> = {
  bund: 20,
  eu: 15,
  stiftung: 10,
};

const DEFAULT_DESCRIPTION =
  "Priorisierte Queue für Richtlinien-Dossier-Extraktion. Wird vom Extraction-Tool (--next-Modus) und geplantem wöchentlichen Cronjob konsumiert. Status: open = Dossier fehlt; done = Dossier in data/richtlinien/; skip = Kolja hat manuell deprioritisiert.";
const DEFAULT_CRITERIA =
  "Score = log10(foerdersummeMax)*10 + Reichweite(BLs.length*2) + Typ(bund=20, eu=15, stiftung=10, sonst=0) + min(kategorien,5)*2 + min(schulformen,5)*2. Nur kiAntragGeeignet=true.";

interface Programm {
  id: string;
  name: string;
  foerdergeber?: string;
  foerdergeberTyp?: string;
  schulformen?: string[];
  bundeslaender?: string[];
  foerdersummeMax?: number | null;
  kategorien?: string[];
  infoLink?: string;
  kiAntragGeeignet?: boolean;
}

type QueueStatus = "open" | "done" | "skip" | "expired";

interface QueueItem {
  programmId: string;
  name: string;
  foerdergeberTyp?: string;
  foerdersummeMax?: number | null;
  reichweite?: string;
  infoLink?: string;
  score: number;
  status: QueueStatus;
  skipReason?: string;
}

interface Queue {
  generatedAt: string;
  description: string;
  criteria: string;
  total: number;
  items: QueueItem[];
}

function computeScore(p: Programm): number {
  const max = p.foerdersummeMax || 1;
  const log = Math.log10(max) * 10;
  const reich = (p.bundeslaender ?? []).length * 2;
  const typ = TYP_BONUS[p.foerdergeberTyp ?? ""] ?? 0;
  const kat = Math.min((p.kategorien ?? []).length, 5) * 2;
  const sch = Math.min((p.schulformen ?? []).length, 5) * 2;
  const raw = log + reich + typ + kat + sch;
  return Math.round(raw * 10) / 10;
}

function deriveReichweite(bl: string[] | undefined): string {
  if (!bl || bl.length === 0) return "?";
  if (bl.includes("alle")) return "alle";
  return bl.join("/");
}

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as T;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const programme = await readJson<Programm[]>(FP_PATH);
  const oldQueue = await readJson<Queue>(QUEUE_PATH).catch(() => null);

  const oldByPid = new Map<string, QueueItem>();
  if (oldQueue?.items) for (const i of oldQueue.items) oldByPid.set(i.programmId, i);

  const candidates = programme.filter((p) => p.kiAntragGeeignet === true);

  const items: QueueItem[] = candidates.map((p) => {
    const old = oldByPid.get(p.id);
    const score = computeScore(p);
    const item: QueueItem = {
      programmId: p.id,
      name: p.name,
      foerdergeberTyp: p.foerdergeberTyp,
      foerdersummeMax: p.foerdersummeMax || null,
      reichweite: deriveReichweite(p.bundeslaender),
      infoLink: p.infoLink,
      score,
      status: old?.status ?? "open",
    };
    if (old?.skipReason) item.skipReason = old.skipReason;
    return item;
  });

  items.sort((a, b) => b.score - a.score);

  const queue: Queue = {
    generatedAt: new Date().toISOString(),
    description: oldQueue?.description ?? DEFAULT_DESCRIPTION,
    criteria: oldQueue?.criteria ?? DEFAULT_CRITERIA,
    total: items.length,
    items,
  };

  // Diff-Statistik
  const oldIds = new Set(oldByPid.keys());
  const newIds = new Set(items.map((i) => i.programmId));
  const added = [...newIds].filter((id) => !oldIds.has(id));
  const removed = [...oldIds].filter((id) => !newIds.has(id));
  const statusCounts = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Programme (kiAntragGeeignet=true): ${candidates.length}`);
  console.log(`Queue alt: ${oldQueue?.items.length ?? 0} Items`);
  console.log(`Queue neu: ${items.length} Items`);
  console.log(`Status:`, statusCounts);
  if (added.length) console.log(`Neu (${added.length}):`, added.slice(0, 10).join(", ") + (added.length > 10 ? " …" : ""));
  if (removed.length) console.log(`Entfernt (${removed.length}):`, removed.slice(0, 10).join(", ") + (removed.length > 10 ? " …" : ""));

  if (dryRun) {
    console.log("\n--dry-run: keine Datei geschrieben.");
    return;
  }

  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2) + "\n", "utf8");
  console.log(`\nGeschrieben: ${path.relative(process.cwd(), QUEUE_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
