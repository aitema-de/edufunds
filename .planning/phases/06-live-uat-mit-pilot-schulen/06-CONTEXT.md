# Phase 6: Live-UAT mit Pilot-Schulen - Context

**Gathered:** 2026-05-20
**Status:** Re-planning ab 06-02 — Async-UAT-Pivot 2026-05-20 (06-01 abgeschlossen)

<domain>
## Phase Boundary

Phase 6 führt **3–5 strukturierte Live-UAT-Sessions** mit echten Schulen / Schulfördervereinen aus Koljas Netzwerk durch, trackt die Befunde pro Session in dedizierten Trackern, adressiert sie in einer (überwiegend konsolidierten) Bug-Fix-Welle, sichert jeden Bug als Eval-Regressions-Test-Case und schließt mit einem Pilot-UAT-Retro ab.

Diese Phase ist **überwiegend operativ**: Die UAT-Sessions selbst kann GSD nicht ausführen — sie hängen an Koljas Pilot-Recruiting und an Terminen. Die Plan-Phase bildet das über einen Framework-Plan mit manuellen Session-Checkpoints ab; GSD-ausführbar sind Setup-Helfer, Bug-Fixes, Eval-Integration und das Retro.

**In Scope:** UAT-Durchführung (UAT-01), Befunde-Tracker pro Session (UAT-02), konsolidierte Bug-Fix-Welle (UAT-03), Eval-Korpus-Erweiterung um UAT-Cases, Pilot-UAT-Retro.

**Explizit NICHT in dieser Phase:**
- Stripe-Live / Auth / Schulträger-Abos / Production-Migration nach `main` — bleibt v2.
- Neue Features außerhalb der Bug-Fixes — UAT deckt auf, Phase 6 fixt, baut nichts Neues.
- AVV-Dokumentation für DeepSeek — Reminder für Vor-Production-Phase, hier durch fiktive-Daten-Default umgangen (siehe D-22).
</domain>

<decisions>
## Implementation Decisions

## ⚠ ASYNC-UAT-PIVOT (2026-05-20) — hat Vorrang vor den Decisions darunter

Nach Abschluss von Plan 06-01 hat Kolja das UAT-Modell geändert: **asynchrone, unmoderierte Pilot-Tests** statt moderierter Screen-Sharing-Sessions. Die folgenden Pivot-Entscheidungen haben **Vorrang** vor den ursprünglichen Decisions; betroffene Alt-Decisions sind explizit benannt.

- **D-26 (überschreibt D-21):** UAT-Umgebung = **Staging-Deploy**. Der Wizard-Branch `feature/wizard-adaptive` wird auf `staging.edufunds.org` deployed — Migrationen 002/003 auf die Staging-DB, `NEXT_PUBLIC_PAYWALL_DEV_MOCK=1` gesetzt, Smoke-Test nach Deployment-Safety-Regel. Piloten erreichen den Wizard über diese URL. Lokales Dev + Screen-Sharing entfällt. **Stand 2026-05-27: Initial-Deploy 2026-05-20 erfolgt; redeployt 2026-05-27 mit BEFUND-1+2-Fixes; E2E Playwright-Verifikation bestanden (Session `6dcdac50-…`). Kein separater Deploy-Plan mehr nötig — die Infrastruktur ist live.**
- **D-27 (überschreibt D-09/D-11 und `<specifics>` Screen-Sharing):** Sessions = **async + unmoderiert**. Der Pilot testet allein, wann er Zeit hat — kein Termin, kein Moderator, kein Think-aloud. GSD pausiert weiterhin pro Pilot (Checkpoint-Mechanik bleibt), aber der Resume-Trigger ist die vom Piloten zurückgeschickte Rückmeldung, nicht eine von Kolja moderierte Session.
- **D-28 (überschreibt D-11):** Befunde-Input = **zweistufig**. Der Pilot füllt das laienfreundliche `UAT-PILOT-RUECKMELDUNG-TEMPLATE.md` aus (Rohinput). GSD baut daraus + aus dem DB-Snapshot des Pilot-Antrags den technischen `UAT-BEFUNDE-{datum}-PILOT-{code}.md`-Tracker (UAT-BEFUNDE-TEMPLATE.md-Schema). Kolja füllt den technischen Tracker NICHT mehr selbst.
- **D-29:** Pilot-Doku existiert bereits — `.planning/uat/UAT-PILOT-ANLEITUNG.md` (Selbst-Test-Anleitung) + `UAT-PILOT-RUECKMELDUNG-TEMPLATE.md` (Ausfüll-Formular), erstellt als 06-01-Folgearbeit (Commit `30c64a4`). `UAT-ANSCHREIBEN.md` ist auf das async-Modell umgestellt. `UAT-PLAN-TEMPLATE.md` (moderiert) ist damit nur noch optionales Kolja-internes Material.
- **D-30 (ergänzt D-12):** `uat-pre-session-check.ts` prüft `localhost:3101` — für das async-Modell auf die Staging-URL umstellen ODER als Kolja-internes Smoke-Tool belassen. `uat-db-snapshot.ts` + `uat-session-token.ts` bleiben gültig (Pilot-Antrag aus der DB ziehen). Pilot-Run-Zuordnung läuft über die vom Piloten kopierte **Antrag-URL** (enthält die ID), nicht über einen Session-Start-Timestamp.

