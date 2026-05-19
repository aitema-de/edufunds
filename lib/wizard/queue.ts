/**
 * Single Source of Truth fuer Richtlinien-Queue-IO + Status-Mutatoren.
 *
 * Status-Union:
 *   open    — Dossier fehlt, Programm bedienbar (rebuild-queue Default)
 *   done    — Dossier in data/richtlinien/<id>.json (extract-richtlinie setzt)
 *   skip    — Kolja deprioritisiert ODER Empty-Extract (extract-richtlinie)
 *   expired — Quelle 404/410/403 ODER alle Stichtage in der Vergangenheit
 *             (cleanup-expired-queue setzt, Phase 4 D-05)
 *
 * Status `expired` ist orthogonal zu `skip`: skip = Kategorie-C/unbedienbar,
 * expired = Quelle tot oder Frist hart ueberschritten. --next-Picker
 * filtert beide automatisch via `status === "open"`-Filter.
 *
 * Hinweis: extract-richtlinie.ts hat noch eigene lokale loadQueue/saveQueue/
 * markSkipInQueue-Kopien — der Konsumenten-Switch auf dieses Modul erfolgt
 * in Plan 04 (Vollautomations-Workflow). Bis dahin gibt es bewusste
 * Code-Duplikation, damit Plan 01 und Plan 02 parallelisierbar bleiben.
 */

import fs from "node:fs/promises";
import path from "node:path";

export type QueueStatus = "open" | "done" | "skip" | "expired";

export interface QueueItem {
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

export interface Queue {
  generatedAt: string;
  description: string;
  criteria: string;
  total: number;
  items: QueueItem[];
}

export const QUEUE_PATH = path.join(process.cwd(), "data", "richtlinien-prioritaeten.json");

export async function loadQueue(): Promise<Queue> {
  const raw = await fs.readFile(QUEUE_PATH, "utf8");
  return JSON.parse(raw) as Queue;
}

export async function saveQueue(q: Queue): Promise<void> {
  await fs.writeFile(QUEUE_PATH, JSON.stringify(q, null, 2) + "\n");
}

export async function markExpiredInQueue(programmId: string, reason: string): Promise<void> {
  try {
    const q = await loadQueue();
    const item = q.items.find((i) => i.programmId === programmId);
    if (!item) return;
    item.status = "expired";
    item.skipReason = reason;
    await saveQueue(q);
    console.log(`    Queue: ${programmId} → status=expired (${reason.slice(0, 80)}…)`);
  } catch (err) {
    console.warn(`    Queue-Update übersprungen: ${(err as Error).message}`);
  }
}
