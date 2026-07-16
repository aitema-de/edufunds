# Löschkonzept (DSGVO Art. 5 Abs. 1 lit. e — Speicherbegrenzung)

> **Entwurf — vor Go-Live durch Fachanwalt prüfen lassen.** Die Fristen sind
> konservativ gewählt und per Umgebungsvariable anpassbar.

Personenbezogene Daten werden nur so lange gespeichert, wie es für den jeweiligen
Zweck erforderlich ist. Die Umsetzung ist deterministisch in `lib/retention.ts`
definiert, testbar (`__tests__/lib/retention.test.ts`) und wird automatisiert
ausgeführt.

## Was wird wann gelöscht / anonymisiert

| Daten | Tabelle(n) | Regel | Frist (Default) | Env |
|---|---|---|---|---|
| Abgelaufene Magic-Links | `magic_links` | löschen | ab Ablaufzeitpunkt | — |
| Newsletter-Anmeldung ohne Double-Opt-in | `newsletter_entries` (`confirmed=false`) | löschen | 30 Tage | `RETENTION_UNCONFIRMED_NEWSLETTER_DAYS` |
| Verwaiste anonyme Antrags-Entwürfe | `ki_antraege` (unbezahlt, ohne `author_email`/`paid_token`, Status draft/in_progress/complete) | löschen | 180 Tage | `RETENTION_ABANDONED_DRAFT_DAYS` |
| Liegen gelassene, E-Mail-gebundene Antrags-Entwürfe | `ki_antraege` (unbezahlt, `author_email` gesetzt, kein `paid_token`/`paid_at`, Status draft/in_progress/complete) | anonymisieren (Inhalt + E-Mail + IP entfernen, Zeile bleibt) | 90 Tage | `RETENTION_ABANDONED_IDENTIFIED_DRAFT_DAYS` |
| IP-Adresse / User-Agent / Referrer | `ki_antraege`, `contact_requests`, `newsletter_entries` (bestätigt) | anonymisieren (NULL) | 90 Tage | `RETENTION_IP_DAYS` |
| **Bezahlte Anträge nach Ablauf der Zugriffsfrist** | `ki_antraege` (`status='paid'`, `paid_at` gesetzt) | **anonymisieren**: Antragsinhalt, Käufer-/Autor-E-Mail und IP entfernen. **Rechnungs-/Stripe-Referenzen** (`invoice_number`, `stripe_session_id`, `paid_at`) **bleiben** für GoBD/§ 147 AO. | **365 Tage (12 Monate)** | `RETENTION_PAID_ANTRAG_DAYS` |

> **E-Mail-gebundene Entwürfe:** Nutzer können einen Antrag optional an ihre E-Mail
> binden (Wiederaufnahme, unverifiziert), ohne je zu bezahlen. Solche Zeilen fielen
> weder unter die Lösch-Regel für *anonyme* Entwürfe (`author_email IS NULL`) noch
> unter die Anonymisierung *bezahlter* Anträge (`status='paid'`). Nach 90 Tagen
> Inaktivität (Wiederaufnahme-Fenster) werden Antragsinhalt, E-Mail und IP entfernt;
> die (nun personenlose) Zeile bleibt idempotent als anonymisierter Rest erhalten.
> Bewusst *anonymisieren statt löschen*, um Bestands-/Konversionsstatistik zu wahren.

> **Bezahlte Anträge — Zusammenspiel mit der vertraglichen Zusage:** Die Frist von
> 12 Monaten ist kein technisches Detail, sondern deckt sich mit der Zusage
> „12 Monate Online-Zugriff" gegenüber dem Kunden (AGB-Neufassung § 7 Abs. 3). Der
> Datensatz wird **nicht gelöscht**, sondern **anonymisiert**: Der Antragsinhalt und
> alle Personenbezüge entfallen, die buchhalterisch nötigen Referenzen bleiben. Der
> Kunde wird in den AGB darauf hingewiesen, seinen Antrag rechtzeitig zu exportieren.

### Bewusst NICHT automatisch gelöscht
- **Rechnungs- und Zahlungsdaten bezahlter Anträge** (`invoice_number`,
  `stripe_session_id`, `paid_at`, Rechnungsanschrift) — steuerliche Aufbewahrung
  (GoBD / § 147 AO). Der zugehörige **Antragsinhalt** wird dagegen nach 12 Monaten
  anonymisiert (siehe Tabelle oben) — die Aufbewahrungspflicht erstreckt sich auf die
  Buchhaltungsunterlagen, nicht auf den Inhalt des generierten Antragstextes.
- **Bestätigte Newsletter-Abonnenten** — bleiben bis zum Widerruf (Abmeldung);
  nur IP/User-Agent (Opt-in-Nachweis) werden nach Frist anonymisiert.
- **Kontaktanfragen-Inhalt** (Name/E-Mail/Nachricht) — eigene Aufbewahrung je nach
  Bearbeitungsstand; hier nur die technischen Metadaten (IP/UA/Referrer) anonymisiert.
  *(Frist für inhaltliche Löschung beantworteter Anfragen ggf. mit Anwalt ergänzen.)*

## Rechtsgrundlagen
- Art. 5(1)e DSGVO (Speicherbegrenzung), Art. 25 (Datenminimierung by Design).
- Newsletter-Opt-in-Nachweis: Art. 7(1) DSGVO i. V. m. § 7 UWG — Nachweisinteresse
  rechtfertigt befristete Aufbewahrung von IP/Zeit/User-Agent.

## Automatisierung (Cron)

Endpoint: `POST /api/cron/retention` — geschützt über `CRON_SECRET`
(Header `x-cron-key: <secret>` **oder** `Authorization: Bearer <secret>`).

- `?dryRun=1` zählt nur (Transaktion wird zurückgerollt), ändert nichts.
- Ohne `dryRun` werden die Regeln angewendet.

**Server-Cron (Hetzner)** — täglich um 03:30, ruft den Endpoint lokal im Container-Netz auf:

```cron
30 3 * * * curl -fsS -X POST -H "x-cron-key: $CRON_SECRET" https://app.edufunds.org/api/cron/retention >/dev/null 2>&1
```

**Manuell** (Dry-Run-Default):

```bash
npx tsx --env-file=.env.local scripts/cleanup-personal-data.ts          # Dry-Run
npx tsx --env-file=.env.local scripts/cleanup-personal-data.ts --apply  # wendet an
```

## Voraussetzungen vor Go-Live
- `CRON_SECRET` in der Prod-Umgebung setzen (sonst antwortet der Endpoint mit 503).
- Server-Cron-Eintrag anlegen (siehe oben).
- Einmal Dry-Run gegen die Prod-DB laufen lassen und die Zahlen plausibilisieren.
