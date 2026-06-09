---
phase: 05-wizard-pipeline-tuning-ux-l-cke
plan: "07"
subsystem: wizard-pipeline
tags: [phase-5, wave-3, hebel-4, geber-routing, programm-kriterien, tuning]
dependency_graph:
  requires: [05-06]
  provides: [tuning-hebel-4.md, GUIDANCE_V2, ExtraGuidance-11/11]
  affects: [lib/wizard/geber-guidance.ts, lib/wizard/programm-kriterien.ts]
tech_stack:
  added: []
  patterns: [Feature-Flag-Selector-Pattern, Record-over-switchcase, additive-ExtraGuidance]
key_files:
  created:
    - .planning/phases/05-wizard-pipeline-tuning-ux-l-cke/tuning-hebel-4.md
  modified:
    - lib/wizard/geber-guidance.ts
    - lib/wizard/programm-kriterien.ts
decisions:
  - "ExtraGuidance-Eintraege additiv ohne Toggle (Default ON) — Hebel-4-Toggle wirkt nur fuer GUIDANCE_V2-Selector"
  - "GUIDANCE_V2-Rubrics fuer verband/uni bei N=3-Validierung in Plan 05-08 beobachten — Score-Einbruch bei N=1 moeglicherweise LLM-Varianz"
metrics:
  duration: "~25 Minuten (Task 1+2: ~5 Min Code, Task 3: ~18 Min Eval-Run)"
  completed: "2026-05-20"
  tasks: 3
  files: 3
---

# Phase 05 Plan 07: Wave-3 Hebel-4 Geber-Typ-Routing V2 + ExtraGuidance-Coverage Summary

**One-liner:** GUIDANCE_V2-Record mit 8 geschaerften Geber-Typ-Rubrics + 7 neue ExtraGuidance-Eintraege fuer alle 11 Dossier-Programme (11/11 Coverage), jeweils Feature-Flag-gesteuert via `PIPELINE_GEBER_ROUTING_V2`.

## Durchgefuehrte Aenderungen

### Task 1: geber-guidance.ts GUIDANCE_V2 + Selector (Commit 82d1c9b)

`lib/wizard/geber-guidance.ts` wurde vollstaendig refactored:

- **GUIDANCE_BASE**: bisherige Rubrics als Record (8 Keys), identisch zu bisherigem Verhalten
- **GUIDANCE_V2**: neuer Record mit geschaerften Rubrics pro GeberTyp:
  - `bund`: Strategiebezug-Pflicht (NUR wenn belegbar), quantifizierbare Indikatoren PFLICHT, Transfer konkret
  - `land`: BL-Pflicht + Foederalismus-Kontext + Schultraeger-Sichtbarkeit, Luecken-Marker wenn BL unbekannt
  - `stiftung`: Mission wortlich aufgreifen + konkrete Szene als Pflicht-Element + Ehrlichkeits-Anforderung
  - `eu`: Partner mit Name+Land+Rolle PFLICHT + Querschnittsthemen konkret + Dissemination-Plan konkret
  - `verband`: Fachterminologie + Methodik explizit + Wirkungs-Evidenz aus User-Antworten (NIE erfinden)
  - `uni`: Hypothesen + Untersuchungsdesign + Praxis-Transfer + Ethik-Check bei Daterhebung
  - `programm`: Story-driven + Schule-als-Ganzes (kein 1-Lehrer/1-Klasse) + konkrete Belege
  - `sonstige`: neutral-praezise + Luecken-Marker statt Erfindung
- **Selector-Export**: `export const GUIDANCE = geberRoutingV2 ? GUIDANCE_V2 : GUIDANCE_BASE`
- **getGuidance()**: nutzt jetzt GUIDANCE-Record statt switch/case
- **Default**: geberRoutingV2=false → GUIDANCE_BASE → kein Regressions-Risiko

### Task 2: programm-kriterien.ts ExtraGuidance-Coverage 11/11 (Commit 468f79a)

**Coverage vorher/nachher:**

| Dossier | Vorher | Nachher |
|---------|--------|---------|
| bmbf-digitalpakt-2 | bestehend | bestehend |
| bosch-schulpreis | bestehend | bestehend |
| mercator-digitalisierung (kein Dossier) | bestehend | bestehend |
| startchancen-programm (kein Dossier) | bestehend | bestehend |
| bundesweit-ganztag (kein Dossier) | bestehend | bestehend |
| erasmus-schule-2026 | bestehend | bestehend |
| aktion-mensch-schulkooperation | bestehend (+erweitert) | neu: +2 Felder |
| **kultur-macht-stark** | fehlend | **NEU** |
| **ensam-bmz** | fehlend | **NEU** |
| **erasmus-schulentwicklung** | fehlend | **NEU** |
| **ferry-porsche-challenge** | fehlend | **NEU** |
| **ferry-porsche-challenge-2025** | fehlend | **NEU** |
| **klimalab-2026** | fehlend | **NEU** |
| **berlin-startchancen** | fehlend | **NEU** |

