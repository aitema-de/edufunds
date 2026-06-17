import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";
import { markSessionPaid } from "@/lib/wizard/session";
import {
  fulfillQuotaCardPurchase,
  buildQuotaCardConfirmationEmail,
  buildQuotaCardAdminEmail,
  type QuotaCardResult,
} from "@/lib/payments/orders";
import { sendMail } from "@/lib/mail";
import { runInvoiceJob } from "@/lib/payments/invoice";
import { trustedAppUrl } from "@/lib/app-url";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "office@aitema.de";

/**
 * Org-/Vereinsname aus dem Stripe-Checkout-Custom-Field `organisation` (B2B —
 * Pflichtfeld). Fallback auf den customer_details.name, falls (Alt-Sessions) leer.
 */
function orgNameFromSession(cs: Stripe.Checkout.Session): string {
  const field = cs.custom_fields?.find((f) => f.key === "organisation");
  const fromField = field?.text?.value?.trim();
  return fromField || cs.customer_details?.name?.trim() || "Unbekannt";
}

/**
 * Verschickt die Bestaetigungs-/Admin-Mail fuer einen Kontingent-Kartenkauf (B3).
 * Best-effort: der Code steht bereits in der DB; Mailfehler werden geloggt.
 */
async function sendQuotaCardMails(result: QuotaCardResult): Promise<void> {
  if (result.email) {
    const confirm = buildQuotaCardConfirmationEmail(result);
    await sendMail(
      { to: result.email, subject: confirm.subject, html: confirm.html, text: confirm.text },
      "stripe/webhook"
    );
  }
  const admin = buildQuotaCardAdminEmail(result);
  await sendMail(
    { to: ADMIN_EMAIL, subject: admin.subject, html: admin.html, text: admin.text, replyTo: result.email },
    "stripe/webhook"
  );
}

export const runtime = "nodejs";
// Wichtig: Stripe braucht den ROHEN Body zur Signatur-Pruefung.
// Next.js App Router liefert den rohen Body via `await request.text()`.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe nicht konfiguriert" },
      { status: 503 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "stripe-signature Header fehlt" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe/webhook] Signatur-Pruefung fehlgeschlagen:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Audit-Trail: event.id ist von Stripe vergeben, kein Secret — sicher zu loggen (RESEARCH §1.2)
  console.log(`[stripe/webhook] event.id=${event.id} type=${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;

        // B3 — Self-Service-Kontingent per Karte: eigener Pfad, erzeugt einen
        // Kontingent-Code (idempotent pro Session) statt eine Wizard-Session zu
        // bezahlen.
        if (cs.metadata?.mode === "org_quota") {
          if (cs.payment_status !== "paid") {
            console.warn(
              `[stripe/webhook] org_quota, aber payment_status=${cs.payment_status} fuer ${cs.id}`
            );
            break;
          }
          const packId = (cs.metadata?.pack_id as string | undefined) ?? "";
          const result = await fulfillQuotaCardPurchase({
            stripeSessionId: cs.id,
            packId,
            orgName: (cs.metadata?.org_name as string | undefined) ?? undefined,
            email:
              cs.customer_details?.email ??
              (cs.metadata?.purchaser_email as string | undefined) ??
              undefined,
          });
          console.log(
            `[stripe/webhook] org_quota ${cs.id} -> code=${result.creditCode} ` +
              `credits=${result.credits} (alreadyExisted=${result.alreadyExisted})`
          );
          // Mail nur beim ERSTEN Verarbeiten (kein Doppelversand bei Retry).
          if (!result.alreadyExisted) {
            await sendQuotaCardMails(result);
          }
          break;
        }

        const token = (cs.metadata?.wizard_session_token as string | undefined) ?? null;
        if (!token) {
          console.warn("[stripe/webhook] checkout.session.completed ohne wizard_session_token");
          break;
        }
        if (cs.payment_status !== "paid") {
          console.warn(
            `[stripe/webhook] checkout.session.completed, aber payment_status=${cs.payment_status} fuer ${token}`
          );
          break;
        }
        const updated = await markSessionPaid(token, {
          stripeSessionId: cs.id,
          stripeCustomerEmail: cs.customer_details?.email ?? undefined,
          tier: (cs.metadata?.tier as string | undefined) ?? "einzelantrag",
          source: "card",
        });
        console.log(
          `[stripe/webhook] Session ${token} -> paid (paidToken=${updated.paidToken})`
        );
        // PAY-03: lexoffice-Rechnung + §312i-Bestelleingangsbestätigung.
        // Best-effort + idempotent (runInvoiceJob wirft nicht, Marker via DB) —
        // ein lexoffice-/Mailfehler darf den bereits bezahlten Kauf nicht 500en.
        const addr = cs.customer_details?.address;
        // Download-Link für die Bestätigungsmail aus VERTRAUENSWÜRDIGER Server-URL
        // (nie aus Request-Headern — Host-Header-Injection-Schutz). Fehlt die Konfig,
        // bleibt downloadUrl undefined und die Mail geht fail-safe ohne Link raus.
        const appBase = trustedAppUrl();
        const downloadUrl =
          appBase && updated.paidToken
            ? `${appBase}/antrag/download/${updated.paidToken}`
            : undefined;
        await runInvoiceJob({
          stripeSessionId: cs.id,
          email: cs.customer_details?.email ?? undefined,
          orgName: orgNameFromSession(cs),
          address: {
            supplement: cs.customer_details?.name ?? undefined,
            street: [addr?.line1, addr?.line2].filter(Boolean).join(", ") || undefined,
            zip: addr?.postal_code ?? undefined,
            city: addr?.city ?? undefined,
            countryCode: addr?.country ?? undefined,
          },
          vatId: cs.customer_details?.tax_ids?.[0]?.value ?? undefined,
          grossCents: cs.amount_total ?? 2990,
          downloadUrl,
        });
        break;
      }
      case "checkout.session.expired": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const token = (cs.metadata?.wizard_session_token as string | undefined) ?? null;
        console.log(`[stripe/webhook] checkout.session.expired fuer ${token ?? "unknown"}`);
        // TODO PAY-03 (State-Hook): Session-Hinweis "Zahlung abgebrochen — neu starten?" im UI rendern.
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        console.log(`[stripe/webhook] charge.refunded ${ch.id}`);
        // TODO PAY-03 (DB-Schema-Hook): paid_token invalidieren — Migration 004 erweitert ki_antraege.status um "refunded".
        break;
      }
      case "checkout.session.async_payment_failed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const token = (cs.metadata?.wizard_session_token as string | undefined) ?? null;
        console.log(`[stripe/webhook] async_payment_failed fuer ${token ?? "unknown"}`);
        // TODO PAY-03 (Mail-Hook): User benachrichtigen, Retry-Pfad anbieten.
        break;
      }
      default:
        // andere Events ignorieren (payment_intent.*, invoice.* etc.)
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] Handler-Fehler:", err);
    return NextResponse.json(
      { error: "handler failed" },
      { status: 500 }
    );
  }
}
