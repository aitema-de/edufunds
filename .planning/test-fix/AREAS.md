# EduFunds — Test-Bereichsinventar (AREAS)

Landkarte für den autonomen Test-&-Fix-Loop. Jeder Bereich hat einen Owner-Agenten im Workflow.
Stand: Branch `feature/wizard-adaptive`, lokal gegen Wegwerf-DB `edufunds_test` auf `localhost:3101`.

## A1 — Öffentliche Seiten (kostenlos, kein LLM)
Statische/serverseitige Seiten. Erwartung: HTTP 200, kein Error-Boundary, kein Konsolen-Error, Header/Footer/Main vorhanden.
- `/` Startseite
- `/foerderprogramme` Programmliste
- `/foerderprogramme/[id]` Detailseite (Beispiel: `niedersachsen-sport`)
- `/preise`, `/ueber-uns`, `/kontakt`, `/registrieren`, `/archiv`
- `/impressum`, `/datenschutz`, `/agb`
- `/antrag/start` Wizard-Einstieg
- `/antrag/meine` Antragsliste

## A2 — Wizard-Flow (LLM-kostenpflichtig, gedeckelt ≤15 echte Läufe)
Kern der Plattform und Hauptquelle der Bugs. Flow:
`/antrag/start` → `POST /api/match` (Matching) → `/antrag/[programmId]` → `POST /api/wizard/start`
→ `/antrag/[programmId]/wizard` (`/api/wizard/[token]`, `/api/wizard/answer`, `/api/wizard/edit-answer`)
→ `POST /api/wizard/generate` (Antrag+Finanzplan) → `/api/wizard/readiness`, `/api/wizard/finanzplan*`,
`/api/wizard/kumulierungs-check` → Bezahl-Gate → `/antrag/download/[token]`.
Erwartung: jeder Schritt liefert valide JSON, kein Timeout-Crash, Wiederaufnahme via session_token, keine Halluzinations-Marker.

## A3 — Bezahl-Flows (Dev-Mock, kostenlos)
`NEXT_PUBLIC_PAYWALL_DEV_MOCK=1`. Pfade:
- `/antrag/checkout` + `POST /api/wizard/checkout` / `POST /api/wizard/checkout/dev-mock`
- `/checkout/einzel`, `/checkout/jahresabo`, `/checkout/success`, `/antrag/checkout/success`
- `POST /api/checkout`, `POST /api/stripe/checkout`, `POST /api/stripe/verify`, `POST /api/stripe/webhook`, `POST /api/paypal`
Erwartung: Paywall-Gate korrekt, Dev-Mock schaltet `paid_token` frei, Download erst nach Zahlung.

## A4 — Admin + API direkt (kostenlos)
- `/admin/dashboard`, `POST /api/admin/login`, `POST /api/admin/logout`
- API-Robustheit: Auth-Gates, fehlende/ungültige Bodies → 400 statt 500, Statuscodes korrekt.
- `GET /api/foerderprogramme`, `GET /api/health`, `GET /api/health/backend`, `GET /api/health/dashboard`
- `POST /api/contact`, `POST /api/feedback`, `POST /api/newsletter` (Resend-Key fehlt → graceful)
- `POST /api/vitals`, `POST /api/assistant/generate`

## A5 — AI-Ergebnisqualität (LLM, eigener Track)
Qualität des generierten Antrags + Finanzplan gegen Tester-Kriterien (Antragstext/Finanzplan/Passung).
Werkzeug: vorhandene `scripts/eval-pipeline.ts` (Replay = kostenlos) + Judge-Agent über ≤3 echte Wizard-Ausgaben.
Harte Gates aus CLAUDE.md: WIZ-01 Pflichtabschnitte, WIZ-02 Halluzination (>2σ blockierend), WIZ-03 Tonalität (warn).

## Bewusst ausgeklammert
- Newsletter-Versand (kein Resend-Key) — nur Graceful-Degradation geprüft, kein echter Mailversand.
- Echte Stripe/PayPal-Zahlung (kein Live-Account) — nur Dev-Mock.
- Deploys nach Staging/Prod (nicht Teil dieses Loops).
