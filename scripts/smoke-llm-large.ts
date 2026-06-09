/**
 * Smoke-Test fuer DeepSeek mit ~10k-Token-Prompt
 * (entspricht der Last des Matcher-Endpunkts).
 */
import fs from "fs";
import { generateJson, MODEL_INTERVIEW } from "../lib/wizard/llm";

interface Match {
  matches: Array<{ id: string; score: number; begruendung: string }>;
}

async function main() {
  const programme = JSON.parse(fs.readFileSync("data/foerderprogramme.json", "utf-8"));
  const filtered = programme.filter((x: any) => x.status !== "abgelaufen" && x.kiAntragGeeignet);
  const cards = filtered.slice(0, 85).map((x: any) => ({
    id: x.id,
    name: x.name,
    typ: x.foerdergeberTyp,
    geber: x.foerdergeber,
    foerdersumme: x.foerdersummeText,
    frist: x.bewerbungsfristText,
    kategorien: x.kategorien,
    kurz: x.kurzbeschreibung,
  }));

  const userPrompt = `ANLIEGEN: Schul-Bibliothek mit digitalen Medien an Grundschule Berlin, Budget 15000 EUR.

KANDIDATENLISTE (${cards.length} Programme):
${JSON.stringify(cards)}

Finde die maximal 5 passendsten und begruende.`;

  console.log(`Prompt-Laenge: ${userPrompt.length} chars (~${Math.round(userPrompt.length / 4)} tokens)`);
  console.log(`Modell: ${MODEL_INTERVIEW}`);
  console.log("Starte Call ...");

  const t0 = Date.now();
  const res = await generateJson<Match>(
    MODEL_INTERVIEW,
    'Du bist ein praeziser Foerder-Matcher. Antworte ausschliesslich mit JSON: {"matches":[{"id":"...","score":0..100,"begruendung":"..."}]}',
    userPrompt
  );
  console.log(`-> ${Date.now() - t0} ms`);
  console.log(`-> Anzahl Matches: ${res.value.matches?.length ?? 0}`);
  console.log(`-> Top-3:`);
  for (const m of (res.value.matches ?? []).slice(0, 3)) {
    console.log(`     [${m.score}] ${m.id}: ${m.begruendung?.slice(0, 80)}`);
  }
  console.log(`-> Tokens: in=${res.usage.promptTokens} out=${res.usage.candidatesTokens}`);
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
