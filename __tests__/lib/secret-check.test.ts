/**
 * Runtime-Secret-Prüfung (Go-Live-Härtung). Reine Logik gegen einen manipulierten
 * process.env — keine echten Secrets nötig.
 */
import { missingProductionSecrets, providerKeyName } from "@/lib/secret-check";

const ALL_SET: Record<string, string> = {
  DATABASE_URL: "postgres://x",
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  CRON_SECRET: "cron_x",
  ADMIN_PASSWORD_HASH: "$2a$12$hash",
  MISTRAL_API_KEY: "mk_x",
};

describe("providerKeyName", () => {
  const orig = process.env.LLM_PROVIDER;
  afterEach(() => {
    if (orig === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = orig;
  });

  it("defaultet auf MISTRAL_API_KEY (EU)", () => {
    delete process.env.LLM_PROVIDER;
    expect(providerKeyName()).toBe("MISTRAL_API_KEY");
    process.env.LLM_PROVIDER = "mistral";
    expect(providerKeyName()).toBe("MISTRAL_API_KEY");
  });
  it("mappt deepseek/gemini korrekt", () => {
    process.env.LLM_PROVIDER = "deepseek";
    expect(providerKeyName()).toBe("DEEPSEEK_API_KEY");
    process.env.LLM_PROVIDER = "gemini";
    expect(providerKeyName()).toBe("GEMINI_API_KEY");
  });
});

describe("missingProductionSecrets", () => {
  const snapshot = { ...process.env };
  afterEach(() => {
    process.env = { ...snapshot };
  });

  const applyEnv = (env: Record<string, string>) => {
    for (const k of [...Object.keys(ALL_SET), "DEEPSEEK_API_KEY", "GEMINI_API_KEY", "LLM_PROVIDER"]) {
      delete process.env[k];
    }
    Object.assign(process.env, env);
  };

  it("leer, wenn alle kritischen Secrets gesetzt sind (mistral)", () => {
    applyEnv({ ...ALL_SET, LLM_PROVIDER: "mistral" });
    expect(missingProductionSecrets()).toEqual([]);
  });

  it("nennt die fehlenden Namen", () => {
    applyEnv({ ...ALL_SET, LLM_PROVIDER: "mistral", STRIPE_WEBHOOK_SECRET: "", CRON_SECRET: "" });
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.CRON_SECRET;
    const missing = missingProductionSecrets();
    expect(missing).toContain("STRIPE_WEBHOOK_SECRET");
    expect(missing).toContain("CRON_SECRET");
    expect(missing).not.toContain("DATABASE_URL");
  });

  it("prüft den provider-spezifischen Key: deepseek fehlt trotz gesetztem Mistral-Key", () => {
    applyEnv({ ...ALL_SET, LLM_PROVIDER: "deepseek" }); // MISTRAL gesetzt, DEEPSEEK nicht
    expect(missingProductionSecrets()).toEqual(["DEEPSEEK_API_KEY"]);
  });

  it("wertet reine Leerzeichen als fehlend", () => {
    applyEnv({ ...ALL_SET, LLM_PROVIDER: "mistral", ADMIN_PASSWORD_HASH: "   " });
    expect(missingProductionSecrets()).toEqual(["ADMIN_PASSWORD_HASH"]);
  });
});
