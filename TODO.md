# DRINGEND: Entwicklungsauftrag von Kolja — 17.02.2026

> Lies das KOMPLETT bevor du irgendetwas tust.

---

## KONTEXT: Was passiert ist

Kolja hat die Production Landing Page (index.html) manuell ersetzt. Die neue Seite ist **statisches HTML** mit neuem Design (Parchment-Hintergrund, Gold-Akzente, Geometric Grid). **Diese Datei NICHT überschreiben!**

Deine Cron-Job-Prompts für Förderprogramm-Scans wurden verschärft (kuratierte Quellen, Pflicht-Verifikation, Confidence-Scoring). Die sind bereits in deinen Cron-Jobs aktiv.

---

## KRITISCHE PROBLEME (von Koljas Review)

### 1. Antrags-KI funktioniert NICHT — Architektur-Bug
- Deine API-Route /api/generate-antrag hat `export const dynamic = 'force-static'` — das bedeutet sie wird als leere Datei exportiert und kann KEINE POST-Requests verarbeiten
- Kein GEMINI_API_KEY in .env oder .env.local konfiguriert (nur in .env.example)
- current_state.md sagt selbst: "Läuft im Fallback-Modus"
- **Kernproblem:** Static HTML Export + API-Routes = geht nicht. Du musst entweder Next.js als Server laufen lassen ODER ein separates Backend für die KI aufsetzen
- **HINWEIS:** Der GEMINI_API_KEY ist in deinem Gateway-Service konfiguriert (edufunds-gateway.service). Nutze den.

### 2. Staging existiert NICHT
- Der Container edufunds-staging-new ist weg
- Du kannst die Antrags-KI nirgendwo testen
- **SOFORT** Staging wieder aufsetzen!

### 3. Klaus Tschira Stiftung noch in der Liste
- Kolja hat das als Beispiel für schlechte Datenqualität genannt
- Deine Link-Validierung markiert es als OK, aber es gibt KEIN spezifisches Förderprogramm für Schulen
- Es redirectet nur zur allgemeinen Förderseite
- **Entfernen oder als MEDIUM markieren**

---

## AUFGABEN (Reihenfolge!)

### SCHRITT 1: Staging aufsetzen (BLOCKER)
Ohne Staging kannst du nichts entwickeln. Setze einen Next.js Dev-Server auf, der als Staging dient.

### SCHRITT 2: Antrags-KI zum Laufen bringen (HAUPTAUFGABE)

Das ist das HERZSTÜCK von EduFunds. Die zentrale Botschaft an Schulen:
**"Passende Förderung finden — und den Antrag von der KI schreiben lassen. Sie prüfen nur noch."**

Was funktionieren muss:
1. **Schulprofil erfassen:** Name, Schultyp, Bundesland, Schülerzahl, Schwerpunkte
2. **Förderprogramm wählen:** Aus der Liste oder Empfehlung basierend auf Profil
3. **Projektidee eingeben:** 3-5 Sätze was gefördert werden soll
4. **KI generiert den Antrag:** Projektbeschreibung, Finanzplan, Begründung — komplett
5. **Review + Export:** User prüft, bearbeitet, exportiert als PDF

Technisch:
- GEMINI_API_KEY ist in edufunds-gateway.service vorhanden
- Entweder: Next.js als Server (nicht static export) für API-Routes
- Oder: Separater Express/Fastify-Endpoint für die Antragsgenerierung
- Streaming-Response für bessere UX

### SCHRITT 3: Design aller Unterseiten angleichen

Alle Seiten (impressum, datenschutz, foerderprogramme, kontakt, preise, etc.) müssen zum neuen Landing Page Design passen:
- Hintergrund: Parchment #f8f5f0 (NICHT dunkel!)
- Primärfarbe: Gold #c9a227
- Text: Navy #0a1628
- Fonts: DM Serif Display + Plus Jakarta Sans
- Patterns: geometric-grid (60px) + dots-pattern (24px gold)
- Cards: Weißer Hintergrund, subtiler Border
- Header: Dunkles Glass mit Euro-Logo
- Footer: Dunkel mit Gold-Accent

**Referenz-Datei:** /home/edufunds/edufunds-app/dist/index.html — LESEN, NICHT ÄNDERN

### SCHRITT 4: Programmzahl in Landing Page korrigieren
- Landing Page zeigt "50+" — tatsächlich hast du 129 Programme
- Ändere NUR die Zahl im Stats-Card auf "120+" (gerundet)
- Ändere auch das Nav-Badge von "50+" auf "120+"
- SONST NICHTS an index.html ändern!

---

## REGELN

1. **Staging first.** Entwickle auf Staging, deploye erst nach Smoke-Test auf Production.
2. **index.html ist tabu** (außer der Programmzahl, s.o.)
3. **Keine Stereotype in der Sprache.** Nicht "Fachchinesisch" — stattdessen "Behördendeutsch". Merken!
4. **Zahlen nicht erfinden.** Jede Zahl aus echten Daten.
5. **Berichte Fortschritt via Telegram** an Kolja.
6. **Bei Unsicherheit: fragen.**
