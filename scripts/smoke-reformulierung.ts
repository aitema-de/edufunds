/**
 * Live-Smoke für P4-A Teil 1 (Absatz-Umformulierung). Prüft das EINZIGE Stück
 * mit echtem LLM-Verhalten — die Paraphrase — an ein paar realen Passagen:
 *   (a) Fakt-Erhalt: keine eingeführten Zahlen/Eigennamen (Gate-Backstop grün),
 *   (b) Register-Wechsel: die Variante unterscheidet sich tatsächlich (bei
 *       „kuerzer" zusätzlich: nicht länger als das Original).
 *
 * Kosten: ~wenige Cent (kleine Einzel-Passagen, mistral-small).
 *   npx tsx --env-file=.env.local scripts/smoke-reformulierung.ts
 */
import { generateText, MODEL_PRO } from "../lib/wizard/llm";
import {
  reformulatePassage,
  bewerteVariante,
  type ReformulierDirektive,
} from "../lib/reformulierung";
import type { WizardFacts } from "../lib/wizard/types";

const PASSAGEN = [
  "Unser Verein möchte im kommenden Schuljahr ein wöchentliches Nachmittagsangebot für Grundschulkinder aus dem Stadtteil aufbauen, das Bewegung, gemeinsames Kochen und Hausaufgabenhilfe verbindet und so die Teilhabe benachteiligter Familien stärkt.",
  "Das Vorhaben adressiert einen konkreten Bedarf, weil im Quartier bislang kein niedrigschwelliges, kostenfreies Angebot für diese Altersgruppe existiert und viele Familien sich kommerzielle Nachmittagsbetreuung nicht leisten können.",
];

const DIREKTIVEN: ReformulierDirektive[] = ["kuerzer", "foermlicher", "konkreter"];
const facts: WizardFacts = {} as WizardFacts;
const deps = {
  generate: (system: string, user: string) =>
    generateText(MODEL_PRO, system, user).then((r) => ({ value: r.value })),
};

async function main() {
  let fails = 0;
  let n = 0;
  for (const passage of PASSAGEN) {
    for (const direktive of DIREKTIVEN) {
      n++;
      const r = await reformulatePassage({ passage, direktive, facts }, deps);
      if (!r.ok) {
        console.log(`❌ [${direktive}] ok=false (grund=${r.grund})\n   „${passage.slice(0, 60)}…"`);
        fails++;
        continue;
      }
      // (a) Fakt-Erhalt unabhängig nachprüfen (bewerteVariante ist auch der Gate im Flow).
      const befund = bewerteVariante(passage, r.variante, facts);
      const faktErhalten = befund.ok;
      // (b) Register-Wechsel: verändert; bei kuerzer zusätzlich nicht länger.
      const veraendert = r.variante.trim() !== passage.trim();
      const laengenOk = direktive !== "kuerzer" || r.variante.length <= passage.length + 5;
      const ok = faktErhalten && veraendert && laengenOk;
      if (!ok) fails++;
      console.log(
        `${ok ? "✅" : "❌"} [${direktive}] fakt-erhalten=${faktErhalten} verändert=${veraendert} längen-ok=${laengenOk}`
      );
      console.log(`   vorher (${passage.length}): „${passage.slice(0, 70)}…"`);
      console.log(`   nachher (${r.variante.length}): „${r.variante.slice(0, 70)}…"`);
    }
  }
  console.log(`\n${fails === 0 ? "✅ SMOKE GRÜN" : `❌ SMOKE ROT (${fails}/${n} Fälle)`}`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Smoke fehlgeschlagen:", e);
  process.exit(1);
});
