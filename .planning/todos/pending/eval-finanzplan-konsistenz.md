---
title: Eval-Item — Recheck-Stage erkennt Finanzplan-Fließtext-Inkonsistenz
created: 2026-05-06
source: Phase 02.1 manueller UAT-Smoke (Stiftung Bildung Förderfonds, Token 686fdf24)
priority: medium
related_phase_candidate: 02.2 oder 03 (Eval-Iteration)
related_requirements: [WIZ-03 Recheck-Stage, Eval-Korpus]
---

# Recheck-Stage muss numerische Konsistenz zwischen Fließtext und Finanzplan prüfen

## Befund (UAT-Smoke 2026-05-06)

Im generierten Antrag „Schulgarten für alle" (Stiftung Bildung) lieferte die Pipeline zwei widersprüchliche Förder-Summen:

- **Fließtext** Sektion „Wie es weitergeht": „die beantragten **27.500 Euro** aus dem Förderfonds der Stiftung Bildung"
- **Finanzplan-Tabelle**: Items summieren auf **30.500 EUR Förderung** + 3.000 EUR Eigenanteil = 33.500 EUR Gesamt

## Ursache

Mehrdeutige User-Antwort wurde von zwei Pipeline-Stages unterschiedlich aufgelöst:

User-Input lautete sinngemäß: „Gesamtsumme 30.500 €. Eigenbeteiligung der Schule 3.000 € aus Förderverein. Beantragt 27.500 € als reine Investitionskosten."

- **Section-Stage** las: „Gesamt 30.500 €, davon 3.000 € Eigenanteil → 27.500 € Antrag" (Variante A)
- **Finanzplan-Stage** las: „Items kosten zusammen 30.500 €, Schule legt 3.000 € zusätzlich drauf → 30.500 € Antrag, 33.500 € Gesamt" (Variante B)

## Akzeptanz-Kriterium für Fix

Recheck-Stage (oder neue Konsistenz-Sub-Stage) muss vor Pipeline-Abschluss:

1. Alle Geldbeträge im Fließtext extrahieren (Regex auf "X EUR" / "X.XXX €" / "beantragte X")
2. Mit Finanzplan-Tabellen-Summen abgleichen (Förderung-Spalte, Gesamtvolumen, Eigenanteil)
3. Bei Drift > 0 EUR: Pipeline-Phase auf `recheck_required` setzen ODER Korrektur-Stage anstoßen

## Test-Anker

Diesen konkreten Schulgarten-Antrag in den Eval-Korpus aufnehmen als Regressions-Sample:
- User-Input: ambiguous mit „Gesamt X / davon Y Eigenanteil / Antrag Z"
- Expected: Recheck flagt Drift, oder Section + Finanzplan einigen sich auf Variante A
- Negativ-Sample für aktuellen Stand: 27.500 € im Text, 30.500 € in Tabelle = inkonsistent

## Rahmen

Nicht-blockierend für Phase 02.1 (Code-Pfad funktioniert, Halluzination ausgeschlossen — nur Konsistenz-Lücke). Gehört in spätere Eval-Iteration sobald Phase 3+ Programm-Pflege durch ist und neue Eval-Slot-Kapazität frei wird.
