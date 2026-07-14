/**
 * Cron-Endpoint für den Mahnlauf.
 *
 * Der Rechnungskauf schaltet sofort frei, bevor Geld geflossen ist — ohne diesen
 * Lauf bemerkt niemand, wenn nie bezahlt wird. Geschützt über `CRON_SECRET`
 * (Header `x-cron-key` oder `Authorization: Bearer …`), identisch zu
 * /api/cron/retention.
 *
 *   POST /api/cron/dunning            → erinnert / mahnt / sperrt
 *   POST /api/cron/dunning?dryRun=1   → nur ermitteln, nichts versenden/sperren
 *   GET  /api/cron/dunning?dryRun=1   → bequemer Dry-Run-Check
 *
 * ⚠️ Wie bei /api/cron/retention: Die Coming-Soon-nginx (Traefik-Prio 1000)
 * reicht /api/cron/* NICHT durch — der Server-Cron muss den Endpunkt
 * container-intern aufrufen (docker exec → localhost:3000), sonst laeuft ein
 * externer curl in ein stilles 405.
 */
import { NextResponse } from "next/server";
import { secureEquals } from "@/lib/secure-compare";
import { runDunning } from "@/lib/payments/dunning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const headerKey = request.headers.get("x-cron-key");
  const auth = request.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : undefined;
  return secureEquals(headerKey, secret) || secureEquals(bearer, secret);
}

async function handle(request: Request): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    console.error("[cron/dunning] CRON_SECRET ist nicht konfiguriert");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  try {
    const run = await runDunning({ now: new Date(), dryRun });
    console.log(
      `[cron/dunning] dryRun=${run.dryRun} erinnert=${run.erinnert.length} ` +
        `gemahnt=${run.gemahnt.length} gesperrt=${run.gesperrt.length} ` +
        `fehlgeschlagen=${run.fehlgeschlagen.length}`
    );
    if (run.fehlgeschlagen.length > 0) {
      // Kein stiller Ausfall: hier wurde NICHT gemahnt und NICHT gesperrt.
      console.warn(
        `[cron/dunning] Mailversand fehlgeschlagen fuer: ${run.fehlgeschlagen.join(", ")} — ` +
          `Zustand unveraendert, naechster Lauf versucht es erneut.`
      );
    }
    return NextResponse.json(run);
  } catch (err) {
    console.error("[cron/dunning] Fehler:", err);
    return NextResponse.json({ error: "dunning_failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
