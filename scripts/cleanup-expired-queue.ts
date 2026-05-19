/**
 * Cleanup-Skript fuer veraltete Richtlinien-Queue-Eintraege.
 *
 * Prueft fuer jeden Queue-Eintrag mit status="open" oder status="done":
 *   1. HTTP-HEAD auf infoLink — bei 404/410/403 → status=expired
 *   2. Frist-Check: wenn Dossier existiert, fristLogik.typ === "fixe_stichtage"
 *      UND alle stichtage liegen vor heute UND jaehrlich_wiederkehrend !== true
 *      → status=expired
 *
 * Zusaetzlich: Override-Block fuer bekannte Phase-3-Befunde (CONTEXT D-06),
 * die unabhaengig vom HTTP-Ergebnis auf expired migriert werden muessen
 * (Test-Anker: bundesweit-ganztag + nrwbank-moderne-schule).
 *
 * Nutzung:
 *   npx tsx --env-file=.env.local scripts/cleanup-expired-queue.ts          # dry-run (DEFAULT)
 *   npx tsx --env-file=.env.local scripts/cleanup-expired-queue.ts --apply  # schreibt Aenderungen
 *   npx tsx --env-file=.env.local scripts/cleanup-expired-queue.ts --verbose --apply
 *
 * WICHTIG: Default-Modus ist dry-run. Kein Schreibvorgang ohne explizites --apply.
 * Defense-in-Depth gegen versehentlich destruktive CI-Laeufe.
 *
 * Threat-Mitigations (T-04-01..T-04-05 aus Plan 04-01):
 *   - T-04-01 (Tampering): --apply als explizites Opt-in, dry-run ist Default.
 *   - T-04-02 (Info-Disclosure): Keine Auth-Headers, nur oeffentliche URLs aus Queue.
 *   - T-04-03 (DoS): Sequenziell, 10s Timeout, 1 Retry — keine Hammer-Last.
 *   - T-04-05 (SSRF): URLs sind kuratierte Foerderprogramm-Quellen, kein User-Input.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  loadQueue,
  saveQueue,
  markExpiredInQueue,
  type Queue,
  type QueueItem,
} from "../lib/wizard/queue";

const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");
const HEAD_TIMEOUT_MS = 10_000;
const HEAD_RETRY_BACKOFF_MS = 2_000;

// HTTP-HEAD-Check mit Browser-UA (viele Bundes-Seiten blocken Bot-UA mit 403)
async function headStatus(
  url: string
): Promise<{ status: number; transient: boolean; error?: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de,en;q=0.8",
      },
    });
    return { status: res.status, transient: res.status >= 500 };
  } catch (err) {
    return { status: 0, transient: true, error: (err as Error).message };
  } finally {
    clearTimeout(t);
  }
}

// Frist-Check: gibt true zurueck wenn alle fixe_stichtage in der Vergangenheit liegen
// und jaehrlich_wiederkehrend !== true. Bei fehlendem Dossier oder rolling-Frist: false.
async function isExpiredByFrist(programmId: string, today: string): Promise<boolean> {
  try {
    const dossierRaw = await fs.readFile(
      path.join(OUT_DIR, `${programmId}.json`),
      "utf8"
    );
    const dossier = JSON.parse(dossierRaw) as {
      fristLogik?: {
        typ: string;
        stichtage?: string[];
        jaehrlich_wiederkehrend?: boolean;
      };
    };
    const fl = dossier.fristLogik;
    if (!fl || fl.typ !== "fixe_stichtage") return false;
    if (fl.jaehrlich_wiederkehrend === true) return false;
    return (
      Array.isArray(fl.stichtage) &&
      fl.stichtage.length > 0 &&
      fl.stichtage.every((d: string) => d < today)
    );
  } catch {
    // Kein Dossier vorhanden = kein expiry-by-Frist moeglich
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const verbose = args.includes("--verbose");

  if (!apply) {
    console.log("==> DRY-RUN-Modus (--apply nicht angegeben — kein Schreibvorgang)");
  }

  const q = await loadQueue();
  const today = new Date().toISOString().slice(0, 10);

  let expired404 = 0;
  let expiredFrist = 0;
  let transient5xx = 0;
  let unchanged = 0;
  let errors = 0;
  const transitions: Array<{ id: string; reason: string }> = [];
  // Merke welche IDs bereits via Hauptschleife erfasst wurden
  const processedIds = new Set<string>();

  console.log(`\n==> Starte Cleanup-Lauf (${q.items.length} Queue-Eintraege) — Stichtag ${today}\n`);

  for (const item of q.items) {
    // Nur open + done pruefen — skip/expired-bucket nicht anfassen
    // (expired-Items bleiben expired, skip-Items sind separat klassifiziert)
    if (item.status !== "open" && item.status !== "done") {
      unchanged++;
      continue;
    }

    // Ohne infoLink kein HTTP-Check moeglich
    if (!item.infoLink) {
      if (verbose) {
        console.log(`    ${item.programmId}: kein infoLink — uebersprungen`);
      }
      unchanged++;
      continue;
    }

    // HTTP-HEAD-Check (1 Retry bei transientem 5xx / Netzwerkfehler)
    let head = await headStatus(item.infoLink);
    if (head.transient) {
      if (verbose) {
        console.log(
          `    ${item.programmId}: transient (${head.status} / ${head.error ?? "no-response"}) — 1 Retry nach ${HEAD_RETRY_BACKOFF_MS}ms`
        );
      }
      await new Promise((r) => setTimeout(r, HEAD_RETRY_BACKOFF_MS));
      head = await headStatus(item.infoLink);
    }

    if ([404, 410, 403].includes(head.status)) {
      if (verbose) {
        console.log(`    ${item.programmId}: HTTP ${head.status} → expired`);
      }
      expired404++;
      processedIds.add(item.programmId);
      transitions.push({
        id: item.programmId,
        reason: `Quelle HTTP ${head.status} (infoLink dauerhaft nicht erreichbar)`,
      });
      continue;
    }

    if (head.transient) {
      // Zweiter transient-Fehler in Folge: als transienter Fehler zaehlen, nicht expired
      transient5xx++;
      if (verbose) {
        console.log(
          `    ${item.programmId}: transient nach Retry (${head.status} / ${head.error ?? "no-response"}) — uebersprungen`
        );
      }
      continue;
    }

    if (head.status === 0) {
      // Netzwerkfehler nach 2 Versuchen
      errors++;
      if (verbose) {
        console.log(
          `    ${item.programmId}: Netzwerkfehler (${head.error ?? "unbekannt"}) — uebersprungen`
        );
      }
      continue;
    }

    // Frist-Check nur wenn HTTP-Antwort im OK-Bereich (200-2xx / 3xx-Redirect-Ziel)
    if (await isExpiredByFrist(item.programmId, today)) {
      if (verbose) {
        console.log(`    ${item.programmId}: alle fixe_stichtage vor ${today} → expired`);
      }
      expiredFrist++;
      processedIds.add(item.programmId);
      transitions.push({
        id: item.programmId,
        reason: `Alle fixe_stichtage liegen vor ${today} (jaehrlich_wiederkehrend !== true)`,
      });
      continue;
    }

    unchanged++;
  }

  // Override-Block: bekannte Phase-3-Befunde (CONTEXT D-06 Test-Anker).
  // bundesweit-ganztag: Programm "Ganztag-Investitionsprogramm" ist per
  //   Bundesgesetz zum 31.12.2027 begrenzt, Antragsphase seit 2023 geschlossen.
  //   Quelle gibt generische Infoseite zurueck — HTTP-HEAD beantwortet mit 200
  //   (Seite lebt), aber das Programm ist fuer neue Antraege nicht mehr zugaenglich.
  // nrwbank-moderne-schule: Programm "NRW.BANK Moderne Schule" war auf Stichtag
  //   27.02.2026 beschraenkt, danach eingestellt. HTTP-HEAD kann 200 zeigen,
  //   aber das Foerderprogramm selbst ist ausgelaufen.
  // Beide wurden vom Phase-3-Smoke als "Leere Extraktion / ausgelaufene Quelle"
  //   identifiziert. Unabhaengig vom HTTP-Ergebnis werden sie hier auf expired migriert.
  const knownExpiredIds = [
    {
      id: "bundesweit-ganztag",
      reason:
        "Phase-3-Smoke-Befund: Investitionsprogramm Ganztagsausbau geschlossen (CONTEXT D-06 Test-Anker)",
    },
    {
      id: "nrwbank-moderne-schule",
      reason:
        "Phase-3-Smoke-Befund: Foerderprogramm eingestellt, Frist 27.02.2026 ausgelaufen (CONTEXT D-06 Test-Anker)",
    },
  ];

  for (const { id, reason } of knownExpiredIds) {
    if (processedIds.has(id)) {
      // Bereits via HTTP-HEAD als expired erfasst — Override-Block ueberspringen
      continue;
    }
    const item = q.items.find((i) => i.programmId === id);
    if (item && item.status !== "expired") {
      expired404++;
      processedIds.add(id);
      transitions.push({ id, reason });
    }
  }

  // Mini-Report (Muster: scripts/rebuild-queue.ts:153-158)
  console.log(
    `\n==> Cleanup Ergebnis ${apply ? "(APPLY)" : "(DRY-RUN)"} — Stichtag ${today}`
  );
  console.log(`    expired (404/410/403 oder bekannte Auslaeufler): ${expired404}`);
  console.log(`    expired (Frist ueberschritten):                  ${expiredFrist}`);
  console.log(`    transient (5xx, uebersprungen):                  ${transient5xx}`);
  console.log(`    unchanged:                                        ${unchanged}`);
  console.log(`    errors (Netzwerk):                               ${errors}`);
  console.log(`    Gesamt Transitionen:                             ${transitions.length}`);

  const bundesGanztag = transitions.find((t) => t.id === "bundesweit-ganztag");
  const nrwbankSchule = transitions.find((t) => t.id === "nrwbank-moderne-schule");
  console.log(
    `\n    Test-Anker bundesweit-ganztag:     ${bundesGanztag?.reason ?? "NICHT GETROFFEN — Pruefe Override-Block"}`
  );
  console.log(
    `    Test-Anker nrwbank-moderne-schule: ${nrwbankSchule?.reason ?? "NICHT GETROFFEN — Pruefe Override-Block"}`
  );

  if (transitions.length > 0 && verbose) {
    console.log("\n==> Alle Transitionen:");
    for (const t of transitions) {
      console.log(`    ${t.id}: ${t.reason}`);
    }
  }

  if (apply) {
    console.log(`\n==> Schreibe ${transitions.length} Status-Updates...`);
    for (const t of transitions) {
      await markExpiredInQueue(t.id, t.reason);
    }
    console.log(`==> ${transitions.length} Eintraege auf status=expired migriert.`);
  } else {
    console.log(
      `\n==> Dry-run — keine Datei-Schreibvorgaenge. Mit --apply ausfuehren um zu persistieren.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
