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
  PipelineStage,
  WizardFacts,
  WizardMessage,
  Texttiefe,
} from "./types";
export type { PipelineStage } from "./types";
import {
  OUTLINE_SYSTEM,
  SECTION_SYSTEM,
  CRITIQUE_SYSTEM,
  REVISION_SYSTEM,
  RECHECK_SYSTEM,
  CONSISTENCY_SYSTEM,
  buildOutlinePrompt,
  buildSectionPrompt,
  texttiefeHint,
  buildCritiquePrompt,
  buildRevisionPrompt,
  buildRecheckPrompt,
  buildConsistencyPrompt,
} from "./prompts";
import { MODEL_FLASH, MODEL_PRO, generateJson, generateText } from "./llm";
import { reviseForConsistency } from "./consistency-revision";
import {
  buildAllowedCorpus,
  detectIntroduced,
  repairIntroduced,
} from "./hallucination-gate";
import {
  buildGroundTruth,
  buildProgrammKontext,
  verifyFacts,
} from "./fact-verification";
import { extractAnnahmen, wrapAnnahmen } from "./annahme-marker";
import type { Usage } from "./pricing";
import type { Richtlinie, AntragsAbschnitt } from "./richtlinien-schema";
import { generateFinanzplan, buildBeantragtConsistencyIssue } from "./finanzplan-generator";
import { ensureSectionsPresent } from "./struktur-guard";
import { buildFallbackTitle } from "./title-fallback";
import { buildFallbackOutline } from "./outline-fallback";
import { PIPELINE_CONFIG } from "./config";
import { substanzFindings } from "./substanz";

const SCHWERE_VALID: readonly CritiqueSchwere[] = ["hoch", "mittel", "niedrig"];
const KATEGORIE_VALID: readonly CritiqueKategorie[] = [
  "floskel",
  "redundanz",
  "belegluecke",
  "substanz",
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

/**
 * Bug #004 (Pilot 15.07.): Erkennt LLM-Konsistenz-Issues, die sich auf die
 * GESAMT-/BEANTRAGTE SUMME beziehen. Solche Befunde rechnet das Flash-Modell
 * unzuverlaessig (es schrieb "12.600 EUR entsprechen 15.000 EUR"). Sie werden aus
 * der LLM-Liste entfernt und durch einen deterministischen Befund
 * (buildBeantragtConsistencyIssue) ersetzt. Heuristik ueber die Beschreibung —
 * die Art kann "betrag-unstimmig" ODER "sonstiges" sein.
 */
const TOTAL_SUM_ISSUE_RE =
  /gesamtsumme|gesamtkost|gesamtbetrag|gesamt-?\s?summe|beantragt|f[oö]rdersumme|projektsumme/i;

function isTotalSumConsistencyIssue(i: ConsistencyIssue): boolean {
  return TOTAL_SUM_ISSUE_RE.test(i.beschreibung);
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

// =============================================================================
// Phase 5 D-20 Hebel 2 — Compliance-Check-Stage
// =============================================================================

interface ComplianceViolation {
  abschnittId: string;
  art: "fehlt" | "ueberlaenge" | "nur-platzhalter";
  detail: string;
}

interface ComplianceCheckResult {
  violations: ComplianceViolation[];
  usage: Usage;
}

/**
 * Deterministischer FK-Check: prueft ob alle Pflicht-Abschnitte aus der
 * Richtlinie im finalText vorkommen und die Laengengrenzen eingehalten werden.
 *
 * Kein LLM-Call — rein textuell. Usage ist Dummy (promptTokens=0).
 * T-05-06-06 Mitigation: case-insensitive + whitespace-Trim + Substring-Match
 * gegen "Finanzierung und Ausgangslage" findet "Finanzierung".
 */
async function runComplianceCheck(
  finalText: string,
  abschnitte: readonly AntragsAbschnitt[]
): Promise<ComplianceCheckResult> {
  const violations: ComplianceViolation[] = [];
  const textLower = finalText.toLowerCase().trim();

  for (const abschnitt of abschnitte) {
    if (abschnitt.pflicht === false) continue;

    // Section-Text durch einfaches Splitting extrahieren (naiv, reicht fuer FK-Check)
    const abschnittNameLower = abschnitt.name.toLowerCase().trim();

    // T-05-06-06: Substring-Match — "Bedarfsanalyse und Ausgangslage" enthaelt "Bedarfsanalyse"
    const nameFound = textLower.includes(abschnittNameLower);

    if (!nameFound) {
      violations.push({
        abschnittId: abschnitt.id,
        art: "fehlt",
        detail: `Pflichtabschnitt "${abschnitt.name}" (id: ${abschnitt.id}) fehlt im Antragstext.`,
      });
      continue;
    }

    // Laengencheck: Abschnitt-Text isolieren (von diesem Namen bis naechster Ueberschrift)
    if (abschnitt.maxZeichen) {
      const nameIdx = textLower.indexOf(abschnittNameLower);
      const afterName = finalText.slice(nameIdx + abschnitt.name.length);
      // Naechste Zeile die wie eine Ueberschrift aussieht (kurze Zeile, keine Luecke)
      const lines = afterName.split("\n");
      const contentLines: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) { contentLines.push(""); continue; }
        // Heuristik: Zeile < 60 Zeichen ohne Satzzeichen am Ende = neue Ueberschrift
        if (contentLines.length > 0 && trimmed.length < 60 && !trimmed.endsWith(".") && !trimmed.endsWith(",")) break;
        contentLines.push(line);
      }
      const sectionText = contentLines.join("\n").trim();

      if (sectionText.length > abschnitt.maxZeichen) {
        violations.push({
          abschnittId: abschnitt.id,
          art: "ueberlaenge",
          detail: `Abschnitt "${abschnitt.name}" hat ${sectionText.length} Zeichen (Limit: ${abschnitt.maxZeichen}).`,
        });
      } else if (sectionText.length < 50) {
        // Mindestlaenge fuer Pflichtabschnitte: 50 Zeichen
        violations.push({
          abschnittId: abschnitt.id,
          art: "nur-platzhalter",
          detail: `Abschnitt "${abschnitt.name}" hat nur ${sectionText.length} Zeichen — moeglicherweise nur Platzhalter.`,
        });
      }
    }
  }

  return {
    violations,
    usage: { promptTokens: 0, candidatesTokens: 0 },
  };
}

