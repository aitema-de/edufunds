/**
 * Cron-Endpoint für das Löschkonzept (DSGVO Art. 5(1)e).
 *
 * Wird von einem Server-Cron periodisch aufgerufen (siehe
 * docs/legal/LOESCHKONZEPT.md). Geschützt über `CRON_SECRET` —
 * entweder Header `x-cron-key: <secret>` oder `Authorization: Bearer <secret>`.
 *
 *   POST /api/cron/retention            → wendet die Löschregeln an
 *   POST /api/cron/retention?dryRun=1   → nur zählen, nichts löschen (ROLLBACK)
 *   GET  /api/cron/retention?dryRun=1   → bequemer Dry-Run-Check
 */

import { NextResponse } from "next/server";
import { withClient } from "@/lib/db";
import { runRetention } from "@/lib/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const headerKey = request.headers.get("x-cron-key");
  const auth = request.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : undefined;
  return headerKey === secret || bearer === secret;
}

async function handle(request: Request): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    console.error("[cron/retention] CRON_SECRET ist nicht konfiguriert");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  try {
    const run = await withClient((client) =>
      runRetention(client, { now: new Date(), dryRun })
    );
    console.log(
      `[cron/retention] dryRun=${run.dryRun} betroffen=${run.totalAffected} ` +
        run.results.map((r) => `${r.name}=${r.affected}`).join(" ")
    );
    return NextResponse.json(run);
  } catch (err) {
    console.error("[cron/retention] Fehler:", err);
    return NextResponse.json({ error: "retention_failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
