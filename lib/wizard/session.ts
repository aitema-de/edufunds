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
