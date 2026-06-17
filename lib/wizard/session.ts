import { randomUUID } from "crypto";
import { query } from "@/lib/db";
import type {
  WizardSession,
  WizardSessionData,
  WizardMessage,
  WizardFacts,
} from "./types";

const MAX_QUESTIONS_DEFAULT = 12;

interface DbRow {
  id: number;
  session_token: string;
  foerderprogramm_id: string;
  foerderprogramm_name: string;
  status: WizardSession["status"];
  antrag_data: WizardSessionData;
  created_at: Date;
  updated_at: Date;
  paid_token: string | null;
  paid_at: Date | null;
  stripe_session_id: string | null;
  tier: string | null;
}

function rowToSession(row: DbRow): WizardSession {
  return {
    id: row.id,
    sessionToken: row.session_token,
    foerderprogrammId: row.foerderprogramm_id,
    foerderprogrammName: row.foerderprogramm_name,
    status: row.status,
    data: row.antrag_data,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    paidToken: row.paid_token ?? undefined,
    paidAt: row.paid_at?.toISOString(),
    stripeSessionId: row.stripe_session_id ?? undefined,
    tier: row.tier ?? undefined,
  };
}

export async function createWizardSession(
  foerderprogrammId: string,
  foerderprogrammName: string,
  ip?: string
): Promise<WizardSession> {
  const token = randomUUID();
  const data: WizardSessionData = {
    phase: "interviewing",
    messages: [],
    facts: {},
    interviewer: { totalQuestions: 0, maxQuestions: MAX_QUESTIONS_DEFAULT },
  };
  const res = await query<DbRow>(
    `INSERT INTO ki_antraege
       (foerderprogramm_id, foerderprogramm_name, antrag_data, status, session_token, ip_address)
     VALUES ($1, $2, $3::jsonb, 'in_progress', $4, $5)
     RETURNING *`,
    [foerderprogrammId, foerderprogrammName, JSON.stringify(data), token, ip ?? null]
  );
  return rowToSession(res.rows[0]);
}

export async function getWizardSession(
  sessionToken: string
): Promise<WizardSession | null> {
  const res = await query<DbRow>(
    `SELECT * FROM ki_antraege WHERE session_token = $1 LIMIT 1`,
    [sessionToken]
  );
  if (res.rowCount === 0) return null;
  return rowToSession(res.rows[0]);
}

export async function updateWizardSession(
  sessionToken: string,
  data: WizardSessionData,
  status?: WizardSession["status"]
): Promise<WizardSession> {
  const res = await query<DbRow>(
    `UPDATE ki_antraege
       SET antrag_data = $1::jsonb,
           status      = COALESCE($2, status),
           updated_at  = CURRENT_TIMESTAMP
     WHERE session_token = $3
     RETURNING *`,
    [JSON.stringify(data), status ?? null, sessionToken]
  );
  if (res.rowCount === 0) {
    throw new Error(`Session ${sessionToken} nicht gefunden`);
  }
  return rowToSession(res.rows[0]);
}

export function appendMessage(
  data: WizardSessionData,
  message: Omit<WizardMessage, "id" | "at">
): WizardSessionData {
  const msg: WizardMessage = {
    id: randomUUID(),
    at: new Date().toISOString(),
    ...message,
  };
  return { ...data, messages: [...data.messages, msg] };
}

