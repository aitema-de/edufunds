/**
 * Zod-Schemata für den automatisch generierten Newsletter.
 *
 * - `llmDraftSchema`  : der vom LLM erzeugte redaktionelle Teil (Editorial,
 *                       Tipp, Insight, News). Programme erzeugt das LLM NICHT —
 *                       die kommen deterministisch aus dem Förderkatalog
 *                       (siehe content-collector.ts), um Halluzinationen von
 *                       Programmnamen/Fördergebern/Fristen auszuschließen.
 * - `newsletterDataSchema` : die vollständige Newsletter-Datenstruktur, wie sie
 *                       `generateNewsletter()` (lib/newsletter.ts) erwartet.
 */

import { z } from 'zod';
import type { NewsletterData } from '@/lib/newsletter';

export const programSchema = z.object({
  name: z.string().min(1),
  funder: z.string().min(1),
  deadline: z.string().min(1),
  targetGroup: z.string().min(1),
  description: z.string().min(1),
  url: z.string().min(1),
});

export const newsItemSchema = z.object({
  text: z.string().min(1),
  url: z.string().optional(),
});

/**
 * Der redaktionelle Teil, den das LLM liefert. Bewusst eng: nur Text, keine
 * Programme, keine erfundenen externen Links (URLs nur edufunds.org-intern
 * oder weglassen — siehe Prompt in generate-draft.ts).
 */
export const llmDraftSchema = z.object({
  leadTitle: z.string().min(3).max(120),
  // Persönlicher Brief der Macher — bewusst längere Mindestlänge.
  leadContent: z.string().min(120),
  tipTitle: z.string().min(3).max(120),
  tipContent: z.string().min(40),
  insightCategory: z.string().min(2).max(40),
  insightReadTime: z.number().int().min(1).max(15),
  insightTitle: z.string().min(3).max(140),
  insightContent: z.string().min(80),
  insightCtaText: z.string().max(60).optional().default(''),
  insightCtaUrl: z.string().optional().default(''),
  newsItems: z.array(newsItemSchema).min(2).max(5),
});

export type LlmDraft = z.infer<typeof llmDraftSchema>;

/**
 * Vollständige NewsletterData-Validierung (Editorial + Programme + Meta).
 * `satisfies` stellt sicher, dass das Schema zur Laufzeitstruktur passt, die
 * generateNewsletter() konsumiert.
 */
export const newsletterDataSchema = z.object({
  issueNumber: z.string().min(1),
  issueDate: z.string().min(1),
  leadTitle: z.string().min(1),
  leadContent: z.string().min(1),
  signature: z.string().optional(),
  programs: z.array(programSchema).min(1),
  tipTitle: z.string().min(1),
  tipContent: z.string().min(1),
  insightCategory: z.string().min(1),
  insightReadTime: z.number().int().min(1),
  insightTitle: z.string().min(1),
  insightContent: z.string().min(1),
  insightCtaText: z.string().optional(),
  insightCtaUrl: z.string().optional(),
  newsItems: z.array(newsItemSchema),
  year: z.number().int(),
});

// Typprüfung: das Schema deckt genau NewsletterData ab.
export type NewsletterDataValidated = z.infer<typeof newsletterDataSchema>;
const _typecheck: (d: NewsletterDataValidated) => NewsletterData = (d) => d;
void _typecheck;
