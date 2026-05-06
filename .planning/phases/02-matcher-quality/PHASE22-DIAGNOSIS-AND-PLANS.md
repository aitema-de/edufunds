---
phase: 02-matcher-quality
type: diagnosis-and-plan-sketches
audience: phase-22-execute-session
generated: 2026-05-05
gate_status_input: 02-06 GATE FAILED (Recall@3=0.325, Clarif-Prec=75%)
gate_status_target: ≥0.42 / ≥80%
diagnosis_session: prefilter-spike 2026-05-05
---

# Phase 2.2 — Diagnose + Plan-Skizzen

Output des Diagnose-Spikes vom 2026-05-05, der die ursprüngliche 4-Plan-Sequenz aus 02-06-SUMMARY revidiert. Phase 2 ist mechanisch + visuell abgeschlossen (siehe 02-07-SUMMARY); verbleibender Arbeitsauftrag ist Recall@3 + Clarif-Precision auf D-17-Targets bringen.

## Executive Summary

Die ursprüngliche Hypothese war: 4 Tuning-Hebel (Score-Cap, Prefilter-Diagnose, Score≥60-Reformulierung, Eval-Re-Run) — alle vier mit ähnlich offenem Ausgang.

Der Spike hat Klarheit geschaffen: **Die dominante Ursache der 6 Recall-Misses ist ein Prefilter-Cut-Problem in Kombination mit Korpus-Drift**. Score-Cap + Score≥60-Reformulierung waren Symptom-Fixes — sie hätten nichts gebracht, weil der LLM die domain-spezifischen Programme gar nicht im Top-20-Pipe-Cut zu sehen bekommt.

**Revidierte Plan-Sequenz: 02-08 → 02-09 → 02-10 → 02-11** (ähnliche Anzahl, andere Inhalte).

## Diagnose-Befunde

### Befund 1: 17 von 18 expected_top3-IDs nicht im Top-20-Cut

Konkrete Pipe-Cut-Analyse für die 6 Recall-Misses (ev-004, ev-011, ev-012, ev-013, ev-015, ev-018):

| Miss | BL-Filter | Pool nach Prefilter | Davon expected_top3 im Top-20 |
|------|-----------|---------------------|--------------------------------|
| ev-004 (Forscher-AG Bayern) | DE-BY | 88 Programme | 0/3 |
| ev-011 (Maker-Space Sachsen) | DE-SN | 91 | 0/3 |
| ev-012 (Bewegungs-Pausenhof Niedersachsen) | DE-NI | 86 | 0/3 |
| ev-013 (Mathe-Wettbewerbe Gymnasium) | — | 131 | 0/3 |
| ev-015 (Schul-Aquarium NABU) | — | 131 | 0/3 |
| ev-018 (Migration Berlin) | DE-BE | 87 | 1/3 (`berlin-startchancen` Pos 4) |

Score-Sortierung in der Queue belohnt bundesweite Programme + hohe Förderhöhe — bestraft regional/thematisch spezifische, kleinere Programme. `first-lego-league` z.B. steht auf Position 81 von 81 (allerletzte) mit Score 12.

### Befund 2: 11 expected_top3-IDs sind kiAntragGeeignet=false und haben kein Dossier

| ID | im Korpus expected für | Status |
|----|------------------------|--------|
| stiftung-kinder-forschen | ev-004, ev-015 | kiAntragGeeignet=false, kein dossier |
| helmholtz-schuelerlabore | ev-004 | gleich |
| stifterverband-bildung | ev-004 | gleich |
| kaenguru-der-mathematik | ev-013 | gleich |
| mathe-im-advent | ev-013 | gleich |
| bundeswettbewerb-mathematik | ev-013 | gleich |
| nabu-schulen | ev-015 | gleich |
| bfn-artenvielfalt | ev-015 | gleich |
| dkjs-sport | ev-012 | gleich |
| dkjs-inklusion | ev-018 | gleich |
| mercator-integration | ev-018 | gleich |

