import { parseRobots, istErlaubt, pfadMitQuery, ladeRobots } from "../../../lib/scan/robots";

describe("lib/scan/robots — Hausordnung der Quelle", () => {
  it("liest Disallow und Crawl-delay der Sterngruppe", () => {
    const r = parseRobots("User-agent: *\nDisallow: /FDB/SiteGlobals/\nCrawl-delay: 30\n");
    expect(r.disallow).toEqual(["/FDB/SiteGlobals/"]);
    expect(r.crawlDelaySekunden).toBe(30);
    expect(r.herkunft).toBe("robots");
  });

  it("ignoriert Kommentare und leere Disallow-Werte", () => {
    const r = parseRobots("User-agent: *\n# nichts gesperrt\nDisallow:\n");
    expect(r.disallow).toEqual([]);
    expect(istErlaubt("/beliebig", r)).toBe(true);
  });

  it("bevorzugt die Gruppe des eigenen Agenten vor der Sterngruppe", () => {
    const txt = "User-agent: *\nDisallow: /\n\nUser-agent: edufunds-bot\nDisallow: /intern/\n";
    expect(istErlaubt("/foerderung", parseRobots(txt, "edufunds-bot"))).toBe(true);
    expect(istErlaubt("/intern/x", parseRobots(txt, "edufunds-bot"))).toBe(false);
    expect(istErlaubt("/foerderung", parseRobots(txt))).toBe(false);
  });

  it("fasst aufeinanderfolgende User-agent-Zeilen zu einer Gruppe zusammen", () => {
    const r = parseRobots("User-agent: a\nUser-agent: b\nDisallow: /x\n", "b");
    expect(istErlaubt("/x", r)).toBe(false);
  });

  it("laesst das laengere Allow gegen ein kuerzeres Disallow gewinnen", () => {
    const r = parseRobots("User-agent: *\nDisallow: /suche\nAllow: /suche/oeffentlich\n");
    expect(istErlaubt("/suche/intern", r)).toBe(false);
    expect(istErlaubt("/suche/oeffentlich/a", r)).toBe(true);
  });

  it("versteht die Platzhalter * und $", () => {
    const r = parseRobots("User-agent: *\nDisallow: /*.pdf$\n");
    expect(istErlaubt("/dokumente/richtlinie.pdf", r)).toBe(false);
    expect(istErlaubt("/dokumente/richtlinie.pdf.html", r)).toBe(true);
  });

  it("prueft gegen Pfad UND Query, nicht nur gegen den Pfad", () => {
    const r = parseRobots("User-agent: *\nDisallow: /suche?intern=1\n");
    expect(pfadMitQuery("https://x.de/suche?intern=1")).toBe("/suche?intern=1");
    expect(istErlaubt(pfadMitQuery("https://x.de/suche?intern=1"), r)).toBe(false);
    expect(istErlaubt(pfadMitQuery("https://x.de/suche?a=2"), r)).toBe(true);
  });

  it("wertet eine fehlende robots.txt (404) als 'keine Regeln'", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ status: 404, ok: false });
    const r = await ladeRobots("https://x.de/a", { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.herkunft).toBe("kein-robots");
    expect(istErlaubt("/a", r)).toBe(true);
  });

  it("sperrt fail-closed, wenn die robots.txt nicht erreichbar ist", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error("ETIMEDOUT"));
    const r = await ladeRobots("https://x.de/a", { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.herkunft).toBe("unerreichbar");
    expect(istErlaubt("/a", r)).toBe(false);
    expect(r.fehler).toMatch(/ETIMEDOUT/);
  });

  it("sperrt fail-closed auch bei HTTP 503", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ status: 503, ok: false });
    const r = await ladeRobots("https://x.de/a", { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(istErlaubt("/a", r)).toBe(false);
  });

  it("holt robots.txt immer vom Wurzelpfad der Domain", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ status: 200, ok: true, text: async () => "" });
    await ladeRobots("https://x.de/tief/verschachtelt?a=1", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://x.de/robots.txt");
  });
});
