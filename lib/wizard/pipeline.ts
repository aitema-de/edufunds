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

type Outline = NonNullable<GenerationArtefacts["outline"]>;

export interface PipelineEvent {
  stage: "outline" | "section" | "critique" | "revision" | "done";
  message: string;
  payload?: unknown;
}

export async function runPipeline(
  programm: Foerderprogramm,
  facts: WizardFacts,
  onEvent?: (e: PipelineEvent) => void
): Promise<GenerationArtefacts> {
  const emit = (e: PipelineEvent) => onEvent?.(e);

  emit({ stage: "outline", message: "Erstelle Gliederung" });
  const outline = await generateJson<Outline>(
    MODEL_PRO,
    OUTLINE_SYSTEM,
    buildOutlinePrompt(programm, facts)
  );

  const sections: Array<{ name: string; text: string }> = [];
  for (const abschnitt of outline.abschnitte) {
    emit({ stage: "section", message: `Schreibe Abschnitt: ${abschnitt.name}` });
    const text = await generateText(
      MODEL_PRO,
      SECTION_SYSTEM,
      buildSectionPrompt(programm, facts, abschnitt, outline.titel)
    );
    sections.push({ name: abschnitt.name, text });
  }

  const draft = renderDraft(outline, sections);

  emit({ stage: "critique", message: "Gutachten wird erstellt" });
  const critique = await generateText(
    MODEL_PRO,
    CRITIQUE_SYSTEM,
    buildCritiquePrompt(programm, draft)
  );

  emit({ stage: "revision", message: "Finale Fassung" });
  const finalText = await generateText(
    MODEL_PRO,
    REVISION_SYSTEM,
    buildRevisionPrompt(programm, facts, draft, critique)
  );

  emit({ stage: "done", message: "Fertig" });

  return { outline, sections, critique, finalText };
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
