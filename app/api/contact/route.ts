export const dynamic = 'force-static';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

// Resend API Key aus Umgebungsvariablen
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Admin E-Mail Adresse
const ADMIN_EMAIL = 'office@aitema.de';
const FROM_EMAIL = 'EduFunds <noreply@aitema.de>';

// Zod Schema für Validierung
const contactSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  subject: z.string().min(5, 'Betreff muss mindestens 5 Zeichen lang sein'),
  message: z.string().min(20, 'Nachricht muss mindestens 20 Zeichen lang sein'),
  datenschutz: z.literal(true, {
    errorMap: () => ({ message: 'Sie müssen der Datenschutzerklärung zustimmen' }),
  }),
  // Honeypot Feld für Spam-Schutz (sollte leer sein)
  website: z.string().optional(),
  // Zeitstempel für Spam-Schutz (mindestens 3 Sekunden zwischen Laden und Absenden)
  timestamp: z.number().optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;

// Datenbank-Datei Pfad
const DB_PATH = path.join(process.cwd(), 'data', 'contacts.json');

// Stelle sicher, dass das data Verzeichnis existiert
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Speichere Kontaktanfrage in JSON-Datei
async function saveContact(data: ContactFormData & { id: string; createdAt: string; ip?: string }) {
  ensureDataDir();
  
  let contacts: any[] = [];
  if (fs.existsSync(DB_PATH)) {
    const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
    contacts = JSON.parse(fileContent);
  }
  
  contacts.push(data);
  fs.writeFileSync(DB_PATH, JSON.stringify(contacts, null, 2));
  return data;
}

// Admin E-Mail Template
function getAdminEmailTemplate(data: ContactFormData) {
  return {
    subject: `Neue Kontaktanfrage: ${data.subject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); padding: 30px; border-radius: 10px 10px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .field { margin-bottom: 20px; }
    .field-label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .field-value { font-size: 16px; color: #111827; }
    .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #c9a227; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Neue Kontaktanfrage</h1>
    </div>
    <div class="content">
      <div class="field">
        <div class="field-label">Name</div>
        <div class="field-value">${escapeHtml(data.name)}</div>
      </div>
      
      <div class="field">
        <div class="field-label">E-Mail</div>
        <div class="field-value">
          <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>
        </div>
      </div>
      
      <div class="field">
        <div class="field-label">Betreff</div>
        <div class="field-value">${escapeHtml(data.subject)}</div>
      </div>
      
      <div class="field">
        <div class="field-label">Nachricht</div>
        <div class="message-box">
          ${escapeHtml(data.message).replace(/\n/g, '<br>')}
        </div>
      </div>
      
      <div class="footer">
        <p>Diese Anfrage wurde über das Kontaktformular auf EduFunds.de gesendet.</p>
        <p>Zeitstempel: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Neue Kontaktanfrage

Name: ${data.name}
E-Mail: ${data.email}
Betreff: ${data.subject}

Nachricht:
${data.message}

---
Diese Anfrage wurde über das Kontaktformular auf EduFunds.de gesendet.
Zeitstempel: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
    `.trim(),
  };
}

