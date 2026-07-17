/**
 * Holt die lexoffice-Rechnung fuer einen bereits bezahlten Kauf nach.
 *
 * WOZU: `runInvoiceJob` lief bis 17.07.2026 ausschliesslich im Stripe-Webhook —
 * es gab keinen Admin-Endpunkt und kein Skript. Scheiterte die Rechnung
 * (lexoffice down, Key abgelaufen, Netz weg), gab es KEINEN Reparaturweg. Genau
 * das passierte am 17.07.2026: abgelaufener Key -> 401 -> Antrag 35 bezahlt,
 * ohne Rechnung.
 *
 * WIE: Die Session wird bei Stripe frisch geladen (dieselbe Quelle wie im
 * Webhook) und durch dieselbe Abbildung geschickt (`buildInvoiceJobParams`).
 * Der Nachlauf erzeugt damit exakt die Rechnung, die der Webhook erzeugt haette.
 *
 * SICHERHEIT:
 *  - Standard ist ein TROCKENLAUF. Schreiben nur mit `--doit`.
 *  - Prueft vorher, dass die Session bei Stripe wirklich als BEZAHLT gilt —
 *    nie eine Rechnung fuer unbezahlte Ware.
 *  - Bricht ab, wenn bereits eine Rechnung existiert (invoice_created_at), es
 *    sei denn `--force` (nur nach bewusster Pruefung; erzeugt sonst Dubletten
 *    und verbrennt GoBD-relevante Nummern).
 *  - LEXOFFICE_FINALIZE=false erzeugt nur einen Entwurf. lexoffice kann
 *    Rechnungen NICHT per API loeschen (DELETE -> 404) — jeder Lauf hinterlaesst
 *    also einen Beleg im Live-Konto. Es gibt keine Sandbox.
 *
 * NUTZUNG (auf dem Server, wo .env.production liegt):
 *   npx tsx --env-file=.env.production scripts/rechnung-nachholen.ts <stripe_session_id>
 *   npx tsx --env-file=.env.production scripts/rechnung-nachholen.ts <id> --doit
 */
import { getStripe, stripeConfigured } from "../lib/stripe/client";
import { query } from "../lib/db";
import { buildInvoiceJobParams, runInvoiceJob, invoiceFinalizeEnabled } from "../lib/payments/invoice";
import { lexofficeConfigured } from "../lib/lexoffice/client";

type Zeile = {
  id: number;
  status: string;
  paid_token: string | null;
  invoice_created_at: string | null;
  invoice_number: string | null;
  invoice_lexoffice_id: string | null;
};

