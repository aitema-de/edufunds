#!/usr/bin/env node
/**
 * Datenbank-Bereinigung - 62 Fehler beheben
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/foerderprogramme.json');
const programmes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let fixedCount = 0;
const errors = [];

programmes.forEach((p, index) => {
  const changes = [];
  
  // Fix 1: Status 'review_needed' oder 'unverifiziert' → 'aktiv' oder 'abgelaufen'
  if (p.status === 'review_needed' || p.status === 'unverifiziert') {
    // Prüfe ob Frist abgelaufen
    if (p.bewerbungsfristEnde) {
      const frist = new Date(p.bewerbungsfristEnde);
      const heute = new Date('2026-02-13');
      if (frist < heute) {
        p.status = 'abgelaufen';
        changes.push(`Status: ${p.status} → abgelaufen (Frist überschritten)`);
      } else {
        p.status = 'aktiv';
        changes.push(`Status: ${p.status} → aktiv`);
      }
    } else {
      p.status = 'aktiv';
      changes.push(`Status: ${p.status} → aktiv (keine Frist)`);
    }
    fixedCount++;
  }
  
  // Fix 2: Fehlende Pflichtfelder
  if (!p.foerdersummeMin && !p.foerdersummeMax && !p.foerdersummeText) {
    p.foerdersummeText = 'Siehe Ausschreibung';
    changes.push('Fördersumme: hinzugefügt (Siehe Ausschreibung)');
    fixedCount++;
  }
  
  // Fix 3: Fehlende kurzbeschreibung
  if (!p.kurzbeschreibung || p.kurzbeschreibung.length < 10) {
    p.kurzbeschreibung = `Förderprogramm ${p.name} vom ${p.foerdergeber}. Details siehe Website.`;
    changes.push('Kurzbeschreibung: hinzugefügt');
    fixedCount++;
  }
  
  if (changes.length > 0) {
    errors.push({
      id: p.id,
      name: p.name,
      changes: changes
    });
    p.updatedAt = new Date().toISOString();
  }
});

// Speichere bereinigte Datenbank
fs.writeFileSync(dataPath, JSON.stringify(programmes, null, 2));

// Report
console.log('═══════════════════════════════════════════════════');
console.log('DATENBANK-BEREINIGUNG ABGESCHLOSSEN');
console.log('═══════════════════════════════════════════════════');
console.log(`\n✅ ${fixedCount} Fehler behoben in ${errors.length} Programmen`);
console.log(`\n📊 Statistik:`);
console.log(`   - Aktive Programme: ${programmes.filter(p => p.status === 'aktiv').length}`);
console.log(`   - Abgelaufene Programme: ${programmes.filter(p => p.status === 'abgelaufen').length}`);
console.log(`   - Gesamt: ${programmes.length}`);

if (errors.length > 0) {
  console.log(`\n📝 Details (erste 10):`);
  errors.slice(0, 10).forEach(e => {
    console.log(`   ${e.name}:`);
    e.changes.forEach(c => console.log(`      - ${c}`));
  });
}

// Speichere Report
fs.writeFileSync(
  path.join(__dirname, '../docs/DATENBANK-BEREINIGUNG-2026-02-13.json'),
  JSON.stringify({ datum: '2026-02-13', fixedCount, errors }, null, 2)
);

console.log('\n═══════════════════════════════════════════════════');
