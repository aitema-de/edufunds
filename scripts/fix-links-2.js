const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'foerderprogramme.json');
const programme = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Weitere Links (Stiftungen und andere)
const linkKorrekturen = {
  "telekom-mint": "https://www.telekom-stiftung.de/bildung",
  "deutsche-bank-lesen": "https://www.deutsche-bank-stiftung.de/foerderung/lesen",
  "bertelsmann-bildung": "https://www.bertelsmann-stiftung.de/de/unsere-projekte/bildung",
  "bosch-umwelt": "https://www.bosch-stiftung.de/de/foerderung/themen/umwelt",
  "tschira-stiftung": "https://www.klaus-tschira-stiftung.de/foerderung",
  "postcode-lotterie": "https://www.postcode-lotterie.de/projekte/bildung",
  "aktion-mensch": "https://www.aktion-mensch.de/foerderung/inklusion-bildung",
  "eu-erasmus-schulen": "https://www.erasmus-plus.de/schulen",
  "eu-horizon": "https://research-and-innovation.ec.europa.eu/funding/funding-opportunities",
  "bayern-digital": "https://www.km.bayern.de/digitalpakt.html",
  "berlin-schulbau": "https://www.berlin.de/sen/bildung/investitionen/schulbau",
  "nrw-digital": "https://www.schulministerium.nrw.de/digitalisierung",
  "niedersachsen-sport": "https://www.mk.niedersachsen.de/bildung/schulsport",
  "siemens-energie": "https://www.siemens-stiftung.de/foerderung/energie",
  "sap-informatik": "https://www.sap-stiftung.de/foerderung/informatik"
};

let updated = 0;
programme.forEach(p => {
  if (linkKorrekturen[p.id]) {
    console.log(`✓ ${p.id}: ${linkKorrekturen[p.id]}`);
    p.infoLink = linkKorrekturen[p.id];
    updated++;
  }
});

fs.writeFileSync(filePath, JSON.stringify(programme, null, 2));
console.log(`\n${updated} Links aktualisiert`);
