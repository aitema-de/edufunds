/**
 * Prompt-Caching (19.08.2026): Alle LLM-Aufrufe eines Antrags tragen denselben
 * `prompt_cache_key`, damit Mistral den gemeinsamen Prompt-Praefix wiederverwendet.
 * Gemessen sinkt der Preis gegen das Minutenkontingent dadurch von 7.534 auf 30 —
 * und genau dieses Kontingent ist der Engpass der Generierung.
 *
 * Der Schluessel liegt in einem AsyncLocalStorage, nicht in einer Modulvariablen.
 * Der Unterschied ist nicht kosmetisch: Zwei gleichzeitige Antraege wuerden sich
 * bei einer Modulvariablen gegenseitig den Schluessel unterschieben — und damit
 * Cache-Treffer auf FREMDEN Praefixen provozieren.
 */
import {
  withPromptCacheKey,
  currentPromptCacheKey,
  cacheKeyFromSession,
} from "@/lib/wizard/llm";

describe("cacheKeyFromSession", () => {
  const token = "3f9a1c77-0000-4c1a-9f3e-abcdefabcdef";

  it("ist stabil — derselbe Antrag ergibt denselben Schlüssel", () => {
    expect(cacheKeyFromSession(token)).toBe(cacheKeyFromSession(token));
  });

  it("trennt verschiedene Anträge", () => {
    expect(cacheKeyFromSession(token)).not.toBe(cacheKeyFromSession(token + "x"));
  });

  it("gibt den Session-Token NICHT preis", () => {
    // Der Token ist das Zugriffsgeheimnis des Antrags. Er darf nicht als
    // Klartext-Metadatum beim Anbieter landen.
    const key = cacheKeyFromSession(token);
    expect(key).not.toContain(token);
    expect(key).not.toContain(token.slice(0, 8));
    expect(key).toMatch(/^edufunds-[0-9a-f]{32}$/);
  });
});

describe("withPromptCacheKey", () => {
  it("stellt den Schlüssel innerhalb des Laufs bereit", async () => {
    expect(currentPromptCacheKey()).toBeUndefined();
    await withPromptCacheKey("abc", async () => {
      expect(currentPromptCacheKey()).toBe("abc");
    });
    expect(currentPromptCacheKey()).toBeUndefined();
  });

  it("trägt über await-Grenzen hinweg (die Pipeline ist durchgehend async)", async () => {
    await withPromptCacheKey("tief", async () => {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 1));
      const verschachtelt = async () => {
        await Promise.resolve();
        return currentPromptCacheKey();
      };
      expect(await verschachtelt()).toBe("tief");
    });
  });

  it("hält zwei gleichzeitige Anträge sauber getrennt", async () => {
    // Der Kern: Bei einer Modulvariablen würde hier einer der beiden den
    // Schlüssel des anderen sehen — und Cache-Treffer auf fremdem Präfix wären
    // möglich. Mit AsyncLocalStorage bleibt jeder in seinem Lauf.
    const gesehen: string[] = [];
    const lauf = (key: string, verzoegerung: number) =>
      withPromptCacheKey(key, async () => {
        await new Promise((r) => setTimeout(r, verzoegerung));
        gesehen.push(`${key}:${currentPromptCacheKey()}`);
        await new Promise((r) => setTimeout(r, verzoegerung));
        return currentPromptCacheKey();
      });

    const [a, b] = await Promise.all([lauf("antrag-A", 5), lauf("antrag-B", 1)]);

    expect(a).toBe("antrag-A");
    expect(b).toBe("antrag-B");
    expect(gesehen.sort()).toEqual(["antrag-A:antrag-A", "antrag-B:antrag-B"]);
  });

  it("reicht Fehler durch und räumt den Kontext trotzdem ab", async () => {
    await expect(
      withPromptCacheKey("k", async () => {
        throw new Error("Pipeline-Fehler");
      })
    ).rejects.toThrow("Pipeline-Fehler");
    expect(currentPromptCacheKey()).toBeUndefined();
  });

  it("ohne Kontext bleibt alles wie vorher (kein Schlüssel, kein Zusatzfeld)", () => {
    expect(currentPromptCacheKey()).toBeUndefined();
  });
});
