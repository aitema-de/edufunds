/**
 * Phase 5 D-22: Env-Var-gesteuerte Feature-Flags für Wave-3-Tuning-Hebel.
 *
 * Defaults sind alle OFF — Wave 3 misst Delta pro Hebel ein/aus
 * (RESEARCH Anti-Pattern Z.727 — Defaults ON würde Per-Hebel-A/B-Eval
 * unmöglich machen, weil das Baseline-Delta nicht isolierbar wäre).
 *
 * Nach erfolgreichem Tuning und Eval-Verifikation werden die Defaults in
 * einem finalen Plan auf ON gesetzt (Phase 5 Wave 4 oder Phase 5.1).
 *
 * Env-Vars:
 *   PIPELINE_USE_VORBILD_FORMULIERUNGEN  — Hebel 3: vorbildFormulierungen in Prompts
 *   PIPELINE_COMPLIANCE_STAGE            — Hebel 2: neue Compliance-Check-Stage
 *   PIPELINE_SHARP_PROMPTS               — Hebel 1: geschärfte Verbots-Listen in Prompts
 *   PIPELINE_GEBER_ROUTING_V2            — Hebel 4: erweiterte Geber-Guidance-Rubrics
 *
 * Verwendung in Wave 3 (05-05..05-07):
 *   import { PIPELINE_CONFIG } from "@/lib/wizard/config";
 *   if (PIPELINE_CONFIG.useVorbildFormulierungen) { ... }
 */

/**
 * Parsed einen Env-Var-String zu boolean.
 *
 * "true" / "1" / "TRUE" (case-insensitive Trim) → true
 * "false" / "0" / "" / undefined → false
 */
export function parseEnvBool(value: string | undefined): boolean {
  if (value === undefined) return false;
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1";
}

/**
 * Phase-5-Pipeline-Konfiguration. Wird beim Modul-Load aus process.env gelesen
 * und danach eingefroren (Object.freeze — kein Laufzeit-Mutationsrisiko).
 *
 * **Default state Phase 5:** alle 4 Flags = false.
 * Threat: T-05-03-01 — Default-Drift verhindert per Test "alle 4 Flags = false".
 */
export const PIPELINE_CONFIG = Object.freeze({
  /**
   * D-20 Hebel 3: vorbildFormulierungen[] + bestPractices[] + rejectGruende[]
   * aus dem Dossier in SECTION_SYSTEM / REVISION_SYSTEM-Prompts injizieren.
   * Nutzt Phase-3/4-Schema-Investitionen für WIZ-01/-02-Verbesserung.
   */
  useVorbildFormulierungen: parseEnvBool(
    process.env.PIPELINE_USE_VORBILD_FORMULIERUNGEN
  ),

  /**
   * D-20 Hebel 2: neue Compliance-Check-Stage zwischen `recheck` und `done`
   * aktivieren — prüft strict gegen antragsstruktur.abschnitte[].id +
   * maxZeichen, triggert Revision bei Verletzung (silent Backend-Stage).
   */
  complianceStageEnabled: parseEnvBool(process.env.PIPELINE_COMPLIANCE_STAGE),

  /**
   * D-20 Hebel 1: geschärfte CRITIQUE/SECTION/REVISION/RECHECK-Prompts mit
   * erweiterten Verbots-Listen + Few-Shot-Negativbeispielen aus UAT-Marker-Liste.
   */
  sharpPrompts: parseEnvBool(process.env.PIPELINE_SHARP_PROMPTS),

  /**
   * D-20 Hebel 4: geber-guidance.ts Rubrics schärfen + erweiterte
   * programm-kriterien.ts-ExtraGuidance-Einträge für die 11 Dossiers.
   */
  geberRoutingV2: parseEnvBool(process.env.PIPELINE_GEBER_ROUTING_V2),
});

/** Typed alias für externe Verwender (Test-Mocking, Typ-Annotationen etc.). */
export type PipelineConfig = typeof PIPELINE_CONFIG;
