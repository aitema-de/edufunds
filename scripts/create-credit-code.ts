/**
 * Erzeugt einen Kontingent-Code (Modell B1) — fuer die manuelle/rechnungsbasierte
 * Ausgabe an Schultraeger, bis der Self-Serve-Kauf (B3) steht.
 *
 * Nutzung:
 *   npx tsx --env-file=.env.local scripts/create-credit-code.ts \
 *     --credits 20 [--org "Schultraeger X"] [--email kontakt@traeger.de] \
 *     [--expires 2027-06-30] [--note "Rechnung RE-123"]
 */
import { createCreditCode } from "@/lib/wizard/credit-codes";
import { getPool } from "@/lib/db";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const creditsRaw = arg("credits");
  const credits = creditsRaw ? parseInt(creditsRaw, 10) : NaN;
  if (!Number.isInteger(credits) || credits <= 0) {
    console.error(
      'Usage: tsx scripts/create-credit-code.ts --credits <N> [--org "Name"] [--email x@y.de] [--expires YYYY-MM-DD] [--note "..."]'
    );
    process.exit(1);
  }

  const cc = await createCreditCode({
    creditsTotal: credits,
    orgName: arg("org"),
    purchaserEmail: arg("email"),
    expiresAt: arg("expires"),
    note: arg("note"),
    source: "manual",
  });

  console.log("\nKontingent-Code erstellt:\n");
  console.log("  Code:     " + cc.code);
  console.log("  Credits:  " + cc.creditsTotal);
  if (cc.orgName) console.log("  Traeger:  " + cc.orgName);
  if (cc.purchaserEmail) console.log("  E-Mail:   " + cc.purchaserEmail);
  if (cc.expiresAt) console.log("  Ablauf:   " + cc.expiresAt);
  console.log("");

  await getPool().end();
}

main().catch((e) => {
  console.error("FEHLER:", e instanceof Error ? e.message : e);
  process.exit(1);
});
