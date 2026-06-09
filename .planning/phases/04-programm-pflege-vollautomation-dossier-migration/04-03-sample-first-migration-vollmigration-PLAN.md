---
phase: 04-programm-pflege-vollautomation-dossier-migration
plan: 03
type: execute
wave: 2
depends_on:
  - 02
files_modified:
  - data/richtlinien/aktion-mensch-schulkooperation.json
  - data/richtlinien/berlin-startchancen.json
  - data/richtlinien/bmbf-digitalpakt-2.json
  - data/richtlinien/bosch-schulpreis.json
  - data/richtlinien/ensam-bmz.json
  - data/richtlinien/erasmus-schule-2026.json
  - data/richtlinien/erasmus-schulentwicklung.json
  - data/richtlinien/ferry-porsche-challenge-2025.json
  - data/richtlinien/ferry-porsche-challenge.json
  - data/richtlinien/klimalab-2026.json
  - data/richtlinien/kultur-macht-stark.json
autonomous: false
requirements:
  - FETCH-04
must_haves:
  truths:
    - "Alle 11 Dossiers in data/richtlinien/ enthalten die vier Phase-3-Felder (bestPractices, rejectGruende, vorbildFormulierungen, fristLogik) — Strict-Validator gruen"
    - "Sample-First-Pattern (D-09) wurde STRIKT eingehalten: Branch dossier-migration/phase-04 enthaelt am ersten Review-Gate EXAKT 2 Commits (bmbf-digitalpakt-2 als Sample-1 + ferry-porsche-challenge-2025 als Sample-2). Die restlichen 9 Dossiers werden erst NACH Kolja-PASS migriert."
    - "Migration ist als 1 PR-Branch dossier-migration/phase-04 mit 11 Commits geplant (2 Sample-Commits zuerst, danach 9 weitere in alphabetischer Reihenfolge)"
    - "Bestands-Felder aller migrierten Dossiers sind byte-identisch zur Pre-Migration (nur version-Bump + 4 neue Top-Level-Felder)"
    - "Pre-Commit-Validierung pro Dossier nutzt scripts/validate-single-dossier.ts (Helper aus Plan 04-02) via npx tsx — NICHT node -e require(...) (crasht auf TypeScript-Files)"
  artifacts:
    - path: "data/richtlinien/bmbf-digitalpakt-2.json"
      provides: "Sample-1 mit 4 neuen Feldern, Strict-Validator-konform"
      contains: "\"bestPractices\""
    - path: "data/richtlinien/ferry-porsche-challenge-2025.json"
      provides: "Sample-2 mit 4 neuen Feldern, Strict-Validator-konform"
      contains: "\"fristLogik\""
  key_links:
    - from: "Branch dossier-migration/phase-04 HEAD"
      to: "feature/wizard-adaptive (Base-Branch)"
      via: "11 Commits, sequenziell (2 Samples zuerst, dann 9 alphabetisch)"
      pattern: "feat\\(richtlinien\\): .*migrate.*"
    - from: "scripts/validate-richtlinien.ts ohne --legacy"
      to: "data/richtlinien/"
      via: "Strict-Validator-Lauf"
      pattern: "Alle 11 Dossiers valide \\(strict-Modus\\)"
---

<objective>
Sample-First-Migration mit Review-Gate, danach Vollmigration der restlichen 9 Dossiers. Branch-Strategie: alle 11 Migrations-Commits gehen auf den Branch `dossier-migration/phase-04` (D-08). **D-09 Sample-First strikt:** Die zwei Sample-Dossiers (`bmbf-digitalpakt-2` Bundes-Bigcase + `ferry-porsche-challenge-2025` Stiftungs-Smallcase) werden ZUERST migriert, in dieser Reihenfolge, als Commits 1 und 2 auf dem Branch. Erst nach Kolja-PASS beim ersten Review-Gate werden die restlichen 9 Dossiers in alphabetischer Reihenfolge nachgezogen. Beim ersten Review-Gate liegen damit EXAKT 2 Commits, nicht 3 — das ist die locked decision in CONTEXT.md D-09 und wird hier nicht zugunsten von Reihenfolge-Klarheit aufgeweicht.

Purpose: D-08, D-09 aus CONTEXT.md. Erfuellt Success-Criterion #3 der Phase 4: alle 11 Dossiers haben die vier Phase-3-Felder, Strict-Validator laeuft gruen (FETCH-04).

Output:
- Branch `dossier-migration/phase-04` mit 11 Commits in dieser Reihenfolge:
  1. `bmbf-digitalpakt-2` (Sample-1, Bundes-Bigcase)
  2. `ferry-porsche-challenge-2025` (Sample-2, Stiftungs-Smallcase)
  3. **Review-Gate Kolja PASS** (Acceptance: exakt 2 Commits auf Branch)
  4. `aktion-mensch-schulkooperation` (alphabetisch erstes der restlichen 9)
  5. `berlin-startchancen`
  6. `bosch-schulpreis`
  7. `ensam-bmz`
  8. `erasmus-schule-2026`
  9. `erasmus-schulentwicklung`
  10. `ferry-porsche-challenge` (Vorgaengerversion ohne -2025-Suffix)
  11. `klimalab-2026`
  12. `kultur-macht-stark`
- Strict-Validator-Lauf (`npx tsx scripts/validate-richtlinien.ts`) ist gruen (ohne `--legacy`) gegen alle 11 Dossiers
- Zweites Review-Gate (PR ready-for-review) am Ende von Plan 04-03, vor Phase-4-Closure
- KEIN Push und KEIN PR-Open in diesem Plan — das ist Kolja's Discretion am Ende. Plan 03 endet mit dem lokalen Branch + gruenem Strict-Validator + bestaetigtem 2-Gate-Flow.

**Verifikations-Pattern:** Pro Dossier nach Migration:
1. Diff-Sanity (Bestands-Felder byte-identisch via `jq 'del(...)' POST` == `jq 'del(.version)' PRE`)
2. Strict-Validator via `npx tsx scripts/validate-single-dossier.ts <pfad>` (Helper aus Plan 04-02)
3. Atomarer Commit
</objective>

<execution_context>
@/home/kolja/.claude/get-shit-done/workflows/execute-plan.md
@/home/kolja/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-CONTEXT.md
@.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-02-migrate-legacy-dossier-script-PLAN.md
@scripts/migrate-legacy-dossier.ts
@scripts/validate-single-dossier.ts
@scripts/validate-richtlinien.ts
@data/richtlinien/bmbf-digitalpakt-2.json
@data/richtlinien/ferry-porsche-challenge-2025.json

<interfaces>
<!-- Sample-First-Reihenfolge laut D-09 (Variante A — Samples vorweg, dann alphabetisch nachgezogen) -->

DOSSIERS, in der MIGRATIONS-REIHENFOLGE (NICHT alphabetisch — D-09 erzwingt die zwei Samples zuerst):

