# Qualitaets-Review: Antragswizard bei spaerlichem Input

**Test:** 10 fiktive Grundschulen mit bewusst **knappen, vagen Ideen** durchlaufen den kompletten Prozess (Matching → Interview → fertiger Antrag). Die Interview-Antworten lieferte eine „ueberlastete Lehrkraft"-Persona, die auf fast jede Frage ausweichend antwortet. Frage: **Was macht der Wizard aus so duennem Input?**

**Umgebung:** isolierte Test-DB `edufunds_test`, lokaler Server, LLM = DeepSeek. Gesamtkosten der 10 Laeufe: ~0,19 €.

## Score-Uebersicht (1–5)

| Fall | Schule | Programm (Match) | Match | k.Halluz. | Luecken | Finanzpl. | Struktur | konkret | **Einreichbar** |
|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | Grundschule am Lindenpark | DigitalPakt Schule 2.0 | 5 | 1 | 3 | 2 | 4 | 3 | **2** |
| 2 | Astrid-Lindgren-Grundschule | deinSchulhof / Gruene Schulhoefe | 5 | 2 | 4 | 2 | 4 | 3 | **2** |
| 3 | Grundschule Sonnenblume | deinSchulhof / Gruene Schulhoefe | 5 | 4 | 4 | 2 | 4 | 3 | **3** |
| 4 | Grundschule Buchenweg | Gemeinsam Digital! Kreativ mit M | 4 | 3 | 4 | 2 | 5 | 4 | **2** |
| 5 | Grundschule Am Muehlbach | Foerderfonds Demokratie | 3 | 1 | 2 | 1 | 4 | 3 | **2** |
| 6 | Pestalozzi-Grundschule | Ideeninitiative Kulturelle Vielf | 4 | 2 | 3 | 1 | 4 | 3 | **2** |
| 7 | Grundschule Regenbogen | deinSchulhof / Gruene Schulhoefe | 4 | 2 | 4 | 3 | 4 | 4 | **3** |
| 8 | Grundschule Kleeblatt | Heinz Nixdorf Stiftung - Projekt | 5 | 2 | 4 | 3 | 4 | 3 | **2** |
| 9 | Grundschule Am Wald | Gemeinsam Digital! Kreativ mit M | 2 | 2 | 4 | 2 | 4 | 3 | **2** |
| 10 | Janusz-Korczak-Grundschule | deinSchulhof / Gruene Schulhoefe | 2 | 2 | 4 | 2 | 4 | 3 | **2** |

**Durchschnitt:** Match 3.9 · k.Halluz. 2.1 · Luecken 3.6 · Finanzplan 2.0 · Struktur 4.1 · konkret 3.2 · **Einreichbarkeit 2.2**

## Gesamtbild
Der Wizard leistet bei absichtlich spärlichem Input Erstaunliches auf der Oberfläche: Aus drei Sätzen und durchweg ausweichenden Antworten entstehen strukturell vollständige, programmgerecht gegliederte und sprachlich antragstaugliche Entwürfe — das Programm-Matching ist bei thematisch klaren Ideen (Tablets, Schulhof, Programmieren) sehr treffsicher. Die zentrale Schwäche ist aber systematisch und betrifft alle zehn Fälle: Die Vollständigkeit wird durch Halluzination erkauft. Sämtliche Finanzpläne bestehen zu nahezu 100 Prozent aus erfundenen Beträgen, und in jedem Fall werden konkrete Partner, Personalstellen, Schülerzahlen, Methoden oder Zeitpläne fabriziert, die der Nutzer nie genannt hat. Der eingebaute Selbstkritik-/Revisions-Loop ist die wertvollste Komponente — er entschärft in mehreren Fällen (3, 4, 9) die gröbsten Erfindungen zu ehrlichen Platzhaltern — arbeitet aber inkonsistent: in Fall 5 verschlimmert die Revision die erkannten Halluzinationen sogar. Keiner der zehn Anträge ist ohne substanzielle menschliche Faktenarbeit einreichbar; als kommentierte Arbeitsgerüste sind sie dagegen durchgängig brauchbar. Das Kernrisiko ist, dass die erfundenen Fakten gefährlich plausibel klingen und eine überlastete Lehrkraft sie ungeprüft als Falschangaben gegenüber dem Fördergeber einreichen könnte.

