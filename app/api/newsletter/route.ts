export const dynamic = 'force-static';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getConfirmationEmailTemplate } from '@/lib/newsletter-templates';
import {
  createNewsletterEntry,
  getNewsletterEntryByEmail,
  getNewsletterEntryByConfirmationToken,
  confirmNewsletterEntry,
  generateToken,
} from '@/lib/db';

// E-Mail Validation Schema
const newsletterSchema = z.object({
  email: z
    .string()
    .min(1, 'E-Mail ist erforderlich')
    .email('Bitte geben Sie eine gültige E-Mail-Adresse ein')
    .transform((email) => email.toLowerCase().trim()),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

// Rate limiting store
interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

const getRateLimitStore = () => {
  if (!(global as any).__newsletterRateLimit) {
    (global as any).__newsletterRateLimit = new Map<string, RateLimitEntry>();
  }
  return (global as any).__newsletterRateLimit as Map<string, RateLimitEntry>;
};

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const RATE_LIMIT_MAX_REQUESTS = 5; // max 5 requests per hour per IP

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const store = getRateLimitStore();
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) {
    store.set(ip, { count: 1, firstRequest: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW };
  }

  // Reset if window has passed
  if (now - entry.firstRequest > RATE_LIMIT_WINDOW) {
    store.set(ip, { count: 1, firstRequest: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW };
  }

  // Check limit
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const resetIn = RATE_LIMIT_WINDOW - (now - entry.firstRequest);
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.count++;
  store.set(ip, entry);
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetIn: RATE_LIMIT_WINDOW - (now - entry.firstRequest) };
}

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback - in production use a proper IP detection
  return 'unknown';
}

// Mock email sender (replace with Resend when API key is available)
async function sendConfirmationEmail(email: string, token: string): Promise<boolean> {
  const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3101'}/api/newsletter?token=${token}`;
  
  // Check if Resend API key is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey && resendApiKey !== 'mock') {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendApiKey);
      
      const { data, error } = await resend.emails.send({
        from: 'EduFunds <newsletter@edufunds.de>',
        to: email,
        subject: 'Bestätigen Sie Ihre Newsletter-Anmeldung',
        html: getConfirmationEmailTemplate({ confirmationUrl, email }),
      });
      
      if (error) {
        console.error('Resend error:', error);
        return false;
      }
      
      console.log('Confirmation email sent via Resend:', data?.id);
      return true;
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      // Fall through to mock
    }
  }
  
  // Mock mode - log to console
  console.log('\n========== NEWSLETTER CONFIRMATION EMAIL (MOCK) ==========');
  console.log('To:', email);
  console.log('Subject: Bestätigen Sie Ihre Newsletter-Anmeldung');
  console.log('Confirmation URL:', confirmationUrl);
  console.log('===========================================================\n');
  
  return true;
}

// Success page HTML
function getSuccessPageHtml(message: string, isSuccess: boolean = true): string {
  const color = isSuccess ? '#10b981' : '#ef4444';
  const icon = isSuccess ? '✓' : '✕';
  
  return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isSuccess ? 'Bestätigt' : 'Fehler'} - EduFunds Newsletter</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .card {
            background: white;
            padding: 48px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
            width: 90%;
        }
        .icon {
            width: 64px;
            height: 64px;
            background: ${color};
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 24px;
        }
        h1 {
            color: #1f2937;
            margin: 0 0 16px;
            font-size: 24px;
        }
        p {
            color: #6b7280;
            line-height: 1.6;
            margin: 0 0 24px;
        }
        .button {
            display: inline-block;
            background: #2563eb;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            transition: background 0.2s;
        }
        .button:hover {
            background: #1d4ed8;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">${icon}</div>
        <h1>${isSuccess ? 'Erfolgreich bestätigt!' : 'Ein Fehler ist aufgetreten'}</h1>
        <p>${message}</p>
        <a href="/" class="button">Zurück zur Startseite</a>
    </div>
</body>
</html>
  `;
}

// POST Handler - Subscribe to newsletter
export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(rateLimit.resetIn / 60000);
      return NextResponse.json(
        {
          success: false,
          message: `Zu viele Anfragen. Bitte versuchen Sie es in ${minutes} Minuten erneut.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000)),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = newsletterSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      
      return NextResponse.json(
        {
          success: false,
          message: 'Validierungsfehler',
          errors,
        },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Check for duplicates
    const existing = await getNewsletterEntryByEmail(email);

    if (existing) {
      if (existing.confirmed) {
        return NextResponse.json(
          {
            success: true,
            message: 'Sie sind bereits für unseren Newsletter angemeldet.',
          },
          { status: 200 }
        );
      } else {
        // Resend confirmation email if not confirmed yet
        if (existing.confirmation_token) {
          await sendConfirmationEmail(email, existing.confirmation_token);
        }
        return NextResponse.json(
          {
            success: true,
            message: 'Bestätigungs-E-Mail wurde erneut gesendet. Bitte überprüfen Sie Ihren Posteingang.',
          },
          { status: 200 }
        );
      }
    }

    // Create new subscription with tokens
    const confirmationToken = generateToken(32);
    const unsubscribeToken = generateToken(32);
    
    const entry = await createNewsletterEntry({
      email,
      confirmed: false,
      confirmation_token: confirmationToken,
      unsubscribe_token: unsubscribeToken,
      ip_address: clientIP,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    if (!entry) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        },
        { status: 500 }
      );
    }

    // Send confirmation email
    const emailSent = await sendConfirmationEmail(email, confirmationToken);

    if (!emailSent) {
      return NextResponse.json(
        {
          success: false,
          message: 'E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Bitte bestätigen Sie Ihre Anmeldung über den Link in der E-Mail, die wir Ihnen gesendet haben.',
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    // Handle specific error for duplicate email
    if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
      return NextResponse.json(
        {
          success: true,
          message: 'Sie sind bereits für unseren Newsletter angemeldet.',
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
      },
      { status: 500 }
    );
  }
}

// GET Handler - Confirm subscription
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return new Response(getSuccessPageHtml('Ungültiger Bestätigungslink. Bitte versuchen Sie es erneut.', false), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const subscription = await getNewsletterEntryByConfirmationToken(token);

    if (!subscription) {
      return new Response(getSuccessPageHtml('Dieser Bestätigungslink ist ungültig oder bereits abgelaufen.', false), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (subscription.confirmed) {
      return new Response(getSuccessPageHtml('Ihre E-Mail-Adresse wurde bereits bestätigt. Sie sind für unseren Newsletter angemeldet.'), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Confirm subscription
    const confirmed = await confirmNewsletterEntry(token);

    if (!confirmed) {
      return new Response(getSuccessPageHtml('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.', false), {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Optional: Send welcome email
    console.log(`Newsletter subscription confirmed: ${subscription.email}`);

    return new Response(getSuccessPageHtml('Vielen Dank! Ihre E-Mail-Adresse wurde bestätigt. Sie erhalten ab jetzt unseren Newsletter.'), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Newsletter confirmation error:', error);
    return new Response(getSuccessPageHtml('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
