# UAT-Befunde: {Schul-Name} — {Datum}

**Pilotperson:** {Name, Funktion}
**Programm:** {z. B. DigitalPakt 2.0}
**Session-Token:** {UUID aus DB — `SELECT session_token FROM ki_antraege ORDER BY updated_at DESC LIMIT 1`}
**Recording:** {Pfad, z. B. ~/edufunds-uat/2026-06-01-pilot-a.mp4}
**Session-Start:** {YYYY-MM-DD HH:MM}
**Session-Ende:** {YYYY-MM-DD HH:MM}

---

## Bug-Liste (priorisiert — high zuerst)

### Bug #1 — {kurze Beschreibung} 🔴 offen

- **Vorher (UAT-Stand):** {konkretes Symptom mit Zahlen, Zeitstempel oder Screenshots}
- **Strukturelle Ursache:** {Hypothese — Pipeline-Stage / Frontend-State / DB-Write / Eingabe-Profil}
- **Pipeline-Stage:** {outline | section | critique | revision | recheck | finanzplan | consistency | none/UI}
- **Severity:** {hoch | mittel | niedrig}
- **Fix-Richtung:** {konkrete Codeänderung, nicht abstrakt — z. B. "SECTION_SYSTEM-Prompt um Negativbeispiel für X erweitern"}
- **Reproducer:** {z. B. `npx tsx scripts/smoke-pipeline-with-extractor.ts --token {session_token}`, oder UAT-Schul-Kontext beschreiben}
- **Verifikation:** {wie nachweisen nach Fix — A/B-Vergleich mit Zahlen, Smoke-Run-Output, oder Screenshot-Vergleich}

---

### Bug #2 — {kurze Beschreibung} 🔴 offen

- **Vorher (UAT-Stand):**
- **Strukturelle Ursache:**
- **Pipeline-Stage:**
- **Severity:**
- **Fix-Richtung:**
- **Reproducer:**
- **Verifikation:**

---

*(weitere Bugs analog kopieren)*

---

## Pipeline-Hebel-Status (siehe 28.04.-Memo-Pattern)

| Hebel | Status | Befund |
|-------|--------|--------|
| #1 Outline (Gliederung aus Richtlinie / LLM-Fallback) | ✅ / ❌ / ⚠️ | {kurzer Befund, z. B. "Gliederung stimmig, 8 Abschnitte korrekt"} |
| #2 Critique (Gutachten-Stage, Finding-Liste) | | |
| #3 Recheck (Revision-Check, nur wenn Findings > 0) | | |
| #4 Konsistenz (Finanzplan vs. Antragstexte) | | |
| #5 Pre-Flight-Ampel (Facts-Extraktor vor Interviewer-nextStep) | | |

**Legende:** ✅ kein Befund / ❌ Bug gefunden / ⚠️ Warnung / — nicht getriggert (bedingte Stage übersprungen)

---

## Was die Pipeline GUT gemacht hat

- {Bullet — z. B. "Halluzinations-Verbots-Liste im SECTION_SYSTEM hat Aktenzeichen-Erfindungen verhindert"}
- {Bullet}
- {Bullet}

---

## Was schiefgegangen ist

- {Bullet — z. B. "Finanzplan enthielt Honorarsatz 'Stand DSV-Tarif 2024', der nicht im User-Input war"}
- {Bullet}
- {Bullet}

---

## Konsequenz für nächste Iteration

{1-2 Sätze — z. B. "FINANZPLAN_SYSTEM braucht explizites Verbot für Tarif-Referenzen ohne User-Quelle. Smoke-Skript mit Niedrigqualitäts-Input ergänzen."}

---

## Bug-Klassen (Referenz für Severity-Einschätzung)

| Klasse | Severity-Default | Beschreibung |
|--------|-----------------|--------------|
| Halluzination | hoch | Pipeline erfindet Fakten (Aktenzeichen, Tarife, Phasenpläne) |
| Rendering | mittel | UI zeigt anderen Wert als DB-Stand |
| Auswertung | mittel–hoch | Critique-/Recheck-/Konsistenz-Stage übersieht Lücke |
| UX-Lücke | niedrig–mittel | Pilotperson versteht Schritt nicht, kein technischer Fehler |
| Performance | mittel | Stage > 30 s, Browser-Hänger ohne Stage-Feedback |
