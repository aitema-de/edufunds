# API Schema Definitionen (Zod)

> Diese Datei enthält die Zod-Schema-Definitionen für alle API-Endpunkte.
> Kann direkt in `/lib/validation/schemas.ts` kopiert werden.

```typescript
import { z } from 'zod';

// ============================================================================
// Newsletter Schema
// ============================================================================

export const newsletterSchema = z.object({
  email: z
    .string()
    .min(1, 'E-Mail ist erforderlich')
    .email('Ungültige E-Mail-Adresse')
    .transform((email) => email.toLowerCase().trim()),
  name: z
    .string()
    .max(100, 'Name darf maximal 100 Zeichen haben')
    .optional()
    .transform((name) => name?.trim() || undefined),
  source: z
    .enum(['homepage', 'footer', 'popup', 'blog'])
    .default('footer'),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

// ============================================================================
// Kontakt Schema
// ============================================================================

export const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Name muss mindestens 2 Zeichen haben')
    .max(100, 'Name darf maximal 100 Zeichen haben')
    .transform((name) => name.trim()),
  email: z
    .string()
    .min(1, 'E-Mail ist erforderlich')
    .email('Ungültige E-Mail-Adresse')
    .transform((email) => email.toLowerCase().trim()),
  subject: z
    .string()
    .min(5, 'Betreff muss mindestens 5 Zeichen haben')
    .max(200, 'Betreff darf maximal 200 Zeichen haben')
    .transform((subject) => subject.trim()),
  message: z
    .string()
    .min(20, 'Nachricht muss mindestens 20 Zeichen haben')
    .max(5000, 'Nachricht darf maximal 5000 Zeichen haben')
    .transform((message) => message.trim()),
  honeypot: z
    .string()
    .max(0, 'Spam erkannt')
    .optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

// ============================================================================
// KI-Assistant Schema
// ============================================================================

export const projektDatenSchema = z.object({
  schulname: z.string().min(2).max(200),
  projekttitel: z.string().min(3).max(300),
  kurzbeschreibung: z.string().min(20).max(2000),
  ziele: z.string().min(10).max(2000),
  zielgruppe: z.string().min(5).max(500),
  zeitraum: z.string().min(5).max(100),
  hauptaktivitaeten: z.string().min(10).max(2000),
  ergebnisse: z.string().max(2000).optional(),
  nachhaltigkeit: z.string().max(2000).optional(),
  foerderbetrag: z.string().regex(/^\d+$/, 'Nur Zahlen erlaubt'),
});

export const assistantSchema = z.object({
  programId: z.string().uuid('Ungültige Programm-ID'),
  projektDaten: projektDatenSchema,
});

export type AssistantInput = z.infer<typeof assistantSchema>;
export type ProjektDaten = z.infer<typeof projektDatenSchema>;

// ============================================================================
// PDF Generation Schema
// ============================================================================

export const pdfGenerationSchema = z.object({
  content: z.string().min(1, 'HTML-Inhalt ist erforderlich'),
  filename: z
    .string()
    .min(1)
    .max(200)
    .regex(/\.(pdf|doc|docx)$/i, 'Dateiname muss auf .pdf enden')
    .default('Foerderantrag.pdf'),
  format: z.enum(['A4', 'A3', 'Letter']).default('A4'),
  margin: z.object({
    top: z.string().default('20mm'),
    right: z.string().default('20mm'),
    bottom: z.string().default('20mm'),
    left: z.string().default('20mm'),
  }).optional(),
});

export type PdfGenerationInput = z.infer<typeof pdfGenerationSchema>;

// ============================================================================
// Programs Query Schema
// ============================================================================

export const programsQuerySchema = z.object({
  category: z.string().optional(),
  foerdergeberTyp: z.enum(['bund', 'land', 'stiftung', 'eu', 'sonstige']).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type ProgramsQuery = z.infer<typeof programsQuerySchema>;

// ============================================================================
// API Response Schemas
// ============================================================================

export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string().optional(),
    data: dataSchema,
  });

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string(),
  fields: z.array(z.string()).optional(),
  retryAfter: z.number().optional(),
});

// ============================================================================
// Database Schemas (für Referenz)
// ============================================================================

export const newsletterEntrySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  subscribedAt: z.date(),
  source: z.string(),
  confirmed: z.boolean(),
  confirmationToken: z.string().nullable(),
  ipAddress: z.string(),
  userAgent: z.string(),
});

export const contactRequestSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  subject: z.string(),
  message: z.string(),
  submittedAt: z.date(),
  status: z.enum(['new', 'in_progress', 'answered', 'spam']),
  ipAddress: z.string(),
  userAgent: z.string(),
});

export type NewsletterEntry = z.infer<typeof newsletterEntrySchema>;
export type ContactRequest = z.infer<typeof contactRequestSchema>;
```

## Installation

```bash
npm install zod
```

## Verwendung in API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { newsletterSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = newsletterSchema.parse(body);
    
    // Verarbeitung...
    
    return NextResponse.json({
      success: true,
      message: 'Erfolgreich angemeldet',
      data: { id: '...', email: validated.email }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validierungsfehler',
        code: 'VALIDATION_ERROR',
        fields: error.errors.map(e => e.path.join('.'))
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Interner Serverfehler',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
```
