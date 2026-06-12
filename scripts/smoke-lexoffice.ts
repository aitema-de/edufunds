/**
 * Smoke-Test fuer lib/lexoffice/client.ts — verifiziert Auth + Request-Shape
 * gegen die echte lexoffice-API, OHNE eine echte (finalisierte) Rechnung zu
 * erzeugen: legt einen ENTWURF an (finalize=false, keine Nummer, GoBD-neutral)
 * und loescht ihn wieder.
 *
 * Nutzung: `npx tsx --env-file=.env.local scripts/smoke-lexoffice.ts`
 */
import { createInvoice, deleteInvoice, lexofficeConfigured } from "../lib/lexoffice/client";

async function main() {
  if (!lexofficeConfigured()) {
    console.error("LEXOFFICE_API_KEY fehlt in der Umgebung.");
    process.exit(1);
  }
  console.log("[1/2] Lege Test-ENTWURF an (finalize=false, wird danach geloescht)...");
  const inv = await createInvoice(
    {
      address: { name: "EduFunds API-Test (loeschbar)", street: "Teststr. 1", zip: "10115", city: "Berlin" },
      lineItemName: "EduFunds — Foerderantrag (API-Test)",
      grossAmount: 29.9,
      taxRatePercentage: 19,
    },
    { finalize: false }
  );
  console.log(`  -> OK, Entwurf erzeugt: id=${inv.id}`);

  console.log("[2/2] Loesche Entwurf wieder...");
  try {
    await deleteInvoice(inv.id);
    console.log("  -> OK, Entwurf geloescht.");
  } catch (e) {
    console.warn(
      `  -> Loeschen fehlgeschlagen (${e instanceof Error ? e.message : e}). ` +
        `Bitte den Entwurf ${inv.id} ggf. manuell in lexoffice loeschen.`
    );
  }
  console.log("\nOK — Auth + Rechnungs-Request-Format gegen lexoffice bestaetigt.");
}

main().catch((e) => {
  console.error("FEHLER:", e instanceof Error ? e.message : e);
  process.exit(1);
});