Diese Programme stehen nicht in `data/richtlinien-prioritaeten.json` und sind beim Cleanup 27.04. (Commit `a2cf838`) als nicht-prioritär markiert worden — sind aber im Eval-Korpus geblieben. Sie sind **strukturell nicht durch den Wizard bedienbar** (kein Dossier mit Pflichtabschnitten + Förderbedingungen) und sollten daher nicht als "erwartete Treffer" gelten.

### Befund 3: thematische Spezifität nicht in Score-Formel

Die aktuelle Queue-Score-Formel ist statisch:
```
log10(maxEur)*10 + BLs*2 + Typ-Bonus + min(kategorien,5)*2 + min(schulformen,5)*2
```

Sie bevorzugt strukturell:
- Bundesweite Programme vs. Landesprogramme
- Hohe Förderhöhe vs. kleine
- Vielseitige Kategorien vs. spezifische

Was sie nicht abbildet: thematische Passung zum konkreten Anliegen. Bei "Mathe-Wettbewerbe" wäre die Logik "Programme mit `mathematik`/`wettbewerb` in `kategorien` bekommen Anliegen-spezifischen Boost" — aber die Sortierung ist Anliegen-unabhängig.

### Befund 4: ev-011 Datenqualitäts-Problem — schulformen vermutlich falsch annotiert

Bei der Sachsen-Oberschule-MINT-Maker-Anfrage gibt es 18 thematisch passende `kiAntragGeeignet=true` Programme — aber **alle** sind als `schulformen=['grundschule']` annotiert (vermutlich Default beim Dossier-Extraktions-Lauf). Das ist ein Daten-Qualitäts-Problem, separat von der Matcher-Logik. **Out-of-Scope für Phase 2.2** — eigener Cleanup-Cycle.

## Korpus-Kalibrierung — Konkrete Vorschläge pro Miss

Diese Vorschläge ersetzen 11 nicht-`kiAntragGeeignet`-IDs durch passende `kiAntragGeeignet=true` Alternativen. **Manueller Checkpoint in Plan 02-08 — User-Kuratierung erforderlich.**

| Miss | Alt (entfernen) | Neu (Top-3 Vorschlag) | Notizen |
|------|-----------------|----------------------|---------|
| **ev-004** Forscher-AG MINT, Grundschule Bayern | stiftung-kinder-forschen, helmholtz-schuelerlabore, stifterverband-bildung | chemie-fonds, ruetgers-stiftung-mint, mintspace-schulpreis | jugend-forscht-schulpreis als Alternative-4 |
| **ev-011** Maker-Space MINT, Oberschule Sachsen | first-lego-league, siemens-stiftung-mint-hub, telekom-stiftung-technik-scouts (alle drei sind kiAntragGeeignet=true, aber Score zu niedrig) | (siehe Befund 4 — schulformen-Daten-Problem) | **Edge-Case-Kandidat** (`expected_top3=[]`) ODER Schulformen-Daten-Cleanup |
| **ev-012** Bewegungs-Pausenhof, Grundschule Niedersachsen | dkjs-sport (raus, kiAntragGeeignet=false) | niedersachsen-sport (bleibt!), baywa-laufen-wald (bleibt!), aok-gesundheit (neu) | Ist dkjs-sport raus, sind 2 von 3 erwarteten ohnehin schon in Queue, brauchen aber Score-Fix |
| **ev-013** Mathe-Wettbewerbe, Gymnasium | alle 3 (kaenguru-der-mathematik, mathe-im-advent, bundeswettbewerb-mathematik) raus | nur ferry-porsche-challenge schwacher Treffer | **Edge-Case-Kandidat** (`expected_top3=[]`) ODER Anliegen umformulieren |
| **ev-015** Schul-Aquarium NABU, Grundschule | nabu-schulen, bfn-artenvielfalt, stiftung-kinder-forschen | baywa-waldschule, berdelle-naturwissenschaft, baywa-opflanzt | klimalab-2026 als Alternative-4 |
| **ev-018** Migration+Förderbedarf, Grundschule Berlin | dkjs-inklusion, mercator-integration | aktion-mensch-schulkooperation, berlin-startchancen (bleibt!), playmobil-hobpreis | Achtung: aktion-mensch ist im Korpus aktuell expected_off_target für ev-016/-019/-024 — bei ev-018 aber legitim (Inklusion-Bezug) |