| # | Programm-ID                     | Rolle              | Wave |
|---|---------------------------------|--------------------|------|
| 1 | bmbf-digitalpakt-2              | Sample-1           | pre-gate-1 |
| 2 | ferry-porsche-challenge-2025    | Sample-2           | pre-gate-1 |
|---| --- Kolja-Review-Gate #1 ---    | (PASS-Bedingung)   | gate |
| 3 | aktion-mensch-schulkooperation  | alphabetisch 1/9   | post-gate-1 |
| 4 | berlin-startchancen             | alphabetisch 2/9   | post-gate-1 |
| 5 | bosch-schulpreis                | alphabetisch 3/9   | post-gate-1 |
| 6 | ensam-bmz                       | alphabetisch 4/9   | post-gate-1 |
| 7 | erasmus-schule-2026             | alphabetisch 5/9   | post-gate-1 |
| 8 | erasmus-schulentwicklung        | alphabetisch 6/9   | post-gate-1 |
| 9 | ferry-porsche-challenge         | alphabetisch 7/9   | post-gate-1 |
|10 | klimalab-2026                   | alphabetisch 8/9   | post-gate-1 |
|11 | kultur-macht-stark              | alphabetisch 9/9   | post-gate-1 |
|---| --- Kolja-Review-Gate #2 ---    | (Phase-4 Closure)  | gate |

Begruendung Variante A:
- CONTEXT D-09 ist eine locked decision: am ersten Review-Gate MUESSEN exakt 2 Commits liegen (Bundes-Bigcase + Stiftungs-Smallcase). Bei FAIL werden NUR 2 LLM-Calls verworfen, nicht 11. Das ist der Kernpunkt des Sample-First-Patterns.
- Die zuvor erwogene Variante B (Samples mittendrin in alphabetischer Reihenfolge) bricht D-09 — am ersten Review-Gate laegen dann 3 Commits (aktion-mensch + berlin-startchancen + bmbf-digitalpakt-2). Bei FAIL waeren 3 LLM-Calls verworfen.
- Reihenfolge-Klarheit im git log: Sample-Commits haben das Suffix "(Sample-1)" und "(Sample-2)" in der Subject-Line, damit der PR-Diff sofort lesbar ist.
- Branch-Acceptance-Pruefung beim ersten Gate: `git log --oneline feature/wizard-adaptive..HEAD | wc -l` MUSS exakt `2` ergeben.

<!-- Hilfs-Skript aus Plan 04-02 -->

`scripts/validate-single-dossier.ts` (Plan 04-02 Task 2) ist das Pre-Commit-Gate-Tool pro Dossier:
```bash
npx tsx scripts/validate-single-dossier.ts data/richtlinien/<id>.json
# exit 0 -> Strict + FK gruen
# exit 1 -> mind. eine Verletzung (Tab-separierte Issue-Zeilen auf stdout/stderr)
# exit 2 -> Nutzungs-Fehler
```

NICHT verwenden: `node -e "const {...} = require('./lib/wizard/richtlinien-validator'); ..."`. Das crasht mit `SyntaxError: Unexpected token 'export'`, weil `node` TypeScript-Files nicht laden kann. Projekt-Standard ist `npx tsx --env-file=.env.local` (siehe CLAUDE.md + 04-CONTEXT.md canonical_refs).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Branch dossier-migration/phase-04 anlegen + Strict-Validator Baseline (legacy + strict)</name>
  <files>(git branch + lokale Verifikation, kein File-Modify)</files>
  <read_first>
    - scripts/validate-richtlinien.ts (CLI-Verhalten: ohne Flag → strict, mit `--legacy` → tolerant)
    - scripts/validate-single-dossier.ts (Helper aus Plan 04-02 — pruefen dass er existiert + funktioniert)
    - data/richtlinien/ (ls)
    - .git/HEAD (welcher Branch ist aktuell — sollte `feature/wizard-adaptive` sein)
  </read_first>
  <action>
    Schritt 1 — Pre-Branch-Sanity. Vom aktuellen Branch `feature/wizard-adaptive` (Plan 01 + 02 haben dort Commits hinzugefuegt). Sicherstellen, dass keine ungetrackten Mods im working tree sind:
    ```bash
    cd /home/kolja/edufunds-app
    git status --short
    git branch --show-current
    # Erwartung: working tree clean, branch = feature/wizard-adaptive
    ```
    Wenn dirty → STOP, Kolja melden.

    Schritt 2 — Helper-Skript-Sanity (Plan 04-02 Task 2 Output):
    ```bash
    cd /home/kolja/edufunds-app
    test -f scripts/validate-single-dossier.ts && echo "Helper vorhanden"
    npx tsx scripts/validate-single-dossier.ts 2>&1 | head -1 | grep -q "Nutzung:" && echo "Helper-CLI ok"
    ```
    Wenn fehlt → Plan 04-02 wurde nicht (oder unvollstaendig) ausgefuehrt — STOP.

    Schritt 3 — Baseline-Strict-Validator: erwartet rote Ausgabe, weil die 11 Dossiers noch unmigriert sind.
    ```bash
    cd /home/kolja/edufunds-app
    npx tsx scripts/validate-richtlinien.ts 2>&1 | tee /tmp/validator-strict-pre.log
    echo "Exit: $?"
    # Erwartung: exit 1 (mehrere Dossier-Verletzungen)
    ```

    Schritt 4 — Baseline-Legacy-Validator: muss gruen sein (sonst ist die Foundation aus Phase 3 defekt).
    ```bash
    cd /home/kolja/edufunds-app
    npx tsx scripts/validate-richtlinien.ts --legacy 2>&1 | tee /tmp/validator-legacy-pre.log
    echo "Exit: $?"
    # Erwartung: exit 0, "Alle 11 Dossiers valide (legacy-Modus)."
    ```
    Wenn Legacy nicht gruen ist → STOP, das ist ein Phase-3-Bug, nicht Phase-4-Scope.

    Schritt 5 — Branch anlegen vom aktuellen HEAD:
    ```bash
    cd /home/kolja/edufunds-app
    git checkout -b dossier-migration/phase-04
    git branch --show-current
    # Erwartung: dossier-migration/phase-04
    ```

    Schritt 6 — Notieren der Anzahl der Dossier-Files (Sanity-Check):
    ```bash
    cd /home/kolja/edufunds-app
    ls data/richtlinien/*.json | wc -l
    # Erwartung: 11
    ```

    Schritt 7 — Baseline-Commit-Count auf Branch festhalten (muss `0` sein):
    ```bash
    cd /home/kolja/edufunds-app
    git log --oneline feature/wizard-adaptive..HEAD | wc -l
    # Erwartung: 0 (Branch wurde gerade abgezweigt)
    ```
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; test "$(git branch --show-current)" = "dossier-migration/phase-04" &amp;&amp; test "$(ls data/richtlinien/*.json | wc -l)" = "11" &amp;&amp; test "$(git log --oneline feature/wizard-adaptive..HEAD | wc -l)" = "0" &amp;&amp; npx tsx scripts/validate-richtlinien.ts --legacy &gt; /dev/null &amp;&amp; test -f scripts/validate-single-dossier.ts
    </automated>
  </verify>
  <acceptance_criteria>
    - `git branch --show-current` exakt `dossier-migration/phase-04`
    - `ls data/richtlinien/*.json | wc -l` exakt `11`
    - `git status --short` ist leer (working tree clean nach Branch-Anlage)
    - `git log --oneline feature/wizard-adaptive..HEAD | wc -l` exakt `0` (Baseline)
    - `npx tsx scripts/validate-richtlinien.ts --legacy` exit 0
    - `npx tsx scripts/validate-richtlinien.ts` (ohne --legacy) exit 1 (Baseline-State VOR Migration)
    - `/tmp/validator-strict-pre.log` ist erstellt und enthaelt mehrere "fehler"-Zeilen
    - `scripts/validate-single-dossier.ts` existiert und Aufruf ohne Argument exit 2 mit "Nutzung:"
  </acceptance_criteria>
  <done>
    Branch dossier-migration/phase-04 ist von feature/wizard-adaptive abgezweigt. Baseline-Validator-Laeufe sind dokumentiert (legacy gruen, strict rot — wie erwartet vor Migration). Helper-Skript aus Plan 04-02 ist verfuegbar.
  </done>
