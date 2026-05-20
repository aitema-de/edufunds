/**
 * LLM-Wrapper mit Provider-Switch.
 *
 * Wahl des Providers ueber Env-Var `LLM_PROVIDER` (default `deepseek`).
 * Unterstuetzt:
 *   - `deepseek` → DeepSeek API (OpenAI-kompatibel) mit deepseek-v4-flash
 *   - `gemini`   → Google Gemini API mit gemini-2.0-flash + gemini-2.5-pro
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

export type LlmProvider = "deepseek" | "gemini";

const PROVIDER: LlmProvider =
  (process.env.LLM_PROVIDER as LlmProvider) === "gemini" ? "gemini" : "deepseek";

/** Modell-IDs pro Provider. Beim Wechsel wandert der Cost-Eintrag mit.
 * `deepseek-chat` route intern auf v4-flash OHNE Reasoning — `deepseek-v4-flash`
 * direkt waere ein Reasoning-Modell mit ~80 Tokens internem Denken pro Call,
 * daher massiv schneller mit `deepseek-chat`. */
const MODELS: Record<LlmProvider, { interview: string; pipeline: string }> = {
  deepseek: {
    interview: "deepseek-chat",
    pipeline: "deepseek-chat", // bewusst gleich — Flash fuer alles, kostengetrieben
  },
  gemini: {
    interview: "gemini-2.0-flash",
    // gemini-2.5-pro auf gemini-2.0-flash herabgestuft fuer Baseline-Eval-Run:
    // 2026-05-20 503 Service Unavailable wegen hoher Nachfrage auf gemini-2.5-pro.
    // Wave-3-Tuning-Iterationen werden mit identischer Konfiguration verglichen.
    pipeline: "gemini-2.0-flash",
  },
};

export const MODEL_INTERVIEW = MODELS[PROVIDER].interview;
export const MODEL_PIPELINE = MODELS[PROVIDER].pipeline;
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
    super(`KI-Aufruf an ${model} hat das Zeitlimit von ${REQUEST_TIMEOUT_MS / 1000} s ueberschritten.`);
    this.name = "LlmTimeoutError";
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

export interface LlmResult<T> {
  value: T;
  usage: Usage;
}

export interface LlmOptions {
  /** Hard-Cap fuer Output-Tokens. DeepSeek-Latenz ist linear in Output-Laenge —
   * fuer kurze, gerankte Antworten (Matcher) lohnt es sich, hier eng zu setzen. */
  maxTokens?: number;
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
    }),
    model
  );
  const text = (res.choices[0]?.message?.content ?? "").trim();
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
  return { value: res.response.text().trim(), usage };
}

// ---------------------------------------------------------------------------
// Public API — Provider-Dispatch
// ---------------------------------------------------------------------------

export async function generateJson<T>(model: string, system: string, user: string, opts: LlmOptions = {}): Promise<LlmResult<T>> {
  return PROVIDER === "deepseek"
    ? deepseekGenerateJson<T>(model, system, user, opts)
    : geminiGenerateJson<T>(model, system, user, opts);
}

export async function generateText(model: string, system: string, user: string, opts: LlmOptions = {}): Promise<LlmResult<string>> {
  return PROVIDER === "deepseek"
    ? deepseekGenerateText(model, system, user, opts)
    : geminiGenerateText(model, system, user, opts);
}

// ---------------------------------------------------------------------------
// Boot-Sanity-Check
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV !== "test") {
  if (PROVIDER === "deepseek" && !DEEPSEEK_API_KEY) {
    console.warn("[wizard/llm] LLM_PROVIDER=deepseek aktiv, aber DEEPSEEK_API_KEY ist leer — KI-Calls werden 401 zurueckgeben.");
  } else if (PROVIDER === "gemini" && !GEMINI_API_KEY) {
    console.warn("[wizard/llm] LLM_PROVIDER=gemini aktiv, aber GEMINI_API_KEY ist leer — KI-Calls werden 401 zurueckgeben.");
  }
}
