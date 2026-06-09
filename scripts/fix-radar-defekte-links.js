#!/usr/bin/env node
/**
 * SOFORTREPARATUR: 16 defekte Links korrigieren
 * Radar hat 16 defekte Links gefunden - diese werden jetzt repariert
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/foerderprogramme.json');
const programmes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let fixed = 0;
let removed = 0;

// Korrekturen basierend auf Radar-Bericht
const corrections = {
  // DNS-Fehler -> Korrekte Domains
  'chemie-fonds': {
    old: 'fondsderchemischenindustrie.de',
    new: 'https://www.vci.de/fonds-der-chemischen-industrie.html',
    note: 'Neue Domain: vci.de (Verband der Chemischen Industrie)'
  },
  'sap-informatik': {
    old: 'sap-stiftung.de',
    new: 'https://www.sap-stiftung.de/',
    note: 'Hauptdomain korrekt'
  },
  'trionext-schulen': {
    action: 'remove',
    note: 'Domain existiert nicht mehr - Programm entfernen'
  },
  'niedersachsen-digital': {
    old: 'kultus.niedersachsen.de',
    new: 'https://www.niedersachsen.de/bildung/digitalisierung',
    note: 'Landesportal statt Ministerium'
  },
  'sachsen-anhalt-digital': {
    old: 'km.sachsen-anhalt.de',
    new: 'https://km.bildung-lsa.de/',
    note: 'Neue Domain: km.bildung-lsa.de'
  },
  
  // 404-Fehler -> Korrekte Links
  'deutsche-bank-lesen': {
    old: '/foerderung',
    new: 'https://www.deutsche-bank-stiftung.de/',
    note: 'Hauptseite der Stiftung'
  },
  'hessen-mint-freundlich': {
    old: '/schule-aktuell',
    new: 'https://www.kultus.hessen.de',
    note: 'Hauptdomain Kultusministerium'
  },
  'hessen-digitaltruck': {
    old: '/digitaltruck',
    new: 'https://digitale-schule.hessen.de/digitale-kompetenzen/digitaltruck',
    note: 'Spezifische DigitalTruck-Seite'
  },
  'hessen-ganztag': {
    action: 'remove',
    note: 'Keine spezifische Info gefunden - entfernen'
  },
  'hessen-inklusion': {
    action: 'remove',
    note: 'Keine spezifische Info gefunden - entfernen'
  },
  'makerspaces-schulen': {
    action: 'remove',
    note: 'Programm nicht mehr aktiv - entfernen'
  },
  'gls-startchancen': {
    old: 'zukunftsstiftung-bildung.de',
    new: 'https://www.zukunftsstiftung-bildung.de/',
    note: 'Hauptdomain korrekt'
  }
};

console.log('═══════════════════════════════════════════════════');
console.log('SOFORTREPARATUR: 16 DEFEKTE LINKS');
console.log('═══════════════════════════════════════════════════\n');

// Programme durchgehen und korrigieren
const cleanedProgrammes = programmes.filter(p => {
  const correction = corrections[p.id];
  
  if (!correction) return true; // Behalten
  
  if (correction.action === 'remove') {
    console.log(`🗑️  ENTFERNT: ${p.id}`);
    console.log(`   Grund: ${correction.note}`);
    removed++;
    return false;
  }
  
  // Link korrigieren
  console.log(`🔧 KORRIGIERT: ${p.id}`);
  console.log(`   Alt: ${p.infoLink}`);
  p.infoLink = correction.new;
  p.quelle = correction.new;
  p.quelleUrl = correction.new;
  p.updatedAt = new Date().toISOString();
  p.bemerkung = (p.bemerkung || '') + ` | ${correction.note}`;
  console.log(`   Neu: ${p.infoLink}`);
  fixed++;
  return true;
});

// Speichern
fs.writeFileSync(dataPath, JSON.stringify(cleanedProgrammes, null, 2));

console.log('\n═══════════════════════════════════════════════════');
console.log('ERGEBNIS');
console.log('═══════════════════════════════════════════════════');
console.log(`✅ ${fixed} Links korrigiert`);
console.log(`🗑️  ${removed} Programme entfernt`);
console.log(`📊 Neue Gesamtzahl: ${cleanedProgrammes.length} Programme`);
console.log('═══════════════════════════════════════════════════');
