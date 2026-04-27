import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Usage } from "./pricing";

const API_KEY = process.env.GEMINI_API_KEY ?? "";

if (!API_KEY && process.env.NODE_ENV !== "test") {
  console.warn("[wizard/gemini] GEMINI_API_KEY ist leer — KI-Calls schlagen fehl.");
}

const client = new GoogleGenerativeAI(API_KEY);

export const MODEL_FLASH = "gemini-2.0-flash";
export const MODEL_PRO = "gemini-2.5-pro";

/** Hard-Timeout fuer einen einzelnen Gemini-Call. Verhindert, dass die
 *  interne Retry-Logik des SDK (exp. Backoff bei 429) zu Wartezeiten
 *  von >2 min fuehrt — damit blockiert die UI nicht stillschweigend. */
const REQUEST_TIMEOUT_MS = 30_000;

class GeminiTimeoutError extends Error {
  status = 504 as const;
  constructor(model: string) {
    super(`Gemini-Aufruf an ${model} hat das Zeitlimit von ${REQUEST_TIMEOUT_MS / 1000} s ueberschritten.`);
    this.name = "GeminiTimeoutError";
  }
}

function withTimeout<T>(p: Promise<T>, model: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new GeminiTimeoutError(model)), REQUEST_TIMEOUT_MS);
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

function extractUsage(response: {
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}): Usage {
  return {
    promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
    candidatesTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

export async function generateJson<T>(
  model: string,
  system: string,
  user: string
): Promise<LlmResult<T>> {
  const gm = client.getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig: { responseMimeType: "application/json" },
  });
  const res = await withTimeout(gm.generateContent(user), model);
  const text = res.response.text().trim();
  const usage = extractUsage(res.response);
  try {
    return { value: JSON.parse(text) as T, usage };
  } catch {
    throw new Error(
      `Gemini lieferte kein valides JSON (${model}): ${text.slice(0, 300)}`
    );
  }
}

export async function generateText(
  model: string,
  system: string,
  user: string
): Promise<LlmResult<string>> {
  const gm = client.getGenerativeModel({ model, systemInstruction: system });
  const res = await withTimeout(gm.generateContent(user), model);
  const usage = extractUsage(res.response);
  return { value: res.response.text().trim(), usage };
}
