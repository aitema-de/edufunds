# Arbeitsprotokoll

## Bei jedem Heartbeat:

1. Smoke-Test: bash scripts/smoke-test.sh https://app.edufunds.org
2. Landing-Page-Check: curl -s https://edufunds.org/ | head -5 (muss Landing Page HTML sein, NICHT Next.js)
3. TODO.md oeffnen und JEDE Zeile mit - [ ] lesen
4. Die ERSTE offene Aufgabe umsetzen (Code, Build, Deploy auf Staging, Test)
5. Verifikationsbefehl aus der Aufgabe ausfuehren
6. Wenn PASSED: Aufgabe in TODO.md mit [x] markieren, committen
7. Wenn noch Zeit: naechste Aufgabe anfangen
8. Erst wenn ALLE Aufgaben [x] sind: HEARTBEAT_OK

## Deployment-Workflow (KRITISCH\!)
- edufunds.org = Landing Page (nginx). NICHT ANFASSEN\!
- app.edufunds.org = Platform (Next.js). Hier deployst du.
- staging.edufunds.org = Staging. Hier testest du zuerst.
- Beim Rebuild: IMMER Env-Vars + Traefik-Labels setzen (siehe TODO.md)

## Regeln
- HEARTBEAT_OK ohne Arbeit an offenen TODOs = Protokollverstoss
- Staging first (staging.edufunds.org), Platform erst nach Smoke-Test (app.edufunds.org)
- Jede Aufgabe hat einen VERIFIKATION-Befehl -- den ausfuehren und Ergebnis pruefen
- edufunds-Container (nginx Landing Page) NIEMALS stoppen, ersetzen oder umbenennen
