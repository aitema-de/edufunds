# Phase 3: Programm-Pflege Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 03-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 03-programm-pflege-foundation
**Areas discussed:** Schema-Form der vier neuen Felder
**Areas deferred to Claude's Discretion:** Provider + Fallback Cron, Validator-Strategie Legacy-Dossiers, Test-Run-Definition Acceptance

---

## Schema-Form der vier neuen Felder

### bestPractices

| Option | Description | Selected |
|--------|-------------|----------|
| Semi-strukturiert (Empfohlen) | `{ thema, was_funktionierte, warum }[]` — Mittelweg, Pipeline bekommt 'warum' als Anker, kein Quellen-Pflicht | ✓ |
| Einfache Liste | `string[]` — minimaler Aufwand, aber dünnes Trainings-Material für Section-Stage | |
| Vollstruktur mit Quelle | `{ thema, was_funktionierte, warum, quelle, beispiel_snippet }[]` — Doppel-Quelle zu vorbildFormulierungen | |

**User's choice:** Semi-strukturiert (Empfohlen)
**Notes:** Begründung: 'warum' optional, Quellen in Richtlinien meist nicht extrahierbar — vermeidet Schein-Präzision.

### rejectGruende

| Option | Description | Selected |
|--------|-------------|----------|
| Mit Frequenz + Vermeidung (Empfohlen) | `{ grund, haeufigkeit?, vermeidung? }[]` — 'haeufigkeit' priorisiert Pipeline-Regeln | ✓ |
| Einfache Liste | `string[]` — keine Priorisierung, weniger Hebel | |
| Vollstruktur mit Wahrscheinlichkeit | `{ grund, haeufigkeit, ablehnungs_wahrscheinlichkeit_prozent, vermeidung, beispiel }[]` — 'wahrscheinlichkeit_prozent' selten extrahierbar | |

**User's choice:** Mit Frequenz + Vermeidung (Empfohlen)
**Notes:** 'vermeidung' macht das Feld für Critique-Stage in Phase 5 aktionabel.

### vorbildFormulierungen

| Option | Description | Selected |
|--------|-------------|----------|
| Mit abschnitt_id Mapping (Empfohlen) | `{ abschnitt_id, formulierung, kontext? }[]` — FK auf Antragsstruktur.abschnitte[].id | ✓ |
| Einfache Liste | `string[]` — keine Struktur, Pipeline müsste raten | |
| Vollstruktur + Schlüsselwörter | `{ abschnitt_id, formulierung, kontext, schluesselwoerter[], vermeidet_halluzination_typ? }[]` — Phase-5-Tuning-Felder, Over-Engineering | |

**User's choice:** Mit abschnitt_id Mapping (Empfohlen)
**Notes:** FK-Anker ist die Section-Stage-Anbindung für Phase 5. Existing-Anker, kein neues Konzept.

### fristLogik

| Option | Description | Selected |
|--------|-------------|----------|
| Discr-Union + jährlich (Empfohlen) | `{ typ: 'rolling' } \| { typ: 'fixe_stichtage', stichtage[], jaehrlich_wiederkehrend? }` | ✓ |
| Minimal Discr-Union | Wie Roadmap-Wording: ohne 'jaehrlich_wiederkehrend' — Dossiers veralten kontinuierlich | |
| Vollstruktur mit Vorlauf | Wie Empfohlen + 'vorlauf_wochen?' — Phase 5/6 Scope | |

**User's choice:** Discr-Union + jährlich (Empfohlen)
**Notes:** 'jaehrlich_wiederkehrend' deckt Realfall 'Bewerbung jährlich bis 30.06.' ab — ohne wären Dossiers ständig veraltet.

---

## Folge-Entscheidung: Bereit für Context

| Option | Description | Selected |
|--------|-------------|----------|
| Bereit für Context (Empfohlen) | Provider/Validator/Test-Run werden als Claude's Discretion mit Standard-Defaults festgehalten | ✓ |
| Noch ein Schema-Detail | — | |
| Einer der 3 anderen Bereiche | — | |

**User's choice:** Bereit für Context

---

## Claude's Discretion (Standard-Defaults)

Diese drei Bereiche wurden vom User bewusst nicht ausgewählt und werden mit folgenden Defaults festgehalten:

- **Provider + Fallback Cron** (D-07): `deepseek-chat` als Default für beide Cron-Skripte über den `lib/wizard/llm.ts`-Wrapper. Gemini-Fallback nur als Env-Override (`LLM_PROVIDER=gemini`), kein automatischer Code-Pfad-Fallback.
- **Validator-Strategie Legacy-Dossiers** (D-08): `validate-data.ts` strict für neue Dossiers (alle 4 Felder required + FK-Integrität für `vorbildFormulierungen.abschnitt_id`), `--legacy`-Flag akzeptiert Dossiers ohne neue Felder. Fail-Modus mit Diagnose-Output pro Datei.
- **Test-Run-Definition Acceptance** (D-09): Workflow-Dispatch beider Crons (Dossier + Scan) + lokaler Smoke `extract-richtlinie.ts --next` mit Validator-grün auf Output + Validator gegen 11 Legacy-Dossiers im `--legacy`-Modus grün.

## Deferred Ideas

- Vorlauf-Wochen für `fristLogik` — Phase 5/6
- Automatischer Provider-Fallback im Code-Pfad — bewusst weggelassen, vermeidet Silent-Drift
- `quelle`-Feld auf `bestPractices` — Phase 6+, falls externe Sammlungen reinkommen
- `schluesselwoerter[]` / `vermeidet_halluzination_typ` auf `vorbildFormulierungen` — Phase-5-Tuning-Felder
- Semver-Versionierung für Dossiers — separates Refactor
