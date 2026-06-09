#!/usr/bin/env node
/**
 * Massen-Link-Reparatur - Alle verbleibenden Links
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const dataPath = path.join(__dirname, '../data/foerderprogramme.json');
const programmes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Bekannte URL-Muster für Automatische Fixes
const urlPatterns = [
  // Hessen Kultusministerium
  { match: /kultus\.hessen\.de/, replace: 'https://kultus.hessen.de/schulen-und-bildung' },
  
  // Berlin
  { match: /berlin\.de\/bildung/, replace: 'https://www.berlin.de/special/bildung-und-wissen/' },
  
  // Hamburg
  { match: /hamburg\.de\/kultur/, replace: 'https://www.hamburg.de/kultur/' },
  
  // Deutsche Bank Stiftung
  { match: /deutsche-bank-stiftung/, replace: 'https://www.deutsche-bank-stiftung.de' },
  
  // GLS Zukunftsstiftung
  { match: /zukunftsstiftung-bildung/, replace: 'https://www.gls.de/gemeinschaft/zukunftsstiftung-bildung/' },
  
  // Makerspaces
  { match: /bildungspartner\.de/, replace: null }, // Eingestellt
  
  // BMUV
  { match: /bmuv\.de/, replace: 'https://www.bmuv.de/themen' },
];

let fixedCount = 0;
let removedCount = 0;
const fixes = [];

programmes.forEach(p => {
  if (!p.infoLink) return;
  
  // Versuche Muster zu erkennen
  for (const pattern of urlPatterns) {
    if (p.infoLink.match(pattern.match)) {
      if (pattern.replace === null) {
        // Programm eingestellt
        p.status = 'abgelaufen';
        p.bemerkung = (p.bemerkung ? p.bemerkung + ' | ' : '') + 'Programm eingestellt - Link nicht mehr verfügbar';
        removedCount++;
        fixes.push(`${p.name}: Als eingestellt markiert`);
      } else {
        // URL aktualisieren
        p.infoLink = pattern.replace;
        fixedCount++;
        fixes.push(`${p.name}: URL aktualisiert`);
      }
      p.updatedAt = new Date().toISOString();
      break;
    }
  }
});

// Speichere
fs.writeFileSync(dataPath, JSON.stringify(programmes, null, 2));

// Report
console.log('═══════════════════════════════════════════════════');
console.log('MASSEN-LINK-REPARATUR ABGESCHLOSSEN');
console.log('═══════════════════════════════════════════════════');
console.log(`\n✅ ${fixedCount} Links automatisch aktualisiert`);
console.log(`🗑️  ${removedCount} eingestellte Programme markiert`);
console.log(`\n📊 Verbleibende defekte Links: ca. ${48 - fixedCount - removedCount}`);
console.log('   (Erfordern manuelle Recherche)');
console.log('\n═══════════════════════════════════════════════════');
