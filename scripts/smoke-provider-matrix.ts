/**
 * Provider-Matrix-Smoke: prueft JEDEN in `PROVIDER_MODELS` deklarierten Provider
 * und jede Modell-ID gegen die echte API — nicht nur den gerade aktiven.
 *
 * WARUM
 * -----
 * `scripts/smoke-llm.ts` testet ausschliesslich den Provider, den `LLM_PROVIDER`
 * gerade waehlt. Deshalb ist am 30.07.2026 unbemerkt geblieben, dass Google
 * `gemini-2.0-flash` abgeschaltet hat (404 "no longer available"): Prod laeuft auf
 * Mistral, der dokumentierte Gemini-Fallback war seit dem Abschalttag tot — und
 * haette im Mistral-Ausfall nicht getragen. Ein Fallback, der nie angefasst wird,
 * verrottet still. Dieses Skript macht das Verrotten sichtbar.
 *
 * Der Aufruf geht bewusst DIREKT an die Provider-HTTP-Schnittstellen und nicht
 * ueber lib/wizard/llm.ts: dessen Provider-Wahl passiert beim Modul-Laden aus der
 * Env, ein Prozess kann also nur einen Provider testen.
 *
 * Lauf:  npx tsx --env-file=.env.local scripts/smoke-provider-matrix.ts
 *        npx tsx --env-file=.env.local scripts/smoke-provider-matrix.ts --json
 *
 * Exit-Codes: 0 = alle deklarierten Modelle antworten · 1 = mindestens eines nicht
 *             · 2 = Setup-Fehler (Key fehlt).
 */

import { PROVIDER_MODELS, type LlmProvider } from "../lib/wizard/llm";

const KEY_ENV: Record<LlmProvider, string> = {
  mistral: "MISTRAL_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  gemini: "GEMINI_API_KEY",
};

const OPENAI_BASE: Partial<Record<LlmProvider, string>> = {
  mistral: "https://api.mistral.ai/v1",
  deepseek: "https://api.deepseek.com",
};

export interface MatrixErgebnis {
  provider: LlmProvider;
  rolle: "interview" | "pipeline";
  model: string;
  ok: boolean;
  status: number | null;
  ms: number;
  fehler?: string;
}

async function probeOpenAiKompatibel(
  provider: LlmProvider,
  model: string,
  key: string
): Promise<{ ok: boolean; status: number; fehler?: string }> {
  const res = await fetch(`${OPENAI_BASE[provider]}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: 8,
      temperature: 0,
      messages: [{ role: "user", content: "Antworte nur mit: OK" }],
    }),
  });
  if (!res.ok) return { ok: false, status: res.status, fehler: (await res.text()).slice(0, 300) };
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const inhalt = j.choices?.[0]?.message?.content ?? "";
  return inhalt.trim().length > 0
    ? { ok: true, status: res.status }
    : { ok: false, status: res.status, fehler: "leere Antwort" };
}

async function probeGemini(model: string, key: string): Promise<{ ok: boolean; status: number; fehler?: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Antworte nur mit: OK" }] }] }),
    }
  );
  if (!res.ok) return { ok: false, status: res.status, fehler: (await res.text()).slice(0, 300) };
  const j = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return text.trim().length > 0
    ? { ok: true, status: res.status }
    : { ok: false, status: res.status, fehler: "leere Antwort" };
}

export async function laufeMatrix(): Promise<MatrixErgebnis[]> {
  const out: MatrixErgebnis[] = [];
  for (const provider of Object.keys(PROVIDER_MODELS) as LlmProvider[]) {
    const key = process.env[KEY_ENV[provider]];
    // Modell-IDs koennen pro Rolle gleich sein — dann nur einmal pruefen.
    const rollen: Array<"interview" | "pipeline"> = ["interview", "pipeline"];
    const gesehen = new Set<string>();
    for (const rolle of rollen) {
      const model = PROVIDER_MODELS[provider][rolle];
      if (gesehen.has(model)) continue;
      gesehen.add(model);
      if (!key) {
        out.push({
          provider,
          rolle,
          model,
          ok: false,
          status: null,
          ms: 0,
          fehler: `${KEY_ENV[provider]} nicht gesetzt`,
        });
        continue;
      }
      const t0 = Date.now();
      try {
        const r = provider === "gemini" ? await probeGemini(model, key) : await probeOpenAiKompatibel(provider, model, key);
        out.push({ provider, rolle, model, ok: r.ok, status: r.status, ms: Date.now() - t0, fehler: r.fehler });
      } catch (e) {
        out.push({
          provider,
          rolle,
          model,
          ok: false,
          status: null,
          ms: Date.now() - t0,
          fehler: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }
  return out;
}

async function main() {
  const alsJson = process.argv.includes("--json");
  const ergebnisse = await laufeMatrix();

  if (alsJson) {
    console.log(JSON.stringify(ergebnisse, null, 2));
  } else {
    console.log("Provider-Matrix — deklarierte Modelle gegen die echte API\n");
    for (const e of ergebnisse) {
      const marke = e.ok ? "OK  " : "TOT ";
      console.log(
        `${marke} ${e.provider.padEnd(9)} ${e.model.padEnd(22)} ${String(e.status ?? "-").padStart(3)}  ${String(e.ms).padStart(5)} ms${
          e.fehler ? `  ${e.fehler.replace(/\s+/g, " ").slice(0, 140)}` : ""
        }`
      );
    }
  }

  const tot = ergebnisse.filter((e) => !e.ok);
  if (tot.length) {
    console.error(
      `\n${tot.length} deklarierte(s) Modell(e) antwortet nicht: ${tot.map((t) => `${t.provider}/${t.model}`).join(", ")}`
    );
    process.exit(1);
  }
  console.log("\nAlle deklarierten Provider-Modelle antworten.");
}

if (process.argv[1] && /smoke-provider-matrix\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error("Abbruch:", e);
    process.exit(2);
  });
}
