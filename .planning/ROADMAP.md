# Roadmap: EduFunds — Live-UAT-Reife für Schulen + Schulfördervereine

## Overview

Diese Roadmap führt EduFunds vom heutigen Stand (`feature/wizard-adaptive` HEAD `49a1102`, Pipeline End-to-End funktional, alle 5 UAT-Bugs der 28.04.-Runde gefixt, interner Testbetrieb) zur Live-UAT-Reife mit echten Schulen und Schulfördervereinen. Die zentrale Strategie ist **Eval-First**: Bevor Matcher und Pipeline blind getuned werden, entstehen messbare Eval-Korpora als Regressions- und Verbesserungs-Messlatte. Erst danach folgen Quality-Iterationen, die strukturelle Programm-Pflege (Vollautomation + erweitertes Dossier-Schema) und schließlich strukturierte Live-UATs mit Pilot-Schulen aus Koljas Netzwerk. Die Roadmap ist bewusst auf interne Test- und Pilot-Reife zugeschnitten — Stripe-Live, Auth, Schulträger-Abos und Production-Migration bleiben v2.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Eval-Korpus Matcher** — Messbare Regressions-Basis für jede Matcher-Iteration etablieren ✓ 2026-05-03
- [ ] **Phase 2: Matcher-Quality** — Matcher liefert strukturierte Begründungen und erkennt vage Anliegen
- [x] **Phase 3: Programm-Pflege Foundation** — Cron-Skripte auf DeepSeek-Wrapper migriert, Dossier-Schema um Best-Practices/Reject-Gründe/Vorbild-Formulierungen/Frist-Logik erweitert ✓ 2026-05-06
- [ ] **Phase 4: Programm-Pflege Vollautomation** — Scanner→Extractor→Queue voll automatisiert, alle 11 bestehenden Dossiers auf erweitertes Schema migriert
- [ ] **Phase 5: Wizard-Pipeline-Tuning + UX-Lücke** — Höhere Programmkonformität, Halluzinations-Resistenz, Förderwahrscheinlichkeit; Reload-Resume geschlossen
- [ ] **Phase 6: Live-UAT mit Pilot-Schulen** — Strukturierte UATs mit 3–5 Pilot-Anwendern, Tracker pro Session, konsolidierte Bug-Fix-Welle

## Phase Details

### Phase 1: Eval-Korpus Matcher
**Goal**: Messbare Regressions- und Verbesserungs-Basis für jede zukünftige Matcher-Iteration etablieren — bevor MATCH-02/-03 oder Tuning ohne Messlatte erfolgen.
**Depends on**: Nothing (first phase)
**Requirements**: MATCH-01
**Success Criteria** (was nach Phase TRUE sein muss):
  1. Eval-Korpus mit 20–30 realistischen Schul-Anliegen (kurz / ausführlich / vag) liegt versioniert im Repo (z. B. `data/eval/matcher-korpus.json`)
  2. Jeder Korpus-Eintrag hat `expected_top3` und `expected_off_target` (kuratiert durch Kolja)
  3. Eval-Skript (`scripts/eval-matcher.ts` o. ä.) misst Top3-Trefferrate und Off-Target-Rate gegen den aktuellen `lib/wizard/matcher.ts`-Code, gibt strukturierten Report (JSON + Konsolen-Tabelle)
  4. Baseline-Score des aktuellen Matchers ist dokumentiert (Zahl + Datum) als Vergleichswert für Phase 2
**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md — Eval-Skript + Korpus-Schema + 3-Eintrag-Stub (Wave 1, autonomous) ✓ 2026-05-03
- [x] 01-02-PLAN.md — Korpus-Vollkuration durch Kolja (Checkpoint) + Baseline-Run + BASELINE.md (Wave 2) ✓ 2026-05-03

