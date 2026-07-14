export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { unsubscribeNewsletterEntry } from '@/lib/db';

/**
 * GET /api/newsletter/unsubscribe?token=...
 *
 * Meldet den Empfänger anhand seines Abmelde-Tokens ab und zeigt eine
 * Bestätigungsseite. Unbekannte/abgelaufene Tokens werden freundlich als
 * „bereits abgemeldet" behandelt (kein harter Fehler).
 */
async function processUnsubscribe(token: string | null): Promise<{ message: string; isSuccess: boolean }> {
  if (!token) {
    return {
      message: 'Kein gültiger Abmelde-Link. Bitte verwenden Sie den Abmelde-Link aus der E-Mail.',
      isSuccess: false,
    };
  }
  try {
    const removed = await unsubscribeNewsletterEntry(token);
    if (removed) {
      return {
        message: 'Sie wurden erfolgreich vom EduFunds-Newsletter abgemeldet. Schade, dass Sie gehen — Sie können sich jederzeit wieder anmelden.',
        isSuccess: true,
      };
    }
    return {
      message: 'Diese Adresse ist bereits abgemeldet oder der Link wurde schon verwendet. Sie erhalten keine weiteren Newsletter von uns.',
      isSuccess: true,
    };
  } catch (err) {
    console.error('[newsletter/unsubscribe] Fehler:', err);
    return {
      message: 'Die Abmeldung konnte gerade nicht verarbeitet werden. Bitte versuchen Sie es später erneut oder schreiben Sie an office@aitema.de.',
      isSuccess: false,
    };
  }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  const { message, isSuccess } = await processUnsubscribe(token);
  return new Response(getUnsubscribePageHtml(message, isSuccess), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * POST = One-Click-Abmeldung (RFC 8058). Gmail/Microsoft rufen diesen Endpoint
 * direkt auf, wenn der Header `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
 * gesetzt ist. Antwort muss schlicht 200 sein.
 */
export async function POST(request: Request) {
  let token = new URL(request.url).searchParams.get('token');
  if (!token) {
    try {
      const form = await request.formData();
      token = (form.get('token') as string) || null;
    } catch {
      /* kein Formular-Body */
    }
  }
  await processUnsubscribe(token);
  return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

/**
 * Generates the unsubscribe confirmation/error page HTML
 */
function getUnsubscribePageHtml(message: string, isSuccess: boolean): string {
  const accentColor = isSuccess ? '#b08c2e' : '#ef4444';
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
            background: linear-gradient(135deg, #1e3b2a 0%, #2a5244 100%);
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
            background: linear-gradient(135deg, #1e3b2a 0%, #2a5244 100%);
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #1e3b2a;
        }
        
        .logo-text {
            text-align: left;
        }
        
        .logo-title {
            font-size: 22px;
            font-weight: 700;
            color: #faf7f0;
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
            color: #faf7f0;
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
            background: linear-gradient(135deg, #b08c2e 0%, #b08d1f 100%);
            color: #1e3b2a;
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
            color: #6b6457;
        }
        
        .footer a {
            color: #b08c2e;
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
            <p>Ein Projekt der <a href="https://aitema.de">aitema GmbH</a></p>
            <p style="margin-top: 8px;">© ${new Date().getFullYear()} EduFunds</p>
        </div>
    </div>
</body>
</html>`;
}
