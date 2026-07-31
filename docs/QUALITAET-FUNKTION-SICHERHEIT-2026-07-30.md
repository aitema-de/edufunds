# Vor dem Launch: Qualität, Funktion, Sicherheit — Stand 30.07.2026

Drei Fragen sollten belastbar beantwortet werden. Kurzfassung zuerst.

| Ziel | Ergebnis |
|---|---|
| **1. Antragsqualität 4–5 von 5** | ❌ **noch nicht** — 3,30 im Mittel. **Aber:** bei belastbaren Nutzerangaben **4,13**. Der Mittelwert wird von 11 bewusst „vagen" Korpus-Fällen gedrückt. |
| **1b. Mindestens so gut wie ungeübte Menschen** | ✅ **klar erfüllt** — +0,89 Punkte Abstand, 92 % Siege im gepaarten Blindvergleich, **0 % Niederlagen**. |
| **2. Funktionalität in allen Bereichen** | ✅ nach Reparaturen — 36/36 Browser-Tests, 25 Seiten sweep-sauber, 895 Unit-Tests grün. Sieben echte Defekte gefunden und geschlossen. |
| **3. Selbst-Pentest bleibt erfolglos** | ✅ **74 Prüfungen, 0 Funde** — nach Schließen von vier Befunden aus dem ersten Durchgang. |

Alles Folgende ist gemessen, nicht geschätzt. Jede Zahl lässt sich mit den genannten
Skripten reproduzieren.

---

## 1. Antragsqualität

### Was vorher fehlte

Die vorhandene Eval misst WIZ-01…04 in Prozent (Abschnitts-Coverage,
Halluzinations-Detektion, Tonalität, Begründungs-Substanz). Keine dieser Achsen
beantwortet „Welche Note von 5 gäbe ein Gutachter?" — und ein Vergleich gegen
menschliche Antragsteller existierte gar nicht.

### Was jetzt existiert

`scripts/eval-gutachter.ts` — eine anker-basierte 1–5-Rubrik mit sieben gewichteten
Kriterien (Bedarf, Wirkungslogik, Umsetzung, Passung, Finanzen, Verstetigung, Form).
Die Skala hat Entscheidungs-Anker, keine Schulnoten-Anmutung:

```
5 = bewilligungsfähig ohne Nachfragen
4 = förderwürdig, höchstens kleinere Nachfragen
3 = grenzwertig, ohne Nachbesserung nicht bewilligungsfähig
2 = deutlich unzureichend
1 = unbrauchbar, Ablehnung
```

**Bias-Kontrollen** (sonst misst man das Modell, nicht das Produkt):

- **Blind** — der Judge sieht keine Arm-Kennzeichnung.
- **Zwei Judges verschiedener Anbieter**: `gemini-2.5-pro` als Referenz (anderer
  Anbieter als der Generator `mistral-small`, damit Selbstbevorzugung innerhalb
  einer Modellfamilie ausgeschlossen ist), `mistral-large` als Gegenprobe. Werte
  werden immer auch einzeln berichtet.
- **Längen-Neutralisierung** — der Judge wird ausdrücklich angewiesen, Länge nicht
  als Qualität zu lesen (KI-Arm 12.661 Zeichen, Laien-Arm 2.036).
- **Positions-Bias** — der gepaarte Vergleich läuft in BEIDEN Reihenfolgen; nur ein
  beidseitig gleiches Urteil zählt als Sieg.
- **Kein Zwangsurteil** — jedes Kriterium darf „nicht bewertbar" sein.

### Der Vergleichsarm „ungeübter Mensch"

Ehrlich benannt: **eine Simulation**, kein echter Mensch. Sie ist aber strukturell
fair gebaut — sie bekommt

- exakt dieselben Interview-Antworten (im Korpus von Hand als realistische
  Laien-Aussagen autorisiert),
- **kein** Richtlinien-Dossier — genau das ist der Unterschied zwischen „Schule
  schreibt selbst" und „EduFunds schreibt": die Schule kennt ihr Projekt, nicht die
  Bewertungskriterien des Gebers,
- einen Durchgang, keine Revision, keine Substanz-Nachbesserung,
- laienübliche Länge statt Formularausnutzung.