### Phase 2: Matcher-Quality
**Goal**: Matcher liefert strukturierte Begründungen statt 15-Wort-Pauschale und erkennt vage Anliegen mit Klärungsfrage statt blindem Ranking.
**Depends on**: Phase 1
**Requirements**: MATCH-02, MATCH-03
**Success Criteria** (was nach Phase TRUE sein muss):
  1. Matcher-API-Response enthält pro Treffer ein strukturiertes `passt_weil` + `achtung_bei` (statt eines kurzen `begruendung`-Strings)
  2. Bei vagem Anliegen (Heuristik definiert) gibt der Matcher eine Klärungsfrage zurück und unterdrückt das Ranking — Frontend rendert die Klärungsfrage statt der Trefferliste
  3. Eval-Skript aus Phase 1 misst messbare Verbesserung gegenüber Baseline (z. B. Top3-Trefferrate steigt, Off-Target-Rate sinkt) und ist bei jeder PR Pflicht-Vorabcheck
  4. UI in `app/antrag/start/` zeigt strukturierte Begründung im Trefferblock korrekt an (`passt-weil`-Block + `achtung-bei`-Block visuell getrennt)
**Plans:** 8 plans (4 Initial + 4 Gap-Closure nach Phase-2-Verifikations-FAIL)
**UI hint**: yes

Plans:
- [x] 02-00-PLAN.md — Wave 0 Test-Skelette (matcher.parser/dispatch + MatchResultList) (Wave 0, autonomous) ✓ 2026-05-04
- [x] 02-01-PLAN.md — Backend: Tagged Union MatchResult, parsePipeMatches 4-Spalten, CLARIFY-Dispatch, MATCHER_SYSTEM-Prompt, API-Route (Wave 1, autonomous) ✓ 2026-05-04
- [x] 02-02-PLAN.md — Frontend: ClarificationCard, MatchResultList passt_weil/achtung_bei, StartClient State-Maschine, UI-Tests, Browser-Smoke-Checkpoint (Wave 2) ✓ 2026-05-04 (Smoke deferred → Plan 02-07)
- [x] 02-03-PLAN.md — Eval-Apparat: Korpus-Erweiterung (Kolja-Checkpoint), eval-matcher.ts mit Clarif-Metriken + D-16 Threshold-Gate, BASELINE.md-Phase-2-Eintrag (Wave 2) ✓ 2026-05-04 (Threshold-Gate FAIL → Plan 02-06)
- [ ] 02-04-PLAN.md — **Gap-Closure**: MATCHER_SYSTEM-Prompt-Tuning (Recall + Clarif-Precision) + WR-05 Score-Range-Filter (Wave 1, autonomous)
- [ ] 02-05-PLAN.md — **Gap-Closure**: WR-01/WR-02 StartClient-Hardening + WR-03/WR-04 Eval-Skript-Hardening (Wave 1, autonomous)
- [ ] 02-06-PLAN.md — **Gap-Closure**: Live-Eval-Re-Run nach Plan 02-04 + 02-05, BASELINE.md-Phase-2.1-Eintrag (Wave 2, depends_on 04+05)
- [ ] 02-07-PLAN.md — **Gap-Closure**: Browser-Smoke 4 UI-Pfade + Mobile + WR-02-Reset-Verifikation (Wave 2, checkpoint, depends_on 04+05)

### Phase 02.1: Frontend-Polish + Stripe-Vorbereitung (INSERTED)

