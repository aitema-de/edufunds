/**
 * Live-Smoke des Vorschlags-Modells (A1+A2+B1, Produktvision 2026-06-10).
 * Lauf: npx tsx --env-file=.env.local scripts/verify-vorschlag-modell.ts
 * Braucht nur DEEPSEEK_API_KEY (kein Server/DB). Spärlicher Input → der Assistent
 * soll AKTIV ausgestalten: bezifferter Finanzplan mit als Vorschlag markierten
 * Beträgen (A1), FV behält Vorschläge / neutralisiert nur Widersprüche (A2),
 * Text mit fachlicher Substanz/Theorie statt gelöschter Lücken (B1).
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

async function main() {
  const programm = programme.find((p) => p.id === "bmbf-digitalpakt-2")!;
  const facts: WizardFacts = {
    schule: { name: "Grundschule am Lindenpark", typ: "Grundschule", bundesland: "DE-BE", schuelerzahl: 200 },
    projekt: { kurzbeschreibung: "Wir wollen was mit Tablets fuer besseres Lernen machen.", zielgruppe: "Klassen 1-4" },
  } as never;
  const answers = [
    "So ungefaehr 200 Kinder, genaue Zahl weiss ich nicht.",
    "Tablets halt, fuer Mathe und Deutsch vielleicht.",
    "Budget? Keine Ahnung, so ein paar tausend Euro vielleicht.",
    "Mit dem Schultraeger haben wir noch nicht gesprochen.",
    "Externe Partner haben wir keine.",
  ];

  const richtlinie = await loadRichtlinie(programm.id);
  console.log("Starte Pipeline (spaerlicher Input)...");
  const { artefacts } = await runPipeline(programm, facts, richtlinie, undefined, msgs(answers));

  console.log("\n=== A1: FINANZPLAN (Vorschlags-Markierung) ===");
  const fp = artefacts.finanzplan;
  if (fp?.posten?.length) {
    fp.posten.forEach((p) =>
      console.log(`  ${p.istVorschlag ? "⟨Vorschlag⟩" : "[belegt]   "} ${p.betragEur} € — ${p.bezeichnung}`)
    );
    const summe = fp.posten.reduce((s, p) => s + p.betragEur, 0);
    console.log(`  Summe: ${summe} € · unbeziffert=${!!fp.unbeziffert} · Vorschläge: ${fp.posten.filter((p) => p.istVorschlag).length}/${fp.posten.length}`);
  } else {
    console.log("  (keine Posten / unbeziffert=" + !!fp?.unbeziffert + ")");
  }

  console.log("\n=== A2: FAKT-VERIFIKATION (dreistufig) ===");
  const fv = artefacts.factVerification;
  if (!fv) console.log("  (keine Treffer)");
  else {
    console.log("  neutralisiert:", fv.neutralisiert.length, fv.neutralisiert.map((s) => `\n    ✗ ${s}`).join(""));
    console.log("  vorschlaege (behalten):", fv.vorschlaege.length, fv.vorschlaege.map((s) => `\n    ⟨Vorschlag⟩ ${s}`).join(""));
    console.log("  repaired:", fv.repaired);
  }

  console.log("\n=== B1: TEXT-QUALITÄT (Stichprobe) ===");
  const text = artefacts.finalText ?? "";
  console.log("  Länge:", text.length, "Zeichen");
  const theorieMarker = /Bildungsgerechtigkeit|Teilhabe|Selbstwirksamkeit|partizipativ|handlungsorientiert|Wirkung|BNE|Medienkompetenz|Nachhaltigkeit/gi;
  const treffer = [...new Set((text.match(theorieMarker) ?? []).map((s) => s.toLowerCase()))];
  console.log("  Fachsprache/Theorie-Marker:", treffer.join(", ") || "(keine)");
  const todos = (text.match(/\[TODO/gi) ?? []).length;
  console.log("  [TODO]-Lücken-Marker:", todos);
  console.log("\n--- Auszug (erste 1200 Zeichen) ---\n" + text.slice(0, 1200));
}

main().catch((e) => { console.error(e); process.exit(1); });
