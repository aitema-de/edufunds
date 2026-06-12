/**
 * LLM-Erstellung eines Newsletter-Entwurfs.
 *
 * Arbeitsteilung (bewusst):
 *  - Programme   → deterministisch aus dem Katalog (content-collector.ts).
 *  - Redaktion   → LLM (Editorial-Intro, Praxis-Tipp, Insight, News).
 * So können Programmnamen/Fördergeber/Fristen nicht halluziniert werden; der LLM
 * schreibt nur frei formulierbaren redaktionellen Text und darf sich dabei auf
 * die real ausgewählten Programme beziehen.
 */

import { generateJson, MODEL_PIPELINE } from '@/lib/wizard/llm';
import type { NewsletterData } from '@/lib/newsletter';
import {
  collectNewsletterContent,
  type CollectedContent,
} from './content-collector';
import { llmDraftSchema, newsletterDataSchema, type LlmDraft } from './schema';

const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

/**
 * Rotierende "Impulse" für die persönliche Einleitung. Sorgen dafür, dass jeder
 * Brief eine andere Färbung bekommt — gleiche Stimme, anderer Einstieg/Fokus.
 */
const LETTER_IMPULSE = [
  'Erzähle von einer kleinen, konkreten Beobachtung aus dem Schul- oder Vereinsalltag, die euch diesen Monat berührt oder zum Nachdenken gebracht hat.',
  'Sei ehrlich darüber, wie mühsam Förderanträge sein können — und warum es sich trotzdem lohnt. Sprich den Leserinnen Mut zu.',
  'Bedanke dich aufrichtig bei den engagierten Lehrkräften und Ehrenamtlichen, die neben dem Alltag noch Förderanträge stemmen.',
  'Greife die Jahreszeit bzw. den Monat auf und was er gerade für Schulen und Fördervereine bedeutet (Schuljahresrhythmus, Haushaltsplanung, Ferien, Projektstart).',
  'Ermutige dazu, auch kleinere Förderungen nicht zu unterschätzen — viele kleine Bausteine ergeben großartige Projekte.',
  'Teile einen kurzen Gedanken dazu, warum ihr EduFunds gebaut habt und was euch an guter Schulförderung wirklich am Herzen liegt.',
  'Nimm Bezug auf eine Rückmeldung oder eine Frage, die euch aus der Community erreicht haben könnte, und antworte persönlich darauf.',
  'Beschreibe, was sich seit der letzten Ausgabe getan hat und worauf ihr euch im kommenden Monat freut.',
];

function buildSystemPrompt(): string {
  return [
    'Du schreibst den monatlichen EduFunds-Newsletter — und zwar als die Menschen,',
    'die hinter EduFunds stehen: ein kleines Team aus Berlin (aitema GmbH), das',
    'Schulen, Fördervereinen und Lehrkräften hilft, passende Fördermittel zu finden',
    'und Anträge mit KI-Unterstützung zu schreiben. Ihr seid keine anonyme Redaktion,',
    'sondern echte Menschen, die ihr Produkt und ihre Leserinnen kennen.',
    '',
    'Schreibe auf Deutsch, mit korrekten Umlauten (ä, ö, ü, ß) — niemals ae/oe/ue/ss.',
    'Grundton: warm, persönlich, menschlich, ehrlich, auf Augenhöhe. Niemals',
    'werblich-aufgesetzt, kein Marketing-Sprech, keine Übertreibungen.',
    '',
    'WICHTIGE REGELN:',
    '- Erfinde KEINE Förderprogramme, Fördergeber, Geldbeträge, Fristen oder',
    '  Statistiken. Beziehe dich nur auf die unten gelieferten Fakten.',
    '- Erfinde KEINE externen Links. URLs in News-Items dürfen NUR auf',
    '  https://edufunds.org/... zeigen oder ganz weggelassen werden.',
    '- Keine leeren Floskeln ("spannende Neuigkeiten", "in der heutigen Zeit").',
    '  Jeder Satz trägt etwas — sei konkret und aufrichtig.',
    '- KEIN Markdown (keine *Sternchen*, _Unterstriche_, # oder `Backticks`).',
    '  Reiner Fließtext, wird direkt als HTML gerendert.',
    '- Antworte AUSSCHLIESSLICH als JSON-Objekt nach dem vorgegebenen Schema.',
  ].join('\n');
}

