# EduFunds

## What This Is

EduFunds ist eine adaptive KI-Antragsplattform für deutsche Schulen und Schulfördervereine. Die Plattform matcht das Anliegen einer Schule auf passende Förderprogramme, führt einen programm-spezifischen Wizard durch (DeepSeek-Pipeline mit Outline → Sections → Critique → Recheck → Revision → Finanzplan-Generator → Konsistenz-Check) und liefert nach Zahlung den vollständigen Antragstext zum Download.

## Core Value

**Programme werden nicht generisch verarbeitet — jedes Programm hat eigene Antragslogik, Frageform, Zeichenbeschränkungen und Förderkriterien. Der Wizard nutzt programm-spezifisches Wissen (Dossier), um zielgerichtet zu fragen und einen Antrag zu erstellen, der zu 100 % den Förderkriterien entspricht, semantisch hochwertig ist, nicht halluziniert und durch Inhalt + Formulierung + Finanzplanung + Struktur die maximale Förderwahrscheinlichkeit erzielt.**

## Requirements

### Validated

<!-- Aus Codebase-Map abgeleitet (.planning/codebase/) — implementiert in feature/wizard-adaptive (HEAD 49a1102, 43 Commits). -->

- ✓ **Programm-Matcher** mit 2-Stufen-Logik (regelbasierter Prefilter auf Bundesland/Schulform/Kategorie + LLM-Ranking auf Top-20, ~2s Antwortzeit) — `app/api/match/`, `lib/wizard/matcher.ts`
- ✓ **Wizard-Interviewer** mit max 12 adaptiven Fragen, geber-typ-spezifisch, richtlinien-aware — `lib/wizard/interviewer.ts`
- ✓ **Dedizierte Facts-Extractor-Stage** (Bug #5-Fix 30.04.) — extrahiert systematisch slot-by-slot über alle User-Antworten — `lib/wizard/facts-extractor.ts`
- ✓ **Generate-Pipeline 7-stufig** (Outline → Section → Critique → Recheck → Revision → Finanzplan → Konsistenz) mit Halluzinations-Verbots-Liste in Section + Finanzplan und userAnswers als Quellen-Anker — `lib/wizard/pipeline.ts`
- ✓ **Programm-spezifisches Richtlinien-Dossier-Schema** (Antragsstruktur mit Pflicht-/Optional-Abschnitten, Leitfragen, Zeichenlimits, Stilhinweisen, Förderhöhe, Eigenmittel-Pflicht, Kostenpositionen, Kumulierungs-Regeln, Notizen) — `lib/wizard/richtlinien-schema.ts`
- ✓ **11 fertige Dossiers** (DigitalPakt 2.0, Berlin-Startchancen, Kultur macht stark, ENSA-BMZ, Erasmus+ Schulbildung 2026, Erasmus+ Schulentwicklung, Ferry Porsche Challenge 2025+2026, Klimalab 2026, weitere) in `data/richtlinien/`
- ✓ **DeepSeek-Provider-Wrapper** (default `deepseek-chat`, Gemini-Fallback per `LLM_PROVIDER=gemini`, 60s Hard-Timeout) — `lib/wizard/llm.ts`
- ✓ **Anonyme Session-Persistenz** via `session_token` (UUID, localStorage) — `lib/wizard/session.ts`, Migrationen `db/migrations/002_wizard_session.sql` + `003_paywall.sql`
- ✓ **Pre-Flight-Ampel + Critique-Schärfung** für Halluzinations-Audit (Bug #1-Fix 28.04.) — `lib/wizard/prompts.ts:CRITIQUE_SYSTEM`
- ✓ **Antragstitel-Fallback-Cascade** (Bug #4-Fix 28.04.) — `lib/wizard/title-fallback.ts`
- ✓ **Finanzplan-Validator + Autofix** mit 6 Verstoss-Klassen — `lib/wizard/finanzplan-validator.ts`, `finanzplan-autofix.ts`
- ✓ **Stripe-Paywall-Stub** mit Dev-Mock (`NEXT_PUBLIC_PAYWALL_DEV_MOCK=1`) — `app/api/wizard/checkout/route.ts`
- ✓ **Wöchentliche Cron-Skripte** für Dossier-Extraktion und Programm-Scan — `scripts/extract-richtlinie.ts`, `scripts/scan-new-programs.ts`, `.github/workflows/weekly-*.yml` (nutzen aktuell noch Gemini-direkt)
- ✓ **Smoke-Test-Suite** mit Live-LLM-Calls (`scripts/smoke-pipeline-with-extractor.ts` etc.) — verifiziert Pipeline-Hebel End-to-End
- ✓ **Pipeline-Eval-Apparat** (Validiert in Phase 5: Wizard-Pipeline-Tuning) — versionierter Eval-Korpus `data/eval/pipeline-korpus.json` (22 Einträge, 112 Halluzinations-Marker), `scripts/eval-pipeline.ts` mit Replay/Live-Modus, Baseline in `BASELINE.md`, CI-Gate `.github/workflows/pipeline-eval.yml`
- ✓ **WIZ-01 Programmkonformität-Tuning** (Validiert in Phase 5) — Pflichtabschnitt-Coverage-Metrik, Baseline WIZ-01=100 %; Tuning-Hebel 1+3 (sharp-prompts, dossier-injection) config-gated, default ON
- ✓ **WIZ-02 Halluzinations-Resistenz-Tuning** (Validiert in Phase 5) — kuratierte Marker-Detection gegen UAT-28.04.-Pattern, Baseline WIZ-02=98,3; geschärfter Verbotsblock + Compliance-Check-Stage (Hebel 2, default OFF bis Dossiers `maxZeichen` setzen)
- ✓ **WIZ-03 Geber-Tonalitäts-Tuning** (Validiert in Phase 5) — LLM-as-Judge-Rubric pro strategischer Geber-Gruppe (`geber-classification.ts`, 11 Dossiers → 5 Cluster), Geber-Routing-V2 (Hebel 4, default ON)

### Active

<!-- Nächste Milestone: 4 Arbeitsbereiche + Eval-First-Strategie + Live-UAT. -->

**Matching-Qualität:**
- [ ] **MATCH-01**: Eval-Korpus mit 20–30 realistischen Schul-Anliegen (kurz/ausführlich/vag), jeweils mit `expected_top3` und `expected_off_target` — kuratiert von Kolja, dient als Regressions- und Verbesserungs-Messlatte
- [ ] **MATCH-02**: Matcher liefert strukturierte Begründung pro Treffer (passt-weil + Achtung-bei) statt 15-Wort-Pauschale
- [ ] **MATCH-03**: Matcher erkennt vages Anliegen und stellt Klärungsfrage, bevor er rankt

**Programm-Fetch + Cronjobs:**
- [ ] **FETCH-01**: Cron-Skripte `extract-richtlinie.ts` + `scan-new-programs.ts` von Gemini-direkt auf `lib/wizard/llm.ts`-Wrapper umstellen, Default DeepSeek `deepseek-v4-flash`
- [ ] **FETCH-02**: Vollautomatischer Programm-Pflegeprozess Scanner → Extractor → Queue (Scanner findet neue Programme, Extractor erstellt Dossier, neues Programm landet automatisch in `data/richtlinien-prioritaeten.json` mit Queue-Score)
- [ ] **FETCH-03**: Dossier-Schema-Erweiterung um (a) Best Practices erfolgreicher Anträge, (b) typische Reject-Gründe, (c) programm-spezifische Vorbild-Formulierungen, (d) Frist-Logik (rolling vs. fixe Stichtage)
- [ ] **FETCH-04**: Bestehende 11 Dossiers auf erweitertes Schema migrieren

**Antragswizard-Qualität:**
- [ ] **WIZ-04**: Reload-Resume in laufendem Wizard schließen (UX-Lücke aus UAT-Memo) — verschoben nach Phase 02.1

**Live-UAT:**
- [ ] **UAT-01**: Strukturiertes UAT mit 3–5 echten Schulen / Schulfördervereinen aus Koljas Netzwerk
- [ ] **UAT-02**: UAT-Befunde-Tracker analog zu `~/.claude/projects/-home-kolja/memory/edufunds-uat-pipeline-befunde-2026-04-28.md` für jede Live-Session
- [ ] **UAT-03**: Bug-Fix-Welle nach UAT-Befunden (analog zur 28.–30.04.-Fix-Welle)

### Out of Scope

<!-- Bewusst aufgeschoben für aktuelle Milestone. -->

- **Stripe-Account-Anlage / Live-Paywall** — Pfad A entschieden, kommt nach UAT-Stabilität. Dev-Mock reicht für internen Testbetrieb. Code hat noch kein `invoice_creation`/`automatic_tax`.
- **Auth-System / User-Accounts** — anonyme Sessions reichen für aktuelles Konzept. Wenn überhaupt, dann erst für Schulträger-Abos in späterer Milestone.
- **Schulträger-Abos / Jahres-Pläne** — braucht Auth + andere Stripe-Logik, Phase 2+
- **Mobile-App** — Web-First, Mobile-Browser akzeptabel
- **5 Legacy-Test-Suites fixen** (Header.test, Footer.test, ki-antrag-generator.test, backend-utils.test, contact.test) — Pre-Existing aus Vor-Wizard-Phase, kein Wizard-Qualitäts-Impact
- **Newsletter / Resend-Integration** — nicht im aktuellen Scope der KI-Pipeline
- **Vollautomatische Antragseinreichung beim Geber** — User schickt selbst ein, Plattform liefert nur den Volltext
- **Mehrsprachigkeit** — Deutsch only, deutscher Bildungssektor

## Context

**Aktueller Branch:** `feature/wizard-adaptive` (43 Commits, gepusht, HEAD `49a1102`)
**Nutzungsmodus:** interner Testbetrieb. Live-Production (`app.edufunds.org`) und Staging laufen noch auf altem Stand vor Wizard.
**Erstnutzer:** Schulen und Schulfördervereine (deutscher Bildungssektor)

**Aktuelle Datenbasis:**
- 131 Förderprogramme im Katalog `data/foerderprogramme.json`
- 82 davon mit `kiAntragGeeignet=true` in der Prio-Queue
- 11 fertige Dossiers, 70 offen, 1 skip
- 12 dokumentierte Förderkriterien-Kategorien (Digital, Sport, Kultur, MINT, Inklusion, …)

**LLM-Provider:**
- Default: DeepSeek `deepseek-chat` (Reasoning-frei, kosteneffizient: ~0,4 ¢ pro Pipeline-Lauf)
- Fallback: Gemini Flash 2.0 / Pro 2.5 per `LLM_PROVIDER=gemini`
- Cron-Skripte nutzen aktuell noch Gemini-direkt (Migration in FETCH-01)

**Persistente Projekt-Memory:** `~/.claude/projects/-home-kolja/memory/edufunds-project.md` (sessionsübergreifender Kontext, Stand 30.04.)

**UAT-Historie:** Erste End-to-End-UAT 28.04. mit DigitalPakt 2.0 + Borsigwalder Grundschule deckte 5 Bugs auf, alle gefixt bis 30.04. (`edufunds-uat-pipeline-befunde-2026-04-28.md`).

## Constraints

- **Tech-Stack**: Next.js 16 (App Router) + React 18 + TypeScript + Tailwind, PostgreSQL via `pg` (kein ORM, kein Supabase) — vorgegeben durch bestehende Codebase, nicht zu ändern
- **LLM-Provider**: DeepSeek `deepseek-chat` als Default — `deepseek-v4-flash`/`-pro` sind Reasoning-Modelle (~50–80 interne Tokens), für Speed nicht geeignet. Gemini-Fallback bleibt für Provider-Diversifikation
- **Sprache**: Deutsch in allen UI-Strings, Doku, Commits (Conventional Commits mit deutscher Subject-Line). ASCII in JSON-Datenfeldern (Encoding-Sicherheit)
- **Hosting**: Hetzner-Server `49.13.15.44`, Docker + Traefik, Container `edufunds-app`/`edufunds-staging`/`edufunds-postgres`/`edufunds-landing`
- **Datenschutz**: AVV-Setup für DeepSeek-Provider noch nicht explizit dokumentiert — bei Live-Produktion vor Schul-Onboarding klären (Out of Scope für aktuelle Milestone, aber Reminder für Vor-Production-Phase)
- **Zielgruppe-Kompetenz**: Schul-IT-Betreuer / Schulleitungen / Fördervereins-Vorstände, kein Antragstellungs-Profi-Wissen vorausgesetzt
- **Performance**: Matcher < 3s, einzelner Wizard-Turn < 5s, Pipeline-Generation 90–150s, Cost pro Antrag < 1 ¢

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LLM-Provider DeepSeek `deepseek-chat` als Default (28.04.) | Gemini-Quota-Blocker; DeepSeek ohne Reasoning ist 5–10× schneller als `deepseek-v4-flash`/`-pro` | ✓ Good — Pipeline-Latenz 90–150s, Cost ~0,4 ¢ |
| Dedizierte Facts-Extractor-Stage statt Multi-Aufgabe-Interviewer (30.04.) | UAT zeigte 5+ leere Slots trotz User-Antwort; Single-Responsibility-Prinzip | ✓ Good — 14+ Slots befüllt vs. 5 leer |
| Section + Finanzplan mit Halluzinations-Verbots-Liste + userAnswers-Anker (30.04.) | UAT-Befund: organisatorische Erfindungen (MDM, Rahmenverträge, TV-L) trotz Critique-Schärfung | ✓ Good — 8/8 UAT-Marker raus, ehrliche Lücken-Markierungen |
| Eval-First für Matcher-Tuning (Active) | Bauchgefühl-Optimierung skaliert nicht auf 82 Programme; ohne Korpus keine Regression-Detection | — Pending |
| Vollautomatischer Programm-Pflegeprozess statt Halbautomatik (Active) | Skalierung auf 82+ Programme | — Pending |
| Programmspezifik als Core Value statt generischer Pipeline | Differenzierung zur Konkurrenz, Förderwahrscheinlichkeits-Maximierung | ✓ Good — bereits im Dossier-Schema verankert |
| Stripe-Setup verschoben | Aktuell interner Testbetrieb, Dev-Mock reicht | — Pending (post-UAT) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-20 after Phase 5 completion (Wizard-Pipeline-Tuning + Eval-Apparat — WIZ-01/02/03 validiert)*
