import { Foerderprogramm, PROGRAMM_STATUS } from '../lib/foerderSchema';
import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/foerderprogramme.json'), 'utf-8'));

const validFoerdergeberTyp = ['bund', 'land', 'eu', 'stiftung', 'sonstige'];
const validSchulformen = ['grundschule', 'hauptschule', 'realschule', 'gymnasium', 'gesamtschule', 'foerderschule', 'berufsschule'];
const validBewerbungsart = ['online', 'schriftlich', 'beides'];
// Aus dem Schema abgeleitet statt hier dupliziert: Diese Liste stand bis
// 17.07.2026 auf ['aktiv','auslaufend','pausiert','beendet'] und haette damit
// 32 gueltige Programme (status="archiviert") als ungueltig gemeldet — waere sie
// je gelaufen. Sie steht in keinem npm-Script und in keiner CI.
const validStatus: readonly string[] = PROGRAMM_STATUS;

const issues: { index: number; id: string; problems: string[] }[] = [];

data.forEach((item: any, index: number) => {
  const problems: string[] = [];

  // Pflichtfelder prüfen
  if (!item.id) problems.push('Fehlend: id');
  if (!item.name) problems.push('Fehlend: name');
  if (!item.foerdergeber) problems.push('Fehlend: foerdergeber');
  if (!item.foerdergeberTyp || !validFoerdergeberTyp.includes(item.foerdergeberTyp)) {
    problems.push(`Ungültig: foerdergeberTyp = "${item.foerdergeberTyp}"`);
  }
  if (!Array.isArray(item.schulformen) || item.schulformen.length === 0) {
    problems.push('Fehlend/leer: schulformen');
  } else {
    const invalidSchulformen = item.schulformen.filter((s: string) => !validSchulformen.includes(s));
    if (invalidSchulformen.length > 0) {
      problems.push(`Ungültige schulformen: ${invalidSchulformen.join(', ')}`);
    }
  }
  if (!Array.isArray(item.bundeslaender) || item.bundeslaender.length === 0) {
    problems.push('Fehlend/leer: bundeslaender');
  }
  if (!Array.isArray(item.kategorien) || item.kategorien.length === 0) {
    problems.push('Fehlend/leer: kategorien');
  }
  if (!item.bewerbungsart || !validBewerbungsart.includes(item.bewerbungsart)) {
    problems.push(`Ungültig: bewerbungsart = "${item.bewerbungsart}"`);
  }
  if (!item.infoLink) problems.push('Fehlend: infoLink');
  if (!item.kurzbeschreibung) problems.push('Fehlend: kurzbeschreibung');
  if (!item.status || !validStatus.includes(item.status)) {
    problems.push(`Ungültig: status = "${item.status}"`);
  }
  if (!item.createdAt) problems.push('Fehlend: createdAt');
  if (!item.updatedAt) problems.push('Fehlend: updatedAt');
  if (!item.quelle) problems.push('Fehlend: quelle');
  if (typeof item.kiAntragGeeignet !== 'boolean') {
    problems.push(`Ungültig: kiAntragGeeignet = "${item.kiAntragGeeignet}"`);
  }

  // bundeslaender auf ISO-Codes prüfen
  if (Array.isArray(item.bundeslaender)) {
    const nonIsoBundeslaender = item.bundeslaender.filter((b: string) => {
      if (b === 'alle') return false;
      // ISO 3166-2:DE Codes prüfen
      return !/^DE-[A-Z]{2}$/.test(b);
    });
    if (nonIsoBundeslaender.length > 0) {
      problems.push(`Nicht-ISO bundeslaender: ${nonIsoBundeslaender.join(', ')}`);
    }
  }

  if (problems.length > 0) {
    issues.push({ index, id: item.id || `entry-${index}`, problems });
  }
});

console.log(`\n=== VALIDIERUNG ERGEBNIS ===`);
console.log(`Geprüfte Programme: ${data.length}`);
console.log(`Fehlerhafte Programme: ${issues.length}`);

if (issues.length > 0) {
  console.log('\n=== DETAILLIERTE FEHLER ===');
  issues.forEach(({ index, id, problems }) => {
    console.log(`\n[${index}] ${id}:`);
    problems.forEach(p => console.log(`  - ${p}`));
  });
  process.exit(1);
} else {
  console.log('\n✅ Alle Programme sind valide!');
  process.exit(0);
}
