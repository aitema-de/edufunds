export const dynamic = 'force-static';

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { 
  getConfirmedNewsletterEntries, 
  generateToken 
} from '@/lib/db';
import { 
  generateNewsletter, 
  NewsletterData,
  sampleNewsletterData 
} from '@/lib/newsletter';

/**
 * Newsletter Send API
 * 
 * POST /api/newsletter/send
 * 
 * Sends a newsletter to all confirmed subscribers.
 * Requires admin authorization via API key.
 * 
 * Body: {
 *   subject?: string;
 *   data?: NewsletterData;  // Optional, uses sample data if not provided
 *   test?: boolean;         // If true, only sends to test addresses
 *   testEmails?: string[];  // Test email addresses
 * }
 * 
 * Headers: {
 *   'X-Admin-Key': string;  // Admin API key
 * }
 */

// Rate limiting for send endpoint
const SEND_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const SEND_RATE_LIMIT_MAX = 10; // Max 10 sends per hour

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

const getRateLimitStore = () => {
  if (!(global as any).__newsletterSendRateLimit) {
    (global as any).__newsletterSendRateLimit = new Map<string, RateLimitEntry>();
  }
  return (global as any).__newsletterSendRateLimit as Map<string, RateLimitEntry>;
};

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const store = getRateLimitStore();
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) {
    store.set(ip, { count: 1, firstRequest: now });
    return { allowed: true, remaining: SEND_RATE_LIMIT_MAX - 1, resetIn: SEND_RATE_LIMIT_WINDOW };
  }

  if (now - entry.firstRequest > SEND_RATE_LIMIT_WINDOW) {
    store.set(ip, { count: 1, firstRequest: now });
    return { allowed: true, remaining: SEND_RATE_LIMIT_MAX - 1, resetIn: SEND_RATE_LIMIT_WINDOW };
  }

  if (entry.count >= SEND_RATE_LIMIT_MAX) {
    const resetIn = SEND_RATE_LIMIT_WINDOW - (now - entry.firstRequest);
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.count++;
  store.set(ip, entry);
  return { allowed: true, remaining: SEND_RATE_LIMIT_MAX - entry.count, resetIn: SEND_RATE_LIMIT_WINDOW - (now - entry.firstRequest) };
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
  
  return 'unknown';
}

function verifyAdminKey(request: Request): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const expectedKey = process.env.NEWSLETTER_ADMIN_KEY;
  
  if (!expectedKey) {
    console.error('[Newsletter Send] NEWSLETTER_ADMIN_KEY not configured');
    return false;
  }
  
  return adminKey === expectedKey;
}

interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

export async function POST(request: Request) {
  try {
    // Verify admin key
    if (!verifyAdminKey(request)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unauthorized. Invalid or missing admin key.' 
        },
        { status: 401 }
      );
    }

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(rateLimit.resetIn / 60000);
      return NextResponse.json(
        {
          success: false,
          message: `Zu viele Sendeversuche. Bitte warten Sie ${minutes} Minuten.`,
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      subject: customSubject, 
      data: customData,
      test = false,
      testEmails = []
    } = body;

    // Check Resend API key
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Resend API key not configured' 
        },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    // Get subscribers
    let subscribers: { email: string; unsubscribe_token: string }[] = [];
    
    if (test && testEmails.length > 0) {
      // Use test emails
      subscribers = testEmails.map((email: string) => ({
        email,
        unsubscribe_token: generateToken(32)
      }));
    } else {
      // Get all confirmed subscribers from database
      const entries = await getConfirmedNewsletterEntries();
      subscribers = entries.map(e => ({
        email: e.email,
        unsubscribe_token: e.unsubscribe_token
      }));
    }

    if (subscribers.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Keine Empfänger gefunden' 
        },
        { status: 400 }
      );
    }

    // Prepare newsletter data
    const newsletterData: NewsletterData = customData || sampleNewsletterData;
    
    // Generate base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edufunds.org';

    // Send to each subscriber
    const results: SendResult[] = [];
    const batchSize = 10; // Resend recommends batching
    
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (subscriber) => {
        try {
          // Generate personalized newsletter with unsubscribe link
          const { html, text, subject } = generateNewsletter(
            newsletterData,
            baseUrl,
            subscriber.unsubscribe_token
          );

          const { data, error } = await resend.emails.send({
            from: process.env.FROM_EMAIL || 'EduFunds <newsletter@edufunds.org>',
            to: subscriber.email,
            subject: customSubject || subject,
            html,
            text,
            replyTo: process.env.ADMIN_EMAIL || 'office@aitema.de',
            headers: {
              'List-Unsubscribe': `<${baseUrl}/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}>`,
              'Precedence': 'bulk'
            }
          });

          if (error) {
            console.error(`[Newsletter Send] Failed to send to ${subscriber.email}:`, error);
            return { email: subscriber.email, success: false, error: error.message };
          }

          console.log(`[Newsletter Send] Sent to ${subscriber.email}, ID: ${data?.id}`);
          return { email: subscriber.email, success: true };
        } catch (error) {
          console.error(`[Newsletter Send] Exception for ${subscriber.email}:`, error);
          return { 
            email: subscriber.email, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate stats
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Newsletter versendet: ${successful} erfolgreich, ${failed} fehlgeschlagen`,
      stats: {
        total: subscribers.length,
        successful,
        failed,
        test
      },
      results: failed > 0 ? results.filter(r => !r.success) : undefined
    });

  } catch (error) {
    console.error('[Newsletter Send] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Ein unerwarteter Fehler ist aufgetreten',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/newsletter/send
 * 
 * Returns newsletter preview and subscriber count.
 * Requires admin authorization.
 */
export async function GET(request: Request) {
  try {
    // Verify admin key
    if (!verifyAdminKey(request)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unauthorized. Invalid or missing admin key.' 
        },
        { status: 401 }
      );
    }

    // Get subscriber count
    const subscribers = await getConfirmedNewsletterEntries();
    
    // Generate preview
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edufunds.org';
    const { html, text, subject } = generateNewsletter(
      sampleNewsletterData,
      baseUrl,
      'sample-token-preview'
    );

    return NextResponse.json({
      success: true,
      stats: {
        confirmedSubscribers: subscribers.length,
        lastSubscriber: subscribers.length > 0 ? subscribers[subscribers.length - 1].email : null
      },
      preview: {
        subject,
        html: html.substring(0, 2000) + '...',
        text: text.substring(0, 1000) + '...'
      }
    });

  } catch (error) {
    console.error('[Newsletter Send] Preview error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Ein Fehler ist aufgetreten',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