**Kuratur-Entscheidungen für Plan 02-08:**
1. ev-011 + ev-013: Edge-Case markieren ODER Korpus-Eintrag umformulieren?
2. ev-018: aktion-mensch als legitimen Treffer für Inklusions-Anliegen aufnehmen, oder strenger als off_target halten?
3. Welche der vorgeschlagenen Top-3 sind tatsächlich realistisch (User hat Domain-Wissen)?

## Plan-Skizzen 02-08 bis 02-11

### Plan 02-08: Korpus-Kalibrierung

**Tasks:**
1. **Manual Checkpoint:** User-Kuratur der 6 Miss-Einträge (Tabelle oben durchgehen, Top-3 oder Edge-Case je Eintrag entscheiden)
2. **Auto:** `data/eval/matcher-korpus.json` aktualisieren mit kuratierten `expected_top3`
3. **Auto:** Bei Edge-Case-Markierung `expected_top3=[]` setzen + Notiz im `notes`-Feld
4. **Auto:** `notes`-Feld jedes geänderten Eintrags um Kalibrierungs-Begründung ergänzen ("2026-05-05: kalibriert auf kiAntragGeeignet=true Set, ursprüngliche IDs ohne Dossier entfernt")
5. **Auto:** Parser-Sanity-Check via existierendem `loadKorpusAndValidate` (sollte alle IDs valide finden)

**Acceptance:**
- Korpus enthält keine `expected_top3`-IDs mit `kiAntragGeeignet=false`
- Edge-Cases (`expected_top3=[]`) sind im `notes`-Feld begründet
- `npm run eval:matcher --replay <vorhandener-snapshot-dir>` läuft durch (nicht gegen neuen Stand, nur Schema-Check)

**Tags:** korpus-kalibrierung, manual-checkpoint, dependency-on-spike

### Plan 02-09: Top-N erhöhen + Score-Formel mit Theme-Boost

**Tasks:**
1. **Auto:** `lib/wizard/matcher.ts` — `MAX_LLM_CANDIDATES` von 20 auf 40 (oder 50, kostenrechnerisch checken)
2. **Auto:** Anliegen-spezifische Theme-Score-Berechnung in `matcher.ts` als zweite Sortier-Achse hinzufügen (vor Top-N-Cut):
   - Tokenize Anliegen → Keyword-Set
   - Pro Programm: Schnittmenge mit `kategorien` × Theme-Boost-Faktor
   - Final-Score = Queue-Score + Theme-Boost (z.B. Theme-Hit × 30)
3. **Auto:** Pricing-Check (40 Programme × ~50 Tokens ≈ 2k Tokens extra im Prompt — Kosten + Latenz neu messen via `scripts/smoke-llm-large.ts`)
4. **Auto:** `data/richtlinien-prioritaeten.json` ggf. um die 6 thematisch wichtigen IDs ergänzen, die aktuell schon `kiAntragGeeignet=true` sind, aber niedrigen Queue-Score haben (`niedersachsen-sport`, `baywa-laufen-wald`, `first-lego-league`, etc.) — Score-Boost manuell für die Korpus-validierten IDs

**Acceptance:**
- Top-Cut zeigt ≥2/3 expected_top3 für jeden der 5 nicht-Edge-Misses (ev-013 ausgenommen, falls Edge-Case)
- Latenz-Anstieg ≤ 30 % (von 2s → max 2.6s)
- Kosten pro Match ≤ 0.06 ¢ (von 0.04 ¢)

**Tags:** prefilter-tuning, theme-score, latency-control

### Plan 02-10: Score-Cap für Drift-Defaults (übernommen aus ursprünglicher Sequenz)

**Tasks:**
1. **Auto:** `lib/wizard/matcher.ts` — `MATCHER_SYSTEM`-Prompt um harte Score-Caps erweitern:
   - `aktion-mensch-schulkooperation` Score ≤ 40, wenn kein Inklusions/Förderbedarf-Anker im Anliegen
   - `bmbf-digitalpakt-2` Score ≤ 40, wenn kein Digital/Hardware-Anker