function buildUserPrompt(
  monthLabel: string,
  content: CollectedContent,
  impulse: string
): string {
  const ctx = content.catalogContext;
  return [
    `Schreibe die EduFunds-Newsletter-Ausgabe für ${monthLabel}.`,
    '',
    'KONTEXT (real, gepflegter EduFunds-Förderkatalog):',
    `- Aktive Förderprogramme im Katalog: ${ctx.totalActive}`,
    `- Davon für KI-gestützte Anträge geeignet: ${ctx.totalKiSuitable}`,
    `- Häufigste Kategorien: ${ctx.topCategories.map((c) => `${c.kategorie} (${c.count})`).join(', ')}`,
    '',
    'In DIESER Ausgabe vorgestellte Programme (vom System gewählt, NICHT änderbar):',
    ...content.catalogContext.selectedSummaries.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    '── ZUR PERSÖNLICHEN EINLEITUNG (das Herzstück) ──',
    'Schreibe einen kurzen, echten Brief an die Leserinnen und Leser, in der Wir-Form,',
    'als die Menschen hinter EduFunds. Er soll sich anfühlen wie von Hand geschrieben:',
    'nahbar, warm, ehrlich — als nähme sich jemand kurz Zeit, um persönlich Hallo zu sagen.',
    `Impuls für DIESE Ausgabe (nur als Färbung, nicht wörtlich übernehmen): ${impulse}`,
    'Beginne mit einer Anrede (z.B. "Liebe Leserinnen und Leser," oder etwas Wärmerem).',
    '3 bis 5 Sätze. Schlage am Ende eine sanfte Brücke zu den Förderungen weiter unten.',
    'KEINE Grußformel und KEINE Unterschrift im Text — die wird separat angefügt.',
    '',
    'Liefere ein JSON-Objekt mit GENAU diesen Feldern:',
    '{',
    '  "leadTitle": string,        // warme, einladende Überschrift des Briefes (max. ~70 Zeichen), kein Clickbait',
    '  "leadContent": string,      // der persönliche Brief (Anrede + 3-5 Sätze, Wir-Form, menschlich); Absätze mit \\n trennen',
    '  "tipTitle": string,         // Titel eines konkreten Praxis-Tipps zum Antragschreiben',
    '  "tipContent": string,       // 3-5 Sätze umsetzbarer Tipp (z.B. Projektskizze, Finanzplan, Wirkungsziele)',
    '  "insightCategory": string,  // kurzes Label, z.B. "Hintergrund", "Strategie", "Praxis"',
    '  "insightReadTime": number,  // geschätzte Lesezeit in Minuten (1-6)',
    '  "insightTitle": string,     // Titel eines längeren Ratgeber-Abschnitts',
    '  "insightContent": string,   // 2-3 Absätze (mit \\n\\n getrennt) fundierter Hintergrund zu Bildungsförderung',
    '  "insightCtaText": string,   // Button-Text, z.B. "Passende Förderungen finden" (oder "")',
    '  "insightCtaUrl": string,    // nur https://edufunds.org/... oder ""',
    '  "newsItems": [ { "text": string, "url"?: string } ]  // 3-4 kurze, plausible Kurzmeldungen aus der Bildungsförderung; url nur edufunds.org oder weglassen',
    '}',
    '',
    'Gib NUR das JSON aus, ohne Markdown-Codeblock.',
  ].join('\n');
}

/** Entfernt Markdown-Emphasis (**, *, __, _, `), die im HTML-Newsletter wörtlich erschiene. */
function stripMd(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function stripMarkdown(d: LlmDraft): LlmDraft {
  return {
    ...d,
    leadTitle: stripMd(d.leadTitle),
    leadContent: stripMd(d.leadContent),
    tipTitle: stripMd(d.tipTitle),
    tipContent: stripMd(d.tipContent),
    insightTitle: stripMd(d.insightTitle),
    insightContent: stripMd(d.insightContent),
    newsItems: d.newsItems.map((n) => ({ ...n, text: stripMd(n.text) })),
  };
}

export interface GeneratedDraft {
  data: NewsletterData;
  programIds: string[];
  provider: string;
}

export interface GenerateDraftOptions {
  now?: Date;
  issueNumber: number;
  excludeProgramIds?: string[];
  baseUrl?: string;
  /** Programme pro Ausgabe (Default 3). */
  programCount?: number;
}

export async function generateNewsletterDraft(
  opts: GenerateDraftOptions
): Promise<GeneratedDraft> {
  const now = opts.now ?? new Date();
  const monthLabel = `${MONTHS_DE[now.getMonth()]} ${now.getFullYear()}`;

  const content = collectNewsletterContent({
    count: opts.programCount ?? 3,
    excludeIds: opts.excludeProgramIds ?? [],
    baseUrl: opts.baseUrl,
  });

  // Rotierender Impuls → jeder Brief anders gefärbt, gleiche Stimme.
  const impulse =
    LETTER_IMPULSE[(opts.issueNumber + now.getMonth()) % LETTER_IMPULSE.length];

  const { value } = await generateJson<unknown>(
    MODEL_PIPELINE,
    buildSystemPrompt(),
    buildUserPrompt(monthLabel, content, impulse),
    { maxTokens: 2000 }
  );

  // LLM-Output streng validieren (Retry steckt bereits in generateJson).
  const draft: LlmDraft = stripMarkdown(llmDraftSchema.parse(value));

  const data: NewsletterData = {
    issueNumber: `Ausgabe #${opts.issueNumber}`,
    issueDate: now.toISOString().split('T')[0],
    leadTitle: draft.leadTitle,
    leadContent: draft.leadContent,
    signature: process.env.NEWSLETTER_SIGNATURE || 'Kolja & das EduFunds-Team',
    programs: content.programs,
    tipTitle: draft.tipTitle,
    tipContent: draft.tipContent,
    insightCategory: draft.insightCategory,
    insightReadTime: draft.insightReadTime,
    insightTitle: draft.insightTitle,
    insightContent: draft.insightContent,
    insightCtaText: draft.insightCtaText || undefined,
    insightCtaUrl: draft.insightCtaUrl || undefined,
    newsItems: draft.newsItems,
    year: now.getFullYear(),
  };

  // Vollstruktur final validieren, bevor wir sie persistieren/rendern.
  newsletterDataSchema.parse(data);

  return {
    data,
    programIds: content.programIds,
    provider: process.env.LLM_PROVIDER || 'mistral',
  };
}
