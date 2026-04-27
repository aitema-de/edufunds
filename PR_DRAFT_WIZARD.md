# PR-Draft: `feature/wizard-adaptive` → `staging`

> Wenn du den PR eroeffnen willst:
> `gh pr create --base staging --head feature/wizard-adaptive --title "..." --body-file PR_DRAFT_WIZARD.md`
> (den PR-Titel entweder wie unten vorgeschlagen oder eigens waehlen; Body entfernt dann den ersten Abschnitt).

---

## Adaptiver KI-Antragswizard mit Paywall, Pipeline-Qualitaet und Richtlinien-Infrastruktur

Branch ersetzt den alten monolithischen `KIAntragAssistent` durch einen adaptiven Wizard mit mehrstufiger Generierungs-Pipeline und ergaenzt den End-to-End-Flow um eine Stripe-Paywall, ein Finanzplan-Werkzeug und eine wartbare Richtlinien-Infrastruktur. Der alte Assistent bleibt als `/antrag/[id]` als Legacy-Pfad verfuegbar; der Wizard ist Beta unter `/antrag/[id]/wizard`.

### End-to-End-Flow

```
/antrag/start              Anliegen-Textfeld + Schul-Profil-Auto-Fill
   ↓ POST /api/match        Gemini Flash rankt Top-5 Programme mit Begruendung
Programm-Auswahl
   ↓ sessionStorage-Handoff
/antrag/[id]/wizard         Interviewer (Flash, max 12, geber-typ-spezifisch,
                            richtlinien-aware) + Pipeline (Pro: Outline →
                            Sections → Critique → Revision → Finanzplan)
AntragResult                Finanzplan-Editor mit Validator (Kostenkat.,
                            Eigenanteil, maxEur/maxProzent, Kumulierung)
   ↓ Freigeben
Paywall-Overlay             29 € Einzelantrag, Dev-Mock fuer Tests
   ↓ POST /api/wizard/checkout → Stripe Checkout
Success-Seite               poll auf paidToken
   ↓ /antrag/download/[token]
Download                    vollstaendiger Text + Finanzplan, Copy/DOC/TXT/PDF
```

### Was drin ist

**Wizard-Kern**
- **Matcher** (`/api/match`, Gemini Flash): rankt Top-5 Programme mit Score und Begruendung, beruecksichtigt Schultyp/Bundesland/Budget.
- **Interviewer** (Gemini Flash, Cap 12 Fragen, KI entscheidet Stop): geber-typ- und richtlinien-spezifische Fragen. Extrahiert strukturierte Fakten aus Freitext.
- **Pipeline** (Gemini Pro): Gliederung → Abschnitte → Critique → Revision → Finanzplan. Selbstkritik-Pass filtert Floskeln.
- **Persistenz** `ki_antraege` (Migrationen 002 + 003), localStorage-Schul-Profil, Folgeantrag mit Auto-Fill.
- **Antwort-Editieren** mit Rollback-Snapshot; Dialog laeuft ab dort neu.
- **Session-Listing** `/antrag/meine` aus localStorage + DB.
- **Kosten-Tracking** pro Session.

**Pipeline-Qualitaets-Hebel**
1. Critique/Revision laeuft mit konkreter Richtlinie als Kontext.
2. Strukturiertes Finding-JSON statt Freitext-Kritik.
3. Re-Check nach Revision (Resolutions plus offene Findings).
4. Antragstext-×-Finanzplan-Konsistenz-Check.
5. Pre-Flight Fakten-Ampel (gruen/orange/grau) je nach Dossier-Stand und Felder-Luecken.

**Finanzplan**
- Editor mit Kostenkategorien, Eigenanteil-Berechnung, Programmgrenzen-Validator (`maxEur`, `maxProzentGesamtkosten`).
- Kumulierungs-Check ueber `kumulierung.unvereinbarMit`-IDs in den Dossiers.

**Paywall**
- Stripe Checkout in Standard-Payment-Mode (kein Connect).
- Webhook (`/api/stripe/webhook`) setzt `paidToken`, Success-Seite pollt.
- Download-Seite mit Token-Auth, Copy/DOC/TXT/PDF-Export.
- Dev-Mock via `NEXT_PUBLIC_PAYWALL_DEV_MOCK=1` fuer Tests ohne Stripe-Account.

