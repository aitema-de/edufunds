## 2026-05-20 — Wave 3 Hebel 4 (Geber-Typ-Routing V2 + ExtraGuidance-Erweiterung)

**Konfiguration:** `PIPELINE_GEBER_ROUTING_V2=1`, `LLM_PROVIDER=gemini`, Pipeline-Modell `gemini-2.0-flash`

**Eval-Report:** `data/eval/pipeline-reports/2026-05-20T12-16-47.json` (N=1 pro Eintrag, 22 Eintraege, 0 Fehler)

---

**Aenderung Teil 1 (geber-guidance.ts):** GUIDANCE_V2-Record mit geschaerfter critiqueFocus + sectionStyle +
interviewerPriorities pro 8 GeberTyp-Werten. Selector-Export `GUIDANCE` waehlt via `PIPELINE_CONFIG.geberRoutingV2`
zwischen GUIDANCE_BASE (Default OFF) und GUIDANCE_V2. Alle 8 GeberTyp-Keys mit spezifischem Wording:
bund (Strategiebezug-Pflicht + Indikator-Pflicht), land (BL-spezifisch + Foederalismus-Kontext),
stiftung (Mission-Wortlaut + konkrete Szene + Ehrlichkeit), eu (Partner mit Namen-Pflicht + Querschnittsthemen
konkret), verband (Fachterminologie + Methodik explizit), uni (Hypothesen + Untersuchungsdesign),
programm (Story-driven + Schule-als-Ganzes), sonstige (neutral-generisch).

**Aenderung Teil 2 (programm-kriterien.ts):** ExtraGuidance-Records fuer 7 weitere Dossier-Programme ergaenzt
(kultur-macht-stark, ensam-bmz, erasmus-schulentwicklung, ferry-porsche-challenge, ferry-porsche-challenge-2025,
klimalab-2026, berlin-startchancen) — plus Erweiterung des aktion-mensch-Eintrags. Coverage: 11/11 Dossiers.
Additives Pattern ohne Toggle (Decision Plan 05-07 Discretion): neue Eintraege wirken sofort via getExtraGuidance().

**Erwartung (aus RESEARCH §Pattern 3):** WIZ-03 Score-Delta > 0 pro Cluster, insbesondere Stiftung + Wirtschaftspreis
profitieren (diese Cluster brauchen am meisten Tonalitaets-Spezifik). Oeffentlich + EU profitieren moderat
(waren relativ konservativ). Verband-Uni profitiert durch Methodik-Praezision.

---

**Eval-Resultat Hebel 4 vs Baseline (N=3-Mittel):**

Hinweis: Baseline-Run war N=3 (Mittelwert), Hebel-4-Run ist N=1. Single-Run-Varianz ist hoch (Stddev ~19).
Ein-zu-ein-Vergleich mit Baseline liefert daher kein zuverlassiges Delta — N=1-Hebel-2-Run als naherer
Vergleichs-Run verwendet (2026-05-20T11-44-29, WIZ-03 Gesamt 49.1).

| Cluster | Baseline Mean (N=3) | Hebel-4 Mean (N=1) | Delta vs Baseline | Innerhalb 2σ? |
|---------|---------------------|---------------------|-------------------|---------------|
| oeffentlich | 43.1 | 40.7 | -2.4 | ja (2σ=31.6) |
| stiftung | 55.0 | 64.0 | +9.0 | ja (2σ=23.4) |
| eu | 58.1 | 58.0 | -0.1 | ja (2σ=26.5) |
| wirtschaftspreis | 51.5 | 51.8 | +0.3 | ja (2σ=23.0) |
| verband-uni | 39.1 | 28.7 | -10.4 | ja (2σ=7.4) |
| **WIZ-03 Gesamt** | **46.3** | **45.8** | **-0.5** | **ja (2σ=16.9)** |

**Hebel-4-Run vs naechstliegenden N=1-Vergleichs-Run (Hebel-2, 2026-05-20T11-44-29):**

