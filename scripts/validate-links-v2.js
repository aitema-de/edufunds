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
      method: 'GET',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    };

    const startTime = Date.now();
    const req = client.request(url, options, (res) => {
      const statusCode = res.statusCode;
      const responseTime = Date.now() - startTime;
      
      // Daten konsumieren, aber nicht speichern
      res.on('data', () => {});
      res.on('end', () => {
        if (statusCode >= 200 && statusCode < 400) {
          results.working.push({ 
            id: program.id, 
            name: program.name, 
            url: url, 
            status: statusCode,
            responseTime: responseTime
          });
        } else if (statusCode === 404 || statusCode === 410) {
          results.broken.push({ 
            id: program.id, 
            name: program.name, 
            url: url, 
            status: statusCode 
          });
        } else if (statusCode >= 500) {
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
    });

    req.on('error', (error) => {
      results.broken.push({ 
        id: program.id, 
        name: program.name, 
        url: url, 
        error: error.message,
        errorCode: error.code
      });
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      results.broken.push({ 
        id: program.id, 
        name: program.name, 
        url: url, 
        error: 'Timeout (>15s)' 
      });
      resolve();
    });

    req.end();
  });
}

async function validateLinks() {
  console.log(`Prüfe ${data.length} Links...\n`);
  
  // Prüfe Links sequentiell mit Verzögerung
  for (let i = 0; i < data.length; i++) {
    const program = data[i];
    process.stdout.write(`[${String(i + 1).padStart(3)}/${data.length}] ${program.name.substring(0, 50).padEnd(52)}`);
    
    await checkLink(program);
    
    const lastResult = results.working[results.working.length - 1] || results.broken[results.broken.length - 1];
    if (lastResult) {
      if (lastResult.status) {
        process.stdout.write(` → ${lastResult.status} OK\n`);
      } else {
        process.stdout.write(` → FEHLER: ${lastResult.error?.substring(0, 30)}\n`);
      }
    }
    
    // 300ms Verzögerung zwischen Requests
    if (i < data.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log('\n\n=== ERGEBNIS ===');
  console.log(`✓ Funktionierende Links: ${results.working.length}`);
  console.log(`✗ Defekte Links: ${results.broken.length}`);
  console.log(`⚠ Fehler: ${results.errors.length}`);

  if (results.broken.length > 0) {
    console.log('\n=== DEFEKTE LINKS ===');
    results.broken.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.name} (${item.id})`);
      console.log(`   URL: ${item.url}`);
      if (item.status) console.log(`   Status: HTTP ${item.status}`);
      if (item.error) console.log(`   Fehler: ${item.error}`);
    });
  }

  // Speichere Ergebnisse
  fs.writeFileSync('/home/edufunds/edufunds-app/data/link-check-results.json', JSON.stringify(results, null, 2));
  console.log('\n\n✓ Ergebnisse gespeichert in: link-check-results.json');
  
  // Speichere defekte Links separat für einfachere Bearbeitung
  if (results.broken.length > 0) {
    fs.writeFileSync('/home/edufunds/edufunds-app/data/broken-links.json', JSON.stringify(results.broken, null, 2));
    console.log('✓ Defekte Links gespeichert in: broken-links.json');
  }
}

validateLinks().catch(console.error);
