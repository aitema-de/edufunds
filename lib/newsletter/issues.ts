/**
 * Persistenz-Schicht für Newsletter-Ausgaben (Tabelle newsletter_issues).
 *
 * Freigabe-Workflow: draft → approved → sending → sent | failed.
 * Nutzt den gemeinsamen Pool/Query-Layer aus lib/db.ts.
 */

import type { QueryResultRow } from 'pg';
import { query } from '@/lib/db';
import type { NewsletterData } from '@/lib/newsletter';

/** Bequemer Wrapper: liefert direkt die Zeilen statt QueryResult. */
async function rowsOf<T extends QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  return (await query<T>(text, params)).rows;
}

export type IssueStatus = 'draft' | 'approved' | 'sending' | 'sent' | 'failed';
export type IssueGeneratedBy = 'cron' | 'manual';

export interface NewsletterIssue {
  id: number;
  issueNumber: string;
  subject: string | null;
  status: IssueStatus;
  data: NewsletterData;
  generatedBy: IssueGeneratedBy;
  llmProvider: string | null;
  programIds: string[];
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  sentAt: string | null;
  sendStats: { total: number; successful: number; failed: number } | null;
}

interface IssueRow {
  id: number;
  issue_number: string;
  subject: string | null;
  status: IssueStatus;
  data: NewsletterData;
  generated_by: IssueGeneratedBy;
  llm_provider: string | null;
  program_ids: string[];
  created_at: Date;
  updated_at: Date;
  approved_at: Date | null;
  approved_by: string | null;
  sent_at: Date | null;
  send_stats: NewsletterIssue['sendStats'];
}

function mapRow(r: IssueRow): NewsletterIssue {
  return {
    id: r.id,
    issueNumber: r.issue_number,
    subject: r.subject,
    status: r.status,
    data: r.data,
    generatedBy: r.generated_by,
    llmProvider: r.llm_provider,
    programIds: r.program_ids ?? [],
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    approvedAt: r.approved_at ? r.approved_at.toISOString() : null,
    approvedBy: r.approved_by,
    sentAt: r.sent_at ? r.sent_at.toISOString() : null,
    sendStats: r.send_stats,
  };
}

export interface CreateIssueInput {
  issueNumber: string;
  subject?: string | null;
  data: NewsletterData;
  generatedBy?: IssueGeneratedBy;
  llmProvider?: string | null;
  programIds?: string[];
}

export async function createIssue(input: CreateIssueInput): Promise<NewsletterIssue> {
  const rows = await rowsOf<IssueRow>(
    `INSERT INTO newsletter_issues
       (issue_number, subject, status, data, generated_by, llm_provider, program_ids)
     VALUES ($1, $2, 'draft', $3, $4, $5, $6)
     RETURNING *`,
    [
      input.issueNumber,
      input.subject ?? null,
      JSON.stringify(input.data),
      input.generatedBy ?? 'cron',
      input.llmProvider ?? null,
      input.programIds ?? [],
    ]
  );
  return mapRow(rows[0]);
}

export async function getIssueById(id: number): Promise<NewsletterIssue | null> {
  const rows = await rowsOf<IssueRow>(
    'SELECT * FROM newsletter_issues WHERE id = $1',
    [id]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listIssues(limit = 50): Promise<NewsletterIssue[]> {
  const rows = await rowsOf<IssueRow>(
    'SELECT * FROM newsletter_issues ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return rows.map(mapRow);
}

/**
 * Aktualisiert Inhalt/Betreff einer noch nicht versendeten Ausgabe.
 * Ein Edit setzt eine freigegebene Ausgabe zurück auf 'draft' (Re-Freigabe nötig).
 */
export async function updateIssueData(
  id: number,
  data: NewsletterData,
  subject?: string | null
): Promise<NewsletterIssue | null> {
  const rows = await rowsOf<IssueRow>(
    `UPDATE newsletter_issues
        SET data = $2,
            subject = COALESCE($3, subject),
            status = CASE WHEN status IN ('sent', 'sending') THEN status ELSE 'draft' END,
            approved_at = CASE WHEN status IN ('sent', 'sending') THEN approved_at ELSE NULL END,
            approved_by = CASE WHEN status IN ('sent', 'sending') THEN approved_by ELSE NULL END,
            updated_at = now()
      WHERE id = $1 AND status NOT IN ('sent', 'sending')
      RETURNING *`,
    [id, JSON.stringify(data), subject ?? null]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function approveIssue(
  id: number,
  approvedBy: string
): Promise<NewsletterIssue | null> {
  const rows = await rowsOf<IssueRow>(
    `UPDATE newsletter_issues
        SET status = 'approved', approved_at = now(), approved_by = $2, updated_at = now()
      WHERE id = $1 AND status = 'draft'
      RETURNING *`,
    [id, approvedBy]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

/** Setzt eine freigegebene Ausgabe atomar auf 'sending' (verhindert Doppelversand). */
export async function markSending(id: number): Promise<NewsletterIssue | null> {
  const rows = await rowsOf<IssueRow>(
    `UPDATE newsletter_issues
        SET status = 'sending', updated_at = now()
      WHERE id = $1 AND status = 'approved'
      RETURNING *`,
    [id]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function markSent(
  id: number,
  stats: { total: number; successful: number; failed: number }
): Promise<NewsletterIssue | null> {
  const rows = await rowsOf<IssueRow>(
    `UPDATE newsletter_issues
        SET status = 'sent', sent_at = now(), send_stats = $2, updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [id, JSON.stringify(stats)]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function markFailed(id: number): Promise<NewsletterIssue | null> {
  const rows = await rowsOf<IssueRow>(
    `UPDATE newsletter_issues
        SET status = 'failed', updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [id]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

/** Programm-IDs der letzten N Ausgaben — für Rotation/Anti-Wiederholung. */
export async function getRecentProgramIds(lastN = 3): Promise<string[]> {
  const rows = await rowsOf<{ program_ids: string[] }>(
    'SELECT program_ids FROM newsletter_issues ORDER BY created_at DESC LIMIT $1',
    [lastN]
  );
  const ids = new Set<string>();
  for (const r of rows) for (const id of r.program_ids ?? []) ids.add(id);
  return [...ids];
}

/** Höchste bisherige Ausgabennummer (numerisch geparst aus "Ausgabe #N"). */
export async function getNextIssueNumber(): Promise<number> {
  const rows = await rowsOf<{ issue_number: string }>(
    'SELECT issue_number FROM newsletter_issues'
  );
  let max = 0;
  for (const r of rows) {
    const m = /(\d+)/.exec(r.issue_number || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/**
 * Idempotenz für den Monats-Cron: existiert bereits ein per Cron erzeugter
 * Entwurf aus dem aktuellen Kalendermonat?
 */
export async function getCronIssueForMonth(now: Date): Promise<NewsletterIssue | null> {
  const rows = await rowsOf<IssueRow>(
    `SELECT * FROM newsletter_issues
      WHERE generated_by = 'cron'
        AND date_trunc('month', created_at) = date_trunc('month', $1::timestamptz)
      ORDER BY created_at DESC
      LIMIT 1`,
    [now.toISOString()]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}
