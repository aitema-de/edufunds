/**
 * Newsletter Hilfsfunktionen
 * 
 * - HTML/Plaintext Newsletter-Generierung
 * - Template-Rendering
 * - Unsubscribe-Token-Generierung
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Types
// =============================================================================

export interface Program {
  name: string;
  funder: string;
  deadline: string;
  targetGroup: string;
  description: string;
  url: string;
}

export interface NewsItem {
  text: string;
  url?: string;
}

export interface NewsletterData {
  issueNumber: string;
  issueDate: string;
  leadTitle: string;
  leadContent: string;
  programs: Program[];
  tipTitle: string;
  tipContent: string;
  insightCategory: string;
  insightReadTime: number;
  insightTitle: string;
  insightContent: string;
  insightCtaText?: string;
  insightCtaUrl?: string;
  newsItems: NewsItem[];
  year: number;
}

export interface RenderedNewsletter {
  html: string;
  text: string;
  subject: string;
}

// =============================================================================
// Template Loading
// =============================================================================

const TEMPLATES_DIR = join(process.cwd(), 'templates');

function loadTemplate(filename: string): string {
  try {
    return readFileSync(join(TEMPLATES_DIR, filename), 'utf-8');
  } catch (error) {
    console.error(`[Newsletter] Template ${filename} nicht gefunden:`, error);
    throw new Error(`Template ${filename} nicht gefunden`);
  }
}

// =============================================================================
// Template Rendering
// =============================================================================

/**
 * Simple template engine - replaces {{variable}} with values
 */
function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Renders the HTML program card
 */
function renderProgramCard(program: Program): string {
  return `
<div class="program-card">
    <div class="program-header">
        <h3 class="program-title">${escapeHtml(program.name)}</h3>
        <span class="program-deadline">${escapeHtml(program.deadline)}</span>
    </div>
    <div class="program-funder">${escapeHtml(program.funder)}</div>
    <div class="program-target">Zielgruppe: ${escapeHtml(program.targetGroup)}</div>
    <p class="program-description">${escapeHtml(program.description)}</p>
    <a href="${escapeHtml(program.url)}" class="program-cta">Zum Programm →</a>
</div>`;
}

/**
 * Renders programs for plaintext
 */
function renderProgramsText(programs: Program[]): string {
  return programs.map(p => `
${p.name}
Fördergeber: ${p.funder}
Frist: ${p.deadline}
Zielgruppe: ${p.targetGroup}

${p.description}

→ ${p.url}
`).join('\n---\n');
}

/**
 * Renders news items for HTML
 */
function renderNewsItems(items: NewsItem[]): string {
  return items.map((item, index) => {
    const bullet = ['●', '◆', '▸'][index % 3];
    const text = item.url 
      ? `${item.text.replace(/<a\s+href="([^"]+)">([^<]+)<\/a>/g, '<a href="$1" class="news-link">$2</a>')}`
      : escapeHtml(item.text);
    return `
<li class="news-item">
    <span class="news-bullet">${bullet}</span>
    <span class="news-text">${text}</span>
</li>`;
  }).join('');
}

/**
 * Renders news items for plaintext
 */
function renderNewsItemsText(items: NewsItem[]): string {
  return items.map((item, index) => {
    const text = item.text.replace(/<a\s+href="([^"]+)">([^<]+)<\/a>/g, '$2 ($1)');
    return `${index + 1}. ${text}${item.url ? `\n   ${item.url}` : ''}`;
  }).join('\n\n');
}

/**
 * Escapes HTML entities
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Formats the insight content for HTML
 */
function renderInsightContent(content: string): string {
  // Convert paragraphs
  const paragraphs = content.split('\n\n');
  return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('\n');
}

/**
 * Formats the insight content for plaintext
 */
function renderInsightContentText(content: string): string {
  return content;
}

// =============================================================================
// Newsletter Generation
// =============================================================================

/**
 * Generates the newsletter subject line
 */
export function generateSubjectLine(data: NewsletterData): string {
  return `EduFunds Newsletter ${data.issueNumber} – ${data.leadTitle.substring(0, 50)}`;
}

/**
 * Generates the full newsletter (HTML + plaintext)
 */
