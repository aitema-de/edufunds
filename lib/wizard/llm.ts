/**
 * LLM-Wrapper mit Provider-Switch.
 *
 * Wahl des Providers ueber Env-Var `LLM_PROVIDER` (default `mistral`, EU/DSGVO).
 * Unterstuetzt:
 *   - `mistral`  → Mistral API (OpenAI-kompatibel, EU-gehostet) mit mistral-small-latest (DEFAULT)
 *   - `deepseek` → DeepSeek API (OpenAI-kompatibel) mit deepseek-chat
 *   - `gemini`   → Google Gemini API mit gemini-2.5-flash
 *
 * Exports `generateJson`, `generateText`, `MODEL_INTERVIEW`, `MODEL_PIPELINE`.
 * `MODEL_INTERVIEW` und `MODEL_PIPELINE` sind die Modell-IDs, die in
 * Cost-Logs auftauchen — also provider-spezifisch konkret, nicht abstrakt.
 *
 * Hard-Timeout via `withTimeout`: jeder Aufruf ist nach 60 s tot, damit
 * SDK-interne Retry-Loops (z. B. Geminis exponentieller Backoff bei 429)
 * nicht die UI fuer Minuten blockieren. DeepSeek braucht bei groesseren
 * Prompts deutlich laenger als Gemini, daher das eher grosszuegige Limit.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type { Usage } from "./pricing";
import { scrubPiiForLlm } from "./pii-scrub";

export type LlmProvider = "deepseek" | "gemini" | "mistral";

function resolveProvider(): LlmProvider {
  const p = process.env.LLM_PROVIDER;

  // Produktion ist auf EU/EWR festgenagelt. Datenschutzerklaerung, AGB (Paragraph 9)
  // und die oeffentliche Subprozessorliste sagen zu, dass die KI-Verarbeitung den
  // EWR nicht verlaesst. Eine falsch gesetzte Env-Variable wuerde diese Zusage still
  // unwahr machen — deepseek liegt in China, gemini in den USA. Deshalb hier ein
  // harter Riegel statt eines Kommentars: lieber Startfehler als Drittlandtransfer.
  if (process.env.NODE_ENV === "production" && p && p !== "mistral") {
    throw new Error(
      `LLM_PROVIDER="${p}" ist in Produktion unzulässig: nur "mistral" (EU/EWR) ist erlaubt. ` +
        `Andere Provider würden die Zusage aus Datenschutzerklärung und AGB verletzen.`
    );
  }

  if (p === "deepseek" || p === "gemini") return p;
  // Default: Mistral (EU-gehostet, DSGVO-konform — kein Drittland-Transfer).
  // Live-Eval 2026-06-12 bestaetigte Paritaet mit DeepSeek (WIZ-01 100, WIZ-02 96,4).
  return "mistral";
}
const PROVIDER: LlmProvider = resolveProvider();

/** Modell-IDs pro Provider. Beim Wechsel wandert der Cost-Eintrag mit.
 * `deepseek-chat` route intern auf v4-flash OHNE Reasoning — `deepseek-v4-flash`
 * direkt waere ein Reasoning-Modell mit ~80 Tokens internem Denken pro Call,
 * daher massiv schneller mit `deepseek-chat`. */
export const PROVIDER_MODELS: Record<LlmProvider, { interview: string; pipeline: string }> = {
  deepseek: {
    interview: "deepseek-chat",
    pipeline: "deepseek-chat", // bewusst gleich — Flash fuer alles, kostengetrieben
  },
  gemini: {
    // 30.07.2026: `gemini-2.0-flash` von Google abgeschaltet — die API antwortet
    // 404 "This model is no longer available". Der dokumentierte Gemini-Fallback
    // war damit tot; er faellt nur nicht auf, weil Prod auf mistral festgenagelt
    // ist. Auf gemini-2.5-flash gezogen (verfuegbar geprueft, Preise in pricing.ts).
    interview: "gemini-2.5-flash",
    pipeline: "gemini-2.5-flash",
  },
  mistral: {
    // EU-gehosteter Provider (Frankreich), OpenAI-kompatible API. Small 4 ist der
    // direkte DeepSeek-Workhorse-Konkurrent (~$0.10/$0.30). `-latest` zeigt auf die
    // aktuelle Version; fuer reproduzierbare Eval-Laeufe spaeter auf eine pinned
    // Version (z. B. mistral-small-2603) umstellen.
    interview: "mistral-small-latest",
    pipeline: "mistral-small-latest",
  },
};

