import { NextRequest, NextResponse } from "next/server";
import { markSessionPaid } from "@/lib/wizard/session";
import { readJsonBody } from "@/lib/json-body";

/**
 * Dev-Only: markiert eine Session als bezahlt, ohne Stripe zu kontaktieren.
 * Wird NUR aktiviert, wenn NEXT_PUBLIC_PAYWALL_DEV_MOCK === "1".
 * So koennen wir den Download-Flow testen, bevor Stripe produktiv ist.
 */
export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_PAYWALL_DEV_MOCK !== "1") {
    return NextResponse.json({ error: "dev-mock nicht aktiviert" }, { status: 403 });
  }
  try {
    const gelesen = await readJsonBody<{ sessionToken?: string; tier?: string }>(req);
    if (!gelesen.ok) return gelesen.response;
    const { sessionToken, tier } = gelesen.body;
    if (!sessionToken) {
      return NextResponse.json({ error: "sessionToken erforderlich" }, { status: 400 });
    }
    const updated = await markSessionPaid(sessionToken, {
      stripeSessionId: `mock_${Date.now()}`,
      tier: tier ?? "einzelantrag",
    });
    return NextResponse.json({ paidToken: updated.paidToken });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mock-Pay fehlgeschlagen" },
      { status: 500 }
    );
  }
}