export function mergeFacts(
  base: WizardFacts,
  update: Partial<WizardFacts> | undefined
): WizardFacts {
  if (!update) return base;
  const out: WizardFacts = { ...base };
  for (const [k, v] of Object.entries(update)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = { ...(base[k] as object | undefined), ...(v as object) };
    } else if (v !== undefined && v !== null && v !== "") {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Rollt die Session zurück: alle Messages AB (inkl.) der angegebenen User-Antwort
 * werden entfernt, Facts auf den Zustand VOR dieser Antwort zurückgesetzt.
 * Die davorliegende KI-Frage bleibt stehen und ist damit wieder "aktuelle Frage".
 *
 * Benötigt, dass die User-Answer-Message beim Anlegen `meta.factsBefore` gespeichert hat.
 */
export async function getSessionByPaidToken(
  paidToken: string
): Promise<WizardSession | null> {
  const res = await query<DbRow>(
    `SELECT * FROM ki_antraege WHERE paid_token = $1 LIMIT 1`,
    [paidToken]
  );
  if (res.rowCount === 0) return null;
  return rowToSession(res.rows[0]);
}

/**
 * Markiert eine Session als bezahlt und erzeugt einen paid_token.
 * Idempotent: wenn bereits bezahlt, wird der bestehende Token zurueckgegeben.
 */
export interface MarkPaidParams {
  stripeSessionId?: string;
  stripeCustomerEmail?: string;
  tier?: string;
  /** Freischalt-Quelle: "card" (Stripe) oder "code" (Kontingent). */
  source?: "card" | "code";
  /** Bei Quelle "code": der eingeloeste Kontingent-Code. */
  creditCode?: string;
}

/**
 * Versucht, eine Session als bezahlt zu markieren und einen paid_token zu setzen.
 * Race-sicher: das UPDATE greift nur, wenn paid_token noch NULL ist.
 * didSet=true -> DIESER Aufruf hat freigeschaltet; didSet=false -> war bereits
 * bezahlt (z. B. paralleler Aufruf) und der bestehende Token wird zurueckgegeben.
 */
export async function tryMarkSessionPaid(
  sessionToken: string,
  params: MarkPaidParams
): Promise<{ session: WizardSession; didSet: boolean }> {
  const paidToken = randomUUID();
  const res = await query<DbRow>(
    `UPDATE ki_antraege
       SET status = 'paid',
           paid_token = $1,
           paid_at = CURRENT_TIMESTAMP,
           stripe_session_id = COALESCE($2, stripe_session_id),
           stripe_customer_email = COALESCE($3, stripe_customer_email),
           -- Antrag automatisch an die Kaeufer-E-Mail binden, damit er ohne
           -- separaten Magic-Link-Opt-in geraeteuebergreifend unter "Meine Antraege"
           -- auftaucht. lower+trim = identisch zu normalizeEmail() (identity.ts),
           -- damit listSessionsByEmail() exakt matcht. Eine bereits explizit
           -- gesetzte author_email (Magic-Link zuvor) wird NICHT ueberschrieben.
           author_email = COALESCE(NULLIF(author_email, ''), lower(trim($3))),
           tier = COALESCE($4, tier),
           entitlement_source = COALESCE($5, entitlement_source),
           credit_code = COALESCE($6, credit_code),
           updated_at = CURRENT_TIMESTAMP
     WHERE session_token = $7 AND paid_token IS NULL
     RETURNING *`,
    [
      paidToken,
      params.stripeSessionId ?? null,
      params.stripeCustomerEmail ?? null,
      params.tier ?? null,
      params.source ?? null,
      params.creditCode ?? null,
      sessionToken,
    ]
  );
  if (res.rowCount === 1) {
    return { session: rowToSession(res.rows[0]), didSet: true };
  }
  // Kein Update -> bereits bezahlt oder Session existiert nicht.
  const existing = await getWizardSession(sessionToken);
  if (!existing) throw new Error(`Session ${sessionToken} nicht gefunden`);
  return { session: existing, didSet: false };
}

/**
 * Markiert eine Session als bezahlt und erzeugt einen paid_token.
 * Idempotent: wenn bereits bezahlt, wird der bestehende Token zurueckgegeben.
 */
export async function markSessionPaid(
  sessionToken: string,
  params: MarkPaidParams
): Promise<WizardSession> {
  const { session } = await tryMarkSessionPaid(sessionToken, params);
  return session;
}

export function rollbackBeforeMessage(
  data: WizardSessionData,
  messageId: string
): WizardSessionData {
  const idx = data.messages.findIndex((m) => m.id === messageId);
  if (idx < 0) throw new Error(`Message ${messageId} nicht in Session`);
  const target = data.messages[idx];
  if (target.role !== "user" || target.kind !== "answer") {
    throw new Error("Nur User-Antworten sind editierbar");
  }
  const factsBefore = (target.meta?.factsBefore as WizardFacts | undefined) ?? {};

  const keptMessages = data.messages.slice(0, idx);
  const remainingQuestions = keptMessages.filter(
    (m) => m.role === "ai" && m.kind === "question"
  ).length;

  return {
    ...data,
    phase: "interviewing",
    messages: keptMessages,
    facts: factsBefore,
    interviewer: {
      ...data.interviewer,
      totalQuestions: remainingQuestions,
    },
    generation: undefined,
  };
}
