/**
 * /api/feedback — Pilot-Bug-Reporting + Feedback-Routing
 *
 * Portiert von SailHub `submit-feedback`-Edge-Function (2026-05-27, Phase 6
 * Pre-Pilot). Statt 4 Aktionen parallel (GitHub-Issue, ClickUp-Task,
 * Notify-Mail, Confirmation-Mail) macht dieser Endpoint dasselbe via
 * Next.js Route Handler.
 *
 * ENV-Vars (alle optional — bei fehlendem Token wird die jeweilige Aktion
 * uebersprungen, Success ist solange `notified || github || clickup`):
 * - GITHUB_TOKEN: Personal Access Token (Repo-Issues-Scope)
 * - GITHUB_REPO: "Aitema-gmbh/edufunds" (Default)
 * - CLICKUP_TOKEN: ClickUp API-Token
 * - CLICKUP_LIST_ID: Ziel-Liste fuer Pilot-Feedback-Tasks
 * - RESEND_API_KEY: Mail-Versand-Bestaetigung + Office-Notification
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "Aitema-gmbh/edufunds";
const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN || "";
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const NOTIFY_EMAIL = process.env.FEEDBACK_NOTIFY_EMAIL || "office@aitema.de";

const VALID_TYPES = ["bug", "feature", "question"] as const;
type FeedbackType = (typeof VALID_TYPES)[number];

const TYPE_TITLES: Record<FeedbackType, string> = {
  bug: "Bug",
  feature: "Idee",
  question: "Frage",
};

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "type:bug",
  feature: "type:feature",
  question: "type:question",
};

const MAX_DESCRIPTION = 5000;
const MAX_FIELD = 500;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface FeedbackPayload {
  type: FeedbackType;
  description: string;
  context?: string;
  email?: string;
  wantsResponse?: boolean;
  url?: string;
  userAgent?: string;
  sessionToken?: string;
  paidToken?: string;
}

function validate(p: unknown): { valid: true; payload: FeedbackPayload } | { valid: false; error: string } {
  if (!p || typeof p !== "object") return { valid: false, error: "payload must be object" };
  const obj = p as Record<string, unknown>;
  if (!obj.description || typeof obj.description !== "string") return { valid: false, error: "description required" };
  if (typeof obj.description === "string" && obj.description.length > MAX_DESCRIPTION) return { valid: false, error: "description too long" };
  if (!obj.type || !VALID_TYPES.includes(obj.type as FeedbackType)) return { valid: false, error: "type must be bug, feature, or question" };
  if (obj.email && (typeof obj.email !== "string" || obj.email.length > MAX_FIELD)) return { valid: false, error: "invalid email" };
  if (obj.context && (typeof obj.context !== "string" || obj.context.length > MAX_FIELD)) return { valid: false, error: "invalid context" };
  return {
    valid: true,
    payload: {
      type: obj.type as FeedbackType,
      description: obj.description,
      context: typeof obj.context === "string" ? obj.context : undefined,
      email: typeof obj.email === "string" ? obj.email : undefined,
      wantsResponse: !!obj.wantsResponse,
      url: typeof obj.url === "string" ? obj.url.slice(0, MAX_FIELD) : undefined,
      userAgent: typeof obj.userAgent === "string" ? obj.userAgent.slice(0, MAX_FIELD) : undefined,
      sessionToken: typeof obj.sessionToken === "string" ? obj.sessionToken : undefined,
      paidToken: typeof obj.paidToken === "string" ? obj.paidToken : undefined,
    },
  };
}

/**
 * Laufende Ticketnummer. Primär atomar+monoton aus einer DB-Sequenz
 * (feedback_tickets.id, Migration 008) — unabhängig von ClickUp. Fällt bei
 * DB-Fehler auf die alte ClickUp-Zählung (max #NNN + 1) zurück.
 */
async function getNextTicketNumber(type: string, url?: string): Promise<number> {
  try {
    const res = await query<{ id: number }>(
      `INSERT INTO feedback_tickets (feedback_type, url) VALUES ($1, $2) RETURNING id`,
      [type, url ?? null]
    );
    if (res.rowCount === 1) return res.rows[0].id;
  } catch (e) {
    console.error(
      "[feedback] DB-Ticketnummer fehlgeschlagen, Fallback ClickUp:",
      e instanceof Error ? e.message : e
    );
  }
  return clickUpMaxPlusOne();
}

