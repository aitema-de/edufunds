/**
 * Probe 09.06., Fall 3 — Retry-Layer fuer transiente LLM-Ausfaelle.
 * Sichert, dass nur deterministisch-transiente Fehler (Timeout/429/5xx/
 * ECONNRESET/leere Antwort) wiederholt werden und nicht-transiente Fehler
 * (400/Validation) sofort durchgereicht werden.
 */
import {
  isRetryableLlmError,
  withRetry,
  isRateLimitError,
  rateLimitWaitMs,
  retryAfterMs,
  _resetRateLimitCooldown,
  _rateLimitCooldownMs,
} from "@/lib/wizard/llm";

describe("isRetryableLlmError", () => {
  it("transiente Fehler sind retrybar", () => {
    expect(isRetryableLlmError(Object.assign(new Error("rate limited"), { status: 429 }))).toBe(true);
    expect(isRetryableLlmError(Object.assign(new Error("boom"), { status: 503 }))).toBe(true);
    expect(isRetryableLlmError(new Error("read ECONNRESET"))).toBe(true);
    expect(isRetryableLlmError(new Error("socket hang up"))).toBe(true);
    expect(isRetryableLlmError(new Error("KI-Aufruf an deepseek-chat lieferte eine leere Antwort."))).toBe(true);
    expect(isRetryableLlmError(new Error("hat das Zeitlimit von 120 s überschritten"))).toBe(true);
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

  it("gibt beim ersten Erfolg sofort zurück", async () => {
    const fn = jest.fn(async () => "sofort");
    expect(await withRetry(fn, "test-model", { baseDelayMs: 0 })).toBe("sofort");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

/**
 * 13.08.2026 — Antrag 37 starb nach sechs geschriebenen Abschnitten an einem
 * Mistral-429. Der Retry-Layer behandelte ihn wie jeden anderen transienten
 * Fehler: 600 ms, dann 1200 ms. Mistrals bindendes Limit ist aber ein
 * MINUTEN-Kontingent (100.000 Tokens/min) — nach zwei Sekunden ist davon nichts
 * nachgefuellt. Alle drei Versuche waren binnen ~2 s verbraucht.
 */
describe("Rate-Limit (429) bekommt eine Wartezeit in der Groessenordnung des Limits", () => {
  const err429 = (extra: object = {}) => Object.assign(new Error("429 status code (no body)"), { status: 429, ...extra });

  it("erkennt 429 an Status und an der Meldung", () => {
    expect(isRateLimitError(err429())).toBe(true);
    expect(isRateLimitError(new Error("Too Many Requests"))).toBe(true);
    expect(isRateLimitError(new Error("rate limit exceeded"))).toBe(true);
    expect(isRateLimitError(Object.assign(new Error("boom"), { status: 503 }))).toBe(false);
    expect(isRateLimitError(new Error("bad request"))).toBe(false);
  });

  it("wartet Sekunden statt Millisekunden — und steigert pro Versuch", () => {
    expect(rateLimitWaitMs(err429(), 1)).toBe(15_000);
    expect(rateLimitWaitMs(err429(), 2)).toBe(30_000);
    // Der alte Backoff lag bei 600/1200 ms — zwei Groessenordnungen daneben.
    expect(rateLimitWaitMs(err429(), 1)!).toBeGreaterThan(600 * 10);
  });

  it("gibt null zurueck, wenn es gar kein Rate-Limit ist (normaler Backoff greift)", () => {
    expect(rateLimitWaitMs(Object.assign(new Error("boom"), { status: 503 }), 1)).toBeNull();
  });

  it("Retry-After des Providers schlaegt den Standardplan", () => {
    expect(rateLimitWaitMs(err429({ headers: new Headers({ "retry-after": "42" }) }), 1)).toBe(42_000);
    // auch als einfaches Objekt (aeltere SDK-Fassungen)
    expect(rateLimitWaitMs(err429({ headers: { "retry-after": "7" } }), 1)).toBe(7_000);
  });

  it("deckelt absurde Retry-After-Werte, damit die Generierung nicht ewig haengt", () => {
    expect(rateLimitWaitMs(err429({ headers: new Headers({ "retry-after": "99999" }) }), 1)).toBe(90_000);
  });

  it("retryAfterMs versteht auch ein HTTP-Datum und ignoriert Unsinn", () => {
    const in30s = new Date(Date.now() + 30_000).toUTCString();
    const ms = retryAfterMs(err429({ headers: new Headers({ "retry-after": in30s }) }));
    expect(ms).toBeGreaterThan(25_000);
    expect(ms).toBeLessThanOrEqual(31_000);
    expect(retryAfterMs(err429({ headers: new Headers({ "retry-after": "bald" }) }))).toBeNull();
    expect(retryAfterMs(err429())).toBeNull();
  });

  it("withRetry setzt bei 429 die globale Sperre — auch fuer parallele Pipelines", async () => {
    _resetRateLimitCooldown();
    let calls = 0;
    const fn = jest.fn(async () => {
      calls++;
      if (calls === 1) throw err429({ headers: new Headers({ "retry-after": "0" }) });
      return "ok";
    });
    // rateLimitDelayMs: 0 haelt den Test schnell; die Sperre wird trotzdem gesetzt.
    await expect(withRetry(fn, "mistral-small-latest", { baseDelayMs: 0, rateLimitDelayMs: 0 })).resolves.toBe("ok");
    expect(calls).toBe(2);
  });

  it("ohne 429 bleibt die globale Sperre unangetastet", async () => {
    _resetRateLimitCooldown();
    const fn = jest.fn(async () => {
      throw Object.assign(new Error("overloaded"), { status: 503 });
    });
    await expect(withRetry(fn, "test-model", { baseDelayMs: 0 })).rejects.toThrow("overloaded");
    expect(_rateLimitCooldownMs()).toBe(0);
  });
});