export const MODEL_INTERVIEW = PROVIDER_MODELS[PROVIDER].interview;
export const MODEL_PIPELINE = PROVIDER_MODELS[PROVIDER].pipeline;
/** @deprecated kompat-Re-Export — neuer Name `MODEL_INTERVIEW`. */
export const MODEL_FLASH = MODEL_INTERVIEW;
/** @deprecated kompat-Re-Export — neuer Name `MODEL_PIPELINE`. */
export const MODEL_PRO = MODEL_PIPELINE;

// Erhoehter Timeout fuer Gemini-2.5-Pro (komplexe Pipeline-Calls bis zu 90s)
// Urspruenglich 60s — war zu eng fuer Gemini-2.5-Pro bei langen Section-Generierungen.
const REQUEST_TIMEOUT_MS = 120_000;

class LlmTimeoutError extends Error {
  status = 504 as const;
  constructor(model: string) {
    super(`KI-Aufruf an ${model} hat das Zeitlimit von ${REQUEST_TIMEOUT_MS / 1000} s überschritten.`);
    this.name = "LlmTimeoutError";
  }
}

/**
 * Eine erfolgreiche, aber inhaltlich leere Modell-Antwort (kein Text). DeepSeek
 * liefert das sporadisch bei transienter Auslastung — ohne Behandlung erscheint
 * es als gueltiger Lauf mit 0 Zeichen (Probe 09.06., Fall 3). Wird als
 * retrybar behandelt.
 */
class LlmEmptyResponseError extends Error {
  status = 502 as const;
  constructor(model: string) {
    super(`KI-Aufruf an ${model} lieferte eine leere Antwort.`);
    this.name = "LlmEmptyResponseError";
  }
}

function withTimeout<T>(p: Promise<T>, model: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new LlmTimeoutError(model)), REQUEST_TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Retry-Layer
// ---------------------------------------------------------------------------
// Jeder LLM-Call ist ein Einzelversuch hinter einem Hard-Timeout. Transiente
// Ausfaelle (Timeout, 429, 5xx, ECONNRESET der DeepSeek-Verbindung, leere
// Antworten) fuehrten bisher direkt zu fehlgeschlagener Generierung bzw. einem
// 0-Zeichen-Antrag. Dieser Layer wiederholt nur die deterministisch als
// transient erkennbaren Faelle mit kurzem Backoff; nicht-transiente Fehler
// (400/401/Validation) werden sofort durchgereicht.

const MAX_LLM_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 600;

/**
 * Basis-Wartezeit nach einem 429. Bewusst zwei Groessenordnungen ueber
 * RETRY_BASE_DELAY_MS: Ein 429 ist kein Schluckauf, sondern ein erschoepftes
 * Kontingent — bei Mistral pro MINUTE (100.000 Tokens / 100 Requests). Mit
 * 600 ms Backoff sind alle drei Versuche verbraucht, bevor sich das Fenster
 * auch nur messbar nachgefuellt hat; genau daran starb Antrag 37 am 13.08.2026.
 */
const RATE_LIMIT_BASE_DELAY_MS = 15_000;
/** Obergrenze, damit ein absurdes Retry-After die Generierung nicht endlos haengen laesst. */
const RATE_LIMIT_MAX_DELAY_MS = 90_000;

