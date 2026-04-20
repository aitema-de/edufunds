# EduFunds Wizard — Anknüpfpunkt (Stand 2026-04-20)

> Kurzfassung: Branch `feature/wizard-adaptive` liefert den kompletten End-to-End-Flow inkl. Paywall.
> Zwei Blocker: Gemini-Key + Stripe-Account. Beide unabhängig voneinander bearbeitbar.

## Stand
- **22 Commits, +10349/-3350 Zeilen**, HEAD `45b079b`, auf `origin/feature/wizard-adaptive` gepusht.
- TypeScript durchgehend grün, alle Routen HTTP 200.
- Drei Richtlinien-Stubs für DigitalPakt, Schulpreis, Aktion Mensch in `data/richtlinien/`.
- DB-Migrationen bis `003_paywall.sql` auf Dev appliziert; Staging/Production noch nicht.

## Flow-Überblick
```
/antrag/start → Matching → /antrag/[id]/wizard → Interview → Pipeline →
AntragResult mit Finanzplan-Editor → Freigabe → Paywall-Gate →
Checkout (Stripe oder Dev-Mock) → Success-Polling → /antrag/download/[token]
```

## Was fertig ist
| Baustein | Dateien |
|----------|---------|
| Matching | `lib/wizard/matcher.ts`, `app/antrag/start/`, `app/api/match/` |
| Wizard-Interviewer | `lib/wizard/interviewer.ts` + `prompts.ts` + geber-typ-Guidance |
| Richtlinien-Schema | `lib/wizard/richtlinien-schema.ts` + `-loader.ts` + `scripts/extract-richtlinie.ts` |
| Pipeline mit Finanzplan | `lib/wizard/pipeline.ts` + `finanzplan-generator.ts` |
| Finanzplan-Editor + Validator | `components/Wizard/FinanzplanEditor.tsx` + `lib/wizard/finanzplan-validator.ts` |
| Antwort-Edit mit Rollback | `app/api/wizard/edit-answer/`, `ChronologySidebar.tsx` |
| Schulprofil, Session-Listing | `lib/wizard/school-profile-client.ts`, `app/antrag/meine/` |
| Kosten-Tracking | `lib/wizard/pricing.ts` + UI in `AntragResult` + `MyAntraegeClient` |
| Kumulierungs-Check | `app/api/wizard/kumulierungs-check/`, `KumulierungsWarnung.tsx` |
| Paywall D1 | Migration 003, `PaywallGate.tsx`, `/antrag/download/[token]`, Dev-Mock |
| Paywall D2/D3 | `lib/stripe/client.ts`, `/api/wizard/checkout`, `/api/stripe/webhook`, Success-Page |

## Blocker (beide du)
1. **Gemini-Key aus Fedos Google-Konto** (Paid Tier). Eintragen in `/home/kolja/edufunds-app/.env.local`:
   ```
   GEMINI_API_KEY=...
   ```
   Dev-Server neu starten (Env-Vars hot-reloaden nicht).
2. **Stripe-Account für EduFunds** aufsetzen. Komplette Schritt-für-Schritt-Anleitung: `STRIPE_SETUP.md` im Repo.

## Wenn Gemini-Key da: erster E2E-Test
```bash
cd ~/edufunds-app
git checkout feature/wizard-adaptive
./scripts/dev-db-tunnel.sh --bg
pkill -f 'next-server|next dev' 2>/dev/null
nohup npm run dev > /tmp/edufunds-dev.log 2>&1 & disown
sleep 10

# Browser-Test:
# 1. http://localhost:3101/antrag/start
# 2. Anliegen eingeben (z. B. "Medienausstattung an unserer Grundschule")
# 3. Programm wählen (DigitalPakt hat Richtlinie → grüner Badge)
# 4. Interview durchlaufen, Freigabe
# 5. Pipeline läuft (~1-3 min, ~0,25 €)
# 6. Finanzplan editieren, "Freigeben" klicken
# 7. Paywall: "Dev-Mock: als bezahlt markieren" (steht da, weil NEXT_PUBLIC_PAYWALL_DEV_MOCK=1)
# 8. → /antrag/download/[token] mit vollem Text + Finanzplan
# 9. Copy-Button testen (liefert Antrag + Finanzplan-Markdown-Tabelle)
```

## Wenn Stripe-Account da: echter Zahlungstest auf Staging
1. `STRIPE_SETUP.md` Schritte 1-5 durchgehen
2. Env auf Staging-Server setzen (`/home/edufunds/edufunds-app/.env.production`), `NEXT_PUBLIC_PAYWALL_DEV_MOCK` weglassen
3. Staging-Container neu bauen: `./scripts/deploy-staging.sh --branch feature/wizard-adaptive --yes`
4. DB-Migration 003 auf Staging-DB applizieren (aktuell nur auf Dev)
5. `https://staging.edufunds.org/antrag/start` → Durchlauf wie oben, aber echter Stripe-Checkout mit Testkarte `4242 4242 4242 4242`
6. Stripe-CLI (optional, für Webhook-Debug): `stripe listen --forward-to https://staging.edufunds.org/api/stripe/webhook`

## Offene Punkte (die wir NICHT mehr angerührt haben)
- Resend-Key → Newsletter + optional Receipt-Mails mit Download-Link
- Weitere Richtlinien-Dossiers via Extraction-Tool (mindestens Top-10)
- Abos (149/249 €/Jahr) = Phase 2 — braucht Auth-System
- GitHub-PAT in Git-Remote-URL sauberer (SSH-Schlüssel)
- Kumulierungs-Check Projekt-Ähnlichkeit (aktuell nur Unvereinbarkeit)

## Pfadreferenz (komplette Wizard-Oberfläche)
```
lib/wizard/{types,prompts,session,gemini,interviewer,pipeline,
            pricing,matcher,match-handoff-client,school-profile-client,
            session-index-client,finanzplan-generator,finanzplan-validator,
            finanzplan-markdown,richtlinien-schema,richtlinien-loader,
            geber-guidance,programm-kriterien}.ts

lib/stripe/client.ts

app/api/wizard/{start,answer,edit-answer,generate,[token],
                 kumulierungs-check,finanzplan,finanzplan/legitimize,
                 checkout,checkout/dev-mock}/route.ts
app/api/match/route.ts
app/api/stripe/webhook/route.ts

app/antrag/start/page.tsx
app/antrag/[programmId]/wizard/page.tsx
app/antrag/meine/page.tsx
app/antrag/download/[token]/page.tsx
app/antrag/checkout/success/page.tsx

components/Wizard/{WizardShell,QuestionCard,ChronologySidebar,
                    GeneratingProgress,AntragResult,FactsPanel,
                    AnliegenForm,MatchResultList,StartClient,
                    MyAntraegeClient,KumulierungsWarnung,
                    FinanzplanView,FinanzplanEditor,
                    PaywallGate,CheckoutSuccessClient}.tsx

data/richtlinien/{bmbf-digitalpakt-2,bosch-schulpreis,aktion-mensch-schulkooperation}.json
db/migrations/{001,002_wizard_session,003_paywall}.sql
scripts/{dev-db-tunnel.sh,deploy-staging.sh,deploy-production.sh,extract-richtlinie.ts}
```
