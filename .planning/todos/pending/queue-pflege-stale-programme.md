---
title: Queue-Pflege — stale/expired Programme aus Prio-Queue ausräumen
created: 2026-05-06
source: Phase 03 D-09 #3 Smoke (zwei aufeinanderfolgende Skip-Fälle bei `--next`)
priority: medium
related_phase_candidate: 04 (Programm-Pflege Build-Out, FETCH-04 Dossier-Migration)
related_requirements: [FETCH-04 Dossier-Migration, FETCH-02 Vollautomation]
---

# Prio-Queue enthält stale/expired Programme — Pre-Filter oder Wartung nötig

## Befund (Phase 03 D-09 #3 Smoke 2026-05-06)

Beim Live-Smoke-Run der Cron-Migration wurden zwei `--next`-Aufrufe nacheinander vom Empty-Skip-Schutz auf `status=skip` gesetzt:

1. **bundesweit-ganztag** (Score 89): infoLink zeigt auf BMBF-Landing-Page statt konkrete Richtlinie. LLM-Notiz: „Quelle zu allgemein"
2. **nrwbank-moderne-schule** (Score 82): LLM-Notiz: „Das Förderprogramm ist am 27.02.2026 ausgelaufen"

Konsequenz: Trotz erfolgreicher Cron-Migration (Wrapper aktiv, kein 401, LLM antwortet) konnte kein frisches Dossier produziert werden, weil die Queue veraltete oder zu generische Quellen oben hat.

## Ursache

`data/richtlinien-prioritaeten.json` enthält Programme, die:
- ausgelaufen sind (Frist überschritten, Programm eingestellt)
- generische Landing-Pages als infoLink haben (Programm-Übersicht statt konkrete Richtlinie)

Es gibt aktuell keinen automatischen Pre-Filter, der diese Einträge aus der `--next`-Auswahl ausschließt.

Vergleichs-Befund BalkanGrant 2026-05-03: gleiches Datenfrische-Muster — 40 von 80 Grants expired, dort durch Cron-Reaktivierung + Initial-Run gelöst.

## Akzeptanz-Kriterien für Fix

1. **Auslauf-Schutz:** `extract-richtlinie.ts --next` überspringt Einträge mit `status=skip` (heute schon so) UND Einträge, die in einem vorherigen Lauf als expired/skip markiert wurden, ohne sie wieder zu picken.
2. **Frist-Pre-Check:** Optional vor LLM-Call kurzer Frist-Check via Source-Header oder schneller HTTP-HEAD (wenn Quelle 404/410 → skip).
3. **Queue-Cleanup-Skript:** `scripts/cleanup-expired-queue.ts` markiert ausgelaufene Programme als `status=expired` (nicht `skip`, damit sie erkennbar bleiben).
4. **Reporting:** Wöchentlicher Output „X Programme gepflegt, Y skip, Z expired" — passt zu Phase 4 FETCH-02 Vollautomation.

## Rahmen

Nicht-blockierend für Phase 03 (Cron-Migration ist über zwei verschiedene Live-Runs + Static-Acceptance verifiziert; Skip-Mechanik funktioniert sauber inkl. echter LLM-Auslauf-Detektion). Empty-Skip-Schutz tut genau, was er soll — verhindert leere Dossier-Files. Frage ist nur: wann räumen wir die Queue auf?

Passt natürlich in Phase 04 (Programm-Pflege Build-Out, FETCH-04 Dossier-Migration). Dort wird ohnehin Queue-Struktur angefasst.

## Test-Anker

Als Regressions-Sample:
- `bundesweit-ganztag` und `nrwbank-moderne-schule` sollen nach Phase-04-Implementation NICHT mehr als nächste `--next`-Picks angeboten werden.
- `npx tsx scripts/extract-richtlinie.ts --list 5` sollte nach Cleanup nur noch live-fähige Programme zeigen.