</task>

<task type="auto">
  <name>Task 2: Sample-1-Commit: bmbf-digitalpakt-2 (Bundes-Bigcase) — Commit 1 auf Branch</name>
  <files>data/richtlinien/bmbf-digitalpakt-2.json</files>
  <read_first>
    - scripts/migrate-legacy-dossier.ts
    - scripts/validate-single-dossier.ts
    - data/richtlinien/bmbf-digitalpakt-2.json (Bestand pre-migration)
    - .planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-CONTEXT.md (D-09 Sample-First-Pattern)
  </read_first>
  <action>
    Schritt 1 — Pre-State-Snapshot:
    ```bash
    cd /home/kolja/edufunds-app
    ID=bmbf-digitalpakt-2
    cp "data/richtlinien/${ID}.json" "/tmp/${ID}.pre.json"
    ```

    Schritt 2 — Migration ausfuehren:
    ```bash
    cd /home/kolja/edufunds-app
    if ! npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts bmbf-digitalpakt-2; then
      echo "FEHLER: Migration bmbf-digitalpakt-2 gescheitert"
      exit 1
    fi
    ```

    Schritt 3 — Pre-Commit-Gate via Helper-Skript (Plan 04-02 Task 2 Output, KEIN `node -e require(...)`):
    ```bash
    cd /home/kolja/edufunds-app
    npx tsx scripts/validate-single-dossier.ts data/richtlinien/bmbf-digitalpakt-2.json
    # exit 0 erwartet
    ```
    Bei exit != 0: STOP, kein Commit. Die Migrations-Logik in scripts/migrate-legacy-dossier.ts hat ihren eigenen Pre-Persist-Gate, aber wir doppeln defensive — falls dort ein Bug ist, faengt das hier.

    Schritt 4 — Diff-Sanity (Bestands-Felder byte-identisch):
    ```bash
    cd /home/kolja/edufunds-app
    ID=bmbf-digitalpakt-2
    jq -S 'del(.bestPractices, .rejectGruende, .vorbildFormulierungen, .fristLogik, .version)' "data/richtlinien/${ID}.json" > "/tmp/${ID}.post-minus-new.json"
    jq -S 'del(.version)' "/tmp/${ID}.pre.json" > "/tmp/${ID}.pre-minus-version.json"
    if ! diff -q "/tmp/${ID}.post-minus-new.json" "/tmp/${ID}.pre-minus-version.json"; then
      echo "FEHLER: Bestands-Felder von ${ID} sind NICHT byte-identisch nach Migration:"
      diff "/tmp/${ID}.post-minus-new.json" "/tmp/${ID}.pre-minus-version.json" | head -20
      exit 1
    fi
    echo "Bestands-Felder byte-identisch (Anti-Halluzinations-Check OK)."
    ```

    Schritt 5 — Atomar committen:
    ```bash
    cd /home/kolja/edufunds-app
    git add data/richtlinien/bmbf-digitalpakt-2.json
    git commit -m "$(cat <<EOF
    feat(richtlinien): migrate bmbf-digitalpakt-2 auf Strict-Schema (Sample-1)

    Plan 04-03 (D-07/D-08/D-09): Targeted-Fill via scripts/migrate-legacy-dossier.ts.
    Sample-1 (Bundes-Bigcase) — erstes von zwei Sample-Dossiers laut D-09.
    Review-Gate folgt nach Sample-2 (ferry-porsche-challenge-2025) VOR den
    restlichen 9 Dossiers.

    Vier neue Felder hinzugefuegt (bestPractices, rejectGruende,
    vorbildFormulierungen, fristLogik), Bestands-Felder byte-identisch.
    EOF
    )"
    ```

    Schritt 6 — Kurz-Report fuer das Review-Gate (Sample-1-Inhalt sichtbar machen):
    ```bash
    cd /home/kolja/edufunds-app
    echo "=== Sample-1 Migrations-Diff fuer bmbf-digitalpakt-2 ==="
    git show --stat HEAD
    echo "--- bestPractices ---"
    jq '.bestPractices' data/richtlinien/bmbf-digitalpakt-2.json
    echo "--- rejectGruende ---"
    jq '.rejectGruende' data/richtlinien/bmbf-digitalpakt-2.json
    echo "--- vorbildFormulierungen ---"
    jq '.vorbildFormulierungen' data/richtlinien/bmbf-digitalpakt-2.json
    echo "--- fristLogik ---"
    jq '.fristLogik' data/richtlinien/bmbf-digitalpakt-2.json
    echo "--- antragsstruktur.abschnitte[].id (FK-Anker) ---"
    jq '.antragsstruktur.abschnitte[].id' data/richtlinien/bmbf-digitalpakt-2.json
    ```

    Schritt 7 — Branch-Commit-Count nach Sample-1:
    ```bash
    cd /home/kolja/edufunds-app
    test "$(git log --oneline feature/wizard-adaptive..HEAD | wc -l)" = "1" || { echo "Branch-Commit-Count != 1 nach Sample-1 — Plan-Bruch"; exit 1; }
    ```
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; git log -1 --pretty=%s | grep -E 'Sample-1' &amp;&amp; jq -e '.bestPractices' data/richtlinien/bmbf-digitalpakt-2.json &gt; /dev/null &amp;&amp; jq -e '.fristLogik.typ' data/richtlinien/bmbf-digitalpakt-2.json | grep -E '"rolling"|"fixe_stichtage"' &amp;&amp; npx tsx scripts/validate-single-dossier.ts data/richtlinien/bmbf-digitalpakt-2.json &amp;&amp; test "$(git log --oneline feature/wizard-adaptive..HEAD | wc -l)" = "1"
    </automated>
  </verify>
  <acceptance_criteria>
    - HEAD-Commit-Subject enthaelt "Sample-1"
    - `jq '.bestPractices' data/richtlinien/bmbf-digitalpakt-2.json` ist ein Array
    - `jq '.fristLogik.typ' data/richtlinien/bmbf-digitalpakt-2.json` matched `"rolling"` ODER `"fixe_stichtage"`
    - `npx tsx scripts/validate-single-dossier.ts data/richtlinien/bmbf-digitalpakt-2.json` exit 0
    - `git status --short` leer
    - `git log --oneline feature/wizard-adaptive..HEAD | wc -l` exakt `1` (Branch enthaelt jetzt nur Sample-1)
  </acceptance_criteria>
  <done>
    Sample-1 migriert + committed. Branch enthaelt 1 Commit. Sample-2 folgt direkt — Review-Gate kommt erst NACH Sample-2 laut D-09.
  </done>
