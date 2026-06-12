/**
 * Löschkonzept / Datenminimierung (DSGVO Art. 5(1)e — Speicherbegrenzung).
 *
 * Personenbezogene Daten werden nicht unbegrenzt vorgehalten. Diese Datei
 * definiert die Löschregeln deterministisch (testbar via `buildRetentionPlan`)
 * und führt sie transaktional aus (`runRetention`, echtes Dry-Run via ROLLBACK).
 *
 * Geplant über:
 *   - geschützten Endpoint `app/api/cron/retention` (Server-Cron, CRON_SECRET)
 *   - manuell via `scripts/cleanup-personal-data.ts` (Dry-Run-Default)
 *
 * Die dokumentierte Fassung (Fristen, Rechtsgrundlagen) steht in
 * `docs/legal/LOESCHKONZEPT.md`. Fristen sind per Env überschreibbar.
 */

import type { PoolClient } from "pg";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RetentionOptions {
  /** Unbestätigte Newsletter-Einträge (kein Double-Opt-in) löschen nach … Tagen. */
  unconfirmedNewsletterDays: number;
  /** Verwaiste anonyme Antrags-Entwürfe (nicht bezahlt, keine E-Mail) löschen nach … Tagen. */
  abandonedDraftDays: number;
  /** IP-Adresse/User-Agent anonymisieren (NULL setzen) nach … Tagen. */
  ipAnonymizeDays: number;
}

export const DEFAULT_RETENTION: RetentionOptions = {
  unconfirmedNewsletterDays: numFromEnv("RETENTION_UNCONFIRMED_NEWSLETTER_DAYS", 30),
  abandonedDraftDays: numFromEnv("RETENTION_ABANDONED_DRAFT_DAYS", 180),
  ipAnonymizeDays: numFromEnv("RETENTION_IP_DAYS", 90),
};

function numFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface RetentionOp {
  /** Stabiler Schlüssel für Reporting/Tests. */
  name: string;
  /** Was die Operation tut (für Logs/Doku). */
  description: string;
  /** "delete" = Datensatz entfernen, "anonymize" = personenbezogene Spalte NULL setzen. */
  kind: "delete" | "anonymize";
  sql: string;
  params: unknown[];
}

/**
 * Baut den Löschplan rein deterministisch aus `now` + Optionen — keine DB,
 * keine Seiteneffekte. So sind Fristen und Zieltabellen unit-testbar.
 */
export function buildRetentionPlan(
  now: Date,
  opts: RetentionOptions = DEFAULT_RETENTION
): RetentionOp[] {
  const cutoff = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  const nowIso = now.toISOString();

  return [
    {
      name: "magic_links_expired",
      description: "Abgelaufene Magic-Links löschen (nach Ablauf wertlos).",
      kind: "delete",
      sql: `DELETE FROM magic_links WHERE expires_at < $1`,
      params: [nowIso],
    },
    {
      name: "newsletter_unconfirmed",
      description:
        "Newsletter-Anmeldungen ohne Double-Opt-in-Bestätigung löschen (keine Einwilligung erteilt).",
      kind: "delete",
      sql: `DELETE FROM newsletter_entries WHERE confirmed = FALSE AND created_at < $1`,
      params: [cutoff(opts.unconfirmedNewsletterDays)],
    },
    {
      name: "abandoned_anonymous_drafts",
      description:
        "Verwaiste anonyme Antrags-Entwürfe löschen — nur unbezahlt, ohne Autor-E-Mail und ohne paid_token; bezahlte/eingereichte Anträge bleiben (Vertrag/GoBD).",
      kind: "delete",
      sql: `DELETE FROM ki_antraege
            WHERE status IN ('draft', 'in_progress', 'complete')
              AND paid_token IS NULL
              AND author_email IS NULL
              AND updated_at < $1`,
      params: [cutoff(opts.abandonedDraftDays)],
    },
    {
      name: "anonymize_ip_ki_antraege",
      description: "IP-Adresse in Anträgen nach Ablauf der Frist anonymisieren.",
      kind: "anonymize",
      sql: `UPDATE ki_antraege SET ip_address = NULL
            WHERE ip_address IS NOT NULL AND created_at < $1`,
      params: [cutoff(opts.ipAnonymizeDays)],
    },
    {
      name: "anonymize_ip_contact_requests",
      description: "IP-Adresse + User-Agent + Referrer in Kontaktanfragen anonymisieren.",
      kind: "anonymize",
      sql: `UPDATE contact_requests SET ip_address = NULL, user_agent = NULL, referrer = NULL
            WHERE (ip_address IS NOT NULL OR user_agent IS NOT NULL OR referrer IS NOT NULL)
              AND created_at < $1`,
      params: [cutoff(opts.ipAnonymizeDays)],
    },
    {
      name: "anonymize_ip_newsletter",
      description:
        "IP-Adresse + User-Agent bestätigter Newsletter-Einträge anonymisieren (Opt-in-Nachweis nach Frist nicht mehr nötig).",
      kind: "anonymize",
      sql: `UPDATE newsletter_entries SET ip_address = NULL, user_agent = NULL
            WHERE confirmed = TRUE
              AND (ip_address IS NOT NULL OR user_agent IS NOT NULL)
              AND created_at < $1`,
      params: [cutoff(opts.ipAnonymizeDays)],
    },
  ];
}

export interface RetentionResult {
  name: string;
  kind: "delete" | "anonymize";
  description: string;
  affected: number;
}

export interface RetentionRun {
  dryRun: boolean;
  ranAt: string;
  results: RetentionResult[];
  totalAffected: number;
}

/**
 * Führt den Löschplan transaktional aus. Bei `dryRun` wird die Transaktion am
 * Ende zurückgerollt — die Zeilenzahlen sind exakt, aber nichts wird geändert.
 */
export async function runRetention(
  client: PoolClient,
  args: { now: Date; dryRun: boolean; opts?: RetentionOptions }
): Promise<RetentionRun> {
  const plan = buildRetentionPlan(args.now, args.opts ?? DEFAULT_RETENTION);
  const results: RetentionResult[] = [];

  await client.query("BEGIN");
  try {
    for (const op of plan) {
      const res = await client.query(op.sql, op.params);
      results.push({
        name: op.name,
        kind: op.kind,
        description: op.description,
        affected: res.rowCount ?? 0,
      });
    }
    await client.query(args.dryRun ? "ROLLBACK" : "COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }

  return {
    dryRun: args.dryRun,
    ranAt: args.now.toISOString(),
    results,
    totalAffected: results.reduce((sum, r) => sum + r.affected, 0),
  };
}