**Richtlinien-Infrastruktur**
- 11 Dossiers in `data/richtlinien/` (manuell + via Gemini Pro extrahiert).
- Schema in `lib/wizard/richtlinien-schema.ts`.
- Extraction-Tool `scripts/extract-richtlinie.ts` mit Modi `--list`, `--next`, manueller Lauf. Substanz-Guard verhindert leere Dossiers. Browser-User-Agent fuer Bundesseiten.
- Prio-Queue `data/richtlinien-prioritaeten.json` (82 Programme, scored). Generator `scripts/rebuild-queue.ts`.
- Scanner `scripts/scan-new-programs.ts` fuer neue Programme aus `data/program-sources.json`.
- Wochen-Cronjobs `.github/workflows/weekly-{dossier-extraction,program-scan}.yml` (Mo 04:00/04:30 UTC).

**Daten-Cleanup**
- Katalog von 136 → 131 Programmen reduziert (5 Stubs/Duplikate raus).
- ENSA-Eintrag korrigiert (Schulformen, kumulierung-IDs).
- `lesen-macht-stark` auf aktuelles dbv-Nachfolgeprogramm umgestellt.

**Housekeeping**
- −2.200 Zeilen Altlast entfernt (alter `AntragGenerator`, `lib/antrag-pipeline.ts`, `lib/programSchema.ts`, `lib/ki-prompts.ts`, `lib/antrag-export.ts`, `app/api/generate-antrag/`).
- Sicherheits-Fix: `.env*` in `.gitignore`.
- Rate-Limiter auf `/api/wizard/` ausgeweitet.
- Deploy-Skripte `scripts/deploy-{staging,production}.sh`.

### Branch-Zahlen

- 34 Commits, von `d016efe` bis aktueller HEAD.
- TypeScript durchgehend gruen.
- Alle Dev-Routen HTTP 200.

### Architektur-Entscheidungen (alle explizit mit Kolja abgestimmt)

1. UX: Hybrid aus Schritt-Karte und chronologischer Sidebar.
2. Stop-Kriterium: KI entscheidet, Cap 12 Fragen.
3. Programm-Wissen: kuratierte Dossiers in `data/richtlinien/` plus Auto-Extraktion aus `foerderprogramme.json`.
4. Generierung: 5-Stage-Pipeline (Outline → Sections → Critique → Revision → Finanzplan).
5. Persistenz: DB-Session + localStorage-Fallback.
6. Modelle: Flash fuer Interview, Pro fuer Pipeline.
7. Payment: Stripe Standard-Payment, Merchant of Record = aitema, eigener neuer Stripe-Account fuer EduFunds.

### Was NICHT drin ist (bewusst)

- E2E-Test mit echtem Gemini-Key — blockiert, bis Paid-Tier-Key vorliegt.
- Stripe-Live-Keys + `invoice_creation: { enabled: true }` — wartet auf Stripe-Account-Anlage.
- Cross-Device-Sync via Login/Magic-Link — Phase 2.
- Streaming/SSE fuer Live-Pipeline-Fortschritt — Phase 2.
- Abo-Plan (Schultraeger, Jahres-Flat) — Phase 2, braucht Auth-System.
- Resend-Key fuer Newsletter und Receipt-Mail — separates Thema.

### Test-Checkliste (nach Merge auf staging)

- [ ] Migrationen 002 + 003 auf Staging-DB applizieren falls noch nicht geschehen
- [ ] Auf `staging.edufunds.org/antrag/start` Szenario durchspielen: Anliegen → Top-5 → Wizard → Pipeline → Finanzplan
- [ ] Frueh­ere Antwort editieren → Dialog laeuft ab dort neu, Facts passen
- [ ] Zweiten Antrag starten → Schul-Profil wird erkannt, 2–3 Fragen werden uebersprungen
- [ ] Fakten-Ampel zeigt vor Pipeline-Start Felder-Luecken, Critique-JSON wird gefuellt, Resolutions kommen, Consistency-Issues plausibel
- [ ] Finanzplan-Validator: Eigenanteil, maxEur, maxProzent, Kumulierung
- [ ] Paywall-Overlay → Stripe Checkout (Test-Modus, Karte 4242…) → paidToken-Webhook → Download
- [ ] PDF-Export oeffnet korrekt, A4-Layout, Kopfzeile
- [ ] `/antrag/meine` zeigt Sessions mit Kosten

### Deploy-Pfad

```bash
# Merge PR → automatisches staging deploy ueber GitHub Actions, oder manuell:
./scripts/deploy-staging.sh --yes

# Nach Smoke-Test ok → PR staging → main, dann:
./scripts/deploy-production.sh
```

### Vorschlag fuer PR-Titel

`feat(wizard): adaptiver KI-Antragswizard mit Pipeline-Qualitaet, Paywall und Richtlinien-Infrastruktur`
