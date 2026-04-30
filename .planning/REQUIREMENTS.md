# Requirements: EduFunds

**Defined:** 2026-04-30
**Core Value:** Programme werden nicht generisch verarbeitet — der Wizard nutzt programm-spezifisches Wissen (Dossier), um zielgerichtet zu fragen und einen Antrag zu erstellen, der zu 100 % den Förderkriterien entspricht, semantisch hochwertig ist, nicht halluziniert und maximale Förderwahrscheinlichkeit erzielt.

## v1 Requirements

Requirements für aktuelle Milestone (Live-UAT-Reife für Schulen + Schulfördervereine, interner Testbetrieb mit 3-5 Pilot-Anwendern).

### Matching

- [ ] **MATCH-01**: Eval-Korpus mit 20–30 realistischen Schul-Anliegen (kurz/ausführlich/vag), jeweils mit `expected_top3` und `expected_off_target` — kuratiert von Kolja, dient als Regressions- und Verbesserungs-Messlatte
- [ ] **MATCH-02**: Matcher liefert strukturierte Begründung pro Treffer (passt-weil + Achtung-bei) statt 15-Wort-Pauschale
- [ ] **MATCH-03**: Matcher erkennt vages Anliegen und stellt Klärungsfrage, bevor er rankt

### Programm-Fetch + Cronjobs

- [ ] **FETCH-01**: Cron-Skripte `extract-richtlinie.ts` + `scan-new-programs.ts` von Gemini-direkt auf `lib/wizard/llm.ts`-Wrapper umstellen, Default DeepSeek `deepseek-v4-flash`
- [ ] **FETCH-02**: Vollautomatischer Programm-Pflegeprozess Scanner → Extractor → Queue (Scanner findet neue Programme, Extractor erstellt Dossier, neues Programm landet automatisch in `data/richtlinien-prioritaeten.json` mit Queue-Score)
- [ ] **FETCH-03**: Dossier-Schema-Erweiterung um (a) Best Practices erfolgreicher Anträge, (b) typische Reject-Gründe, (c) programm-spezifische Vorbild-Formulierungen, (d) Frist-Logik (rolling vs. fixe Stichtage)
- [ ] **FETCH-04**: Bestehende 11 Dossiers auf erweitertes Schema migrieren

### Antragswizard-Qualität

- [ ] **WIZ-01**: Pipeline-Tuning für höhere Programmkonformität (Eval gegen Pflichtabschnitte/Zeichenlimits aller 11 Dossiers)
- [ ] **WIZ-02**: Pipeline-Tuning für höhere Halluzinations-Resistenz (Eval mit verschärften niedrig-qualitativen Test-Inputs)
- [ ] **WIZ-03**: Pipeline-Tuning für höhere Förderwahrscheinlichkeit (semantische Qualität, „passt-zum-Geber"-Tonalität pro Geber-Typ)
- [ ] **WIZ-04**: Reload-Resume in laufendem Wizard schließen (UX-Lücke aus UAT-Memo 28.04.)

### Live-UAT

- [ ] **UAT-01**: Strukturiertes UAT mit 3–5 echten Schulen / Schulfördervereinen aus Koljas Netzwerk durchführen
- [ ] **UAT-02**: UAT-Befunde-Tracker pro Live-Session (analog zu `~/.claude/projects/-home-kolja/memory/edufunds-uat-pipeline-befunde-2026-04-28.md`)
- [ ] **UAT-03**: Bug-Fix-Welle nach UAT-Befunden konsolidieren und Pipeline iterativ schärfen (analog zur 28.–30.04.-Fix-Welle)

## v2 Requirements

Deferred — kommt in der Milestone nach UAT-Stabilität.

### Stripe + Paywall

- **PAY-01**: Stripe-Account-Anlage (Pfad A: neuer EduFunds-Account unter aitema GmbH)
- **PAY-02**: Stripe-Live-Keys + Webhook-Secret + Price-ID in Production-Env
- **PAY-03**: `invoice_creation: { enabled: true }` in `app/api/wizard/checkout/route.ts` für B2B-Rechnungen
- **PAY-04**: Optional: Stripe Tax / `automatic_tax` für USt-Konformität

### Auth + Schulträger-Abos

- **AUTH-01**: Auth-System (User-Accounts, Login)
- **SUB-01**: Jahresabos für Schulträger (Schulträger zahlt einmalig, viele Anträge)
- **SUB-02**: Schul-Profil persistent gespeichert (statt localStorage)

### Production-Migration

- **PROD-01**: Migrationen 002 + 003 auf Staging applizieren
- **PROD-02**: Migrationen auf Production applizieren
- **PROD-03**: Wizard-Branch nach `main` mergen und ausrollen

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile-App | Web-First, Mobile-Browser akzeptabel — mobile native Performance nicht kritisch |
| Mehrsprachigkeit | Deutsch only, deutscher Bildungssektor — keine internationale Zielgruppe |
| Vollautomatische Antragseinreichung beim Geber | User schickt selbst ein, Plattform liefert nur den Volltext — rechtlich/prozessual zu komplex |
| 5 Legacy-Test-Suites fixen | Pre-Existing aus Vor-Wizard-Phase (Header.test, Footer.test, ki-antrag-generator.test, backend-utils.test, contact.test), kein Wizard-Qualitäts-Impact |
| Newsletter / Resend-Integration | Nicht im aktuellen Scope der KI-Pipeline |
| Web-Frontend-Redesign | Aktuelles Frontend reicht für UAT-Reife |
| Zusätzliche LLM-Provider (OpenAI, Anthropic) | DeepSeek + Gemini-Fallback decken Provider-Diversifikation ausreichend ab |

## Traceability

Phasen-Mapping wird vom Roadmapper befüllt (Step 8).

| Requirement | Phase | Status |
|-------------|-------|--------|
| MATCH-01 | TBD | Pending |
| MATCH-02 | TBD | Pending |
| MATCH-03 | TBD | Pending |
| FETCH-01 | TBD | Pending |
| FETCH-02 | TBD | Pending |
| FETCH-03 | TBD | Pending |
| FETCH-04 | TBD | Pending |
| WIZ-01 | TBD | Pending |
| WIZ-02 | TBD | Pending |
| WIZ-03 | TBD | Pending |
| WIZ-04 | TBD | Pending |
| UAT-01 | TBD | Pending |
| UAT-02 | TBD | Pending |
| UAT-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 0 (Roadmap noch nicht erstellt)
- Unmapped: 14 ⚠️

---
*Requirements defined: 2026-04-30 (brownfield onboarding from feature/wizard-adaptive HEAD 49a1102)*
*Last updated: 2026-04-30 after initial definition*
