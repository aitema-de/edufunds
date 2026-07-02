export const dynamic = 'force-static';

import { NextResponse } from 'next/server';
import { generateNewsletter } from '@/lib/newsletter';
import { testNewsletterData } from '@/lib/newsletter-test-content';

/**
 * GET /api/newsletter/preview
 * 
 * Returns a preview of the newsletter HTML.
 * For testing and review purposes.
 */
export async function GET() {
  try {
    // Static export - always return HTML format
    const format = 'html';
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edufunds.org';
    const testToken = 'preview-token-12345';
    
    const { html, text, subject } = generateNewsletter(
      testNewsletterData,
      baseUrl,
      testToken
    );

    // Return HTML with proper styling for preview
    const previewHtml = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter Preview - ${subject}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1e3b2a;
            min-height: 100vh;
        }
        .preview-container {
            max-width: 800px;
            margin: 0 auto;
            background: #0f1f38;
            border-radius: 16px;
            padding: 30px;
            border: 1px solid rgba(201, 162, 39, 0.2);
        }
        .preview-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(201, 162, 39, 0.3);
        }
        .preview-header h1 {
            color: #faf7f0;
            margin: 0 0 10px 0;
            font-size: 24px;
        }
        .preview-header p {
            color: #94a3b8;
            margin: 0;
        }
        .preview-meta {
            background: rgba(201, 162, 39, 0.1);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 30px;
        }
        .preview-meta p {
            color: #94a3b8;
            margin: 5px 0;
            font-size: 14px;
        }
        .preview-meta strong {
            color: #b08c2e;
        }
        .newsletter-frame {
            background: #1e3b2a;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(30, 58, 95, 0.5);
        }
        .action-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 30px;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
        }
        .btn-primary {
            background: linear-gradient(135deg, #f97316 0%, #fbbf24 100%);
            color: #1e3b2a;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3);
        }
        .btn-secondary {
            background: rgba(30, 58, 95, 0.5);
            color: #94a3b8;
            border: 1px solid rgba(30, 58, 95, 0.8);
        }
        .btn-secondary:hover {
            background: rgba(30, 58, 95, 0.8);
            color: #faf7f0;
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            justify-content: center;
        }
        .tab {
            padding: 8px 16px;
            border-radius: 6px;
            color: #94a3b8;
            text-decoration: none;
            font-size: 14px;
            transition: all 0.2s;
        }
        .tab.active {
            background: rgba(201, 162, 39, 0.2);
            color: #b08c2e;
        }
        .tab:hover:not(.active) {
            background: rgba(30, 58, 95, 0.3);
            color: #faf7f0;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-header">
            <h1>📧 Newsletter Preview</h1>
            <p>Überprüfen Sie die Darstellung vor dem Versand</p>
        </div>
        
        <div class="preview-meta">
            <p><strong>Betreff:</strong> ${subject}</p>
            <p><strong>Ausgabe:</strong> ${testNewsletterData.issueNumber}</p>
            <p><strong>Datum:</strong> ${testNewsletterData.issueDate}</p>
            <p><strong>Empfänger:</strong> Alle bestätigten Abonnenten</p>
        </div>

        <div class="tabs">
            <a href="?format=html" class="tab active">HTML Version</a>
            <a href="?format=text" class="tab">Plain Text</a>
        </div>
        
        <div class="newsletter-frame">
            ${html}
        </div>
        
        <div class="action-buttons">
            <a href="/api/newsletter/send" class="btn btn-primary" target="_blank">
                📤 Zum Versand-Admin
            </a>
            <a href="/" class="btn btn-secondary">
                ← Zurück zur Website
            </a>
        </div>
    </div>
</body>
</html>`;

    return new Response(previewHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('[Newsletter Preview] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Fehler beim Erstellen der Vorschau',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