/**
 * Baut den Revision-Prompt fuer den Compliance-Repair-Call.
 * Wird nur getriggert wenn violations.length > 0 und complianceLoopCount === 0.
 */
function buildComplianceRevisionPrompt(
  currentText: string,
  violations: ComplianceViolation[]
): string {
  const violationLines = violations.map((v) => {
    if (v.art === "fehlt") {
      return `- FEHLT: Abschnitt "${v.abschnittId}" — ${v.detail}`;
    }
    if (v.art === "ueberlaenge") {
      return `- UEBERLAENGE: Abschnitt "${v.abschnittId}" — ${v.detail} Bitte kuezen.`;
    }
    return `- NUR-PLATZHALTER: Abschnitt "${v.abschnittId}" — ${v.detail} Bitte inhaltlich fuellen.`;
  }).join("\n");

  return `Du hast folgenden Antragstext erhalten, der die Pflichtstruktur der Foerderrichtlinie NICHT vollstaendig erfuellt.

FESTGESTELLTE VERSTÖSSE:
${violationLines}

ANTRAGSTEXT (zu korrigieren):
${currentText}

AUFGABE: Ueberarbeite den Antragstext so, dass alle genannten Verstösse behoben sind:
- Fehlende Abschnitte mit einem inhaltlich passenden Text ergänzen (basierend auf dem vorhandenen Kontext).
- Zu lange Abschnitte kürzen ohne inhaltlichen Verlust.
- Zu duenne Abschnitte aus dem vorhandenen Kontext inhaltlich fuellen, ohne neue Fakten zu erfinden. Vorhandene "[TODO: …]"- und "[Annahme: …]"-Marker bleiben erhalten.

Gib NUR den vollständigen, korrigierten Antragstext zurueck (kein JSON, keine Erklaerung).`;
}

