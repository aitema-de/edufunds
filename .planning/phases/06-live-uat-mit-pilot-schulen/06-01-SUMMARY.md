---
phase: 06-live-uat-mit-pilot-schulen
plan: "01"
subsystem: uat-infrastruktur
tags: [uat, setup, infrastruktur, d-12, d-15, d-22]
dependency_graph:
  requires: []
  provides: [IST-STAND-CHECK, UAT-Helper-Skripte, fiktive-Daten-Default]
  affects: [UAT-Plan-Template, UAT-Session-Setup]
tech_stack:
  added: []
  patterns: [pg.Client + DATABASE_URL-Regex, AbortSignal.timeout, Checklist-Runner [i/N]]
key_files:
  created:
    - .planning/uat/IST-STAND-CHECK.md
    - scripts/uat-db-snapshot.ts
    - scripts/uat-session-token.ts
    - scripts/uat-pre-session-check.ts
  modified:
    - .planning/uat/UAT-PLAN-TEMPLATE.md
decisions:
  - D-15 Gate bestätigt: alle 6 Critical-Path-Features (MATCH-02/03, UI-01..04) sind live auf feature/wizard-adaptive HEAD — keine UAT-Beobachtungslisten-Reduktion nötig
  - D-22 umgesetzt: fiktive Daten als Default in Begrüßungs-Skript + Datenschutz-Block, AVV-Begründung als Template-Kommentar
  - REQUIREMENTS.md-Traceability veraltet: MATCH-02/03 + UI-01..04 als Pending eingetragen obwohl implementiert — Dokumentationslücke, kein Feature-Mangel
metrics:
  duration_minutes: 30
  completed_date: "2026-05-20"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 5
---

# Phase 6 Plan 01: UAT-Infrastruktur — Vorbedingungs-Gate + Helper-Skripte Summary

**One-liner:** D-15-Gate (alle 6 Features live), D-22-Datenschutz-Default (fiktive Daten), D-12-Helper-Skripte (DB-Snapshot, Session-Token, Pre-Session-Check) — UAT-Setup jetzt reproduzierbar und dokumentiert.

---

## Ausgeführte Tasks

| Task | Name | Commit | Schlüssel-Dateien |
|------|------|--------|-------------------|
| 1 | Vorbedingungs-Gate IST-STAND-CHECK.md | d846d52 | .planning/uat/IST-STAND-CHECK.md |
| 2 | UAT-PLAN-TEMPLATE D-22 fiktive Daten | 0f84e84 | .planning/uat/UAT-PLAN-TEMPLATE.md |
| 3 | Drei UAT-Helper-Skripte | c681926 | scripts/uat-db-snapshot.ts, scripts/uat-session-token.ts, scripts/uat-pre-session-check.ts |

---

## Entscheidungen (Key Decisions)

### D-15 Gate-Ergebnis: Alle Features live
Code-Inspektion von 8 Quelldateien zeigt:
- **MATCH-02** (strukturierte Begründung): `matcher.ts:149–156` (MatchHit-Interface) + `MatchResultList.tsx:110–128` (grüner/oranger Block). Live.
- **MATCH-03** (Klärungsfrage): `matcher.ts:479–483` (CLARIFY-Dispatch) + `ClarificationCard.tsx`. Live.
- **UI-01** (h2-Anker + Sidebar + Edit-Button): `AntragSectionNav.tsx` + `AntragResult.tsx:38–67`. Live.
- **UI-02** (Empty-States): `MyAntraegeClient.tsx:133–151` + `MatchResultList.tsx:39–65`. Live.
- **UI-03** (Mobile Touch-Targets): `MatchResultList.tsx:141` + `QuestionCard.tsx:68` (sm:py-3). Live.
- **UI-04** (7-Stage + Retry): `GeneratingProgress.tsx:13–21` + `WizardShell.tsx:502–512`. Live.

**UAT-Konsequenz:** Beobachtungsliste bleibt vollständig. Keine Reduktion.

### REQUIREMENTS.md-Traceability-Widerspruch aufgelöst
REQUIREMENTS.md zeigt MATCH-02/03 + UI-01..04 als „Pending" (letzter Update 2026-05-06). Code ist aber vollständig. Das ist eine reine Dokumentationslücke. Nicht-blockierend für UAT — empfohlener chore-Commit nach Phase-6-Abschluss.

### D-22 Datenschutz-Default
Fiktive Daten als Pflicht-Empfehlung im Begrüßungs-Skript und im Datenschutz-Block verankert. Begründung: undokumentiertes DeepSeek-AVV als Blocker für echte Schuldaten im Testbetrieb — fiktive Daten umgehen das vollständig.

---

## Deviations from Plan

Keine Abweichungen. Plan exakt wie beschrieben ausgeführt.

---

## Known Stubs

Keine. Alle drei Skripte sind voll funktionsfähig (TypeScript 0 Fehler). Einschränkung: `uat-pre-session-check.ts` Schritt 2 (Dev-Server-Check) setzt voraus, dass `npm run dev` manuell gestartet wurde — das ist by design und in der Script-Ausgabe dokumentiert.

---

## Threat Surface Scan

Keine neuen Netzwerkendpunkte oder Auth-Pfade eingeführt. Lokale Skripte ohne öffentliche Exposition.

Bestehende Threat-Model-Mitigationen (T-06-01-01 + T-06-01-02) umgesetzt:
- T-06-01-01: DATABASE_URL wird in keinem der drei Skripte geloggt (nur Tabellen-Spaltenwerte auf stdout).
- T-06-01-02: tmp/ ist in .gitignore (Zeile 32 bestätigt) — Snapshot-JSON bleibt außerhalb git.

---

## Self-Check

Ergebnisse der Datei- und Commit-Verifikation:

```
FOUND: .planning/uat/IST-STAND-CHECK.md          ✓
FOUND: scripts/uat-db-snapshot.ts                ✓
FOUND: scripts/uat-session-token.ts              ✓
FOUND: scripts/uat-pre-session-check.ts          ✓
FOUND: d846d52 (IST-STAND-CHECK commit)          ✓
FOUND: 0f84e84 (UAT-PLAN-TEMPLATE commit)        ✓
FOUND: c681926 (Helper-Skripte commit)           ✓
TypeScript: 0 error TS                            ✓
```

## Self-Check: PASSED