## Wiederkehrende Muster / Schwachstellen
### Finanzplan zu nahezu 100 Prozent frei erfunden
In ALLEN zehn Fällen sind die Finanzplan-Betraege fabriziert, obwohl die meisten Nutzer keinen einzigen Euro nannten. Selbst wo eine einzige echte Zahl vorlag (Fall 8: ~2.000 EUR Honorar, Fall 6/10: nur die Programm-Obergrenze), wurde der Rest komplett dazuerfunden. Gravierend sind dabei interne Geld-Widersprueche im SELBEN Dokument: Fall 9 nennt im Finanzplan ~4.815 EUR, im Fliesstext aber 35.000-45.000 EUR (Faktor ~9); Fall 2 Text 19.500 vs. Plan 20.000 EUR; Fall 6 beantragt mal 6.000, mal 7.500, mal 9.375 EUR; Fall 8 zeigt 2.500 vs. 2.300 EUR. Mildernd in fast allen Faellen: die strukturierten 'hinweise' deklarieren die Schaetznatur ehrlich — diese Ehrlichkeit erscheint aber NUR im Finanzplan-Objekt, im Fliesstext stehen die Zahlen als feste Kalkulation.

*Betroffene Faelle:* 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

### Systematische Halluzination von Partnern, Personal, Schueler- und Mengenzahlen
Durchgaengig werden konkrete Akteure und Zahlen erfunden, die nie genannt wurden: externe Fachkraefte/Honorarkraefte (Fall 1 IT-Aufstockung 8.000 EUR, Fall 4 Medienpaedagoge, Fall 5/6 externe Fachkraft, Fall 9 Tablets), Foerderverein/Hausmeister/Schultraeger/Arbeitsgruppen (Fall 2,3,7,10), hochgerechnete Schuelerzahlen (Fall 1: '150', Fall 4: '50') sowie Mengen ('zwei Gitarren' Fall 6, '25 Tablets' Fall 1, '200 m2' Fall 3). Besonders schwer wiegen Faelle, in denen die Erfindung der ausdruecklichen Nutzeraussage WIDERSPRICHT: Fall 1 macht aus 'Kollegin nebenher, nicht offiziell' eine bezahlte 8.000-EUR-Stelle; Fall 5 baut eine externe Fachkraft ein, obwohl der Nutzer 'erstmal die Lehrkraefte' sagte.

*Betroffene Faelle:* 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

### Erfundene Belege, Methoden und feste Zusagen statt offener Luecken
Statt 'weiss nicht' transparent zu lassen, kaschiert der Wizard kritische Luecken mit fingierten Fakten: erfundene Evidenzbasis (Fall 1 VERA-Vergleichsarbeiten/Lernrueckstaende, Fall 4 'Schulsekretariatseinschaetzung'/'sozialraeumliche Belastung'), erfundene Evaluationsmethodik (Fall 8/9 Pre/Post-Smiley-Skalen), erfundene paedagogische Methoden (Fall 9 'Dialogisches Vorlesen'/'Storytelling'), behauptete Traeger-/Gemeinnuetzigkeits-Zusagen (Fall 5 'als gemeinnuetzig anerkannt', Fall 8 'eigenes Bankkonto', Fall 6 'muendliche Zusage des Fördervereins'). In Fall 1 ueberschreibt der finalText sogar ehrliche Vorbehalte der Rohfassung mit festen Zusagen (Schulkonferenz-Termin, 'Ersatzbeschaffung gesichert').

*Betroffene Faelle:* 1, 4, 5, 6, 8, 9

### Selbstkritik-Loop wirkt, aber inkonsistent — teils kontraproduktiv
Der eingebaute Critique-/Revisions-Schritt ist die staerkste Komponente und entschaerft in mehreren Faellen nachweislich gravierende Erfindungen zu ehrlichen 'noch zu klaeren'-Formulierungen (Fall 3 entfernt Robinienholz/35.000-EUR-Luecke, Fall 4 streicht Stadtbibliothek-als-Antragstellerin, Fall 9 wandelt zugesicherte Partner in 'angefragt'). ABER: Er arbeitet unvollstaendig (mehrere Faelle liefern mit hasOpenHighFindings=true aus: 1,7,8,9) und in Fall 5 VERSCHLIMMERT die Revision die selbst erkannten Halluzinationen sogar (externe Partner von 'nicht eingeplant' zu 'eingeplant' gedreht, neue Posten erfunden). In Fall 8 ersetzt die Revision eine erkannte Inkonsistenz nicht, sondern hinterlaesst widerspruechliche Summen.

*Betroffene Faelle:* 1, 3, 4, 5, 7, 8, 9