export interface RetryOptions {
  /** Basis-Verzoegerung in ms (exponentieller Backoff). Tests setzen 0. */
  baseDelayMs?: number;
  /** Basis-Wartezeit nach einem 429 (s. RATE_LIMIT_BASE_DELAY_MS). Tests setzen 0. */
  rateLimitDelayMs?: number;
}

/** Liest `Retry-After` (Sekunden oder HTTP-Datum) aus einem Provider-Fehler. Exportiert fuer Tests. */
export function retryAfterMs(err: unknown): number | null {
  const h = (err as { headers?: unknown } | null)?.headers;
  if (!h) return null;
  let raw: string | null = null;
  if (typeof (h as Headers).get === "function") raw = (h as Headers).get("retry-after");
  else if (typeof h === "object") {
    const rec = h as Record<string, unknown>;
    const v = rec["retry-after"] ?? rec["Retry-After"];
    if (typeof v === "string" || typeof v === "number") raw = String(v);
  }
  if (raw === null || raw.trim() === "") return null;
  const secs = Number(raw);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

/** Ist der Fehler ein Rate-Limit (429)? Exportiert fuer Tests. */
export function isRateLimitError(err: unknown): boolean {
  if ((err as { status?: number } | null)?.status === 429) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes("429") || msg.includes("too many requests") || msg.includes("rate limit");
}

/**
 * Wartezeit fuer einen 429 — `Retry-After` schlaegt den Standardplan.
 * Gibt `null` zurueck, wenn der Fehler kein Rate-Limit ist. Exportiert fuer Tests.
 */
export function rateLimitWaitMs(err: unknown, attempt: number, baseMs = RATE_LIMIT_BASE_DELAY_MS): number | null {
  if (!isRateLimitError(err)) return null;
  const vomProvider = retryAfterMs(err);
  const geplant = baseMs * attempt; // 15 s, 30 s, …
  return Math.min(vomProvider ?? geplant, RATE_LIMIT_MAX_DELAY_MS);
}

/** Entscheidet deterministisch, ob ein Fehler einen erneuten Versuch lohnt. Exportiert fuer Tests. */
export function isRetryableLlmError(err: unknown): boolean {
  if (err instanceof LlmTimeoutError || err instanceof LlmEmptyResponseError) return true;
  const status = (err as { status?: number } | null)?.status;
  if (typeof status === "number" && (status === 429 || status >= 500)) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("timeout") ||
    msg.includes("zeitlimit") ||
    msg.includes("leere antwort") ||
    msg.includes("kein valides json") ||
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500")
  );
}

