import type { Foerderprogramm } from "@/lib/foerderSchema";
import type {
  ConsistencyArt,
  ConsistencyIssue,
  Critique,
  CritiqueFinding,
  CritiqueKategorie,
  CritiqueSchwere,
  FindingResolution,
  FindingStatus,
  GenerationArtefacts,
  WizardFacts,
  WizardMessage,
} from "./types";
import {
  OUTLINE_SYSTEM,
  SECTION_SYSTEM,
  CRITIQUE_SYSTEM,
  REVISION_SYSTEM,
  RECHECK_SYSTEM,
  CONSISTENCY_SYSTEM,
  buildOutlinePrompt,
  buildSectionPrompt,
  buildCritiquePrompt,
  buildRevisionPrompt,
  buildRecheckPrompt,
  buildConsistencyPrompt,
} from "./prompts";
import { MODEL_FLASH, MODEL_PRO, generateJson, generateText } from "./llm";
import type { Usage } from "./pricing";
import type { Richtlinie } from "./richtlinien-schema";
import { generateFinanzplan } from "./finanzplan-generator";
import { buildFallbackTitle } from "./title-fallback";
import { buildFallbackOutline } from "./outline-fallback";

const SCHWERE_VALID: readonly CritiqueSchwere[] = ["hoch", "mittel", "niedrig"];
const KATEGORIE_VALID: readonly CritiqueKategorie[] = [
  "floskel",
  "belegluecke",
  "richtlinie",
  "inkonsistenz",
  "sonstiges",
];

function schwereRank(s: CritiqueSchwere): number {
  return s === "hoch" ? 0 : s === "mittel" ? 1 : 2;
}

function normalizeCritique(raw: unknown): Critique {
  const src = (raw ?? {}) as { zusammenfassung?: unknown; findings?: unknown };
  const findings: CritiqueFinding[] = [];
  if (Array.isArray(src.findings)) {
    for (const f of src.findings as Array<Record<string, unknown>>) {
      if (!f || typeof f !== "object") continue;
      const abschnitt = typeof f.abschnitt === "string" && f.abschnitt.trim() ? f.abschnitt.trim() : "global";
      const zitat = typeof f.zitat === "string" && f.zitat.trim() ? f.zitat.trim() : "FEHLT";
      const schwere = SCHWERE_VALID.includes(f.schwere as CritiqueSchwere)
        ? (f.schwere as CritiqueSchwere)
        : "mittel";
      const kategorie = KATEGORIE_VALID.includes(f.kategorie as CritiqueKategorie)
        ? (f.kategorie as CritiqueKategorie)
        : "sonstiges";
      const vorschlag = typeof f.vorschlag === "string" && f.vorschlag.trim() ? f.vorschlag.trim() : "";
      if (!vorschlag) continue;
      findings.push({ abschnitt, zitat, schwere, kategorie, vorschlag });
    }
  }
  findings.sort((a, b) => schwereRank(a.schwere) - schwereRank(b.schwere));
  if (findings.length > 12) findings.length = 12;
  return {
    zusammenfassung: typeof src.zusammenfassung === "string" ? src.zusammenfassung.trim() : undefined,
    findings,
  };
}

function renderCritique(c: Critique): string {
  const lines: string[] = [];
  if (c.zusammenfassung) {
    lines.push(`Zusammenfassung: ${c.zusammenfassung}`);
    lines.push("");
  }
  if (c.findings.length === 0) {
    lines.push("Keine nennenswerten Findings.");
    return lines.join("\n");
  }
  c.findings.forEach((f, i) => {
    lines.push(
      `${i + 1}. [${f.schwere.toUpperCase()} · ${f.kategorie} · ${f.abschnitt}] "${f.zitat}"`
    );
    lines.push(`   → ${f.vorschlag}`);
  });
  return lines.join("\n");
}

