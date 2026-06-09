#!/usr/bin/env node
/**
 * Repariere defekte Links
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/foerderprogramme.json');
const programmes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Manuelle Link-Fixes
const linkFixes = {
  // Hohe Priorität
  'ferry-porsche-challenge': {
    infoLink: 'https://ferry-porsche-challenge.de'
  },
  'chemie-fonds': {
    infoLink: 'https://www.vci.de/foerderung/chemiefonds.html',
    bemerkung: 'Neue URL: VCI-Webseite (fondschemie.de existiert nicht mehr)'
  },
  
  // Mittlere Priorität
  'bmuv-klima': {
    infoLink: 'https://www.bmuv.de/themen/klimaschutz-klimawandel'
  },
  'hessen-mint-freundlich': {
    infoLink: 'https://kultus.hessen.de/schulen-und-bildung/schularten/grundschule'
  },
  'brandenburg-kulturelle-bildung': {
    infoLink: 'https://bildung.brandenburg.de/kulturelle_bildung/'
  },
  
  // Abgelaufene Programme
  'town-country-stiftungspreis': {
    status: 'abgelaufen',
    bemerkung: 'Programm abgelaufen - neue Runde prüfen'
  },
  'telekom-mint': {
    status: 'abgelaufen',
    bemerkung: 'Frist 31.10.2025 abgelaufen'
  }
};

let fixedCount = 0;

Object.entries(linkFixes).forEach(([id, fixes]) => {
  const p = programmes.find(prog => prog.id === id);
  if (p) {
    if (fixes.infoLink) {
      p.infoLink = fixes.infoLink;
      console.log(`✅ ${p.name}: URL aktualisiert`);
    }
    if (fixes.status) {
      p.status = fixes.status;
      console.log(`✅ ${p.name}: Status auf '${fixes.status}' gesetzt`);
    }
    if (fixes.bemerkung) {
      p.bemerkung = (p.bemerkung ? p.bemerkung + ' | ' : '') + fixes.bemerkung;
    }
    p.updatedAt = new Date().toISOString();
    fixedCount++;
  }
});

// Speichere
fs.writeFileSync(dataPath, JSON.stringify(programmes, null, 2));

console.log('\n═══════════════════════════════════════════════════');
console.log('LINK-REPARATUR ABGESCHLOSSEN');
console.log('═══════════════════════════════════════════════════');
console.log(`✅ ${fixedCount} Links repariert/aktualisiert`);
console.log('\n⚠️  Hinweis: Nicht alle 54 Links konnten automatisch repariert werden.');
console.log('   Einige erfordern manuelle Recherche (siehe DEFEKTE-LINKS-2026-02-13.json)');
console.log('═══════════════════════════════════════════════════');
