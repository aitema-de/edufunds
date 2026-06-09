export const dynamic = 'force-static';

import { NextResponse } from 'next/server';

/**
 * GET /api/newsletter/unsubscribe
 * 
 * Unsubscribes a user from the newsletter using their unique token.
 * Returns an HTML page with confirmation or error message.
 * 
 * NOTE: Static export - database operations not available.
 * In production, this should be handled by a serverful deployment.
 */
export async function GET() {
  // Static export - no database access
  // Return informational page
  return new Response(
    getUnsubscribePageHtml(
      'Die Abmeldung ist im Moment nicht verfügbar. Bitte kontaktieren Sie uns direkt unter kontakt@edufunds.org.',
      false
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

/**
 * Generates the unsubscribe confirmation/error page HTML
 */
function getUnsubscribePageHtml(message: string, isSuccess: boolean): string {
  const accentColor = isSuccess ? '#c9a227' : '#ef4444';
  const icon = isSuccess ? '✓' : '✕';
  const title = isSuccess ? 'Abmeldung erfolgreich' : 'Ein Fehler ist aufgetreten';

  return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - EduFunds Newsletter</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%);
            padding: 20px;
        }
        
        .card {
            background: linear-gradient(135deg, #0f1f38 0%, rgba(30, 58, 95, 0.8) 100%);
            padding: 48px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 440px;
            width: 100%;
            border: 1px solid rgba(201, 162, 39, 0.2);
        }
        
        .logo {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 32px;
        }
        
        .logo-icon {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%);
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #0a1628;
        }
        
        .logo-text {
            text-align: left;
        }
        
        .logo-title {
            font-size: 22px;
            font-weight: 700;
            color: #f8f5f0;
        }
        
        .logo-subtitle {
            font-size: 11px;
            color: #94a3b8;
            margin-top: -2px;
        }
        
        .icon {
            width: 72px;
            height: 72px;
            background: ${isSuccess ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' : 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'};
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 24px;
            box-shadow: 0 8px 24px ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
        }
        
        h1 {
            color: #f8f5f0;
            margin: 0 0 16px;
            font-size: 24px;
            font-weight: 700;
        }
        
        p {
            color: #94a3b8;
            line-height: 1.7;
            margin: 0 0 28px;
            font-size: 15px;
        }
        
        .button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #c9a227 0%, #b08d1f 100%);
            color: #0a1628;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
        }
        
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(201, 162, 39, 0.4);
        }
        
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(201, 162, 39, 0.2);
            font-size: 13px;
            color: #64748b;
        }
        
        .footer a {
            color: #c9a227;
            text-decoration: none;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 480px) {
            .card {
                padding: 32px 24px;
            }
            
            h1 {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">
            <div class="logo-icon">€</div>
            <div class="logo-text">
                <div class="logo-title">EduFunds</div>
                <div class="logo-subtitle">Intelligente Schulförderung</div>
            </div>
        </div>
        
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="https://edufunds.org" class="button">Zurück zur Startseite</a>
        
        <div class="footer">
            <p>Ein Projekt der <a href="https://aitema.de">AITEMA GmbH</a></p>
            <p style="margin-top: 8px;">© ${new Date().getFullYear()} EduFunds</p>
        </div>
    </div>
</body>
</html>`;
}
