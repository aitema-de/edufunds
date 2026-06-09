#!/usr/bin/env node
/**
 * Datenbank-Bereinigung: Abgelaufene Programme markieren
 */

const fs = require('fs');
const path = require('path');

const HEUTE = '2026-02-13';
const dataPath = path.join(__dirname, '../data/foerderprogramme.json');
const programmes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// IDs der abgelaufenen Programme
const abgelaufenIds = [
  'telekom-mint', // 31.10.2025
  'eu-erasmus-schulen', // 15.03.2025
  'deutscher-schulpreis', // 31.01.2026
  'town-country-stiftungspreis', // 31.10.2025
  'schulische-auslandsstipendien', // 31.01.2026
  'projektfonds-kultur-schule-hamburg' // 31.03.2025
];

// Nahende Fristen für Newsletter
const nahendeFristen = [
  { id: 'playmobil-hobpreis', name: 'Hob-Preis für kreative Schulen', frist: '2026-02-15', tage: 2 },
  { id: 'klimalab-2026', name: 'KlimaLab - Klimaschutz-Engagement', frist: '2026-02-27', tage: 14 },
  { id: 'lesen-macht-stark', name: 'Lesen macht stark', frist: '2026-02-28', tage: 15 },
  { id: 'bw-sommerschulen-2026', name: 'Sommerschulen Baden-Württemberg 2026', frist: '2026-03-28', tage: 43 },
  { id: 'sachsen-klimaschulen-2026', name: 'Klimaschulen Sachsen - Netzwerk', frist: '2026-03-31', tage: 46 }
];

let geaendert = 0;

// Markiere abgelaufene Programme
programmes.forEach(p => {
  if (abgelaufenIds.includes(p.id)) {
    p.status = 'abgelaufen';
    p.bemerkung = (p.bemerkung ? p.bemerkung + ' | ' : '') + 
                  `Frist abgelaufen am ${p.bewerbungsfristEnde}. Nächste Ausschreibung prüfen.`;
    p.updatedAt = new Date().toISOString();
    geaendert++;
    console.log(`🔴 Markiert als ABGELAUFEN: ${p.name}`);
  }
});

// Speichere nahende Fristen für Newsletter
const newsletterFristen = {
  datum: HEUTE,
  rubrik: '⚡ Schnell-Handlungsbedarf',
  programme: nahendeFristen
};

fs.writeFileSync(
  path.join(__dirname, '../docs/NEWSLETTER-NAHENDE-FRISTEN.json'),
  JSON.stringify(newsletterFristen, null, 2)
);

// Speichere bereinigte Datenbank
fs.writeFileSync(dataPath, JSON.stringify(programmes, null, 2));

console.log('\n═══════════════════════════════════════════════════');
console.log('✅ DATENBANK BEREINIGT');
console.log('═══════════════════════════════════════════════════');
console.log(`\n🔴 ${geaendert} Programme als "abgelaufen" markiert`);
console.log(`🟡 ${nahendeFristen.length} nahende Fristen für Newsletter gespeichert`);
console.log(`\n💾 Aktive Programme: ${programmes.filter(p => p.status !== 'abgelaufen').length}`);
console.log(`   Abgelaufene Programme: ${programmes.filter(p => p.status === 'abgelaufen').length}`);
console.log('\n📁 Gespeichert:');
console.log('   • data/foerderprogramme.json (bereinigt)');
console.log('   • docs/NEWSLETTER-NAHENDE-FRISTEN.json');
console.log('═══════════════════════════════════════════════════');
