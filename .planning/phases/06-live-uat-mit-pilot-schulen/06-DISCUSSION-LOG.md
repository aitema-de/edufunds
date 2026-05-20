# Phase 6: Live-UAT mit Pilot-Schulen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 6-live-uat-mit-pilot-schulen
**Areas discussed:** Fix-Welle-Timing & Severity, Plan-Struktur, Befunde→Eval + Abschluss-Memo, UAT-Umgebung, Datenschutz, Antrag-Qualität & Coverage

---

## Fix-Welle-Timing & Severity

### Fix-Timing
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Hybrid: Blocker rolling, Rest konsolidiert | Blocker sofort zwischen Sessions, Rest gesammelt | ✓ |
| Strikt konsolidiert | Alle Befunde erst, dann eine Welle | |
| Voll rolling | Nach jeder Session sofort fixen | |

### Fix-Scope (Severity-Schwelle)
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Hoch + Mittel fixen, Niedrig defer-fähig | Hoch+Mittel Pflicht, Niedrig explizit deferbar | ✓ |
| Nur Hoch fixen | Mittel+Niedrig in v2-Backlog | |
| Alles fixen | Jeder Bug egal Severity | |

### Fix-Verifikation (Pipeline/Matcher)
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Eval-Re-Run + gezielter Reproducer | Korpus grün + bug-spezifischer Smoke | ✓ |
| Nur Eval-Korpus grün | Korpus genügt | |
| Eval grün + Re-Test in Folge-UAT | Zusätzlich echte Session | |

### Branch
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Weiter auf feature/wizard-adaptive | Bestehender Phase-Branch | ✓ |
| Eigener Branch phase-06-uat-fixes | Isolierte Phase-6-Diff | |

### Commit-Granularität
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Ein Commit pro Bug-ID | Atomar je Befund | ✓ |
| Ein Commit pro Session-Welle | Gebündelt | |
| Du entscheidest beim Ausführen | Executor-Discretion | |

### Fix-Review
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Eval-Gate genügt, Kolja reviewt am Wellen-Ende | Bündel-Review pro Welle | ✓ |
| Kolja-Checkpoint pro Bug | Einzelfreigabe | |
| Voll autonom, kein Review | Kein Kolja-Review | |

### Eval-Kosten
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Voll-Lauf einmal pro Welle, sonst Subset | Subset beim Fixen, Voll am Wellen-Ende | ✓ |
| Voll-Lauf nach jedem Fix | Maximale Sicherheit, teuer | |
| Nur Subset, kein Voll-Lauf | Billigste Variante | |

### UI-Fix-Verifikation
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Playwright-Smoke pro UI-Fix | Automatisierter Critical-Path-Smoke | ✓ |
| Manueller Browser-Re-Test durch Kolja | Screenshot-Vergleich | |
| Playwright nur für Critical-Path-Bugs | Kleine UI-Bugs nur manuell | |

**Notes:** Kolja bestätigte den Wunsch nach erschöpfender Abdeckung der Fix-Welle (8 Fragen statt 4) — „hast du noch offene Fragen, dann arbeiten wir die gerne ab".

---

## Plan-Struktur bei Real-World-Abhängigkeit

### Plan-Form
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Framework-Plan + checkpoint-getriggerte Fix-Wellen | Setup-Plan + manuelle Session-Checkpoints | ✓ |
| Zwei getrennte Phasen | 6a manuell, 6b GSD-ausführbar | |
| Ein Plan pro Session-Slot | 5 Plan-Dateien | |

### Session-Zahl
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Minimum 3, Ziel 5, Phase schließt ab 3 | Flexibel mit Untergrenze | ✓ |
| Strikt 5 | Phase erst bei 5 zu | |
| Flexibel, du entscheidest beim Checkpoint | Keine feste Zahl | |

### Befunde-Input
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Ausgefüllter Befunde-Tracker als Datei | Kolja füllt Template, GSD liest | ✓ |
| Freitext-Mitschrift, GSD strukturiert | Rohnotizen, GSD ordnet | |
| Session-Recording + DB-Snapshot, GSD analysiert | GSD analysiert Output | |

### Setup
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Kleiner Setup-Plan mit Helper-Skripten | DB-Snapshot/Token/Checklisten-Skripte | ✓ |
| Keine Skripte, Templates genügen | Manuelles SQL | |
| Du entscheidest beim Planen | Planner-Discretion | |

### Artefakt-Archiv
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Befunde-Tracker im Repo, Rohdaten außerhalb | .md ins Git, Recordings/Snapshots in ~/edufunds-uat/ | ✓ |
| Alles ins Repo | Auch personenbezogene Daten versioniert | |
| Alles außerhalb des Repos | Git frei von UAT-Daten | |

### Lange Pause
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Phase bleibt offen, Resume per .continue-here | „in progress" über Wochen | ✓ |
| Jede Session als Mini-Execute-Lauf | /gsd-execute-phase pro Session | |
| Du entscheidest beim Planen | Planner-Discretion | |