/** Fuehrt `fn` aus und wiederholt nur bei transienten Fehlern. Exportiert fuer Tests. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  model: string,
  opts: RetryOptions = {}
): Promise<T> {
  const base = opts.baseDelayMs ?? RETRY_BASE_DELAY_MS;
  const rlBase = opts.rateLimitDelayMs ?? RATE_LIMIT_BASE_DELAY_MS;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt++) {
    try {
      // Gate JE VERSUCH — vorher stand es einmal vor withRetry, sodass gerade die
      // Wiederholungen nach einem 429 ungebremst in dasselbe Limit liefen.
      await rateGate();
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= MAX_LLM_ATTEMPTS || !isRetryableLlmError(err)) throw err;
      const rlDelay = rateLimitWaitMs(err, attempt, rlBase);
      const delay = rlDelay ?? base * 2 ** (attempt - 1);
      // Bei 429 die globale Sperre setzen: Auch parallele Pipelines muessen warten,
      // sonst halten sie das Minuten-Kontingent gemeinsam leer.
      if (rlDelay !== null) noteRateLimit(rlDelay);
      console.warn(
        `[wizard/llm] ${model} Versuch ${attempt}/${MAX_LLM_ATTEMPTS} fehlgeschlagen ` +
          `(${err instanceof Error ? err.message : String(err)}) — neuer Versuch in ${delay} ms` +
          (rlDelay !== null ? " [Rate-Limit, globale Sperre gesetzt]" : "")
      );
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Optionaler Client-seitiger Rate-Limiter
// ---------------------------------------------------------------------------
// Erzwingt einen Mindestabstand zwischen ausgehenden Requests. Default 0 (AUS)
// → kein Effekt auf DeepSeek/Production und den bewaehrten Pfad. Sinnvoll gegen
// 429 bei knapp limitierten Tarifen (z. B. Mistral Free-/Experiment-Tier ~1 req/s):
//   LLM_MIN_REQUEST_INTERVAL_MS=1100
// Serialisiert alle generate*-Aufrufe ueber eine Promise-Kette und haelt den
// Abstand auch unter Nebenlaeufigkeit (viele Pipelines parallel) ein.
const MIN_REQUEST_INTERVAL_MS = Math.max(0, Number(process.env.LLM_MIN_REQUEST_INTERVAL_MS) || 0);
let rateChain: Promise<void> = Promise.resolve();
let lastRequestStart = 0;

/**
 * Globale Sperre nach einem 429. Bis zu diesem Zeitpunkt geht KEIN Aufruf raus —
 * auch nicht aus einer anderen, parallel laufenden Pipeline.
 *
 * Warum global und nicht pro Aufruf: Mistrals bindendes Limit ist ein
 * MINUTEN-Kontingent (x-ratelimit-limit-tokens-minute, 100.000). Ist es leer,
 * laeuft JEDER weitere Call der Pipeline in denselben 429 — ein Backoff, der nur
 * den einzelnen Aufruf bremst, wandert dann nur von Stufe zu Stufe weiter. Erst
 * eine gemeinsame Pause laesst das Kontingent tatsaechlich nachfuellen.
 *
 * Sichtbar geworden am 13.08.2026: Antrag 37 auf pilot.edufunds.org starb nach
 * 6 geschriebenen Abschnitten am 429, weil die drei Versuche mit 600/1200 ms
 * Backoff zusammen in gut zwei Sekunden verbrannt waren.
 */
let cooldownUntil = 0;

/** Meldet ein erkanntes Rate-Limit an die globale Sperre (nur verlaengern, nie verkuerzen). */
function noteRateLimit(waitMs: number): void {
  const until = Date.now() + waitMs;
  if (until > cooldownUntil) cooldownUntil = until;
}

/** Nur fuer Tests: Sperre zuruecksetzen bzw. auslesen. */
export function _resetRateLimitCooldown(): void {
  cooldownUntil = 0;
}
export function _rateLimitCooldownMs(): number {
  return Math.max(0, cooldownUntil - Date.now());
}

function rateGate(): Promise<void> {
  if (MIN_REQUEST_INTERVAL_MS <= 0 && cooldownUntil <= Date.now()) return Promise.resolve();
  const next = rateChain.then(async () => {
    // Erst die globale 429-Sperre abwarten, dann den optionalen Mindestabstand.
    const cool = cooldownUntil - Date.now();
    if (cool > 0) await new Promise((r) => setTimeout(r, cool));
    const wait = lastRequestStart + MIN_REQUEST_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestStart = Date.now();
  });
  rateChain = next.catch(() => undefined);
  return next;
}

export interface LlmResult<T> {
  value: T;
  usage: Usage;
}

export interface LlmOptions {
  /** Hard-Cap fuer Output-Tokens. DeepSeek-Latenz ist linear in Output-Laenge —
   * fuer kurze, gerankte Antworten (Matcher) lohnt es sich, hier eng zu setzen. */
  maxTokens?: number;
  /** Sampling-Temperatur. Default = Provider-Default (>0, nicht-deterministisch).
   * Fuer reproduzierbare Ergebnisse (z. B. Matching-Scores) auf 0 setzen. */
  temperature?: number;
}