### Match-Verfehlung bei vagen, nicht-baulichen Ideen — Ausweichen auf wenige Standardprogramme
Bei thematisch klaren Ideen ist der Match exzellent, aber bei vagen/abstrakten Ideen draengt der Matcher das Anliegen in unpassende, immer wiederkehrende Programme. Auffaellig: das DUH-Schulhofprogramm 'deinSchulhof/Gruene Schulhoefe' wird in vier Faellen gewaehlt (2,3,7,10) — in Fall 10 wird damit 'Gesundes Essen' faelschlich zu einem Entsiegelungsantrag umgebogen (passt_weil sachlich falsch). Das dbv-Programm 'Gemeinsam Digital!' wird zweimal (4,9) gewaehlt und zwingt rein schulische DaZ-/Lesefoerderung in ein ausserschulisches Digital-Buendnis mit drei Pflichtpartnern. In Fall 5 wird 'gegen Mobbing' ueber eine Wizard-Konstruktion zu 'Demokratie' umgedeutet, ohne dass der Nutzer das Wort je nannte. Programm-spezifische K.o.-Risiken (Frist/aktive Welle, ausserschulischer Traeger, Bundesland-Eignung) werden im Antrag oft verschwiegen statt markiert.

*Betroffene Faelle:* 2, 3, 4, 5, 7, 9, 10

### Sichtbare Roh-Artefakte und Restfehler im finalText
Mehrfach gelangen Werkstatt-Spuren in den 'fertigen' Text: unausgefuellte Platzhalter '[Datum]' (Fall 3) bzw. '[TODO: Name noch einholen]' (Fall 9), Tippfehler 'versteigen' statt 'verstetigen' (Fall 6), 'Lukas' als von der KI im Interview selbst vorgeschlagener Name im Section-Text (Fall 8), sowie Inkonsistenzen zwischen korrigiertem Fliesstext und nicht nachgezogenem Finanzplan (Fall 8/10: 'Baeume'/'Schattenbaeume' im Posten, obwohl im Text gestrichen). Solche Artefakte signalisieren einem Pruefer sofort Standard-KI-Fuellung.

*Betroffene Faelle:* 3, 6, 8, 9, 10

## Was der Wizard gut macht
- Programm-Matching ist bei thematisch klaren Ideen sehr treffsicher (Fall 1 DigitalPakt/Tablets Score 92, Fall 8 Heinz Nixdorf/Programmieren, Fall 6 Liz Mohn/Musik+Vielfalt) — aus einem Satz wird ein sachlich passendes Foerderprogramm samt sinnvoller Alternativen gefunden.
- Strukturell vollstaendige, programmgerechte Foerderlogik in allen zehn Faellen: Bedarf, Ziele, Wirkung, Beteiligung, Nachhaltigkeit, Eigenanteil und Finanzierung sind als korrekte Pflichtbausteine vorhanden — inklusive programm-spezifischer Pflichtabschnitte (dbv 'Ausserschulischer Charakter' in Fall 4).
- Der Selbstkritik-/Revisions-Loop existiert ueberhaupt und funktioniert in der Mehrzahl der Faelle nachweisbar: er erkennt Halluzinationen, markiert sie und entschaerft die groebsten Erfindungen zu ehrlichen Platzhaltern (Fall 3,4,9 besonders deutlich).
- Erfreulich ehrliche Luecken-Markierung im Textteil vieler Antraege ('liegt derzeit nicht vor', 'wird nachgereicht', 'erste Schaetzung', explizite [TODO]-Marker) — deutlich besser als blankes Kaschieren.
- Die Finanzplan-'hinweise' deklarieren die Schaetznatur der Betraege transparent ('geschaetzt — bitte vor Einreichung belegen oder anpassen') und flaggen Eigenanteile korrekt (Fall 1 eigenanteil:true, Arithmetik konsistent).
- Sprachlich fluessig und antragstauglich; die wenigen ECHTEN Nutzerdetails werden wirkungsvoll als wiederkehrende, glaubwuerdige Anker eingesetzt (Fall 2 Kind ohne Schatten, Fall 3 Baumstamm/Kaefer, Fall 6 stilles Kind am Schlagzeug).
- Der Interviewer fragt hartnaeckig und korrekt die Pflichtangaben ab (Fall 1 Schuelerzahl/Medienkonzept/IT-Support) und liefert das System signalisiert offene Maengel teils ehrlich (hasOpenHighFindings=true statt vorgetaeuschter Vollstaendigkeit).