export interface PipelineEvent {
  stage: PipelineStage;
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
  onEvent?: (e: PipelineEvent) => void | Promise<void>,
  messages?: WizardMessage[],
  options?: { texttiefe?: Texttiefe }
): Promise<PipelineResult> {
  const emit = async (e: PipelineEvent) => {
    // Heartbeat MUSS abgewartet werden, sonst landet der Stage-Schreibvorgang
    // (DB) verzoegert/ungeordnet und der Fortschrittsbalken hakt die Schritte
    // nicht live ab. await => geordnete, sichtbare Heartbeats fuer das Polling.
    try { await onEvent?.(e); } catch (err) { console.warn("[pipeline] onEvent threw, ignoring:", err); }
  };
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
    await emit({ stage: "outline", message: "Uebernehme Gliederung aus Foerderrichtlinie" });
  } else {
    await emit({ stage: "outline", message: "Erstelle Gliederung" });
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
      await emit({
        stage: "outline",
        message: "LLM-Aufruf fehlgeschlagen — verwende Standard-Gliederung",
        payload: { fallback: true, reason: err instanceof Error ? err.message : String(err) },
      });
      outline = buildFallbackOutline(programm, facts);
    }
  }

  const sections: Array<{ name: string; text: string }> = [];
  for (const abschnitt of outline.abschnitte) {
    await emit({ stage: "section", message: `Schreibe Abschnitt: ${abschnitt.name}` });
    const rl = richtlinie?.antragsstruktur?.abschnitte?.find(
      (a) => a.name === abschnitt.name
    );
    const res = await generateText(
      MODEL_PRO,
      SECTION_SYSTEM,
      buildSectionPrompt(programm, facts, abschnitt, outline.titel, rl, userAnswers) +
        texttiefeHint(options?.texttiefe)
    );
    usages.push({ model: MODEL_PRO, usage: res.usage });
    sections.push({ name: abschnitt.name, text: res.value });
  }

  const draft = renderDraft(outline, sections);

  await emit({ stage: "critique", message: "Gutachten wird erstellt" });
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

  // Substanz-Gate (Kolja, 22.07.2026): deterministische Findings fuer
  // Inhaltsabschnitte, die beschreiben statt begruenden — NACH normalize
  // (dessen 12er-Kappung gilt nur fuer LLM-Findings), damit sie die Revision
  // garantiert erreichen. Befund der Kalibrierung: 374/413 Korpus-Abschnitte
  // enthielten NULL kausale Konnektive; der Critique-LLM hat das nie
  // beanstandet. Was nicht gemessen wird, faellt weg.
  critique.findings.push(...substanzFindings(sections.map((s) => ({ name: s.name, text: s.text ?? "" }))));

  const critiqueRendered = renderCritique(critique);

  await emit({ stage: "revision", message: "Finale Fassung" });
  let finalRes = await generateText(
    MODEL_PRO,
    REVISION_SYSTEM,
    buildRevisionPrompt(programm, facts, draft, critiqueRendered, richtlinie)
  );
  usages.push({ model: MODEL_PRO, usage: finalRes.usage });

  // =========================================================================
  // Struktur-Guard (Pilot-Befund "Textumfang", 15.07.2026)
  // Die Revision (produktiv erzwungenes EU-Modell mistral-small) kann bei duennem
  // Input Pflichtabschnitte verschmelzen/streichen, sodass der sichtbare finalText
  // auf wenige Abschnitte kollabiert, obwohl sections[] alle enthaelt. Deterministisch
  // (kein LLM) fehlende Abschnitte aus sections[] wieder einsetzen. HIER platziert —
  // direkt nach der Revision, VOR Halluzinations-/Fakt-Gate/Recheck — damit
  // re-injizierter Text dieselben Ehrlichkeitspruefungen durchlaeuft wie regulaerer.
  // =========================================================================
  {
    const guard = ensureSectionsPresent(finalRes.value ?? "", outline, sections);
    if (guard.reinjected.length > 0) {
      finalRes = { value: guard.text, usage: finalRes.usage };
      await emit({
        stage: "revision",
        message: `Struktur-Guard: ${guard.reinjected.length} fehlende(r) Abschnitt(e) ergaenzt`,
      });
      console.log(
        `[pipeline] Struktur-Guard: ${guard.reinjected.length} Abschnitt(e) re-injiziert (${guard.reinjected.join(", ")})`
      );
    }
  }

  let resolutions: FindingResolution[] = [];
  let hasOpenHigh = false;
  if (critique.findings.length > 0) {
    await emit({ stage: "recheck", message: "Gutachten-Punkte prüfen" });
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

  // =========================================================================
  // Halluzinations-Diff-Gate (Probe 09.06., Hebel 1)
  // Vergleicht die revidierte Fassung deterministisch gegen die erlaubten
  // Quellen (Entwurf + Facts + User-Antworten). In der Revisions-Stufe NEU
  // eingefuehrte Zahlen/Eigennamen, die in keiner Quelle stehen, sind mit
  // hoher Wahrscheinlichkeit erfunden ("alte gegen neue Erfindung"). Ein
  // gezielter Repair entfernt sie; uebernommen wird er nur bei deterministisch
  // nachgewiesener Verbesserung — das Gate kann nie verschlimmern (Lehre Fall 5).
  // Laeuft VOR consistency/finanzplan, damit spaeter legitim aus dem Finanzplan
  // uebernommene Betraege nicht faelschlich als "neu" gewertet werden.
  // =========================================================================
  let hallucinationGate: GenerationArtefacts["hallucinationGate"];
  {
    const allowedCorpus = buildAllowedCorpus(draft, facts, userAnswers);
    const introduced = detectIntroduced(finalRes.value ?? "", allowedCorpus);
    const introducedBefore = [...introduced.numbers, ...introduced.entities];
    if (introducedBefore.length > 0) {
      await emit({ stage: "revision", message: "Halluzinations-Diff-Gate" });
      try {
        const gate = await repairIntroduced(
          finalRes.value ?? "",
          introduced,
          allowedCorpus,
          {
            revise: (system, user) => generateText(MODEL_PRO, system, user),
            model: MODEL_PRO,
          }
        );
        finalRes = { value: gate.finalText, usage: finalRes.usage };
        usages.push(...gate.usages);
        hallucinationGate = {
          introducedBefore,
          residual: gate.residual,
          repaired: gate.repaired,
        };
        console.log(
          `[pipeline] Halluzinations-Gate: ${introducedBefore.length} Treffer → ${gate.residual.length} verbleibend (repaired=${gate.repaired})`
        );
      } catch (gateErr) {
        console.error("[pipeline] Halluzinations-Gate fehlgeschlagen:", gateErr);
        hallucinationGate = { introducedBefore, residual: introducedBefore, repaired: false };
      }
    }
  }

  // =========================================================================
  // Fakt-Verifikations-Pass (Probe 09.06., Hebel 1b)
  // Das Zahlen-Gate oben faengt nur Zahlen/Eigennamen, die die Revision NEU
  // einfuehrt. Dieser LLM-Pass schliesst die zwei verbleibenden Luecken:
  // (1) NARRATIVE Erfindungen (Partner-Rollen, Termine, Zusagen, Mengen, Kanaele,
  // Verfahren) und (2) SECTION-STAGE-Halluzinationen (schon im Entwurf, daher vom
  // Zahlen-Gate als "gedeckt" gewertet). Geprueft wird gegen die Nutzer-Ground-
  // Truth (Facts + Antworten, OHNE Entwurf). Repair degradiert ungedeckte
  // Behauptungen zu ehrlichen Luecken-Markern — uebernommen nur bei
  // deterministisch nachgewiesener Verbesserung (Never-Worse, wie das Zahlen-Gate).
  // Laeuft NACH dem Zahlen-Gate (Zahlen/Namen schon bereinigt) und VOR finanzplan.
  // =========================================================================
  let factVerification: GenerationArtefacts["factVerification"];
  {
    const groundTruth = buildGroundTruth(facts, userAnswers);
    // Ohne jede Nutzer-Ground-Truth waere jeder konkrete Fakt "ungedeckt" — dann
    // wuerde der Pass den ganzen Antrag entkernen. In dem Fall ueberspringen
    // (der Unbeziffert-Modus/die markierten Luecken tragen die Ehrlichkeit).
    if (groundTruth.trim().length >= 20) {
      await emit({ stage: "revision", message: "Fakt-Verifikation" });
      try {
        const fv = await verifyFacts(
          finalRes.value ?? "",
          groundTruth,
          buildProgrammKontext(programm),
          {
            detect: (system, user) => generateJson<unknown>(MODEL_FLASH, system, user, { maxTokens: 4000 }),
            revise: (system, user) => generateText(MODEL_PRO, system, user),
            models: { detect: MODEL_FLASH, revise: MODEL_PRO },
          }
        );
        finalRes = { value: fv.finalText, usage: finalRes.usage };
        usages.push(...fv.usages);
        if (fv.neutralisiert.length > 0 || fv.vorschlaege.length > 0) {
          factVerification = {
            neutralisiert: fv.neutralisiert,
            vorschlaege: fv.vorschlaege,
            vorschlaegeBegruendung: fv.vorschlaegeBegruendung,
            remaining: fv.remaining,
            repaired: fv.repaired,
          };
          console.log(
            `[pipeline] Fakt-Verifikation: ${fv.neutralisiert.length} neutralisiert (→ ${fv.remaining.length} verbleibend, repaired=${fv.repaired}), ${fv.vorschlaege.length} Vorschlag/Vorschläge behalten`
          );
        }
      } catch (fvErr) {
        console.error("[pipeline] Fakt-Verifikation fehlgeschlagen:", fvErr);
      }
    }
  }

  // =========================================================================
  // Phase 5 D-20 Hebel 2 — Compliance-Check-Stage (PIPELINE_COMPLIANCE_STAGE)
  // Silent-Stage gegenueber GeneratingProgress.tsx — kein UI-Update.
  // Loop-Count enforced: max 1 Iteration (T-05-06-01 DoS-Mitigation).
  // =========================================================================
  let complianceLoopCount = 0;
  if (PIPELINE_CONFIG.complianceStageEnabled && richtlinie?.antragsstruktur?.abschnitte) {
    await emit({ stage: "compliance-check", message: "Pflichtabschnitt-Check" });
    const cc = await runComplianceCheck(
      finalRes.value ?? "",
      richtlinie.antragsstruktur.abschnitte
    );
    usages.push({ model: "deterministic", usage: cc.usage });

    if (cc.violations.length > 0 && complianceLoopCount === 0) {
      const revFix = await generateText(
        MODEL_PRO,
        REVISION_SYSTEM,
        buildComplianceRevisionPrompt(finalRes.value ?? "", cc.violations)
      );
      finalRes = { value: revFix.value, usage: revFix.usage };
      usages.push({ model: MODEL_PRO, usage: revFix.usage });
      complianceLoopCount = 1;
    }
  }

  await emit({ stage: "finanzplan", message: "Finanzplan-Entwurf" });
  const finanzRes = await generateFinanzplan(programm, facts, richtlinie, userAnswers);
  usages.push(finanzRes.usage);

  let consistencyIssues: ConsistencyIssue[] = [];
  if (finanzRes.plan.posten.length > 0) {
    await emit({ stage: "consistency", message: "Antragstext × Finanzplan prüfen" });
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

    // Bug #004 (Pilot 15.07.): Gesamtsummen-Befunde des LLM verwerfen — es rechnet
    // sie falsch und widerspruechlich. Vor der Konsistenz-Revision entfernen, damit
    // diese nicht faelschlich die (legitime) beantragte Summe im Text "wegkorrigiert";
    // der Gesamtsummen-Abgleich kommt weiter unten deterministisch dazu.
    consistencyIssues = consistencyIssues.filter((i) => !isTotalSumConsistencyIssue(i));

    // QA-01/03: Inkonsistenzen nicht nur flaggen, sondern einmalig beheben —
    // den Antragstext an den (verbindlichen) Finanzplan angleichen und erneut
    // pruefen. Fehlschlag der Revision behaelt Originaltext + geflaggte Issues.
    if (consistencyIssues.length > 0) {
      try {
        await emit({ stage: "consistency", message: "Antragstext × Finanzplan angleichen" });
        const reconciled = await reviseForConsistency(
          finalRes.value,
          finanzplanJson,
          consistencyIssues,
          {
            reviseText: (system, user) => generateText(MODEL_PRO, system, user),
            recheck: (system, user) => generateJson<unknown>(MODEL_FLASH, system, user),
            normalize: normalizeConsistency,
            models: { revise: MODEL_PRO, recheck: MODEL_FLASH },
          }
        );
        console.log(
          `[pipeline] Konsistenz-Revision: ${consistencyIssues.length} → ${reconciled.issues.length} Issue(s)`
        );
        finalRes = { value: reconciled.finalText, usage: finalRes.usage };
        // Auch nach dem Recheck kann das LLM einen Gesamtsummen-Befund
        // (falsch gerechnet) zurueckgeben — erneut verwerfen.
        consistencyIssues = reconciled.issues.filter((i) => !isTotalSumConsistencyIssue(i));
        usages.push(...reconciled.usages);
      } catch (revErr) {
        console.error("[pipeline] Konsistenz-Revision fehlgeschlagen:", revErr);
      }
    }

    // Bug #004: Deterministischer Gesamtsummen-Abgleich (Foerderposten-Summe ×
    // beantragte Summe) — genau EIN korrekt gerechneter Befund, deckungsgleich mit
    // dem Hinweis in der FinanzplanView (checkBeantragtDeckung). Ersetzt die vom
    // LLM entfernten, unzuverlaessigen Gesamtsummen-Befunde.
    const deckungIssue = buildBeantragtConsistencyIssue(
      finanzRes.plan.posten.filter((p) => !p.eigenanteil),
      facts
    );
    if (deckungIssue) {
      consistencyIssues = [deckungIssue, ...consistencyIssues];
      if (consistencyIssues.length > 8) consistencyIssues.length = 8;
    }
  }
  // Hinweis (Produktvision 2026-06-10): Der frühere unbeziffert-Zweig
  // (Euro-Beträge per KOSTEN_ENTZIFFERUNG aus dem Text streichen) entfällt — der
  // Finanzplan-Generator erstellt jetzt immer einen bezifferten Plan mit als
  // Vorschlag markierten Beträgen; der Text behält seine (als Schätzung
  // gekennzeichneten) Beträge und wird per Konsistenz-Revision daran angeglichen.

  // =========================================================================
  // Annahmen-Markierung (Produktentscheidung 02.07.2026, ClickUp 86caht7eq)
  // "Kennzeichnen statt verbieten": FV-"vorschlag"-Zitate (+ nicht neutralisierte
  // remaining-Tatsachen) werden deterministisch als [Annahme: …] im Text markiert
  // — Sicherheitsnetz zu den generierungszeitigen Markern aus den Prompts.
  // Danach wird die interaktive Bestaetigungsliste aus ALLEN Markern im Text
  // gebaut (Prompt-Marker + FV-Marker), damit Uebernehmen/Anpassen/Streichen
  // jede Annahme erreicht und keine unmarkiert in den Export gelangt.
  // Laeuft NACH allen LLM-Revisionen (Compliance/Konsistenz), damit spaetere
  // Umformulierungen die deterministische Verankerung nicht zerreissen.
  // =========================================================================
  {
    const fvZitate = [
      ...(factVerification?.vorschlaege ?? []),
      ...(factVerification?.remaining ?? []),
    ];
    const wrapped = wrapAnnahmen(finalRes.value ?? "", fvZitate);
    if (wrapped.marked.length > 0) {
      finalRes = { value: wrapped.text, usage: finalRes.usage };
    }
    const annahmen = extractAnnahmen(finalRes.value ?? "");
    if (annahmen.length > 0 || factVerification) {
      const beg = new Map(
        (factVerification?.vorschlaegeBegruendung ?? []).map((b) => [b.zitat, b.warum])
      );
      factVerification = {
        neutralisiert: factVerification?.neutralisiert ?? [],
        vorschlaege: annahmen,
        vorschlaegeBegruendung: annahmen.map((z) => ({
          zitat: z,
          warum: beg.get(z) ?? "nicht durch Nutzerangaben gedeckt",
        })),
        remaining: factVerification?.remaining ?? [],
        repaired: factVerification?.repaired ?? false,
      };
      if (annahmen.length > 0) {
        console.log(
          `[pipeline] Annahmen-Markierung: ${annahmen.length} [Annahme: …]-Marker im Text (${wrapped.marked.length} deterministisch nachmarkiert)`
        );
      }
    }
  }

  // Final-Guard (Probe 09.06., Fall 3): Nach allen Stufen darf der Antragstext
  // niemals leer sein. Ein leerer finalText entsteht aus einer transienten,
  // erfolgreich-aber-leeren KI-Antwort (vom Retry-Layer abgefangen, im Rest-Risiko
  // aber moeglich). Lieber ein ehrlicher Fehler (Route → Phase "failed",
  // Retry-Pfad) als ein zahlendes Leer-Dokument.
  if (!(finalRes.value ?? "").trim()) {
    throw new Error(
      "Pipeline ergab einen leeren Antragstext — vermutlich ein voruebergehender KI-Ausfall. Bitte erneut generieren."
    );
  }

  await emit({ stage: "done", message: "Fertig" });

  return {
    artefacts: {
      outline,
      sections,
      critique: critiqueRendered,
      critiqueFindings: critique.findings,
      critiqueResolutions: resolutions.length ? resolutions : undefined,
      hasOpenHighFindings: hasOpenHigh || undefined,
      hallucinationGate,
      factVerification,
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
