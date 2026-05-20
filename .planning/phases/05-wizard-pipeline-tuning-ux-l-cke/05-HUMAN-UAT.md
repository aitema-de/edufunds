---
status: partial
phase: 05-wizard-pipeline-tuning-ux-l-cke
source: [05-VERIFICATION.md]
started: 2026-05-20T14:10:00Z
updated: 2026-05-20T14:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. WIZ-03-Judge-Kalibrierung: Gemini-Flash als Judge-Modell prüfen
expected: Judge-Scores sind konsistent und nicht durch Modellrauschen dominiert (stddev ≤ 10 Punkte pro Cluster). Stichprobenartig 3–5 Judge-Ergebnisse aus den Baseline-Snapshots manuell gegen die Rubric nachprüfen; ggf. Vergleichs-Run mit gemini-2.5-pro.
result: [pending]

### 2. Pre-Closure-Smoke-Texte visuell bewerten
expected: Generierter Antragstext für aktion-mensch-schulkooperation / Berufsschule Sachsen ist inhaltlich korrekt, ohne Halluzinationen und erfüllt Formatierungserwartungen. Kolja hat D-36-Smoke bereits approved (smoke-result-d36.md) — dieser Eintrag dokumentiert die menschliche Inspektionsgrundlage.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
