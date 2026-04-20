# Wizard — Anknüpfpunkt

> Kurzfassung: Gerüst steht und ist committet. Blocker ist ein gültiger Gemini-API-Key.
> Sobald der Key da ist: 3 Befehle und wir sind im E2E-Test.

## Wo der Stand gesichert ist
- **Branch:** `feature/wizard-adaptive`
- **Letzter Commit:** `0662011` — "feat(wizard): adaptives KI-Antragsgerüst mit Pipeline-Generierung"
- **Remote:** `origin/feature/wizard-adaptive` auf GitHub (21 Dateien, 1620 Zeilen)
- **DB-Migration `002_wizard_session.sql`** ist auf Dev-Postgres bereits appliziert (session_token-Spalte + erweiterter status-Check).
- **`.env.local`** liegt lokal, ist jetzt in `.gitignore` (Fix mit-committed).
- **`next-env.d.ts`** ist lokal modifiziert (Next.js-Auto-Gen), absichtlich nicht im Commit.

## Ampel
| Baustein | Status |
|----------|--------|
| DB-Schema | ✅ migriert |
| Typen (`lib/wizard/types.ts`) | ✅ |
| Prompts (`lib/wizard/prompts.ts`) | ✅ Interviewer + 4-Stage-Pipeline |
| Session-CRUD (`lib/wizard/session.ts`) | ✅ |
| Gemini-Client (`lib/wizard/gemini.ts`) | ✅ Flash + Pro |
| Interviewer-Loop | ✅ Cap 12, KI entscheidet |
| Pipeline | ✅ Outline → Sections → Critique → Revision |
| API-Routen | ✅ `/api/wizard/{start,answer,generate,[token]}` |
| UI-Komponenten | ✅ Schritt-Karte + chronologische Sidebar + Result-View |
| Route `/antrag/[id]/wizard` | ✅ HTTP 200 |
| TypeScript | ✅ `tsc --noEmit` clean |
| E2E-Test | 🔴 blockiert — Gemini-Key abgelaufen |

## Anknüpfen — Schritt für Schritt

### 1. Dev-Umgebung hochfahren (falls PC neu gestartet)
```bash
cd ~/edufunds-app
git checkout feature/wizard-adaptive
./scripts/dev-db-tunnel.sh --bg
nohup npm run dev > /tmp/edufunds-dev.log 2>&1 & disown
sleep 6 && curl -s http://localhost:3101/api/health
# Erwartet: {"status":"healthy","checks":{"api":true,"database":true,...}}
```

### 2. Neuen Gemini-Key einsetzen
`~/edufunds-app/.env.local` öffnen und Zeile ersetzen:
```
GEMINI_API_KEY=<neuer_key_von_fedos_google_account_mit_billing>
```
Dev-Server danach neu starten (Env-Variablen werden nicht hot-reloaded):
```bash
pkill -f 'next-server|next dev'
nohup npm run dev > /tmp/edufunds-dev.log 2>&1 & disown
```

### 3. E2E-Test starten
```bash
# Session starten:
curl -sX POST http://localhost:3101/api/wizard/start \
  -H 'Content-Type: application/json' \
  -d '{"programmId":"niedersachsen-sport"}' | python3 -m json.tool
```
Erwartete Ausgabe: `sessionToken` + erste Frage (JSON mit `question.content`).

Danach im Browser `http://localhost:3101/antrag/niedersachsen-sport/wizard` öffnen
und den Wizard interaktiv durchspielen.

## Offene Entscheidungen / Mini-Backlog
- **Aufräumen:** Doppelte API-Routen `app/api/generate-antrag/` + `app/api/assistant/generate/` sowie ungenutzter `components/AntragGenerator/` stehen weiter im Repo. Nicht dringend, aber beim nächsten Commit-Sprint entsorgen.
- **Resend-Key** fehlt weiter → Newsletter-Features nicht testbar. Separates Thema.
- **Schul-Profil-Persistenz** (projektübergreifend) wurde angedacht, ist in Phase 1 bewusst rausgelassen.
- **Pipeline-Streaming / SSE** für Live-Fortschritt im UI ist Phase 2.
- **Magic-Link zum Wiederaufnehmen** per Mail (Phase 2).
- **Kosten-Monitoring** (Token-Zählung pro Session persistieren) — Phase 2.

## Architektur-Entscheidungen (zur Erinnerung)
1. UX = Hybrid (Schritt-Karte + chronologische Sidebar)
2. Stop-Kriterium = KI entscheidet, Cap 12
3. Programm-Wissen = Extraktion aus `foerderprogramme.json` + Geber-Typ
4. Generierung = 4-Stage-Pipeline (Gliederung → Sections → Gutachten → Revision)
5. Persistenz = DB-Session in `ki_antraege` + localStorage-Fallback
6. Modelle = Gemini 2.0 Flash (Interview), Gemini 2.5 Pro (Pipeline)

## Pfad-Referenz
```
db/migrations/002_wizard_session.sql
lib/wizard/{types,prompts,session,gemini,interviewer,pipeline}.ts
app/api/wizard/{start,answer,generate,[token]}/route.ts
components/Wizard/{WizardShell,QuestionCard,ChronologySidebar,GeneratingProgress,AntragResult,index}.tsx
app/antrag/[programmId]/wizard/page.tsx
```
