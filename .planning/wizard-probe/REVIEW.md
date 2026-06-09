# Qualitaets-Review: Antragswizard bei spaerlichem Input

**Test:** 10 fiktive Grundschulen mit bewusst **knappen, vagen Ideen** durchlaufen den kompletten Prozess (Matching → Interview → fertiger Antrag). Die Interview-Antworten lieferte eine „ueberlastete Lehrkraft"-Persona, die auf fast jede Frage ausweichend antwortet. Frage: **Was macht der Wizard aus so duennem Input?**

**Umgebung:** isolierte Test-DB `edufunds_test`, lokaler Server, LLM = DeepSeek. Gesamtkosten der 10 Laeufe: ~0,19 €.

## Score-Uebersicht (1–5)

| Fall | Schule | Programm (Match) | Match | k.Halluz. | Luecken | Finanzpl. | Struktur | konkret | **Einreichbar** |
|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | Grundschule am Lindenpark | DigitalPakt Schule 2.0 | 5 | 3 | 4 | 4 | 4 | 3 | **2** |
| 2 | Astrid-Lindgren-Grundschule | deinSchulhof / Gruene Schulhoefe | 5 | 4 | 4 | 5 | 4 | 3 | **2** |
| 3 | Grundschule Sonnenblume | deinSchulhof / Gruene Schulhoefe | 4 | 4 | 5 | 5 | 4 | 4 | **2** |
| 4 | Grundschule Buchenweg | Gemeinsam Digital! Kreativ mit M | 4 | 2 | 4 | 4 | 4 | 3 | **2** |
| 5 | Grundschule Am Muehlbach | Foerderfonds Demokratie | 3 | 3 | 4 | 5 | 4 | 3 | **3** |
| 6 | Pestalozzi-Grundschule | Ideeninitiative Kulturelle Vielf | 3 | 3 | 4 | 5 | 4 | 3 | **2** |
| 7 | Grundschule Regenbogen | DBU-Projektfoerderung (Foerderth | 3 | 2 | 4 | 4 | 4 | 3 | **2** |
| 8 | Grundschule Kleeblatt | Heinz Nixdorf Stiftung - Projekt | 4 | 4 | 5 | 5 | 4 | 4 | **3** |
| 9 | Grundschule Am Wald | Gemeinsam Digital! Kreativ mit M | 4 | 2 | 4 | 4 | 4 | 3 | **2** |
| 10 | Janusz-Korczak-Grundschule | DBU-Projektfoerderung (Foerderth | 2 | 4 | 5 | 5 | 4 | 3 | **2** |

**Durchschnitt:** Match 3.7 · k.Halluz. 3.1 · Luecken 4.3 · Finanzplan 4.6 · Struktur 4.0 · konkret 3.2 · **Einreichbarkeit 2.2**

## Gesamtbild
Der Wizard schlaegt sich bei absichtlich spaerlichem Input ueberraschend ehrlich und reif: ueber alle 10 Faelle wird der strukturierte Finanzplan korrekt als unbeziffert ausgewiesen, statt Phantasie-Gesamtsummen zu erfinden, und der Self-Critique-/Revisions-Loop entfernt die gefaehrlichsten Erfindungen des Erstentwurfs (Euro-Spannen, falsche KMK-Belege, fixe Traegerschafts-Zusagen) zuverlaessig aus dem finalen Text. Wissensluecken werden weitflaechig mit [TODO]-Markern und Konjunktiv transparent gemacht, und das System signalisiert via hasOpenHighFindings selbst, dass kein Antrag einreichbar ist. Die Kehrseite: Das System behandelt formale Pflichtangaben (Partner, Zahlen, Finanzen) deutlich ehrlicher als das inhaltliche Konzept, in das es weiterhin konkrete Mengen, Zeitplaene, Szenen und Strukturen hineinerfindet und als Fakten praesentiert. Zudem zwingt der Matcher vage Ideen wiederholt in zu grosse oder thematisch verschobene Programme. Unterm Strich: als ehrliches Arbeitsgeruest mit Klaerungs-Checkliste durchweg brauchbar, als fertiger Antrag in keinem einzigen Fall einreichbar - was bei diesem Input aber das korrekte und transparent kommunizierte Ergebnis ist.

## Wiederkehrende Muster / Schwachstellen
### Asymmetrische Ehrlichkeit: Pflichtangaben ge-TODO-t, Konzept-Inhalte frei erfunden
Das durchgaengigste und gefaehrlichste Muster. Bei formalen Pflichtangaben (Traeger, Partner, Schuelerzahlen, Finanzen) markiert der Wizard Luecken vorbildlich mit [TODO]. Beim inhaltlichen Konzept dagegen erfindet er konkrete Aktivitaeten, Szenen, didaktische Details und Strukturen und gibt sie als feststehende Planung aus, obwohl der Nutzer sie nie nannte (Hoerspiele/Podcasts/Tablets, paritaetischer Schulhofrat, Laubbaum-Konzept, Scratch-Block-Kategorien, ausgeschmueckte Pausenhof-Szene). Die Pseudo-Konkretheit wirkt detailliert, ist aber substanzlos und faellt im echten Foerdergespraech auf.

*Betroffene Faelle:* 1, 2, 4, 5, 6, 8, 9

### Halluzination konkreter Mengen-, Zeit- und Meilenstein-Angaben
Systematisch werden Teilnehmerzahlen, Stundenkontingente, Laufzeiten, Phasenmodelle und datierte Meilensteine frei gesetzt (z.B. 24 Std./Kind, 20-30 Kinder, 80%-Indikator nach 1 Jahr, kompletter Zeitplan Sep 2026-Apr 2027, Meilensteine mit fixen Daten), obwohl der Nutzer ausdruecklich keine Zahlen/Termine lieferte oder explizit auswich. Diese Werte stehen ohne Vorbehalt als Fakt im finalText - im Gegensatz zu den ehrlich markierten Finanz- und Partner-Luecken.

*Betroffene Faelle:* 1, 2, 4, 5, 8, 9

### Erfundene Traeger/Partner/Qualifikationen als tragende Konstrukte
Der Wizard erfindet wiederholt einen Foerderverein als juristischen Antragsteller, geknuepfte Partnerkontakte, langjaehrige Lehrkraefte-Erfahrung, einen Hausmeister oder eine Medienkoordinatorin mit Vorerfahrung - oft an genau den Stellen, wo eine harte Foerderbedingung (z.B. mind. 3 Buendnispartner, 50% Eigenanteil) sonst unerfuellt waere. Diese Konstrukte verschleiern fehlende Foerderfaehigkeit statt sie offenzulegen.

*Betroffene Faelle:* 1, 2, 4, 6, 7, 9, 10

### Finanzplan-Kostenrahmen schmuggelt Posten/Betraege wieder ein
Zwar bleibt das strukturierte finanzplan-Objekt durchgaengig korrekt unbeziffert, doch der qualitative 'kostenrahmen' ergaenzt vom Nutzer nie genannte Posten (Entsiegelung, Raummiete, Bustransfer, Notenmaterial) und in zwei Faellen sogar konkrete Betraege (8-15 EUR Aufwandsentschaedigung, 500 EUR Pauschale), die teils zuvor gestrichene Erfindungen reaktivieren. Scope-Creep und Revisionslecks am Rand des sonst sauberen Finanzteils.

*Betroffene Faelle:* 2, 3, 4, 9

### Matcher draengt vage Ideen in zu grosse oder thematisch verschobene Programme
Bei duennen Ideen waehlt der Matcher haeufig das prestigetraechtigste statt das passendste Programm: DBU (100k-400k EUR, 50% Eigenanteil) fuer Klein-/Klassenprojekte, hochschwellige 3-Partner-Buendnisprogramme (Kultur macht stark) fuer simple Lese-/Sprachfoerderung, oder ein Demokratie-/Integrations-Framing, das erst muehsam konstruiert bzw. im Interview selbst herbeigefragt werden muss. Auffaellig: zwei verschiedene vage Ideen ('Schulhof schoener machen', 'mehr Bewegung') landen beide beim selben DUH-Schulhofprogramm, und gleich drei Faelle (3,7,10) bei DBU/DUH-Begruenungsschienen - der Matcher weicht bei Unsicherheit auf wenige Standardprogramme aus.

*Betroffene Faelle:* 3, 4, 6, 7, 9, 10

### Kompensatorische Floskeln und Pathos fuellen fehlende Substanz
Wo der Input zu duenn ist, fuellt der Wizard mit generischem Foerder-/Bildungspathos auf ('Herzstueck unseres Vorhabens', 'gelebte Demokratie', 'transformative Lernmethode', 'jede Fruehstueckspause zum Labor'). Das ueberhoeht triviale Ideen rhetorisch und kaschiert, dass kein belastbares Konzept dahintersteht.

*Betroffene Faelle:* 2, 5, 6, 7, 10

### Revisionslecks: einzelne als 'offen' erkannte Funde bleiben im finalText
Der Self-Critique-Loop ist insgesamt wirksam, arbeitet aber nicht vollstaendig: vereinzelt bleiben Inhalte stehen, die die Critique selbst als offen/nur teilweise geschlossen markiert hat (z.B. Termin Mai/Juni 2027 in Fall 4, 2-3 Workshop-Termine in Fall 5). Die Selbstkorrektur ist also stark, aber nicht lueckenlos.

*Betroffene Faelle:* 4, 5

## Was der Wizard gut macht
- Finanzplan ist in ALLEN 10 Faellen vorbildlich ehrlich: strukturiertes finanzplan-Objekt unbeziffert=true mit leerer Posten-Liste und klarem Hinweis statt erfundener Gesamtsummen - das gefaehrlichste Erfindungsrisiko ist systematisch entschaerft
- Der Self-Critique-/Revisions-Loop greift sichtbar und wirksam: erfundene Euro-Spannen, falsche KMK-Belege und fixe Traegerschafts-Zusagen aus den Erstentwuerfen werden im finalen Text getilgt oder zu 'noch zu klaeren' abgemildert
- Wissensluecken bei formalen Pflichtangaben werden durchgaengig mit [TODO]-Markern und Hedging ('voraussichtlich', 'noch zu klaeren') transparent gemacht statt als Vollstaendigkeit vorgetaeuscht
- Das System taeuscht keine Einreichbarkeit vor: hasOpenHighFindings=true wird gesetzt und sogar Programm-Skalen-Mismatches (z.B. DBU-Mindestsumme unterschritten) werden ehrlich als Blocker benannt
- Echte, vom Nutzer gelieferte konkrete Szenen werden gut herausgearbeitet und glaubwuerdig genutzt (2b-Hauswand-Szene, Scratch-Katze, Toast/Chips-Fruehstueck)
- Die Abschnittsstruktur folgt sauber und vollstaendig der jeweiligen programmspezifischen Foerderlogik (Bedarf, Konzept, Beteiligung, Nachhaltigkeit, Finanzen) - als gefuehrte Vorlage/Checkliste konsistent brauchbar
- Heikle extrahierte Annahmen (z.B. 'Haelfte Migrationshintergrund' in Fall 7) werden teils bewusst NICHT in den finalText uebernommen

## Empfehlungen (priorisiert)
- **[hoch]** Die Ehrlichkeit auf das inhaltliche Konzept ausdehnen: Konkrete Aktivitaeten, didaktische Details, Szenen und Ablaeufe, die NICHT aus dem Transcript stammen, muessen genauso als Annahme/Vorschlag markiert werden ([VORSCHLAG]/[ANNAHME]) wie Finanz- und Partnerluecken. Die asymmetrische Behandlung (Pflichtangaben ehrlich, Konzept erfunden) ist das groesste Vertrauensrisiko (Faelle 1,2,4,5,6,8,9).
- **[hoch]** Quantitative Erfindungen unterbinden: Mengen, Stunden, Laufzeiten, Phasenmodelle und datierte Meilensteine duerfen ohne Nutzer-Beleg nicht als Fakt erscheinen. Die Critique-Stufe um eine deterministische Pruefung erweitern, die jede konkrete Zahl/jedes Datum im finalText gegen das Transcript abgleicht und unbelegte Werte zwangsweise in [TODO] umwandelt (analog zum bereits funktionierenden Finanzplan-Handling) (Faelle 1,2,4,5,8,9).
- **[hoch]** Erfundene Traeger/Partner/Qualifikationen als tragende Konstrukte verbieten: Foerderverein, geknuepfte Partnerkontakte und Lehrkraefte-Erfahrung duerfen nie eingefuehrt werden, um eine harte Foerderbedingung scheinbar zu erfuellen. Stattdessen die unerfuellte Bedingung explizit als K.o.-Luecke ausweisen (Faelle 1,2,4,6,7,9,10).
- **[mittel]** Kostenrahmen an dieselbe Disziplin wie das finanzplan-Objekt binden: keine Betraege (auch keine Spannen wie 8-15 EUR) und keine vom Nutzer nie genannten Posten im qualitativen Kostenrahmen; nur Kostenarten, die sich aus genannten Massnahmen ableiten (Faelle 2,3,4,9).
- **[mittel]** Matcher-Logik um eine Plausibilitaets-/Skalen-Pruefung erweitern: Foerdersumme, Eigenanteil und Pflichtpartner des Programms gegen das (vage) Profil pruefen und bei strukturellem Mismatch kleinere/niederschwelligere Alternativen priorisieren statt das prestigetraechtigste Programm. Match-Scores wie 92/95 bei extrem duennem Input sind ueberkonfident und sollten gedeckelt werden (Faelle 3,4,6,7,9,10).
- **[mittel]** Critique-Loop auf Vollstaendigkeit haerten: als 'offen' oder 'teilweise' markierte Funde duerfen nicht im finalText verbleiben - ein finaler Gate-Check sollte die Auslieferung blockieren bzw. den betroffenen Satz entfernen (Faelle 4,5).
- **[niedrig]** Floskel-/Pathos-Anteil reduzieren: bei duennem Input lieber kuerzer und ehrlich 'noch zu konkretisieren' als generisches Bildungs-/Demokratie-Pathos zur Volumenfuellung. Floskeldichte als Quality-Metrik tracken (Faelle 2,5,6,7,10).
- **[niedrig]** UX der [TODO]-Marker fuer Laien verbessern: die vielen eingestreuten [TODO]-Klammern im Fliesstext in eine klar getrennte, priorisierte 'Vor Einreichung zu klaeren'-Checkliste ueberfuehren, damit das Dokument als Arbeitsgeruest lesbar bleibt und der Nutzer nicht versehentlich Platzhalter einreicht (Faelle 1,2).

## Kurzfazit je Fall
- **Fall 1** ([Dossier](dossier-01.md)): Bemerkenswert ehrliches Geruest mit unbeziffertem Finanzplan und konsequenten TODOs; der Revisions-Loop entfernt Phantasie-Budget und falschen KMK-Beleg, es bleiben aber nicht-markierte Mini-Halluzinationen (WLAN-Infrastruktur, AP-Admin-Erfahrung, 80%-Indikator, 5-Jahre-Nutzungsdauer).
- **Fall 2** ([Dossier](dossier-02.md)): Gut strukturierter, ehrlicher Roh-Entwurf mit vorbildlich unbeziffertem Finanzplan, der aber im Beteiligungs-/Konzeptteil konkrete Strukturen (Schulhofrat, Laubbaum-Konzept, Hausmeister, Elternverteiler) erfindet, obwohl der Nutzer dort ausdruecklich 'muessten wir noch gucken' sagte.
- **Fall 3** ([Dossier](dossier-03.md)): Bemerkenswert ehrlicher Lauf, in dem die Selbstkritik alle gefaehrlichen Falschzusagen tilgt und der Finanzplan unbeziffert bleibt; getruebt nur durch Scope-Creep Richtung Begruenung/Entsiegelung und einige Rest-Konkretisierungen ohne Vorbehalt.
- **Fall 4** ([Dossier](dossier-04.md)): Ehrlich strukturierter Arbeitsentwurf, der Nicht-Einreichbarkeit selbst erkennt, aber durch erfundene Mengen-/Zeitangaben im Fliesstext, reaktivierte Phantasie-Posten im Kostenrahmen und ein die duenne Idee ueberforderndes 3-Partner-Buendnisprogramm an Wert verliert.
- **Fall 5** ([Dossier](dossier-05.md)): Ehrlicher Umgang mit duennem Input (Finanzplan unbeziffert, kritischste Erfindung von der Critique gefangen), aber mit ausgeschmueckter Pausenhof-Szene, komplett erfundenem Zeitplan und teils gezwungenem Demokratie-Framing eines eigentlichen Praeventionsthemas.
- **Fall 6** ([Dossier](dossier-06.md)): Aus 'brauchen neue Instrumente' macht der Wizard dank funktionierender Selbstkritik ein sauberes Geruest, das aber auf der erfundenen Praemisse kulturell getrennter Hofpausen ruht und dessen Integrationswinkel vom Wizard selbst herbeigefragt statt vom Nutzer geliefert wurde.
- **Fall 7** ([Dossier](dossier-07.md)): Ehrliches, TODO-gespicktes Skelett mit vorbildlichem Finanzplan-Handling, getruebt durch erfundene Tragpfeiler (Foerderverein als Antragsteller, Lehrkraefte-Erfahrung, Drittmittelgeber) und einen Skalen-Mismatch zum sechsstelligen DBU-Programm.
- **Fall 8** ([Dossier](dossier-08.md)): Vorzeige-Fall fuer den Umgang mit duennem Input: die Critique fing 15.000-EUR-Betraege und Tablet-Stueckzahlen ab und ueberfuehrte sie in ehrliche Platzhalter; es bleibt nur eine kleinere Zeitplan-Halluzination, das Ergebnis ist ein brauchbarer, nicht irrefuehrender Arbeitsentwurf.
- **Fall 9** ([Dossier](dossier-09.md)): Antrag mit gespaltener Persoenlichkeit: bei Pflichtangaben (Partner, Federfuehrung, Zahlen, Finanzplan) vorbildlich ehrlich und TODO-markiert, beim Konzept dagegen mit erfundenen Hoerspielen, Tablets, Sessionzahlen und datierten Meilensteinen durchsetzt.
- **Fall 10** ([Dossier](dossier-10.md)): Der ehrlichste Lauf in puncto Selbstkritik (unbezifferter Finanzplan, fast alle Erfindungen getilgt), aber der Matcher scheitert klar: die DBU ist fuer ein 20-Kinder-Apfel-Projekt um Groessenordnungen zu gross, was der Antrag selbst eingesteht.

---
*Volle Nachvollziehbarkeit je Fall in `dossier-01.md` … `dossier-10.md` (Idee → Match → komplettes Interview → Facts → Finanzplan → Selbstkritik → fertiger Antrag → Gutachten).*