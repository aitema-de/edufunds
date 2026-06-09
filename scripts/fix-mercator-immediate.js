#!/usr/bin/env node
/**
 * SOFORT-MASSNAHME: Mercator-Programme korrigieren
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/foerderprogramme.json');
const programmes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Mercator-Programme korrigieren
const mercatorFixes = {
  'mercator-digitalisierung': {
    name: 'Digitale Bildung (Mercator Stiftung) - Strategische Partnerschaften',
    infoLink: 'https://www.stiftung-mercator.de/de/wie-wir-foerdern/',
    bemerkung: 'WICHTIG: Keine Einzelanträge möglich. Nur strategische Partnerschaften mit Multiplikatoren. Alternativen: DigitalPakt, Telekom Stiftung MINT.',
    status: 'review_needed',
    kiAntragGeeignet: false
  },
  'mercator-integration': {
    name: 'Integration durch Bildung (Mercator Stiftung) - Strategische Partnerschaften',
    infoLink: 'https://www.stiftung-mercator.de/de/wie-wir-foerdern/',
    bemerkung: 'WICHTIG: Keine Einzelanträge möglich. Nur strategische Partnerschaften. Alternativen: Kultur macht stark, START-Stiftung.',
    status: 'review_needed',
    kiAntragGeeignet: false
  }
};

let fixed = 0;

Object.entries(mercatorFixes).forEach(([id, updates]) => {
  const p = programmes.find(prog => prog.id === id);
  if (p) {
    Object.assign(p, updates);
    p.updatedAt = new Date().toISOString();
    fixed++;
    console.log(`✅ ${p.name}:`);
    console.log(`   - Status: ${updates.status}`);
    console.log(`   - kiAntragGeeignet: ${updates.kiAntragGeeignet}`);
    console.log(`   - Hinweis: Keine Einzelanträge möglich`);
  }
});

fs.writeFileSync(dataPath, JSON.stringify(programmes, null, 2));

console.log('\n═══════════════════════════════════════════════════');
console.log('SOFORT-MASSNAHME ABGESCHLOSSEN');
console.log('═══════════════════════════════════════════════════');
console.log(`\n✅ ${fixed} Mercator-Programme korrigiert`);
console.log('\n📝 Änderungen:');
console.log('   - Status auf "review_needed" gesetzt');
console.log('   - kiAntragGeeignet auf FALSE gesetzt');
console.log('   - Klare Hinweise: Keine Einzelanträge möglich');
console.log('   - Alternativen genannt');
console.log('\n⚠️  Diese Programme werden jetzt nicht mehr als reguläre');
console.log('   Förderprogramme angezeigt, sondern als Referenz für');
console.log('   strategische Partnerschaften.');
console.log('═══════════════════════════════════════════════════');
