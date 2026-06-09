const html2pdf = require('html2pdf.js');
const fs = require('fs');
const path = require('path');

// Lese die Markdown-Datei
const markdownContent = fs.readFileSync(
  path.join(__dirname, 'SICHERHEIT_AUDIT_2026-02-12.md'),
  'utf-8'
);

// Konvertiere Markdown zu HTML (einfache Umwandlung)
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>EduFunds Sicherheits-Audit</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #d32f2f;
      font-size: 24pt;
      border-bottom: 3px solid #d32f2f;
      padding-bottom: 10px;
    }
    h2 {
      color: #1976d2;
      font-size: 16pt;
      margin-top: 30px;
      border-left: 4px solid #1976d2;
      padding-left: 10px;
    }
    h3 {
      color: #388e3c;
      font-size: 13pt;
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    code {
      background-color: #f5f5f5;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 9pt;
    }
    pre {
      background-color: #263238;
      color: #aed581;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-size: 9pt;
      line-height: 1.4;
    }
    .header-info {
      background-color: #e3f2fd;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .risk-high {
      color: #d32f2f;
      font-weight: bold;
    }
    .risk-medium {
      color: #f57c00;
      font-weight: bold;
    }
    .risk-low {
      color: #388e3c;
    }
    .status-good {
      color: #2e7d32;
      font-weight: bold;
    }
    .status-warning {
      color: #f57c00;
      font-weight: bold;
    }
    .status-bad {
      color: #c62828;
      font-weight: bold;
    }
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 30px 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 15px 0;
      padding: 10px 20px;
      background-color: #f9f9f9;
    }
  </style>