// ---------------------------------------------------------------------------
// Provider: DeepSeek (OpenAI-kompatibel)
// ---------------------------------------------------------------------------

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
let deepseekClient: OpenAI | null = null;
function getDeepseek(): OpenAI {
  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      apiKey: DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
  }
  return deepseekClient;
}

async function deepseekGenerateJson<T>(model: string, system: string, user: string, opts: LlmOptions): Promise<LlmResult<T>> {
  const res = await withTimeout(
    getDeepseek().chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    }),
    model
  );
  const text = (res.choices[0]?.message?.content ?? "").trim();
  const usage: Usage = {
    promptTokens: res.usage?.prompt_tokens ?? 0,
    candidatesTokens: res.usage?.completion_tokens ?? 0,
  };
  try {
    return { value: JSON.parse(text) as T, usage };
  } catch {
    throw new Error(`DeepSeek lieferte kein valides JSON (${model}): ${text.slice(0, 300)}`);
  }
}

async function deepseekGenerateText(model: string, system: string, user: string, opts: LlmOptions): Promise<LlmResult<string>> {
  const res = await withTimeout(
    getDeepseek().chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    }),
    model
  );
  const text = (res.choices[0]?.message?.content ?? "").trim();
  if (!text) throw new LlmEmptyResponseError(model);
  const usage: Usage = {
    promptTokens: res.usage?.prompt_tokens ?? 0,
    candidatesTokens: res.usage?.completion_tokens ?? 0,
  };
  return { value: text, usage };
}

// ---------------------------------------------------------------------------
// Provider: Mistral (OpenAI-kompatibel, EU-gehostet)
// ---------------------------------------------------------------------------
// EU-Alternative (Frankreich): EU-Verarbeitung als Default, AVV/DPA, kein
// Training auf API-Daten, Zero-Retention zuschaltbar. API ist OpenAI-kompatibel
// (api.mistral.ai/v1) — wir nutzen denselben OpenAI-Client wie DeepSeek, nur mit
// anderer baseURL + Key. Aktivierung ueber LLM_PROVIDER=mistral (nicht-breaking,
// Default bleibt deepseek).

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? "";
let mistralClient: OpenAI | null = null;
function getMistral(): OpenAI {
  if (!mistralClient) {
    mistralClient = new OpenAI({
      apiKey: MISTRAL_API_KEY,
      baseURL: "https://api.mistral.ai/v1",
    });
  }
  return mistralClient;
}

async function mistralGenerateJson<T>(model: string, system: string, user: string, opts: LlmOptions): Promise<LlmResult<T>> {
  const res = await withTimeout(
    getMistral().chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    }),
    model
  );
  const text = (res.choices[0]?.message?.content ?? "").trim();
  const usage: Usage = {
    promptTokens: res.usage?.prompt_tokens ?? 0,
    candidatesTokens: res.usage?.completion_tokens ?? 0,
  };
  try {
    return { value: JSON.parse(text) as T, usage };
  } catch {
    throw new Error(`Mistral lieferte kein valides JSON (${model}): ${text.slice(0, 300)}`);
  }
}

async function mistralGenerateText(model: string, system: string, user: string, opts: LlmOptions): Promise<LlmResult<string>> {
  const res = await withTimeout(
    getMistral().chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    }),
    model
  );
  const text = (res.choices[0]?.message?.content ?? "").trim();
  if (!text) throw new LlmEmptyResponseError(model);
  const usage: Usage = {
    promptTokens: res.usage?.prompt_tokens ?? 0,
    candidatesTokens: res.usage?.completion_tokens ?? 0,
  };
  return { value: text, usage };
}

// ---------------------------------------------------------------------------
// Provider: Google Gemini
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
let geminiClient: GoogleGenerativeAI | null = null;
function getGemini(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return geminiClient;
}