</task>

<task type="auto">
  <name>Task 3: Sample-2-Commit: ferry-porsche-challenge-2025 (Stiftungs-Smallcase) — Commit 2 auf Branch</name>
  <files>data/richtlinien/ferry-porsche-challenge-2025.json</files>
  <read_first>
    - scripts/migrate-legacy-dossier.ts
    - scripts/validate-single-dossier.ts
    - data/richtlinien/ferry-porsche-challenge-2025.json (Bestand pre-migration)
  </read_first>
  <action>
    Identisches Pattern wie Task 2, fuer `ferry-porsche-challenge-2025`. Commit-Subject-Suffix `(Sample-2)`.

    Schritt 1 — Pre-State + Migration:
    ```bash
    cd /home/kolja/edufunds-app
    ID=ferry-porsche-challenge-2025
    cp "data/richtlinien/${ID}.json" "/tmp/${ID}.pre.json"
    if ! npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts "$ID"; then
      echo "FEHLER: Migration $ID gescheitert"
      exit 1
    fi
    ```

    Schritt 2 — Pre-Commit-Gate:
    ```bash
    cd /home/kolja/edufunds-app
    npx tsx scripts/validate-single-dossier.ts data/richtlinien/ferry-porsche-challenge-2025.json
    # exit 0 erwartet
    ```

    Schritt 3 — Diff-Sanity:
    ```bash
    cd /home/kolja/edufunds-app
    ID=ferry-porsche-challenge-2025
    jq -S 'del(.bestPractices, .rejectGruende, .vorbildFormulierungen, .fristLogik, .version)' "data/richtlinien/${ID}.json" > "/tmp/${ID}.post-minus-new.json"
    jq -S 'del(.version)' "/tmp/${ID}.pre.json" > "/tmp/${ID}.pre-minus-version.json"
    diff -q "/tmp/${ID}.post-minus-new.json" "/tmp/${ID}.pre-minus-version.json" || { echo "Bestands-Drift fuer ${ID}"; exit 1; }
    ```

    Schritt 4 — Commit:
    ```bash
    cd /home/kolja/edufunds-app
    git add data/richtlinien/ferry-porsche-challenge-2025.json
    git commit -m "$(cat <<EOF
    feat(richtlinien): migrate ferry-porsche-challenge-2025 auf Strict-Schema (Sample-2)

    Plan 04-03 (D-07/D-08/D-09): Targeted-Fill via scripts/migrate-legacy-dossier.ts.
    Sample-2 (Stiftungs-Smallcase) — zweites von zwei Sample-Dossiers laut D-09.
    Review-Gate folgt jetzt VOR den restlichen 9 Dossiers.

    Vier neue Felder hinzugefuegt, Bestands-Felder byte-identisch.
    EOF
    )"

    echo "=== Sample-2 Migrations-Diff fuer ferry-porsche-challenge-2025 ==="
    git show --stat HEAD
    jq '{bestPractices, rejectGruende, vorbildFormulierungen, fristLogik}' data/richtlinien/ferry-porsche-challenge-2025.json
    ```

    Schritt 5 — Branch-Commit-Count nach Sample-2 MUSS exakt 2 sein (D-09 hard acceptance):
    ```bash
    cd /home/kolja/edufunds-app
    BRANCH_COMMITS=$(git log --oneline feature/wizard-adaptive..HEAD | wc -l)
    if [ "$BRANCH_COMMITS" -ne 2 ]; then
      echo "FEHLER: Branch hat $BRANCH_COMMITS Commits, D-09 verlangt EXAKT 2 am ersten Review-Gate"
      git log --oneline feature/wizard-adaptive..HEAD
      exit 1
    fi
    echo "==> Branch dossier-migration/phase-04 hat exakt 2 Commits, bereit fuer Kolja-Review-Gate #1"
    ```
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; git log -1 --pretty=%s | grep -E 'Sample-2' &amp;&amp; jq -e '.fristLogik.typ' data/richtlinien/ferry-porsche-challenge-2025.json | grep -E '"rolling"|"fixe_stichtage"' &amp;&amp; npx tsx scripts/validate-single-dossier.ts data/richtlinien/ferry-porsche-challenge-2025.json &amp;&amp; test "$(git log --oneline feature/wizard-adaptive..HEAD | wc -l)" = "2"
    </automated>
  </verify>
  <acceptance_criteria>
    - HEAD-Commit-Subject enthaelt "Sample-2"
    - `npx tsx scripts/validate-single-dossier.ts data/richtlinien/ferry-porsche-challenge-2025.json` exit 0
    - `git status --short` leer
    - `git log --oneline feature/wizard-adaptive..HEAD | wc -l` exakt `2` (D-09 hard acceptance — beim ersten Review-Gate liegen EXAKT 2 Commits)
    - Subject vom vorletzten Commit (HEAD~1) enthaelt "Sample-1" (Reihenfolge: Sample-1 zuerst, Sample-2 oben)
  </acceptance_criteria>
  <done>
    Beide Samples migriert + committed in der korrekten Reihenfolge. Branch hat exakt 2 Commits laut D-09. Bereit fuer Kolja-Review-Gate #1.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: KOLJA-CHECKPOINT #1 — Sample-1 + Sample-2 Review (D-09)</name>
  <what-built>
    Beide Sample-Dossiers (`bmbf-digitalpakt-2` Bundes-Bigcase + `ferry-porsche-challenge-2025` Stiftungs-Smallcase) sind auf das Strict-Schema migriert. Vier neue Felder (`bestPractices`, `rejectGruende`, `vorbildFormulierungen`, `fristLogik`) sind hinzugefuegt, Bestands-Felder sind byte-identisch zur Pre-Migration, Strict-Validator + FK-Check sind gruen. Branch `dossier-migration/phase-04` enthaelt EXAKT 2 Commits laut D-09.
  </what-built>
  <files>data/richtlinien/bmbf-digitalpakt-2.json + data/richtlinien/ferry-porsche-challenge-2025.json (Review-Targets, nicht geaendert)</files>
  <action>Human-Verify-Checkpoint. Die Verifikations-Schritte stehen in <how-to-verify>. Executor wartet auf Antwort 'PASS'/'approved' oder eine FAIL-Begruendung, BEVOR die folgende Task laeuft.</action>
  <verify>Kolja hat 'approved'/'PASS' geantwortet — Vollmigration der restlichen 9 Dossiers darf starten. Bei FAIL: Plan stoppt, Plan 02 wird angepasst (Skript-Prompt-Verfeinerung), die zwei Sample-Commits werden via git reset --hard feature/wizard-adaptive zurueckgerollt.</verify>
  <done>Kolja hat 'approved'/'PASS' geantwortet — Vollmigration der restlichen 9 Dossiers darf starten. Bei FAIL: Plan stoppt, Plan 02 wird angepasst, die zwei Sample-Commits werden via git reset --hard feature/wizard-adaptive zurueckgerollt.</done>
  <how-to-verify>
    1. **Branch-Acceptance-Pruefung (HARD):**
       ```bash
       cd /home/kolja/edufunds-app
       BRANCH_COMMITS=$(git log --oneline feature/wizard-adaptive..HEAD | wc -l)
       echo "Branch dossier-migration/phase-04: $BRANCH_COMMITS Commits"
       # Erwartung: 2 (laut D-09)
       git log --oneline feature/wizard-adaptive..HEAD
       # Erwartung Reihenfolge (oben = neueste):
       #   feat(richtlinien): migrate ferry-porsche-challenge-2025 ... (Sample-2)
       #   feat(richtlinien): migrate bmbf-digitalpakt-2 ... (Sample-1)
       ```
       Wenn !=2 Commits → FAIL automatisch (Plan-Bruch).

    2. **Diff inspizieren (beide Samples):**
       ```bash
       cd /home/kolja/edufunds-app
       git show HEAD -- data/richtlinien/ferry-porsche-challenge-2025.json | less
       git show HEAD~1 -- data/richtlinien/bmbf-digitalpakt-2.json | less
       ```

    3. **Quality-Check Sample-1 (bmbf-digitalpakt-2, Bundes-Bigcase):**
       - **bestPractices:** Stehen die Eintraege wirklich in der Quelle (digitalpaktschule.de)? Sind die `was_funktionierte`-Strings konkret (z. B. „Klares paedagogisches Konzept als Anlage A", nicht „gute Vorbereitung")?
       - **rejectGruende:** Sind das echte Reject-Gruende aus der DigitalPakt-Praxis (z. B. „Standardsoftware ohne paedagogischen Bezug", „Konsumgueter")? Halluziniert das LLM allgemeine Foerder-Sentencias?
       - **vorbildFormulierungen:** Zeigen die `abschnitt_id`-Werte auf existierende `antragsstruktur.abschnitte[].id` (FK-Check ist automatisch gruen, aber inhaltliche Plausibilitaet pruefen)?
       - **fristLogik:** DigitalPakt 2.0 laeuft 2025-2030. Steht `typ: "rolling"` (wenn keine Stichtage in der Quelle) oder `fixe_stichtage` mit ISO-Daten?

    4. **Quality-Check Sample-2 (ferry-porsche-challenge-2025, Stiftungs-Smallcase):**
       - Ferry-Porsche-Challenge ist ein Stiftungs-Wettbewerb mit eigenem Stil (kreative Aufgabenstellung, Jugend-Fokus). Sind die `bestPractices`, `rejectGruende`, `vorbildFormulierungen` zum Stil eines Stiftungs-Wettbewerbs passend (statt zu Bundes-Foerderung)?
       - **Frist-Logik-Check:** Ferry-Porsche-Challenge hat typischerweise jaehrliche Stichtage. Ist `fristLogik.typ = "fixe_stichtage"` mit `jaehrlich_wiederkehrend: true`?

    5. **Anti-Halluzinations-Stichprobe (beide Samples):** Quelle aufrufen, je 2-3 Stichproben gegen den Quelltext pruefen ob `bestPractices[0].was_funktionierte` UND `rejectGruende[0].grund` UND `vorbildFormulierungen[0].formulierung` aus dem Quell-Text belegbar sind. Wenn drei Stichproben in Reihe nicht belegbar sind → FAIL.

    6. **Style-Vergleich Sample-1 vs Sample-2:** Wenn das LLM bei Stiftungs-Smallcase denselben Bundes-Stil produziert wie bei Bigcase → Hinweis dass der Prompt nicht genug Stil-Adaption hat (Re-Prompting noetig).

    7. **Entscheidung treffen:**
       - **PASS** (Skript laeuft weiter mit Vollmigration der restlichen 9): Antwort "approved" oder "PASS — Vollmigration starten".
       - **FAIL** (Re-Prompting noetig): Antwort mit konkretem Problem (z. B. "bestPractices halluziniert, vermutlich brauchen wir mehr Volltext im Prompt"). Plan 03 stoppt, Plan 02 wird angepasst (Skript-Prompt-Verfeinerung), beide Sample-Commits werden via `git reset --hard feature/wizard-adaptive` zurueckgerollt, Iteration startet neu.

    8. **Bei FAIL — Rollback-Anweisung fuer den Executor:**
       ```bash
       cd /home/kolja/edufunds-app
       git reset --hard feature/wizard-adaptive  # beide Sample-Commits zurueck
       git status                                # working tree clean
       # Plan 04-02-Skript anpassen (z.B. SYSTEM_PROMPT verschaerfen, Volltext-Slice hoch),
       # separat committen auf feature/wizard-adaptive, dann Plan 04-03 Task 2+3 neu ausfuehren.
       ```
  </how-to-verify>
  <resume-signal>
    Antworte mit "PASS" oder "approved" um die Vollmigration der restlichen 9 Dossiers zu starten.
    Bei FAIL: konkretes Problem benennen (z. B. "bestPractices halluziniert auf Bundeswissen, brauche mehr Volltext-Kontext im Prompt").
  </resume-signal>
