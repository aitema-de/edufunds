/**
 * Smoke-Test fuer lib/wizard/llm.ts — verifiziert den aktiven Provider.
 * Nutzung: `npx tsx --env-file=.env.local scripts/smoke-llm.ts`
 */
import { generateJson, generateText, MODEL_INTERVIEW, MODEL_PIPELINE } from "../lib/wizard/llm";

interface PingResponse {
  greeting: string;
  language: string;
}

async function main() {
  const provider = process.env.LLM_PROVIDER ?? "deepseek";
  console.log(`Provider: ${provider}`);
  console.log(`Models:   interview=${MODEL_INTERVIEW}  pipeline=${MODEL_PIPELINE}`);
  console.log("");

  console.log("[1/2] generateJson via Interview-Modell ...");
  const t0 = Date.now();
  const json = await generateJson<PingResponse>(
    MODEL_INTERVIEW,
    "Antworte ausschliesslich mit gueltigem JSON nach dem geforderten Schema.",
    `Gib JSON mit den Feldern "greeting" (deutscher Gruss) und "language" ("de") zurueck.`
  );
  console.log(`  -> ${Date.now() - t0} ms`);
  console.log(`  -> value: ${JSON.stringify(json.value)}`);
  console.log(`  -> usage: in=${json.usage.promptTokens} out=${json.usage.candidatesTokens}`);
  console.log("");

  console.log("[2/2] generateText via Pipeline-Modell ...");
  const t1 = Date.now();
  const text = await generateText(
    MODEL_PIPELINE,
    "Du bist praezise und antwortest auf Deutsch.",
    "Schreibe einen Satz mit maximal 15 Woertern, der bestaetigt dass dieser Test funktioniert."
  );
  console.log(`  -> ${Date.now() - t1} ms`);
  console.log(`  -> value: ${text.value}`);
  console.log(`  -> usage: in=${text.usage.promptTokens} out=${text.usage.candidatesTokens}`);
  console.log("");

  console.log("OK — Provider antwortet, JSON-Mode funktioniert, Text-Mode funktioniert.");
}

main().catch((err) => {
  console.error("SMOKE FAIL:", err);
  process.exit(1);
});