export function generateNewsletter(
  data: NewsletterData,
  baseUrl: string,
  unsubscribeToken: string
): RenderedNewsletter {
  // Generate unsubscribe URL
  const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
  
  // Load templates
  const htmlTemplate = loadTemplate('newsletter.html');
  const textTemplate = loadTemplate('newsletter.txt');
  
  // Format date
  const dateFormatter = new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedDate = dateFormatter.format(new Date(data.issueDate));
  
  // Render programs
  const programsHtml = data.programs.map(renderProgramCard).join('\n');
  const programsText = renderProgramsText(data.programs);
  
  // Render news items
  const newsHtml = renderNewsItems(data.newsItems);
  const newsText = renderNewsItemsText(data.newsItems);
  
  // Prepare template data
  const templateData: Record<string, string> = {
    newsletter_title: generateSubjectLine(data),
    issue_number: data.issueNumber,
    issue_date: formattedDate,
    lead_title: escapeHtml(data.leadTitle),
    lead_content: escapeHtml(data.leadContent),
    programs: programsHtml,
    tip_title: escapeHtml(data.tipTitle),
    tip_content: renderInsightContent(data.tipContent),
    insight_category: escapeHtml(data.insightCategory),
    insight_read_time: String(data.insightReadTime),
    insight_title: escapeHtml(data.insightTitle),
    insight_content: renderInsightContent(data.insightContent),
    insight_cta_text: data.insightCtaText ? escapeHtml(data.insightCtaText) : '',
    insight_cta_url: data.insightCtaUrl || '',
    news_items: newsHtml,
    unsubscribe_url: unsubscribeUrl,
    year: String(data.year)
  };
  
  // Handle conditional blocks for plaintext
  let textContent = textTemplate
    .replace(/\{\{issue_number\}\}/g, data.issueNumber)
    .replace(/\{\{issue_date\}\}/g, formattedDate)
    .replace(/\{\{lead_title\}\}/g, data.leadTitle)
    .replace(/\{\{lead_content\}\}/g, data.leadContent)
    .replace(/\{\{programs_text\}\}/g, programsText)
    .replace(/\{\{tip_title\}\}/g, data.tipTitle)
    .replace(/\{\{tip_content\}\}/g, data.tipContent)
    .replace(/\{\{insight_category\}\}/g, data.insightCategory)
    .replace(/\{\{insight_title\}\}/g, data.insightTitle)
    .replace(/\{\{insight_content\}\}/g, renderInsightContentText(data.insightContent))
    .replace(/\{\{news_items_text\}\}/g, newsText)
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
    .replace(/\{\{year\}\}/g, String(data.year));
  
  // Handle conditional CTA in plaintext
  if (data.insightCtaUrl) {
    textContent = textContent.replace(
      /\{\{#if insight_cta_url\}\}[\s\S]*?\{\{\/if\}\}/g,
      `Mehr lesen: ${data.insightCtaUrl}`
    );
  } else {
    textContent = textContent.replace(/\{\{#if insight_cta_url\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }
  
  // Render HTML
  const htmlContent = renderTemplate(htmlTemplate, templateData);
  
  // Handle conditional CTA in HTML
  let finalHtml = htmlContent;
  if (!data.insightCtaUrl) {
    finalHtml = finalHtml.replace(
      /<a href="" class="cta-button">.*?<\/a>/g,
      ''
    );
  }
  
  return {
    html: finalHtml,
    text: textContent.trim(),
    subject: generateSubjectLine(data)
  };
}

// =============================================================================
// Token Generation
// =============================================================================

/**
 * Generates a secure random token
 */
export function generateUnsubscribeToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// =============================================================================
// Sample Data for Testing
// =============================================================================

export const sampleNewsletterData: NewsletterData = {
  issueNumber: 'Ausgabe #1',
  issueDate: new Date().toISOString().split('T')[0],
  leadTitle: 'Willkommen zum ersten EduFunds Newsletter!',
  leadContent: 'Wir freuen uns, Ihnen ab sofort wöchentlich die wichtigsten Neuigkeiten aus der Welt der Schulförderung zu liefern. Entdecken Sie neue Programme, lernen Sie von bewährten Antragsstrategien und bleiben Sie immer über aktuelle Fristen informiert.',
  programs: [
    {
      name: 'MINT-Förderung 2025',
      funder: 'Bundesministerium für Bildung und Forschung (BMBF)',
      deadline: '30. März 2025',
      targetGroup: 'Gymnasien und Gesamtschulen',
      description: 'Förderung für innovative MINT-Projekte mit Fokus auf digitale Bildung und Nachhaltigkeit. Förderhöhe bis zu 50.000 €.',
      url: 'https://edufunds.org/foerderprogramme/mint-foerderung-2025'
    },
    {
      name: 'Kulturelle Bildung Plus',
      funder: 'Kulturstiftung der Länder',
      deadline: '15. April 2025',
      targetGroup: 'Alle Schularten',
      description: 'Unterstützung von Projekten, die kulturelle Bildung in den Schulalltag integrieren. Schwerpunkte: Musik, Theater, bildende Kunst.',
      url: 'https://edufunds.org/foerderprogramme/kulturelle-bildung-plus'
    }
  ],
  tipTitle: 'Die perfekte Projektskizze',
  tipContent: 'Beginnen Sie Ihren Antrag mit einer klaren Zieldefinition. Beschreiben Sie nicht nur WAS Sie tun wollen, sondern vor allem WARUM es wichtig ist und WELCHE messbaren Ergebnisse Sie erwarten. Fördergeber lieben konkrete Zahlen und Zeitpläne!',
  insightCategory: 'Hintergrund',
  insightReadTime: 3,
  insightTitle: 'DigitalPakt 2.0: Was kommt nach der Ausstattung?',
  insightContent: 'Der DigitalPakt hat Schulen in Deutschland mit Hardware und Infrastruktur versorgt. Doch die eigentliche Herausforderung beginnt jetzt: Wie integrieren wir digitale Tools sinnvoll in den Unterricht?\n\nExperten empfehlen einen Fokus auf Lehrerfortbildung und die Entwicklung einer nachhaltigen Digitalstrategie. Denn nur mit gut geschulten Lehrkräften entfaltet Technik ihr volles Potenzial.',
  insightCtaText: 'Fördermöglichkeiten entdecken',
  insightCtaUrl: 'https://edufunds.org/foerderprogramme?kategorie=digitalisierung',
  newsItems: [
    {
      text: 'Neue <a href="https://www.kmk.org/">KMK-Richtlinien</a> zur Inklusion in der Schule veröffentlicht',
      url: 'https://www.kmk.org/'
    },
    {
      text: 'BMBF kündigt zusätzliche 200 Mio. € für Ganztagsschulen an',
    },
    {
      text: 'Fristverlängerung: <a href="https://edufunds.org/foerderprogramme">EU-Programm Erasmus+</a> nun bis 28.02. bewerbbar',
      url: 'https://edufunds.org/foerderprogramme'
    }
  ],
  year: new Date().getFullYear()
};

// =============================================================================
// Default Export
// =============================================================================

export default {
  generateNewsletter,
  generateSubjectLine,
  generateUnsubscribeToken,
  sampleNewsletterData
};
