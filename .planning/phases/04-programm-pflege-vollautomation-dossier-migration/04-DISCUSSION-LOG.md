# Phase 4: Programm-Pflege Vollautomation + Dossier-Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 04-programm-pflege-vollautomation-dossier-migration
**Mode:** discuss (standard)
**Areas discussed:** Pipeline-Topologie, Stale-Queue-Strategie, Legacy-Migration-Vorgehen, Failure-Handling

---

## Pipeline-Topologie

### Frage 1: Wie soll die Scanner→Extractor-Verkettung strukturiert sein?

| Option | Description | Selected |
|--------|-------------|----------|
| Single-Workflow (Recommended) | 1 Cron-Workflow scannt + extrahiert + persistiert in einem Lauf. Pro neu gefundenem Programm ein PR mit Dossier + Queue-Update. Kandidaten-Stage entfällt. Atomarer Rollback, weniger Workflow-Overhead. | ✓ |
| Two-Step mit Auto-Trigger | Scanner schreibt Kandidaten-PR; Merge triggert Extractor via `repository_dispatch`. Weiterhin Human-In-The-Loop. | |
| Two-Step Auto-Merge | Scanner-PR mit Auto-Merge bei Substanz-Threshold. GitHub-Side-Komplexität. | |
| Inline-Extract im Scanner | 1 fettes PR mit N Dossiers. Schwer reviewbar. | |

**User's choice:** Single-Workflow (Recommended) — beseitigt Mensch-In-The-Loop für den Happy-Path wie im Roadmap-Wording gefordert.

### Frage 2: Wie soll der Single-Workflow die N gefundenen Programme verarbeiten und packagen?

| Option | Description | Selected |
|--------|-------------|----------|
| 1 PR pro Programm (Recommended) | Sequenziell pro neuem Programm: Extract → Validate → PR `dossier-bot/<id>`. Atomarer Rollback, granulares Review. | ✓ |
| 1 PR pro Workflow-Run (alle Programme) | Bulk-Review, kein atomarer Rollback. | |
| Matrix-Strategy parallel | GitHub-Concurrency + DeepSeek-Rate-Limit-Risk. | |

**User's choice:** 1 PR pro Programm (Recommended).

### Frage 3: Was passiert mit `data/program-candidates.json` und den alten Workflow-Files?

| Option | Description | Selected |
|--------|-------------|----------|
| Konsolidieren in neuen Workflow (Recommended) | `weekly-auto-pflege.yml` ersetzt beide Files, `data/program-candidates.json` wird obsolet. | ✓ |
| Behalten als Backup-Pfad | Alte Workflows als manueller Fallback. | |
| Alte Workflows umbenennen | Workflow-Dispatch-only-Variante für gezielte Re-Runs. | |

**User's choice:** Konsolidieren — alte Workflows löschen. `extract-richtlinie.ts` bleibt als CLI-Tool für manuelle Re-Runs.

---

## Stale-Queue-Strategie

### Frage 1: Wie aggressiv soll die Stale/Expired-Erkennung sein?

| Option | Description | Selected |
|--------|-------------|----------|
| HTTP-HEAD + Frist-Datum-Check (Recommended) | Vor LLM-Call: 404/410/403 → expired. fristLogik überschritten → expired. Spart LLM-Calls. | ✓ |
| Nur HTTP-HEAD | Frist-Auslauf weiter via LLM. BMBF-Programme die nach Auslauf 200 zurückgeben verbrennen weiter LLM. | |
| Kein Pre-Check | LLM erkennt alles, tote Queue-Einträge werden bei jedem Cron re-LLM-d. | |
| HTTP-HEAD + Pflichtfeld-Check | Pflichtfeld-Validierung gehört eher in Scanner, nicht --next. | |

**User's choice:** HTTP-HEAD + Frist-Datum-Check (Recommended).

### Frage 2: Wie soll der Queue-Status differenziert werden?

| Option | Description | Selected |
|--------|-------------|----------|
| Neuer Status `expired` (Recommended) | 4 Werte: `open` / `done` / `skip` / `expired`. Audit-Trail-Trennung von Kategorie-C-Skips. | ✓ |
| Nur `skip` mit Begründung | `skipGrund: 'expired'` als Sub-Feld. Weniger Schema-Migration. | |
| Generischer `inactive`-Status | Mehr Flexibilität aber größere Schema-Migration. | |

**User's choice:** Neuer Status `expired` (Recommended).

### Frage 3: Retroaktive Re-Klassifizierung der Bestands-Skips?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, retroaktiv (Recommended) | `scripts/cleanup-expired-queue.ts` läuft einmal über alle 82 Einträge. Test-Anker: `bundesweit-ganztag` + `nrwbank-moderne-schule`. | ✓ |
| Nein, nur für neue Picks | Sauberer Cut, aber Bestand bleibt falsch klassifiziert. | |
| Ja, aber inkrementell beim --next | Selbstpflege über Wochen-Cron-Läufe. | |

