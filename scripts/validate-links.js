const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Lade die JSON-Datei
const data = JSON.parse(fs.readFileSync('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'utf8'));

const results = {
  working: [],
  broken: [],
  errors: []
};

function checkLink(program) {
  return new Promise((resolve) => {
    const url = program.infoLink;
    if (!url) {
      results.errors.push({ id: program.id, name: program.name, error: 'Kein Link vorhanden' });
      resolve();
      return;
    }

    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      method: 'HEAD',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = client.request(url, options, (res) => {
      const statusCode = res.statusCode;
      
      if (statusCode >= 200 && statusCode < 400) {
        results.working.push({ 
          id: program.id, 
          name: program.name, 
          url: url, 
          status: statusCode 
        });
      } else if (statusCode === 404 || statusCode >= 500) {
        results.broken.push({ 
          id: program.id, 
          name: program.name, 
          url: url, 
          status: statusCode 
        });
      } else {
        results.working.push({ 
          id: program.id, 
          name: program.name, 
          url: url, 
          status: statusCode 
        });
      }
      resolve();
    });

    req.on('error', (error) => {
      results.broken.push({ 
        id: program.id, 
        name: program.name, 
        url: url, 
        error: error.message 
      });
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      results.broken.push({ 
        id: program.id, 
        name: program.name, 
        url: url, 
        error: 'Timeout' 
      });
      resolve();
    });

    req.end();
  });
}

async function validateLinks() {
  console.log(`Prüfe ${data.length} Links...`);
  
  // Prüfe Links sequentiell mit Verzögerung
  for (let i = 0; i < data.length; i++) {
    const program = data[i];
    console.log(`[${i + 1}/${data.length}] Prüfe: ${program.name}`);
    await checkLink(program);
    
    // 500ms Verzögerung zwischen Requests
    if (i < data.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n=== ERGEBNIS ===');
  console.log(`Funktionierende Links: ${results.working.length}`);
  console.log(`Defekte Links: ${results.broken.length}`);
  console.log(`Fehler: ${results.errors.length}`);

  if (results.broken.length > 0) {
    console.log('\n=== DEFEKTE LINKS ===');
    results.broken.forEach(item => {
      console.log(`- ${item.name} (${item.id}): ${item.url}`);
      if (item.status) console.log(`  Status: ${item.status}`);
      if (item.error) console.log(`  Fehler: ${item.error}`);
    });
  }

  // Speichere Ergebnisse
  fs.writeFileSync('/home/edufunds/edufunds-app/data/link-check-results.json', JSON.stringify(results, null, 2));
  console.log('\nErgebnisse gespeichert in: link-check-results.json');
}

validateLinks();
