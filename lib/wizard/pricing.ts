/**
 * Preismodell für LLM-Calls (Stand April 2026, USD pro 1 Mio Tokens).
 * Konvertierung zu EUR per Wechselkurs-Konstante.
 *
 * Quellen-Hinweis: Anbieter aendern Preise ohne Migration. Wenn die Live-
 * Abrechnung im Provider-Dashboard von unseren Zahlen abweicht, hier
 * nachziehen — wir berechnen eine Schaetzung, keine Abrechnung.
 *
 * Gemini Paid Tier:
 *   - gemini-2.0-flash: $0.075 / $0.30
 *   - gemini-2.5-pro:   $1.25 / $10
 *
 * DeepSeek API (cache-miss-Preise, ohne Promo):
 *   - deepseek-chat:     $0.14  / $0.28  (= v4-flash ohne Reasoning)
 *   - deepseek-v4-flash: $0.14  / $0.28  (mit Reasoning — wir nutzen es nicht)
 *   - deepseek-v4-pro:   $1.74  / $3.48
 *     (Pro hat Promo bis 05.05.2026: $0.435 / $0.87 — wir
 *      tracken hier konservativ den regulaeren Preis.)
 */

export interface ModelPrice {
  inputPerMTokens: number;
  outputPerMTokens: number;
}

const USD_PER_M_TOKENS: Record<string, ModelPrice> = {
  "gemini-2.0-flash": { inputPerMTokens: 0.075, outputPerMTokens: 0.3 },
  "gemini-2.5-pro": { inputPerMTokens: 1.25, outputPerMTokens: 10 },
  "deepseek-chat": { inputPerMTokens: 0.14, outputPerMTokens: 0.28 },
  "deepseek-v4-flash": { inputPerMTokens: 0.14, outputPerMTokens: 0.28 },
  "deepseek-v4-pro": { inputPerMTokens: 1.74, outputPerMTokens: 3.48 },
};

const USD_TO_EUR = 0.92;

export interface Usage {
  promptTokens: number;
  candidatesTokens: number;
}

export interface CostLedgerEntry {
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  usdCents: number;
}

export interface CostLedger {
  calls: number;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  usdCents: number;
  eurCents: number;
  entries: CostLedgerEntry[];
}

export function emptyLedger(): CostLedger {
  return {
    calls: 0,
    promptTokens: 0,
    candidatesTokens: 0,
    totalTokens: 0,
    usdCents: 0,
    eurCents: 0,
    entries: [],
  };
}

export function computeUsdCents(model: string, usage: Usage): number {
  const price = USD_PER_M_TOKENS[model];
  if (!price) return 0;
  const usdInput = (usage.promptTokens / 1_000_000) * price.inputPerMTokens;
  const usdOutput = (usage.candidatesTokens / 1_000_000) * price.outputPerMTokens;
  return Math.round((usdInput + usdOutput) * 10000) / 100; // cents with 2 decimals
}

export function addUsage(
  ledger: CostLedger,
  model: string,
  usage: Usage
): CostLedger {
  const usdCents = computeUsdCents(model, usage);
  return {
    calls: ledger.calls + 1,
    promptTokens: ledger.promptTokens + usage.promptTokens,
    candidatesTokens: ledger.candidatesTokens + usage.candidatesTokens,
    totalTokens: ledger.totalTokens + usage.promptTokens + usage.candidatesTokens,
    usdCents: Math.round((ledger.usdCents + usdCents) * 100) / 100,
    eurCents: Math.round((ledger.eurCents + usdCents * USD_TO_EUR) * 100) / 100,
    entries: [...ledger.entries, { model, ...usage, usdCents }],
  };
}

export function formatEur(eurCents: number): string {
  const euros = eurCents / 100;
  if (euros < 0.01) return "< 0,01 €";
  return euros.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}