Der gemessene Abstand ist damit der Beitrag der Plattform, nicht der des Modells.
Die erzeugten Texte liegen unter `data/eval/laien-antraege/` und lesen sich
entsprechend („Liebe Leute vom Kultur-macht-stark-Programm… die müssten wir aber
noch fragen").

### Ergebnis (n = 25, zwei Judges, 50 Einzelurteile + 50 Paarurteile)

| Arm | Mittel | Stdabw | Min | Max |
|---|---|---|---|---|
| **KI (EduFunds)** | **3,30** | 0,65 | 2,06 | 5,00 |
| Laie (simuliert) | 2,41 | 1,00 | 1,00 | 4,55 |

Pro Judge: gemini 3,11 / mistral-large 3,48 (KI) gegen 2,29 / 2,53 (Laie) — die
Rangfolge ist bei beiden Judges dieselbe.

**Gepaarter Blindvergleich, beide Reihenfolgen:**
KI besser **46 von 50 (92 %)** · Laie besser **0** · unentschieden 4.

> Ziel 1b ist damit belegt, nicht behauptet: Der Laien-Arm gewinnt **kein einziges**
> Paarurteil.

### Warum 3,30 und nicht 4,x — die entscheidende Aufschlüsselung

Ein zweiter Lauf hat den Korpus nach Input-Qualität getrennt und zusätzlich einen
Diagnose-Arm gemessen (`ki-ohne-marker`: derselbe Text, nur deterministisch von den
Arbeitsmarkern `[TODO: …]` / `[Annahme: …]` befreit — es wird nichts erfunden):

| Input-Qualität | n | KI | ohne Marker | Ø TODO-Marker |
|---|---|---|---|---|
| **hochwertig** | 5 | **4,13** | **4,37** | 2,0 |
| mittel | 9 | 3,28 | 3,54 | 3,6 |
| vag | 11 | 3,00 | 3,36 | 6,4 |

**Bei belastbaren Nutzerangaben liegt das Produkt bereits im Zielkorridor.** Der
Gesamtmittelwert 3,30 entsteht, weil 11 von 25 Korpus-Einträgen bewusst Fälle sind,
in denen der Nutzer auf fast jede Frage „weiß nicht so genau" antwortet. Genau dort
kann auch kein Mensch einen förderfähigen Antrag schreiben — der Laien-Arm liegt in
derselben Kategorie bei 1,0–2,4.

Zwei Größen, die sich getrennt bewegen lassen:

1. **Formabzug durch Arbeitsmarker: 0,31 Punkte** (3,32 → 3,63; Kriterium „Sprache
   und formale Reife" 3,00 → 3,62). Beide Judges nennen unabhängig denselben Satz:
   *„durch zahlreiche TODO-Vermerke klar als unfertiger Entwurf erkennbar und nicht
   einreichungsreif."* Die Marker sind eine bewusste Produktentscheidung
   („Kennzeichnen statt verbieten", 02.07.2026) und inhaltlich richtig — sie stehen
   nur an der falschen Stelle, nämlich mitten im Antragstext.
2. **Substanzlücke, von Markern unabhängig.** Der Finanzplan bleibt auch ohne Marker
   das schwächste Kriterium (2,54 → 2,64; 39 von 50 Urteilen ≤ 3). Standardsatz:
   *„benennt zwar Posten, enthält aber keinerlei konkrete Zahlen … und ist somit
   nicht prüfbar."* Diese Zahlen **darf** die Pipeline nicht erfinden — das wäre
   Halluzination, und die Halluzinations-Achse steht bei 98,9 %.

### Was daraus folgt (Entscheidungen für Kolja, keine stillen Änderungen)

**A — Marker aus dem Antragstext herauslösen.** Gemessene Wirkung: **+0,31**.
Vorschlag: Der Antragstext bleibt sauber, die offenen Punkte wandern in eine
separate, prominente Liste „Das müssen Sie noch ergänzen". Inhaltlich verliert der
Nutzer nichts, der eingereichte Text liest sich fertig. Nicht umgesetzt, weil es die
Download-/Export-Darstellung ändert — das ist eine Produktentscheidung.

**B — Die Zahlen im Interview erheben.** Der größte Hebel, aber der teuerste: Alle
fünf meistgenannten Mängel (Bedarf ohne Zahlen, Finanzplan unbeziffert, Arbeitsplan
ohne Wer/Wann, Indikatoren messen Output statt Wirkung, fehlende Beschlüsse) sind
**fehlende Nutzerangaben**, keine Schreibschwäche. Der Ansatzpunkt ist
`factsCoverageBlock()` in `lib/wizard/prompts.ts` — dieselbe Mechanik, die im Juli
schon die Cluster-Häufung behoben hat.

> ⚠️ **Wichtige Einschränkung, die vor dem Bau geklärt sein muss:** Die vorhandene
> Eval kann eine Interview-Änderung **nicht messen**. Der Korpus spielt fixe
> Frage-Antwort-Paare ab; andere Fragen erzeugen dort keine anderen Antworten. Wer
> B belastbar bewerten will, braucht zuerst einen simulierten Nutzer (ein Modell,
> das die Schule spielt und aus einem Personenprofil antwortet). Ohne den misst man
> nach der Änderung dasselbe wie vorher — ein Gate, das grün lügt.

**Bereits umgesetzt (risikoarm, sofort wirksam):** Die Vorab-Ampel prüft jetzt auch
**beantragte Fördersumme** und **Schülerzahl** — die beiden Angaben, deren Fehlen die
Gutachter am häufigsten rügen. Der Nutzer sieht sie, solange er sie noch nachliefern
kann. Bewusst als Hinweis, nicht als Blocker (`lib/wizard/facts-readiness.ts`,
Tests in `__tests__/lib/facts-readiness-gutachter-luecken.test.ts`).

### Reproduzieren

```bash
# Baseline (KI vs. Laie, mit Paarvergleich)
npx tsx --env-file=.env.local scripts/eval-gutachter.ts \
  --judges=gemini,mistral-large --arms=ki,laie

# Marker-Diagnose (Formabzug isolieren, nach Input-Qualität aufgeschlüsselt)
npx tsx --env-file=.env.local scripts/eval-gutachter.ts \
  --judges=gemini,mistral-large --arms=ki,ki-ohne-marker --no-pairwise
```

Berichte: `data/eval/gutachter-reports/`. Kein Pipeline-Lauf nötig — die Bewertung
läuft gegen die vorhandenen Snapshots, gemessen wird `finalText`, also genau das
Artefakt, das der zahlende Kunde herunterlädt.

---

## 2. Funktionalität

Sieben echte Defekte, gefunden über Route-Sweep, Browser-Tests und einen neuen
visuellen Sweep. Alle geschlossen und mit Tests festgenagelt.

### 🔴 Der schwerste: Der Health-Check war eingefroren

`/api/health` und `/api/health/backend` waren `force-static`. Next hat die Antwort
**beim Build einmal erzeugt** und als Datei ausgeliefert
(`.next/server/app/api/health.body`).

Nachgewiesen mit abgeschalteter Datenbank:

```
{"status":"healthy","checks":{"database":true,"timestamp":"2026-07-30T12:41:27.012Z"}}
```

— HTTP 200, `database: true`, während gar keine Datenbank erreichbar war. Der
Zeitstempel war bei jedem Aufruf identisch.

Daran hingen **drei** Wächter, alle blind:

- Docker-Healthcheck (`docker-compose.prod.yml`)
- Traefik-Loadbalancer-Healthcheck
- `scripts/monitor.sh` gegen `https://edufunds.org/api/health`

Ein Container mit toter Datenbank wäre „healthy" geblieben, Traefik hätte weiter
Traffic hingeschickt, das Monitoring hätte nie alarmiert.

**Nach der Reparatur** (`force-dynamic`), gleicher Test: HTTP **503**,
`"status":"unhealthy"`, `"database":false`, Zeitstempel läuft.
Nebeneffekt: Der Build braucht keine Datenbank mehr — vorher scheiterte er, wenn die
DB langsam war (real erlebt, Timeout nach 60 s).

Zusätzlich gefixt: `duration` im Backend-Health mischte `Date.now()` mit
`performance.now()` und meldete deshalb `-1785415285926ms` — rund minus 56 Jahre.

### 🔴 Ein 404-Aufruf hat den Programmkatalog dauerhaft durcheinandergeworfen

`app/not-found.tsx` enthielt:

```js
foerderprogrammeData.sort(() => 0.5 - Math.random()).slice(0, 3)
```

`.sort()` arbeitet **in place** — und zwar auf dem importierten Katalog-Array selbst.
Im Serverprozess teilen sich alle Module dasselbe Objekt. **Ein einziger Aufruf einer
404-Seite hat damit die Reihenfolge des gesamten Katalogs für den restlichen
Lebenszyklus des Containers zufällig verändert** — für die Programmliste, das Archiv
und alles andere, was sich auf die Katalog-Reihenfolge stützt.

Sichtbare Folge: Auf `/archiv` wich die serverseitig gerenderte Reihenfolge von der
clientseitigen ab, React brach das Hydrieren mit Fehler #418 ab (Seite bleibt
teilweise tot). Dazu ist `() => 0.5 - Math.random()` kein gültiger Vergleicher und
hätte auf der 404-Seite selbst einen Hydration-Mismatch erzeugt.

Ersetzt durch eine deterministische Auswahl. Wächter-Test verhindert die Rückkehr.

### Weitere geschlossene Defekte

| Befund | Wirkung | Status |
|---|---|---|
| **Toter Link `/login`** im Registrierungsweg („Bereits registriert? Hier anmelden") — die Seite existiert nicht | Nutzer landet mitten im Conversion-Pfad auf 404 | zeigt jetzt auf `/antrag/meine` (Magic-Link); Wächter prüft **alle** internen Links gegen den Router-Baum |
| **Hydration-Mismatch** durch CSP-Nonce am JSON-LD im Root-Layout | React #418, Hydrierung bricht ab | `suppressHydrationWarning` gezielt für dieses Element |
| **Querscrollen auf dem Telefon** in der Programmliste (696 px bei 390 px Viewport) | Die zentrale Katalogseite ruckelt seitwärts | `min-w-0 max-w-full` an den Flex-Kindern — `truncate` greift jetzt |
| **Wegwerf-Test-DB 12 Migrationen hinterher** (`scripts/test-db-setup.mjs` hatte 002+003 fest verdrahtet, im Repo liegen 002–015) | Jeder Test lief gegen ein Schema, das es in Produktion nicht gibt | liest jetzt alle Migrationen |
| **Gemini-Fallback tot** (`gemini-2.0-flash` von Google abgeschaltet) + **DeepSeek-Key ungültig (401)** | Beide dokumentierten Ausweichprovider trugen nicht — Mistral war unbemerkt ein Single Point of Failure | Modell-ID gezogen; neues `scripts/smoke-provider-matrix.ts` prüft **jeden** deklarierten Provider, nicht nur den aktiven 🔴 **DeepSeek-Key muss Kolja erneuern** |

### Testabdeckung: was vorher blind war

- **Route-Sweep** hatte 15 Seiten fest verdrahtet, 9 echte Seiten fehlten (der
  komplette Kontingent-Kaufbereich, alle Admin-Seiten, `/avv`, der Wizard-Einstieg,
  die Download-Seite), 2 gelistete Seiten gab es nicht mehr. → Die Liste kommt jetzt
  aus dem **Build-Manifest** und kann nicht mehr veralten. 25 Seiten.
- **Playwright** zog `kaufpfad.spec.ts` mit, obwohl die Datei nur über ihren eigenen
  Orchestrator laufen kann → **7 dauerhaft rote Tests**, die gar nicht grün werden
  konnten. Dazu 8 Tests gegen ein Inline-Formular, das es seit dem Wizard-Umbau
  nicht mehr gibt, und ein Selektor, der die Wortmarke als Textknoten suchte,
  obwohl sie ein SVG-Logo ist. Eine Suite mit permanent roten Tests erzieht dazu,
  Rot zu übersehen.
  → Ausgeschlossen bzw. auf das tatsächliche Verhalten umgeschrieben (inklusive
  einer Prüfung der KI-Kennzeichnung nach AI Act Art. 50 am Deep-Link-Einstieg).
- **Neu: `scripts/visual-sweep.mjs`** — 18 Seiten × Desktop und Telefon: Screenshots
  zum Ansehen **plus** Messwerte, die kein Bild zeigt (Querscrollen, H1-Zahl,
  Seitentitel, leere Überschriften, Konsolenfehler). Genau dieser Sweep hat den
  toten `/login`-Link und das mobile Querscrollen gefunden.

### Stand nach den Reparaturen

```
Unit-/Integrationstests   899 grün (3 übersprungen), 109 Suiten  — vorher 875
Playwright                36 grün, 0 rot                          — vorher 30 rot
Route-Sweep               25 Seiten, 4 GET-APIs, 21 POST-Fälle → 0 Funde
Visueller Sweep           18 Seiten × 2 Breiten → 0 Funde          — vorher 13
Selbst-Pentest            74 Prüfungen → 0 Funde                   — vorher 4
Typecheck                 sauber
```

Kleinigkeit nebenbei behoben: Die Admin-Anmeldung hatte gar keine Überschrift-Ebene
(`h1=0`) — Screenreader-Nutzende springen über Überschriften und hatten dort keinen
Einstiegspunkt. Jetzt `<h1>`, Aussehen unverändert.

---

## 3. Selbst-Pentest

`scripts/pentest.mjs` — 74 Prüfungen in acht Kategorien, wiederholbar, auch gegen
Staging/Produktion fahrbar (`--safe` lässt alles Schreibende weg).

Gefahren gegen einen **Produktions-Build** (`next build` + `next start`,
`NODE_ENV=production`) mit **abgeschaltetem Paywall-Bypass** gegen eine Wegwerf-DB.
Jede Prüfung schaut in den **Inhalt** der Antwort, nicht nur auf den Status — ein 200
allein beweist nichts.

### Erster Durchgang: 4 Funde

| Fund | Bewertung | Reparatur |
|---|---|---|
| `/api/newsletter/preview` **ohne jede Authentifizierung** erreichbar (HTTP 200) — als einzige der vier Newsletter-Routen | Kein Personenbezug (rendert Testinhalte), aber öffentlich einsehbare Redaktionsansicht inkl. Ausgabennummer, Betreff, „Empfänger: Alle bestätigten Abonnenten" und Link in die Versand-Administration | `requireAdmin`, wie `/issues` und `/send` |
| **Vier eigene Kopien der IP-Ermittlung** lasen den **ersten** `X-Forwarded-For`-Eintrag — den der Client frei erfinden kann (`admin/login`, `feedback`, `newsletter`, `newsletter/send`) | Die jeweiligen Zähler ließen sich mit einem mitgeschickten Header **pro Anfrage zurücksetzen**: Login-Bremse (5/15 min), Feedback-Limit, Newsletter-Spamschutz, Sende-Limit. Gebremst hat nur noch das Middleware-Limit. | Alle vier auf das zentrale `getClientIP` gezogen (liest von **rechts**, wo der Reverse-Proxy die echte Peer-IP anhängt) |
| **`X-Forwarded-For` in `/api/wizard/start` als Herkunfts-IP gespeichert** | Die auf der Sitzung protokollierte IP war beliebig fälschbar | dito |
| **22 Serverfehler (HTTP 500)** bei leerem oder kaputtem Request-Body über 11 Routen | Kein Einbruchsweg, aber die falsche Antwort auf einen Client-Fehler — und echte 500er verschwinden im Rauschen, wenn jeder Scanner welche erzeugt | Gemeinsamer Body-Leser `lib/json-body.ts` → **400**; Wächter erzwingt, dass keine Route den Parse-Fehler ungefangen lässt |

### Zweiter Durchgang: **74 Prüfungen, 0 Funde**

Was dabei ausdrücklich **hält** (Auswahl):

- **Bezahlschranke** — Dev-Mock-Freischaltung 403; erfundene Stripe-Session,
  geratener Gutschein-Code und Rechnungskauf auf unbekannte Sitzung schalten
  nichts frei.
- **Stripe-Webhook** — ohne Signatur und mit falscher Signatur abgewiesen; korrekt
  signiert angenommen (die Prüfung rechnet also wirklich).
- **Fremdzugriff** — fremdes Wizard-Token, fremdes Download-Token, Antragsliste ohne
  Identität, Schreiben in fremde Sitzung, Pfad-Traversal in drei Kodierungen: alles dicht.
- **Admin** — JWT mit `alg=none` und mit falschem Secret abgewiesen; Origin-Prüfung
  (CSRF) greift; Cookie ist HttpOnly + SameSite; SQL-Injection im Login wirkungslos.
- **CSP** — Nonce wechselt pro Request, kein `unsafe-inline`/`unsafe-eval`,
  `object-src 'none'`, `frame-ancestors 'none'`; kein CORS-Wildcard.
- **Informationsabfluss** — `.env`, `.git/config`, `package.json`, Migrationen,
  Katalog-JSON: nicht ausgeliefert; keine Stacktraces, Pfade oder Schlüssel in
  Fehlerantworten; Admin-Dashboard zeigt ohne Login nichts.
- **Rate-Limit-Integrität** — greift trotz gefälschtem XFF-Präfix; Telemetrie hungert
  funktionale Routen nicht aus (der Bucket-Fix vom 22.07. hält).

### Ein Befund bleibt offen — bewusst, und er ist bereits als Go-Live-Gate notiert

**Produktion läuft mit `--with-paywall-bypass`.** Solange nur die freigeschaltete IP
die App sieht, ist das unproblematisch. Zwei Konsequenzen, die im Gate mitgedacht
werden sollten:

1. Mit aktivem Bypass schaltet `/api/wizard/checkout/dev-mock` **jede** Sitzung ohne
   Zahlung frei — wer die App erreicht, zahlt nicht.
2. Die Flag multipliziert **alle** Rate-Limits mit 10 (`lib/rate-limit.ts`). Das
   betrifft auch den Login-Bruteforce-Schutz (10 → 100 Versuche/15 min) und die
   Missbrauchsbremse beim Rechnungskauf (3 → 30 pro 24 h).

Beides verschwindet mit dem ohnehin geplanten Neu-Deploy ohne die Flag. Der
Regressionstest `pentest-regressionen.test.ts` nagelt fest, dass die Route ohne Flag
403 antwortet; der Pentest prüft es zur Laufzeit (D1).

### Reproduzieren

```bash
node scripts/test-db-setup.mjs
NEXT_PUBLIC_PAYWALL_DEV_MOCK=0 npx next build
NODE_ENV=production DATABASE_URL=<edufunds_test> ... npx next start -p 3199
node scripts/pentest.mjs --base http://127.0.0.1:3199 --json bericht.json

# gegen Staging/Prod nur lesend:
node scripts/pentest.mjs --base https://staging.edufunds.org --safe
```

---

## Was Kolja selbst tun muss

1. **DeepSeek-API-Key erneuern** — antwortet mit 401. Zusammen mit dem
   abgeschalteten Gemini-Modell war die Folge: kein funktionierender Ausweichprovider,
   falls Mistral ausfällt. (Gemini ist repariert, DeepSeek braucht einen neuen Key.)
2. **Entscheidung A** (Marker aus dem Antragstext in eine separate Liste) — gemessene
   Wirkung +0,31 Punkte, ändert die Export-Darstellung.
3. **Entscheidung B** (Interview erhebt Zahlen) — größter Hebel, braucht aber
   **vorher** einen simulierten Nutzer im Eval, sonst ist die Wirkung nicht messbar.
4. **Go-Live-Ablauf** wie geplant: Prod ohne `--with-paywall-bypass` neu deployen und
   die IP-Schranke im selben Schritt entfernen.

## Neue Werkzeuge

| Werkzeug | Zweck |
|---|---|
| `scripts/eval-gutachter.ts` | Gutachterurteil 1–5, Laien-Vergleichsarm, Marker-Diagnose, Aufschlüsselung nach Input-Qualität |
| `scripts/pentest.mjs` | 74 Sicherheitsprüfungen, wiederholbar, prod-tauglich mit `--safe` |
| `scripts/visual-sweep.mjs` | Screenshots + Layout-Messwerte über 18 Seiten × 2 Breiten |
| `scripts/smoke-provider-matrix.ts` | prüft **jeden** deklarierten LLM-Provider gegen die echte API |
| `lib/json-body.ts` | gemeinsamer Body-Leser: Client-Fehler bleibt 400 |
| `__tests__/api/pentest-regressionen.test.ts` | 14 Wächter gegen die Rückkehr der Sicherheitsbefunde |
| `__tests__/app/interne-links.test.ts` | jeder interne Link muss auf eine existierende Route zeigen |
| `__tests__/lib/facts-readiness-gutachter-luecken.test.ts` | die zwei Pre-Flight-Regeln aus der Gutachter-Messung |