### Vorbedingung
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Vorbedingungs-Gate als erster Plan-Task | Ist-Stand-Check Critical-Path-Features | ✓ |
| Beobachtungsliste auf Ist-Stand reduzieren | Template an reale Features anpassen | |
| Ignorieren — Stand ist gut genug | Annahme: Traceability veraltet | |

### Unfixbarer Hoch-Bug
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Eskalations-Checkpoint, du entscheidest | GSD legt Optionen vor | ✓ |
| Hoch-Bug blockiert immer | Kein Defer für Hoch | |
| Defer erlaubt, wenn dokumentiert | Executor entscheidet | |

---

## Befunde→Eval + Abschluss-Memo

### Korpus-Ziel
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Nach Bug-Typ routen | matcher- vs pipeline-korpus, UI→Playwright | ✓ |
| Alles in pipeline-korpus.json | Ein Ort | |
| Eigener UAT-Korpus | Neue Datei uat-korpus.json | |

### Eval-Timing
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Test-Case vor Fix (rot→grün) | Erst roter Test, dann Fix | ✓ |
| Test-Case nach Fix als Batch | Gebündelt am Wellen-Ende | |
| Du entscheidest pro Bug | Executor-Discretion | |

### Memo-Ort
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Im Repo: .planning/uat/PILOT-UAT-RETRO.md | Versioniertes Markdown | ✓ |
| In die Projekt-Memory | edufunds-pilot-uat-retro-{datum}.md | |
| Beides | Repo + Memory-Pointer | |

### Readiness-Kriterien
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Kriterien-Set: Durchklick + Antrag-Qualität + Pilot-Bereitschaft | Drei dokumentierte Kriterien | ✓ |
| Nur Pilot-Selbsteinschätzung | Pilot sagt selbst | |
| Du legst Kriterien im Memo selbst fest | Freie Einstufung | |

### Baseline/CI
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Neuer BASELINE.md-Eintrag + CI-Gate-Re-Run | Phase-6-Eintrag + Re-Run | ✓ |
| Nur Korpus erweitern, keine Baseline-Doku | CI nimmt Einträge automatisch | |
| Du entscheidest beim Planen | Planner-Discretion | |

---

## UAT-Umgebung

| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Lokales Dev + Screen-Share | npm run dev :3101, Dev-Mock | ✓ |
| Wizard-Branch auf Staging deployen | Echte URL, Pilot selbständig | |
| Lokal, aber Pilot steuert per Remote | Remote-Control der lokalen Instanz | |

**Notes:** Diese Grauzone wurde in der Erstauswahl ausgelassen, von Kolja nachträglich („Weitere Grauzonen erkunden") doch zur Diskussion geholt.

---

## Datenschutz bei echten Schul-Daten

| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Fiktive Daten als Default empfehlen | Begrüßungs-Skript empfiehlt aktiv fiktive Daten | ✓ |
| Echte Daten zulassen, Hinweis genügt | Bestehender Datenschutz-Block reicht | |
| Echte Daten verbieten, nur fiktiv | Strikt, kein Realismus | |

---

## Antrag-Qualität & Programm-Abdeckung

### Antrag-Qualitäts-Bewertung
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Post-Session-Abgleich gegen Dossier | DB-Snapshot vs Dossier, Phase-5-Metrik | ✓ |
| Kolja-Live-Urteil in der Session | Augenschein, subjektiv | |
| Beides kombiniert | Live-Eindruck + objektiver Abgleich | |

### Programm × Schul-Typ-Coverage
| Option | Beschreibung | Gewählt |
|--------|--------------|---------|
| Weiche Ziel-Matrix, opportunistisch gefüllt | Wunsch-Abdeckung als Orientierung | ✓ |
| Strikte Matrix vorab | Alle Zellen Pflicht | |
| Rein opportunistisch | Keine Matrix | |

---

## Claude's Discretion

- Konkrete Reproducer-Aufrufe, Eval-Subset-Auswahl und Fix-Task-Aufteilung pro Welle (gebunden an D-03/D-04/D-08).
- Form/Sprache/CLI-Flags der UAT-Helper-Skripte (D-12).

## Deferred Ideas

- DeepSeek-AVV-Dokumentation → Vor-Production-Phase (v2).
- Production-Migration nach `main` + Deploy (PROD-01/02/03) → v2.
- Staging-Deploy des Wizard-Branch → verworfen zugunsten lokalem Dev; ggf. eigener Schritt für Selbstbedienungs-Tests.
- Phase-2-Closure (MATCH-02/03) + UI-01..04 → falls Vorbedingungs-Gate gegen Nachziehen entscheidet, separat einplanen.
- **Offenes Risiko:** Widerspruch zwischen REQUIREMENTS-Traceability („Pending") und ROADMAP-Phase-02.1-Plans („[x]") — D-15-Gate klärt den realen Feature-Stand.
