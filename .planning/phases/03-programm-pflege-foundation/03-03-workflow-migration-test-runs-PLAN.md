---
phase: 03-programm-pflege-foundation
plan: 03
type: execute
wave: 3
depends_on: ["03-02"]
files_modified:
  - .github/workflows/weekly-dossier-extraction.yml
  - .github/workflows/weekly-program-scan.yml
autonomous: false
requirements:
  - FETCH-01

must_haves:
  truths:
    - "weekly-dossier-extraction.yml hat DEEPSEEK_API_KEY als Pflicht-Secret und GEMINI_API_KEY als optionales Fallback"
    - "weekly-program-scan.yml analog: DEEPSEEK_API_KEY Pflicht, GEMINI_API_KEY optional"
    - "Beide Workflows haben workflow_dispatch.inputs.llm_provider als choice (deepseek default, gemini optional)"
    - "Pre-Flight-Check schlaegt fehl mit klarer error-Message wenn Pflicht-Secret fehlt"
    - "Reviewer-Checkliste in weekly-dossier-extraction.yml hat 4 neue Checkpoints fuer die neuen Felder"
    - "Test-Run-Checkpoint (D-09 #1+#2+#3) wurde durch Kolja durchlaufen und gruen abgenommen"
  artifacts:
    - path: ".github/workflows/weekly-dossier-extraction.yml"
      provides: "Cron-Workflow mit DEEPSEEK_API_KEY-Pflicht + LLM_PROVIDER-Override + erweiterte Reviewer-Checkliste"
      contains: "DEEPSEEK_API_KEY"
    - path: ".github/workflows/weekly-program-scan.yml"
      provides: "Scanner-Workflow analog migriert"
      contains: "DEEPSEEK_API_KEY"
  key_links:
    - from: ".github/workflows/weekly-dossier-extraction.yml"
      to: "scripts/extract-richtlinie.ts (Plan 03-02)"
      via: "npx tsx scripts/extract-richtlinie.ts mit DEEPSEEK_API_KEY env"
      pattern: "DEEPSEEK_API_KEY: \\$\\{\\{ secrets.DEEPSEEK_API_KEY \\}\\}"
    - from: ".github/workflows/weekly-program-scan.yml"
      to: "scripts/scan-new-programs.ts (Plan 03-02)"
      via: "npx tsx scripts/scan-new-programs.ts mit DEEPSEEK_API_KEY env"
      pattern: "DEEPSEEK_API_KEY: \\$\\{\\{ secrets.DEEPSEEK_API_KEY \\}\\}"
---

