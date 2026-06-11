/**
 * Probe 09.06., Fall 3 — Retry-Layer fuer transiente LLM-Ausfaelle.
 * Sichert, dass nur deterministisch-transiente Fehler (Timeout/429/5xx/
 * ECONNRESET/leere Antwort) wiederholt werden und nicht-transiente Fehler
 * (400/Validation) sofort durchgereicht werden.
 */
import { isRetryableLlmError, withRetry } from "@/lib/wizard/llm";

describe("isRetryableLlmError", () => {
  it("transiente Fehler sind retrybar", () => {
    expect(isRetryableLlmError(Object.assign(new Error("rate limited"), { status: 429 }))).toBe(true);
    expect(isRetryableLlmError(Object.assign(new Error("boom"), { status: 503 }))).toBe(true);
    expect(isRetryableLlmError(new Error("read ECONNRESET"))).toBe(true);
    expect(isRetryableLlmError(new Error("socket hang up"))).toBe(true);
    expect(isRetryableLlmError(new Error("KI-Aufruf an deepseek-chat lieferte eine leere Antwort."))).toBe(true);
    expect(isRetryableLlmError(new Error("hat das Zeitlimit von 120 s ueberschritten"))).toBe(true);
    expect(isRetryableLlmError(new Error("DeepSeek lieferte kein valides JSON"))).toBe(true);
    expect(isRetryableLlmError(new Error("model is overloaded"))).toBe(true);
  });

  it("nicht-transiente Fehler sind NICHT retrybar", () => {
    expect(isRetryableLlmError(Object.assign(new Error("bad request"), { status: 400 }))).toBe(false);
    expect(isRetryableLlmError(Object.assign(new Error("unauthorized"), { status: 401 }))).toBe(false);
    expect(isRetryableLlmError(new Error("Eingabe zu kurz"))).toBe(false);
    expect(isRetryableLlmError(null)).toBe(false);
  });
});

describe("withRetry", () => {
  it("wiederholt transiente Fehler bis zum Erfolg", async () => {
    let calls = 0;
    const fn = jest.fn(async () => {
      calls++;
      if (calls < 3) throw Object.assign(new Error("overloaded"), { status: 503 });
      return "ok";
    });
    const result = await withRetry(fn, "test-model", { baseDelayMs: 0 });
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("gibt nach MAX_ATTEMPTS auf und wirft den letzten Fehler", async () => {
    const fn = jest.fn(async () => {
      throw Object.assign(new Error("still overloaded"), { status: 503 });
    });
    await expect(withRetry(fn, "test-model", { baseDelayMs: 0 })).rejects.toThrow("still overloaded");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("reicht nicht-transiente Fehler sofort durch (kein Retry)", async () => {
    const fn = jest.fn(async () => {
      throw Object.assign(new Error("bad request"), { status: 400 });
    });
    await expect(withRetry(fn, "test-model", { baseDelayMs: 0 })).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gibt beim ersten Erfolg sofort zurueck", async () => {
    const fn = jest.fn(async () => "sofort");
    expect(await withRetry(fn, "test-model", { baseDelayMs: 0 })).toBe("sofort");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