**Plan-Status (2026-05-27):**
- Plan 06-01 ist abgeschlossen (SUMMARY vorhanden) und **bleibt erhalten** — IST-STAND-CHECK, die drei Helper-Skripte und die D-22-Template-Änderung gelten weiter.
- Plan 06-02 ist **auf async-Modell umgestellt** (2026-05-27): Task 1 + Task 2 + Objective + Threat-Tabelle reflektieren D-26..D-30. Read-First-Liste verweist jetzt auf UAT-PILOT-ANLEITUNG.md + UAT-PILOT-RUECKMELDUNG-TEMPLATE.md statt UAT-PLAN-TEMPLATE.md. Resume-Signal ist die eingehende Pilot-Rückmeldung mit Antrag-URL.
- Plan 06-03 (konsolidierte Bug-Fix-Welle) ist modell-agnostisch — bleibt unverändert. Arbeitet auf den UAT-BEFUNDE-PILOT-*.md-Trackern, die Task 2 aus 06-02 erzeugt.
- Plan 06-04 (Baseline-Eintrag + Retro) ist modell-agnostisch — bleibt unverändert.
- **Separater Deploy-Plan wurde NICHT geschrieben** — der Staging-Deploy ist durch die 2026-05-20-Initial-Deployment + 2026-05-27-Redeploy mit BEFUND-1+2-Fixes implizit erfolgt. Live-Verifikation E2E bestanden.

---

### Bug-Fix-Welle — Timing & Scope

- **D-01:** Fix-Timing = **Hybrid**. Nur Blocker (5xx-Crash, Pipeline-Abbruch, Datenverlust) werden rolling zwischen den Sessions gefixt, damit Folge-Piloten nicht denselben Wall treffen. Alle anderen Befunde sammeln sich für eine **konsolidierte Welle nach der letzten Session** (Vorbild: 28.–30.04.-Fix-Welle).
- **D-02:** Fix-Scope = **Hoch + Mittel** werden in Phase 6 gefixt + verifiziert. **Niedrige** UX-Lücken dürfen mit Begründung auf v2 — aber nur explizit dokumentiert (Tracker + Retro), nie stillschweigend.
- **D-16:** Unfixbarer Hoch-Bug → **Eskalations-Checkpoint**. Sitzt ein Hoch-Bug strukturell zu tief für vernünftigen Aufwand, hält GSD an und legt Kolja die Optionen vor (Quick-Fix akzeptieren / als v2-Risiko dokumentieren / eigene Folge-Phase). Die Phase wird nicht still blockiert.

### Bug-Fix-Welle — Verifikation