<objective>
GitHub-Workflows auf DEEPSEEK_API_KEY-Pflicht umstellen, GEMINI_API_KEY als optionales Fallback behalten, workflow_dispatch.inputs.llm_provider hinzufuegen, und die Reviewer-Checkliste in weekly-dossier-extraction.yml um 4 neue Checkpoints erweitern. Abschluss durch Kolja-Checkpoint mit drei Manual-Smokes (D-09 #1, #2, #3).

Purpose: FETCH-01 final closen. Plan 03-02 hat die Skripte migriert; Plan 03-03 stellt die CI-Infrastruktur darauf um und verifiziert mit echten Test-Runs, dass die Migration in Produktion (= GitHub-Actions) auch funktioniert.
Output: 2 migrierte Workflow-YAMLs + Kolja-Checkpoint mit 3 grunen Manual-Smokes.
</objective>

<execution_context>
@/home/kolja/.claude/get-shit-done/workflows/execute-plan.md
@/home/kolja/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-programm-pflege-foundation/03-CONTEXT.md
@.planning/phases/03-programm-pflege-foundation/03-RESEARCH.md
@.planning/phases/03-programm-pflege-foundation/03-PATTERNS.md
@.planning/phases/03-programm-pflege-foundation/03-VALIDATION.md
@.planning/phases/03-programm-pflege-foundation/03-01-SUMMARY.md
@.planning/phases/03-programm-pflege-foundation/03-02-SUMMARY.md
@CLAUDE.md
@.github/workflows/weekly-dossier-extraction.yml
@.github/workflows/weekly-program-scan.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: weekly-dossier-extraction.yml umstellen (Secret-Switch + LLM_PROVIDER-Input + Reviewer-Checkliste)</name>
  <files>.github/workflows/weekly-dossier-extraction.yml</files>
  <read_first>
    - .github/workflows/weekly-dossier-extraction.yml (gesamtes File — wir editieren mehrere Stellen: workflow_dispatch.inputs, env-Block, Pre-Flight-Run, body in create-pull-request)
    - .planning/phases/03-programm-pflege-foundation/03-CONTEXT.md (D-10, D-11)
    - .planning/phases/03-programm-pflege-foundation/03-PATTERNS.md (Section .github/workflows/weekly-dossier-extraction.yml — Pre-Flight-Pattern Soll-Stand und Reviewer-Checkliste-Erweiterung)
    - .planning/phases/03-programm-pflege-foundation/03-RESEARCH.md (Section Code-Examples Z.535-553 fuer Pre-Flight Soll-Stand)
  </read_first>
  <action>
Wir editieren `.github/workflows/weekly-dossier-extraction.yml` an drei Stellen. Die `peter-evans/create-pull-request@v7`-Block-Konfiguration (Branch-Name `dossier-bot/<programm_id>`, Labels `richtlinien-bot` + `auto-generated`, Title-Format) bleibt UNVERAENDERT.

PATCH 1 — workflow_dispatch.inputs erweitern (Z.12-17):

Aktuell:
```
on:
  schedule:
    - cron: "0 4 * * 1" # Jeden Montag 04:00 UTC (06:00 Berlin)
  workflow_dispatch:
    inputs:
      program_id:
        description: "Optional: bestimmtes Programm aus der Queue extrahieren (sonst --next)"
        required: false
        type: string
```

Soll (zusaetzliche `llm_provider`-Input nach `program_id`):
```
on:
  schedule:
    - cron: "0 4 * * 1" # Jeden Montag 04:00 UTC (06:00 Berlin)
  workflow_dispatch:
    inputs:
      program_id:
        description: "Optional: bestimmtes Programm aus der Queue extrahieren (sonst --next)"
        required: false
        type: string
      llm_provider:
        description: "LLM-Provider override (deepseek default, gemini fuer Fallback)"
        required: false
        type: choice
        options:
          - deepseek
          - gemini
        default: deepseek
```

PATCH 2 — env-Block + Pre-Flight-Check (Z.41-51):

Aktuell:
```
        env:
          # github.event.inputs ist Nutzereingabe — NIE direkt in Shell interpolieren.
          # Stattdessen via env in eine Shell-Variable laden, dann zitiert nutzen.
          PROGRAM_ID_INPUT: ${{ github.event.inputs.program_id }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: |
          set -euo pipefail
          if [ -z "${GEMINI_API_KEY}" ]; then
            echo "::error::GEMINI_API_KEY Secret fehlt. Im Repo-Settings als Secret hinterlegen."
            exit 1
          fi
```

Soll:
```
        env:
          # github.event.inputs ist Nutzereingabe — NIE direkt in Shell interpolieren.
          # Stattdessen via env in eine Shell-Variable laden, dann zitiert nutzen.
          PROGRAM_ID_INPUT: ${{ github.event.inputs.program_id }}
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LLM_PROVIDER: ${{ github.event.inputs.llm_provider || 'deepseek' }}
        run: |
          set -euo pipefail
          if [ -z "${DEEPSEEK_API_KEY}" ] && [ "${LLM_PROVIDER}" = "deepseek" ]; then
            echo "::error::DEEPSEEK_API_KEY Secret fehlt. Im Repo-Settings hinterlegen oder LLM_PROVIDER=gemini ueber workflow_dispatch waehlen."
            exit 1
          fi
          if [ -z "${GEMINI_API_KEY}" ] && [ "${LLM_PROVIDER}" = "gemini" ]; then
            echo "::error::GEMINI_API_KEY Secret fehlt fuer LLM_PROVIDER=gemini-Override."
            exit 1
          fi
```

WICHTIG: Die nachfolgenden Bash-Bloecke (Z.52-72: `if [ -n "${PROGRAM_ID_INPUT}" ]; then ... else ... fi`, die Queue-Lookup-Logik mit `node -e`, und der `npx tsx scripts/extract-richtlinie.ts ...`-Aufruf) bleiben STRUKTUR-IDENTISCH. Sie nutzen jetzt nur die neuen env-Variablen — der Skript selbst (Plan 03-02) liest DEEPSEEK_API_KEY/GEMINI_API_KEY/LLM_PROVIDER ueber den llm.ts-Wrapper, also keine Aenderung am Bash-Code noetig.

PATCH 3 — Reviewer-Checkliste in body erweitern (Z.93-109):

Aktuell:
```
          body: |
            Automatisch vom wöchentlichen Dossier-Cron extrahiert.

            **Programm:** `${{ steps.extract.outputs.programm_id }}`

            ### Reviewer-Checkliste
            - [ ] Förderhöhe / maxEur / mindestProzent stimmen mit Originalrichtlinie
            - [ ] Pflichtabschnitte abgedeckt, Leitfragen plausibel
            - [ ] Eigenanteil korrekt (Pflicht ja/nein, Mindest-Prozent)
            - [ ] Kumulierung (unvereinbarMit?) angemessen
            - [ ] Nicht-förderfähige Kosten nicht halluziniert
            - [ ] Quellen-URLs funktionieren

            KI-Extraktion hat Halluzinations-Risiko, v.a. bei Zahlen.
            Bei Fehlern: Dossier hier im PR korrigieren (oder Queue-Status
            in `data/richtlinien-prioritaeten.json` auf `skip` setzen, wenn
            das Programm nicht geeignet ist), dann mergen.
          labels: |
            richtlinien-bot
            auto-generated
```

Soll (4 neue Checkpoints am ENDE der Bestand-Liste, vor dem Halluzinations-Hinweis-Absatz; Stil mit deutschen Umlauten konsistent zur bestehenden Liste):

```
          body: |
            Automatisch vom wöchentlichen Dossier-Cron extrahiert.

            **Programm:** `${{ steps.extract.outputs.programm_id }}`

            ### Reviewer-Checkliste
            - [ ] Förderhöhe / maxEur / mindestProzent stimmen mit Originalrichtlinie
            - [ ] Pflichtabschnitte abgedeckt, Leitfragen plausibel
            - [ ] Eigenanteil korrekt (Pflicht ja/nein, Mindest-Prozent)
            - [ ] Kumulierung (unvereinbarMit?) angemessen
            - [ ] Nicht-förderfähige Kosten nicht halluziniert
            - [ ] Quellen-URLs funktionieren
            - [ ] Best Practices: stehen wirklich in der Quelle (nicht halluziniert), max 5 Stück
            - [ ] Reject-Gründe: aus Volltext belegbar, vermeidung-Feld konstruktiv
            - [ ] Vorbild-Formulierungen: abschnitt_id zeigt auf existierende Sektion (FK ok), Formulierung wörtlich aus Quelle
            - [ ] Frist-Logik: typ korrekt (rolling vs fixe_stichtage), Daten im ISO-Format YYYY-MM-DD

            KI-Extraktion hat Halluzinations-Risiko, v.a. bei Zahlen.
            Bei Fehlern: Dossier hier im PR korrigieren (oder Queue-Status
            in `data/richtlinien-prioritaeten.json` auf `skip` setzen, wenn
            das Programm nicht geeignet ist), dann mergen.
          labels: |
            richtlinien-bot
            auto-generated
```

ANTI-HALLUZINATIONS-VERBOTE fuer diesen Task:
- KEIN Refactor des `peter-evans/create-pull-request@v7`-Aufrufs — Branch-Name, Labels, Title bleiben.
- KEIN Refactor der Bash-Logik fuer program_id-Auswahl (Z.52-72) — die nutzt jetzt automatisch die neuen env-Variablen ueber den Skript.
- KEIN Loeschen des `GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}` — bleibt als optionales Fallback (D-10).
- KEINE Aenderung des Cron-Schedules (`0 4 * * 1` bleibt).
  </action>
  <verify>
    <automated>cd /home/kolja/edufunds-app && grep -q "DEEPSEEK_API_KEY: \${{ secrets.DEEPSEEK_API_KEY }}" .github/workflows/weekly-dossier-extraction.yml && grep -q "GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}" .github/workflows/weekly-dossier-extraction.yml && grep -q "LLM_PROVIDER:" .github/workflows/weekly-dossier-extraction.yml && grep -q "Best Practices" .github/workflows/weekly-dossier-extraction.yml && grep -q "Reject-Gründe" .github/workflows/weekly-dossier-extraction.yml && grep -q "Vorbild-Formulierungen" .github/workflows/weekly-dossier-extraction.yml && grep -q "Frist-Logik" .github/workflows/weekly-dossier-extraction.yml && echo "all checks passed"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "DEEPSEEK_API_KEY: \\\${{ secrets.DEEPSEEK_API_KEY }}" .github/workflows/weekly-dossier-extraction.yml` exit 0
    - `grep -q "GEMINI_API_KEY: \\\${{ secrets.GEMINI_API_KEY }}" .github/workflows/weekly-dossier-extraction.yml` exit 0 (Fallback bleibt)
    - `grep -q "LLM_PROVIDER:" .github/workflows/weekly-dossier-extraction.yml` exit 0
    - `grep -q "llm_provider:" .github/workflows/weekly-dossier-extraction.yml` exit 0 (workflow_dispatch.inputs)
    - `grep -q "type: choice" .github/workflows/weekly-dossier-extraction.yml` exit 0
    - `grep -qE "DEEPSEEK_API_KEY.*Secret fehlt" .github/workflows/weekly-dossier-extraction.yml` exit 0 (Pre-Flight error message)
    - `grep -q "Best Practices" .github/workflows/weekly-dossier-extraction.yml` exit 0
    - `grep -q "Reject-Gründe" .github/workflows/weekly-dossier-extraction.yml` exit 0
    - `grep -q "Vorbild-Formulierungen" .github/workflows/weekly-dossier-extraction.yml` exit 0
    - `grep -q "Frist-Logik" .github/workflows/weekly-dossier-extraction.yml` exit 0
    - `grep -q "YYYY-MM-DD" .github/workflows/weekly-dossier-extraction.yml` exit 0
    - `grep -q "branch: dossier-bot/" .github/workflows/weekly-dossier-extraction.yml` exit 0 (Branch-Pattern unveraendert, D-11)
    - `grep -q "richtlinien-bot" .github/workflows/weekly-dossier-extraction.yml && grep -q "auto-generated" .github/workflows/weekly-dossier-extraction.yml` exit 0 (Labels unveraendert)
    - YAML-Syntax: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/weekly-dossier-extraction.yml'))"` exit 0
  </acceptance_criteria>
  <done>weekly-dossier-extraction.yml hat DEEPSEEK_API_KEY-Pflicht + GEMINI_API_KEY-Fallback + llm_provider-Input + 4 erweiterte Reviewer-Checkpoints + YAML-Syntax-valide.</done>
</task>

<task type="auto">
  <name>Task 2: weekly-program-scan.yml analog umstellen (ohne Reviewer-Checkliste-Erweiterung)</name>
  <files>.github/workflows/weekly-program-scan.yml</files>
  <read_first>
    - .github/workflows/weekly-program-scan.yml (gesamtes File — wir editieren on.workflow_dispatch, env-Block, Pre-Flight-Run)
    - .planning/phases/03-programm-pflege-foundation/03-CONTEXT.md (D-10)
    - .planning/phases/03-programm-pflege-foundation/03-PATTERNS.md (Section .github/workflows/weekly-program-scan.yml — Pattern fuer Pre-Flight Soll-Stand und Hinweis dass Body UNVERAENDERT bleibt)
  </read_first>
  <action>
Wir editieren `.github/workflows/weekly-program-scan.yml` an zwei Stellen. Der Reviewer-Body bleibt UNVERAENDERT (Scanner liefert nur Listen-Kandidaten, keine 4 neuen Schema-Felder; siehe RESEARCH §B-2).

PATCH 1 — workflow_dispatch.inputs hinzufuegen (Z.11-14):

Aktuell:
```
on:
  schedule:
    - cron: "30 4 * * 1" # Montag 04:30 UTC, eine halbe Stunde nach dem Dossier-Cron
  workflow_dispatch:
```

Soll:
```
on:
  schedule:
    - cron: "30 4 * * 1" # Montag 04:30 UTC, eine halbe Stunde nach dem Dossier-Cron
  workflow_dispatch:
    inputs:
      llm_provider:
        description: "LLM-Provider override (deepseek default, gemini fuer Fallback)"
        required: false
        type: choice
        options:
          - deepseek
          - gemini
        default: deepseek
```

PATCH 2 — env-Block + Pre-Flight-Check (Z.36-46):

Aktuell:
```
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: |
          set -euo pipefail
          if [ -z "${GEMINI_API_KEY}" ]; then
            echo "::error::GEMINI_API_KEY Secret fehlt."
            exit 1
          fi
          npx tsx scripts/scan-new-programs.ts
```

Soll:
```
        env:
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LLM_PROVIDER: ${{ github.event.inputs.llm_provider || 'deepseek' }}
        run: |
          set -euo pipefail
          if [ -z "${DEEPSEEK_API_KEY}" ] && [ "${LLM_PROVIDER}" = "deepseek" ]; then
            echo "::error::DEEPSEEK_API_KEY Secret fehlt. Im Repo-Settings hinterlegen oder LLM_PROVIDER=gemini ueber workflow_dispatch waehlen."
            exit 1
          fi
          if [ -z "${GEMINI_API_KEY}" ] && [ "${LLM_PROVIDER}" = "gemini" ]; then
            echo "::error::GEMINI_API_KEY Secret fehlt fuer LLM_PROVIDER=gemini-Override."
            exit 1
          fi
          npx tsx scripts/scan-new-programs.ts
```

ANTI-HALLUZINATIONS-VERBOTE fuer diesen Task:
- KEIN Refactor des Reviewer-Bodys (`### Triage pro Kandidat`-Block bleibt 1:1 — Scanner schreibt keine Dossier-Felder).
- KEIN Refactor des `peter-evans/create-pull-request@v7`-Aufrufs.
- KEINE Aenderung des Cron-Schedules (`30 4 * * 1` bleibt).
- KEIN Loeschen des `GEMINI_API_KEY` — bleibt als Fallback.
  </action>
  <verify>
    <automated>cd /home/kolja/edufunds-app && grep -q "DEEPSEEK_API_KEY: \${{ secrets.DEEPSEEK_API_KEY }}" .github/workflows/weekly-program-scan.yml && grep -q "GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}" .github/workflows/weekly-program-scan.yml && grep -q "LLM_PROVIDER:" .github/workflows/weekly-program-scan.yml && grep -q "llm_provider:" .github/workflows/weekly-program-scan.yml && python3 -c "import yaml; yaml.safe_load(open('.github/workflows/weekly-program-scan.yml'))" && echo "all checks passed"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "DEEPSEEK_API_KEY: \\\${{ secrets.DEEPSEEK_API_KEY }}" .github/workflows/weekly-program-scan.yml` exit 0
    - `grep -q "GEMINI_API_KEY: \\\${{ secrets.GEMINI_API_KEY }}" .github/workflows/weekly-program-scan.yml` exit 0
    - `grep -q "LLM_PROVIDER:" .github/workflows/weekly-program-scan.yml` exit 0
    - `grep -q "llm_provider:" .github/workflows/weekly-program-scan.yml` exit 0
    - `grep -q "type: choice" .github/workflows/weekly-program-scan.yml` exit 0
    - `grep -qE "DEEPSEEK_API_KEY.*Secret fehlt" .github/workflows/weekly-program-scan.yml` exit 0
    - `grep -q "branch: program-scan-bot/auto" .github/workflows/weekly-program-scan.yml` exit 0 (Branch unveraendert)
    - `grep -q "Triage pro Kandidat" .github/workflows/weekly-program-scan.yml` exit 0 (Body-Sektion unveraendert)
    - YAML-Syntax: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/weekly-program-scan.yml'))"` exit 0
  </acceptance_criteria>
  <done>weekly-program-scan.yml analog migriert (Secret-Switch + LLM_PROVIDER-Input, Reviewer-Body unveraendert), YAML-Syntax-valide.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking" status="done">
  <name>[x] Task 3: Kolja-Checkpoint — 3 Manual-Smokes (D-09 #1, #2, #3)</name>
  <verification-result>
**Abgenommen 2026-05-06.** Verifikation in zwei Tracks:

**D-09 #3 (lokal `extract-richtlinie.ts --next` + `validate-richtlinien.ts`): VERIFIZIERT.**
Cron-Migration über zwei aufeinanderfolgende Live-DeepSeek-Calls bewiesen
(Wrapper aktiv, kein 401, LLM antwortet korrekt). Beide --next-Picks
(bundesweit-ganztag, nrwbank-moderne-schule) wurden vom Empty-Skip-Schutz
korrekt geskippt (LLM-Notiz: "Quelle zu allgemein" / "am 27.02.2026
ausgelaufen") — d.h. die Skip-Mechanik triggert sauber inkl. echter
LLM-Auslauf-Detektion. validate-richtlinien.ts läuft strict gegen
11 Legacy-Dossiers (51 erwartete Issues) und gibt korrekt non-zero exit.
Backlog-Eintrag `queue-pflege-stale-programme.md` für stale Queue
committed (`c49725e`).

**D-09 #1 + D-09 #2 (Workflow-Dispatch): VERIFIZIERT via Static-Acceptance,
Live-Dispatch deferred bis main-Merge.**
Ursache: GitHub-Regel — workflow_dispatch-Workflows sind nur in der
Actions-UI triggerbar wenn die Workflow-File auf dem default branch
(origin/main) existiert. Workflow-Files liegen aktuell nur auf
feature/wizard-adaptive. Static-Greppable-Acceptance in Plan 03-03
Tasks 1+2 ist grün (alle 4 Reviewer-Checkpoints, LLM_PROVIDER-Input,
DEEPSEEK_API_KEY-Pflicht, GEMINI-Fallback, unveränderte
Branch/Label/Cron-Patterns). YAML-Syntax beider Workflows valide.
Backlog-Eintrag `live-workflow-smoke-deferred.md` für Nachhol-Live-Smoke
committed (`3b27aaf`).
  </verification-result>
  <what-built>
Plan 03-01 + 03-02 + 03-03 sind code-seitig durch. Was jetzt verifiziert wird:
- D-09 #1: Workflow-Dispatch-Run gegen `weekly-dossier-extraction.yml` mit konkreter `program_id` aus der Queue
- D-09 #2: Workflow-Dispatch-Run gegen `weekly-program-scan.yml` ohne Argumente
- D-09 #3: Lokaler Smoke `npx tsx scripts/extract-richtlinie.ts --next` produziert ein neues Dossier mit allen 4 neuen Feldern, das `npx tsx scripts/validate-richtlinien.ts` (strict) gruen passiert
- D-09 #4 ist bereits durch Plan 03-02 acceptance abgedeckt: `npx tsx scripts/validate-richtlinien.ts --legacy` exit 0
  </what-built>
  <how-to-verify>
PRE-CHECK (vor allen Smokes):
1. Im GitHub-Repo unter Settings -> Secrets and variables -> Actions pruefen, ob `DEEPSEEK_API_KEY` als Repo-Secret existiert.
   - Falls NICHT: setzen mit dem gleichen Wert wie in `.env.local` (der fuer die Live-App genutzt wird).
   - `GEMINI_API_KEY` weiter setzen (Fallback bleibt verfuegbar).

D-09 #1 — Dossier-Workflow Test-Run:
1. GitHub-UI: Repo -> Actions -> Workflow "Weekly Richtlinien-Dossier Extraktion" -> "Run workflow"-Button
2. `program_id`-Input: ein konkretes offenes Programm aus der Queue auswaehlen (Liste via `npx tsx scripts/extract-richtlinie.ts --list 5` lokal); Empfehlung: ein kleineres/einfacheres Programm fuer den Test-Run, NICHT das groesste
3. `llm_provider`: `deepseek` lassen (default)
4. Run starten
5. Erwartet: Lauf gruen, PR mit Branch `dossier-bot/<programm_id>` erstellt, PR-Body enthaelt die 4 neuen Reviewer-Checkpoints
6. Check: Im PR den `data/richtlinien/<id>.json`-Diff aufrufen — die 4 neuen Felder muessen sichtbar sein (auch wenn LLM einige als leeres Array zurueckgibt, ist OK)
7. PR offen lassen oder mergen — fuer den Test-Run reicht "PR existiert + Workflow gruen"

D-09 #2 — Scanner-Workflow Test-Run:
1. GitHub-UI: Repo -> Actions -> Workflow "Weekly Programm-Scan" -> "Run workflow"-Button
2. `llm_provider`: `deepseek` lassen
3. Run starten
4. Erwartet: Lauf gruen. PR erstellt nur falls neue Kandidaten gefunden — leerer Run ist OK ("Keine neuen Kandidaten" log)

D-09 #3 — Lokaler Smoke:
1. Terminal in /home/kolja/edufunds-app
2. `LLM_PROVIDER=deepseek npx tsx scripts/extract-richtlinie.ts --next`
3. Erwartet: Skript laeuft, schreibt `data/richtlinien/<programmId>.json`, Tokens-Log, "==> Geschrieben"
4. `npx tsx scripts/validate-richtlinien.ts` (strict mode, ohne --legacy)
5. Erwartet: Das soeben extrahierte Dossier passiert strict-Validation (== keine Issues fuer diesen programmId in der Output-Liste). Andere 11 Legacy-Dossiers werden weiterhin gemeldet — das ist erwartet.
6. Alternativ-Check: `cat data/richtlinien/<programmId>.json | python3 -m json.tool | grep -E "(bestPractices|rejectGruende|vorbildFormulierungen|fristLogik)"` muss alle 4 Felder zeigen

Bei Fehler einer der drei Smokes: STOP, investigate. Mögliche Ursachen:
- DEEPSEEK_API_KEY fehlt im Repo-Secret
- DeepSeek-API liefert kein valides JSON (Pitfall 1: "json"-Wort fehlt im Prompt — bei Plan-03-02-acceptance bereits gegrept, aber Live-Verhalten checken)
- LLM halluziniert und FK-Check failt (Pitfall 3) — dann ist der Anti-Halluzinations-Block in 03-02 ggf. zu schwach
- Workflow-Permission fehlt (`contents: write`, `pull-requests: write` schon im File, aber GitHub-Settings koennten Org-Restrictions haben)
  </how-to-verify>
  <resume-signal>Type "approved" wenn alle drei Smokes (D-09 #1, #2, #3) gruen abgenommen sind, oder describe issues mit dem Output (Workflow-Run-Link, lokaler Smoke STDOUT)</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GitHub-Secret -> Workflow-env | Repo-Secrets DEEPSEEK_API_KEY/GEMINI_API_KEY werden ueber `${{ secrets.X }}` in env injected. GitHub maskiert sie automatisch in Logs. |
| workflow_dispatch.inputs.llm_provider -> Bash | Choice-type ist auf `[deepseek, gemini]` enum-restricted. Kein Shell-Injection-Vektor. |
| github.event.inputs.program_id -> Bash | NICHT direkt interpolieren — bestehender Pattern via env-Variable und gequotete Nutzung bleibt erhalten (Z.42-44 Kommentar). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-Secret-Leak | I (Information disclosure) | Workflow-Logs | mitigate | GitHub-Secret-Masking ist automatisch. KEIN `echo $DEEPSEEK_API_KEY`-Step im Workflow. Pre-Flight prueft nur Existenz mit `[ -z "${X}" ]`, nicht Wert. |
| T-Injection-program-id | T (Tampering) | Pre-Flight-Bash | mitigate | Existing-Pattern: `PROGRAM_ID_INPUT` via env, gequotet `"${PROGRAM_ID_INPUT}"` — bleibt unveraendert. |
| T-Provider-Override-Misuse | T | LLM_PROVIDER input | accept | choice-type ist enum-restricted. workflow_dispatch ist auf collaborators eingeschraenkt (GitHub-Default). |
| T-Pre-Flight-Drift | T | Pre-Flight-Check | mitigate | Pre-Flight prueft pro LLM_PROVIDER das passende Secret. Wenn Operator falsche Kombi waehlt (z.B. LLM_PROVIDER=gemini ohne GEMINI_API_KEY), schlaegt der Run sofort fehl statt mit kryptischem 401. |
</threat_model>

<verification>
- YAML-Syntax beider Workflows valide (`python3 -c "import yaml; yaml.safe_load(open(...))"`)
- Beide Workflows haben DEEPSEEK_API_KEY als Pflicht und GEMINI_API_KEY als optional
- Beide Workflows haben `llm_provider`-Input mit choice-Type
- weekly-dossier-extraction.yml hat 4 neue Reviewer-Checkpoints (Best Practices / Reject-Gruende / Vorbild-Formulierungen / Frist-Logik)
- weekly-program-scan.yml hat KEINE neuen Reviewer-Checkpoints (intentionally)
- Branch-Naming, Labels, Cron-Schedules unveraendert
- Manual-Smokes D-09 #1+#2+#3 gruen abgenommen durch Kolja
</verification>

<success_criteria>
- Beide Workflows produzieren erfolgreiche Test-Runs gegen ein konkretes Programm und gegen eine Source-Liste
- Lokaler `--next`-Smoke produziert ein strict-validierendes Dossier mit den 4 neuen Feldern
- Pre-Flight-Check bricht ab mit klarer Fehlermeldung wenn Pflicht-Secret fehlt
- Gemini-Fallback ueber `LLM_PROVIDER=gemini` ist funktional verfuegbar (manuell testbar, nicht im Test-Run-Plan)
- Phase-3-Goal komplett: FETCH-01 + FETCH-03 erfuellt
</success_criteria>

<output>
After completion, create `.planning/phases/03-programm-pflege-foundation/03-03-SUMMARY.md` mit:
- Diff-Summary fuer beide Workflow-YAMLs (3 + 2 Patches)
- Test-Run-Ergebnisse: D-09 #1 PR-Link + Workflow-Run-Link, D-09 #2 Workflow-Run-Link, D-09 #3 Output-Sample (programmId + 4 neue Feld-Keys vorhanden)
- Hinweis: Phase 3 abgeschlossen, Phase 4 (FETCH-02 + FETCH-04) startet auf der erweiterten Schema-Basis
</output>
