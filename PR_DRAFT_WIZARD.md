# PR-Draft: `feature/wizard-adaptive` → `staging`

> Wenn du den PR eröffnen willst:
> `gh pr create --base staging --head feature/wizard-adaptive --title "..." --body-file PR_DRAFT_WIZARD.md`
> (den PR-Titel entweder wie unten vorgeschlagen oder eigens wählen; Body entfernt dann den ersten Abschnitt).

---

## Adaptiver KI-Antragswizard (Phase 1)

Ersetzt auf Dauer den alten monolithischen `KIAntragAssistent` durch einen wirklich adaptiven Wizard mit mehrstufiger Generierungs-Pipeline. Der alte Assistent bleibt als `/antrag/[id]` weiter verfügbar; der Wizard ist Beta unter `/antrag/[id]/wizard`.

### Was drin ist

**Kern-Feature**
- **Interviewer** (Gemini 2.0 Flash, Cap 12 Fragen, KI entscheidet Stop): stellt programmspezifische, geber-typ-spezifische Fragen. Extrahiert strukturierte Fakten (Schule/Projekt/Wirkung/Budget/Programmpassung) aus Freitext-Antworten.
- **Pipeline** (Gemini 2.5 Pro): Gliederung → Abschnitte → Gutachten → Finalfassung. Selbstkritik-Pass filtert Floskeln.
- **Persistenz** `ki_antraege.session_token` (Migration 002, idempotent), plus localStorage-Schul-Profil, das Folgeanträge vorausfüllt.
- **Nachträgliches Editieren** beliebiger Antworten mit Rollback-Snapshot; Dialog läuft ab dort neu.
- **Session-Listing** `/antrag/meine` zeigt laufende/fertige Sessions aus localStorage + DB.
- **Kosten-Tracking** pro Session (Token-Zählung, Preismodell, formatierte EUR-Anzeige).
- **UX:** Schritt-Karte + chronologische Sidebar + strukturiertes Facts-Panel, Pipeline-Stepper, PDF/Word/Text-Export.

**Prompt-Qualität**
- Geber-Typ-Leitplanken (Bund/Land/Stiftung/EU + generisch) in Interviewer, Outline, Section, Critique, Revision.
- Anti-Floskel-Regeln (Verbotsliste, Beispiele gute vs. schlechte Frage).
- Handverlesene Extra-Kriterien für 7 große Programme: DigitalPakt, Schulpreis, Mercator, Startchancen, Ganztag, Erasmus+ Schule, Aktion Mensch.

**Housekeeping**
- `-2200 Zeilen` Altlast entfernt: alter `AntragGenerator`, `lib/antrag-pipeline.ts`, `lib/programSchema.ts`, `lib/ki-prompts.ts`, `lib/antrag-export.ts`, `app/api/generate-antrag/`.
- **Sicherheits-Fix:** `.env*` jetzt in `.gitignore` (vorher ungeschützt — `git add .` hätte Secrets committet).
- Rate-Limiter auf `/api/wizard/` ausgeweitet.
- Deploy-Skripte `scripts/deploy-{staging,production}.sh`.
- README neu, `DEV-WORKFLOW.md` und `WIZARD_RESUME.md` als Anknüpfpunkte.

### Branch-Zahlen
- **13 Commits**, +5004 / -2283 Zeilen, 45 Files touched.
- TypeScript durchgehend grün.
- Alle Seiten im Dev-Server HTTP 200.

### Architektur-Entscheidungen (alle explizit mit Kolja abgestimmt)
1. UX: Hybrid aus Schritt-Karte und chronologischer Sidebar.
2. Stop-Kriterium: KI entscheidet, Cap 12 Fragen.
3. Programm-Wissen: Auto-Extraktion aus `foerderprogramme.json` + kuratierte Extras.
4. Generierung: 4-Stage-Pipeline (Gliederung → Sections → Gutachten → Revision).
5. Persistenz: DB-Session + localStorage-Fallback.
6. Modelle: Flash für Interview, Pro für Pipeline.

### Was NICHT drin ist (bewusst)
- E2E-Test mit echtem Gemini-Key — blockiert, bis Kolja Paid-Tier-Key aus Fedos Google-Konto vorliegt.
- Cross-Device-Sync via Login/Magic-Link — Phase 2.
- Streaming/SSE für Live-Pipeline-Fortschritt — Phase 2.
- Weitere Programm-Kriterien-Dossiers — Fleißarbeit, per ~20 min/Programm ergänzbar.
- Resend-Key für Newsletter — separates Thema.

### Test-Checkliste (nach Merge auf staging, mit gültigem Gemini-Key)
- [ ] Auf `staging.edufunds.org/antrag/<id>/wizard` ein komplettes Szenario durchspielen
- [ ] Eine frühere Antwort editieren → Dialog läuft ab dort neu, Facts passen
- [ ] Zweiten Antrag starten → Schulprofil wird erkannt, 2–3 Fragen werden übersprungen
- [ ] Pipeline-Ergebnis sichten: Markdown korrekt gerendert, keine Floskeln, Abschnitte plausibel
- [ ] PDF-Export öffnet korrekt in PDF-Viewer, A4-Layout, Kopfzeile
- [ ] `/antrag/meine` zeigt Sessions mit Kosten
- [ ] Kosten-Anzeige passt grob zur Google-Cloud-Billing (±20 %)
- [ ] Migration 002 auf Staging-DB applizieren falls noch nicht geschehen

### Deploy-Pfad

```bash
# Merge PR → automatisches staging deploy über GitHub Actions,
# oder manuell:
./scripts/deploy-staging.sh --yes

# Nach Smoke-Test ok → PR staging → main, dann:
./scripts/deploy-production.sh
```

### Vorschlag für PR-Titel
`feat(wizard): adaptive KI-Antragswizard mit 4-Stage-Pipeline (Phase 1)`
