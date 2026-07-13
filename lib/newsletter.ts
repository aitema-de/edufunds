/**
 * Newsletter Hilfsfunktionen
 * 
 * - HTML/Plaintext Newsletter-Generierung
 * - Template-Rendering
 * - Unsubscribe-Token-Generierung
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { sanitizeLlmUrl, stripUnsafeAnchors } from '@/lib/newsletter/content-collector';
import { publicAppUrl } from '@/lib/app-url';

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
  /** Knappe Förderhöhe, z.B. "bis zu 50.000 €" (optional, aus dem Katalog). */
  amount?: string;
}

export interface NewsItem {
  text: string;
  url?: string;
}

/** Eine Kennzahl der "EduFunds in Zahlen"-Leiste (echte Katalogwerte). */
export interface NewsletterStat {
  value: string;
  label: string;
}

/** Ein Wertversprechen-Punkt der Gründungsgeschichte (nur Erstausgabe). */
export interface StoryPoint {
  label: string;
  text: string;
}

/**
 * Die ausführliche Gründungs-/Missionsgeschichte. Erscheint prominent NUR in der
 * Erstausgabe (Kickoff): Was ist EduFunds, warum haben wir es gebaut, was treibt
 * uns an, was haben Schulen und Antragstellende davon.
 */
export interface IntroStory {
  /** Einleitender Erzähltext (1-2 Absätze, mit \n\n getrennt). */
  lead: string;
  /** Wertversprechen-Punkte (i.d.R. 3): Antrieb · Nutzen Schulen · Nutzen Antragstellende. */
  points: StoryPoint[];
}

/** Kompakte "Was ist EduFunds?"-Box (jede Ausgabe ausser Kickoff). */
export interface AboutBox {
  title: string;
  body: string;
}