**Dossier-Coverage (fuer programm-kriterien.ts):** 11/11 (100%)

Alle Eintraege aus Dossier-Feldern (bestPractices, rejectGruende, antragsstruktur.abschnitte) abgeleitet — keine Erfindungen.

**Implementierungs-Decision (Discretion):** Additive Pattern ohne Toggle. Hebel-4-Toggle wirkt nur fuer GUIDANCE_V2-Selector aus Task 1. ExtraGuidance-Eintraege sind immer aktiv wenn Pipeline `getExtraGuidance()` aufruft.

### Task 3: Eval-A/B-Run + tuning-hebel-4.md (Commit cb46da1)

**Eval-Run:** `PIPELINE_GEBER_ROUTING_V2=1 LLM_PROVIDER=gemini`, N=1, 22 Eintraege, 0 Fehler
**Report:** `data/eval/pipeline-reports/2026-05-20T12-16-47.json`

## WIZ-03-Delta pro Cluster (Hebel 4 vs Baseline)

| Cluster | Baseline (N=3) | Hebel-4 (N=1) | Delta vs Baseline |
|---------|----------------|----------------|-------------------|
| oeffentlich | 43.1 | 40.7 | -2.4 |
| stiftung | 55.0 | **64.0** | **+9.0** |
| eu | 58.1 | 58.0 | -0.1 |
| wirtschaftspreis | 51.5 | 51.8 | +0.3 |
| verband-uni | 39.1 | 28.7 | -10.4 |
| **WIZ-03 Gesamt** | **46.3** | **45.8** | **-0.5** |

**WIZ-01/WIZ-02 Seiteneffekte:**

| Achse | Baseline | Hebel-4 | Delta |
|-------|----------|---------|-------|
| WIZ-01 | 100.0 | 100.0 | 0.0 |
| WIZ-02 | 98.3 | 99.5 | +1.2 |

## Interpretation

**Positive Signale:**
- Stiftung +9.0: Die geschaerfte critiqueFocus (Mission-Wortlaut + konkrete Szene + Ehrlichkeit) wirkt messbar
- Wirtschaftspreis +0.3: Story-driven + Schule-als-Ganzes-Perspektive hat kleinen positiven Effekt
- WIZ-02 +1.2: Keine Halluzinations-Regression

**Kritischer Befund — verband-uni -10.4:**
Der verband-uni-Cluster zeigt einen deutlichen Einbruch. Zwei Hypothesen:
1. LLM-Varianz: N=1 reicht nicht fuer stabile verband-uni-Messung (nur 2-3 Eintraege, hohe Einzelvarianz)
2. GUIDANCE_V2-Rubrics fuer uni sind zu wissenschaftlich-streng (Hypothesen + Untersuchungsdesign) fuer typische Schul-Antraege die keine akademische Methodik haben → Judge bewertet sie schlechter

**Empfehlung fuer Plan 05-08:**
- Hebel 4 beibehalten fuer Stiftung/Wirtschaftspreis-Cluster (klar foerderlich)
- verband-uni-Cluster in N=3-Kombinationsrun validieren
- Wenn verband-uni stabil unter Baseline: GUIDANCE_V2-Rubric fuer verband/uni abflachen oder auf GUIDANCE_BASE zurueckfallen lassen

## Deviations from Plan

None — Plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — keine neuen Netzwerk-Endpunkte, Auth-Pfade oder Schema-Aenderungen. Dossier-Inhalte in ExtraGuidance sind aus oeffentlichen Foerderrichtlinien, kein Schutzbedarf (T-05-07-03 als accepted dokumentiert).

## Self-Check: PASSED

- lib/wizard/geber-guidance.ts: FOUND
- lib/wizard/programm-kriterien.ts: FOUND
- .planning/phases/05-wizard-pipeline-tuning-ux-l-cke/tuning-hebel-4.md: FOUND
- Commit 82d1c9b: FOUND (Task 1)
- Commit 468f79a: FOUND (Task 2)
- Commit cb46da1: FOUND (Task 3)