- **D-03:** Pipeline-/Matcher-Bugs verifiziert durch **doppelten Nachweis**: betroffener Eval-Korpus läuft grün UND bug-spezifischer Reproducer (z. B. `scripts/smoke-pipeline-with-extractor.ts --token {session_token}`) zeigt den Bug weg.
- **D-04:** UI-/Rendering-/UX-Bugs verifiziert durch **Playwright-Smoke pro UI-Fix** auf dem betroffenen Critical-Path (Playwright ist in WSL konfiguriert, headless Chromium). Es gibt keinen Eval-Korpus für UI.
- **D-08:** Eval-Kosten-Steuerung: Während des Fixens läuft nur ein **gezieltes Subset** (betroffene Korpus-Einträge + neuer UAT-Test-Case). Der **volle `pipeline-korpus`-Lauf** (~3–4 EUR, ~60–75 Min, Phase-5-CONTEXT D-01) genau **einmal pro konsolidierter Welle** als Gate.

### Bug-Fix-Welle — Git-Workflow

- **D-05:** Branch = Fixes committen weiter auf **`feature/wizard-adaptive`** (bestehender Phase-Branch, HEAD `49a1102`). Kein eigener Branch — UAT testet genau diesen Stand, kein Merge-Drift. Production-Migration nach `main` bleibt v2 (PROD-03).
- **D-06:** Commit-Granularität = **ein atomarer Commit pro Bug-ID** (z. B. `fix(uat): Bug #3 Finanzplan-Tarif-Halluzination`) mit Verweis auf den Befunde-Tracker. Saubere Reverts/Bisects.
- **D-07:** Fix-Review = das grüne Eval-Gate (D-03/D-04) ist das automatische Gate. Kolja reviewt die gesammelten Fixes einer Welle **gebündelt am Wellen-Ende** (ein Checkpoint pro Welle), nicht pro einzelnem Bug.

### Plan-Struktur (Real-World-Abhängigkeit)

- **D-09:** Plan-Form = **Framework-Plan + checkpoint-getriggerte Fix-Wellen**. Ein Plan für das Setup; jede UAT-Session ist ein **manueller Checkpoint** — GSD pausiert, Kolja führt die Session und füllt den Tracker, gibt die Befunde rein, GSD fährt mit der Fix-Welle fort.
- **D-10:** Session-Zahl = **Minimum 3, Ziel 5**. Phase 6 ist abschließbar sobald 3 dokumentierte Sessions vorliegen; 4 und 5 sind Bonus. Unter 3 (nach echtem Recruiting-Bemühen) bleibt die Phase offen.
- **D-11:** Befunde-Input = **ausgefüllter Befunde-Tracker als Datei**. Kolja füllt pro Session `UAT-BEFUNDE-{datum}-{pilot}.md` (Template existiert) und legt sie in `.planning/uat/` ab; GSD liest am Fix-Wellen-Checkpoint alle Tracker und leitet die Fix-Tasks daraus ab.
- **D-12:** Setup = **kleiner Wave-1-Setup-Plan mit Helper-Skripten** — DB-Snapshot-Skript (`SELECT … WHERE updated_at > session-start` als JSON), Session-Token-Abfrage, Pre-Session-Checklisten-Runner. Macht jede Session reproduzierbar statt manuelles SQL.
- **D-13:** Artefakt-Archiv = **Befunde-Tracker im Repo, Rohdaten außerhalb**. `UAT-BEFUNDE-*.md` kommen nach `.planning/uat/` ins Git — anonymisiert, **Pilot-Code statt Klarname**. Recordings + DB-Snapshots + Antrag-Roh-Outputs bleiben außerhalb in `~/edufunds-uat/` (nicht versioniert, Datenschutz); der Tracker referenziert nur die Pfade.
- **D-14:** Lange Pause = Phase 6 bleibt formal **„in progress"** über Kalenderwochen. Zwischen Sessions schreibt GSD einen `.continue-here`/STATE-Stand; Wiederaufnahme mit „weiter mit Phase 6". Kein Phasen-Abschluss-Druck während der laufenden UATs.
- **D-15:** **Vorbedingungs-Gate als erster Plan-Task** — Ist-Stand-Check, welche Critical-Path-Features tatsächlich live sind. Das `UAT-PLAN-TEMPLATE.md` setzt Features voraus, die laut REQUIREMENTS-Traceability noch „Pending" sind (Phase-2-Matcher-Begründungen `passt_weil`/`achtung_bei` + Klärungsfrage = MATCH-02/03; UI-01..04 inkl. 7-Stage-`GeneratingProgress`, Empty-States). Fehlende Features werden entweder kurz nachgezogen ODER die UAT-Beobachtungsliste wird explizit auf den realen Ist-Stand reduziert. Verhindert, dass Piloten gegen unfertige UI laufen.

