# EduFunds Newsletter – Architektur & Betrieb

Automatisch erstellter Monats-Newsletter mit Freigabe-Workflow: Ein Cron erzeugt
monatlich einen **Entwurf**, ein Admin prüft/bearbeitet ihn, **gibt ihn frei** und
löst den **Versand** an alle bestätigten Abonnenten aus. Es wird nie etwas ohne
manuelle Freigabe versendet.

```
Cron (1. d. Monats) ─▶ Entwurf (LLM + Katalog) ─▶ Admin-Benachrichtigung
                                                        │
                          Admin-Bereich: prüfen/bearbeiten ▼
                          Freigeben ─▶ Versenden ─▶ alle bestätigten Abonnenten
```

## Inhaltsmodell

Eine Ausgabe (`NewsletterData`, `lib/newsletter.ts`) besteht aus:

| Block | Quelle | Halluzinationsschutz |
|---|---|---|
| **Persönlicher Brief** (Anrede + 3–5 Sätze, Wir-Form) | **LLM**, mit rotierendem „Impuls" je Ausgabe → jeder Brief anders, gleiche Stimme | reiner Fließtext |
| Unterschrift | `NEWSLETTER_SIGNATURE` (Default „Kolja & das EduFunds-Team") | statisch |
| 3 Förderprogramme | **Katalog** (`data/foerderprogramme.json`), deterministisch | keine erfundenen Programme/Fristen |
| Praxis-Tipp | **LLM** | — |
| Insight / Hintergrund + CTA | **LLM** | CTA-URL nur edufunds.org |
| 3–4 Kurzmeldungen | **LLM** | URLs nur edufunds.org, sonst weggelassen |
| **Disclaimer „Über EduFunds"** | `DEFAULT_DISCLAIMER` (statisch) | permanent in JEDER Ausgabe |

**Persönliche Einleitung:** Der LLM schreibt als die Menschen hinter EduFunds
(aitema GmbH, Berlin) — warm, nahbar, menschlich. Ein rotierender Impuls
(`LETTER_IMPULSE`, indexiert über Ausgabe + Monat) gibt jeder Ausgabe eine andere
Färbung bei gleichbleibender Stimme. Die Unterschrift wird separat angefügt
(nicht vom LLM), editierbar im Admin-Bereich.

**Permanenter Disclaimer:** Fester Block „Über EduFunds" am Ende jeder Ausgabe —
erklärt, was EduFunds ist, und grenzt rechtlich ab (ohne Gewähr; maßgeblich ist
der Fördergeber; keine Rechts-/Förderberatung). Zentral in `lib/newsletter.ts`
(`DEFAULT_DISCLAIMER`).

**Design:** Redaktionell-warm statt SaaS-Look — Serifen-Headlines (Georgia),
Cremepapier, dezente Pinie/Ocker-Akzente, Hairlines, Small-Caps-Labels, kein
Verlauf/keine großen Emojis. `templates/newsletter.html`.

**Bewusste Arbeitsteilung:** Programme kommen deterministisch aus dem gepflegten
Katalog (Name, Fördergeber, Frist, Zielgruppe), nur der frei formulierbare
redaktionelle Text stammt vom LLM. So können keine Programmnamen, Fördergeber,
Beträge oder Fristen halluziniert werden.

## Programm-Auswahl (Content-Collector)

`lib/newsletter/content-collector.ts`, rein deterministisch:

1. Filter: `status = "aktiv"` **und** `kiAntragGeeignet = true`.
2. Sortierung: zuletzt verifiziert/aktualisiert zuerst.
3. Rotation: Programme der letzten 3 Ausgaben werden ausgeschlossen
   (`getRecentProgramIds`); reichen die übrigen nicht, wird mit bereits gezeigten
   aufgefüllt statt leer zu bleiben.
4. Fristen werden für das Badge auf eine knappe Form normalisiert
   (`conciseDeadline`: echte Daten bleiben, „rollende" Fristen → „laufend").

## LLM-Generierung

`lib/newsletter/generate-draft.ts` → `generateJson(MODEL_PIPELINE, …)` aus
`lib/wizard/llm.ts` (Provider via `LLM_PROVIDER`, Default Mistral/EU; Retry +
Rate-Gate + PII-Scrub stecken im Wrapper). Der LLM-Output wird mit
`llmDraftSchema` (Zod) streng validiert, Markdown-Emphasis programmatisch
entfernt (`stripMarkdown`), dann mit den Katalog-Programmen zur vollständigen,
ebenfalls validierten `NewsletterData` zusammengesetzt.

Live-Smoke (kein DB nötig, rendert HTML nach `tmp/newsletter-preview.html`):

```bash
npx tsx --env-file=.env.local scripts/smoke-newsletter-generate.ts
```

## Datenmodell / Persistenz

Tabelle `newsletter_issues` (Migration `db/migrations/010_newsletter_issues.sql`),
CRUD in `lib/newsletter/issues.ts`. Status-Automat mit atomaren Übergängen:

```
draft ──approve──▶ approved ──markSending──▶ sending ──markSent──▶ sent
  ▲                                              └──(Fehler)──▶ failed
  └── Bearbeiten setzt approved zurück auf draft (Re-Freigabe nötig)
```

Doppelversand ist ausgeschlossen: `markSending` greift nur auf `approved` und
setzt atomar `sending`. Bearbeiten/Freigeben einer bereits versendeten Ausgabe
ist blockiert.

## API

| Route | Auth | Zweck |
|---|---|---|
| `POST /api/cron/newsletter` | `CRON_SECRET` | Monats-Entwurf erzeugen + benachrichtigen (idempotent pro Monat) |
| `POST /api/cron/newsletter?dryRun=1` | `CRON_SECRET` | nur generieren, nichts speichern/versenden |
| `GET  /api/newsletter/issues` | Admin-Cookie | Liste + Abonnentenzahl |
| `POST /api/newsletter/issues` | Admin-Cookie | manuell neuen Entwurf erzeugen |
| `GET  /api/newsletter/issues/:id` | Admin-Cookie | Ausgabe + HTML-Vorschau |
| `PATCH /api/newsletter/issues/:id` | Admin-Cookie | Inhalt/Betreff bearbeiten |
| `POST /api/newsletter/issues/:id/approve` | Admin-Cookie | freigeben |
| `POST /api/newsletter/issues/:id/send` | Admin-Cookie | `{test:true,testEmails:[…]}` oder Live-Versand |

## Admin-UI

`app/admin/newsletter/page.tsx` (Cookie-Auth): Ausgaben-Liste mit Status-Badges,
Live-HTML-Vorschau (iframe), Editor für den redaktionellen Teil, Buttons
**Speichern / Testversand / Freigeben / An alle versenden**, sowie **Neuen
Entwurf erstellen**. Der Deep-Link `…/admin/newsletter?issue=<id>` aus der
Benachrichtigung öffnet die Ausgabe direkt.

## Cron einrichten

Wrapper `scripts/newsletter-cron.sh` ruft den Endpoint auf und informiert Kolja
zusätzlich per Telegram (`notify-kolja`, falls verfügbar). Crontab am 1. des
Monats, 08:00:

```cron
0 8 1 * * /home/edufunds/edufunds-app/scripts/newsletter-cron.sh >> /var/log/edufunds-newsletter.log 2>&1
```

## Versand (Dispatch)

`lib/newsletter/dispatch.ts`: pro Abonnent personalisierte Ausgabe mit
individuellem Abmelde-Token + `List-Unsubscribe`-Header, gebatcht über Resend
(Batchgröße 10, 1 s Pause). Abhängigkeiten injizierbar (`DispatchDeps`) →
unit-testbar ohne DB/Mailversand.

## Benötigte Umgebungsvariablen

| Variable | Zweck |
|---|---|
| `CRON_SECRET` | schützt den Cron-Endpoint (auch in Prod-Env setzen!) |
| `LLM_PROVIDER`, `MISTRAL_API_KEY` / `DEEPSEEK_API_KEY` | LLM-Generierung |
| `RESEND_API_KEY`, `FROM_EMAIL`, `ADMIN_EMAIL` | Mailversand + Admin-Benachrichtigung |
| `NEXT_PUBLIC_APP_URL` | absolute Links (Abmelden, Review, Programme) |
| `NEWSLETTER_SIGNATURE` | Unterschrift unter dem Brief (Default „Kolja & das EduFunds-Team") |

## Tests & Verifikation

- Unit: `npx jest __tests__/lib/newsletter` (Collector, Schema, Dispatch — 18 Tests).
- Live-Generierung + HTML-Render: `scripts/smoke-newsletter-generate.ts`.
- DB-CRUD: gegen die Dev-DB verifiziert (Status-Automat + Idempotenz-Guards).

## E-Mail-Client-Robustheit

Das HTML ist bewusst tabellenbasiert aufgebaut (äußere Zentrierung, Titelkopf-
Folio, Programm-Einträge, Ornamente, Kurzmeldungen = `<table role="presentation">`)
mit `bgcolor`-Attributen — damit es auch in Outlook (Word-Engine) und Gmail trägt,
die Flexbox/`position`/teils `<style>` ignorieren. Initiale (`::first-letter`) und
einzelne CSS-Feinheiten sind „progressive enhancement": Wo ein Client sie nicht
unterstützt, fällt es sauber auf normale Darstellung zurück (nichts bricht).

> ⚠️ **Noch offen:** ein echter Testversand an reale Postfächer (Gmail **und**
> Outlook) steht aus — die Browser-Vorschau (Chromium) bildet die Eigenheiten der
> Mail-Renderer nicht 1:1 ab. Vor dem ersten echten Versand über den
> „Testversand"-Button prüfen.

## Bekannte Punkte für den Reviewer

- Der LLM erfindet gelegentlich **interne** Pfade in CTA/News
  (z.B. `/ki-antragsassistent`). Diese sind edufunds-intern (kein
  Domain-Halluzinationsrisiko), können aber 404 sein → bei der Freigabe kurz
  prüfen/anpassen. Programm-Links (`/foerderprogramme/<id>`) sind real.
- `templates/newsletter.html` wurde an die tatsächlichen Render-Keys von
  `generateNewsletter()` angeglichen (vorher rohe `{{intro_titel}}`-Platzhalter,
  die nie gefüllt wurden).

## Go-Live-Runbook

Reihenfolge zum Scharfschalten (Code liegt auf Branch `feature/newsletter`).

**1. Mergen & deployen**
```bash
# feature/newsletter -> staging -> deploy
git checkout staging && git merge --no-ff feature/newsletter
./scripts/deploy-staging.sh          # danach auf staging.edufunds.org pruefen
# nach erfolgreichem Test:
git checkout main && git merge --no-ff staging
./scripts/deploy-production.sh
```

**2. Migration auf Staging- und Prod-DB**
```bash
# pro Umgebung mit passender DATABASE_URL:
npx tsx --env-file=.env.<env> scripts/apply-migration.ts db/migrations/010_newsletter_issues.sql
```

**3. Prod-Env setzen** (auf dem Server / in der CI):
`CRON_SECRET` · `LLM_PROVIDER`+`MISTRAL_API_KEY` · `RESEND_API_KEY` ·
`FROM_EMAIL` · `ADMIN_EMAIL` · `NEXT_PUBLIC_APP_URL` · optional `NEWSLETTER_SIGNATURE`.
(`CRON_SECRET` existiert ggf. schon vom Retention-Cron.)

**4. Resend-Absenderdomain verifizieren** — SPF/DKIM/DMARC für `FROM_EMAIL`
im Resend-Dashboard. Ohne das: Spam/Bounces.

**5. Testversand & Roundtrip prüfen**
- Admin-Bereich `/admin/newsletter` → „Neuen Entwurf erstellen" → „Testversand"
  an je eine **Gmail-** und **Outlook-Adresse**; Darstellung prüfen.
- Anmeldung im Footer → Bestätigungsmail → bestätigt (Double-Opt-in).

**6. Cron einrichten** (Server-Crontab, 1. des Monats 08:00):
```cron
0 8 1 * * /home/edufunds/edufunds-app/scripts/newsletter-cron.sh >> /var/log/edufunds-newsletter.log 2>&1
```

**7. Erste echte Ausgabe** — Cron (oder manueller Entwurf) → im Admin prüfen,
ggf. interne CTA-Links korrigieren → freigeben → „An alle versenden".

> Anmeldung ist bereits live: `components/NewsletterForm.tsx` sitzt im globalen
> `components/Footer.tsx`, also auf jeder Seite.
