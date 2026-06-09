# Qualitaets-Review: Antragswizard bei spaerlichem Input

**Test:** 10 fiktive Grundschulen mit bewusst **knappen, vagen Ideen** durchlaufen den kompletten Prozess (Matching → Interview → fertiger Antrag). Die Interview-Antworten lieferte eine „ueberlastete Lehrkraft"-Persona, die auf fast jede Frage ausweichend antwortet. Frage: **Was macht der Wizard aus so duennem Input?**

**Umgebung:** isolierte Test-DB `edufunds_test`, lokaler Server, LLM = DeepSeek. Gesamtkosten der 10 Laeufe: ~0,19 €.

## Score-Uebersicht (1–5)

| Fall | Schule | Programm (Match) | Match | k.Halluz. | Luecken | Finanzpl. | Struktur | konkret | **Einreichbar** |
|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | Grundschule am Lindenpark | DigitalPakt Schule 2.0 | 5 | 4 | 5 | 5 | 4 | 4 | **3** |
| 2 | Astrid-Lindgren-Grundschule | deinSchulhof / Gruene Schulhoefe | 5 | 3 | 5 | 5 | 4 | 4 | **3** |
| 3 | Grundschule Sonnenblume | Energiesparmeister | 2 | 3 | 4 | 4 | 4 | 3 | **2** |
| 4 | Grundschule Buchenweg | Gemeinsam Digital! Kreativ mit M | 4 | 3 | 4 | 5 | 4 | 4 | **2** |
| 5 | Grundschule Am Muehlbach | Foerderfonds Demokratie | 4 | 4 | 4 | 5 | 4 | 4 | **3** |
| 6 | Pestalozzi-Grundschule | Kultur macht stark - Bündnisse f | 4 | 4 | 5 | 5 | 4 | 3 | **3** |
| 7 | Grundschule Regenbogen | deinSchulhof / Gruene Schulhoefe | 4 | 3 | 5 | 5 | 4 | 4 | **3** |
| 8 | Grundschule Kleeblatt | VDI-Joachim-Herz-Technikfonds | 4 | 4 | 5 | 4 | 4 | 3 | **3** |
| 9 | Grundschule Am Wald | Gemeinsam Digital! Kreativ mit M | 3 | 3 | 4 | 5 | 4 | 3 | **2** |
| 10 | Janusz-Korczak-Grundschule | DBU-Projektfoerderung (Foerderth | 2 | 2 | 4 | 4 | 4 | 3 | **2** |

**Durchschnitt:** Match 3.7 · k.Halluz. 3.3 · Luecken 4.5 · Finanzplan 4.7 · Struktur 4.0 · konkret 3.5 · **Einreichbarkeit 2.6**

## Gesamtbild
Bei absichtlich spaerlichem Input schlaegt sich der Wizard insgesamt deutlich ueberdurchschnittlich gut — er hat den Sprung vom naiven Antrags-Generator zum ehrlichen Arbeitsentwurf-Werkzeug grossteils geschafft. Die entscheidende Architektur-Verbesserung (Finanzplan-'unbeziffert'-Modus + Halluzinations-Gate) greift sichtbar: In 8 von 10 Faellen erfindet der ausgelieferte finalText KEINE Euro-Betraege mehr, obwohl die Nutzer keine Kostenbasis lieferten, und der Selbstkritik-Loop entfernt vorher erfundene Betraege/Fakten aus den Zwischenversionen nachweislich. Die Struktur-/Foerderlogik ist durchgehend programmspezifisch und vollstaendig (Struktur meist 4/5), und Wissensluecken werden ueberwiegend ehrlich per [TODO] markiert statt kaschiert (Luecken meist 4-5/5). Schwach bleibt der Wizard dort, wo der Input es erzwingt (leere Pflichtfelder, hohle Abschnitte) sowie bei zwei systematischen Eigenfehlern: erfundene Detail-Tatsachen (Termine, Partnerrollen, Verfahrensdetails) und ein Matcher, der vage Ideen teils in stark ueberdimensionierte oder strukturell unpassende Programme zwingt. Einreichbarkeit liegt input-bedingt niedrig (2-3/5), ist aber als ehrliches Geruest fast immer brauchbar.

## Wiederkehrende Muster / Schwachstellen
### Architektur-Fix Finanzplan greift durchgaengig — keine erfundenen Euro-Betraege mehr im finalText
Der 'unbeziffert'-Modus (posten=[], unbeziffert=true) plus Halluzinations-Gate funktioniert systematisch: In 8 von 10 Faellen enthaelt der ausgelieferte finalText KEINE erfundenen Euro-Betraege, obwohl die Section-Zwischenversionen sie noch enthielten (Fall 2: 7.000/4.000/3.500 EUR; Fall 5: passgenau auf 5.000 getrimmt; Fall 6: 1.500/800/150/170/2.450 EUR; Fall 7: bis 24.000 EUR; Fall 9: Gate fing 11.450 EUR ab). Nur in Fall 3 und 8 stehen abgeleitete/erfundene Betraege im finalText — beide aber transparent als 'Schaetzung' markiert und plausibel an Nutzerangaben verankert. Staerkste, am klarsten messbare Verbesserung der Probe.

*Betroffene Faelle:* 1, 2, 4, 5, 6, 7, 9, 10

### Residuale Halluzination konkreter Detail-Tatsachen, die der Loop uebersieht
Trotz funktionierendem Loop rutschen in fast allen Faellen erfundene konkrete Details als feststehende Fakten in den finalText: Projektzeitraeume/Termine und Meilensteinplaene (Faelle 2,4,9), Verfahrens-/Trainingsdetails wie '90-Minuten-Bloecke' (Fall 5), Partnerrollen und Equipment-Zusagen unbestaetigter Partner (Faelle 4,6,9), Ausgangslage-Erfindungen wie 'Geraete aus privaten Bestaenden' (Fall 1), Verstetigungsstrukturen wie AGs/Patengruppen (Fall 7), Verbreitungskanaele wie 'Thueringer Grundschultag' (Fall 10). Auffaellig: Der Loop fuegt teils sogar NEUE Halluzinationen hinzu (Fall 2 Zeitplan, Fall 6 Floskeln). Muster: Betraege werden zuverlaessig gefiltert, narrative/qualitative Detail-Erfindungen nicht.

*Betroffene Faelle:* 1, 2, 4, 5, 6, 7, 9, 10

### Matcher weicht bei vagen Gruen-Ideen auf Default 'deinSchulhof' aus und ueberdimensioniert/verbiegt Programme
Bei vagen Ideen tendiert der Matcher zu wiederkehrenden Programmen und Fehlpassungen. 'deinSchulhof' wird fuer jede vage Gruen-Idee gezogen (Faelle 2 und 7), wobei das ~20.000-EUR-Komplettumbau-Volumen fuer eine kleine Garten-Idee ueberdimensioniert ist (Fall 7). Zwei Mal wird das ausserschulische dbv-Buendnisprogramm (Bibliothekspflicht, Schule nicht antragsberechtigt) auf eine ueberlastete Einzel-Lehrkraft gematcht (Faelle 4 und 9). Fall 3 verbiegt ein Bewegungsanliegen per Suggestivfragen zum Energiesparprojekt; Fall 10 ist ein schwerer Fehlgriff (DBU 100k-400k mit 50% Eigenanteil fuer ein vierstelliges 2-Klassen-Projekt, Score 85 stark ueberhoeht).

*Betroffene Faelle:* 2, 3, 4, 7, 9, 10

### Selbstkritik-Loop ist staerkste Komponente, aber inkonsistent und teils ohne echte Revision
Der Loop entfernt nachweislich die groebsten Erfindungen der Erstentwuerfe (dokumentiert in 8 Faellen). Er ist aber inkonsistent: dieselbe Belegluecke wird teils korrigiert, teils als Faktum stehen gelassen (Fall 4: Partner markiert, aber Termine nicht; Fall 5: Partner entfernt, aber Foerderverein als bestehend behauptet). In zwei Faellen erkennt die Critique die Probleme offen, korrigiert sie aber NICHT (Fall 9: 5 offene HOCH-Befunde; Fall 10: hasOpenHighFindings=true, Programm-Mismatch erkannt aber nicht behoben).

*Betroffene Faelle:* 4, 5, 6, 9, 10

### Strukturverschleppung: Das urspruengliche Kernanliegen geht im veredelten Antrag teils verloren
Wenn der Matcher die Idee stark umdeutet, verschwindet das urspruengliche Nutzeranliegen aus dem Antrag. Am deutlichsten in Fall 9: Aus 'Kinder sprechen kaum Deutsch' (DaZ) wird ein Hoerspiel-Medienprojekt, der DaZ-Kern taucht im Bedarf nur noch generisch als 'Lesefoerderung' auf. Aehnlich Fall 3 (Bewegung wird zu Energiesparen) und Faelle 6/4 (Instrumente kaufen / Lesen foerdern werden zu aufwendigen ausserschulischen Buendnisprojekten). Das Anliegen wird der Programmpassung untergeordnet statt umgekehrt.

*Betroffene Faelle:* 3, 4, 6, 9

## Was der Wizard gut macht
- Finanzplan-Architektur-Fix wirkt systematisch: in 8 von 10 Faellen keine erfundenen Euro-Betraege im finalText (von zuvor 10/10 erfundenen Betraegen in den Zwischenversionen); das Halluzinations-Gate fing in Fall 9 sogar eine bereits erfundene Gesamtsumme (11.450 EUR) ab
- Wo Betraege im finalText stehen (Faelle 3, 8), sind sie transparent als 'Schaetzung' markiert und sauber an Nutzeraussagen verankert (Fall 8: 1.500 EUR = '20-30 Stueck x ~50 Euro', Begruendung zitiert die Aussage woertlich)
- Durchgaengig ehrliche Lueckenmarkierung per sichtbaren [TODO]-Platzhaltern und 'noch zu klaeren'-Formulierungen statt Kaschierung als Fakten (Luecken-Score meist 4-5/5)
- Selbstkritik-Loop entfernt nachweislich erfundene Betraege und Fakten aus den Erstentwuerfen vor Auslieferung (dokumentiert in 8 Faellen) — die wirksamste Qualitaetskomponente der Pipeline
- Vollstaendige, programmspezifische Foerderlogik: alle Pflichtabschnitte des jeweiligen Programms strukturell vorhanden und korrekt formuliert (Struktur-Score meist 4/5), inkl. Spezialkriterien wie Ausserschulischkeit, Buendnispflicht, Verwaltungspauschale
- Bei klaren Ideen exzellentes, nicht-Default Matching mit korrekten Warnhinweisen (Fall 1: DigitalPakt 2.0 Score 92; Fall 5: cleveres Pausenengel-Konzept aus Ein-Wort-Anliegen) inkl. Frist- und Vagheits-Rueckfragen
- Wenig generisches Blabla, wo echte Fakten vorliegen: bildhafte, nutzernahe Bedarfsszenen statt Marketing-Floskeln (Faelle 2, 5, 7, 10)
- Die Pipeline taeuscht keine Reife vor: mehrere Faelle benennen offen, dass der Antrag noch nicht einreichfertig ist (hasOpenHighFindings=true), was eine peinliche Falsch-Einreichung verhindert

## Empfehlungen (priorisiert)
- **[hoch]** Halluzinations-Diff-Gate auf narrative/qualitative Details ausweiten, nicht nur auf Euro-Betraege: Der Gate filtert Zahlen zuverlaessig, laesst aber erfundene Termine/Meilensteinplaene, Partnerrollen, Verfahrensdetails und Verbreitungskanaele durch (Faelle 1,2,4,5,7,9,10). Jeder konkrete Fakt im finalText sollte gegen die Nutzer-Facts geprueft und ohne Beleg automatisch zu '[TODO]/noch zu klaeren' degradiert werden.
- **[hoch]** Matcher haerten gegen Default-Ausweichen und Groessenordnungs-Bruch: 'deinSchulhof' nicht reflexhaft fuer jede vage Gruen-Idee (Faelle 2,7); ein Plausibilitaets-Check 'Projektvolumen vs. Programm-Foerderrahmen' einziehen, der DBU-Grossfoerderung fuer ein vierstelliges 2-Klassen-Projekt (Fall 10) oder ausserschulische Buendnisprogramme fuer eine ueberlastete Einzel-Lehrkraft (Faelle 4,9) automatisch abwertet oder mit explizitem 'strukturell ueberfordernd'-Warnhinweis versieht.
- **[hoch]** Selbstkritik-Loop konsistent durchsetzen: In Faellen 9 und 10 erkennt die Critique die Probleme (offene HOCH-Befunde, Programm-Mismatch), korrigiert sie aber nicht. Befunde gleicher Schwere muessen einheitlich behandelt werden (Fall 4: Partner markiert, Termine nicht); ein Gate sollte verhindern, dass die Revision NEUE unbelegte Inhalte einfuehrt (Fall 2 Zeitplan, Fall 6 Floskeln).
- **[mittel]** Suggestivfragen im Interview entschaerfen: In Fall 3 wurde der Lehrkraft der Energie-Frame aufgedraengt (CO2-Ampel, Heizenergieverlust), bis sie muede zustimmte. Das Interview sollte das urspruengliche Anliegen schuetzen statt es zur Programmpassung umzubiegen — und das Kernanliegen im Antrag erhalten (Fall 9: DaZ verschwindet komplett).
- **[mittel]** Konsistenz zwischen strukturiertem Finanzplan und Fliesstext herstellen: In Faellen 8 und 10 fuehrt der strukturierte Finanzplan/kostenrahmen Posten (500-EUR-Verbrauchsmaterial; teilzeit Fachkraft, externe Referentin), die der finalText bereits entschaerft hat oder die den Nutzer-Facts ('nur Sachleistungen') widersprechen. Beide Pipeline-Stufen muessen synchron bereinigt werden.
- **[mittel]** Wirkungs-/Zieldimension staerken: Mehrere Antraege bleiben bei messbaren Zielen/Indikatoren leer oder hohl (Faelle 1,4,6). Den Wizard so fuehren, dass er auch bei duennem Input wenigstens einen ehrlichen, als TODO markierten Vorschlag fuer Wirkungsindikatoren liefert, statt den Abschnitt mit Pathos zu fuellen (Fall 3 Innovations-Abschnitt).
- **[niedrig]** Programm-Konventionen (z.B. '7%-Verwaltungspauschale', 'Overhead-Pauschale') im kostenrahmen klar als Programmregel statt als Nutzerangabe kennzeichnen (Faelle 4,6,9) — vertretbar, aber leicht missverstaendlich als erfundener Posten.

## Kurzfazit je Fall
- **Fall 1** ([Dossier](dossier-01.md)): Ueberdurchschnittliches Ergebnis mit exzellentem Match (DigitalPakt 2.0, Score 92), unbeziffertem Finanzplan und wirksamem Loop; getruebt nur durch ein hartnaeckiges Rest-Detail (erfundene 'private Lehrkraft-Geraete') und hohle Pflichtabschnitte — als ehrlicher Arbeitsentwurf gut brauchbar.
- **Fall 2** ([Dossier](dossier-02.md)): Ehrlicher, gut strukturierter Arbeitsentwurf mit nahezu perfektem Match und ohne erfundene Betraege; Restschwaeche ist erzaehlerische Ausschmueckung aus dem Programmprofil (Pergola, Biodiversitaet) plus ein in der Revision NEU erfundener Zeitplan.
- **Fall 3** ([Dossier](dossier-03.md)): Solides, ehrlich mit Luecken umgehendes Geruest, dessen Loop die groebsten Erfindungen entschaerft — aber der Match verbiegt ein Bewegungsanliegen zwanghaft zum Energiesparprojekt, '4 Klassen' und '20-Euro-Timer' rutschen durch, und der wettbewerbsentscheidende Einsparnachweis bleibt leer.
- **Fall 4** ([Dossier](dossier-04.md)): Der unbeziffert-Finanzplan und der greifende Loop machen aus ausweichendem Input einen ehrlichen Arbeitsentwurf; eingetruebt durch erfundene Termine/Dauer/Meilensteine und Partnerrollen und ein Match auf ein organisatorisch ueberforderndes Buendnisprogramm.
- **Fall 5** ([Dossier](dossier-05.md)): Der beste Fall der Probe: aus 'Irgendwas gegen Mobbing' entsteht ein kohaerenter Antrag mit cleverem Pausenengel-Konzept und ohne erfundene Betraege; Schwachpunkte sind der als bestehend behauptete Foerderverein und einige erfundene Verfahrensdetails.
- **Fall 6** ([Dossier](dossier-06.md)): Vorzeige-Beispiel ohne erfundene Finanzbetraege und mit vorbildlicher 'weiss-nicht'-Transparenz; Schwaeche bleibt, dass die Revision vereinzelt neue Floskeln einbaut und der Antrag mangels Input eine ehrliche Vorlage statt eines einreichbaren Antrags ist.
- **Fall 7** ([Dossier](dossier-07.md)): Einer der staerkeren Faelle: Loop entfernt die groebsten Halluzinationen, Finanzplan bleibt unbeziffert; es bleiben aber erfundene Beteiligungs-/Pflegestrukturen (AG, Patengruppen, Beteiligungsabend) und ein realer Frist-/Traegerschafts-Blocker.
- **Fall 8** ([Dossier](dossier-08.md)): Erstaunlich ehrlicher Rohentwurf mit sauber an Nutzeraussagen verankertem Hauptbetrag (1.500 EUR); getruebt nur durch einen erfundenen 500-EUR-Verbrauchsmaterial-Posten und generische Fuellsprache — brauchbares Geruest, erst nach Nacharbeit einreichbar.
- **Fall 9** ([Dossier](dossier-09.md)): Ehrliches Halbfabrikat mit unbeziffertem Finanzplan (Gate fing 11.450 EUR ab) und transparenten TODOs; schwach durch frei erfundene Detail-Tatsachen (SLS 'bereits bekannt', kompletter Zeitplan), Verlust des DaZ-Kernanliegens und ein strukturell ueberforderndes Match.
- **Fall 10** ([Dossier](dossier-10.md)): Strukturell vollstaendiger, im Luecken- und Finanzplan-Umgang ehrlicher Antrag — der aber am falschen Grossprogramm (DBU 100k-400k) haengt und erfundene Verbreitungs- und Kostenfakten enthaelt, die die Self-Critique zwar erkennt, jedoch nicht ausbessert.

---
*Volle Nachvollziehbarkeit je Fall in `dossier-01.md` … `dossier-10.md` (Idee → Match → komplettes Interview → Facts → Finanzplan → Selbstkritik → fertiger Antrag → Gutachten).*