### Befunde → Eval-Integration

- **D-17:** Korpus-Routing **nach Bug-Typ**: Matcher-/Begründungs-/Klärungs-Bugs → `data/eval/matcher-korpus.json`; Pipeline-/Halluzinations-/Finanzplan-/Abschnitts-Bugs → `data/eval/pipeline-korpus.json`; reine UI-Bugs → Playwright-Smoke statt Korpus-Eintrag.
- **D-18:** Eval-Timing = **Test-Case vor Fix (rot→grün)**. Der Korpus-Eintrag wird zuerst geschrieben — er reproduziert den Bug und schlägt fehl (rot) — dann der Fix, dann läuft derselbe Eintrag grün. Echter Nachweis, dass der Test den Bug wirklich fängt.
- **D-25:** Baseline/CI = nach der letzten Fix-Welle ein **Phase-6-Eintrag in `data/eval/BASELINE.md`** (Datum, Score, Korpus-Größe inkl. neuer UAT-Cases) + **Pflicht-Re-Run des CI-Eval-Gates** (`.github/workflows/pipeline-eval.yml`). Konsistent mit Phase 1/5.

### Abschluss-Memo (Pilot-UAT-Retro)

- **D-19:** Abschluss-Memo lebt im Repo als **`.planning/uat/PILOT-UAT-RETRO.md`** (strukturiertes Markdown neben den Trackern). Inhalt: Readiness-Einstufung pro Pilot, verbleibende Lücken, v2-Liste, Eval-Korpus-Delta. Versioniert, von `gsd-verifier` prüfbar, Teil des Phasen-Abschluss-Commits.
- **D-20:** Readiness-Kriterien-Set — ein Pilot gilt als bereit für „Antrag wirklich einreichen", wenn **alle drei** erfüllt und im Retro dokumentiert sind: (1) Critical-Path ohne Hilfe durchgeklickt, (2) sein Antrag-Output war halluzinations-frei + programmkonform (siehe D-23), (3) er hat im Abschlussgespräch Interesse an echter Einreichung signalisiert.

### UAT-Umgebung

- **D-21:** Sessions laufen auf **lokalem Dev** — `npm run dev` auf Port 3101, Dev-Mock-Paywall (`NEXT_PUBLIC_PAYWALL_DEV_MOCK=1`); der Pilot klickt via **Screen-Sharing** auf Koljas geteiltem Bildschirm. Kein Deploy nötig; volle Beobachtung + Live-Mitschrift; sofort reproduzierbar. Das `UAT-PLAN-TEMPLATE.md` ist bereits darauf ausgelegt.

### Datenschutz bei echten Schul-Daten

- **D-22:** **Fiktive Daten als Default**. Das Begrüßungs-/Datenschutz-Skript wird so angepasst, dass Piloten aktiv empfohlen wird, fiktive Schul-Daten (Name, Schülerzahl, Ort erfunden) zu nutzen. Echte Daten nur, wenn der Pilot ausdrücklich will + bestätigt. Umgeht das noch undokumentierte DeepSeek-AVV als UAT-Blocker.

### Antrag-Qualität & Programm-Abdeckung

