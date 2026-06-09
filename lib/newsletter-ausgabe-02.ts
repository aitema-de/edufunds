import { NewsletterData } from '@/lib/newsletter';

/**
 * EduFunds Newsletter Ausgabe #1 (ERSTAUSGABE)
 *
 * Ausgabe: Februar 2025
 * Mit recherchierten, verifizierten Inhalten
 */

export const newsletterData: NewsletterData = {
  issueNumber: 'Ausgabe #1',
  issueDate: '2025-02-12',
  leadTitle: 'Willkommen bei EduFunds! Ihr Kompass für Schulförderung',
  leadContent: 'Liebe Leserinnen und Leser,<br><br>herzlich willkommen zur ersten Ausgabe des EduFunds-Newsletters! Wer wir sind? <strong>EduFunds ist die intelligente Plattform für Schulförderung in Deutschland.</strong> Unsere Mission ist einfach: Wir helfen Schulen, das passende Förderprogramm zu finden und erfolgreiche Anträge zu stellen. Mit unserem KI-gestützten Antragsassistenten, einer Datenbank mit über 129 Förderprogrammen und praxisnahen Tipps machen wir Bildungsförderung zugänglich für alle.<br><br><strong>Warum dieser Newsletter?</strong> Weil wir überzeugt sind, dass jede Schule Potenzial hat – und oft fehlt nur das nötige Kleingeld für die nächste große Idee. Ob MINT-Labor, Theater-AG, Digitalisierung oder Inklusion: Es gibt mehr Fördermittel, als gemeinhin bekannt. Unser Newsletter bringt Ihnen wöchentlich die neuesten Programme direkt in Ihr Postfach, erklärt komplexe Antragsverfahren Schritt für Schritt und liefert Einblicke in erfolgreiche Projekte anderer Schulen.<br><br><strong>Wer steckt dahinter?</strong> Ein Team aus Bildungsexperten, Technik-Enthusiasten und erfahrenen Antragstellern mit jahrelanger Erfahrung in der Schulförderung. Wir kennen die Bürokratie, kennen die Fallstricke – und wissen genau, worauf Fördergeber achten.<br><br><strong>Was erwartet Sie?</strong> Jeden Dienstagmorgen erhalten Sie fundierte Recherche zu aktuellen Fördermöglichkeiten, praxiserprobte Antragstipps, politische Hintergründe und Kurzmeldungen aus der Bildungslandschaft. Alles faktenbasiert, alles mit direkten Links zu den Originalquellen.<br><br><strong>Los geht\'s!</strong> Schauen Sie sich auf unserer Website um, entdecken Sie passende Programme für Ihre Schule und starten Sie Ihren ersten Förderantrag. Wir begleiten Sie auf dem Weg – von der Idee bis zur Bewilligung.<br><br>Ihr EduFunds-Team',
  
  programs: [
    {
      name: 'Erasmus+ Schulbildung 2026',
      funder: 'EU-Programm / Nationale Agentur für Erasmus+',
      deadline: '19. Februar 2026 (Akkreditierung)',
      targetGroup: 'Alle Schularten mit EU-Partnern',
      description: 'Das EU-Programm Erasmus+ steht für grenzenloses Lernen und ist mit satten 5 Milliarden Euro ausgestattet – ein Zuwachs von 6,5 Prozent gegenüber dem Vorjahr. Für Schulen öffnet sich damit ein Tor zu internationalen Partnerschaften, Lehrerfortbildungen im Ausland und Schüleraustauschen. Sie können aus vier verschiedenen Formaten wählen: Die Akkreditierung (Bewerbung bis 19. Februar 2026) ermöglicht langfristige Kooperationen, Kurzzeitprojekte bringen schnelle Erfolge, Kleinere Partnerschaften (Frist: 5. März 2026) sind ideal für den Einstieg, und Europäische Partnerschaften für Schulentwicklung (Frist: 9. April 2026) fördern große strukturelle Veränderungen. Besonders gefördert werden Projekte zu sozialer Inklusion, digitaler Transformation und nachhaltiger Entwicklung. Der Förderzeitraum startet am 1. Juni 2026 – also rechtzeitig planen!',
      url: 'https://erasmusplus.schule/termine/antragstermine'
    },
    {
      name: 'MINT-freundliche Schule 2026',
      funder: 'Initiative "MINT Zukunft schaffen!" (KMK & Wirtschaft)',
      deadline: '31. Mai 2026',
      targetGroup: 'Alle Schularten und -formen',
      description: 'Mathematik, Informatik, Naturwissenschaften und Technik sind die Zukunftsfächer unserer Zeit – und genau hier setzt das Qualitätssiegel "MINT-freundliche Schule" an. Unter der Schirmherrschaft der Kultusministerkonferenz (KMK) und mit Unterstützung führender Wirtschaftsunternehmen zeichnet diese Initiative Schulen aus, die in MINT-Fächern besonderes Engagement zeigen. Über 3.000 Schulen in Deutschland tragen bereits stolz das Signet, das drei Jahre lang gültig ist und Ihre Schule bei Eltern, Partnern und potenziellen Sponsoren sichtbar macht. Alternativ können Sie sich auch als "Digitale Schule" bewerben, wenn Ihr Fokus auf der umfassenden Digitalisierung des Unterrichts liegt. Die Bewerbung ist für alle Schularten möglich – von der Grundschule bis zur Berufsschule. Nutzen Sie diese Chance, Ihre MINT-Arbeit bundesweit sichtbar zu machen!',
      url: 'https://mintzukunftschaffen.de/bewerbungsunterlagen-2/'
    },
    {
      name: 'Deutscher Schulpreis 2026',
      funder: 'Robert Bosch Stiftung & Heidehof Stiftung',
      deadline: '30. April 2026 (Hospitationsbewerbung)',
      targetGroup: 'Alle Schulen mit innovativen Konzepten',
      description: 'Er gilt als der Oscar unter den Schulpreisen: Der Deutsche Schulpreis der Robert Bosch Stiftung und Heidehof Stiftung zeichnet seit Jahren Schulen mit innovativen Lernkonzepten aus und ist mit bis zu 100.000 Euro Preisgeld dotiert. Doch nicht nur die Gewinner profitieren: Ab dem 16. März 2026 können sich Schulen erstmals für das neue Hospitationsprogramm bewerben – mit einer Frist bis zum 30. April 2026. Dieses einzigartige Format ermöglicht es Ihnen und Ihren Kolleginnen, eine Woche lang in eine Preisträgerschule zu schnuppern. Sie erleben vor Ort, wie erfolgreiche Schulen ihren Alltag gestalten, wie sie Unterricht innovativ gestalten und wie sie eine positive Lernkultur etablieren. Diese Inspiration nehmen Sie mit an Ihre eigene Schule und setzen sie gezielt um. Eine Investition in die eigene Professionalisierung, die sich auszahlt!',
      url: 'https://www.deutscher-schulpreis.de'
    }
  ],
  
  tipTitle: 'Die 5-Satz-Struktur für überzeugende Projektziele',
  tipContent: 'Fördergeber lesen Dutzende Anträge täglich – machen Sie es ihnen leicht, Ihres zu finden! Die klare Struktur ist das A und O einer erfolgreichen Projektskizze. Nutzen Sie diese bewährte 5-Satz-Struktur für Ihre Projektziele, die bei jedem Förderprogramm funktioniert:<br><br><strong>Satz 1 – Die Ausgangslage:</strong> Beschreiben Sie prägnant, welches konkrete Problem oder Defizit an Ihrer Schule besteht. Vermeiden Sie allgemeine Floskeln wie "Bildung ist wichtig". Stattdessen: "An unserer Schule fehlt eine strukturierte Berufsorientierung für die Sekundarstufe I."<br><br><strong>Satz 2 – Das Ziel:</strong> Formulieren Sie ein konkretes, messbares Ziel. Was genau wollen Sie erreichen? "Wir wollen erreichen, dass 90 Prozent unserer Abschlussklasse vor dem Schulabschluss ein mindestens zweiwöchiges Praktikum absolviert."<br><br><strong>Satz 3 – Die Zielgruppe:</strong> Benennen Sie klar, wer genau profitiert. Zahlen wirken überzeugend: "Profitieren werden 85 Schülerinnen und Schüler der Klassen 9 und 10, darunter gezielt 20 Prozent mit Migrationshintergrund."<br><br><strong>Satz 4 – Die Methode:</strong> Skizzieren Sie kurz, wie Sie das Ziel erreichen wollen. "Durch ein strukturiertes Betriebsbesuchsprogramm mit Begleitung durch Berufsberater, Unternehmenspräsentationen und Elternabende."<br><br><strong>Satz 5 – Das Ergebnis:</strong> Definieren Sie messbare Erfolgsindikatoren. "Gemessen anhand der Praktikumsnachweise, evaluiert durch Schülerbefragungen und Elternfeedback am Ende des Schuljahres."<br><br><strong>So wirkt das zusammen:</strong> "An unserer Schule fehlt eine strukturierte Berufsorientierung (1). Wir wollen erreichen, dass 90 Prozent der Abschlussklasse ein Praktikum absolvieren (2). Profitieren werden 85 Schüler der Klasse 9 (3). Durch ein strukturiertes Betriebsbesuchsprogramm mit Begleitung (4), gemessen anhand der Praktikumsnachweise und Evaluationen (5)." Diese Struktur zeigt dem Fördergeber: Sie wissen genau, was Sie wollen und wie Sie es erreichen!',

  insightCategory: 'Analyse',
  insightReadTime: 5,
  insightTitle: 'DigitalPakt 2.0: Was die neue Koalition für Schulen plant',
  insightContent: 'Der Koalitionsvertrag von CDU/CSU und SPD ist veröffentlicht – und er setzt klare Signale für die Bildungspolitik der kommenden vier Jahre. Das zentnte Stichwort lautet: DigitalPakt 2.0. Doch anders als beim ersten DigitalPakt, der mit 6,5 Milliarden Euro vor allem Hardware und Infrastruktur in deutsche Schulen brachte, soll es beim Nachfolger um etwas ganz anderes gehen: um die pädagogische Integration.<br><br>Die geplanten Schwerpunkte lesen sich vielversprechend: KI-gestützte Lernsysteme, die individualisiertes Lernen ermöglichen und Lehrkräfte bei der Differenzierung entlasten. Endgeräte für bedürftige Schüler, damit digitale Bildung nicht vom Geldbeutel der Eltern abhängt. Und vor allem: eine massive Investition in Lehrerfortbildung. Denn Studien der letzten Jahre zeigen eindeutig: Ohne geschulte Lehrkräfte, die die Technik didaktisch sinnvoll einsetzen können, bleibt selbst die beste Hardware ungenutzt oder wird zur Bleilast.<br><br>Besonders spannend für Schulen ist die angekündigte "Qualifizierungsoffensive" für Jugendliche ohne Abschluss und der weitere Ausbau der MINT-Förderung. Die neue Koalition will offenbar gezielt dort ansetzen, wo der Fachkräftemangel am drückendsten ist. Gleichzeitig findet Bildung für nachhaltige Entwicklung (BNE) Erwähnung – wenn auch noch ergänzend.<br><br><strong>Was bedeutet das konkret für Ihre Schule?</strong> Wer jetzt Anträge mit digitalem Fokus, MINT-Schwerpunkten oder inklusiven Ansätzen stellt, liegt voll im Trend der kommenden Legislaturperiode. Die politischen Signale sind eindeutig: Die Mittel werden fließen, die Prioritäten sind gesetzt. Nutzen Sie diese Zeit, um Ihre Projekte zu entwickeln und sich frühzeitig zu positionieren. Denn die besten Fördermittel nutzen nichts, wenn man sie nicht beantragt!',
  insightCtaText: 'Digitale Förderprogramme entdecken',
  insightCtaUrl: 'https://edufunds.org/foerderprogramme',
  
  newsItems: [
    {
      text: 'Baden-Württemberg startet Bildungsreform: Rückkehr zu G9-Gymnasium, mehr Stunden in Deutsch/Mathe/Fremdsprache ab Klasse 5',
      url: 'https://www.baden-wuerttemberg.de/de/service/presse/pressemitteilung/pid/landesregierung-bringt-bildungsreform-auf-den-weg'
    },
    {
      text: 'Zukunftsmission Bildung feiert einjähriges Jubiläum mit Fortschrittsbericht für zukunftsfähiges Bildungssystem',
      url: 'https://www.zukunftsmission-bildung.de'
    },
    {
      text: 'Berlin: Wilhelm-Wernicke-Preis 2025 – bis 20.000 € für Projekte mit Sport, Bildung und Integration (Bewerbung bis 31.10.2025)',
      url: 'https://www.berlin.de/special/gesundheit-und-fitness/sportfoerderung/'
    },
    {
      text: 'Startchancen-Programm: Baden-Württemberg und Berlin vergeben Investitionsmittel an benachteiligte Schulen',
      url: 'https://www.bundesregierung.de/breg-de/bundesregierung/startchancen-programm'
    },
    {
      text: 'Hob-Preis 2025-2027: Playmobil-Stiftung vergibt bis 250.000 € für inklusive Konzepte in Klassen 1-4',
      url: 'https://www.hob-stiftung.de'
    }
  ],
  
  year: 2025
};

export default newsletterData;