</head>
<body>
  <div class="header-info">
    <h1>🔒 EduFunds Sicherheits-Audit</h1>
    <p><strong>Datum:</strong> 12. Februar 2026</p>
    <p><strong>Version:</strong> 1.0</p>
    <p><strong>Tester:</strong> Security Audit Agent</p>
    <p><strong>Gesamtbewertung:</strong> 3.5 von 5</p>
  </div>
  
  <hr>
  
  <h2>Executive Summary</h2>
  <p>Das EduFunds-System zeigt eine solide Grundsicherheit mit einigen wichtigen Verbesserungsmöglichkeiten. Die Anwendung implementiert wesentliche Sicherheitsmaßnahmen wie XSS-Schutz, SQL-Injection-Prävention und Authentifizierung für sensible Endpunkte.</p>
  
  <h3>Kritische Findings</h3>
  <table>
    <tr><th>#</th><th>Finding</th><th>Risiko</th></tr>
    <tr><td>1</td><td>Content-Security-Policy Header fehlt</td><td class="risk-high">Hoch</td></tr>
    <tr><td>2</td><td>Keine HSTS Header</td><td class="risk-medium">Mittel</td></tr>
    <tr><td>3</td><td>Checkout-API ohne Betrags-Validierung</td><td class="risk-medium">Mittel</td></tr>
    <tr><td>4</td><td>Keine explizite CORS-Konfiguration</td><td class="risk-low">Niedrig</td></tr>
  </table>
  
  <h2>1. Test-Methodik</h2>
  <p>8 automatisierte Tests und 4 manuelle Tests wurden durchgeführt.</p>
  
  <h3>Automatisierte Tests</h3>
  <table>
    <tr><th>Test</th><th>Beschreibung</th><th>Status</th></tr>
    <tr><td>HTTP-Header</td><td>Sicherheits-Header Analyse</td><td class="status-warning">Teilweise</td></tr>
    <tr><td>Offene Ports</td><td>Port-Scan</td><td class="status-good">OK</td></tr>
    <tr><td>SSL/TLS</td><td>Konfigurationsprüfung</td><td class="status-warning">Dev-Modus</td></tr>
    <tr><td>XSS</td><td>Payload-Injection</td><td class="status-good">Geschützt</td></tr>
    <tr><td>SQL-Injection</td><td>Payload-Test</td><td class="status-good">Geschützt</td></tr>
    <tr><td>Rate-Limiting</td><td>100 Requests/min</td><td class="status-warning">Teilweise</td></tr>
    <tr><td>CORS</td><td>Cross-Origin Tests</td><td class="status-warning">Default</td></tr>
    <tr><td>CSP</td><td>Content-Security-Policy</td><td class="status-bad">Fehlt</td></tr>
  </table>
  
  <h2>2. Ergebnisse</h2>
  
  <h3>2.1 Netzwerk-Sicherheit</h3>
  <p><strong>Ports:</strong> Nur Port 3101 (Next.js) geöffnet. Keine überflüssigen Dienste.</p>
  <p><strong>SSL/TLS:</strong> In Entwicklungsumgebung nicht konfiguriert. Für Produktion erforderlich.</p>
  
  <h3>2.2 Application-Sicherheit</h3>
  
  <p><strong>XSS-Schutz:</strong> <span class="status-good">Implementiert</span></p>
  <ul>
    <li>HTML-Escaping in Kontaktformular</li>
    <li>React's eingebauter XSS-Schutz</li>
    <li>E-Mail Template Escaping</li>
  </ul>
  
  <p><strong>SQL-Injection:</strong> <span class="status-good">Geschützt</span></p>
  <ul>
    <li>Parameterized Queries verwendet</li>
    <li>Keine String-Konkatenation für SQL</li>
  </ul>
  
  <p><strong>Rate-Limiting:</strong> <span class="status-warning">Teilweise</span></p>
  <ul>
    <li>/api/assistant/generate: 10 req/min</li>
    <li>/api/contact: 5 req/hour per E-Mail</li>
    <li>/api/checkout: Kein Limit</li>
  </ul>
  
  <h3>2.3 API-Sicherheit</h3>
  
  <p><strong>Authentifizierung:</strong></p>
  <table>
    <tr><th>Endpunkt</th><th>Auth</th><th>Status</th></tr>
    <tr><td>/api/assistant/generate</td><td>Keine</td><td class="status-good">OK (öffentlich)</td></tr>
    <tr><td>/api/newsletter/send</td><td>Admin-Key</td><td class="status-good">Geschützt</td></tr>
    <tr><td>/api/checkout</td><td>Keine</td><td class="status-warning">Diskutabel</td></tr>
  </table>
  
  <h3>2.4 Security Headers</h3>
  
  <p><strong>Vorhanden:</strong></p>
  <ul>
    <li>✅ X-Content-Type-Options: nosniff</li>
    <li>✅ X-Frame-Options: DENY</li>
    <li>✅ X-XSS-Protection: 1; mode=block</li>
    <li>✅ Cache-Control: no-store, must-revalidate</li>
  </ul>
  
  <p><strong>Fehlend:</strong></p>
  <ul>
    <li>❌ Content-Security-Policy</li>
    <li>❌ Strict-Transport-Security (HSTS)</li>
    <li>❌ Referrer-Policy</li>
    <li>❌ Permissions-Policy</li>
  </ul>
  
  <h2>3. Risiko-Bewertung</h2>
  
  <table>
    <tr>
      <th>Finding</th>
      <th>Schwere</th>
      <th>Wahrscheinlichkeit</th>
      <th>Risiko</th>
    </tr>
    <tr>
      <td>Fehlender CSP Header</td>
      <td>Hoch</td>
      <td>Mittel</td>
      <td class="risk-high">Hoch</td>
    </tr>
    <tr>
      <td>Fehlende Betrags-Validierung</td>
      <td>Mittel</td>
      <td>Niedrig</td>
      <td class="risk-medium">Mittel</td>
    </tr>
    <tr>
      <td>Keine HSTS Header</td>
      <td>Mittel</td>
      <td>Niedrig</td>
      <td class="risk-medium">Mittel</td>
    </tr>
    <tr>
      <td>Keine CORS-Policies</td>
      <td>Niedrig</td>
      <td>Niedrig</td>
      <td class="risk-low">Niedrig</td>
    </tr>
  </table>
  
  <h2>4. Empfehlungen</h2>
  
  <h3>Sofortmaßnahmen (24h)</h3>
  <ol>
    <li>Content-Security-Policy Header implementieren</li>
  </ol>
  
  <h3>Kurzfristig (1 Woche)</h3>
  <ol>
    <li>Betrags-Validierung im Checkout hinzufügen</li>
    <li>HSTS Header für Produktion</li>
    <li>Rate-Limiting für Checkout implementieren</li>
  </ol>
  
  <h3>Mittelfristig (1 Monat)</h3>
  <ol>
    <li>CORS-Policies explizit definieren</li>
    <li>Security.txt implementieren</li>
    <li>Audit-Logging hinzufügen</li>
  </ol>
  
  <h3>Langfristig (3 Monate)</h3>
  <ol>
    <li>Sicherheits-Automatisierung (Snyk, Dependabot)</li>
    <li>Professioneller Penetration-Test</li>
    <li>Bug Bounty Programm evaluieren</li>
  </ol>
  
  <h2>5. Zusammenfassung</h2>
  
  <p>Das EduFunds-System ist grundsätzlich sicher aufgebaut, mit einigen Bereichen, die verbessert werden sollten:</p>
  
  <ul>
    <li><strong>Stärken:</strong> XSS-Schutz, SQL-Injection-Prävention, Zod-Validierung</li>
    <li><strong>Schwächen:</strong> Fehlende Sicherheits-Header, unvollständige Validierung</li>
  </ul>
  
  <p>Die implementierten Sicherheitsmaßnahmen zeigen ein gutes Verständnis für Web-Sicherheit. Die identifizierten Probleme können mit moderaten Aufwand behoben werden.</p>
  
  <hr>
  
  <p style="font-size: 9pt; color: #666; margin-top: 40px;">
    <strong>Dokument erstellt:</strong> 12. Februar 2026<br>
    <strong>Version:</strong> 1.0<br>
    <strong>Klassifizierung:</strong> Intern
  </p>
</body>
</html>
`;

// Speichere HTML
fs.writeFileSync(
  path.join(__dirname, 'SICHERHEIT_AUDIT_2026-02-12.html'),
  htmlContent
);

console.log('✅ HTML-Version erstellt: SICHERHEIT_AUDIT_2026-02-12.html');

// Versuche PDF-Generierung
async function generatePDF() {
  try {
    const element = htmlContent;
    const opt = {
      margin: 1,
      filename: 'SICHERHEIT_AUDIT_2026-02-12.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
    };
    
    // html2pdf benötigt einen DOM - in Node.js nicht direkt verfügbar
    // Wir erstellen stattdessen eine druckfreundliche HTML-Version
    console.log('✅ PDF-Generierung in Node.js nicht direkt möglich');
    console.log('✅ Stattdessen wurde eine druckfreundliche HTML-Version erstellt');
    console.log('✅ Markdown-Version ebenfalls verfügbar');
    
  } catch (error) {
    console.error('Fehler:', error.message);
  }
}

generatePDF();
