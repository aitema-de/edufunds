/**
 * Phase 5 D-22: Env-Var-gesteuerte Feature-Flags für Wave-3-Tuning-Hebel.
 *
 * **Production-Defaults (Wave 4 Closure, 2026-05-20):** Hebel 1+3+4 ON, Hebel 2 OFF.
 * Entscheidung: default-selective basierend auf Wave-3-Eval-Daten (data/eval/TUNING.md).
 * - Hebel 1+3+4: keine messbaren Regressionen, adressieren echte Schwaechen.
 * - Hebel 2 (Compliance-Stage): entfaltet Wert erst wenn Dossiers maxZeichen-Felder haben
 *   (aktuell 0/11) — Default OFF, Revisit nach Dossier-Ausbau.
 *
 * Env-Vars zum Ueberschreiben:
 *   PIPELINE_USE_VORBILD_FORMULIERUNGEN  — Hebel 3: vorbildFormulierungen in Prompts
 *   PIPELINE_COMPLIANCE_STAGE            — Hebel 2: neue Compliance-Check-Stage
 *   PIPELINE_SHARP_PROMPTS               — Hebel 1: geschärfte Verbots-Listen in Prompts
 *   PIPELINE_GEBER_ROUTING_V2            — Hebel 4: erweiterte Geber-Guidance-Rubrics
 *
 * Verwendung:
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
 * **Production-Defaults (Wave 4 Closure, 2026-05-20):**
 * Hebel 1 (sharpPrompts) = true
 * Hebel 2 (complianceStageEnabled) = false (revisit nach Dossier-Ausbau mit maxZeichen)
 * Hebel 3 (useVorbildFormulierungen) = true
 * Hebel 4 (geberRoutingV2) = true
 *
 * Threat: T-05-08-05 — Defaults ON erfordert neuen Baseline-Run mit Default-Config ON.
 * Naechster Eval-Baseline-Run sollte mit diesen Defaults gefahren werden (BASELINE.md ergaenzen).
 */
export const PIPELINE_CONFIG = Object.freeze({
  /**
   * D-20 Hebel 3: vorbildFormulierungen[] + bestPractices[] + rejectGruende[]
   * aus dem Dossier in SECTION_SYSTEM / REVISION_SYSTEM-Prompts injizieren.
   * Nutzt Phase-3/4-Schema-Investitionen für WIZ-01/-02-Verbesserung.
   * Default ON — wirkt fuer aktion-mensch-schulkooperation + kultur-macht-stark.
   */
  useVorbildFormulierungen: parseEnvBool(
    process.env.PIPELINE_USE_VORBILD_FORMULIERUNGEN ?? "true"
  ),

  /**
   * D-20 Hebel 2: neue Compliance-Check-Stage zwischen `recheck` und `done`
   * aktivieren — prüft strict gegen antragsstruktur.abschnitte[].id +
   * maxZeichen, triggert Revision bei Verletzung (silent Backend-Stage).
   * Default OFF — entfaltet Wert erst wenn Dossiers maxZeichen-Felder haben.
   */
  complianceStageEnabled: parseEnvBool(process.env.PIPELINE_COMPLIANCE_STAGE),

  /**
   * D-20 Hebel 1: geschärfte CRITIQUE/SECTION/REVISION/RECHECK-Prompts mit
   * erweiterten Verbots-Listen + Few-Shot-Negativbeispielen aus UAT-Marker-Liste.
   * Default ON — praeviert Halluzinationen ohne messbare Regressionen.
   */
  sharpPrompts: parseEnvBool(
    process.env.PIPELINE_SHARP_PROMPTS ?? "true"
  ),

  /**
   * D-20 Hebel 4: geber-guidance.ts Rubrics schärfen + erweiterte
   * programm-kriterien.ts-ExtraGuidance-Einträge für die 11 Dossiers.
   * Default ON — Stiftung-/Wirtschaftspreis-Cluster profitiert (WIZ-03 +9 stiftung).
   */
  geberRoutingV2: parseEnvBool(
    process.env.PIPELINE_GEBER_ROUTING_V2 ?? "true"
  ),
});

/** Typed alias für externe Verwender (Test-Mocking, Typ-Annotationen etc.). */
export type PipelineConfig = typeof PIPELINE_CONFIG;
