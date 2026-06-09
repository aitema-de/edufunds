#!/usr/bin/env node

/**
 * EduFunds Smoke Test
 * 
 * Prüft 5 kritische URLs auf Verfügbarkeit:
 * - HTTP Status 200
 * - Antwortzeit <3s
 * - Kein "404" im Body
 * 
 * Usage:
 *   node scripts/smoke-test.js          # Testet Produktions-URLs
 *   node scripts/smoke-test.js local    # Testet localhost:3101
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const isLocal = process.argv.includes('local') || process.argv.includes('--local');
const BASE_URL = isLocal ? 'http://localhost:3101' : 'https://edufunds.org';

// URLs zu testen
const URLS = [
  `${BASE_URL}/`,
  `${BASE_URL}/foerderprogramme`,
  `${BASE_URL}/foerderprogramme/bmbf-digitalpakt-2`,
  `${BASE_URL}/preise`,
  `${BASE_URL}/api/health`
];

const TIMEOUT_MS = 3000; // 3 Sekunden Timeout

console.log(`🧪 EduFunds Smoke Test (${isLocal ? 'LOCAL' : 'PRODUCTION'})\n`);

/**
 * Führt einen HTTP-Request durch
 */
function checkUrl(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'EduFunds-SmokeTest/1.0',
        'Accept': 'text/html,application/json,*/*'
      },
      timeout: TIMEOUT_MS
    };

    const req = client.request(options, (res) => {
      let body = '';
      const responseTime = Date.now() - startTime;

      res.on('data', (chunk) => {
        body += chunk.toString();
      });

      res.on('end', () => {
        const has404 = body.includes('404') || body.includes('Not Found') || body.includes('not found');
        
        resolve({
          url,
          status: res.statusCode,
          responseTime,
          success: res.statusCode === 200 && responseTime < TIMEOUT_MS && !has404,
          errors: []
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: null,
        responseTime: Date.now() - startTime,
        success: false,
        errors: ['Timeout (>3s)']
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        status: null,
        responseTime: Date.now() - startTime,
        success: false,
        errors: [error.message]
      });
    });

    req.end();
  });
}

/**
 * Hauptfunktion
 */
async function runSmokeTests() {
  console.log(`Prüfe ${URLS.length} URLs auf ${BASE_URL}...\n`);

  const results = {
    timestamp: new Date().toISOString(),
    total: URLS.length,
    passed: 0,
    failed: 0,
    tests: []
  };

  // Alle URLs parallel prüfen
  const testPromises = URLS.map(url => checkUrl(url));
  const testResults = await Promise.all(testPromises);

  // Ergebnisse auswerten
  for (const result of testResults) {
    if (result.success) {
      results.passed++;
      console.log(`✅ ${result.url}`);
      console.log(`   Status: ${result.status} | Zeit: ${result.responseTime}ms`);
    } else {
      results.failed++;
      console.log(`❌ ${result.url}`);
      console.log(`   Status: ${result.status || 'ERROR'} | Zeit: ${result.responseTime}ms`);
      if (result.errors.length > 0) {
        console.log(`   Fehler: ${result.errors.join(', ')}`);
      }
    }
    console.log();
    results.tests.push(result);
  }

  // Zusammenfassung
  console.log('='.repeat(50));
  console.log('ZUSAMMENFASSUNG');
  console.log('='.repeat(50));
  console.log(`Gesamt:  ${results.total}`);
  console.log(`✅ OK:    ${results.passed}`);
  console.log(`❌ Fehler: ${results.failed}`);
  console.log();

  // JSON-Report erstellen
  const reportPath = path.join(__dirname, '..', 'smoke-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report gespeichert: ${reportPath}`);

  // Exit Code
  if (results.failed === 0) {
    console.log('\n🎉 Alle Tests bestanden!\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${results.failed} Test(s) fehlgeschlagen!\n`);
    process.exit(1);
  }
}

// Script ausführen
runSmokeTests().catch(error => {
  console.error('Kritischer Fehler:', error);
  process.exit(1);
});