**Goal**: Markt-Reife-Polish vor Live-UAT — vier UI-Polish-Items (Antrag-Detail-Lese-UX, Empty-States, Mobile-Touch, Stage-Tracking-Loading-State), Stripe-Webhook-Code-Pfade ohne Live-Account, vier UAT-Vorbereitungs-Templates und WIZ-04 Reload-Resume aus Phase 5 nach 02.1 gezogen.
**Depends on:** Phase 2
**Requirements**: WIZ-04 (verschoben aus Phase 5), UI-01, UI-02, UI-03, UI-04, PAY-01-prep, UAT-PREP-01, UAT-PREP-02, UAT-PREP-03, UAT-PREP-04
**Success Criteria** (was nach Phase TRUE sein muss):
  1. /antrag/meine zeigt Action-orientierten Empty-State (CTA "Anliegen schildern" -> /antrag/start) und MatchResultList rendert bei 0 Treffern Empty-State mit 3 Reformulierungs-Tipps + Reset-CTA (D-05)
  2. AntragResult rendert h2-Anker-IDs (Slug aus Heading-Text mit Umlaut-Mapping) + sticky AntragSectionNav-Sidebar nur md:+ + on-hover PenLine-Edit-Button bei paid=true (D-02 + D-14)
  3. GeneratingProgress zeigt 7 Pipeline-Stages aus pipeline.ts mit pending/active/done-Visualisierung; phase=failed rendert Fehler-Card mit Retry-CTA (D-04 + D-15)
  4. Reload waehrend phase=interviewing UND phase=generating fuehrt User exakt an die letzte Frage / Pipeline-Stage zurueck — keine Pipeline-Doppelstarts; Stage-Heartbeat ueber jsonb_set in antrag_data.generation persistiert (D-12 + D-13, WIZ-04 erfuellt)
  5. Stripe-Webhook-Route ist gehaertet: 4 explizite Event-Cases (completed/expired/refunded/async_failed) mit klar markierten PAY-03/PAY-04-TODO-Stubs; Smoke-Skript via generateTestHeaderString lokal lauffaehig + STRIPE_SETUP.md erweitert (D-06 + D-07 + D-08)
  6. Mobile-Touch-Targets (sm:py-3 / sm:min-h-[140px]) auf Critical-Paths Anliegen-Form / QuestionCard / MatchResultList / PDF-Download / MyAntraege-Card-Stack (D-03)
  7. .planning/uat/ enthaelt 4 fertig nutzbare Markdown-Templates: UAT-PLAN-TEMPLATE.md, UAT-BEFUNDE-TEMPLATE.md, PILOTEN.md (Skelett, Kolja fuellt Namen), UAT-ANSCHREIBEN.md (Du / Sie / Follow-Up) (D-09)
**Plans:** 6 plans
**UI hint**: yes

Plans:
- [x] 02.1-01-PLAN.md — Wave-0 Test-Skelette + Smoke-Skript-Skelette (Wave 0, autonomous)
- [x] 02.1-02-PLAN.md — Stripe-Webhook-Haertung + TODO-Stubs + Smoke (Wave 1, autonomous)
- [x] 02.1-03-PLAN.md — UI-Polish Block A: Empty-States MyAntraege/MatchResultList + onReset + Mobile-Touch (Wave 1, autonomous)
- [x] 02.1-04-PLAN.md — UI-Polish Block B: Antrag-Detail Anker-Nav + AntragSectionNav neu + Edit-Button (Wave 1, autonomous)
- [x] 02.1-05-PLAN.md — UAT-Templates 4 Stueck (Plan/Befunde/Piloten/Anschreiben) (Wave 1, autonomous)
- [x] 02.1-06-PLAN.md — WIZ-04 Reload-Resume + Stage-Tracking + GeneratingProgress + failed-UI (Wave 2, autonomous)

### Phase 3: Programm-Pflege Foundation
**Goal**: Cron-Skripte auf den einheitlichen DeepSeek-Wrapper umstellen und das Dossier-Schema um vier qualitätskritische Felder erweitern, damit Phase 4 darauf aufbauen kann.
**Depends on**: Phase 1 (parallel zu Phase 2 möglich, da unabhängiger Code-Bereich)
**Requirements**: FETCH-01, FETCH-03
**Success Criteria** (was nach Phase TRUE sein muss):
  1. `scripts/extract-richtlinie.ts` und `scripts/scan-new-programs.ts` rufen `lib/wizard/llm.ts`-Wrapper, nicht mehr `@google/generative-ai` direkt — Default DeepSeek `deepseek-v4-flash`, Gemini-Fallback bleibt verfügbar
  2. GitHub-Workflows `weekly-dossier-extraction.yml` + `weekly-program-scan.yml` nutzen `DEEPSEEK_API_KEY` (Gemini-Key optional) und laufen erfolgreich gegen den neuen Wrapper (mind. 1 Test-Run grün)
  3. `lib/wizard/richtlinien-schema.ts` ist um vier Felder erweitert: (a) `bestPractices`, (b) `rejectGruende`, (c) `vorbildFormulierungen`, (d) `fristLogik` (Enum: `rolling` | `fixe_stichtage` + Stichtags-Liste)
  4. Schema-Validierung (`scripts/validate-data.ts` o. ä.) lehnt Dossiers ohne neue Pflichtfelder ab, akzeptiert Dossiers, die das alte Schema 1:1 weiternutzen (Migrations-Pfad in Phase 4 freigegeben)
**Plans:** 3/3 plans complete