</task>

<task type="auto">
  <name>Task 5: Vollmigration der restlichen 9 Dossiers in alphabetischer Reihenfolge (Commits 3-11)</name>
  <files>data/richtlinien/aktion-mensch-schulkooperation.json, data/richtlinien/berlin-startchancen.json, data/richtlinien/bosch-schulpreis.json, data/richtlinien/ensam-bmz.json, data/richtlinien/erasmus-schule-2026.json, data/richtlinien/erasmus-schulentwicklung.json, data/richtlinien/ferry-porsche-challenge.json, data/richtlinien/klimalab-2026.json, data/richtlinien/kultur-macht-stark.json</files>
  <read_first>
    - scripts/migrate-legacy-dossier.ts
    - scripts/validate-single-dossier.ts
  </read_first>
  <action>
    Schleife ueber die 9 verbleibenden Dossiers in alphabetischer Reihenfolge. Reihenfolge ist VERBINDLICH — sie ergibt sich aus `ls data/richtlinien/*.json` minus die zwei Samples.

    Pro Iteration: cp pre-snapshot → npx tsx migrate → npx tsx validate-single-dossier (Pre-Commit-Gate) → diff-sanity → atomarer Commit.

    ```bash
    cd /home/kolja/edufunds-app
    for ID in aktion-mensch-schulkooperation berlin-startchancen bosch-schulpreis ensam-bmz erasmus-schule-2026 erasmus-schulentwicklung ferry-porsche-challenge klimalab-2026 kultur-macht-stark; do
      echo "=== Migration: $ID ==="

      # Vor-State-Snapshot
      cp "data/richtlinien/${ID}.json" "/tmp/${ID}.pre.json"

      # Migration
      if ! npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts "$ID"; then
        echo "FEHLER: Migration $ID gescheitert, abbrechen"
        exit 1
      fi

      # Pre-Commit-Gate via Helper-Skript (Plan 04-02 Task 2 Output)
      if ! npx tsx scripts/validate-single-dossier.ts "data/richtlinien/${ID}.json"; then
        echo "FEHLER: Strict-Validator FAIL fuer ${ID} — kein Commit, bitte manuell debuggen"
        exit 1
      fi

      # Diff-Sanity: nur 4 neue Top-Level-Felder + version, sonst KEINE Aenderung
      jq -S 'del(.bestPractices, .rejectGruende, .vorbildFormulierungen, .fristLogik, .version)' "data/richtlinien/${ID}.json" > "/tmp/${ID}.post-minus-new.json"
      jq -S 'del(.version)' "/tmp/${ID}.pre.json" > "/tmp/${ID}.pre-minus-version.json"
      if ! diff -q "/tmp/${ID}.post-minus-new.json" "/tmp/${ID}.pre-minus-version.json"; then
        echo "FEHLER: Bestands-Felder von ${ID} sind NICHT byte-identisch nach Migration:"
        diff "/tmp/${ID}.post-minus-new.json" "/tmp/${ID}.pre-minus-version.json" | head -20
        exit 1
      fi
      echo "Bestands-Felder byte-identisch (Anti-Halluzinations-Check OK)."

      # Atomar committen
      git add "data/richtlinien/${ID}.json"
      git commit -m "$(cat <<EOF
    feat(richtlinien): migrate ${ID} auf Strict-Schema

    Plan 04-03 (D-07/D-08): Targeted-Fill via scripts/migrate-legacy-dossier.ts.
    Vier neue Felder hinzugefuegt (bestPractices, rejectGruende,
    vorbildFormulierungen, fristLogik), Bestands-Felder byte-identisch zur
    Pre-Migration, version auf $(date -u +%Y-%m-%d) gebumpt.

    Strict-Validator + FK-Check gruen.
    EOF
    )"
    done
    ```

    Wenn EIN Dossier scheitert: Schleife bricht ab (set -e implizit ueber die exit-Befehle). Kolja informieren, manuell debuggen, ggf. Skript verfeinern.

    Schritt 2 — Branch-Commit-Count nach Vollmigration:
    ```bash
    cd /home/kolja/edufunds-app
    BRANCH_COMMITS=$(git log --oneline feature/wizard-adaptive..HEAD | wc -l)
    test "$BRANCH_COMMITS" = "11" || { echo "FEHLER: Branch hat $BRANCH_COMMITS Commits, erwartet 11 (2 Samples + 9 Rest)"; exit 1; }
    echo "==> Branch dossier-migration/phase-04 hat $BRANCH_COMMITS Migrations-Commits (D-08 erfuellt)"
    ```
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; for ID in aktion-mensch-schulkooperation berlin-startchancen bosch-schulpreis ensam-bmz erasmus-schule-2026 erasmus-schulentwicklung ferry-porsche-challenge klimalab-2026 kultur-macht-stark; do test "$(git log --oneline | grep -c "feat(richtlinien): migrate ${ID}")" -ge 1 || { echo "Missing commit for ${ID}"; exit 1; }; npx tsx scripts/validate-single-dossier.ts "data/richtlinien/${ID}.json" || { echo "${ID}: validator FAIL"; exit 1; }; done &amp;&amp; test "$(git log --oneline feature/wizard-adaptive..HEAD | wc -l)" = "11"
    </automated>
  </verify>
  <acceptance_criteria>
    - Fuer jedes der 9 Dossiers in dieser Task: HEAD-Liste enthaelt `feat(richtlinien): migrate <id>` Commit
    - Fuer jedes der 9 Dossiers: `npx tsx scripts/validate-single-dossier.ts data/richtlinien/<id>.json` exit 0
    - Fuer jedes der 9 Dossiers: `bestPractices`, `rejectGruende`, `vorbildFormulierungen` sind Arrays, `fristLogik.typ` ist `rolling` oder `fixe_stichtage`
    - `git diff --quiet` exit 0 nach Schleifen-Ende
    - `git log --oneline feature/wizard-adaptive..HEAD | wc -l` exakt `11` (2 Samples aus Tasks 2+3 + 9 aus Task 5)
  </acceptance_criteria>
  <done>
    Alle 11 Dossiers sind migriert auf Branch `dossier-migration/phase-04`. Bereit fuer Gesamt-Strict-Validator-Lauf + zweites Review-Gate.
  </done>
