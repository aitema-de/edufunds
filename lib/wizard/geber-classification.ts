/**
 * Phase 5 D-28/-29: Mapping Programm-ID → strategische Geber-Gruppe.
 *
 * Überlagert die 8 `GeberTyp`-Werte aus `geber-guidance.ts` mit 4-5
 * strategischen Clustern für WIZ-03-Tonalitäts-Eval (D-10):
 * - "oeffentlich" (bund + land aggregiert)
 * - "stiftung"
 * - "eu"
 * - "wirtschaftspreis"
 * - "verband-uni" (verband + uni/wissenschaft aggregiert)
 *
 * Begründung: `verband` und `programm` als GeberTyp sind semantisch
 * heterogen (bosch nominal "verband" aber praktisch Wirtschaftspreis;
 * ENSAM-BMZ nominal "programm" aber BMZ = Bundesförderung). Strategische
 * Cluster liefern klarere Tonalitäts-Signale für WIZ-03-Rubric-Bewertung.
 *
 * Scope: 11 Dossiers aus data/richtlinien/ (Phase-5-Stand). Neue Programme
 * werden ad-hoc gepflegt — bei nicht gemappten IDs liefert getGeberGruppe()
 * "unknown" + Console-Warning (RESEARCH Pitfall 4, Wave-2-Eval-Skript darf
 * nicht silent skippen).
 */

/**
 * Strategische Geber-Cluster für WIZ-03-Tonalitäts-Eval.
 * 4-5 Werte (D-10 / D-29) — überlagert die 8 GeberTyp-Werte aus geber-guidance.ts.
 */
export type GeberGruppe =
  | "oeffentlich"
  | "stiftung"
  | "eu"
  | "wirtschaftspreis"
  | "verband-uni";

/**
 * Mapping Programm-ID → strategische Geber-Gruppe für alle 11 Dossiers.
 *
 * Mapping-Entscheidungen (D-28):
 * - bmbf-digitalpakt-2:            bund → oeffentlich
 * - berlin-startchancen:           land → oeffentlich
 * - ensam-bmz:                     BMZ = Bundesförd. (trotz globalem Lernen-Fokus) → oeffentlich
 * - aktion-mensch-schulkooperation: stiftung → stiftung
 * - klimalab-2026:                 foerdergeberTyp=stiftung (foerderprogramme.json) → stiftung
 * - erasmus-schule-2026:           eu → eu
 * - erasmus-schulentwicklung:      eu → eu
 * - bosch-schulpreis:              nominal verband, praktisch Wirtschaftspreis → wirtschaftspreis
 * - ferry-porsche-challenge-2025:  wirtschaftspreis → wirtschaftspreis
 * - ferry-porsche-challenge:       wirtschaftspreis (Legacy-Version) → wirtschaftspreis
 * - kultur-macht-stark:            verband → verband-uni
 */
const MAPPING: Readonly<Record<string, GeberGruppe>> = Object.freeze({
  "bmbf-digitalpakt-2": "oeffentlich",
  "berlin-startchancen": "oeffentlich",
  "ensam-bmz": "oeffentlich",
  "aktion-mensch-schulkooperation": "stiftung",
  "klimalab-2026": "stiftung",
  "heinz-nixdorf-stiftung-projektfoerderung-mint": "stiftung",
  "erasmus-schule-2026": "eu",
  "erasmus-schulentwicklung": "eu",
  "bosch-schulpreis": "wirtschaftspreis",
  "ferry-porsche-challenge-2025": "wirtschaftspreis",
  "ferry-porsche-challenge": "wirtschaftspreis",
  "kultur-macht-stark": "verband-uni",
});

/**
 * Gibt die strategische Geber-Gruppe für eine Programm-ID zurück.
 *
 * Bei nicht gemappten IDs wird "unknown" geliefert + Console-Warning
 * (RESEARCH Pitfall 4 — Eval-Skript darf nicht silent skippen).
 *
 * @param programmId  ID aus data/foerderprogramme.json (z. B. "bmbf-digitalpakt-2")
 * @returns           Strategische Geber-Gruppe oder "unknown" bei fehlendem Mapping
 */
export function getGeberGruppe(programmId: string): GeberGruppe | "unknown" {
  const gruppe = MAPPING[programmId];
  if (gruppe !== undefined) return gruppe;
  console.warn(
    `[geber-classification] programmId "${programmId}" nicht gemappt — Fallback "unknown". ` +
      `Mapping in lib/wizard/geber-classification.ts ergänzen (D-28).`
  );
  return "unknown";
}

/**
 * Alle bekannten Cluster-Namen (für Eval-Aggregation D-12 + Wave-3-Hebel).
 * Gefroren — kein Laufzeit-Mutationsrisiko.
 */
export const ALL_GEBER_GRUPPEN: readonly GeberGruppe[] = Object.freeze([
  "oeffentlich",
  "stiftung",
  "eu",
  "wirtschaftspreis",
  "verband-uni",
]);

/**
 * Liefert das gesamte Mapping als unveränderliches Objekt.
 * Verwendet für Tests + Wave-3-Hebel-4 ExtraGuidance-Lookup.
 */
export function listMapping(): Readonly<Record<string, GeberGruppe>> {
  return MAPPING;
}
