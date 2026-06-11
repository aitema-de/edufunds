/**
 * Verifiziert den Architektur-Fix "unbezifferter Finanzplan" live (LLM, kein Server).
 * Lauf: npx tsx --env-file=.env.local scripts/verify-unbeziffert.ts
 * Braucht nur DEEPSEEK_API_KEY. Sparsamer Input OHNE Budget -> erwartet:
 *  - finanzplan.unbeziffert === true, posten=[], kostenrahmen gefuellt
 *  - finalText enthaelt KEINE konkreten Euro-Betraege
 */
import { runPipeline } from "@/lib/wizard/pipeline";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import foerderprogramme from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { WizardFacts, WizardMessage } from "@/lib/wizard/types";

const programme = foerderprogramme as Foerderprogramm[];

function msgs(answers: string[]): WizardMessage[] {
  const out: WizardMessage[] = [];
  answers.forEach((a, i) => {
    out.push({ id: `q${i}`, at: "t", role: "ai", kind: "question", content: `Frage ${i + 1}` });
    out.push({ id: `a${i}`, at: "t", role: "user", kind: "answer", content: a });
  });
  return out;
}

// Euro-Betraege im Text (z. B. "15.000 EUR", "500 €")
const EURO_RE = /\d[\d.\s]*\s*(?:€|eur\b|euro)/gi;

async function main() {
  const programm = programme.find((p) => p.id === "bmbf-digitalpakt-2")!;
  const facts: WizardFacts = {
    schule: { name: "Grundschule am Lindenpark", typ: "Grundschule", bundesland: "DE-BE", schuelerzahl: 200 },
    projekt: {
      kurzbeschreibung: "Tablets fuer den Unterricht anschaffen, damit Kinder besser lernen.",
      zielgruppe: "Grundschulkinder Klassen 1-4",
      aktivitaeten: ["Tablet-Einsatz im Unterricht"],
    },
    // KEIN budget -> Kostenbasis fehlt
  } as never;
  const answers = [
    "Wir haben ein paar aeltere Beamer und einen alten Computerraum.",
    "So ungefaehr 200 Kinder und 15 Lehrkraefte.",
    "Apps fuer Mathe oder Deutsch, digitales Lernen allgemein.",
    "So zwanzig Tablets ungefaehr, vielleicht auch mehr.",
    "Preis ist noch nicht klar, muessten wir schauen.",
    "Mit dem Schultraeger haben wir noch nicht gesprochen.",
  ];

  const richtlinie = await loadRichtlinie(programm.id);
  console.log("Starte Pipeline (sparsamer Input ohne Budget)...");
  const { artefacts } = await runPipeline(programm, facts, richtlinie, undefined, msgs(answers));

  const fp = artefacts.finanzplan;
  const finalText = artefacts.finalText ?? "";
  const euroHits = [...finalText.matchAll(EURO_RE)].map((m) => m[0].trim());

  console.log("\n=== ERGEBNIS ===");
  console.log("finanzplan.unbeziffert:", fp?.unbeziffert === true ? "✅ true" : `❌ ${fp?.unbeziffert}`);
  console.log("posten:", fp?.posten?.length ?? "?", fp?.posten?.length === 0 ? "✅ leer" : "❌ enthaelt Posten");
  console.log("kostenrahmen:", fp?.kostenrahmen?.length ?? 0, "Positionen");
  (fp?.kostenrahmen ?? []).forEach((k) => console.log("   •", k));
  console.log("finanzplan.hinweise[0]:", fp?.hinweise?.[0] ?? "(keine)");
  console.log("Euro-Betraege im finalText:", euroHits.length === 0 ? "✅ KEINE" : `❌ ${euroHits.length}: ${euroHits.slice(0, 8).join(", ")}`);
  console.log("\nfinalText (Auszug Finanz-/Kosten-Teil):");
  const idx = finalText.search(/finanz|kosten/i);
  console.log(finalText.slice(idx >= 0 ? idx : 0, (idx >= 0 ? idx : 0) + 500));
}

main().catch((e) => { console.error(e); process.exit(1); });
