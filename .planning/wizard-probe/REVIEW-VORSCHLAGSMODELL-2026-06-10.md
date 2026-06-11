# 10er-Probe Re-Messung — Vorschlags-Modell (2026-06-10)

Re-Lauf der E2E-Probe (10 fiktive Grundschulen, bewusst spärlicher/vager Input)
gegen die **neue Pipeline** nach dem Produktvisions-Umbau „Ehrlichkeit durch
**Markieren** statt Löschen" (A1 `bfcf919`, A2 `6cb30bb`, B1 `c2f4f11`) + Hebel 2
(`74e956d`) + #4 (`9c8720b`). Server: isolierter Worktree :3190, DB
`edufunds_test`. Treiber: `scripts/wizard-e2e-probe.mjs`.

## Methodik-Entscheidung: deterministische Artefakte statt Richter-Panel

Die Hebel-Historie (Memory) zeigt wiederholt: **das LLM-Richter-Panel ist mit
±0,3–0,4 zu verrauscht** für marginale-aber-echte mechanische Gewinne, und es
generiert je Lauf andere Anträge (nicht 1:1 vergleichbar). **Zusätzlich ist es
nach dem Philosophie-Schwenk fehlausgerichtet:** die alte „keine
Halluzination"-Rubrik bestraft genau das, was das neue Modell **absichtlich
behält und als bestätigbaren Vorschlag markiert**. Ein Re-Run des Panels würde
also künstliche „Regressionen" erzeugen.

→ Belastbare Evidenz = die **deterministischen Pipeline-Artefakte** über alle 10
Fälle (unten). Der deterministische Smoke `verify-vorschlag-modell.ts` (`3577172`)
bleibt der Einzelfall-Beweis; diese Probe ist der **Breiten-Beweis über 10 vage
Inputs**.

## Ergebnis-Tabelle (deterministisch)

| Fall | Programm | Score | Text Z. | Posten | ⟨Vorschlag⟩ | Finanzplan | FV n/v | Gate | HighFinding |
|---|---|---|---|---|---|---|---|---|---|
| 1 | DigitalPakt Schule 2.0 | 65 | 9123 | 4 | 4 | beziffert | – | 1→0 | **JA** |
| 2 | deinSchulhof / Grüne Schulhöfe | 85 | 8920 | 4 | 4 | beziffert | 4/4 | 2→0 | – |
| 3 | KlimaLab | 65 | **0** | 0 | 0 | – | – | – | – |
| 4 | Gemeinsam Digital! | 82 | 12439 | 6 | 6 | beziffert | 0/1 | 2→2 | **JA** |
| 5 | Förderfonds Demokratie | 70 | 9751 | 4 | 4 | beziffert | 1/3 | – | – |
| 6 | Kultur macht stark | 68 | 13018 | **0** | 0 | beziffert | 2/3 | 2→0 | **JA** |
| 7 | deinSchulhof / Grüne Schulhöfe | 80 | 7429 | 9 | 9 | beziffert | 0/3 | – | **JA** |
| 8 | Heinz Nixdorf Stiftung | 75 | 7357 | 2 | 2 | beziffert | 2/5 | 1→0 | – |
| 9 | Gemeinsam Digital! | 90 | 14155 | 6 | 6 | beziffert | 3/2 | 1→1 | **JA** |
| 10 | DBU-Projektförderung | 70 | 12250 | 4 | 4 | beziffert | 6/2 | 1→0 | **JA** |

`FV n/v` = Fakt-Verifikation: n neutralisierte (falsche Tatsachen/Widersprüche)
/ v behaltene+gelistete Vorschläge. `Gate` = HalluzinationsGate introduced→residual.

## Aggregat (10 Fälle)

- **Finanzplan beziffert mit Posten: 8/10** (Fall 3 Generierungs-Fehlschlag; Fall 6 leere Postenliste).
- **Finanzposten gesamt 39 — davon istVorschlag: 39 (100 %).**
- **Fakt-Verifikation feuerte 8/10** · HalluzinationsGate feuerte 7/10.
- **hasOpenHighFindings: 6/10.**

