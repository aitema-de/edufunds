#!/usr/bin/env node
/**
 * Fristen-Prüfung und Datenbank-Bereinigung
 * Heute: 13.02.2026
 */

const fs = require('fs');
const path = require('path');

const HEUTE = new Date('2026-02-13');
const IN_60_TAGE = new Date('2026-04-14'); // Nahende Fristen

const dataPath = path.join(__dirname, '../data/foerderprogramme.json');
const programmes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const abgelaufen = [];
const nahend = []; // In den nächsten 60 Tagen
const aktiv = [];
const unklar = [];

programmes.forEach(p => {
  const fristEnde = p.bewerbungsfristEnde;
  const fristText = p.bewerbungsfristText || '';
  
  // Prüfe auf abgelaufene feste Fristen
  if (fristEnde) {
    const endeDatum = new Date(fristEnde);
    if (endeDatum < HEUTE) {
      abgelaufen.push({
        id: p.id,
        name: p.name,
        fristEnde: fristEnde,
        status: 'ABGELAUFEN'
      });
      return;
    }
    
    // Prüfe auf nahende Fristen (in den nächsten 60 Tagen)
    if (endeDatum <= IN_60_TAGE) {
      nahend.push({
        id: p.id,
        name: p.name,
        fristEnde: fristEnde,
        tageBisFrist: Math.ceil((endeDatum - HEUTE) / (1000 * 60 * 60 * 24)),
        status: 'NAHEND'
      });
      return;
    }
  }
  
  // Prüfe auf "laufend" oder flexible Fristen
  if (fristText.toLowerCase().includes('laufend') || 
      fristText.toLowerCase().includes('keine frist') ||
      fristText.toLowerCase().includes('jederzeit') ||
      !fristEnde) {
    aktiv.push({
      id: p.id,
      name: p.name,
      fristText: fristText,
      status: 'LAUFEND/FLEXIBEL'
    });
    return;
  }
  
  // Unklare Fristen
  unklar.push({
    id: p.id,
    name: p.name,
    fristText: fristText,
    fristEnde: fristEnde,
    status: 'PRÜFEN'
  });
});

console.log('═══════════════════════════════════════════════════');
console.log('FRISTEN-ANALYSE - 13. Februar 2026');
console.log('═══════════════════════════════════════════════════\n');

console.log(`📊 GESAMT: ${programmes.length} Programme\n`);

console.log(`🔴 ABGELAUFEN: ${abgelaufen.length} Programme`);
if (abgelaufen.length > 0) {
  abgelaufen.forEach(p => {
    console.log(`   ❌ ${p.name} (Frist: ${p.fristEnde})`);
  });
}

console.log(`\n🟡 NAHEND (≤60 Tage): ${nahend.length} Programme`);
if (nahend.length > 0) {
  nahend.sort((a, b) => a.tageBisFrist - b.tageBisFrist);
  nahend.forEach(p => {
    console.log(`   ⚠️  ${p.name} (noch ${p.tageBisFrist} Tage, bis ${p.fristEnde})`);
  });
}

console.log(`\n🟢 AKTIV/LAUFEND: ${aktiv.length} Programme`);

console.log(`\n⚪ UNKLAR/PRÜFEN: ${unklar.length} Programme`);
if (unklar.length > 0) {
  unklar.slice(0, 5).forEach(p => {
    console.log(`   ❓ ${p.name} („${p.fristText}" )`);
  });
  if (unklar.length > 5) {
    console.log(`   ... und ${unklar.length - 5} weitere`);
  }
}

// Speichere Ergebnisse
const report = {
  datum: '2026-02-13',
  programmeGesamt: programmes.length,
  abgelaufen: abgelaufen,
  nahend: nahend,
  aktiv: aktiv.length,
  unklar: unklar.length
};

fs.writeFileSync(
  path.join(__dirname, '../docs/FRISTEN-ANALYSE-2026-02-13.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n═══════════════════════════════════════════════════');
console.log('✅ Analyse gespeichert in:');
console.log('   docs/FRISTEN-ANALYSE-2026-02-13.json');
console.log('═══════════════════════════════════════════════════');
