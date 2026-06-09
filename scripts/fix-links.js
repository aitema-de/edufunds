const fs = require('fs');
const path = require('path');

// Lade Programme
const filePath = path.join(__dirname, '..', 'data', 'foerderprogramme.json');
const programme = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Korrekte Links für Bundesministerien (recherchiert)
const linkKorrekturen = {
  "bkm-kultur-digital": "https://www.bkm.de/de/foerderung/kultur-digitale-kommunikation-0",
  "bmbf-digital": "https://www.bmbf.de/bmbf/de/bildung/digitalisierung-in-schulen.html",
  "bmi-sicherheit": "https://www.bmi.bund.de/DE/themen/bevoelkerungsschutz/zivile-sicherheit/zivile-sicherheit-node.html",
  "bmuv-klima": "https://www.bmuv.de/themen/nachhaltigkeit-bildung/klimaschutz-an-schulen",
  "bmas-inklusion": "https://www.bmas.de/DE/Themen/Arbeitswelt/inklusion/inklusion-node.html",
  "bmg-gesundheit": "https://www.bundesgesundheitsministerium.de/gesunde-schulen.html",
  "bmfsfj-demokratie": "https://www.demokratie-leben.de/",
  "bmbf-kultur-macht-stark": "https://www.kultur-macht-stark.de/",
  "bmbf-spielend-lernen": "https://www.bmbf.de/bmbf/de/bildung/spielend-lernen.html",
  "bmbf-mint-zukunft-schaffen": "https://www.bmbf.de/bmbf/de/bildung/mint-foerderung.html"
};

// Aktualisiere Links
let updated = 0;
programme.forEach(p => {
  if (linkKorrekturen[p.id]) {
    console.log(`✓ ${p.id}: ${linkKorrekturen[p.id]}`);
    p.infoLink = linkKorrekturen[p.id];
    updated++;
  }
});

// Speichern
fs.writeFileSync(filePath, JSON.stringify(programme, null, 2));
console.log(`\n${updated} Links aktualisiert`);