export interface NewsletterData {
  issueNumber: string;
  issueDate: string;
  leadTitle: string;
  leadContent: string;
  /** Unterschrift unter der persönlichen Einleitung, z.B. "Kolja & das EduFunds-Team". */
  signature?: string;
  /** Markiert die Erstausgabe → prominente Gründungsgeschichte statt kompakter Box. */
  isKickoff?: boolean;
  /** "EduFunds in Zahlen"-Leiste (echte Katalogwerte). */
  stats?: NewsletterStat[];
  /** Ausführliche Gründungsgeschichte — nur Erstausgabe. */
  introStory?: IntroStory;
  /** Kompakte "Was ist EduFunds?"-Box — Folgeausgaben (Default: DEFAULT_ABOUT_BOX). */
  aboutBox?: AboutBox;
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
// Konstanten
// =============================================================================

/** Standard-Unterschrift unter der persönlichen Einleitung (per env überschreibbar). */
export const DEFAULT_SIGNATURE =
  process.env.NEWSLETTER_SIGNATURE || 'Kolja & das EduFunds-Team';

/**
 * Kompakte "Was ist EduFunds?"-Box. Erscheint in jeder Folgeausgabe (nicht im
 * Kickoff, dort trägt die ausführliche Gründungsgeschichte den Inhalt) und gibt
 * neuen Leserinnen verlässlich in drei Sätzen das Wertversprechen — warm, konkret,
 * ohne Marketing-Floskeln. Bewusst fest verdrahtet (nicht LLM) für gleichbleibende
 * Qualität; pro Ausgabe im Admin überschreibbar.
 */
export const DEFAULT_ABOUT_BOX: AboutBox = {
  title: 'Was ist EduFunds?',
  body:
    'EduFunds hilft Schulen, Fördervereinen und Lehrkräften, im Dickicht der ' +
    'Bildungsförderung die passenden Programme zu finden — und Anträge mit ' +
    'KI-Unterstützung Schritt für Schritt zu schreiben. Statt wochenlang ' +
    'Richtlinien zu wälzen, sehen Sie in Minuten, welche Förderung zu Ihrem ' +
    'Vorhaben passt, und erhalten einen fertig strukturierten Antragsentwurf. ' +
    'Mehr Geld für gute Ideen, weniger Bürokratie — dafür sind wir angetreten.',
};

/**
 * Permanenter Disclaimer. Erscheint unverändert in JEDER Ausgabe — erklärt, was
 * EduFunds ist, und grenzt die Inhalte rechtlich ab (keine Gewähr, keine Rechts-
 * oder Förderberatung; maßgeblich ist immer der Fördergeber).
 */
export const DEFAULT_DISCLAIMER =
  'EduFunds ist ein Angebot der aitema GmbH und unterstützt Schulen, Fördervereine ' +
  'und Lehrkräfte dabei, passende Fördermittel zu finden und Anträge mit KI-Hilfe zu ' +
  'schreiben. Die vorgestellten Programme und Angaben sind sorgfältig recherchiert, ' +
  'aber ohne Gewähr: Fristen, Summen und Bedingungen können sich ändern — maßgeblich ' +
  'ist stets der jeweilige Fördergeber. Dieser Newsletter ersetzt keine Rechts- oder ' +
  'Förderberatung.';

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
function renderProgramCard(program: Program, index = 0): string {
  const num = String(index + 1).padStart(2, '0');
  // Tabellenbasiert für robuste Darstellung in Outlook/Gmail (keine Flexbox /
  // kein position:absolute): linke Spalte = Nummer, rechte Spalte = Inhalt;
  // Titel/Frist im verschachtelten 2-Spalten-Layout (Titel links, Frist rechts).
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="program-card">
    <tr>
        <td width="46" valign="top" class="program-index">${num}</td>
        <td valign="top" class="program-body">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td valign="top"><h3 class="program-title">${escapeHtml(program.name)}</h3></td>
                    <td valign="top" align="right" class="deadline-cell"><span class="program-deadline">${escapeHtml(program.deadline)}</span></td>
                </tr>
            </table>
            <div class="program-funder">${escapeHtml(program.funder)}</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td valign="top" class="program-target">Zielgruppe: ${escapeHtml(program.targetGroup)}</td>
                    ${program.amount ? `<td valign="top" align="right" class="program-amount-cell"><span class="program-amount">${escapeHtml(program.amount)}</span></td>` : ''}
                </tr>
            </table>
            <p class="program-description">${escapeHtml(program.description)}</p>
            <a href="${escapeHtml(program.url)}" class="program-cta">Zum Programm &rarr;</a>
        </td>
    </tr>
</table>`;
}

/**
 * Renders programs for plaintext
 */
function renderProgramsText(programs: Program[]): string {
  return programs.map(p => `
${p.name}
Fördergeber: ${p.funder}
Frist: ${p.deadline}
Zielgruppe: ${p.targetGroup}${p.amount ? `\nFörderhöhe: ${p.amount}` : ''}

${p.description}

→ ${p.url}
`).join('\n---\n');
}

/**
 * Renders news items for HTML
 */
function renderNewsItems(items: NewsItem[]): string {
  return items.map((item) => {
    const text = item.url
      ? `${item.text.replace(/<a\s+href="([^"]+)">([^<]+)<\/a>/g, '<a href="$1" class="news-link">$2</a>')}`
      : escapeHtml(item.text);
    return `
<tr>
    <td class="news-bullet" valign="top">&#9670;</td>
    <td class="news-text">${text}</td>
</tr>`;
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

/** Wandelt einen mehrabsätzigen Text (\n\n) in <p>-Absätze. */
function paragraphsToHtml(content: string): string {
  return content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n');
}

/**
 * "EduFunds in Zahlen" — kompakte Kennzahlen-Leiste. Tabellenbasiert (eine Spalte
 * pro Kennzahl) für robuste Darstellung in Outlook/Gmail. Liefert kompletten Block
 * oder leeren String, damit er sich rückstandslos ausblenden lässt.
 */
function renderStats(stats?: NewsletterStat[]): string {
  if (!stats || stats.length === 0) return '';
  const cells = stats
    .map(
      (s) => `
                    <td valign="top" align="center" class="stat-cell">
                        <div class="stat-value">${escapeHtml(s.value)}</div>
                        <div class="stat-label">${escapeHtml(s.label)}</div>
                    </td>`
    )
    .join('');
  return `
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="stat-strip">
                                <tr>${cells}</tr>
                            </table>`;
}

/**
 * Ausführliche Gründungsgeschichte (nur Erstausgabe): Erzähl-Lead + Wertversprechen-
 * Punkte mit Small-Caps-Labels. Kompletter Sektions-Block oder leerer String.
 */
function renderIntroStory(story?: IntroStory): string {
  if (!story) return '';
  const lead = paragraphsToHtml(story.lead);
  const points = (story.points || [])
    .map(
      (p) => `
                                <tr>
                                    <td valign="top" class="story-point">
                                        <span class="label story-point-label">${escapeHtml(p.label)}</span>
                                        <p class="story-point-text">${escapeHtml(p.text)}</p>
                                    </td>
                                </tr>`
    )
    .join('');
  return `
                            <div class="section story">
                                <div class="section-head">
                                    <span class="label">Warum es EduFunds gibt</span>
                                    <h2 class="serif">Unsere Geschichte in Kürze</h2>
                                </div>
                                <div class="story-lead">${lead}</div>
                                ${points ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="story-points">${points}</table>` : ''}
                            </div>`;
}

/** Kompakte "Was ist EduFunds?"-Box (Folgeausgaben). Block oder leerer String. */
function renderAboutBox(box?: AboutBox): string {
  if (!box) return '';
  return `
                            <div class="about-box">
                                <span class="label about-box-title">${escapeHtml(box.title)}</span>
                                <p class="about-box-body">${escapeHtml(box.body)}</p>
                            </div>`;
}

/** Plaintext-Varianten der neuen Blöcke. */
function renderStatsText(stats?: NewsletterStat[]): string {
  if (!stats || stats.length === 0) return '';
  const lines = stats.map((s) => `  ${s.value} — ${s.label}`).join('\n');
  return `\nEDUFUNDS IN ZAHLEN\n${lines}\n`;
}

function renderIntroStoryText(story?: IntroStory): string {
  if (!story) return '';
  const points = (story.points || [])
    .map((p) => `${p.label.toUpperCase()}\n${p.text}`)
    .join('\n\n');
  return `\nWARUM ES EDUFUNDS GIBT\n${'-'.repeat(80)}\n\n${story.lead}\n\n${points}\n`;
}

function renderAboutBoxText(box?: AboutBox): string {
  if (!box) return '';
  return `\n${box.title.toUpperCase()}\n${box.body}\n`;
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

  // Deterministische Footer-/Funktions-URLs immer aus baseUrl (= App-Domain) —
  // nie hartkodiert, damit keine toten Landing-Links (edufunds.org) im Postfach.
  const base = baseUrl.replace(/\/+$/, '');
  const foerderprogrammeUrl = `${base}/foerderprogramme`;
  const antragUrl = `${base}/antrag`;
  const impressumUrl = `${base}/impressum`;
  const datenschutzUrl = `${base}/datenschutz`;

  // LLM-gelieferte Links härten (verhindert tote/halluzinierte CTAs — greift auch
  // für bereits gespeicherte Entwürfe, da hier beim Rendern gefiltert wird).
  // insightCtaUrl: bei ungültiger LLM-URL auf die Förderdatenbank ausweichen,
  // solange ein CTA-Text vorhanden ist (statt den CTA ganz zu verlieren).
  const safeInsightCtaUrl =
    sanitizeLlmUrl(data.insightCtaUrl, base) ||
    (data.insightCtaText ? foerderprogrammeUrl : '');
  const safeNewsItems: NewsItem[] = data.newsItems.map((n) => ({
    ...n,
    text: stripUnsafeAnchors(n.text, base),
    url: sanitizeLlmUrl(n.url, base) || undefined,
  }));

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
  const programsHtml = data.programs.map((p, i) => renderProgramCard(p, i)).join('\n');
  const programsText = renderProgramsText(data.programs);
  
  // Render news items (mit gehärteten Links)
  const newsHtml = renderNewsItems(safeNewsItems);
  const newsText = renderNewsItemsText(safeNewsItems);

  // Neue Blöcke (rein datengetrieben → robust): Kennzahlen (immer), ausführliche
  // Gründungsgeschichte falls vorhanden (Erstausgabe), sonst die kompakte
  // "Was ist EduFunds?"-Box. So bleibt nie beides leer (Kickoff-Fallback) und es
  // gibt keine Doppelung (Story und Box schliessen sich gegenseitig aus).
  const introStory = data.introStory;
  const aboutBox = data.aboutBox ?? (introStory ? undefined : DEFAULT_ABOUT_BOX);
  const statsHtml = renderStats(data.stats);
  const introStoryHtml = renderIntroStory(introStory);
  const aboutBoxHtml = renderAboutBox(aboutBox);

  // Prepare template data
  const templateData: Record<string, string> = {
    newsletter_title: generateSubjectLine(data),
    issue_number: data.issueNumber,
    issue_date: formattedDate,
    lead_title: escapeHtml(data.leadTitle),
    // Initiale (Drop Cap) als echtes, inline-gestyltes Element — E-Mail-Clients
    // unterstützen ::first-letter nicht; float wirkt in den meisten Clients,
    // sonst zeigt es schlicht einen großen Anfangsbuchstaben (graceful fallback).
    lead_content: escapeHtml(data.leadContent)
      .replace(
        /^(\s*)(\S)/,
        '$1<span style="float:left;font-family:Georgia,\'Times New Roman\',serif;font-weight:700;font-size:52px;line-height:40px;padding:2px 8px 0 0;color:#1f4d3f;">$2</span>'
      )
      .replace(/\n+/g, '</p>\n<p>'),
    signature: escapeHtml(data.signature || DEFAULT_SIGNATURE).replace(/\n/g, '<br>'),
    stats: statsHtml,
    intro_story: introStoryHtml,
    about_box: aboutBoxHtml,
    programs: programsHtml,
    tip_title: escapeHtml(data.tipTitle),
    tip_content: renderInsightContent(data.tipContent),
    insight_category: escapeHtml(data.insightCategory),
    insight_read_time: String(data.insightReadTime),
    insight_title: escapeHtml(data.insightTitle),
    insight_content: renderInsightContent(data.insightContent),
    insight_cta_text: data.insightCtaText ? escapeHtml(data.insightCtaText) : '',
    insight_cta_url: safeInsightCtaUrl,
    news_items: newsHtml,
    disclaimer: escapeHtml(DEFAULT_DISCLAIMER),
    unsubscribe_url: unsubscribeUrl,
    impressum_url: impressumUrl,
    datenschutz_url: datenschutzUrl,
    foerderprogramme_url: foerderprogrammeUrl,
    antrag_url: antragUrl,
    year: String(data.year)
  };
  
  // Handle conditional blocks for plaintext
  let textContent = textTemplate
    .replace(/\{\{issue_number\}\}/g, data.issueNumber)
    .replace(/\{\{issue_date\}\}/g, formattedDate)
    .replace(/\{\{lead_title\}\}/g, data.leadTitle)
    .replace(/\{\{lead_content\}\}/g, data.leadContent)
    .replace(/\{\{signature\}\}/g, data.signature || DEFAULT_SIGNATURE)
    .replace(/\{\{stats_text\}\}/g, renderStatsText(data.stats))
    .replace(/\{\{intro_story_text\}\}/g, renderIntroStoryText(introStory))
    .replace(/\{\{about_box_text\}\}/g, renderAboutBoxText(aboutBox))
    .replace(/\{\{programs_text\}\}/g, programsText)
    .replace(/\{\{tip_title\}\}/g, data.tipTitle)
    .replace(/\{\{tip_content\}\}/g, data.tipContent)
    .replace(/\{\{insight_category\}\}/g, data.insightCategory)
    .replace(/\{\{insight_title\}\}/g, data.insightTitle)
    .replace(/\{\{insight_content\}\}/g, renderInsightContentText(data.insightContent))
    .replace(/\{\{news_items_text\}\}/g, newsText)
    .replace(/\{\{disclaimer\}\}/g, DEFAULT_DISCLAIMER)
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
    .replace(/\{\{foerderprogramme_url\}\}/g, foerderprogrammeUrl)
    .replace(/\{\{antrag_url\}\}/g, antragUrl)
    .replace(/\{\{impressum_url\}\}/g, impressumUrl)
    .replace(/\{\{datenschutz_url\}\}/g, datenschutzUrl)
    .replace(/\{\{year\}\}/g, String(data.year));

  // Handle conditional CTA in plaintext (gehärtete URL)
  if (safeInsightCtaUrl) {
    textContent = textContent.replace(
      /\{\{#if insight_cta_url\}\}[\s\S]*?\{\{\/if\}\}/g,
      `Mehr lesen: ${safeInsightCtaUrl}`
    );
  } else {
    textContent = textContent.replace(/\{\{#if insight_cta_url\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  // Render HTML
  const htmlContent = renderTemplate(htmlTemplate, templateData);

  // Handle conditional CTA in HTML (gehärtete URL)
  let finalHtml = htmlContent;
  if (!safeInsightCtaUrl) {
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

// Basis der Beispiel-Links aus der Konfiguration — sie durchlaufen beim Rendern
// dieselbe Origin-Pruefung (sanitizeLlmUrl) wie LLM-Links und wuerden bei einer
// abweichenden Domain still verworfen.
const SAMPLE_BASE = publicAppUrl();

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
      url: `${SAMPLE_BASE}/foerderprogramme/mint-foerderung-2025`
    },
    {
      name: 'Kulturelle Bildung Plus',
      funder: 'Kulturstiftung der Länder',
      deadline: '15. April 2025',
      targetGroup: 'Alle Schularten',
      description: 'Unterstützung von Projekten, die kulturelle Bildung in den Schulalltag integrieren. Schwerpunkte: Musik, Theater, bildende Kunst.',
      url: `${SAMPLE_BASE}/foerderprogramme/kulturelle-bildung-plus`
    }
  ],
  tipTitle: 'Die perfekte Projektskizze',
  tipContent: 'Beginnen Sie Ihren Antrag mit einer klaren Zieldefinition. Beschreiben Sie nicht nur WAS Sie tun wollen, sondern vor allem WARUM es wichtig ist und WELCHE messbaren Ergebnisse Sie erwarten. Fördergeber lieben konkrete Zahlen und Zeitpläne!',
  insightCategory: 'Hintergrund',
  insightReadTime: 3,
  insightTitle: 'DigitalPakt 2.0: Was kommt nach der Ausstattung?',
  insightContent: 'Der DigitalPakt hat Schulen in Deutschland mit Hardware und Infrastruktur versorgt. Doch die eigentliche Herausforderung beginnt jetzt: Wie integrieren wir digitale Tools sinnvoll in den Unterricht?\n\nExperten empfehlen einen Fokus auf Lehrerfortbildung und die Entwicklung einer nachhaltigen Digitalstrategie. Denn nur mit gut geschulten Lehrkräften entfaltet Technik ihr volles Potenzial.',
  insightCtaText: 'Fördermöglichkeiten entdecken',
  insightCtaUrl: `${SAMPLE_BASE}/foerderprogramme?kategorie=digitalisierung`,
  newsItems: [
    {
      text: 'Neue <a href="https://www.kmk.org/">KMK-Richtlinien</a> zur Inklusion in der Schule veröffentlicht',
      url: 'https://www.kmk.org/'
    },
    {
      text: 'BMBF kündigt zusätzliche 200 Mio. € für Ganztagsschulen an',
    },
    {
      text: `Fristverlängerung: <a href="${SAMPLE_BASE}/foerderprogramme">EU-Programm Erasmus+</a> nun bis 28.02. bewerbbar`,
      url: `${SAMPLE_BASE}/foerderprogramme`
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