// User Confirmation E-Mail Template
function getUserEmailTemplate(data: ContactFormData) {
  return {
    subject: 'Ihre Anfrage bei EduFunds wurde erfolgreich gesendet',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .confirmation-box { background: #d1fae5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .confirmation-box h2 { color: #065f46; margin: 0 0 10px 0; font-size: 18px; }
    .confirmation-box p { color: #065f46; margin: 0; }
    .details { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .details h3 { margin: 0 0 15px 0; color: #374151; font-size: 16px; }
    .field { margin-bottom: 15px; }
    .field-label { font-weight: bold; color: #6b7280; font-size: 11px; text-transform: uppercase; margin-bottom: 3px; }
    .field-value { font-size: 14px; color: #111827; }
    .next-steps { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4; }
    .next-steps h3 { margin: 0 0 15px 0; color: #374151; font-size: 16px; }
    .next-steps ul { margin: 0; padding-left: 20px; color: #4b5563; }
    .next-steps li { margin-bottom: 8px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
    .contact-info { background: #1f2937; color: white; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center; }
    .contact-info a { color: #f97316; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Anfrage erfolgreich gesendet</h1>
    </div>
    <div class="content">
      <div class="confirmation-box">
        <h2>Vielen Dank für Ihre Nachricht!</h2>
        <p>Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>
      </div>
      
      <div class="details">
        <h3>Zusammenfassung Ihrer Anfrage</h3>
        <div class="field">
          <div class="field-label">Betreff</div>
          <div class="field-value">${escapeHtml(data.subject)}</div>
        </div>
        <div class="field">
          <div class="field-label">Gesendet am</div>
          <div class="field-value">${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</div>
        </div>
      </div>
      
      <div class="next-steps">
        <h3>Was passiert als Nächstes?</h3>
        <ul>
          <li>Unser Team prüft Ihre Anfrage sorgfältig</li>
          <li>Wir antworten in der Regel innerhalb von 24-48 Stunden</li>
          <li>Bei dringenden Anliegen erreichen Sie uns telefonisch</li>
        </ul>
      </div>
      
      <div class="contact-info">
        <p><strong>aitema GmbH</strong></p>
        <p>Prenzlauer Allee 229, 10405 Berlin</p>
        <p style="margin-top: 10px;">
          <a href="mailto:office@aitema.de">office@aitema.de</a>
        </p>
      </div>
      
      <div class="footer">
        <p>Dies ist eine automatische Bestätigungs-E-Mail. Bitte antworten Sie nicht auf diese Nachricht.</p>
        <p style="margin-top: 10px;">
          <a href="https://edufunds.de/datenschutz">Datenschutzerklärung</a> | 
          <a href="https://edufunds.de/impressum">Impressum</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Vielen Dank für Ihre Nachricht!

Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.

ZUSAMMENFASSUNG IHRER ANFRAGE
-----------------------------
Betreff: ${data.subject}
Gesendet am: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}

WAS PASSIERT ALS NÄCHSTES?
---------------------------
- Unser Team prüft Ihre Anfrage sorgfältig
- Wir antworten in der Regel innerhalb von 24-48 Stunden
- Bei dringenden Anliegen erreichen Sie uns telefonisch

---
aitema GmbH
Prenzlauer Allee 229, 10405 Berlin
E-Mail: office@aitema.de

Dies ist eine automatische Bestätigungs-E-Mail. Bitte antworten Sie nicht auf diese Nachricht.
    `.trim(),
  };
}

// HTML Escaping Helper
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Spam-Prüfung: Mindestzeit zwischen Laden und Absenden
function isSpam(timestamp: number | undefined): boolean {
  if (!timestamp) return true; // Kein Timestamp = Spam
  const now = Date.now();
  const minTimeMs = 3000; // Mindestens 3 Sekunden
  return now - timestamp < minTimeMs;
}

// POST Handler
export async function POST(request: Request) {
  try {
    // Parse JSON Body
    const body = await request.json();

    // Spam-Schutz: Honeypot-Feld prüfen
    if (body.website && body.website.trim() !== '') {
      // Honeypot wurde ausgefüllt -> wahrscheinlich Bot
      return NextResponse.json(
        { success: false, error: 'Spam erkannt' },
        { status: 400 }
      );
    }

    // Spam-Schutz: Zeit-Check
    if (isSpam(body.timestamp)) {
      return NextResponse.json(
        { success: false, error: 'Zu schnell abgesendet. Bitte warten Sie einen Moment.' },
        { status: 429 }
      );
    }

    // Validierung mit Zod
    const validationResult = contactSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        { success: false, error: 'Validierungsfehler', errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Rate Limiting: Prüfe auf zu viele Anfragen von derselben E-Mail (einfache Implementierung)
    ensureDataDir();
    let contacts: any[] = [];
    if (fs.existsSync(DB_PATH)) {
      const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
      contacts = JSON.parse(fileContent);
    }
    
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentContacts = contacts.filter(
      (c) => c.email === data.email && new Date(c.createdAt).getTime() > oneHourAgo
    );
    
    if (recentContacts.length >= 5) {
      return NextResponse.json(
        { success: false, error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
        { status: 429 }
      );
    }

    // Erstelle Eintrag
    const contactEntry = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date().toISOString(),
    };

    // Speichere in Datenbank
    await saveContact(contactEntry);

    // Sende E-Mails (nur wenn Resend konfiguriert ist)
    if (resend && resendApiKey) {
      try {
        // Admin E-Mail
        const adminTemplate = getAdminEmailTemplate(data);
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: adminTemplate.subject,
          html: adminTemplate.html,
          text: adminTemplate.text,
          replyTo: data.email,
        });

        // User Bestätigungs-E-Mail
        const userTemplate = getUserEmailTemplate(data);
        await resend.emails.send({
          from: FROM_EMAIL,
          to: data.email,
          subject: userTemplate.subject,
          html: userTemplate.html,
          text: userTemplate.text,
        });
      } catch (emailError) {
        console.error('Fehler beim Senden der E-Mails:', emailError);
        // Wir werfen keinen Fehler, da die Daten bereits gespeichert wurden
        // Die E-Mails können später manuell versendet werden
      }
    } else {
      console.warn('Resend API Key nicht konfiguriert. E-Mails wurden nicht versendet.');
    }

    return NextResponse.json({
      success: true,
      message: 'Ihre Nachricht wurde erfolgreich gesendet.',
    });
  } catch (error) {
    console.error('Fehler beim Verarbeiten der Kontaktanfrage:', error);
    
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    );
  }
}
