/**
 * Regression für den Befund 17.08.2026: Der CI-Eval lief nach dem Provider-Wechsel
 * auf Mistral mit WIZ-03 = 0,0 (σ 0,0) über ALLE 25 Einträge durch und meldete
 * `GATE PASSED`. Ursache: `pipeline-eval.yml` gab `MISTRAL_API_KEY` nicht weiter,
 * `scoreWiz03` fängt jeden Judge-Fehler ab und gibt `score: 0` zurück — ein
 * fehlender API-Key sah damit aus wie durchweg miserable Tonalität. Weil WIZ-03
 * warning-only ist, blieb der Check grün (drop=64,60).
 *
 * `pruefeMessgeraet` trennt „schlechtes Ergebnis" von „kaputtem Messgerät".
 */
import { pruefeMessgeraet } from "@/scripts/eval-pipeline";
import { istWiz03Skip } from "@/scripts/eval-pipeline-internals";
import type { AggregateMetrics, ScoreStat } from "@/scripts/eval-pipeline-internals";

function stat(mean: number, stddev: number, n: number): ScoreStat {
  return { mean, stddev, runs: Array.from({ length: n }, () => mean) };
}

function metrics(over: Partial<AggregateMetrics> = {}): AggregateMetrics {
  return {
    n: 25,
    nErrored: 0,
    wiz01: stat(100, 0, 25),
    wiz02: stat(98.8, 4.3, 25),
    wiz03: stat(68.2, 18.1, 25),
    wiz04: stat(86.6, 22.8, 25),
    finanzplan: stat(81.6, 27.7, 25),
    perGeberGruppe: [],
    perDossier: [],
    wiz03JudgeFehler: 0,
    wiz03Uebersprungen: 0,
    wiz03Bewertet: 25,
    ...over,
  };
}

describe("istWiz03Skip", () => {
  it("erkennt die beabsichtigten Auslassungen", () => {
    expect(istWiz03Skip("leerer finalText")).toBe(true);
    expect(istWiz03Skip("Geber-Gruppe unbekannt — WIZ-03 übersprungen")).toBe(true);
  });

  it("zählt echte Judge-Fehler NICHT als Auslassung", () => {
    expect(istWiz03Skip("401 Unauthorized")).toBe(false);
    expect(istWiz03Skip("Connection error.")).toBe(false);
    expect(istWiz03Skip("MISTRAL_API_KEY ist leer")).toBe(false);
    expect(istWiz03Skip(undefined)).toBe(false);
  });
});

describe("pruefeMessgeraet — der echte CI-Fall vom 17.08.", () => {
  it("schlägt Alarm, wenn der Judge in allen 25 Runs ausfiel (WIZ-03 = 0,0 bei σ 0)", () => {
    const befunde = pruefeMessgeraet(
      metrics({ wiz03: stat(0, 0, 25), wiz03JudgeFehler: 25, wiz03Bewertet: 25 })
    );
    expect(befunde).toHaveLength(2); // Judge-Quote UND Null-Streuung
    expect(befunde.join(" ")).toContain("25 von 25");
    expect(befunde.join(" ")).toContain("KEIN Qualitätsurteil");
    expect(befunde.join(" ")).toContain("σ 0,0");
  });

  it("schlägt auch dann Alarm, wenn nur ein Teil der Runs ausfiel (> 10 %)", () => {
    const befunde = pruefeMessgeraet(
      metrics({ wiz03: stat(45, 30, 25), wiz03JudgeFehler: 4, wiz03Bewertet: 25 })
    );
    expect(befunde).toHaveLength(1);
    expect(befunde[0]).toContain("4 von 25");
    expect(befunde[0]).toContain("16 %");
  });

  it("erkennt eine totgelegte Metrik auch ohne Fehlerzähler (Backstop)", () => {
    // Falls eine künftige Score-Funktion ihre Fehler anders verschluckt und
    // gar keinen error-Text setzt, greift die Null-Streuungs-Prüfung.
    const befunde = pruefeMessgeraet(metrics({ wiz04: stat(0, 0, 25) }));
    expect(befunde).toHaveLength(1);
    expect(befunde[0]).toContain("WIZ-04");
  });
});

describe("pruefeMessgeraet — schweigt, wo es schweigen muss", () => {
  it("gesunder Lauf: keine Befunde", () => {
    expect(pruefeMessgeraet(metrics())).toEqual([]);
  });

  it("ein einzelner transienter Judge-Fehler (≤ 10 %) ist nur eine Warnung im Zähler, kein Abbruch", () => {
    const befunde = pruefeMessgeraet(
      metrics({ wiz03: stat(65, 19, 25), wiz03JudgeFehler: 2, wiz03Bewertet: 25 })
    );
    expect(befunde).toEqual([]);
  });

  it("legitime Auslassungen zählen nicht als Judge-Fehler", () => {
    const befunde = pruefeMessgeraet(
      metrics({ wiz03: stat(60, 20, 25), wiz03Uebersprungen: 9, wiz03Bewertet: 25 })
    );
    expect(befunde).toEqual([]);
  });

  it("WIZ-01 = 100,0 bei σ 0 ist ein gesättigtes Ergebnis, kein Defekt", () => {
    expect(pruefeMessgeraet(metrics({ wiz01: stat(100, 0, 25) }))).toEqual([]);
  });

  it("ein Einzellauf (--single) wird nicht als Null-Streuung fehlgedeutet", () => {
    const befunde = pruefeMessgeraet(
      metrics({ n: 1, wiz03: stat(0, 0, 1), wiz03Bewertet: 1, wiz03JudgeFehler: 0 })
    );
    expect(befunde).toEqual([]);
  });
});