Plans:
- [x] 03-01-schema-validator-library-PLAN.md — Schema-Erweiterung um 4 optionale Felder + Zod-Validator-Library + Wave-0-Tests (Wave 1, autonomous) ✓ 2026-05-06
- [x] 03-02-cron-migration-cli-validator-PLAN.md — Cron-Skripte auf llm.ts-Wrapper migriert + SYSTEM_PROMPT erweitert + scripts/validate-richtlinien.ts neu mit --legacy-Flag (Wave 2, autonomous, depends_on 03-01) ✓ 2026-05-06
- [x] 03-03-workflow-migration-test-runs-PLAN.md — GitHub-Workflows auf DEEPSEEK_API_KEY-Pflicht + LLM_PROVIDER-Input + 4 neue Reviewer-Checkpoints + Kolja-Checkpoint mit 3 Manual-Smokes (Wave 3, NOT autonomous, depends_on 03-02) ✓ 2026-05-06

### Phase 4: Programm-Pflege Vollautomation + Dossier-Migration
**Goal**: Vollautomatischer Programm-Pflegeprozess (Scanner → Extractor → Queue) und Migration aller 11 bestehenden Dossiers auf das erweiterte Schema, damit Pipeline-Tuning in Phase 5 auf vollständigen Daten arbeitet.
**Depends on**: Phase 3
**Requirements**: FETCH-02, FETCH-04
**Success Criteria** (was nach Phase TRUE sein muss):
  1. Scanner findet neue Programme aus `program-sources.json`, ruft Extractor automatisch und persistiert ein neues Dossier `data/richtlinien/<programmId>.json` ohne Mensch-In-The-Loop für den Happy-Path
  2. Neu gefundenes Programm landet automatisch in `data/richtlinien-prioritaeten.json` mit berechnetem Queue-Score (klare Score-Logik dokumentiert, z. B. `kiAntragGeeignet` × Aktualität × Bundesland-Coverage)
  3. Alle 11 bestehenden Dossiers in `data/richtlinien/` enthalten die vier Phase-3-Felder (Best Practices, Reject-Gründe, Vorbild-Formulierungen, Frist-Logik) — Schema-Validator läuft grün
  4. End-to-End-Smoke gegen ein neues Programm (Scanner → Dossier → Queue → Wizard-Pipeline-Lauf) liefert Antrag mit erweiterten Schema-Feldern als Pipeline-Input ohne Crash
**Plans:** 4 plans

Plans:
- [ ] 04-01-queue-status-expired-cleanup-PLAN.md — lib/wizard/queue.ts neu mit Status-Enum-Erweiterung 'expired' + scripts/cleanup-expired-queue.ts mit HTTP-HEAD + Frist-Check (D-04/D-05/D-06, Wave 1, autonomous)
- [ ] 04-02-migrate-legacy-dossier-script-PLAN.md — scripts/migrate-legacy-dossier.ts Targeted-Fill-CLI fuer einzelnes Legacy-Dossier (D-07, Wave 1, autonomous, parallel zu 04-01)
- [ ] 04-03-sample-first-migration-vollmigration-PLAN.md — Sample-First-Migration (bmbf-digitalpakt-2 + ferry-porsche-challenge-2025) + Vollmigration aller 11 Dossiers auf Branch dossier-migration/phase-04 (D-08/D-09, Wave 2, NOT autonomous: 2 Review-Checkpoints, depends_on 04-02)
- [ ] 04-04-vollautomations-workflow-library-refactor-e2e-PLAN.md — Single-Workflow weekly-auto-pflege.yml + scripts/auto-pflege-step.ts + extract-richtlinie Library-Refactor + Loeschungen + E2E-Dry-Run-Smoke (D-01/D-02/D-03/D-10/D-11/D-12, Wave 3, NOT autonomous, depends_on 04-01+04-03)