</task>

<task type="auto">
  <name>Task 6: Gesamt-Strict-Validator-Lauf + Summary-Statistik + Branch-Status-Dump</name>
  <files>(keine Datei-Modifikation — nur Validierung)</files>
  <read_first>
    - scripts/validate-richtlinien.ts
  </read_first>
  <action>
    Schritt 1 — Strict-Validator gegen alle 11 Dossiers (ohne `--legacy`-Flag):
    ```bash
    cd /home/kolja/edufunds-app
    npx tsx scripts/validate-richtlinien.ts 2>&1 | tee /tmp/validator-strict-post.log
    echo "Exit: $?"
    # Erwartung: exit 0, "Alle 11 Dossiers valide (strict-Modus)."
    ```
    Wenn exit != 0: STOP. Welche Dossiers sind faulig? Im Log nachschauen, manuell debuggen (entweder Skript-Bug → in Plan 02 fixen + alle Commits ueber rebase rebuilden, oder LLM-Halluzination → Dossier manuell nachbessern + amend commit).

    Schritt 2 — Statistik fuer Summary:
    ```bash
    cd /home/kolja/edufunds-app
    echo "=== Phase 4 Plan 03 — Migration-Statistik ==="
    echo "Anzahl Commits auf Branch (dossier-migration/phase-04 vs feature/wizard-adaptive):"
    git log --oneline feature/wizard-adaptive..HEAD | wc -l
    echo "Migration-Commits:"
    git log --oneline feature/wizard-adaptive..HEAD --grep="feat(richtlinien): migrate" | wc -l
    echo ""
    echo "=== Pro-Dossier-Felder-Statistik ==="
    for f in data/richtlinien/*.json; do
      ID=$(basename "$f" .json)
      BP=$(jq '.bestPractices | length' "$f")
      RG=$(jq '.rejectGruende | length' "$f")
      VF=$(jq '.vorbildFormulierungen | length' "$f")
      FL=$(jq -r '.fristLogik.typ' "$f")
      printf "%-40s bestPractices=%d rejectGruende=%d vorbildFormulierungen=%d fristLogik=%s\n" "$ID" "$BP" "$RG" "$VF" "$FL"
    done
    ```

    Schritt 3 — Legacy-Validator nochmal druecken (sollte weiterhin gruen sein — Strict-Tightening bricht Legacy nicht):
    ```bash
    cd /home/kolja/edufunds-app
    npx tsx scripts/validate-richtlinien.ts --legacy
    echo "Legacy-Exit: $?"
    ```

    Schritt 4 — Branch-Snapshot dokumentieren:
    ```bash
    cd /home/kolja/edufunds-app
    git log --oneline feature/wizard-adaptive..HEAD
    git status
    ```

    Schritt 5 — Reihenfolge-Verifikation: ersten beiden Commits (von oben, also die aeltesten) sollten die zwei Samples sein:
    ```bash
    cd /home/kolja/edufunds-app
    # `git log --reverse` listet aelteste zuerst — die ersten beiden Eintraege MUESSEN die Samples sein
    git log --reverse --oneline feature/wizard-adaptive..HEAD | head -2
    # Erwartung (oben = aeltester):
    #   <hash> feat(richtlinien): migrate bmbf-digitalpakt-2 ... (Sample-1)
    #   <hash> feat(richtlinien): migrate ferry-porsche-challenge-2025 ... (Sample-2)
    git log --reverse --oneline feature/wizard-adaptive..HEAD | head -1 | grep -q "Sample-1" || { echo "FEHLER: erster Commit ist nicht Sample-1"; exit 1; }
    git log --reverse --oneline feature/wizard-adaptive..HEAD | sed -n '2p' | grep -q "Sample-2" || { echo "FEHLER: zweiter Commit ist nicht Sample-2"; exit 1; }
    echo "==> Reihenfolge korrekt: Sample-1, Sample-2, dann 9 alphabetisch"
    ```
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; npx tsx scripts/validate-richtlinien.ts &amp;&amp; npx tsx scripts/validate-richtlinien.ts --legacy &amp;&amp; test "$(git log --oneline feature/wizard-adaptive..HEAD --grep='feat(richtlinien): migrate' | wc -l)" -ge 11 &amp;&amp; git log --reverse --oneline feature/wizard-adaptive..HEAD | head -1 | grep -q "Sample-1" &amp;&amp; git log --reverse --oneline feature/wizard-adaptive..HEAD | sed -n '2p' | grep -q "Sample-2" &amp;&amp; git diff --quiet
    </automated>
  </verify>
  <acceptance_criteria>
    - `npx tsx scripts/validate-richtlinien.ts` exit 0 (Strict-Modus gegen alle 11 Dossiers gruen)
    - `npx tsx scripts/validate-richtlinien.ts --legacy` exit 0 (Legacy-Modus weiterhin gruen — Backward-Compat erhalten)
    - `git log --oneline feature/wizard-adaptive..HEAD --grep='feat(richtlinien): migrate' | wc -l` >= 11
    - `git log --reverse --oneline feature/wizard-adaptive..HEAD | head -1` enthaelt "Sample-1" (erster Commit auf Branch ist Sample-1)
    - `git log --reverse --oneline feature/wizard-adaptive..HEAD | sed -n '2p'` enthaelt "Sample-2" (zweiter Commit ist Sample-2)
    - `git diff --quiet` exit 0
    - `/tmp/validator-strict-post.log` enthaelt "Alle 11 Dossiers valide (strict-Modus)."
    - Im Pro-Dossier-Statistik-Output haben alle 11 Dossiers `bestPractices >= 0` und `fristLogik` ist nie "null" oder "undefined"
  </acceptance_criteria>
  <done>
    Success-Criterion #3 der Phase 4 ist erfuellt: alle 11 Dossiers haben die vier Phase-3-Felder, Strict-Validator gruen, Legacy-Validator gruen, Sample-First-Reihenfolge korrekt eingehalten. FETCH-04 ist materiell abgeschlossen. Branch `dossier-migration/phase-04` mit 11 Commits steht lokal — kein Push, kein PR-Open in Plan 03 (das ist Koljas Discretion).
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 7: KOLJA-CHECKPOINT #2 — Phase-4-FETCH-04-Abschluss-Review (11 Commits)</name>
  <what-built>
    Alle 11 Dossiers in `data/richtlinien/` sind auf das Strict-Schema migriert. Branch `dossier-migration/phase-04` enthaelt 11 atomare Migrations-Commits:
    1. Sample-1: bmbf-digitalpakt-2 (Bundes-Bigcase) — Commit-Suffix "(Sample-1)"
    2. Sample-2: ferry-porsche-challenge-2025 (Stiftungs-Smallcase) — Commit-Suffix "(Sample-2)"
    3-11. Alphabetische Reihenfolge der restlichen 9 Dossiers

    Strict-Validator (`npx tsx scripts/validate-richtlinien.ts`) gruen. Legacy-Validator weiterhin gruen. Bestands-Felder aller 11 Dossiers sind byte-identisch zur Pre-Migration (nur version-Bump + 4 neue Top-Level-Felder).

    FETCH-04 ist auf diesem Branch materiell erfuellt — Success-Criterion #3 der Phase 4 abgehakt.
  </what-built>
  <files>data/richtlinien/*.json (11 Files, Review-Target — nicht geaendert)</files>
  <action>Human-Verify-Checkpoint fuer FETCH-04-Abschluss. Die Verifikations-Schritte stehen in <how-to-verify>. Executor wartet auf 'approved'/'PASS' oder HOLD-Befund.</action>
  <verify>Kolja hat 'approved'/'PASS' geantwortet — Phase-4-Plan-03 ist materiell abgeschlossen, FETCH-04 erfuellt. PR auf den dossier-migration/phase-04-Branch (ready-for-review) ist Koljas Discretion.</verify>
  <done>Kolja hat 'approved'/'PASS' geantwortet — Phase-4-Plan-03 ist materiell abgeschlossen, FETCH-04 erfuellt. Optional: PR jetzt eroeffnen oder auf Plan 04 Abschluss warten und Sammel-PR machen.</done>
  <how-to-verify>
    1. **Branch-Topologie inspizieren:**
       ```bash
       cd /home/kolja/edufunds-app
       git log --oneline feature/wizard-adaptive..HEAD
       # Erwartung: 11 Commits, oben = Sample-2 ist NICHT mehr ganz oben (9 alphabetische Commits sind dazwischen)
       git log --reverse --oneline feature/wizard-adaptive..HEAD | head -3
       # Erwartung: Sample-1, Sample-2, aktion-mensch-schulkooperation (in dieser Reihenfolge — Reihenfolge laut D-09)
       ```

    2. **Strict-Validator drueben:**
       ```bash
       cd /home/kolja/edufunds-app
       npx tsx scripts/validate-richtlinien.ts
       # Erwartung: "Alle 11 Dossiers valide (strict-Modus)." exit 0
       ```

    3. **Pro-Dossier-Statistik einsehen** (aus Task 6 Schritt 2 — Output sollte noch im Terminal-Backscroll sein):
       - Welche Dossiers haben 0 bestPractices? (zulaessig, wenn die Quelle nichts hergibt — aber sollte nicht jedes Dossier sein)
       - Welche Dossiers haben fristLogik.typ = "rolling" vs "fixe_stichtage"? Plausibel?

    4. **Stichprobenartige Qualitaets-Pruefung** der 9 nicht-Sample-Dossiers:
       - Stichprobe 1: `jq '.bestPractices' data/richtlinien/kultur-macht-stark.json`
       - Stichprobe 2: `jq '.fristLogik' data/richtlinien/erasmus-schule-2026.json`
       - Sind die Inhalte plausibel zur jeweiligen Programm-Quelle (statt halluziniert)?

    5. **Entscheidung treffen:**
       - **APPROVE** (FETCH-04 erfuellt): Antwort "approved" oder "PASS — Plan 04-03 abgeschlossen". Optional Hinweis: "PR jetzt eroeffnen" oder "warten bis Plan 04 ebenfalls landet und ein Sammel-PR gemacht wird".
       - **HOLD** (Befund): Konkretes Problem benennen, z.B. einzelnes Dossier nachbessern (amend-commit) bevor Plan 04 weiter laeuft.
  </how-to-verify>
  <resume-signal>
    Antworte mit "approved" / "PASS" wenn FETCH-04 erfuellt ist (Strict-Validator gegen alle 11 Dossiers gruen + Sample-First-Reihenfolge eingehalten).
    Optional: Hinweis ob PR jetzt eroeffnet werden soll oder ob der migration-Branch lokal liegen bleibt bis Plan 04 ebenfalls fertig ist.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| LLM-Output → Repo-Dossiers (11 Writes) | Jede der 11 Migrations-Schreibvorgaenge ist ein LLM→Repo-Transfer mit Strict-Validator-Gate. Plus Diff-Sanity-Check, dass Bestands-Felder byte-identisch bleiben. |
| Branch-Strategie | 11 Commits auf separatem Branch — kein direkter Push auf feature/wizard-adaptive |
| Sample-First-Discipline (D-09) | Branch-Commit-Count am ersten Review-Gate MUSS exakt 2 sein — Plan-Bruch-Check als Hard-Acceptance |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-11 | T (Tampering) | LLM ueberschreibt Bestands-Felder via Halluzination | mitigate | Diff-Sanity-Check in der Schleife: `jq 'del(.bestPractices, ..., .version)' POST` muss byte-identisch sein zu `jq 'del(.version)' PRE`. Bei Drift: exit 1, kein Commit. |
| T-04-12 | T (Tampering) | LLM liefert FK-Verletzungen in vorbildFormulierungen[].abschnitt_id | mitigate | validate-single-dossier.ts ruft validateForeignKeys auf, exit 1 bei Verletzung. Migrations-Skript hat denselben Check schon in Plan 02 — Pre-Commit-Gate hier ist Defense-in-Depth. |
| T-04-13 | I (Information Disclosure) | LLM-Prompt enthaelt das vollstaendige Bestands-Dossier im Klartext | accept | Bestands-Dossiers sind oeffentliche Foerderprogramm-Informationen, keine PII. Risiko vernachlaessigbar. |
| T-04-14 | R (Repudiation) | Welche LLM-Variante hat welches Dossier migriert? | mitigate | Jeder Commit-Body enthaelt Plan-04-03 + D-Code. version-Bump auf YYYY-MM-DD im Dossier dokumentiert Migrations-Datum. LLM-Modell-ID landet in den Logs (lib/wizard/llm.ts Cost-Tracking) — wenn relevant, im SUMMARY notieren. |
| T-04-15 | D (DoS) | LLM-Quota-Exhaustion bei 11 sequenziellen Calls | accept | 11 × ~4000 maxTokens = ~44k Tokens. Kein Quota-Problem. Bei DeepSeek-Rate-Limit (selten): Skript schlaegt mit exit 3 fehl, Schleife bricht ab, Restart-Mechanik manuell. |
| T-04-16 | E (Elevation) | Migrationsbranch wird versehentlich direkt auf main gepusht | accept | CLAUDE.md-Konvention `feature/* → staging → main`. Branch heisst `dossier-migration/phase-04` — kein Auto-Push in diesem Plan. PR-Open ist Koljas Discretion. |
| T-04-26 | T (Tampering) | Sample-First-Pattern (D-09) wird umgangen — z.B. 3 Commits am ersten Review-Gate | mitigate | Hard-Acceptance in Task 3 + Task 4 Schritt 1: `git log --oneline feature/wizard-adaptive..HEAD \| wc -l` MUSS exakt 2 sein. Skript bricht ab wenn nicht. Plus Reihenfolge-Pruefung in Task 6 Schritt 5 (Sample-1 ist erster, Sample-2 ist zweiter Commit). |
</threat_model>

<verification>
1. **Branch-Topologie:** `git log --oneline feature/wizard-adaptive..HEAD --grep='feat(richtlinien): migrate' | wc -l` >= 11
2. **Strict-Validator gruen:** `npx tsx scripts/validate-richtlinien.ts` exit 0
3. **Legacy-Validator weiterhin gruen:** `npx tsx scripts/validate-richtlinien.ts --legacy` exit 0
4. **Sample-First-Pattern (D-09) strikt eingehalten:** erster Commit (chronologisch aeltester via `git log --reverse`) ist Sample-1, zweiter ist Sample-2. Am ersten Review-Gate liegen EXAKT 2 Commits.
5. **Atomare Commits:** jeder migrierte Dossier-Commit veraendert genau eine Datei (verifiziert via `git log --name-only` Stichprobe)
6. **Byte-Identitaet der Bestands-Felder:** in der Migrations-Schleife mit `jq 'del(...)' POST == jq 'del(.version)' PRE` verifiziert (auf /tmp temporaere Files, geprueft pro Schleifen-Iteration)
7. **Pre-Commit-Gate via Helper-Skript:** `npx tsx scripts/validate-single-dossier.ts <pfad>` pro Dossier — NICHT `node -e require(...)` (das crasht mit TypeScript-Files)
8. **Two Review-Gates eingehalten:** Tasks 4 (nach Samples) + 7 (FETCH-04-Closure) sind blocking checkpoints
</verification>

<success_criteria>
Plan 04-03 ist erfolgreich abgeschlossen, wenn:

- [ ] Branch `dossier-migration/phase-04` existiert lokal mit 11 Migrations-Commits (1 pro Dossier)
- [ ] **Sample-First-Pattern (D-09) ist STRIKT eingehalten:** Die ersten beiden Commits auf dem Branch (chronologisch) sind Sample-1 (bmbf-digitalpakt-2) und Sample-2 (ferry-porsche-challenge-2025). Am ersten Review-Gate (Task 4) lagen EXAKT 2 Commits, nicht 3.
- [ ] Strict-Validator-Lauf `npx tsx scripts/validate-richtlinien.ts` gruen gegen alle 11 Dossiers
- [ ] Legacy-Validator-Lauf gruen (Backward-Compat erhalten)
- [ ] Bestands-Felder aller 11 Dossiers sind byte-identisch zur Pre-Migration (nur version-Bump + 4 neue Felder)
- [ ] Pre-Commit-Validierung pro Dossier nutzt `npx tsx scripts/validate-single-dossier.ts` (Helper aus Plan 04-02) — NICHT `node -e require(...)`
- [ ] Beide Kolja-Review-Checkpoints (Tasks 4 + 7) haben PASS-Antwort bekommen
- [ ] FETCH-04 ist erfuellt (Roadmap-Success-Criterion #3 der Phase 4)
</success_criteria>

<output>
Nach Abschluss: `.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-03-sample-first-migration-vollmigration-SUMMARY.md` schreiben mit:
- Branch-Snapshot (`git log --reverse --oneline feature/wizard-adaptive..HEAD`) mit explizitem Hinweis welche Commits Sample-1 und Sample-2 sind
- Bestaetigung dass beim ersten Review-Gate (Task 4) der Commit-Count exakt 2 war
- Pro-Dossier-Felder-Statistik aus Task 6 Schritt 2
- Kumulierte LLM-Token-Kosten (aus Skript-Output addiert)
- Anmerkungen aus den zwei Review-Checkpoints (Was hat Kolja bei Samples / Gesamtmigration angemerkt?)
- Hinweis fuer Plan 04: alle 11 Dossiers sind strict-konform — der neue Workflow `weekly-auto-pflege.yml` kann den Strict-Validator als Pre-Persist-Gate verwenden ohne Sonderfall fuer Legacy
- Empfehlung an Kolja: PR `dossier-migration/phase-04` jetzt eroeffnen oder warten bis Plan 04 ebenfalls landet und ein Sammel-PR gemacht wird (Discretion)
</output>
