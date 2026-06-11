# Qualitaets-Review: Antragswizard bei spaerlichem Input

**Test:** 10 fiktive Grundschulen mit bewusst **knappen, vagen Ideen** durchlaufen den kompletten Prozess (Matching → Interview → fertiger Antrag). Die Interview-Antworten lieferte eine „ueberlastete Lehrkraft"-Persona, die auf fast jede Frage ausweichend antwortet. Frage: **Was macht der Wizard aus so duennem Input?**

**Umgebung:** isolierte Test-DB `edufunds_test`, lokaler Server, LLM = DeepSeek. Gesamtkosten der 10 Laeufe: ~0,19 €.

## Score-Uebersicht (1–5)

| Fall | Schule | Programm (Match) | Match | k.Halluz. | Luecken | Finanzpl. | Struktur | konkret | **Einreichbar** |
|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | Grundschule am Lindenpark | DigitalPakt Schule 2.0 | 5 | 4 | 5 | 5 | 4 | 3 | **3** |
| 2 | Astrid-Lindgren-Grundschule | deinSchulhof / Gruene Schulhoefe | 5 | 4 | 5 | 5 | 4 | 4 | **4** |
| 3 | Grundschule Sonnenblume | KlimaLab - Klimaschutz-Engagemen | 3 | 5 | 4 | 1 | 1 | 1 | **1** |
| 4 | Grundschule Buchenweg | Gemeinsam Digital! Kreativ mit M | 4 | 4 | 5 | 4 | 4 | 4 | **3** |
| 5 | Grundschule Am Muehlbach | Foerderfonds Demokratie | 4 | 4 | 5 | 5 | 4 | 4 | **3** |
| 6 | Pestalozzi-Grundschule | Kultur macht stark - Bündnisse f | 4 | 5 | 5 | 3 | 4 | 3 | **3** |
| 7 | Grundschule Regenbogen | deinSchulhof / Gruene Schulhoefe | 5 | 4 | 4 | 4 | 5 | 3 | **4** |
| 8 | Grundschule Kleeblatt | Heinz Nixdorf Stiftung - Projekt | 4 | 4 | 5 | 5 | 4 | 4 | **4** |
| 9 | Grundschule Am Wald | Gemeinsam Digital! Kreativ mit M | 4 | 4 | 5 | 5 | 5 | 4 | **3** |
| 10 | Janusz-Korczak-Grundschule | DBU-Projektfoerderung (Foerderth | 3 | 3 | 4 | 4 | 4 | 4 | **3** |

**Durchschnitt:** Match 4.1 · k.Halluz. 4.1 · Luecken 4.7 · Finanzplan 4.1 · Struktur 3.9 · konkret 3.4 · **Einreichbarkeit 3.1**

## Gesamtbild
Über die 10 Fälle hinweg arbeitet der Wizard im Sinne des Modells „Ehrlichkeit durch Markieren" überwiegend stark: Wissenslücken werden durchgängig per [TODO] ausgewiesen (Ø Lücken ~4,7), Finanzbeträge konsequent als ⟨Vorschlag⟩/Schätzung gekennzeichnet (Ø Finanzplan ~3,7), und das Programm-Matching trifft trotz Ein-Satz-Ideen meist präzise (Ø Match ~4,1). Halluzinationen sind selten und fast immer markiert (Ø ~4,0). Die größten Ausreißer sind ein Totalausfall (Fall 3: kein Antragstext, kein Finanzplan) sowie zwei Fälle mit reiner Verweigerung statt aktivem beziffertem Vorschlag (Fälle 3, 6). Einreichbarkeit bleibt input-bedingt im Mittelfeld (Ø ~3,1): die Gerüste sind hervorragende Arbeitsgrundlagen, aber wegen offener Pflichtangaben noch nicht abgabefertig.

## Wiederkehrende Muster / Schwachstellen
### Defensiver Finanzplan-Verzicht statt aktivem beziffertem Vorschlag
Entgegen der Produktphilosophie 'immer bezifferter Plan mit markierten Vorschlägen' wird in einigen Fällen gar kein Finanzplan erzeugt: Fall 3 als Totalausfall (kein Text, kein Plan), Fall 6 als bewusster, aber zu defensiver Verzicht (nur Kostenblöcke im Fließtext ohne bezifferten Vorschlag). Der eigentliche Beratungs-Mehrwert – plausible Schätzposten anbieten – bleibt hier ungenutzt.

*Betroffene Faelle:* 3, 6

### Unmarkierte Tatsachenbehauptungen Dritter (Zusagen/Verfahren) im Fließtext
Vereinzelt rutschen konkrete, vom Nutzer nicht gedeckte Behauptungen ungekennzeichnet in den Text: 'Gemeinnützigkeit … Nachweis anbei' (Fall 5), Verstetigung per Sachunterricht-Rotation und Schulkonferenz-Beschluss als feststehendes Verfahren (Fall 7), externe Fachkräfte als feststehender Bestandteil trotz angedeuteter Eigenleistung (Fall 10). Im Finanzplan-Objekt sauber markiert, im Volltext aber als Fakt formuliert.

*Betroffene Faelle:* 5, 7, 10

### Match auf förderlogisch zu anspruchsvolles oder überdimensioniertes Programm
Treffer sind thematisch korrekt, legen aber für eine überlastete Lehrkraft mit vager Idee hohe Hürden auf: Pflicht-Dreierbündnis mit Bibliothek (Fälle 4, 9), erzwungener CO2-/Klima-Bezug bei reinem Bewegungsanliegen (Fall 3), DBU-Größenordnung für ein 9.500-€-Kleinprojekt (Fall 10). Niedrigschwelligere Alternativen wären teils realistischer bewilligungsfähig.

*Betroffene Faelle:* 3, 4, 9, 10

### Vom Nutzer ungedeckte Ergänzungen ohne Vorschlags-Rahmung
Konkrete Indikatoren, Mengen, Zeitpläne oder Belegquellen gehen über die sehr vagen Nutzerangaben hinaus, ohne explizit als Vorschlag markiert zu sein: messbare Indikatoren/Zeitplan (Fall 8), IGLU-2021-Verweis (Fall 4), Mengenangaben wie 4 Hochbeete (Fall 7), Gremien-Detailtiefe (Fall 7). Inhaltlich vertretbar, aber an der Markierungs-Grenze.

*Betroffene Faelle:* 4, 7, 8

### Konsistenz Finanzplan-Objekt vs. Fließtext und Pauschalen-Basis
Abgeleitete Summen erscheinen im Fließtext ohne expliziten Schätz-Vorbehalt (Fälle 8, 10), und Verwaltungspauschalen-Basen sind leicht inkonsistent (7% auf 10.000 statt 9.500 €, Fall 4). Zudem ein Generierungs-/Merge-Defekt mit Platzhalter-Restsatz im Ziele-Abschnitt (Fall 8).

*Betroffene Faelle:* 4, 8, 10

### Hoher Lücken-Anteil verdünnt Substanz und offene HIGH-Findings nicht blockierend
Durch konsequente Ehrlichkeit schrumpfen Abschnitte auf wiederholte 'noch zu klären'-Hinweise (Fälle 2, 9), und offene HIGH-Findings werden trotz Unfertigkeit als fertig ausgeliefert (Fälle 1, 6) – es fehlt ein blockierendes Quality-Gate.

*Betroffene Faelle:* 1, 2, 6, 9

## Was der Wizard gut macht
- Durchgängige, präzise [TODO]-Markierung aller Wissenslücken statt erfundener Pseudo-Fakten – die stärkste und konsistenteste Dimension über fast alle Fälle (1,2,4,5,6,8,9)
- Bezifferte Finanzpläne im Vorschlags-Modus: alle Posten als ⟨Vorschlag⟩/Schätzung gekennzeichnet, rechnerisch konsistent und exakt auf den Förderrahmen kalibriert (1,2,5,7,8,9)
- Präzises Programm-Matching trotz minimalem Ein-Satz-Input, inkl. transparenter 'Achtung-bei'-Vorbehalte und sinnvoll gereihter Alternativen (1,2,7,8)
- Sichtbar wirkender Selbstkritik-Loop: mündliches statt suggeriertes Interesse, Förderverein nur 'angefragt', Korrektur 'öffentliche Schule ungleich gemeinnützig', kein erfundener Medienpädagoge (2,4,8)
- Vollständige, programmgerechte Förderlogik über alle Pflichtabschnitte mit fachlich substanziellen Konzeptteilen (Evaluationsdesign, außerschulischer Charakter, Verstetigung) trotz dünnem Input
- Konkrete, lebendige Sprache aus den knappen Nutzerantworten (Snack-Müll-Wiegen, Kind allein auf der Bank) statt generischer Floskeln (2,5,10)
- Ehrliche Selbstoffenlegung kritischer Defizite – z.B. ungelöster 50%-Eigenanteil offen im Finanzteil benannt statt kaschiert (10)

## Empfehlungen (priorisiert)
- **[hoch]** Totalausfall absichern: Fall 3 erzeugte weder Antragstext noch Finanzplan. Eine Pipeline-Garantie einbauen, dass nach dem Interview IMMER ein strukturierter Text plus mindestens ein bezifferter Vorschlag-Finanzplan ausgeliefert wird; bei Fehlern Retry/Fallback statt Abbruch.
- **[hoch]** Trust-Boundary auf den Fließtext ausweiten: Unmarkierte Tatsachenbehauptungen Dritter ('Nachweis anbei', feststehende Verstetigungsverfahren, feste Fachkräfte) in Fällen 5/7/10 als Vorschlag oder [TODO] rahmen. Fakt-Verifikation soll auch Zusagen/Verfahren/Personen erfassen, nicht nur Euro-Beträge und das Finanzplan-Objekt.
- **[hoch]** Defensiven Finanzplan-Verzicht beenden: Wenn der Nutzer keine Kosten nennt, soll der Wizard aktiv ein beziffertes Mengengerüst mit Vorschlag-Markierung anbieten (Fall 6), statt komplett zu verzichten – das ist der Kern-Mehrwert des Modells.
- **[mittel]** Blockierendes Quality-Gate für offene HIGH-Findings: Anträge mit offenen HIGH-Findings (Fälle 1, 6) nicht als 'fertig' kennzeichnen, sondern als 'Entwurf mit Pflicht-Hausaufgaben' mit klarer, sortierter To-do-Liste vor Einreichung.
- **[mittel]** Matcher-Härtung gegen förderlogische Überforderung: Bei Pflicht-Bündnis- oder überdimensionierten Programmen (Fälle 3,4,9,10) eine niedrigschwellige Alternative als gleichrangigen 'Plan B' aktiv vorschlagen und Größenordnungs-Plausibilität (Projektvolumen vs. Programmtyp) prüfen.
- **[mittel]** Ungedeckte Ergänzungen konsequent als Vorschlag rahmen: Messbare Indikatoren, Mengen, Zeitpläne und Belegquellen (IGLU), die über Nutzerangaben hinausgehen (Fälle 4,7,8), explizit mit Vorschlag kennzeichnen statt als gesetztes Projektziel.
- **[niedrig]** Konsistenz Finanzplan-Objekt und Fließtext: Abgeleitete Summen im Kostenplan-Text mit demselben Schätz-Vorbehalt versehen wie im Objekt (Fälle 8,10); Pauschalen-Basen korrekt rechnen (Fall 4, 7% auf tatsächliche Förderposten).
- **[niedrig]** Generierungs-/Merge-Defekt beheben: Platzhalter-Restsatz im Ziele-Abschnitt (Fall 8 'Ziel: mindestens die genaue Zahl wird im Finanzplan beziffert') deutet auf einen Template-Merge-Bug hin – Output-Validierung gegen sinnlose Restsätze ergänzen.
- **[niedrig]** Eigenanteilssätze und Pflichtquoten gegen echte Richtlinien-Dossiers verifizieren statt aus Interviewer-Fragen zu übernehmen (Fall 1, 22%) und Floskel-/Leerformel-Anteil bei dünnem Input weiter reduzieren.

## Kurzfazit je Fall
- **Fall 1** ([Dossier](dossier-01.md)): Aus quasi null Input ein ehrliches, gut strukturiertes Gerüst mit konsistentem, durchgängig als Vorschlag markiertem 30.500-€-Finanzplan und vorbildlicher [TODO]-Lückenführung – stark, aber wegen offener Pflichtangaben noch nicht abgabefertig.
- **Fall 2** ([Dossier](dossier-02.md)): Vorzeige-Fall des Markier-Modells: perfektes Match (deinSchulhof), konsistenter 20.000-€-Vorschlagsplan und sichtbar wirkender Selbstkritik-Loop ohne unmarkierte Halluzinationen – nach Einholung der TODOs realistisch einreichbar.
- **Fall 3** ([Dossier](dossier-03.md)): Schwächster Fall: nach dem Interview Totalausfall – kein Antragstext, kein Finanzplan, keine Selbstkritik; die ehrliche Fact-Lage rettet nur die Halluzinations-Dimension, die Kernleistung fehlt komplett.
- **Fall 4** ([Dossier](dossier-04.md)): Einer der besten Fälle mit rund 8 sauberen [TODO]-Markern und vollständig als Schätzung markiertem Finanzplan; Hauptrisiko ist die offene Pflicht-Bibliothekszusage und die anspruchsvolle Bündnis-Förderlogik.
- **Fall 5** ([Dossier](dossier-05.md)): Starker, ehrlicher Rohentwurf mit mustergültigem 5.000-€-Vorschlagsplan; einzige echte Schwäche ist die unmarkierte 'Nachweis anbei'-Behauptung zur Förderverein-Gemeinnützigkeit im Träger-Abschnitt.
- **Fall 6** ([Dossier](dossier-06.md)): Erstaunlich ehrlicher, vollständig gegliederter Bündnis-Rohentwurf ohne erfundene Fakten – aber zu defensiv, da gar kein bezifferter Vorschlag-Finanzplan angeboten wird und sechs HIGH-Findings offen ausgeliefert werden.
- **Fall 7** ([Dossier](dossier-07.md)): Strukturell sehr starker, passgenau gematchter Schätz-Finanzplan-Entwurf; Restschwäche sind zwei als Fakten formulierte Verstetigungsdetails (Sachunterricht-Rotation, Schulkonferenz-Beschluss), die als Vorschlag gerahmt werden müssten.
- **Fall 8** ([Dossier](dossier-08.md)): Starker, ehrlicher Entwurf mit mustergültigem Vorschlags-Finanzplan und umgesetzten Selbstkritik-Korrekturen, getrübt durch einen sinnlosen Platzhalter-Restsatz im Ziele-Abschnitt und leicht ungedeckte Indikatoren.
- **Fall 9** ([Dossier](dossier-09.md)): Sehr gutes Markier-Modell-Beispiel mit dbv-konformer Struktur und konsistentem 7.590-€-Vorschlagsplan; Hauptschwäche ist die zu definitive Federführungs-Zuschreibung an die Bibliothek trotz sonst offener Bibliotheksrolle.
- **Fall 10** ([Dossier](dossier-10.md)): Sprachlich und strukturell starker DBU-Entwurf mit ehrlicher Selbstoffenlegung des 50%-Eigenanteil-Defizits; geschwächt durch Programm-Überdimensionierung und im Fließtext als feststehend formulierte Fachkräfte/Summen.

---
*Volle Nachvollziehbarkeit je Fall in `dossier-01.md` … `dossier-10.md` (Idee → Match → komplettes Interview → Facts → Finanzplan → Selbstkritik → fertiger Antrag → Gutachten).*