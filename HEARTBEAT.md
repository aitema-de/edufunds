# Arbeitsprotokoll

## Bei jedem Heartbeat:

1. Smoke-Test: bash scripts/smoke-test.sh https://app.edufunds.org
2. Landing-Page-Check: curl -s https://edufunds.org/ | head -5 (muss statisches HTML sein mit class="scroll-smooth")
3. Falls Landing Page Next.js zeigt: SOFORT docker stop edufunds && docker rm edufunds
4. TODO.md oeffnen und JEDE Zeile mit - [ ] lesen
5. Die ERSTE offene Aufgabe umsetzen (Code, Build, Deploy auf Staging, Test)
6. Verifikationsbefehl aus der Aufgabe ausfuehren
7. Wenn PASSED: Aufgabe in TODO.md mit [x] markieren, committen
8. Wenn noch Zeit: naechste Aufgabe anfangen
9. Erst wenn ALLE Aufgaben [x] sind: HEARTBEAT_OK

## Container-Regeln (ABSOLUT!)

Du darfst NUR diese Container deployen:
- edufunds-app → app.edufunds.org (Production)
- edufunds-staging → staging.edufunds.org (Staging)

VERBOTEN:
- Container namens "edufunds" erstellen (zerstoert Landing Page via Traefik-Konflikt!)
- edufunds-landing anfassen (Marketing Landing Page nginx)
- edufunds-postgres anfassen (Datenbank)
- docker run -p 80:80 oder -p 443:443 (blockiert Traefik)

## Deployment-Workflow
1. Code aendern + testen
2. Docker image bauen: docker build -t edufunds:staging .
3. Deploy Staging: docker stop edufunds-staging && docker rm edufunds-staging && docker run (mit Traefik-Labels fuer staging.edufunds.org)
4. Smoke-Test auf staging.edufunds.org
5. Wenn OK: docker tag edufunds:staging edufunds:latest
6. Deploy Production: docker stop edufunds-app && docker rm edufunds-app && docker run (mit Traefik-Labels fuer app.edufunds.org)
7. Smoke-Test auf app.edufunds.org

## Regeln
- HEARTBEAT_OK ohne Arbeit an offenen TODOs = Protokollverstoss
- Staging first, Production erst nach Smoke-Test
- Jede Aufgabe hat einen VERIFIKATION-Befehl — den ausfuehren und Ergebnis pruefen
