/**
 * Befund 17.08.2026: Die Finanzplan-Hinweise (Eigenanteil-Sicherung, Förderquoten-/
 * Deckungs-/Rahmen-Checks, bewusste Nicht-Beantragung) standen nur in der UI
 * (FinanzplanView) — der Markdown-Export (Download UND Gutachter-Eval) verlor sie.
 * renderFinanzplanMarkdown muss sie auch im bezifferten Zweig ausgeben.
 */
import { renderFinanzplanMarkdown } from "@/lib/wizard/finanzplan-markdown";
import type { Finanzplan, Finanzposten } from "@/lib/wizard/types";

let n = 0;
function posten(p: Partial<Finanzposten>): Finanzposten {
  return {
    id: `p${n++}`,
    kategorie: p.kategorie ?? "sachkosten",
    bezeichnung: p.bezeichnung ?? "Posten",
    betragEur: p.betragEur ?? 1000,
    begruendung: p.begruendung,
    eigenanteil: p.eigenanteil,
    istVorschlag: p.istVorschlag,
  };
}
function plan(p: Partial<Finanzplan>): Finanzplan {
  return { posten: p.posten ?? [], generiertAm: "2026-08-17T00:00:00.000Z", ...p };
}

it("rendert Hinweise im bezifferten Zweig als Blockquote nach der Summenzeile", () => {
  const md = renderFinanzplanMarkdown(
    plan({
      posten: [posten({ bezeichnung: "Tablets" })],
      hinweise: [
        "Der Eigenanteil (mind. 22 %) wird über den Schulträger sichergestellt.",
        "WLAN-Ausbau wurde bewusst nicht beantragt (vom Nutzer ausgeschlossen).",
      ],
    })
  );
  expect(md).toContain("> Der Eigenanteil (mind. 22 %) wird über den Schulträger sichergestellt.");
  expect(md).toContain("> WLAN-Ausbau wurde bewusst nicht beantragt (vom Nutzer ausgeschlossen).");
  // Hinweise stehen NACH der Summen-/Legendenzeile, nicht mitten in der Tabelle.
  expect(md.indexOf("> Der Eigenanteil")).toBeGreaterThan(md.indexOf("**Gesamtvolumen:**"));
});

it("rendert ohne Hinweise keinen Blockquote-Block", () => {
  const md = renderFinanzplanMarkdown(plan({ posten: [posten({})] }));
  expect(md).not.toContain("\n> ");
});

it("Regression: der unbezifferte Zweig rendert Hinweise weiterhin", () => {
  const md = renderFinanzplanMarkdown(
    plan({
      posten: [],
      unbeziffert: true,
      kostenrahmen: ["Anschaffung von Tablets"],
      hinweise: ["Beträge werden vor Einreichung über Angebote ermittelt."],
    })
  );
  expect(md).toContain("> Beträge werden vor Einreichung über Angebote ermittelt.");
});