/** Fallback: laufende Nummer aus dem Maximum der ClickUp-Tasknamen (#NNN). */
async function clickUpMaxPlusOne(): Promise<number> {
  if (!CLICKUP_TOKEN || !CLICKUP_LIST_ID) return 0;
  try {
    const r = await fetch(
      `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task?archived=false&include_closed=true`,
      { headers: { Authorization: CLICKUP_TOKEN } }
    );
    if (!r.ok) return 0;
    const data = await r.json();
    const tasks = (data.tasks as Array<{ name: string }>) || [];
    let max = 0;
    for (const t of tasks) {
      const m = t.name.match(/^#(\d{3,})/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
    return max + 1;
  } catch {
    return 0;
  }
}

async function createGitHubIssue(payload: FeedbackPayload, ticket: string): Promise<{ url: string } | null> {
  if (!GITHUB_TOKEN) {
    console.warn("[feedback] GITHUB_TOKEN not configured");
    return null;
  }
  const typeTitle = TYPE_TITLES[payload.type];
  const shortDesc = escapeHtml(payload.description.substring(0, 80).replace(/\n/g, " "));
  const prefix = ticket ? `${ticket} ` : "";
  const title = `${prefix}[EduFunds] ${typeTitle}: ${shortDesc}`;

  const body = [
    `## ${typeTitle}`,
    "",
    escapeHtml(payload.description),
    "",
    "---",
    "",
    "| Detail | Wert |",
    "|--------|------|",
    `| Typ | ${typeTitle} |`,
    payload.context ? `| Kontext | ${escapeHtml(payload.context)} |` : null,
    `| URL | ${escapeHtml(payload.url || "-")} |`,
    payload.sessionToken ? `| Wizard-Session | \`${escapeHtml(payload.sessionToken)}\` |` : null,
    payload.paidToken ? `| Paid-Token | \`${escapeHtml(payload.paidToken)}\` |` : null,
    `| Zeitpunkt | ${new Date().toISOString()} |`,
    payload.email ? `| Kontakt | ${escapeHtml(payload.email)} |` : null,
    `| UserAgent | \`${escapeHtml(payload.userAgent || "-")}\` |`,
    "",
    "---",
    "_Automatisch erstellt via EduFunds FeedbackButton (Pilot-Phase 6)_",
  ]
    .filter(Boolean)
    .join("\n");

  const labels = ["pilot-feedback", TYPE_LABELS[payload.type]];

  const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "EduFunds-FeedbackBot",
    },
    body: JSON.stringify({ title, body, labels }),
  });

  if (!r.ok) {
    const err = await r.text();
    console.error("[feedback] GitHub issue create failed:", r.status, err.slice(0, 300));
    return null;
  }
  const result = await r.json();
  return { url: result.html_url };
}