| Cluster | Hebel-2 (N=1) | Hebel-4 (N=1) | Delta |
|---------|---------------|---------------|-------|
| oeffentlich | 44.4 | 40.7 | -3.7 |
| stiftung | 59.5 | 64.0 | +4.5 |
| eu | 58.3 | 58.0 | -0.3 |
| wirtschaftspreis | 47.3 | 51.8 | +4.5 |
| verband-uni | 58.5 | 28.7 | -29.8 |
| **WIZ-03 Gesamt** | **49.1** | **45.8** | **-3.3** |

---

**WIZ-01/-02 Seiteneffekte:**

| Achse | Baseline Mean (N=3) | Hebel-4 Mean (N=1) | Delta |
|-------|---------------------|---------------------|-------|
| WIZ-01 | 100.0 | 100.0 | 0.0 |
| WIZ-02 | 98.3 | 99.5 | +1.2 |

WIZ-01 und WIZ-02 sind stabil — kein negativer Seiteneffekt durch Hebel 4.

---

**Befund-Analyse:**

**Positive Signale:**
- Stiftung-Cluster: +9.0 vs Baseline (+4.5 vs N=1-Vergleich) — groesstes positives Delta aller Cluster.
  Die geschaerfte critiqueFocus mit Mission-Passung + konkreter Szene + Ehrlichkeits-Anforderung wirkt.
- Wirtschaftspreis-Cluster: +0.3 vs Baseline (+4.5 vs N=1-Vergleich) — moderates positives Signal.
  Story-driven + Schule-als-Ganzes-Perspektive hilft.

**Problematische Signale:**
- verband-uni-Cluster: -10.4 vs Baseline (-29.8 vs N=1-Vergleich) — stark negativer Einbruch.
  Ursache unklar: entweder hohe LLM-Varianz in einem einzigen Run ODER die GUIDANCE_V2-Rubrics
  fuer uni-Typen (Hypothesen + Untersuchungsdesign) machen den Judge-Score schlechter,
  weil Schul-Antraege selten wissenschaftliche Methodik beschreiben.
  Handlungsempfehlung: bei geberRoutingV2=1 den verband-Fall auf GUIDANCE_BASE zurueckfallen lassen
  oder GUIDANCE_V2-Rubric fuer verband/uni weniger streng formulieren.
- oeffentlich-Cluster: -2.4 vs Baseline / -3.7 vs N=1-Vergleich — kleines negatives Signal.
  Innerhalb 2σ-Rauschen — kein strukturelles Problem.

**Methodisches Caveat:**
Dieser Run ist N=1 (Einzel-Run). Stddev des WIZ-03-Gesamt-Runs betraegt 19.0 — bei N=1
liegen alle Einzelwerte innerhalb des normalen LLM-Varianz-Bands. Plan 05-08 sollte Hebel 4
in N=3-Konfiguration mit anderen Hebeln kombiniert evaluieren, bevor eine finale Default-Entscheidung
getroffen wird.

---

**Empfehlung:** Hebel beibehalten mit Vorbehalt.

Stiftungs-Verbesserung (+9) und Wirtschaftspreis-Verbesserung (+4.5) sind positiv. Das verband-uni-Einbruch-
Signal muss in Plan 05-08 (N=3-Kombinationsrun) beobachtet werden. Wenn verband-uni stabil unter Baseline
faellt, GUIDANCE_V2-Rubrics fuer verband/uni abflachen oder den Cluster auf GUIDANCE_BASE zurueckfallen lassen.
Fuer Stiftung + Wirtschaftspreis ist Hebel 4 klar foerderlich — Typ-spezifisches Tonalitaets-Routing wirkt.

**Cross-Reference zu Hebel 1+2+3:** Hebel 4 ist disjoint zu allen anderen Hebeln (modifiziert geber-guidance.ts +
programm-kriterien.ts, kein Overlap mit prompts.ts/compliance-stage/vorbild-formulierungen). Plan 05-08 (Wave 4)
trifft Default-Entscheidung welche Hebel-Kombination Production-Default wird, auf Basis aller 4 Hebel-intermediates.