- **D-23:** Antrag-Qualitäts-Bewertung = **Post-Session-Abgleich gegen das Dossier**. Nach jeder Session prüft GSD/Claude das Antrag-Output aus dem DB-Snapshot gegen das Programm-Dossier: Pflichtabschnitt-Coverage + kuratierte Halluzinations-Marker (gleiche Metrik wie Phase-5-Eval). Objektiv, reproduzierbar, fließt in den Befunde-Tracker.
- **D-24:** Programm × Schul-Typ-Abdeckung = **weiche Ziel-Matrix, opportunistisch gefüllt**. Der Plan definiert eine Wunsch-Abdeckung (mind. 1 öffentliches Programm + 1 Stiftungs-/EU-Programm, mind. 2 Schul-Typen) als Orientierung; Kolja füllt sie mit real verfügbaren Piloten. Verfehlte Zellen werden im Retro als Lücke vermerkt, blockieren aber nicht.

### Claude's Discretion

- Konkrete Reproducer-Skript-Aufrufe, Subset-Auswahl im Eval-Korpus und die genaue Aufteilung der Fix-Tasks pro Welle liegen beim Planner/Executor — gebunden an D-03/D-04/D-08.
- Form der Helper-Skripte aus D-12 (Sprache, CLI-Flags) frei, solange jede Session reproduzierbar wird.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-Definition & Requirements
- `.planning/ROADMAP.md` — Phase 6 Goal + 5 Success Criteria (Abschnitt „Phase 6: Live-UAT mit Pilot-Schulen")
- `.planning/REQUIREMENTS.md` — UAT-01, UAT-02, UAT-03 (Abschnitt „Live-UAT"); zusätzlich Traceability-Tabelle für den D-15-Vorbedingungs-Check (Phase-2- + UI-01..04-Status)
- `.planning/phases/05-wizard-pipeline-tuning-ux-l-cke/05-CONTEXT.md` — Phase-5-Eval-Strategie, Kosten/Laufzeit eines Korpus-Laufs (D-01)

### UAT-Templates (aus Phase 02.1, fertig — Phase 6 nutzt + füllt sie)
- `.planning/uat/UAT-PLAN-TEMPLATE.md` — Session-Ablauf, Critical-Paths-Beobachtungsliste, Begrüßungs-/Datenschutz-Skript (wird per D-22 angepasst)
- `.planning/uat/UAT-BEFUNDE-TEMPLATE.md` — Schema für Bug-/UX-/Pipeline-Findings pro Session (D-11)
- `.planning/uat/PILOTEN.md` — Pilot-Kandidaten-Schema (Kolja füllt Namen; Auswahl-Kriterien relevant für D-24)
- `.planning/uat/UAT-ANSCHREIBEN.md` — Onboarding-Mail-Vorlagen Du-/Sie-Form + Follow-Up

### Eval-Apparat (zu erweitern um UAT-Cases)
- `data/eval/pipeline-korpus.json` — Pipeline-Eval-Korpus (D-17 Ziel für Pipeline-Bugs)
- `data/eval/matcher-korpus.json` — Matcher-Eval-Korpus (D-17 Ziel für Matcher-Bugs)
- `data/eval/BASELINE.md` — Eval-Baseline-Historie Phase 1 + 5 (D-25 Phase-6-Eintrag hier)
- `scripts/eval-pipeline.ts` / `scripts/eval-matcher.ts` — Eval-Skripte (Replay/Live-Modus)
- `scripts/smoke-pipeline-with-extractor.ts` — bug-spezifischer Reproducer (D-03)
- `.github/workflows/pipeline-eval.yml` — CI-Eval-Gate (D-25 Re-Run)

### Vorbild-Pattern
- `~/.claude/projects/-home-kolja/memory/edufunds-uat-pipeline-befunde-2026-04-28.md` — Vorbild-Befunde-Memo der 28.–30.04.-Fix-Welle; Tracker- und Hebel-Status-Pattern, an dem sich UAT-02/UAT-03 orientieren

### Codebase-Maps
- `.planning/codebase/ARCHITECTURE.md`, `STRUCTURE.md`, `TESTING.md`, `CONCERNS.md` — für Fix-Welle relevante Bereiche, je nach Bug-Typ
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Eval-Apparat (Phase 1 + 5):** `scripts/eval-pipeline.ts` / `eval-matcher.ts` + versionierte Korpora — direkt nutzbar für die rot→grün-Test-Cases (D-18) und das Gate (D-08).
- **Smoke-Suite:** `scripts/smoke-pipeline-with-extractor.ts` (+ `-models`, `-rerun`) — Reproducer-Basis pro Bug (D-03).
- **UAT-Templates:** vollständige `.planning/uat/`-Template-Sammlung aus Phase 02.1 — kein Neu-Erstellen, nur Anpassen (D-22) und Instanziieren (D-11).
- **Playwright (WSL):** konfiguriert, headless Chromium — Basis für UI-Fix-Verifikation (D-04).
- **CI-Gate:** `.github/workflows/pipeline-eval.yml` — Phase-6-Korpus-Erweiterung wird automatisch mitgenommen, Re-Run per D-25.

### Established Patterns
- **Eval-First (Phase 1 + 5):** jeder Qualitäts-Fix braucht einen Korpus-Anker — Phase 6 setzt das mit rot→grün pro UAT-Bug fort (D-18).
- **Pipeline-Eval-Metrik (Phase 5):** Pflichtabschnitt-Coverage + kuratierte Halluzinations-Marker — exakt diese Metrik dient der Post-Session-Antrag-Bewertung (D-23).
- **Atomare Conventional Commits, deutsche Subject-Line** — fortgesetzt mit `fix(uat): Bug #N …` (D-06).

### Integration Points
- Fix-Welle berührt je nach Bug `lib/wizard/pipeline.ts`, `lib/wizard/matcher.ts`, `lib/wizard/prompts.ts` und das Frontend unter `app/antrag/` — konkrete Dateien erst nach den UAT-Befunden bekannt.
- Helper-Skripte (D-12) docken an PostgreSQL (`pg`, kein ORM) und die Session-Persistenz (`session_token`, Tabelle `ki_antraege`) an.
</code_context>

<specifics>
## Specific Ideas

- Vorbild für Tracker, Bug-IDs und Pipeline-Hebel-Status ist explizit das 28.04.-Befunde-Memo — UAT-02/UAT-03 orientieren sich am dortigen Detailgrad (konkretes Symptom mit Zahlen, strukturelle Ursache, Fix-Richtung, Reproducer, Verifikation).
- UAT-Sessions: 45 Min, Screen-Sharing, „Think-aloud", Moderator schweigt außer bei Komplett-Blockade — Ablauf steht im `UAT-PLAN-TEMPLATE.md`.
</specifics>

<deferred>
## Deferred Ideas

- **DeepSeek-AVV-Dokumentation** — für Live-Produktion vor Schul-Onboarding nötig (PROJECT.md Constraints). In Phase 6 durch fiktive-Daten-Default (D-22) umgangen, nicht gelöst. Gehört in die Vor-Production-Phase (v2).
- **Production-Migration nach `main` + Deploy** (PROD-01/02/03) — bleibt v2; Phase 6 testet bewusst den `feature/wizard-adaptive`-Stand lokal.
- ~~**Staging-Deploy des Wizard-Branch**~~ — ursprünglich zugunsten lokalem Dev verworfen (D-21); durch den Async-UAT-Pivot **wieder in Scope** (D-26). Selbstbedienungs-Pilot-Test ist jetzt das gewählte Modell.
- **Phase-2-Closure (MATCH-02/03) + UI-01..04** — falls das Vorbedingungs-Gate (D-15) entscheidet, fehlende Features NICHT nachzuziehen, bleiben diese Requirements offen und müssen separat eingeplant werden.

### Offenes Risiko
- Die REQUIREMENTS-Traceability zeigt MATCH-02/03 und UI-01..04 als „Pending", während die ROADMAP die Phase-02.1-Plans als `[x]` führt — Widerspruch. D-15 macht den realen Feature-Stand zum ersten Plan-Task; bis dahin ist unklar, ob das UAT-Template-Szenario vollständig live ist.
</deferred>

---

*Phase: 6-live-uat-mit-pilot-schulen*
*Context gathered: 2026-05-20*