**User's choice:** Ja, retroaktiv (Recommended).

---

## Legacy-Migration-Vorgehen

### Frage 1: Wie kommen die 4 neuen Felder in die 11 Bestands-Dossiers?

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted-Fill (Recommended) | `scripts/migrate-legacy-dossier.ts <id>` extrahiert NUR die 4 fehlenden Felder. Bestands-Felder byte-identisch. ~0.5¢ Gesamtkosten. | ✓ |
| Komplettes LLM-Re-Extract | Bestand wird komplett überschrieben. Risikiert kuratierte Felder zu verschlechtern. | |
| Manual-Edit von Kolja | 0¢ LLM-Kosten, ~3h Aufwand, Inkonsistenz im Stil. | |
| Hybrid: Targeted-Fill + Kolja-Review | LLM schreibt, Kolja reviewed pro Dossier. Mehr Sicherheit. | |

**User's choice:** Targeted-Fill (Recommended) — Halluzinations-Risiko minimal wegen kontextueller Anti-Halluzinations-Block, Bestandsschutz für kuratierte Felder.

### Frage 2: Wie werden die 11 migrierten Dossiers reviewbar gemacht?

| Option | Description | Selected |
|--------|-------------|----------|
| 1 PR mit 11 Commits (Recommended) | 1 Commit pro Dossier auf Branch `dossier-migration/phase-04`. Atomarer Rollback pro Dossier. | ✓ |
| 11 separate PRs | Max-granular aber 11 Review-Termine. | |
| 1 PR mit 1 Commit | Schneller aber kein atomarer Rollback. | |

**User's choice:** 1 PR mit 11 Commits (Recommended).

### Frage 3: Discovery-Sample vor Vollmigration?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, 2 Sample-Dossiers vorab (Recommended) | `bmbf-digitalpakt-2` + `ferry-porsche-challenge-2025` als Discovery. Kolja reviewed; bei Pass restliche 9. | ✓ |
| Nein, alle 11 in einem Lauf | Trust Phase-3-Validator. Fixes per Manual-Edit-im-PR. | |

**User's choice:** Ja, 2 Sample-Dossiers vorab (Recommended).

---

## Failure-Handling

### Frage 1: Wie wird Kolja über Workflow-Failures benachrichtigt?

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub-Issue mit Bot-Label (Recommended) | Issue `🤖 dossier-bot failure <datum>` mit Label `bot-failure`, auto-close bei nächstem grünem Cron. | ✓ |
| Failure-PR mit Log-Artifact | Mischt Failure-Reports und valide Dossier-PRs. | |
| Nur Workflow-Log + Email-on-Failure | Partial-Failure bleibt unsichtbar. | |
| GitHub-Issue + Telegram | Token-Setup Scope-Creep, Latenz-tolerant. | |

**User's choice:** GitHub-Issue mit Bot-Label (Recommended).

### Frage 2: Partial-Failure-Behandlung?

| Option | Description | Selected |
|--------|-------------|----------|
| Continue-on-Error pro Programm (Recommended) | Jedes Programm in eigenem try/catch. Successful-PRs erstellt, Failure-Liste in einem Issue. | ✓ |
| Fail-Fast | Erster Failure stoppt Workflow. Verliert Programme bei flaky-LLM. | |
| Retry pro Programm dann Continue | Sinnvoll bei Rate-Limit-Issues, Phase 5+. | |

**User's choice:** Continue-on-Error pro Programm (Recommended).

### Frage 3: Failure-Reporting-Detail-Level?

| Option | Description | Selected |
|--------|-------------|----------|
| Strukturiert + Logs als Artifact (Recommended) | Issue-Body strukturiert, Vollständige Logs als GitHub-Actions-Artifact 30 Tage. | ✓ |
| Full-Dump im Issue-Body | Riesige Issues + Secret-Leakage-Risiko. | |
| Minimal | Längere Debug-Loop. | |

**User's choice:** Strukturiert + Logs als Artifact (Recommended).

---

## Claude's Discretion

- HTTP-HEAD-Implementation-Details (`node:http`/`node:https`, Timeout, 5xx-Retry)
- Migrations-Prompt-Wording (basierend auf Phase-3 `extract-richtlinie.ts` SYSTEM_PROMPT)
- GitHub-Issue-Title-Format, Workflow-Job-Namen
- Queue-Score-Berechnung wiederverwendet aus `scripts/rebuild-queue.ts`
- Ob `version`-Feld im Dossier gebumpt wird

## Deferred Ideas

- Telegram-Notifications für Bot-Failures (Token-Setup Scope-Creep)
- Workflow-Retry-Logic für Rate-Limited-LLM (Phase 5+)
- Pflichtfeld-Validierung im Scanner (gehört in Scanner, nicht --next)
- Auto-Recovery-PRs nach Bot-Failure-Issue
- Live-Workflow-Dispatch-Smoke (bleibt deferred bis main-Merge)