const CONSISTENCY_ART_VALID: readonly ConsistencyArt[] = [
  "posten-ohne-textbezug",
  "textbezug-ohne-posten",
  "betrag-unstimmig",
  "sonstiges",
];

function normalizeConsistency(raw: unknown): ConsistencyIssue[] {
  const src = (raw ?? {}) as { issues?: unknown };
  if (!Array.isArray(src.issues)) return [];
  const out: ConsistencyIssue[] = [];
  for (const i of src.issues as Array<Record<string, unknown>>) {
    if (!i || typeof i !== "object") continue;
    const beschreibung =
      typeof i.beschreibung === "string" && i.beschreibung.trim() ? i.beschreibung.trim() : "";
    if (!beschreibung) continue;
    const art = CONSISTENCY_ART_VALID.includes(i.art as ConsistencyArt)
      ? (i.art as ConsistencyArt)
      : "sonstiges";
    const posten = typeof i.posten === "string" && i.posten.trim() ? i.posten.trim() : undefined;
    const textstelle =
      typeof i.textstelle === "string" && i.textstelle.trim() ? i.textstelle.trim() : undefined;
    out.push({ art, beschreibung, posten, textstelle });
  }
  if (out.length > 8) out.length = 8;
  return out;
}

const STATUS_VALID: readonly FindingStatus[] = ["geschlossen", "teilweise", "offen"];

function normalizeResolutions(raw: unknown, findingCount: number): FindingResolution[] {
  const src = (raw ?? {}) as { resolutions?: unknown };
  if (!Array.isArray(src.resolutions)) return [];
  const seen = new Set<number>();
  const out: FindingResolution[] = [];
  for (const r of src.resolutions as Array<Record<string, unknown>>) {
    if (!r || typeof r !== "object") continue;
    const idx = typeof r.index === "number" ? Math.floor(r.index) : NaN;
    if (!Number.isFinite(idx) || idx < 1 || idx > findingCount || seen.has(idx)) continue;
    const status = STATUS_VALID.includes(r.status as FindingStatus)
      ? (r.status as FindingStatus)
      : "teilweise";
    const kommentar =
      typeof r.kommentar === "string" && r.kommentar.trim() ? r.kommentar.trim() : undefined;
    out.push({ index: idx, status, kommentar });
    seen.add(idx);
  }
  return out.sort((a, b) => a.index - b.index);
}

type Outline = NonNullable<GenerationArtefacts["outline"]>;

