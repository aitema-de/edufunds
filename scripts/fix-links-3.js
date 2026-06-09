const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'foerderprogramme.json');
const programme = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Restliche Links
const linkKorrekturen = {
  "bmbf-sprache-und-integration": "https://www.bmbf.de/bmbf/de/bildung/sprachfoerderung.html",
  "bmbf-zukunftslabor": "https://www.bmbf.de/bmbf/de/bildung/zukunftslabore.html",
  "bmbf-ki-schule": "https://www.bmbf.de/bmbf/de/bildung/ki-in-der-schule.html",
  "bmbf-lesen-schreiben": "https://www.bmbf.de/bmbf/de/bildung/lesefoerderung.html",
  "bmbf-naturwissenschaftliche-grundbildung": "https://www.bmbf.de/bmbf/de/bildung/naturwissenschaften.html",
  "bmbf-digitalpakt-2": "https://www.digitalpaktschule.de/",
  "bmbf-inklusive-bildung": "https://www.bmbf.de/bmbf/de/bildung/inklusion.html",
  "volkswagen-mobilitaet": "https://www.volkswagenstiftung.de/foerderung/mobilitaet",
  "volkswagen-klima": "https://www.volkswagenstiftung.de/foerderung/klima",
  "zeiss-stiftung-mint": "https://www.carl-zeiss-stiftung.de/foerderung/mint",
  "zeiss-wissenschaft": "https://www.carl-zeiss-stiftung.de/foerderung/wissenschaft",
  "mercator-digitalisierung": "https://www.stiftung-mercator.de/foerderung/digitalisierung",
  "mercator-integration": "https://www.stiftung-mercator.de/foerderung/integration",
  "bmw-stiftung-demokratie": "https://www.bmw-stiftung.de/foerderung/demokratie",
  "bmw-nachhaltigkeit": "https://www.bmw-stiftung.de/foerderung/nachhaltigkeit",
  "heinrich-boell-bildung": "https://www.boell.de/foerderung/bildung",
  "stifterverband-bildung": "https://www.stifterverband.org/foerderung/bildung",
  "dkjs-sport": "https://www.dkjs.de/foerderung/sport"
};

let updated = 0;
programme.forEach(p => {
  if (linkKorrekturen[p.id]) {
    console.log(`✓ ${p.id}`);
    p.infoLink = linkKorrekturen[p.id];
    updated++;
  }
});

fs.writeFileSync(filePath, JSON.stringify(programme, null, 2));
console.log(`\n${updated} Links aktualisiert`);
