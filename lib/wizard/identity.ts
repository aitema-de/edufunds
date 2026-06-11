/**
 * Autor-Identität + Magic-Link-Resume (B4).
 *
 * Passwortlose, geräteübergreifende Identität als EIN Primitiv (D-5):
 *   - Ein Antrag wird (opt-in) per `author_email` an eine E-Mail gebunden
 *     — UNVERIFIZIERT (Binden allein gibt nichts preis).
 *   - Der Besitz der E-Mail wird durch einen Magic-Link nachgewiesen
 *     (single-use, kurzlebig). Erst danach gibt ein signierter Cookie die
 *     geräteübergreifende Liste „Meine Anträge" frei.
 *
 * Der Identity-Cookie ist ein selbst-signiertes Token (HMAC-SHA256 über
 * JWT_SECRET) — kein Auth-System, keine Sessions in der DB.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { query } from "@/lib/db";

export const IDENTITY_COOKIE = "edufunds_identity";
const COOKIE_TTL_DAYS = 30;
const MAGIC_TTL_MINUTES = 30;

/** Cookie-Lebensdauer in Sekunden (fuer Set-Cookie maxAge). */
export const COOKIE_MAX_AGE_SECONDS = COOKIE_TTL_DAYS * 24 * 60 * 60;

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET fehlt oder ist zu kurz (>= 16 Zeichen erforderlich)");
  }
  return s;
}

/** Ist die Identitaets-Funktion ueberhaupt konfiguriert? (Routen -> 503 sonst). */
export function identityConfigured(): boolean {
  const s = process.env.JWT_SECRET;
  return !!s && s.length >= 16;
}

/** Normalisiert E-Mails fuer Speicherung/Vergleich (trim + lowercase). */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(payload: string): string {
  return b64url(createHmac("sha256", secret()).update(payload).digest());
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Signiert eine verifizierte E-Mail als Cookie-Wert: `<payload>.<hmac>`.
 * payload = base64url(JSON{ email, exp }).
 */
export function signIdentity(email: string, now: number = Date.now()): string {
  const exp = now + COOKIE_MAX_AGE_SECONDS * 1000;
  const payload = b64url(JSON.stringify({ email: normalizeEmail(email), exp }));
  return `${payload}.${hmac(payload)}`;
}

/** Prueft den Cookie-Wert und liefert die E-Mail oder null (ungueltig/abgelaufen). */
export function verifyIdentity(
  cookieValue: string | null | undefined,
  now: number = Date.now()
): { email: string } | null {
  if (!cookieValue || !cookieValue.includes(".")) return null;
  const idx = cookieValue.lastIndexOf(".");
  const payload = cookieValue.slice(0, idx);
  const sig = cookieValue.slice(idx + 1);
  let expected: string;
  try {
    expected = hmac(payload);
  } catch {
    return null; // Secret fehlt
  }
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.email !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < now) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

/** Legt einen einmalig einloesbaren Magic-Link-Token an und gibt ihn zurueck. */
export async function createMagicLink(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex"); // 64 hex-Zeichen
  const expiresAt = new Date(Date.now() + MAGIC_TTL_MINUTES * 60 * 1000).toISOString();
  await query(
    `INSERT INTO magic_links (email, token, expires_at) VALUES ($1, $2, $3)`,
    [normalizeEmail(email), token, expiresAt]
  );
  return token;
}

/**
 * Loest einen Magic-Link atomar ein (single-use, nicht abgelaufen). Liefert die
 * E-Mail oder null. Das UPDATE-mit-Guard garantiert, dass ein Token genau einmal
 * gilt — auch bei parallelen Klicks.
 */
export async function consumeMagicLink(token: string): Promise<{ email: string } | null> {
  const res = await query<{ email: string }>(
    `UPDATE magic_links
       SET used_at = CURRENT_TIMESTAMP
     WHERE token = $1
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     RETURNING email`,
    [token]
  );
  if (res.rowCount === 1) return { email: res.rows[0].email };
  return null;
}

/** Bindet einen Antrag (opt-in) an die E-Mail des Autors. */
export async function bindAuthorEmail(
  sessionToken: string,
  email: string
): Promise<boolean> {
  const res = await query(
    `UPDATE ki_antraege
       SET author_email = $1, updated_at = CURRENT_TIMESTAMP
     WHERE session_token = $2`,
    [normalizeEmail(email), sessionToken]
  );
  return (res.rowCount ?? 0) > 0;
}

export interface AuthorSession {
  sessionToken: string;
  programmId: string;
  programmName: string;
  status: string;
  phase: string | null;
  paid: boolean;
  updatedAt: string;
}

/** Listet alle an eine E-Mail gebundenen Anträge (neueste zuerst). */
export async function listSessionsByEmail(email: string): Promise<AuthorSession[]> {
  const res = await query<{
    session_token: string;
    foerderprogramm_id: string;
    foerderprogramm_name: string;
    status: string;
    phase: string | null;
    paid: boolean;
    updated_at: Date;
  }>(
    `SELECT session_token, foerderprogramm_id, foerderprogramm_name, status,
            antrag_data->>'phase' AS phase,
            (paid_token IS NOT NULL) AS paid,
            updated_at
       FROM ki_antraege
      WHERE author_email = $1
      ORDER BY updated_at DESC`,
    [normalizeEmail(email)]
  );
  return res.rows.map((r) => ({
    sessionToken: r.session_token,
    programmId: r.foerderprogramm_id,
    programmName: r.foerderprogramm_name,
    status: r.status,
    phase: r.phase,
    paid: r.paid,
    updatedAt: r.updated_at.toISOString(),
  }));
}
