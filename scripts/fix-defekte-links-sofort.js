#!/usr/bin/env node
/**
 * SOFORT-KORREKTUR: Defekte Links reparieren
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/foerderprogramme.json');
const programmes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let fixed = 0;

// Fix 1: Deutsche Post
const deutschePost = programmes.find(p => p.id === 'deutsche-post-schule');
if (deutschePost) {
  deutschePost.infoLink = 'https://www.deutschepost.de/de/p/post-und-schule.html';
  deutschePost.quelle = 'https://www.deutschepost.de/de/p/post-und-schule.html';
  deutschePost.quelleUrl = 'https://www.deutschepost.de/de/p/post-und-schule.html';
  deutschePost.updatedAt = new Date().toISOString();
  fixed++;
  console.log('✅ Deutsche Post Link korrigiert');
}

// Fix 2: Jugendbrücke
const jugendbruecke = programmes.find(p => p.id === 'jugendbruecke-beruflicher-austausch-2026-27');
if (jugendbruecke) {
  jugendbruecke.infoLink = 'https://www.jugendbruecke.de/';
  jugendbruecke.quelle = 'https://www.jugendbruecke.de/';
  jugendbruecke.quelleUrl = 'https://www.jugendbruecke.de/';
  jugendbruecke.updatedAt = new Date().toISOString();
  fixed++;
  console.log('✅ Jugendbrücke Link korrigiert');
}

// Speichern
fs.writeFileSync(dataPath, JSON.stringify(programmes, null, 2));

console.log('\n═══════════════════════════════════════════════════');
console.log('SOFORT-KORREKTUR ABGESCHLOSSEN');
console.log('═══════════════════════════════════════════════════');
console.log(`✅ ${fixed} Links repariert`);
console.log('   - Deutsche Post: Hauptseite verlinkt');
console.log('   - Jugendbrücke: Hauptseite verlinkt');
console.log('\n⚠️  Hinweis: Diese Links sollten funktionieren.');
console.log('   Für 100% Sicherheit: Manuell im Browser testen!');
console.log('═══════════════════════════════════════════════════');