### Phase 5: Wizard-Pipeline-Tuning + UX-Lücke
**Goal**: Pipeline auf höhere Programmkonformität, Halluzinations-Resistenz und Förderwahrscheinlichkeit tunen — gemessen gegen einen Pipeline-Eval-Korpus analog zu Phase 1. Reload-Resume-UX-Lücke aus dem 28.04.-UAT-Memo schließen.
**Depends on**: Phase 4 (für vollständige Dossier-Daten als Tuning-Basis)
**Requirements**: WIZ-01, WIZ-02, WIZ-03, WIZ-04
**Success Criteria** (was nach Phase TRUE sein muss):
  1. Pipeline-Eval-Korpus (analog Matcher-Korpus aus Phase 1) liegt versioniert vor: niedrig-qualitative Test-Inputs + erwartete Halluzinations-Marker + Pflichtabschnitte/Zeichenlimits aller 11 Dossiers
  2. Pipeline-Eval-Run gegen alle 11 Dossiers zeigt für WIZ-01: 100 % der Pflichtabschnitte aus dem Dossier sind im finalen Antrag vorhanden, Zeichenlimits werden eingehalten
  3. Pipeline-Eval-Run gegen verschärfte niedrig-qualitative Inputs zeigt für WIZ-02: 0 organisatorische Halluzinationen (keine erfundenen Rahmenverträge / Tarifsysteme / nicht-genannten Kooperationspartner) und ehrliche Lücken-Markierungen
  4. „Passt-zum-Geber"-Tonalitäts-Check (WIZ-03) liefert messbares Score-Delta gegen Baseline pro Geber-Typ (öffentlich / Stiftung / Wirtschaftspreis) — Score und Methode dokumentiert
  5. User kann den Wizard-Tab schließen und über `/antrag/meine` oder direkt über die programmspezifische Wizard-URL den Lauf an exakt der letzten Frage / Phase fortsetzen (WIZ-04) — auch nach Hard-Reload während `phase=interviewing` oder `phase=generating`
**Plans**: TBD
**UI hint**: yes

### Phase 6: Live-UAT mit Pilot-Schulen
**Goal**: Strukturierte UATs mit 3–5 echten Schulen / Schulfördervereinen aus Koljas Netzwerk durchführen, Befunde pro Session sauber tracken und in einer konsolidierten Bug-Fix-Welle adressieren — analog zur 28.–30.04.-Fix-Welle.
**Depends on**: Phase 5
**Requirements**: UAT-01, UAT-02, UAT-03
**Success Criteria** (was nach Phase TRUE sein muss):
  1. 3–5 dokumentierte UAT-Sessions mit echten Pilot-Anwendern sind durchgeführt (verschiedene Programm × Schul-Typ-Kombis), Roh-Mitschriften + Antrag-Outputs liegen archiviert
  2. Pro UAT-Session existiert ein Befunde-Tracker (analog `~/.claude/projects/-home-kolja/memory/edufunds-uat-pipeline-befunde-2026-04-28.md`) mit Bug-IDs, Schweregrad, Fix-Status
  3. Bug-Fix-Welle ist konsolidiert: jeder UAT-Bug ist entweder gefixt + verifiziert (Pipeline-Eval grün) oder explizit als „akzeptiertes Risiko / v2" dokumentiert
  4. Die Pipeline-Eval-Korpora aus Phase 1 + 5 sind um die UAT-Befunde erweitert (jeder gefundene Bug hat einen Test-Case, der ihn zukünftig als Regression fängt)
  5. Abschluss-Memo (Pilot-UAT-Retro) liegt vor: Welche Pilot-Anwender sind bereit für „Antrag wirklich einreichen"-Phase, welche Lücken bleiben, was muss in v2
**Plans**: TBD

## Progress

**Execution Order:**
Phasen werden numerisch ausgeführt: 1 → 2 → 3 → 4 → 5 → 6. Phasen 2 und 3 sind code-seitig unabhängig und können bei freiem Kontext parallel geplant werden, Phase 4 wartet aber auf 3.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Eval-Korpus Matcher | 2/2 | Complete    | 2026-05-03 |
| 2. Matcher-Quality | 0/TBD | Not started | - |
| 3. Programm-Pflege Foundation | 3/3 | Complete    | 2026-05-06 |
| 4. Programm-Pflege Vollautomation | 0/4 | Not started | - |
| 5. Wizard-Pipeline-Tuning + UX | 0/TBD | Not started | - |
| 6. Live-UAT mit Pilot-Schulen | 0/TBD | Not started | - |

---
*Roadmap created: 2026-04-30 (brownfield, mapped 14 v1-Requirements auf 6 Phasen — Eval-First-Strategie + Pflege-Foundation-vor-Vollautomation respektiert)*
