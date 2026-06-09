# 🤖 Agenten-Team – EduFunds

## Report-Mode Policy (Ab sofort gültig)

**Wenn ein Agent:**
- ❌ Nicht weiterkommt (Blockade >30 Min)
- ❌ Unklar ist was als nächstes zu tun ist
- ✅ Fertig ist (Task abgeschlossen)
- ⚠️ Fehler erhält (API, Build, etc.)

**Dann muss er sich MELDEN bei mir (Main Agent):**
- Kurze Zusammenfassung: Was wurde erreicht?
- Status: Erfolg / Teilweise / Fehler
- Nächster Schritt: Was empfiehlt der Agent?
- Offene Punkte: Was blockiert?

**Nie wieder:** Still aufhören ohne Bericht!

---

## Aktuelles Agenten-Team

### 1. 🔍 Fördermittel-Verifizierungs-Agent
**Name:** `Verifizierung-IterationX`  
**Aufgabe:** Fördersummen verifizieren (5% pro Iteration)  
**Status:** 🔄 Iteration 8 läuft  
**Briefing-Template:**
```
Ziel: 6 Programme verifizieren
Input: data/foerderprogramme.json (mit verificationWarning)
Output: /docs/VERIFIZIERUNG_ITERATION[X].md
Erfolgskriterium: +5% verifizierte Programme
```

---

### 2. 🤖 KI-Antrag-Generator-Agent
**Name:** `KI-Antrag-Bugfix` / `KI-Antrag-Test`  
**Aufgabe:** KI-Antragsgenerator testen & verbessern  
**Status:** ✅ Bugfix fertig, wartet auf neue Features  
**Skills:** Gemini API, Prompt-Engineering, Testing  
**Briefing-Template:**
```
Ziel: [Feature testen / Bug fixen / Prompt verbessern]
Input: /app/api/assistant/generate/route.ts
Output: Getesteter, funktionierender Code
Erfolgskriterium: API gibt gültige Antragsentwürfe zurück
```

---

### 3. 📧 Newsletter-Expert-Agent
**Name:** `Newsletter-Status-Check` / `Newsletter-V2`  
**Aufgabe:** Newsletter-System verwalten & verbessern  
**Status:** ⏳ Wartet auf API-Keys (Resend)  
**Skills:** E-Mail-Templates, Resend API, Double-Opt-In  
**Briefing-Template:**
```
Ziel: [Status-Check / Template erstellen / Versand testen]
Input: /lib/newsletter.ts, /app/api/newsletter/
Output: Funktionierendes Newsletter-Feature
Erfolgskriterium: E-Mail wird versendet & angezeigt
```

---

### 4. 🔎 Fördermittel-Scout-Agent
**Name:** `cron:foerderprogramm-scan-daily`  
**Aufgabe:** Täglich neue Förderprogramme recherchieren  
**Status:** ✅ Auto-Cron (täglich 07:00)  
**Trigger:** Automatisch via cron  
**Output:** Bericht an Main Agent

---

### 5. 🎨 UI/UX-Design-Agent
**Name:** *Noch nicht aktiv*  
**Aufgabe:** Komponenten designen, Layouts verbessern  
**Status:** ⏳ Verfügbar bei Bedarf  

---

### 6. 🧪 QA-Test-Agent
**Name:** *Noch nicht aktiv*  
**Aufgabe:** End-to-End Tests, Regressionstests  
**Status:** ⏳ Verfügbar bei Bedarf  

---

## Agenten-Briefing-Template (Standard)

```markdown
## 🎯 AUFGABE: [Konkrete Task-Beschreibung]

### Kontext
- Ausgangslage: [Was ist der aktuelle Stand?]
- Ziel: [Was soll erreicht werden?]
- Priorität: [HOCH/MITTEL/NIEDRIG]

### Input
- Dateien: [Welche Dateien sind relevant?]
- Daten: [Welche Daten werden gebraucht?]

### Output
- Dateien: [Was soll erstellt/aktualisiert werden?]
- Report: [/docs/REPORT_[AGENT]_[DATUM].md]

### Erfolgskriterium
- [Messbares Ziel: z.B. "6 Programme verifiziert"]
- [Qualitäts-Check: z.B. "Build erfolgreich"]

### Grenzen
- [Was der Agent NICHT tun soll]
- [Keine Production-Deploys ohne Main-Agent!]

### Zeitlimit
- Max: [X Stunden]

### Report-Pflicht
☑️ Bei Fertigstellung
☑️ Bei Blockade (>30 Min)
☑️ Bei Unklarheit
☑️ Bei Fehlern
```

---

## Aktive Agenten-Übersicht (Live)

| Agent | Task | Status | Letztes Update |
|-------|------|--------|----------------|
| Verifizierung-Iteration8 | 6 Programme prüfen | 🔄 Running | 2026-02-12 12:41 |
| KI-Antrag-Bugfix | Bugfix .join() Error | ✅ Done | 2026-02-12 12:42 |
| Newsletter-Status-Check | Status-Report | ✅ Done | 2026-02-12 12:42 |
| Fördermittel-Scout | Tägliche Recherche | ✅ Cron | Auto 07:00 |

---

*Letztes Update: 2026-02-12*
