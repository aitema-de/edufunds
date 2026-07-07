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
import { DEFAULT_ABOUT_BOX, type NewsletterData, type NewsletterStat } from '@/lib/newsletter';
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

function buildSystemPrompt(isKickoff: boolean): string {
  return [
    'Du schreibst den monatlichen EduFunds-Newsletter — und zwar als die Menschen,',
    'die hinter EduFunds stehen: ein kleines Team aus Berlin (aitema GmbH), das',
    'Schulen, Fördervereinen und Lehrkräften hilft, passende Fördermittel zu finden',
    'und Anträge mit KI-Unterstützung zu schreiben. Ihr seid keine anonyme Redaktion,',
    'sondern echte Menschen, die ihr Produkt und ihre Leserinnen kennen.',
    isKickoff
      ? 'Dies ist die ALLERERSTE Ausgabe — der erste Eindruck. Sie muss zünden: ' +
        'echten Mehrwert bieten und Lust machen, EduFunds auszuprobieren. Kein Hype, ' +
        'sondern Substanz und Haltung.'
      : '',
    '',
    'Schreibe auf Deutsch, mit korrekten Umlauten (ä, ö, ü, ß) — niemals ae/oe/ue/ss.',
    'Grundton: warm, persönlich, menschlich, ehrlich, auf Augenhöhe. Niemals',
    'werblich-aufgesetzt, kein Marketing-Sprech, keine Übertreibungen.',
    '',
    'WICHTIGE REGELN:',
    '- Erfinde KEINE Förderprogramme, Fördergeber, Geldbeträge, Fristen oder',
    '  Statistiken. Beziehe dich nur auf die unten gelieferten Fakten.',
    '- Erfinde KEINE Links/Pfade. Als einzige URL ist die öffentliche',
    '  Förderdatenbank https://app.edufunds.org/foerderprogramme erlaubt',
    '  (oder gar keine). NIEMALS Programm-Slugs oder andere Pfade erfinden —',
    '  Programm-Links werden separat automatisch gesetzt.',
    '- Keine leeren Floskeln ("spannende Neuigkeiten", "in der heutigen Zeit").',
    '  Jeder Satz trägt etwas — sei konkret und aufrichtig.',
    '- KEIN Markdown (keine *Sternchen*, _Unterstriche_, # oder `Backticks`).',
    '  Reiner Fließtext, wird direkt als HTML gerendert.',
    '- Antworte AUSSCHLIESSLICH als JSON-Objekt nach dem vorgegebenen Schema.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Fakten-Brief für die Gründungsgeschichte der Erstausgabe (gegen Halluzination). */
const EDUFUNDS_STORY_FACTS = [
  '- WAS: EduFunds ist ein Angebot der aitema GmbH (Berlin). Es bündelt einen',
  '  sorgfältig gepflegten Katalog von Förderprogrammen für Bildung und einen',
  '  KI-Antragsassistenten, der beim Schreiben von Förderanträgen hilft.',
  '- WARUM: Die Förderlandschaft ist riesig und unübersichtlich — hunderte Programme,',
  '  kryptische Richtlinien, enge Fristen. Anträge kosten neben dem Schul- und',
  '  Vereinsalltag enorm viel Zeit und Nerven. Zu oft scheitern gute Projekte nicht',
  '  an der Idee, sondern an der Bürokratie. Genau das wollen wir ändern.',
  '- ANTRIEB: Wir finden, Bildung sollte nicht an Formularen scheitern. Gute Ideen',
  '  verdienen eine faire Chance auf Förderung — unabhängig davon, ob eine Schule',
  '  eine eigene Verwaltungskraft hat oder nicht.',
  '- NUTZEN SCHULEN & FÖRDERVEREINE: in Minuten statt Wochen sehen, welche Förderung',
  '  zum eigenen Vorhaben passt; mehr passende Anträge, weniger verpasste Fristen.',
  '- NUTZEN LEHRKRÄFTE & ANTRAGSTELLENDE: ein strukturierter Antragsentwurf an die',
  '  Hand, weniger Frust mit Formularen, mehr Zeit für das Wesentliche — die Kinder.',
];

function buildUserPrompt(
  monthLabel: string,
  content: CollectedContent,
  impulse: string,
  isKickoff: boolean
): string {
  const ctx = content.catalogContext;
  const lines = [
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
    'WICHTIG: "leadTitle" ist eine kurze, einladende SCHLAGZEILE zum Thema/zur',
    'Stimmung der Ausgabe — KEINE Anrede, niemals mit "Liebe …" beginnen und nicht',
    'mit Komma enden. Die Anrede (z.B. "Liebe Leserinnen und Leser,") ist der ERSTE',
    'Satz von "leadContent", NICHT der Titel.',
    isKickoff
      ? 'Da dies die ALLERERSTE Ausgabe ist: 5 bis 7 Sätze, heisse die Leserinnen ' +
        'herzlich willkommen und mache neugierig — die ausführliche Geschichte folgt ' +
        'separat im Feld "introStory", wiederhole sie hier NICHT im Detail.'
      : '3 bis 5 Sätze.',
    'Schlage am Ende eine sanfte Brücke zu den Förderungen weiter unten.',
    'KEINE Grußformel und KEINE Unterschrift im Text — die wird separat angefügt.',
  ];

  if (isKickoff) {
    lines.push(
      '',
      '── ZUR GRÜNDUNGSGESCHICHTE "introStory" (nur diese Erstausgabe) ──',
      'Erzähle, wofür EduFunds steht — warm, ehrlich, mit Haltung, in der Wir-Form.',
      'Erfinde KEINE konkreten Zeitangaben ("vor zwei Jahren"), Gründungsdaten,',
      'Teamgrößen oder persönlichen Anekdoten — nur die folgenden Fakten sind belegt.',
      'Stütze dich AUSSCHLIESSLICH auf diese Fakten (nichts dazuerfinden, keine Zahlen erfinden):',
      ...EDUFUNDS_STORY_FACTS,
      '"lead": 1-2 Absätze (mit \\n\\n getrennt) Erzähltext: Was ist EduFunds, und warum',
      'haben wir es gebaut? Mach das Problem greifbar (gute Idee, aber die Bürokratie ...).',
      '"points": GENAU 3 Wertversprechen-Punkte, je {label, text}:',
      '  1. label "Was uns antreibt"            — eure Haltung/Motivation (2-3 Sätze)',
      '  2. label "Was Schulen & Vereine davon haben"  — konkreter Nutzen (2-3 Sätze)',
      '  3. label "Was Antragstellende davon haben"     — konkreter Nutzen für Lehrkräfte/Ehrenamt (2-3 Sätze)'
    );
  }

  lines.push(
    '',
    'Liefere ein JSON-Objekt mit GENAU diesen Feldern:',
    '{',
    '  "leadTitle": string,        // kurze, einladende SCHLAGZEILE (max. ~70 Zeichen); KEINE Anrede, kein "Liebe …", kein Clickbait',
    `  "leadContent": string,      // der persönliche Brief (Anrede + ${isKickoff ? '5-7' : '3-5'} Sätze, Wir-Form, menschlich); Absätze mit \\n trennen`,
  );
  if (isKickoff) {
    lines.push(
      '  "introStory": {             // Gründungsgeschichte (siehe oben), NUR diese Ausgabe',
      '    "lead": string,           // 1-2 Absätze Erzähltext, Absätze mit \\n\\n getrennt',
      '    "points": [ { "label": string, "text": string }, … ]  // genau 3 Punkte wie oben',
      '  },'
    );
  }
  lines.push(
    '  "tipTitle": string,         // Titel eines konkreten Praxis-Tipps zum Antragschreiben',
    '  "tipContent": string,       // 3-5 Sätze umsetzbarer Tipp (z.B. Projektskizze, Finanzplan, Wirkungsziele)',
    '  "insightCategory": string,  // kurzes Label, z.B. "Hintergrund", "Strategie", "Praxis"',
    '  "insightReadTime": number,  // geschätzte Lesezeit in Minuten (1-6)',
    '  "insightTitle": string,     // Titel eines längeren Ratgeber-Abschnitts',
    '  "insightContent": string,   // 2-3 Absätze (mit \\n\\n getrennt) fundierter Hintergrund zu Bildungsförderung',
    '  "insightCtaText": string,   // Button-Text, z.B. "Passende Förderungen finden" (oder "")',
    '  "insightCtaUrl": string,    // nur https://app.edufunds.org/foerderprogramme oder ""',
    '  "newsItems": [ { "text": string, "url"?: string } ]  // 3-4 kurze, plausible Kurzmeldungen aus der Bildungsförderung; url NUR https://app.edufunds.org/foerderprogramme oder weglassen (keine erfundenen Pfade, kein <a>-Tag im text)',
    '}',
    '',
    'Gib NUR das JSON aus, ohne Markdown-Codeblock.'
  );

  return lines.join('\n');
}

/**
 * "EduFunds in Zahlen"-Leiste aus echten Katalogwerten (keine erfundenen Zahlen).
 * Erscheint in jeder Ausgabe und unterstreicht Substanz/Glaubwürdigkeit.
 */
function buildStats(content: CollectedContent): NewsletterStat[] {
  const { totalActive, totalKiSuitable } = content.catalogContext;
  return [
    { value: String(totalActive), label: 'Förderprogramme im Blick' },
    { value: String(totalKiSuitable), label: 'davon für KI-Anträge vorbereitet' },
    { value: 'Minuten', label: 'bis zum Antragsentwurf statt Wochen' },
  ];
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
    introStory: d.introStory
      ? {
          lead: stripMd(d.introStory.lead),
          points: d.introStory.points.map((p) => ({
            label: stripMd(p.label),
            text: stripMd(p.text),
          })),
        }
      : undefined,
    tipTitle: stripMd(d.tipTitle),
    tipContent: stripMd(d.tipContent),
    insightTitle: stripMd(d.insightTitle),
    insightContent: stripMd(d.insightContent),
    newsItems: d.newsItems.map((n) => ({ ...n, text: stripMd(n.text) })),
  };
}

const SALUTATION_RE = /^\s*(liebe|hallo|moin|servus|guten\s+(tag|morgen|abend)|hey|hi)\b/i;

/** Erkennt, ob ein String wie eine Anrede aussieht (statt einer Schlagzeile). */
function looksLikeSalutation(s: string): boolean {
  return SALUTATION_RE.test(s) || /,\s*$/.test(s.trim());
}

/**
 * Sicherung gegen ein häufiges LLM-Muster: die Anrede landet als Titel ("Liebe …,")
 * und der Brieftext beginnt klein ohne Anrede. Wir verschieben die Anrede dann an
 * den Briefanfang und setzen einen sauberen, neutralen Titel. Schützt vor allem den
 * automatischen Cron-Pfad; im Admin ist der Titel ohnehin editierbar.
 */
function fixSalutationTitle(d: LlmDraft, isKickoff: boolean): LlmDraft {
  if (!looksLikeSalutation(d.leadTitle)) return d;
  const salutation = d.leadTitle.trim();
  let leadContent = d.leadContent;
  if (!SALUTATION_RE.test(leadContent)) {
    leadContent = `${salutation}\n\n${leadContent.trim()}`;
  }
  return {
    ...d,
    leadTitle: isKickoff ? 'Schön, dass Sie da sind!' : 'Neues aus der Förderwelt',
    leadContent,
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
  /**
   * Erstausgabe-Modus (ausführliche Gründungsgeschichte statt kompakter Box).
   * Default: automatisch true bei issueNumber === 1.
   */
  isKickoff?: boolean;
}

export async function generateNewsletterDraft(
  opts: GenerateDraftOptions
): Promise<GeneratedDraft> {
  const now = opts.now ?? new Date();
  const monthLabel = `${MONTHS_DE[now.getMonth()]} ${now.getFullYear()}`;
  const isKickoff = opts.isKickoff ?? opts.issueNumber === 1;

  const content = collectNewsletterContent({
    count: opts.programCount ?? 3,
    excludeIds: opts.excludeProgramIds ?? [],
    baseUrl: opts.baseUrl,
  });

  // Rotierender Impuls → jeder Brief anders gefärbt, gleiche Stimme.
  const impulse =
    LETTER_IMPULSE[(opts.issueNumber + now.getMonth()) % LETTER_IMPULSE.length];

  // Kickoff braucht mehr Spielraum (zusätzliche Gründungsgeschichte).
  const { value } = await generateJson<unknown>(
    MODEL_PIPELINE,
    buildSystemPrompt(isKickoff),
    buildUserPrompt(monthLabel, content, impulse, isKickoff),
    { maxTokens: isKickoff ? 3000 : 2000 }
  );

  // LLM-Output streng validieren (Retry steckt bereits in generateJson).
  const draft: LlmDraft = fixSalutationTitle(
    stripMarkdown(llmDraftSchema.parse(value)),
    isKickoff
  );

  const data: NewsletterData = {
    issueNumber: `Ausgabe #${opts.issueNumber}`,
    issueDate: now.toISOString().split('T')[0],
    leadTitle: draft.leadTitle,
    leadContent: draft.leadContent,
    signature: process.env.NEWSLETTER_SIGNATURE || 'Kolja & das EduFunds-Team',
    isKickoff,
    stats: buildStats(content),
    // Erstausgabe: ausführliche Geschichte (vom LLM). Folgeausgaben: kompakte Box.
    introStory: isKickoff ? draft.introStory : undefined,
    aboutBox: isKickoff ? undefined : DEFAULT_ABOUT_BOX,
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
