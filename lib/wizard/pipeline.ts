import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { GenerationArtefacts, WizardFacts } from "./types";
import {
  OUTLINE_SYSTEM,
  SECTION_SYSTEM,
  CRITIQUE_SYSTEM,
  REVISION_SYSTEM,
  buildOutlinePrompt,
  buildSectionPrompt,
  buildCritiquePrompt,
  buildRevisionPrompt,
} from "./prompts";
import { MODEL_PRO, generateJson, generateText } from "./gemini";
import type { Usage } from "./pricing";
import type { Richtlinie } from "./richtlinien-schema";
import { generateFinanzplan } from "./finanzplan-generator";

type Outline = NonNullable<GenerationArtefacts["outline"]>;

export interface PipelineEvent {
  stage: "outline" | "section" | "critique" | "revision" | "finanzplan" | "done";
  message: string;
  payload?: unknown;
}

export interface PipelineUsage {
  model: string;
  usage: Usage;
}

export interface PipelineResult {
  artefacts: GenerationArtefacts;
  usages: PipelineUsage[];
}

export async function runPipeline(
  programm: Foerderprogramm,
  facts: WizardFacts,
  richtlinie?: Richtlinie | null,
  onEvent?: (e: PipelineEvent) => void
): Promise<PipelineResult> {
  const emit = (e: PipelineEvent) => onEvent?.(e);
  const usages: PipelineUsage[] = [];

  // Wenn eine Richtlinie mit Antragsstruktur vorliegt, nutzen wir deren Abschnitte
  // direkt als Gliederung — keine freie KI-Outline.
  let outline: Outline;
  if (richtlinie?.antragsstruktur?.abschnitte?.length) {
    const titel =
      (facts.projekt as { titel?: string } | undefined)?.titel ??
      (facts.projekt as { kurzbeschreibung?: string } | undefined)?.kurzbeschreibung?.slice(0, 80) ??
      `Antrag auf Foerderung: ${programm.name}`;
    outline = {
      titel,
      abschnitte: richtlinie.antragsstruktur.abschnitte
        .filter((a) => a.pflicht !== false)
        .map((a) => ({
          name: a.name,
          fokus: a.leitfragen?.length
            ? `Leitfragen: ${a.leitfragen.join(" | ")}`
            : a.stilhinweis ?? `Pflichtabschnitt ${a.id}`,
        })),
    };
    emit({ stage: "outline", message: "Uebernehme Gliederung aus Foerderrichtlinie" });
  } else {
    emit({ stage: "outline", message: "Erstelle Gliederung" });
    const outlineRes = await generateJson<Outline>(
      MODEL_PRO,
      OUTLINE_SYSTEM,
      buildOutlinePrompt(programm, facts)
    );
    usages.push({ model: MODEL_PRO, usage: outlineRes.usage });
    outline = outlineRes.value;
  }

  const sections: Array<{ name: string; text: string }> = [];
  for (const abschnitt of outline.abschnitte) {
    emit({ stage: "section", message: `Schreibe Abschnitt: ${abschnitt.name}` });
    const rl = richtlinie?.antragsstruktur?.abschnitte?.find(
      (a) => a.name === abschnitt.name
    );
    const res = await generateText(
      MODEL_PRO,
      SECTION_SYSTEM,
      buildSectionPrompt(programm, facts, abschnitt, outline.titel, rl)
    );
    usages.push({ model: MODEL_PRO, usage: res.usage });
    sections.push({ name: abschnitt.name, text: res.value });
  }

  const draft = renderDraft(outline, sections);

  emit({ stage: "critique", message: "Gutachten wird erstellt" });
  const critiqueRes = await generateText(
    MODEL_PRO,
    CRITIQUE_SYSTEM,
    buildCritiquePrompt(programm, draft)
  );
  usages.push({ model: MODEL_PRO, usage: critiqueRes.usage });

  emit({ stage: "revision", message: "Finale Fassung" });
  const finalRes = await generateText(
    MODEL_PRO,
    REVISION_SYSTEM,
    buildRevisionPrompt(programm, facts, draft, critiqueRes.value)
  );
  usages.push({ model: MODEL_PRO, usage: finalRes.usage });

  emit({ stage: "finanzplan", message: "Finanzplan-Entwurf" });
  const finanzRes = await generateFinanzplan(programm, facts, richtlinie);
  usages.push(finanzRes.usage);

  emit({ stage: "done", message: "Fertig" });

  return {
    artefacts: {
      outline,
      sections,
      critique: critiqueRes.value,
      finalText: finalRes.value,
      finanzplan: finanzRes.plan,
    },
    usages,
  };
}

function renderDraft(
  outline: Outline,
  sections: Array<{ name: string; text: string }>
): string {
  const parts: string[] = [outline.titel, ""];
  for (const s of sections) {
    parts.push(s.name);
    parts.push("");
    parts.push(s.text);
    parts.push("");
  }
  return parts.join("\n");
}
