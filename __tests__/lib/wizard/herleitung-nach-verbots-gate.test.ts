/**
 * Die Lücke aus dem Lauf 2026-08-20T11-51-31 (pv-010-run3).
 *
 * Das Verbots-Gate nimmt eine erfundene Kalkulationsgrundlage zurück und
 * ersetzt die Begründung durch eine ehrliche Pauschale. Das passiert in
 * `pipeline.ts` NACH `generateFinanzplan` — also nach dem Herleitungs-Marker.
 * Ergebnis war ein 15.000-EUR-Posten, der weder eine Rechnung noch einen
 * Marker trug: 1 von 273 qualifizierten Posten, aber ein Loch in einer Stufe,
 * die lückenlos sein soll.
 *
 * Der Test hält die Reihenfolge fest, nicht die Implementierung: Was das
 * Verbots-Gate zur Pauschale zurücknimmt, muss danach markiert sein.
 */
import { bereinigeFinanzplanBegruendungen } from "@/lib/wizard/verbots-gate";
import { ergaenzeHerleitungsMarker, pruefeHerleitung } from "@/lib/wizard/finanzplan-herleitung";
import type { Finanzposten } from "@/lib/wizard/types";

/** Der echte Posten aus pv-010-run3, mit der Rechnung, die das LLM zuerst lieferte. */
const posten: Finanzposten[] = [
  {
    id: "a",
    kategorie: "personal",
    bezeichnung: "Klimaschutzbeauftragte (Teilzeit, 12 Monate)",
    betragEur: 15000,
    // Die Tarif-Stufe steht NICHT in einer Klammer. Das Gate kann sie deshalb
    // nicht chirurgisch herausschneiden und faellt auf die Pauschale zurueck —
    // wortgleich mit dem, was im Snapshot stand.
    begruendung: "Schätzung: 0,25 Stelle nach TV-L E11 × 12 Monate = 15.000 EUR",
    eigenanteil: false,
  } as Finanzposten,
];

it("was das Verbots-Gate zur Pauschale zurücknimmt, wird danach markiert", () => {
  // 1. Vor der Bereinigung ist der Posten hergeleitet — zu Recht kein Marker.
  expect(pruefeHerleitung(posten)).toHaveLength(0);

  // 2. Das Gate entfernt die erfundene Tarif-Grundlage.
  const ber = bereinigeFinanzplanBegruendungen(posten, "Wir bräuchten jemanden für den Klimaschutz.");
  expect(ber.entfernt.length).toBeGreaterThan(0);
  expect(ber.posten[0].begruendung).not.toContain("TV-L");

  // 3. Jetzt fehlt die Herleitung — und genau hier setzte der Marker bisher aus.
  expect(pruefeHerleitung(ber.posten)).toHaveLength(1);
  const nach = ergaenzeHerleitungsMarker(ber.posten);
  expect(nach.posten[0].begruendung).toContain("[TODO:");
  expect(nach.posten[0].betragEur).toBe(15000);
});

it("eine chirurgisch geheilte Begründung behält ihre Rechnung — und bleibt ohne Marker", () => {
  // Gegenprobe: Steht die Tarif-Stufe in einer Klammer, schneidet das Gate nur
  // sie heraus. Die Rechnung bleibt stehen, ein Marker waere hier falsch.
  const mitKlammer = [
    {
      ...posten[0],
      begruendung:
        "Schätzung: 0,25 Stelle × 12 Monate × 5.000 EUR Monatsbrutto (TV-L E11, Mittelwert) = 15.000 EUR",
    },
  ];
  const ber = bereinigeFinanzplanBegruendungen(mitKlammer, "Wir bräuchten jemanden für den Klimaschutz.");
  expect(ber.posten[0].begruendung).not.toContain("TV-L");
  expect(ber.posten[0].begruendung).toContain("= 15.000 EUR");
  expect(pruefeHerleitung(ber.posten)).toHaveLength(0);
});
