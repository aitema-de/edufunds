/**
 * Verifiziert den Fakt-Verifikations-Pass (Probe 09.06., Hebel 1b) live
 * (LLM, kein Server). Lauf: npx tsx --env-file=.env.local scripts/verify-fact-verification.ts
 * Braucht nur DEEPSEEK_API_KEY. Sparsamer Input maximiert die Chance, dass die
 * Pipeline NARRATIVE Fakten erfindet (Partner-Rollen, Termine, Zusagen, Kanaele),
 * die das Zahlen-Gate NICHT faengt — der Fakt-Pass muss sie gegen die Nutzer-
 * Ground-Truth erkennen, entschaerfen und darf NIE verschlimmern.
 *
 * Teil A: voller Pipeline-Lauf → factVerification-Artefakt.
 * Teil B: isolierter verifyFacts-Direkttest mit einem klar erfundenen Text.
 */
import { runPipeline } from "@/lib/wizard/pipeline";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import {
  buildGroundTruth,
  buildProgrammKontext,
  verifyFacts,
} from "@/lib/wizard/fact-verification";
import { MODEL_FLASH, MODEL_PRO, generateJson, generateText } from "@/lib/wizard/llm";
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
    "Preis ist noch nicht klar, Partner haben wir keine, mit dem Schultraeger noch nicht gesprochen.",
  ];

  // === Teil A: voller Pipeline-Lauf ===
  const richtlinie = await loadRichtlinie(programm.id);
  console.log("Teil A — Starte Pipeline (sparsamer Input)...");
  const { artefacts } = await runPipeline(programm, facts, richtlinie, undefined, msgs(answers));

  const fv = artefacts.factVerification;
  console.log("\n=== FAKT-VERIFIKATION (Pipeline) ===");
  if (!fv) {
    console.log("Keine ungedeckten Behauptungen erkannt (oder Ground-Truth zu duenn → uebersprungen).");
  } else {
    console.log("neutralisiert:", fv.neutralisiert.length);
    fv.neutralisiert.forEach((f) => console.log("   ✗ " + f));
    console.log("vorschlaege (behalten):", fv.vorschlaege.length);
    fv.vorschlaege.forEach((f) => console.log("   ⟨Vorschlag⟩ " + f));
    console.log("remaining:", fv.remaining.length, fv.remaining.join(" | "));
    console.log("repaired: ", fv.repaired ? "✅ uebernommen" : "verworfen (kein Fortschritt)");
    const neverWorse = fv.remaining.length <= fv.neutralisiert.length;
    console.log("nie verschlimmert (remaining <= neutralisiert):", neverWorse ? "✅" : "❌");
  }

  // === Teil B: isolierter Direkttest mit klar erfundenem Text ===
  console.log("\nTeil B — verifyFacts auf bewusst erfundenem Text...");
  const erfundenerText = `# Digitales Lernen an der Grundschule am Lindenpark

## Ausgangslage
Die Grundschule am Lindenpark mit rund 200 Kindern moechte den Unterricht digitalisieren.

## Vorhaben
In Kooperation mit dem oertlichen Medienzentrum und der Buergerstiftung Lindenpark statten wir alle acht Klassen mit Tablets aus. Der Schultraeger hat die Anschaffung bereits zugesagt. Ab dem 1. September 2026 starten woechentliche Tablet-Stunden; die Ergebnisse verbreiten wir ueber den Schul-Newsletter und die Lokalpresse.`;

  const groundTruth = buildGroundTruth(facts, answers);
  const res = await verifyFacts(erfundenerText, groundTruth, buildProgrammKontext(programm), {
    detect: (system, user) => generateJson<unknown>(MODEL_FLASH, system, user, { maxTokens: 4000 }),
    revise: (system, user) => generateText(MODEL_PRO, system, user),
    models: { detect: MODEL_FLASH, revise: MODEL_PRO },
  });
  console.log("neutralisiert:", res.neutralisiert.length);
  res.neutralisiert.forEach((f) => console.log("   ✗ " + f));
  console.log("vorschlaege (behalten):", res.vorschlaege.length);
  res.vorschlaege.forEach((f) => console.log("   ⟨Vorschlag⟩ " + f));
  console.log("repaired:", res.repaired ? "✅ uebernommen" : "verworfen");
  console.log("remaining:", res.remaining.length, res.remaining.join(" | "));
  console.log("\n--- bereinigter Text (Teil B) ---\n" + res.finalText);
}

main().catch((e) => { console.error(e); process.exit(1); });
