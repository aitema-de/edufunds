import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  vergleicheBestand,
  ladeBestand,
  speichereBestand,
  UMBAU_SCHWELLE_ABSOLUT,
} from "../../../lib/scan/bestand";

describe("vergleicheBestand — was ist neu seit letzter Woche", () => {
  it("nimmt beim Erstlauf nur den Bestand auf und liefert KEINE Kandidaten", () => {
    // Sonst wuerde eine frisch eingetragene Quelle mit 457 Programmseiten beim ersten Lauf
    // 457 Kandidaten erzeugen — jeder mit teurer LLM-Extraktion.
    const d = vergleicheBestand(null, ["https://x.de/a", "https://x.de/b"]);
    expect(d.erstlauf).toBe(true);
    expect(d.neu).toEqual([]);
  });

  it("liefert genau die hinzugekommenen URLs", () => {
    const d = vergleicheBestand(["https://x.de/a"], ["https://x.de/a", "https://x.de/b"]);
    expect(d.erstlauf).toBe(false);
    expect(d.neu).toEqual(["https://x.de/b"]);
  });

  it("meldet entfallene URLs, ohne sie zu Kandidaten zu machen", () => {
    const d = vergleicheBestand(["https://x.de/a", "https://x.de/alt"], ["https://x.de/a"]);
    expect(d.neu).toEqual([]);
    expect(d.entfallen).toEqual(["https://x.de/alt"]);
  });

  it("meldet nichts Neues, wenn die Quelle unveraendert ist", () => {
    const bestand = ["https://x.de/a", "https://x.de/b"];
    const d = vergleicheBestand(bestand, [...bestand]);
    expect(d.neu).toEqual([]);
    expect(d.entfallen).toEqual([]);
    expect(d.fehler).toBeUndefined();
  });

  it("entdoppelt die frisch geholte Liste", () => {
    const d = vergleicheBestand(["https://x.de/a"], ["https://x.de/b", "https://x.de/b"]);
    expect(d.neu).toEqual(["https://x.de/b"]);
  });

  it("bremst einen Portal-Umbau aus, statt hunderte Kandidaten zu erzeugen", () => {
    const alt = Array.from({ length: 200 }, (_, i) => `https://x.de/alt/${i}`);
    const neu = Array.from({ length: 200 }, (_, i) => `https://x.de/neu/${i}`);
    const d = vergleicheBestand(alt, neu);
    expect(d.neu).toEqual([]);
    expect(d.fehler).toMatch(/Umbau der Quelle/);
    expect(d.fehler).toMatch(/200 neue URLs/);
  });

  it("laesst kleine Quellen von der Umbau-Bremse unbehelligt", () => {
    // 5 bekannte URLs, 10 neue: prozentual gewaltig, absolut harmlos.
    const alt = Array.from({ length: 5 }, (_, i) => `https://x.de/${i}`);
    const neu = [...alt, ...Array.from({ length: 10 }, (_, i) => `https://x.de/neu${i}`)];
    const d = vergleicheBestand(alt, neu);
    expect(d.fehler).toBeUndefined();
    expect(d.neu).toHaveLength(10);
  });

  it("greift genau an der dokumentierten Schwelle", () => {
    const alt = Array.from({ length: 10 }, (_, i) => `https://x.de/${i}`);
    const gerade = [...alt, ...Array.from({ length: UMBAU_SCHWELLE_ABSOLUT }, (_, i) => `https://x.de/n${i}`)];
    expect(vergleicheBestand(alt, gerade).fehler).toBeUndefined();
    const einsZuViel = [...gerade, "https://x.de/nx"];
    expect(vergleicheBestand(alt, einsZuViel).fehler).toBeDefined();
  });
});

describe("Bestandsdatei", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "bestand-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("meldet eine unbekannte Quelle als Erstlauf (null)", async () => {
    expect(await ladeBestand(dir, "gibtsnicht")).toBeNull();
  });

  it("schreibt und liest den Bestand zurueck", async () => {
    await speichereBestand(dir, "quelle-a", ["https://x.de/b", "https://x.de/a"], "2026-08-18T00:00:00Z");
    expect(await ladeBestand(dir, "quelle-a")).toEqual(["https://x.de/a", "https://x.de/b"]);
  });

  it("speichert sortiert und entdoppelt — sonst zeigt der Git-Diff Umsortierungen statt Aenderungen", async () => {
    await speichereBestand(dir, "q", ["https://x.de/c", "https://x.de/a", "https://x.de/c"], "2026-08-18T00:00:00Z");
    const roh = JSON.parse(await fs.readFile(path.join(dir, "q.json"), "utf8"));
    expect(roh.urls).toEqual(["https://x.de/a", "https://x.de/c"]);
    expect(roh.urlAnzahl).toBe(2);
  });

  it("behaelt das Datum des Erstlaufs ueber spaetere Laeufe hinweg", async () => {
    await speichereBestand(dir, "q", ["https://x.de/a"], "2026-01-01T00:00:00Z");
    await speichereBestand(dir, "q", ["https://x.de/a", "https://x.de/b"], "2026-08-18T00:00:00Z");
    const roh = JSON.parse(await fs.readFile(path.join(dir, "q.json"), "utf8"));
    expect(roh.erstlauf).toBe("2026-01-01T00:00:00Z");
    expect(roh.letzteAenderung).toBe("2026-08-18T00:00:00Z");
  });

  it("schreibt NICHT, wenn sich der Bestand nicht geaendert hat", async () => {
    // Sonst aendert allein der Zeitstempel die Datei jede Woche — und loest jede Woche
    // einen leeren Pull Request aus.
    expect(await speichereBestand(dir, "q", ["https://x.de/a"], "2026-01-01T00:00:00Z")).toBe(true);
    expect(await speichereBestand(dir, "q", ["https://x.de/a"], "2026-08-18T00:00:00Z")).toBe(false);
    const roh = JSON.parse(await fs.readFile(path.join(dir, "q.json"), "utf8"));
    expect(roh.letzteAenderung).toBe("2026-01-01T00:00:00Z");
  });

  it("laesst eine Quellen-ID nicht aus dem Bestandsverzeichnis ausbrechen", async () => {
    await speichereBestand(dir, "../../ausbruch", ["https://x.de/a"], "2026-08-18T00:00:00Z");
    const dateien = await fs.readdir(dir);
    expect(dateien).toHaveLength(1);
    // Entscheidend ist nicht der genaue Ersatzname, sondern dass keine Trennzeichen
    // ueberleben und die Datei damit im Verzeichnis bleibt.
    expect(dateien[0]).not.toMatch(/[\\/]/);
    expect(path.resolve(dir, dateien[0]).startsWith(path.resolve(dir))).toBe(true);
  });
});