2. **Auto:** Alternativ: Server-Side-Cap im Parser (post-LLM) — sicherer aber weniger flexibel
3. **Auto:** Test-Snapshot erstellen mit dem Live-Eval gegen kalibriertes Korpus (Plan 02-08-Output) — Off-Target-Rate sollte 0 % sein

**Acceptance:**
- ev-016 (Mehrsprachige Bibliothek NRW) zeigt `aktion-mensch` nicht mehr in Top-3
- Off-Target-Rate ≤ 5 % (D-17-Target)

**Tags:** prompt-hardening, drift-prevention

### Plan 02-11: Phase-2.2-Eval-Re-Run

**Tasks:**
1. **Auto:** `npm run eval:matcher -- --snapshot --md-summary` mit kalibriertem Korpus + erweiterten Top-N + Score-Cap
2. **Auto:** `data/eval/BASELINE.md` mit Phase-2.2-Eintrag erweitern (append-only über Phase-2.1)
3. **Auto:** Snapshots + Reports force-add (gitignored)
4. **Manual Checkpoint:** GATE-Status entscheiden:
   - GATE PASSED → Phase 2 inhaltlich abgeschlossen, Phase 3 öffnen
   - GATE FAILED → Phase 2.3 mit weiterer Iteration (selten — bei drittem Fehlschlag Architektur-Frage)

**Acceptance (D-17 Threshold-Gate):**
- Recall@3 ≥ 0.42
- Off-Target-Rate < 5 %
- Clarif-Precision ≥ 80 %
- Clarif-FalschPos ≤ 10 %

**Tags:** eval-rerun, threshold-gate, baseline

## Kosten + Risiko

- **Plan 02-08** ~30 Min (User-Kuratur + Korpus-Edits, kein LLM-Call)
- **Plan 02-09** ~60-90 Min (Code + Smoke-Latency-Check, ~5 Live-LLM-Calls für Validation)
- **Plan 02-10** ~30 Min (Prompt-Edit, kein neuer Eval-Run)
- **Plan 02-11** ~10 Min Wallclock + ~3 ¢ DeepSeek-Kosten (29 Live-Eval-Calls)

**Hauptrisiko:** Plan 02-09 Theme-Score-Bonus könnte Off-Target-Rate erhöhen (Theme-Boost zieht thematisch passende, aber inhaltlich falsche Programme ins Top-3). Mitigation: Plan 02-10 Score-Cap kompensiert das.

**Sekundärrisiko:** ev-011 + ev-013 Edge-Case-Markierung reduziert die Anzahl der Recall-Messungen — wenn dadurch 2 Misses rausfallen, könnte Recall@3 mechanisch über 0.42 kommen, ohne dass tatsächlich was getuned ist. Mitigation: bewusst dokumentieren in BASELINE.md, getrennte Recall-Werte für Voll-Korpus vs. nicht-Edge.

## Reihenfolge / Wave-Struktur

```
Wave 1:  02-08 (Korpus)        — manueller Checkpoint, blockiert nichts danach automatisierbar
Wave 2:  02-09 (Code) + 02-10 (Prompt)  — parallel ausführbar, beide ändern matcher.ts (potentielle Konflikte → seriell)
Wave 3:  02-11 (Eval-Re-Run)    — gegen 02-08+02-09+02-10 Kombi-Stand
```

Pragmatisch: Sequenziell 08 → 09 → 10 → 11, weil 09 und 10 beide `matcher.ts` anfassen. Cherry-Pick-Workflow gemäß `feedback_gsd_worktree_resurrected_files_bug.md` für SUMMARY-Recovery.

## Übergang in nächste Session

**Startprompt für nächste Session:** „weiter mit EduFunds Phase 2.2 — User-Kuratur Plan 02-08 starten, Vorschläge sind in PHASE22-DIAGNOSIS-AND-PLANS.md".

Erste Aktion: User geht die Korpus-Kalibrierungs-Tabelle durch und entscheidet pro Miss:
- Welche der vorgeschlagenen Top-3 sind realistisch?
- ev-011 + ev-013: Edge-Case oder Anliegen umformulieren?
- ev-018: aktion-mensch zulassen?

Danach automatisierbar bis Plan 02-11 ohne weitere Checkpoints.
