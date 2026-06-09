#!/usr/bin/env node
/**
 * SOFORTKORREKTUR: Defekte Links reparieren (Batch 1-3)
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/foerderprogramme.json');
const programmes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let fixed = 0;
let archived = 0;

console.log('═══════════════════════════════════════════════════');
console.log('SOFORTKORREKTUR: Links & Abgelaufene Programme');
console.log('═══════════════════════════════════════════════════\n');

// 1. DEFEKTE LINKS KORRIGIEREN
const linkCorrections = {
  'chemie-fonds': {
    old: 'https://www.vci.de/fonds-der-chemischen-industrie.html',
    new: 'https://www.vci.de/bildung/fonds-der-chemischen-industrie.html',
    note: 'Neue URL: /bildung/ Pfad hinzugefügt'
  },
  'ensam-bmz': {
    old: 'https://www.ensa.de',
    new: 'https://ensa.engagement-global.de',
    note: 'Korrekte ENSA URL für Schulpartnerschaften'
  },
  'sachsen-anhalt-digital': {
    old: 'https://km.bildung-lsa.de/',
    new: 'https://km.bildung-lsa.de',
    note: 'Trailing slash entfernt'
  },
  'th-mint-digital': {
    old: 'https://www.thueringen.de/mint',
    new: 'https://mikro-makro-mint.de/',
    note: 'Alternative MINT-Ressource'
  },
  'tag-der-mathematik': {
    old: 'https://www.uni-saarland.de',
    new: 'https://www.mathematik-olympiaden.de/',
    note: 'Alternative: Mathematik-Olympiaden'
  },
  'sprache-macht-stark': {
    old: 'https://www.biss-sprachbildung.de',
    new: 'https://www.sprache-macht-stark.de',
    note: 'Korrekte Domain'
  }
};

// Links korrigieren
Object.entries(linkCorrections).forEach(([id, correction]) => {
  const p = programmes.find(prog => prog.id === id);
  if (p) {
    console.log(`🔧 KORRIGIERT: ${id}`);
    console.log(`   Alt: ${p.infoLink}`);
    p.infoLink = correction.new;
    p.quelle = correction.new;
    p.quelleUrl = correction.new;
    p.updatedAt = new Date().toISOString();
    p.bemerkung = (p.bemerkung || '') + ` | ${correction.note}`;
    console.log(`   Neu: ${p.infoLink}`);
    fixed++;
  }
});

// 2. ABGELAUFENE PROGRAMME ARCHIVIEREN
const expiredPrograms = [
  { id: 'playmobil-hobpreis', reason: 'Frist abgelaufen (15.02.2026)' },
  { id: 'bosch-schulpreis', reason: 'Frist abgelaufen (31.01.2026)' },
  { id: 'sparkasse-elbe-elster-ausland', reason: 'Frist abgelaufen (31.01.2026)' },
  { id: 'telekom-stiftung-jia', reason: 'Frist abgelaufen (16.01.2026)' },
  { id: 'bw-denkmal-aktiv-2026', reason: 'Frist abgelaufen (05.05.2025)' }
];

expiredPrograms.forEach(({ id, reason }) => {
  const p = programmes.find(prog => prog.id === id);
  if (p && p.status === 'aktiv') {
    console.log(`📦 ARCHIVIERT: ${id}`);
    console.log(`   Grund: ${reason}`);
    p.status = 'archiviert';
    p.updatedAt = new Date().toISOString();
    p.bemerkung = (p.bemerkung || '') + ` | ARCHIVIERT: ${reason}`;
    archived++;
  }
});

// Speichern
fs.writeFileSync(dataPath, JSON.stringify(programmes, null, 2));

console.log('\n═══════════════════════════════════════════════════');
console.log('ERGEBNIS');
console.log('═══════════════════════════════════════════════════');
console.log(`✅ ${fixed} Links korrigiert`);
console.log(`📦 ${archived} Programme archiviert`);
console.log(`📊 Aktive Programme: ${programmes.filter(p => p.status === 'aktiv').length}`);
console.log('═══════════════════════════════════════════════════');
