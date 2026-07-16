/**
 * Newsletter Email Templates
 *
 * HTML-Templates für Double-Opt-In und Willkommens-E-Mails
 */

import { publicAppUrl } from '@/lib/app-url';

export interface EmailTemplateData {
  confirmationUrl: string;
  email: string;
  year?: number;
}

/**
 * Double-Opt-In Bestätigungs-E-Mail Template
 */
export function getConfirmationEmailTemplate(data: EmailTemplateData): string {
  const { confirmationUrl, year = new Date().getFullYear() } = data;
  
  return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter-Anmeldung bestätigen</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            color: #2563eb;
            margin: 0;
            font-size: 28px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .button-wrapper {
            text-align: center;
            margin: 30px 0;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            color: #6b7280;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .url-fallback {
            word-break: break-all;
            color: #6b7280;
            font-size: 12px;
            margin-top: 10px;
            background: #f3f4f6;
            padding: 12px;
            border-radius: 4px;
        }
        .benefits {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .benefits ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .benefits li {
            margin: 8px 0;
            color: #4b5563;
        }
        @media (max-width: 480px) {
            .container {
                padding: 24px;
            }
            .button {
                width: 100%;
                box-sizing: border-box;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>📚 EduFunds</h1>
        </div>
        
        <div class="content">
            <h2>Fast geschafft!</h2>
            <p>Vielen Dank für Ihr Interesse an unserem Newsletter. Um Ihre Anmeldung abzuschließen, bestätigen Sie bitte Ihre E-Mail-Adresse.</p>
            
            <div class="button-wrapper">
                <a href="${confirmationUrl}" class="button">Anmeldung bestätigen</a>
            </div>
            
            <div class="url-fallback">
                <strong>Link funktioniert nicht?</strong><br>
                Kopieren Sie diesen Link in Ihren Browser:<br>
                ${confirmationUrl}
            </div>
            
            <div class="benefits">
                <strong>Was erwartet Sie im Newsletter?</strong>
                <ul>
                    <li>🎯 Exklusive Förderprogramme für Schulen</li>
                    <li>📝 Tipps zur erfolgreichen Antragsstellung</li>
                    <li>📰 Neuigkeiten aus der Bildungsförderung</li>
                    <li>📅 Einmal monatlich, kein Spam</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Falls Sie sich nicht für unseren Newsletter angemeldet haben, ignorieren Sie diese E-Mail einfach.</p>
            <p>Ihre Daten werden gemäß DSGVO verarbeitet.</p>
            <p>&copy; ${year} EduFunds. Alle Rechte vorbehalten.</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Willkommens-E-Mail Template (nach Bestätigung)
 */
export function getWelcomeEmailTemplate(data: EmailTemplateData): string {
  const { email, year = new Date().getFullYear() } = data;
  
  return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Willkommen beim EduFunds Newsletter</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            color: #2563eb;
            margin: 0;
            font-size: 28px;
        }
        .success-icon {
            text-align: center;
            font-size: 48px;
            margin: 20px 0;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background-color: #10b981;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button-wrapper {
            text-align: center;
            margin: 30px 0;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            color: #6b7280;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .highlight-box {
            background: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>📚 EduFunds</h1>
        </div>
        
        <div class="success-icon">🎉</div>
        
        <div class="content">
            <h2>Willkommen an Bord!</h2>
            <p>Ihre E-Mail-Adresse <strong>${email}</strong> wurde erfolgreich bestätigt. Sie sind jetzt für den EduFunds Newsletter angemeldet.</p>
            
            <div class="highlight-box">
                <strong>Was passiert als Nächstes?</strong><br>
                Halten Sie Ausschau nach unserer nächsten Ausgabe mit aktuellen Fördermöglichkeiten und praktischen Tipps.
            </div>
            
            <div class="button-wrapper">
                <a href="${publicAppUrl()}" class="button">Zu EduFunds</a>
            </div>
        </div>
        
        <div class="footer">
            <p>Sie können sich jederzeit vom Newsletter abmelden.</p>
            <p>&copy; ${year} EduFunds. Alle Rechte vorbehalten.</p>
        </div>
    </div>
</body>
</html>`;
}