## Empfehlungen (priorisiert)
- **[hoch]** Finanzplan-Betraege bei fehlendem Nutzer-Input NICHT erfinden, sondern als sichtbare Platzhalter ausgeben (z.B. '[Betrag noch zu kalkulieren — Angebot einholen]'). Wenn der Nutzer null Euro nannte, darf kein konkreter Posten-Betrag im Fliesstext erscheinen. Das beseitigt das gravierendste, in allen zehn Faellen auftretende Risiko (Luftbuchungs-Budgets).
- **[hoch]** Eine harte Geld-Konsistenzpruefung als Pflicht-Gate einziehen: Summe der Finanzplan-Posten MUSS mit jeder Gesamtsummen-Nennung im Fliesstext uebereinstimmen. Diskrepanzen (Fall 9 Faktor 9, Fall 2/6/8) duerfen den finalText nicht passieren — das System erkennt sie teils bereits (consistencyIssues), korrigiert aber nicht.
- **[hoch]** Den Revisions-Loop so haerten, dass er Halluzinationen niemals NEU einfuehren oder verschlimmern kann (Fall 5 ist ein klarer Regressionsfall). hasOpenHighFindings=true muss ein Auslieferungs-Blocker sein bzw. die offenen HOCH-Findings im finalText sichtbar als Warnhinweis kennzeichnen, statt sie still durchzulassen (Faelle 1,7,8,9).
- **[hoch]** Erfundene harte Fakten mit Rechtsfolge strikt unterbinden: behauptete Gemeinnuetzigkeit/Bankkonto/Mittel-Verwaltungsberechtigung (Fall 5,8), muendliche Foerderverein-/Traegerzusagen (Fall 6) und fingierte Bedarfsbelege (VERA Fall 1, 'Schulsekretariatseinschaetzung' Fall 4). Solche Angaben sind gegenueber dem Fördergeber Falschangaben — der Wizard darf sie nur als offene Pflicht-Checkpunkte, nie als Tatsachen formulieren.
- **[mittel]** Match-Logik gegen Themen-Verfehlung absichern: bei abstrakten/nicht-baulichen Ideen ('gesundes Essen', 'gegen Mobbing', schulische DaZ-Foerderung) nicht reflexhaft auf die haeufig gewaehlten Programme (DUH-Schulhof, dbv 'Gemeinsam Digital!') ausweichen. Wenn das Match das Kern-Anliegen austauscht oder ein K.o.-Kriterium (ausserschulischer Traeger, aktive Welle/Frist, Bundesland) verfehlt, das dem Nutzer prominent als Warnung anzeigen statt im Antrag zu verschweigen.
- **[mittel]** Erfundene Methoden, Zeitplaene, Beteiligungsformate und Verstetigungskonzepte (Smiley-Evaluation, Phasen-Daten, Hoftag, Klassen-Patenschaften, Workshops) konsequent als 'Vorschlag/zu bestaetigen' kennzeichnen statt als feststehende Planung. Die im Textteil bereits vorhandene Luecken-Ehrlichkeit muss auf diese Abschnitte ausgeweitet werden — sie bricht dort heute systematisch ab (Fall 7,10 Verstetigung; Fall 9 Methoden/Phasen).
- **[mittel]** Den finalText von Roh-Artefakten saeubern: unausgefuellte Platzhalter '[Datum]'/'[TODO]' (Fall 3,9) gehoeren entweder ausgefuellt oder in eine klar separierte 'Noch zu ergaenzen'-Checkliste, nicht mitten in den Fliesstext. Finanzplan und korrigierter Fliesstext muessen synchronisiert werden (Fall 8/10 'Baeume'-Drift).
- **[niedrig]** Produkt-Framing schaerfen: das Ergebnis konsequent als kommentierten Arbeitsentwurf mit sichtbarer 'Vor-Einreichung-Checkliste' praesentieren (Betrag belegen, Partner bestaetigen, Frist pruefen, Traegerzusage einholen), damit Nutzer den Entwurf nicht versehentlich fuer einreichfertig halten. Tippfehler-/Sprachpruefung als letzten Schliff ergaenzen (Fall 6 'versteigen').