function extractGeminiUsage(response: {
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}): Usage {
  return {
    promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
    candidatesTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

async function geminiGenerateJson<T>(model: string, system: string, user: string, opts: LlmOptions): Promise<LlmResult<T>> {
  const gm = getGemini().getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig: {
      responseMimeType: "application/json",
      ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
    },
  });
  const res = await withTimeout(gm.generateContent(user), model);
  const text = res.response.text().trim();
  const usage = extractGeminiUsage(res.response);
  try {
    return { value: JSON.parse(text) as T, usage };
  } catch {
    throw new Error(`Gemini lieferte kein valides JSON (${model}): ${text.slice(0, 300)}`);
  }
}

async function geminiGenerateText(model: string, system: string, user: string, opts: LlmOptions): Promise<LlmResult<string>> {
  const gm = getGemini().getGenerativeModel({
    model,
    systemInstruction: system,
    ...(opts.maxTokens ? { generationConfig: { maxOutputTokens: opts.maxTokens } } : {}),
  });
  const res = await withTimeout(gm.generateContent(user), model);
  const usage = extractGeminiUsage(res.response);
  const text = res.response.text().trim();
  if (!text) throw new LlmEmptyResponseError(model);
  return { value: text, usage };
}

// ---------------------------------------------------------------------------
// Public API — Provider-Dispatch
// ---------------------------------------------------------------------------

/**
 * Datenminimierung am Dritt-Land-Transfer: bevor Nutzer-Freitext den EU-DB-Host
 * verlaesst, werden hochpraezise personenbezogene Identifikatoren (E-Mail/Tel/IBAN)
 * aus dem `user`-Prompt entfernt (lib/wizard/pii-scrub.ts). System-Prompt bleibt
 * unangetastet (rein eigene Instruktion, kein Nutzer-PII).
 */
function minimize(user: string, model: string): string {
  const { text, redactions } = scrubPiiForLlm(user);
  if (redactions > 0 && process.env.NODE_ENV !== "test") {
    console.warn(
      `[wizard/llm] Datenminimierung: ${redactions} personenbezogene(r) Identifikator(en) vor Versand an ${model} entfernt.`
    );
  }
  return text;
}

export async function generateJson<T>(model: string, system: string, user: string, opts: LlmOptions = {}): Promise<LlmResult<T>> {
  const safeUser = minimize(user, model);
  return withRetry(
    () =>
      PROVIDER === "gemini"
        ? geminiGenerateJson<T>(model, system, safeUser, opts)
        : PROVIDER === "mistral"
          ? mistralGenerateJson<T>(model, system, safeUser, opts)
          : deepseekGenerateJson<T>(model, system, safeUser, opts),
    model
  );
}

export async function generateText(model: string, system: string, user: string, opts: LlmOptions = {}): Promise<LlmResult<string>> {
  const safeUser = minimize(user, model);
  return withRetry(
    () =>
      PROVIDER === "gemini"
        ? geminiGenerateText(model, system, safeUser, opts)
        : PROVIDER === "mistral"
          ? mistralGenerateText(model, system, safeUser, opts)
          : deepseekGenerateText(model, system, safeUser, opts),
    model
  );
}

// ---------------------------------------------------------------------------
// Boot-Sanity-Check
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV !== "test") {
  if (PROVIDER === "deepseek" && !DEEPSEEK_API_KEY) {
    console.warn("[wizard/llm] LLM_PROVIDER=deepseek aktiv, aber DEEPSEEK_API_KEY ist leer — KI-Calls werden 401 zurückgeben.");
  } else if (PROVIDER === "gemini" && !GEMINI_API_KEY) {
    console.warn("[wizard/llm] LLM_PROVIDER=gemini aktiv, aber GEMINI_API_KEY ist leer — KI-Calls werden 401 zurückgeben.");
  } else if (PROVIDER === "mistral" && !MISTRAL_API_KEY) {
    console.warn("[wizard/llm] LLM_PROVIDER=mistral aktiv, aber MISTRAL_API_KEY ist leer — KI-Calls werden 401 zurückgeben.");
  }
}
