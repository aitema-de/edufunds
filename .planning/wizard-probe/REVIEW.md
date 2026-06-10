# Qualitaets-Review: Antragswizard bei spaerlichem Input

**Test:** 10 fiktive Grundschulen mit bewusst **knappen, vagen Ideen** durchlaufen den kompletten Prozess (Matching → Interview → fertiger Antrag). Die Interview-Antworten lieferte eine „ueberlastete Lehrkraft"-Persona, die auf fast jede Frage ausweichend antwortet. Frage: **Was macht der Wizard aus so duennem Input?**

**Umgebung:** isolierte Test-DB `edufunds_test`, lokaler Server, LLM = DeepSeek. Gesamtkosten der 10 Laeufe: ~0,19 €.

## Score-Uebersicht (1–5)

| Fall | Schule | Programm (Match) | Match | k.Halluz. | Luecken | Finanzpl. | Struktur | konkret | **Einreichbar** |
|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | Grundschule am Lindenpark | DigitalPakt Schule 2.0 | 5 | 4 | 5 | 5 | 4 | 3 | **2** |
| 2 | Astrid-Lindgren-Grundschule | deinSchulhof / Gruene Schulhoefe | 5 | 4 | 5 | 5 | 4 | 3 | **3** |
| 3 | Grundschule Sonnenblume | KlimaLab - Klimaschutz-Engagemen | 3 | 3 | 4 | 5 | 4 | 3 | **3** |
| 4 | Grundschule Buchenweg | Gemeinsam Digital! Kreativ mit M | 4 | 2 | 4 | 2 | 4 | 4 | **3** |
| 5 | Grundschule Am Muehlbach | Foerderfonds Demokratie | 4 | 3 | 5 | 5 | 4 | 4 | **3** |
| 6 | Pestalozzi-Grundschule | Kultur macht stark - Bündnisse f | 5 | 3 | 4 | 4 | 4 | 3 | **3** |
| 7 | Grundschule Regenbogen | deinSchulhof / Gruene Schulhoefe | 5 | 2 | 4 | 4 | 5 | 3 | **3** |
| 8 | Grundschule Kleeblatt | Heinz Nixdorf Stiftung - Projekt | 4 | 4 | 5 | 5 | 5 | 4 | **3** |
| 9 | Grundschule Am Wald | Gemeinsam Digital! Kreativ mit M | 4 | 4 | 5 | 5 | 4 | 4 | **2** |
| 10 | Janusz-Korczak-Grundschule | DBU-Projektfoerderung (Foerderth | 3 | 2 | 3 | 2 | 4 | 3 | **2** |

**Durchschnitt:** Match 4.2 · k.Halluz. 3.1 · Luecken 4.4 · Finanzplan 4.2 · Struktur 4.2 · konkret 3.4 · **Einreichbarkeit 2.7**

## Gesamtbild
Bei absichtlich spaerlichem Input liefert der Wizard ueberwiegend ehrliche, strukturell vollstaendige Antrags-Gerueste statt schein-fertiger Halluzinations-Antraege - ein klarer Fortschritt gegenueber der frueheren Probe (Einreichbarkeit Oe 2,2, Finanzplan-Betraege in allen 10 erfunden). Der Architektur-Fix wirkt sichtbar: In 7 von 10 Faellen laeuft der Finanzplan korrekt im 'unbeziffert'-Modus ohne erfundene Euro-Betraege, Wissensluecken werden ueberwiegend transparent mit [TODO]-Markern ausgewiesen, und der Selbstkritik-Loop entfernt nachweislich die groebsten Roh-Erfindungen (Phantasie-Betraege, KMK-Spezifik, fixe Termine). Die Schwaechen liegen jetzt an drei klar benennbaren Bruchstellen: (1) narrative/szenische Erfindungen (Personen, Settings, Partnerrollen) rutschen durch die Critique, weil sie nicht als Belegluecke erkannt werden; (2) der strukturierte Finanzplan-'kostenrahmen' schleppt erfundene Posten-Kategorien weiter, die der Fliesstext bereits getilgt hatte; (3) der Matcher waehlt bei vagen Ideen wiederholt prominente oder ueberdimensionierte Programme. Insgesamt: vertrauenswuerdige Arbeitsgrundlagen, aber noch nicht einreichungsreif - was bei diesem Input fair und ehrlich kommuniziert ist.

## Wiederkehrende Muster / Schwachstellen
### Finanzplan ueberwiegend ehrlich unbeziffert - aber 3 Faelle erfinden weiter Betraege
Der Architektur-Fix greift in der Mehrheit: In den Faellen 1, 2, 3, 5, 6, 8, 9 laeuft der strukturierte Finanzplan korrekt im 'unbeziffert'-Modus (posten leer, kein erfundener Euro-Betrag), nachweislich wurden Zwischenversions-Erfindungen (39.000, 25.000-28.000, 30-35k, 25.000 EUR etc.) im finalText getilgt. Drei Faelle erfinden jedoch weiter komplette Betraege: Fall 4 (gesamter Finanzplan aus grober Gesamtspanne konstruiert, PLUS Rechenfehler 10.500 statt 10.000 EUR, vom System selbst erkannt aber unkorrigiert), Fall 7 (sieben erfundene Euro-Posten, immerhin als 'Schaetzung' markiert), Fall 10 (37.200 EUR Gesamtkosten + erfundene Personalstelle 8.000 + Overhead 3.600, sogar HOEHER als der gerueegte Ausgangswert - Revision verschlimmbessert).

*Betroffene Faelle:* 4, 7, 10

### Narrative/szenische Halluzinationen rutschen systematisch durch die Critique
Der Selbstkritik-Loop faengt Zahlen und belegbare Fakten, aber NICHT erzaehlerische Erfindungen: erfundene namentliche Kinder mit Alter (Fall 3 'Mia (8)', Fall 7 dritte Klasse/dritte Stunde/einziger Baum), erfundene Settings (Fall 8 Ganztag/Jahrgangsstufen 3-4/Sachunterricht, Fall 9 Bibliotheks-Verortung als raeumliche Tatsache, Fall 10 Verpackungs-/Transport-Umweltframe). Besonders heikel: erfundene Beleg-QUELLEN, die Nichtwissen als Seriositaet kaschieren (Fall 6 'Sprachstandserhebungen', Fall 4 '7% gemaess Richtlinie'). Teilweise wird die Erfindung sogar von der Critique aktiv eingefordert (Fall 7 Finding 10, Fall 3 Finding 12).

*Betroffene Faelle:* 1, 2, 3, 4, 6, 7, 8, 9, 10

### Erfundene Partner/Personen/Schuelerzahlen im Widerspruch zur Nutzeraussage
Konkrete Akteure und Zahlen werden erfunden, teils im direkten Widerspruch zum Gesagten: erfundener Foerderverein samt Vorstandsbeschluss (Fall 5, Nutzer sagte nur 'Klassenlehrer machen das nebenbei'), 'Schultraeger' statt des genannten Foerdervereins (Fall 6), zurueckgekehrte 'ehrenamtliche Lesepaten' als 800-EUR-Posten (Fall 4) bzw. Kostenkategorie (Fall 9), externe Ernaehrungspaedagogin trotz 'machen wir selbst/Kollegium' (Fall 10), erfundene Eigenmittelquelle 'Schulbudget fuer Projekttage' (Fall 10), Bauhof-Zusage der Kommune (Fall 7), 'vierzuegig' rechnerisch falsch (Fall 3), Fachfestlegung Deutsch/Mathematik (Fall 1).

*Betroffene Faelle:* 1, 3, 4, 5, 6, 7, 9, 10

### Finanzplan-'kostenrahmen' reintroduziert Posten, die der Fliesstext schon getilgt hatte
Selbst wenn der Fliesstext bereinigt ist, schleppt die strukturierte kostenrahmen-Liste erfundene Posten-Kategorien weiter - die Repair-Logik greift im strukturierten Finanzteil nicht: 'ehrenamtliche Lesepaten' (Fall 9), Raummiete/Bustransfer/Notenblaetter/Schultraeger (Fall 6), Abschlussveranstaltung/Flyer-Druck (Fall 5), Werbematerialien (Fall 5). Eigene Trust-Boundary-Luecke zwischen Fliesstext-Gate und Finanzobjekt.

*Betroffene Faelle:* 5, 6, 9

### Matcher weicht bei vagen Ideen auf prominente/ueberdimensionierte oder thematisch verschobene Programme aus
deinSchulhof wird bei vagen Schulhof-/Bewegungsideen wiederholt gewaehlt - in Fall 3 verliert dabei die Kern-Absicht 'mehr Bewegung' komplett (Interviewer lenkte ab Runde 1 still auf Versiegelung um). In Fall 10 waehlt der Matcher das groesste/prestigetraechtigste DBU-Programm (100.000-400.000 EUR, 50% Eigenanteil) fuer eine Kochworkshop-Idee, obwohl passendere kleine Treffer vorlagen. Faelle 4 und 9 legen einer ueberlasteten Lehrkraft ein anspruchsvolles 3-Partner-Buendnisprogramm auf. Praezise Treffer dagegen in 1, 2, 6, 7, 8 (Tablets->DigitalPakt, Garten/Hitze->deinSchulhof, Musik->Liz Mohn).

*Betroffene Faelle:* 3, 4, 9, 10

### hasOpenHighFindings=true blockiert die Auslieferung nicht
Mehrere Antraege werden trotz selbst erkannter offener HIGH-Halluzinationen als 'complete' ausgeliefert. In Fall 10 meldet das System hasOpenHighFindings=true UND einen nicht reparierten hallucinationGate (Resttreffer 20.000/3.000 EUR), liefert aber trotzdem aus. Auch Fall 6 (Finding 12 offen, 7 nur teilweise) und Fall 1 (22%-Residual) zeigen: das Quality-Gate erkennt, blockiert aber nicht.

*Betroffene Faelle:* 1, 6, 10

### Lueckenmarkierung als durchgaengige Staerke
In nahezu allen Faellen werden Wissensluecken transparent mit [TODO]-Markern, Konjunktiv und expliziten 'noch zu klaeren'-Hinweisen ausgewiesen statt als Fakten kaschiert - die [TODO]-Liste fungiert faktisch als praezise programmspezifische Beschaffungs-Checkliste. Ausnahmen sind nur die oben genannten narrativen Erfindungen und erfundenen Quellen, die das Nichtwissen kaschieren.

*Betroffene Faelle:* 1, 2, 3, 4, 5, 6, 8, 9

## Was der Wizard gut macht
- Finanzplan-Architektur-Fix wirkt: 7 von 10 Faellen ohne erfundene Euro-Betraege (unbeziffert-Modus), nachweisliche Tilgung der Zwischenversions-Phantasiezahlen im finalText
- Vorbildliche, durchgaengige Lueckenmarkierung mit [TODO]-Markern, Konjunktiv und 'vor Einreichung zu klaeren'-Hinweisen - die offene Hausaufgabenliste ist faktisch eine programmspezifische Beschaffungs-Checkliste
- Selbstkritik-Loop entfernt nachweislich die groebsten Roh-Erfindungen (Phantasie-Betraege, KMK-Spezifik, fixe Termine, 90/10-Split) - in Faellen 8 und 9 besonders wirksam
- Strukturell vollstaendige, programmgerechte Foerderlogik trotz minimalem Input (Bedarf->Ziel->Massnahme->Wirkung->Nachhaltigkeit->Finanzplan)
- Praezises Programm-Matching bei klar interpretierbaren Ideen (Tablets->DigitalPakt, Garten/Hitze->deinSchulhof, Musik->Liz Mohn) inkl. ehrlicher 'achtung_bei'-Hinweise
- Konkrete, aus echten Nutzerangaben gespeiste Szenen und didaktisch fundierte Begruendungen statt reinem Foerder-Blabla (Faelle 4, 8, 9)
- Ehrlichkeit ueber Einreichbarkeit: hasOpenHighFindings wird transparent gemeldet statt versteckt - kein schein-fertiger Antrag wird vorgetaeuscht

## Empfehlungen (priorisiert)
- **[hoch]** Finanzplan-Erfindung in den Restfaellen schliessen: Faelle 4, 7 und 10 erzeugen weiter komplette Euro-Betraege (inkl. erfundener Personalstellen und Overhead). Den 'unbeziffert'-Modus konsequent erzwingen, sobald der Nutzer keine posten-genaue Kostenbasis geliefert hat - eine grobe Gesamtspanne (Fall 4) oder Foerderverein-Groesse (Fall 10) darf NICHT zur Aufschluesselung hochgerechnet werden.
- **[hoch]** hasOpenHighFindings=true und nicht reparierter hallucinationGate muessen die Auslieferung als 'complete' blockieren (Auslieferungs-Block / Hebel 2 aus MEMORY). Faelle 6 und 10 liefern trotz selbst erkannter offener HIGH-Halluzinationen aus - das untergraebt das gesamte Quality-System.
- **[hoch]** Fakt-Verifikations-Pass auf narrative Erfindungen ausweiten: erfundene Personen (Mia/Fall 3), Settings (Ganztag/Jahrgangsstufen/Fall 8), Partnerrollen und vor allem erfundene Beleg-QUELLEN (Sprachstandserhebungen/Fall 6, '7% gemaess Richtlinie'/Fall 4), die Nichtwissen als Seriositaet kaschieren. Jeder nicht durch Facts/Antworten gedeckte Eigenname, Termin oder Quellenverweis -> [TODO] statt Faktum.
- **[mittel]** Halluzinations-Gate auf das strukturierte Finanzplan-Objekt (kostenrahmen-Kategorien) ausdehnen, nicht nur auf den Fliesstext. Faelle 5, 6 und 9 zeigen: der Fliesstext ist bereinigt, aber die kostenrahmen-Liste schleppt erfundene Posten (ehrenamtliche Lesepaten, Raummiete, Bustransfer, Schultraeger) weiter - dieselbe Trust-Boundary wie im Fliesstext anwenden.
- **[mittel]** Rechen-/Konsistenz-Reparatur scharfschalten: Fall 4 liefert einen Finanzplan, der nicht aufgeht (10.500 vs. 10.000 EUR), vom eigenen consistencyIssue erkannt aber unkorrigiert. Erkannte betrag-unstimmig-Findings muessen einen Repair erzwingen oder die Auslieferung blocken.
- **[mittel]** Matcher haerten gegen Default-Ausweichen und Groessenordnungs-Unplausibilitaet: Plausibilitaetscheck Foerdervolumen vs. genannte Kostenschaetzung (Fall 10: DBU 100-400k fuer Kochworkshop), und bei vagen Ideen die Kern-Absicht verifizieren statt sie umzudeuten (Fall 3: 'Bewegung' geht im Begruenungsprojekt verloren).
- **[mittel]** Repair-Artefakte verhindern: Fall 7 enthaelt einen grammatikalisch zerstoerten Satz im Finanzierungsabschnitt ('entfallen die genaue Hoehe wird im Finanzplan beziffert auf ...') als Folge des Gate-Eingriffs. Nach jeder Streichung den Satz syntaktisch neu validieren (Never-Worse-Gate auch auf Lesbarkeit).
- **[niedrig]** Interviewer-Framing pruefen: in Fall 3 lenkte der Interviewer die Idee ab Runde 1 still auf 'Versiegelung/Hitze' um, ohne die urspruengliche Bewegungsabsicht zu verifizieren - eine Rueckfrage zur Kernabsicht vor dem Umdeuten einbauen.
- **[niedrig]** Floskel-/Redundanz-Bereinigung: Betrags-Entfernung erzeugt repetitive 'wird im Finanzplan beziffert'-Ketten (Faelle 1, 9) und gestreckte Paedagogik-Pathos-Strecken; einen abschliessenden Sprachglaettungs-Pass nach dem Gate ergaenzen.

## Kurzfazit je Fall
- **Fall 1** ([Dossier](dossier-01.md)): Aus quasi null Input ein ehrliches, durchgaengig [TODO]-markiertes DigitalPakt-Geruest mit unbeziffertem Finanzplan; nur die '22% Eigenanteil' und die Fachfestlegung Deutsch/Mathematik rutschten als unbelegte Setzungen durch.
- **Fall 2** ([Dossier](dossier-02.md)): Vorzeige-Fall des Architektur-Fix: praezises deinSchulhof-Match, Finanzplan ehrlich unbeziffert, Selbstkritik-Loop schloss alle 12 Findings nachweislich - nur 'Asphalt' und die Eingangsszene blieben minimal unbelegt.
- **Fall 3** ([Dossier](dossier-03.md)): Strukturell vollstaendiges, ehrliches Geruest mit sauberem unbezifferten Finanzplan, aber narrative Resthalluzinationen (Mia, vierzuegig, Zierbeete) und ein Match, das die Kern-Absicht 'mehr Bewegung' zugunsten eines Begruenungsprojekts verlor.
- **Fall 4** ([Dossier](dossier-04.md)): Einer der besseren Faelle (TODO-Transparenz, entfernte Fantasietermine), getruebt durch zurueckgekehrte ehrenamtliche Lesepaten als 800-EUR-Posten und einen frei erfundenen Finanzplan, der obendrein nicht aufgeht (10.500 statt 10.000 EUR).
- **Fall 5** ([Dossier](dossier-05.md)): Deutlicher Fortschritt mit komplett unbeziffertem Finanzplan und transparenten Luecken, aber der erfundene Foerderverein samt Vorstandsbeschluss im Traeger-Abschnitt bleibt eine residuale Halluzination.
- **Fall 6** ([Dossier](dossier-06.md)): Erstaunlich ehrlicher, gut strukturierter Liz-Mohn-Entwurf, dessen Halluzinations-Bremse aber lueckenhaft greift: erfundene Beleg-Quelle 'Sprachstandserhebungen' und im kostenrahmen wieder auftauchende erfundene Posten (Schultraeger, Bustransfer, Raummiete).
- **Fall 7** ([Dossier](dossier-07.md)): Strukturell starker, fair gekennzeichneter Schaetz-Finanzplan, aber ein grammatikalisch korrupter Repair-Satz, eine bewusst erfundene Hitzewelle-Szene und als Fakten getarnte Pflege-/Traegerdetails (Bauhof, Patenschaften) muessen vor Abgabe nachgearbeitet werden.
- **Fall 8** ([Dossier](dossier-08.md)): Der staerkste Probe-Antrag: Selbstkritik-Loop entfernte die meisten gefaehrlichen Halluzinationen und der Finanzplan blieb ehrlich unbeziffert - es ueberleben aber narrative Erfindungen (Ganztag, Jahrgangsstufen, Sachunterricht) und behauptete DigitalPakt-1-Beschaffungen.
- **Fall 9** ([Dossier](dossier-09.md)): Lehrstueck fuer richtigen Umgang mit duennstem Input: ein halluzinationsdurchsetzter Draft wurde zu einem ehrlichen [TODO]-Geruest zurueckgebaut, doch die Finanzplan-Kategorie 'ehrenamtliche Lesepaten' und die Bibliotheks-Verortung rutschen durch - als dbv-Buendnisantrag input-bedingt nicht einreichbar.
- **Fall 10** ([Dossier](dossier-10.md)): Tadellose Struktur mit vielen ehrlichen TODOs, aber der Finanzteil ist von erfundenen Zahlen durchzogen (37.200 EUR, Personalstelle, fiktive Eigenmittelquelle) und das System liefert trotz selbst erkannter offener HIGH-Halluzinationen aus - bei ueberdimensioniertem DBU-Programm nicht einreichbar.

---
*Volle Nachvollziehbarkeit je Fall in `dossier-01.md` … `dossier-10.md` (Idee → Match → komplettes Interview → Facts → Finanzplan → Selbstkritik → fertiger Antrag → Gutachten).*