async function createClickUpTask(payload: FeedbackPayload, ticket: string): Promise<{ id: string; url: string } | null> {
  if (!CLICKUP_TOKEN || !CLICKUP_LIST_ID) {
    console.warn("[feedback] CLICKUP_TOKEN or CLICKUP_LIST_ID not configured");
    return null;
  }
  const typeTitle = TYPE_TITLES[payload.type];
  const shortDesc = payload.description.substring(0, 80).replace(/\n/g, " ");
  const prefix = ticket ? `${ticket} ` : "";
  const name = `${prefix}[EduFunds] ${typeTitle}: ${shortDesc}`;

  const description = [
    payload.description,
    "",
    "---",
    `Typ: ${typeTitle}`,
    payload.context ? `Kontext: ${payload.context}` : null,
    `URL: ${payload.url || "-"}`,
    payload.sessionToken ? `Wizard-Session: ${payload.sessionToken}` : null,
    payload.paidToken ? `Paid-Token: ${payload.paidToken}` : null,
    `Zeitpunkt: ${new Date().toISOString()}`,
    payload.email ? `Kontakt: ${payload.email}` : null,
    `UserAgent: ${payload.userAgent || "-"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const tags = ["edufunds-pilot", payload.type];
  const priority = payload.type === "bug" ? 2 : 3;

  const r = await fetch(`https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task`, {
    method: "POST",
    headers: {
      Authorization: CLICKUP_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description, tags, priority }),
  });

  if (!r.ok) {
    const err = await r.text();
    console.error("[feedback] ClickUp task create failed:", r.status, err.slice(0, 300));
    return null;
  }
  const result = await r.json();
  return { id: result.id, url: result.url };
}

async function sendNotifyEmail(payload: FeedbackPayload, ticket: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const typeTitle = TYPE_TITLES[payload.type];
  const shortDesc = escapeHtml(payload.description.substring(0, 80).replace(/\n/g, " "));
  const prefix = ticket ? `${ticket} ` : "";
  const accent = payload.type === "bug" ? "#dc2626" : payload.type === "feature" ? "#c9a227" : "#1e3a61";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#0a1628}
.container{max-width:600px;margin:0 auto;padding:20px}
.header{background:${accent};color:white;padding:20px;border-radius:8px 8px 0 0}
.content{background:#f8f5f0;padding:20px;border:1px solid #e2dfd9;border-top:none;border-radius:0 0 8px 8px}
.description{background:white;padding:15px;border-radius:4px;border-left:4px solid ${accent};margin:15px 0;white-space:pre-wrap}
.meta{font-size:13px;color:#475569}
.meta td{padding:4px 12px 4px 0}
</style></head><body><div class="container">
<div class="header"><h2 style="margin:0">${prefix}Neues Feedback: ${typeTitle}</h2><p style="margin:5px 0 0;opacity:0.9">EduFunds &mdash; Pilot-Phase</p></div>
<div class="content"><div class="description">${escapeHtml(payload.description).replace(/\n/g, "<br>")}</div>
<table class="meta">
<tr><td><strong>Typ:</strong></td><td>${typeTitle}</td></tr>
${payload.context ? `<tr><td><strong>Kontext:</strong></td><td>${escapeHtml(payload.context)}</td></tr>` : ""}
<tr><td><strong>URL:</strong></td><td>${escapeHtml(payload.url || "-")}</td></tr>
${payload.sessionToken ? `<tr><td><strong>Wizard-Session:</strong></td><td><code>${escapeHtml(payload.sessionToken)}</code></td></tr>` : ""}
${payload.paidToken ? `<tr><td><strong>Paid-Token:</strong></td><td><code>${escapeHtml(payload.paidToken)}</code></td></tr>` : ""}
<tr><td><strong>Zeitpunkt:</strong></td><td>${new Date().toISOString()}</td></tr>
${payload.email ? `<tr><td><strong>Kontakt:</strong></td><td>${escapeHtml(payload.email)}</td></tr>` : '<tr><td><strong>Kontakt:</strong></td><td><em>Nicht angegeben</em></td></tr>'}
</table></div></div></body></html>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "EduFunds Feedback <noreply@aitema.de>",
      to: [NOTIFY_EMAIL],
      subject: `${prefix}[EduFunds] ${typeTitle}: ${shortDesc}`,
      html,
    }),
  });
  if (!r.ok) {
    console.error("[feedback] notify-mail failed:", r.status);
    return false;
  }
  return true;
}

async function sendConfirmEmail(payload: FeedbackPayload, ticket: string): Promise<boolean> {
  if (!payload.wantsResponse || !payload.email) return false;
  if (!RESEND_API_KEY) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return false;

  const typeTitle = TYPE_TITLES[payload.type];
  const prefix = ticket || "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#0a1628}
.container{max-width:600px;margin:0 auto;padding:20px}
.header{background:linear-gradient(135deg,#c9a227,#b8921e);color:white;padding:20px;border-radius:8px 8px 0 0}
.content{background:#f8f5f0;padding:20px;border:1px solid #e2dfd9;border-top:none;border-radius:0 0 8px 8px}
.description{background:white;padding:15px;border-radius:4px;border-left:4px solid #c9a227;margin:15px 0}
.footer{margin-top:20px;font-size:12px;color:#475569}
</style></head><body><div class="container">
<div class="header"><h2 style="margin:0">Danke für Ihr Feedback!</h2><p style="margin:5px 0 0;opacity:0.9">EduFunds${prefix ? ` &mdash; Ticket ${prefix}` : ""}</p></div>
<div class="content">
<p>Hallo,</p>
<p>wir haben Ihr Feedback erhalten und kümmern uns darum.</p>
<div class="description"><strong>${typeTitle}:</strong><br>${escapeHtml(payload.description).replace(/\n/g, "<br>")}</div>
<p>Wir melden uns bei Ihnen, sobald es Neuigkeiten gibt.</p>
<div class="footer"><p>Diese E-Mail wurde automatisch von EduFunds generiert.</p></div>
</div></div></body></html>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "EduFunds <noreply@aitema.de>",
      to: [payload.email],
      subject: `Ihr Feedback wurde empfangen: ${typeTitle}${prefix ? ` (${prefix})` : ""}`,
      html,
    }),
  });
  if (!r.ok) {
    console.error("[feedback] confirm-mail failed:", r.status);
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const v = validate(raw);
  if (!v.valid) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }
  const payload = v.payload;

  // UserAgent automatisch aus Header übernehmen, falls Client keinen mitgeschickt hat.
  if (!payload.userAgent) {
    payload.userAgent = req.headers.get("user-agent") || "unknown";
  }

  const nextNum = await getNextTicketNumber(payload.type, payload.url);
  const ticket = nextNum > 0 ? `#${String(nextNum).padStart(3, "0")}` : "";

  const [githubRes, clickupRes, notifyRes, confirmRes] = await Promise.allSettled([
    createGitHubIssue(payload, ticket),
    createClickUpTask(payload, ticket),
    sendNotifyEmail(payload, ticket),
    sendConfirmEmail(payload, ticket),
  ]);

  const github = githubRes.status === "fulfilled" ? githubRes.value : null;
  const clickup = clickupRes.status === "fulfilled" ? clickupRes.value : null;
  const notified = notifyRes.status === "fulfilled" ? notifyRes.value : false;
  const confirmed = confirmRes.status === "fulfilled" ? confirmRes.value : false;

  if (githubRes.status === "rejected") console.error("[feedback] github reject:", githubRes.reason);
  if (clickupRes.status === "rejected") console.error("[feedback] clickup reject:", clickupRes.reason);
  if (notifyRes.status === "rejected") console.error("[feedback] notify reject:", notifyRes.reason);
  if (confirmRes.status === "rejected") console.error("[feedback] confirm reject:", confirmRes.reason);

  const success = notified || github !== null || clickup !== null;

  return NextResponse.json(
    {
      success,
      ticket: ticket || null,
      githubUrl: github?.url || null,
      clickupId: clickup?.id || null,
      clickupUrl: clickup?.url || null,
      notified,
      confirmationSent: confirmed,
    },
    { status: success ? 200 : 500 }
  );
}
