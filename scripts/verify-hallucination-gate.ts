/**
 * Verifiziert das Halluzinations-Diff-Gate (Probe 09.06., Hebel 1) live
 * (LLM, kein Server). Lauf: npx tsx --env-file=.env.local scripts/verify-hallucination-gate.ts
 * Braucht nur DEEPSEEK_API_KEY. Sparsamer Input maximiert die Chance, dass die
 * Revision Zahlen/Eigennamen erfindet — das Gate muss sie erkennen, entschaerfen
 * und darf NIE verschlimmern (residual <= introducedBefore).
 */
import { runPipeline } from "@/lib/wizard/pipeline";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { buildAllowedCorpus, detectIntroduced } from "@/lib/wizard/hallucination-gate";
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

async function main() {
  const programm = programme.find((p) => p.id === "bmbf-digitalpakt-2")!;
  const facts: WizardFacts = {
    schule: { name: "Grundschule am Lindenpark", typ: "Grundschule", bundesland: "DE-BE", schuelerzahl: 200 },
    projekt: {
      kurzbeschreibung: "Tablets fuer den Unterricht anschaffen, damit Kinder besser lernen.",
      zielgruppe: "Grundschulkinder Klassen 1-4",
      aktivitaeten: ["Tablet-Einsatz im Unterricht"],
    },
  } as never;
  const answers = [
    "Wir haben ein paar aeltere Beamer und einen alten Computerraum.",
    "So ungefaehr 200 Kinder und 15 Lehrkraefte.",
    "Apps fuer Mathe oder Deutsch, digitales Lernen allgemein.",
    "So zwanzig Tablets ungefaehr.",
    "Preis ist noch nicht klar.",
    "Mit dem Schultraeger haben wir noch nicht gesprochen, Partner haben wir keine.",
  ];

  const richtlinie = await loadRichtlinie(programm.id);
  console.log("Starte Pipeline (sparsamer Input)...");
  const { artefacts } = await runPipeline(programm, facts, richtlinie, undefined, msgs(answers));

  const gate = artefacts.hallucinationGate;
  const finalText = artefacts.finalText ?? "";

  console.log("\n=== HALLUZINATIONS-GATE ===");
  if (!gate) {
    console.log("Gate hat keine Treffer gemeldet (introducedBefore leer) — kein Repair noetig.");
  } else {
    console.log("introducedBefore:", gate.introducedBefore.length, "→", gate.introducedBefore.join(" | "));
    console.log("residual:        ", gate.residual.length, "→", gate.residual.join(" | "));
    console.log("repaired:        ", gate.repaired ? "✅ uebernommen" : "verworfen (kein Fortschritt)");
    const neverWorse = gate.residual.length <= gate.introducedBefore.length;
    console.log("nie verschlimmert (residual <= before):", neverWorse ? "✅" : "❌");
  }

  // Cross-Check: erfundene Treffer im AUSGELIEFERTEN finalText (sollten <= residual sein,
  // da spaetere Stages den Text nochmal aendern koennen — informativ).
  const draft = artefacts.sections?.map((s) => `${s.name}\n${s.text}`).join("\n") ?? "";
  const corpus = buildAllowedCorpus(draft, facts, answers);
  const inFinal = detectIntroduced(finalText, corpus);
  console.log("\nQuercheck am ausgelieferten finalText:");
  console.log("  ungedeckte Zahlen:  ", inFinal.numbers.length, inFinal.numbers.slice(0, 8).join(", "));
  console.log("  ungedeckte Namen:   ", inFinal.entities.length, inFinal.entities.slice(0, 8).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); });
