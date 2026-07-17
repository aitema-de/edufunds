/**
 * Smoke-Test fuer lib/lexoffice/client.ts — verifiziert Auth + Request-Shape
 * gegen die echte lexoffice-API, ohne eine FINALISIERTE Rechnung zu erzeugen:
 * legt einen ENTWURF an (finalize=false).
 *
 * ⚠️ DER ENTWURF BLEIBT STEHEN UND MUSS VON HAND GELOESCHT WERDEN.
 *
 * Hier stand bis 17.07.2026 "und loescht ihn wieder". Das war falsch: lexoffice
 * bietet KEIN Loeschen von Rechnungen ueber die API — weder
 * `DELETE /v1/invoices/{id}` noch `DELETE /v1/vouchers/{id}`, beide antworten
 * 404. Das Aufraeumen konnte also nie funktionieren; jeder Lauf hinterliess
 * unbemerkt einen Beleg im LIVE-Konto (es gibt keine Sandbox), und der Entwurf
 * zieht dabei bereits eine Rechnungsnummer.
 *
 * Deshalb: Diesen Test nur laufen lassen, wenn es einen Grund gibt (z. B. nach
 * einem Key-Wechsel), und den Entwurf danach in lexoffice loeschen —
 * Rechnungen → Entwuerfe.
 *
 * Nutzung: `npx tsx --env-file=.env.local scripts/smoke-lexoffice.ts`
 */
import { createInvoice, lexofficeConfigured } from "../lib/lexoffice/client";

async function main() {
  if (!lexofficeConfigured()) {
    console.error("LEXOFFICE_API_KEY fehlt in der Umgebung.");
    process.exit(1);
  }
  console.log("Lege Test-ENTWURF an (finalize=false)...");
  const inv = await createInvoice(
    {
      address: { name: "EduFunds API-Test (bitte loeschen)", street: "Teststr. 1", zip: "10115", city: "Berlin" },
      lineItemName: "EduFunds — Foerderantrag (API-Test)",
      grossAmount: 29.9,
      taxRatePercentage: 19,
    },
    { finalize: false }
  );
  console.log(`  -> OK, Entwurf erzeugt: id=${inv.id}`);
  console.log("\nOK — Auth + Rechnungs-Request-Format gegen lexoffice bestaetigt.");
  console.log(
    `\n⚠️  AUFRAEUMEN VON HAND: Entwurf ${inv.id} in lexoffice loeschen\n` +
      `    (Rechnungen → Entwuerfe). Die API kann das nicht — DELETE liefert 404.`
  );
}

main().catch((e) => {
  console.error("FEHLER:", e instanceof Error ? e.message : e);
  process.exit(1);
});