## Kurzfazit je Fall
- **Fall 1** ([Dossier](dossier-01.md)): Exzellenter Match (DigitalPakt 2.0, Score 92) und lobenswert transparente Schaetz-Kennzeichnung im Finanzplan, aber die Vollstaendigkeit ist mit massiver Halluzination erkauft (erfundene VERA-Daten, App-Namen, 8.000-EUR-IT-Stelle gegen die Nutzeraussage, kompletter Transfer-Abschnitt) und der finalText ueberschreibt ehrliche Vorbehalte der Rohfassung mit festen Zusagen.
- **Fall 2** ([Dossier](dossier-02.md)): Treffsicheres Schulhof-Match und ueber weite Strecken ehrlich gekennzeichnet (Selbstkritik greift sichtbar), wird aber unseriös durch einen vollstaendig erfundenen Finanzplan, einen ungeloesten 500-EUR-Summenwiderspruch (19.500 vs. 20.000 EUR) und erfundene Akteure (Landschaftsbuero, Foerderverein, Schulsozialarbeit).
- **Fall 3** ([Dossier](dossier-03.md)): Bemerkenswerter Fall: Der Selbstkritik-Schritt verwandelt einen stark halluzinierten Rohentwurf in einen ueberraschend ehrlichen, luecken-markierenden finalText — der Finanzplan bleibt jedoch komplett erfunden und ein sichtbarer '[Datum]'-Platzhalter plus Restakteure (Hausmeister/Foerderverein) machen ihn nur zur Arbeitsgrundlage, nicht einreichfertig.
- **Fall 4** ([Dossier](dossier-04.md)): Vorbildlich ehrlich geruesteter Textteil (Critique entfernt fast alle Erfindungen, markiert Luecken offen) kombiniert mit einem zu 100 Prozent erfundenen 7.490-EUR-Finanzplan, neuen unerfassten Halluzinationen (Medienpaedagoge, Druckprodukte) und verschleierten K.o.-Kriterien (kein ausserschulischer Traeger, kein verbindliches Dreierbuendnis).
- **Fall 5** ([Dossier](dossier-05.md)): Strukturell vollstaendig und sprachlich ueberzeugend, aber gravierend: ein fabrizierter 4.000-EUR-Finanzplan, eine vom Nutzer ausdruecklich ausgeschlossene externe Fachkraft und eine erfundene Gemeinnuetzigkeit — und die Revision behebt die selbst erkannten Halluzinationen nicht, sondern verschlimmert sie.
- **Fall 6** ([Dossier](dossier-06.md)): Sprachlich gefaelliger Entwurf mit gutem erzaehlerischem Kern, der aber den reinen Instrumentenwunsch zu einem nie gewollten Honorar-Projekt umbaut, einen in sich widerspruechlichen Finanzplan (6.000 vs. 7.500 vs. 9.375 EUR) liefert und eine Falschangabe ('muendliche Zusage des Foerdervereins') enthaelt.
- **Fall 7** ([Dossier](dossier-07.md)): Aus ausweichenden Antworten ein fluessiger, ehrlich luecken-markierender Rohentwurf — die klare Staerke liegt in der transparenten 'weiss-nicht'-Behandlung —, untergraben durch erfundene Fakten (klassenweise Workshops, Fruehjahr-Zeitplan, Pflegeregelung) und einen honorar-lastigen (60 Prozent) geschaetzten Finanzplan; das System meldet selbst offene HIGH-Findings.
- **Fall 8** ([Dossier](dossier-08.md)): Sehr gutes Match aus einem Satz und vorbildliche Finanzplan-Transparenz, aber erkauft durch erfundene harte Fakten (Bankkonto, Smiley-Evaluation, Schultraeger, Material 300 EUR, KI-Name 'Lukas') und eine widerspruechliche Gesamtsumme (2.500 vs. 2.300 EUR) — mit hasOpenHighFindings=true ausgeliefert.
- **Fall 9** ([Dossier](dossier-09.md)): Der Revisions-Loop rettet den Antrag von 'dreist halluziniert' zu 'ehrlicher, aber nicht einreichbarer Entwurf', doch es bleiben nicht markierte Erfindungen (Methoden, 4-Phasen-Zeitplan, alle Betraege), ein Faktor-9-Geldwiderspruch (4.815 vs. 35.000-45.000 EUR) und ein strukturell schlecht passendes Programm-Match.
- **Fall 10** ([Dossier](dossier-10.md)): Formal sauberer, sprachlich runder Antrag, der die offenen Luecken erstaunlich ehrlich behandelt, aber das eigentliche Anliegen verfehlt ('gesundes Essen' wird zur Schulhof-Begruenung) und die Inhaltsluecken im Verstetigungsteil und Finanzplan mit frei erfundenen Konkreta stopft.

---
*Volle Nachvollziehbarkeit je Fall in `dossier-01.md` … `dossier-10.md` (Idee → Match → komplettes Interview → Facts → Finanzplan → Selbstkritik → fertiger Antrag → Gutachten).*