function abbruch(msg: string): never {
  console.error(`\nABBRUCH: ${msg}`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const sessionId = args.find((a) => !a.startsWith("--"));
  const doit = args.includes("--doit");
  const force = args.includes("--force");

  if (!sessionId) {
    abbruch(
      "Keine Stripe-Session-ID angegeben.\n" +
        "  npx tsx --env-file=.env.production scripts/rechnung-nachholen.ts cs_live_... [--doit] [--force]"
    );
  }
  if (!stripeConfigured()) abbruch("STRIPE_SECRET_KEY fehlt in der Umgebung.");
  if (!lexofficeConfigured()) abbruch("LEXOFFICE_API_KEY fehlt in der Umgebung.");

  console.log(`Session:  ${sessionId}`);
  console.log(`Modus:    ${doit ? "SCHREIBEN (--doit)" : "TROCKENLAUF (kein --doit)"}`);
  console.log(`lexoffice: ${invoiceFinalizeEnabled() ? "FINALISIEREN (echte Nummer + PDF)" : "nur ENTWURF (LEXOFFICE_FINALIZE=false)"}`);

  // 1) DB-Zustand
  const res = await query<Zeile>(
    `SELECT id, status, paid_token, invoice_created_at::text, invoice_number, invoice_lexoffice_id
       FROM ki_antraege WHERE stripe_session_id = $1 LIMIT 1`,
    [sessionId]
  );
  const zeile = res.rows[0];
  if (!zeile) abbruch(`Kein Antrag mit stripe_session_id=${sessionId} in der DB.`);

  console.log(`\nAntrag ${zeile.id}: status=${zeile.status}`);
  console.log(`  invoice_created_at:   ${zeile.invoice_created_at ?? "— (offen)"}`);
  console.log(`  invoice_number:       ${zeile.invoice_number ?? "—"}`);
  console.log(`  invoice_lexoffice_id: ${zeile.invoice_lexoffice_id ?? "—"}`);

  if (zeile.invoice_lexoffice_id && !force) {
    abbruch(
      `Es existiert bereits eine Rechnung (${zeile.invoice_number ?? zeile.invoice_lexoffice_id}).\n` +
        `  Ein zweiter Lauf erzeugt eine DUBLETTE. Nur mit --force, wenn du das wirklich willst.`
    );
  }
  if (zeile.invoice_created_at && !zeile.invoice_lexoffice_id) {
    console.warn(
      `\n  HINWEIS: invoice_created_at ist gesetzt, aber es gibt keine Rechnung.\n` +
        `  Das ist die Signatur des Marker-Bugs (vor 17.07.2026 markierte auch ein\n` +
        `  FEHLSCHLAG als erledigt). Der Nachlauf setzt das Feld beim Erfolg neu.`
    );
    if (!force) {
      abbruch("Zum Nachholen dieses Alt-Falls bitte --force setzen (Marker wird ueberschrieben).");
    }
  }

  // 2) Stripe als Wahrheit — nie einer DB-Spalte glauben, wenn es um Geld geht.
  const cs = await getStripe().checkout.sessions.retrieve(sessionId);
  console.log(`\nStripe: payment_status=${cs.payment_status} amount_total=${(cs.amount_total ?? 0) / 100} ${cs.currency?.toUpperCase()}`);
  if (cs.payment_status !== "paid") {
    abbruch(`Session ist bei Stripe NICHT bezahlt (payment_status=${cs.payment_status}). Keine Rechnung.`);
  }

  // 3) Dieselbe Abbildung wie im Webhook — kein Nachbau.
  const params = buildInvoiceJobParams(cs, zeile.paid_token);
  console.log(`\nRechnungsdaten (wie der Webhook sie gebaut haette):`);
  console.log(`  Empfaenger:  ${params.orgName}`);
  console.log(`  Adresse:     ${[params.address.street, params.address.zip, params.address.city].filter(Boolean).join(", ") || "—"}`);
  console.log(`  E-Mail:      ${params.email ?? "— (keine Bestaetigungsmail)"}`);
  console.log(`  Betrag:      ${(params.grossCents / 100).toFixed(2)} EUR brutto`);
  console.log(`  USt-IdNr.:   ${params.vatId ?? "—"}`);
  console.log(`  Download:    ${params.downloadUrl ?? "— (kein Link in der Mail)"}`);

  if (!doit) {
    console.log(`\nTROCKENLAUF — nichts geschrieben. Mit --doit ausfuehren.`);
    return;
  }

  // 4) Marker loesen, falls ein Alt-Fehlschlag ihn blockiert (isProcessed haengt daran).
  if (zeile.invoice_created_at && !zeile.invoice_lexoffice_id && force) {
    await query(`UPDATE ki_antraege SET invoice_created_at = NULL WHERE stripe_session_id = $1`, [sessionId]);
    console.log(`\n  invoice_created_at zurueckgesetzt (Alt-Fehlschlag) — Nachlauf ist jetzt moeglich.`);
  }

  console.log(`\nStarte Rechnungslauf ...`);
  await runInvoiceJob(params);

  // 5) Ergebnis gegen die DB pruefen — nicht dem Log glauben.
  const nach = await query<Zeile>(
    `SELECT id, status, paid_token, invoice_created_at::text, invoice_number, invoice_lexoffice_id
       FROM ki_antraege WHERE stripe_session_id = $1 LIMIT 1`,
    [sessionId]
  );
  const z = nach.rows[0];
  console.log(`\nErgebnis:`);
  console.log(`  invoice_number:       ${z?.invoice_number ?? "— FEHLT"}`);
  console.log(`  invoice_lexoffice_id: ${z?.invoice_lexoffice_id ?? "— FEHLT"}`);
  console.log(`  invoice_created_at:   ${z?.invoice_created_at ?? "— FEHLT"}`);

  if (!z?.invoice_lexoffice_id) {
    abbruch("Rechnungslauf lief durch, aber es steht KEINE Rechnung in der DB. Logs pruefen (lexoffice-Fehler?).");
  }
  if (invoiceFinalizeEnabled() && !z.invoice_number) {
    abbruch("Rechnung erzeugt, aber ohne Nummer — trotz LEXOFFICE_FINALIZE=true. Bitte in lexoffice pruefen.");
  }
  console.log(`\nOK — Rechnung ${z.invoice_number ?? z.invoice_lexoffice_id} erzeugt.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nFEHLER:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
