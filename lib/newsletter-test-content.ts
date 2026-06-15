import { NewsletterData } from '@/lib/newsletter';

/**
 * EduFunds Test Newsletter #1
 * 
 * Ausgabe: Februar 2025
 * Mit echten, recherchierten Förderprogrammen
 */

export const testNewsletterData: NewsletterData = {
  issueNumber: 'Ausgabe #1',
  issueDate: '2025-02-12',
  isKickoff: true,
  leadTitle: 'Schön, dass Sie da sind!',
  leadContent: 'Liebe Leserinnen und Leser,\n\nwillkommen zur allerersten Ausgabe des EduFunds-Newsletters! Wir freuen uns sehr, dass Sie dabei sind. Einmal im Monat schicken wir Ihnen von nun an die wichtigsten Förderchancen für Schulen und Vereine, einen handfesten Praxis-Tipp fürs Antragschreiben und einen Blick hinter die Kulissen der Bildungsförderung. Bevor es richtig losgeht, möchten wir uns kurz vorstellen – und erzählen, warum es EduFunds überhaupt gibt.',
  stats: [
    { value: '178', label: 'Förderprogramme im Blick' },
    { value: '103', label: 'davon für KI-Anträge vorbereitet' },
    { value: 'Minuten', label: 'bis zum Antragsentwurf statt Wochen' },
  ],
  introStory: {
    lead: 'Schulen und Fördervereine stecken voller guter Ideen – ein Schulgarten, ein Leseclub, neue Tablets, ein Theaterprojekt. Das Geld dafür gäbe es oft sogar: In Deutschland existieren hunderte Förderprogramme. Nur findet sie kaum jemand, und die Anträge dahinter sind ein Dschungel aus Richtlinien, Fristen und Formularen.\n\nGenau hier setzen wir an. EduFunds ist ein Angebot der aitema GmbH aus Berlin: ein gepflegter Überblick über die Förderlandschaft, kombiniert mit einem KI-Assistenten, der Ihnen beim Schreiben des Antrags zur Seite steht – Schritt für Schritt, in verständlicher Sprache.',
    points: [
      {
        label: 'Was uns antreibt',
        text: 'Wir finden: Bildung sollte nicht an Formularen scheitern. Gute Ideen verdienen eine faire Chance auf Förderung – egal, ob eine Schule eine eigene Verwaltungskraft hat oder ob abends eine Lehrerin den Antrag am Küchentisch schreibt.',
      },
      {
        label: 'Was Schulen & Vereine davon haben',
        text: 'Statt wochenlang Richtlinien zu wälzen, sehen Sie in Minuten, welche Programme zu Ihrem Vorhaben passen. Das bedeutet: mehr passende Anträge, weniger verpasste Fristen – und am Ende mehr Geld für das, was Ihren Kindern zugutekommt.',
      },
      {
        label: 'Was Antragstellende davon haben',
        text: 'Sie bekommen keinen leeren Formularsatz, sondern einen strukturierten Antragsentwurf an die Hand. Weniger Frust, weniger Bürokratie – und wieder mehr Zeit für das Wesentliche: den Unterricht und die Kinder.',
      },
    ],
  },

  programs: [
    {
      name: 'MINT-freundliche Schule 2025',
      funder: 'Initiative "MINT Zukunft schaffen!" (KMK & Wirtschaft)',
      deadline: '31. Mai 2025',
      targetGroup: 'Alle Schularten',
      amount: 'Auszeichnung',
      description: 'Die bundesweite Auszeichnung für Schulen mit besonderem Engagement in Mathematik, Informatik, Naturwissenschaften und Technik. Beworbene Schulen profitieren von höherer Sichtbarkeit, Vernetzung mit Unternehmen und Anerkennung durch die Kultusministerkonferenz. Über 3.000 Schulen tragen bereits das Signet.',
      url: 'https://mintzukunftschaffen.de/schulen/'
    },
    {
      name: 'Kultur macht stark – Bündnisse für Bildung',
      funder: 'Bundesministerium für Familie (BMFSFJ)',
      deadline: '28. Februar 2026',
      targetGroup: 'Schulen in Bündnissen mit Kultur/Sozialarbeit',
      amount: 'bis zu 50.000 €',
      description: 'Förderung außerschulischer kultureller Bildungsprojekte für Kinder und Jugendliche in Risikolagen. Jährlich bis zu 50 Mio. € verfügbar. Schulen können sich im Ganztagsbereich oder in ländlichen Regionen bewerben. Mindestens 3 Partner aus Kultur, Bildung und Sozialarbeit nötig.',
      url: 'https://www.buendnisse-fuer-bildung.de'
    },
    {
      name: 'Erasmus+ Schulbildung Akkreditierung 2026',
      funder: 'EU-Programm / Nationale Agentur',
      deadline: '19. Februar 2026',
      targetGroup: 'Alle Schularten (mit EU-Partner)',
      amount: 'bis zu 30.000 €',
      description: 'Langfristige Mobilität und Partnerschaften für Schulentwicklung. Die neue Akkreditierung ermöglicht strukturierte Auslandsaufenthalte für Lehrkräfte und Schüler. Förderzeitraum ab 1. Juni 2026. Besonderer Fokus auf Inklusion, Nachhaltigkeit und Digitalisierung.',
      url: 'https://erasmusplus.schule/foerderung/eine-akkreditierung-beantragen'
    }
  ],

  tipTitle: 'Die erste Zeile zählt: So starten Sie Ihren Antrag',
  tipContent: 'Fördergeber lesen oft nur die ersten zwei Sätze, bevor sie entscheiden, ob sie weiterlesen. Starten Sie deshalb nie mit allgemeinen Floskeln wie "Bildung ist wichtig". Stattdessen: Beschreiben Sie sofort das konkrete Problem, das Ihr Projekt löst. Beispiel: "An unserer Schule fehlen 40 % der Schüler jährlich mindestens 20 Tage – wir wollen mit innovativen Präventionsprogrammen gegen das absentismusbedingte Lerndefizit vorgehen." Konkret, messbar, relevant!',
  
  insightCategory: 'Hintergrund',
  insightReadTime: 3,
  insightTitle: 'DigitalPakt 2.0: Nach der Hardware kommt die Kompetenz',
  insightContent: 'Der erste DigitalPakt hat deutsche Schulen mit über 6,5 Milliarden Euro ausgestattet – doch die größte Herausforderung liegt noch vor uns: Wie nutzen wir die neue Technik pädagogisch sinnvoll?\n\nDie Antwort liegt in der Weiterbildung. Studien zeigen: Schulen, die mindestens 20 % ihrer Digitalisierungsmittel in Lehrerfortbildung investieren, erreichen doppelt so hohe Lernerfolge wie rein "ausgestattete" Schulen.\n\nDas BMBF reagiert mit dem Fokus auf "Digitalisierung und KI" in neuen Förderprogrammen. Besonders die bayerischen "Medien- und KI-Budgets" und das Programm "Digitale Schule der Zukunft" zeigen, dass reine Hardware-Förderung der Vergangenheit angehört.\n\nUnser Tipp: Planen Sie bei Ihrem nächsten Antrag explizit Budget für Fortbildungen ein – und begründen Sie, warum gerade Ihre Lehrkräfte diese Weiterbildung benötigen. Fördergeber honorieren pädagogische Konzepte höher als Gerätelisten.',
  insightCtaText: 'Digitale Förderprogramme entdecken',
  insightCtaUrl: 'https://edufunds.org/foerderprogramme',
  
  newsItems: [
    {
      text: 'Telekom Stiftung startet neues MINT-Berufsorientierungsprogramm mit bis zu 6.000 € Förderung pro Schule',
      url: 'https://www.telekom-stiftung.de/aktivitaeten/mint-berufsorientierung'
    },
    {
      text: 'Bayern: Medien- und KI-Budget 2025 – Antragsfrist bis 31. Oktober 2025 verlängert',
    },
    {
      text: 'Neue KMK-Richtlinie: Inklusive Bildung soll stärker in Lehrerausbildung verankert werden',
      url: 'https://www.kmk.org'
    },
    {
      text: 'Wissenschaftsjahr 2025: Förderung für Projekte zur Wissenschaftskommunikation in Schulen',
      url: 'https://www.buendnisse-fuer-bildung.de'
    }
  ],
  
  year: 2025
};

export default testNewsletterData;