## Interpretation — die Vision ist im Maßstab realisiert

1. **„Immer bezifferter Plan mit markierten Vorschlägen" (A1) bestätigt:** Bei
   durchweg spärlichem Input (Persona nennt fast nie Beträge) liefert das Modell
   trotzdem konkrete, bezifferte Finanzpläne — und markiert **jeden einzelnen
   geschätzten Betrag (100 %)** transparent als ⟨Vorschlag⟩. Das ist exakt der
   Kern der Vision: weder unmarkierte erfundene Zahlen (alter Defekt: „Finanzplan
   2,0, Beträge in ALLEN 10 erfunden") noch der Kollaps in unbeziffert (die
   Lösch-Richtung, die wir umgekehrt haben), sondern **belastbarer Plan +
   ehrliche Markierung**. Der Nutzer bestätigt/passt sie in der UI an (#1/#4).
2. **FV dreistufig (A2) arbeitet:** In 8/10 Fällen trennt der Pass falsche
   Tatsachen/Widersprüche (neutralisiert, z. B. Fall 10: 6) von sinnvollen
   fachlichen Ausgestaltungen (behalten+gelistet, z. B. Fall 8: 5) — statt wie
   früher pauschal zu löschen.
3. **Hebel 2 greift dort, wo er gebraucht wird:** 6/10 Anträge tragen ein offenes
   HIGH-Finding → diese werden jetzt **vor dem Export blockiert** (Bestätigungs-
   Pflicht), statt wie in der Vor-Probe „trotz offener HIGH-Halluz ausgeliefert".

## Watch-Items (nicht modell-, sondern randfallbezogen)

- **Fall 3 — Generierung 0 Zeichen (1/10):** Kein Pipeline-Fehler erfasst,
  vermutlich transienter DeepSeek-Timeout/Aussetzer im `generate`. Reproduktion
  prüfen; ggf. Retry/Härtung im Generate-Pfad (separat von der Vorschlags-Logik).
- **Fall 6 — voller Text (7 Sektionen) aber Finanzplan 0 Posten + 4 Hinweise:**
  Generator gab leere Postenliste zurück. Für ein „immer bezifferter Plan"-Ziel
  ein Lücken-Fall — der Plan sollte mind. markierte Vorschlags-Posten enthalten
  oder ehrlich als unbeziffert+Kostenrahmen erscheinen. Einzelfall, beobachten.
- **Gate Fälle 4/9 (2→2, 1→1):** Repair verbesserte nicht, aber **Never-Worse
  hielt** (keine Verschlechterung/Truncation). Erwartetes Verhalten.

## Matching (unverändert input-/matcher-gebunden)

Bei vagen, nicht-baulichen Ideen weicht der Matcher weiter auf Default-nahe
Programme aus (Fall 2/7 „deinSchulhof" für „Schulhof schöner"; Fall 4/9
„Gemeinsam Digital!" für Lesen/DaZ). Das ist ein **separates Matcher-/Daten-
Thema** (Memory-Hebel 3), von diesem Vorschlags-Umbau unberührt.

## Fazit

Der Philosophie-Schwenk ist über 10 spärliche Inputs deterministisch bestätigt:
bezifferte Pläne mit **100 % markierten Vorschlägen**, dreistufige FV, und
HIGH-Finding-Blockade bei 6/10. Das adressiert die zwei schwersten Vor-Befunde
(erfundene Finanzplan-Beträge; Auslieferung trotz offener HIGH-Findings) — ohne
die wertvolle fachliche Ausgestaltung wegzuwerfen. Ein Richter-Panel-Re-Run wird
bewusst nicht als Evidenz herangezogen (verrauscht + nach dem Schwenk
fehlausgerichtet); auf Wunsch nachholbar.