export interface PipelineEvent {
  stage:
    | "outline"
    | "section"
    | "critique"
    | "revision"
    | "recheck"
    | "finanzplan"
    | "consistency"
    | "done";
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
  onEvent?: (e: PipelineEvent) => void,
  messages?: WizardMessage[]
): Promise<PipelineResult> {
  const emit = (e: PipelineEvent) => onEvent?.(e);
  const usages: PipelineUsage[] = [];

  // User-Antworten fuer den Halluzinations-Audit der Critique-Stage extrahieren.
  // Die Critique braucht den Roh-Input, um zu erkennen, welche konkreten Fakten
  // im Antragsentwurf vom User stammen und welche der LLM erfunden hat.
  const userAnswers = messages
    ?.filter((m) => m.role === "user" && m.kind === "answer")
    .map((m) => m.content);

  // Wenn eine Richtlinie mit Antragsstruktur vorliegt, nutzen wir deren Abschnitte
  // direkt als Gliederung — keine freie KI-Outline.
  let outline: Outline;
  if (richtlinie?.antragsstruktur?.abschnitte?.length) {
    outline = {
      titel: buildFallbackTitle(programm, facts),
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
    try {
      const outlineRes = await generateJson<Outline>(
        MODEL_PRO,
        OUTLINE_SYSTEM,
        buildOutlinePrompt(programm, facts)
      );
      usages.push({ model: MODEL_PRO, usage: outlineRes.usage });
      outline = outlineRes.value;
    } catch (err) {
      // Fallback: generische 7-Abschnitt-Standardgliederung. Section-Generierung
      // kann immer noch scheitern, aber der Pipeline-Start crasht nicht mehr.
      console.warn("[pipeline] Outline-LLM-Aufruf fehlgeschlagen, nutze generischen Fallback:", err);
      emit({
        stage: "outline",
        message: "LLM-Aufruf fehlgeschlagen — verwende Standard-Gliederung",
        payload: { fallback: true, reason: err instanceof Error ? err.message : String(err) },
      });
      outline = buildFallbackOutline(programm, facts);
    }
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
  const critiqueRes = await generateJson<unknown>(
    MODEL_PRO,
    CRITIQUE_SYSTEM,
    buildCritiquePrompt(programm, draft, richtlinie, userAnswers, facts),
    // Geschaerfter Critique produziert ~10-15 Findings mit ausfuehrlichen
    // vorschlag-Feldern — Default-Output-Cap reicht nicht, JSON wuerde abreissen.
    { maxTokens: 8000 }
  );
  usages.push({ model: MODEL_PRO, usage: critiqueRes.usage });
  const critique = normalizeCritique(critiqueRes.value);
  const critiqueRendered = renderCritique(critique);

  emit({ stage: "revision", message: "Finale Fassung" });
  const finalRes = await generateText(
    MODEL_PRO,
    REVISION_SYSTEM,
    buildRevisionPrompt(programm, facts, draft, critiqueRendered, richtlinie)
  );
  usages.push({ model: MODEL_PRO, usage: finalRes.usage });

  let resolutions: FindingResolution[] = [];
  let hasOpenHigh = false;
  if (critique.findings.length > 0) {
    emit({ stage: "recheck", message: "Gutachten-Punkte prüfen" });
    const recheckRes = await generateJson<unknown>(
      MODEL_FLASH,
      RECHECK_SYSTEM,
      buildRecheckPrompt(critiqueRendered, finalRes.value)
    );
    usages.push({ model: MODEL_FLASH, usage: recheckRes.usage });
    resolutions = normalizeResolutions(recheckRes.value, critique.findings.length);
    hasOpenHigh = resolutions.some((r) => {
      if (r.status === "geschlossen") return false;
      const f = critique.findings[r.index - 1];
      return f?.schwere === "hoch";
    });
  }

  emit({ stage: "finanzplan", message: "Finanzplan-Entwurf" });
  const finanzRes = await generateFinanzplan(programm, facts, richtlinie);
  usages.push(finanzRes.usage);

  let consistencyIssues: ConsistencyIssue[] = [];
  if (finanzRes.plan.posten.length > 0) {
    emit({ stage: "consistency", message: "Antragstext × Finanzplan prüfen" });
    const finanzplanJson = JSON.stringify(
      finanzRes.plan.posten.map((p) => ({
        kategorie: p.kategorie,
        bezeichnung: p.bezeichnung,
        betragEur: p.betragEur,
        eigenanteil: p.eigenanteil,
        begruendung: p.begruendung,
      })),
      null,
      2
    );
    const consistencyRes = await generateJson<unknown>(
      MODEL_FLASH,
      CONSISTENCY_SYSTEM,
      buildConsistencyPrompt(finalRes.value, finanzplanJson)
    );
    usages.push({ model: MODEL_FLASH, usage: consistencyRes.usage });
    consistencyIssues = normalizeConsistency(consistencyRes.value);
  }

  emit({ stage: "done", message: "Fertig" });

  return {
    artefacts: {
      outline,
      sections,
      critique: critiqueRendered,
      critiqueFindings: critique.findings,
      critiqueResolutions: resolutions.length ? resolutions : undefined,
      hasOpenHighFindings: hasOpenHigh || undefined,
      consistencyIssues: consistencyIssues.length ? consistencyIssues : undefined,
      hasConsistencyIssues: consistencyIssues.length > 0 || undefined,
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
