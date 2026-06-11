/**
 * LLM-freie Selbstkorrektur fuer den Finanzplan.
 *
 * Erkennt aus Plan + Richtlinie konkrete Verstoesse, die per einfacher
 * Operation am Plan korrigierbar sind, und liefert ausfuehrbare
 * Aktionen (`AutofixAction`). Jede Aktion ist eine reine Funktion
 * `apply(posten) -> posten` und enthaelt einen menschenlesbaren Titel
 * plus Beschreibung — geeignet fuer einen Buttons-mit-Tooltip-Block
 * im FinanzplanEditor.
 *
 * Keine UI-Abhaengigkeiten, kein LLM-Aufruf.
 */

import type { Finanzposten } from "./types";
import type { Richtlinie } from "./richtlinien-schema";

/** Serialisierbare Variante einer AutofixAction (ohne apply-Funktion). */
export interface AutofixMeta {
  id: string;
  label: string;
  description: string;
}

export interface AutofixAction extends AutofixMeta {
  /** rein funktional, gibt neue Posten-Liste zurueck */
  apply: (posten: Finanzposten[]) => Finanzposten[];
}

export function toMeta(a: AutofixAction): AutofixMeta {
  return { id: a.id, label: a.label, description: a.description };
}

const EPS = 0.5;

function sum(posten: Finanzposten[], pred: (p: Finanzposten) => boolean): number {
  return posten.filter(pred).reduce((s, p) => s + p.betragEur, 0);
}

function fmtEur(n: number): string {
  return Math.round(n).toLocaleString("de-DE") + " EUR";
}

function genId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Skaliert die Foerder-Posten der angegebenen Kategorie so, dass die Foerder-Summe
 * dieser Kategorie genau `target` betraegt. Kein Posten faellt unter 0.
 */
function scaleFoerderPostenInKategorie(
  posten: Finanzposten[],
  kategorie: Finanzposten["kategorie"],
  target: number
): Finanzposten[] {
  const current = sum(posten, (p) => p.kategorie === kategorie && !p.eigenanteil);
  if (current <= 0 || current <= target) return posten;
  const factor = target / current;
  return posten.map((p) => {
    if (p.kategorie !== kategorie || p.eigenanteil) return p;
    return { ...p, betragEur: Math.round(p.betragEur * factor) };
  });
}

/**
 * Skaliert ALLE Foerder-Posten so, dass die Gesamt-Foerder-Summe genau
 * `target` betraegt.
 */
function scaleAllFoerderPosten(posten: Finanzposten[], target: number): Finanzposten[] {
  const current = sum(posten, (p) => !p.eigenanteil);
  if (current <= 0 || current <= target) return posten;
  const factor = target / current;
  return posten.map((p) => {
    if (p.eigenanteil) return p;
    return { ...p, betragEur: Math.round(p.betragEur * factor) };
  });
}

export interface AutofixContext {
  posten: Finanzposten[];
  richtlinie?: Richtlinie | null;
}

export function computeAutofixes({ posten, richtlinie }: AutofixContext): AutofixAction[] {
  const actions: AutofixAction[] = [];
  if (!richtlinie || posten.length === 0) return actions;

  const gesamt = sum(posten, () => true);
  const eigen = sum(posten, (p) => !!p.eigenanteil);
  const foerder = gesamt - eigen;

  // --- 1. Foerderung uebersteigt maxEur -----------------------------------
  const maxEur = richtlinie.foerderhoehe.maxEur;
  if (maxEur && foerder > maxEur) {
    const diff = foerder - maxEur;
    actions.push({
      id: "cap-foerder-max-eur",
      label: `Foerderung auf ${fmtEur(maxEur)} kappen`,
      description: `Reduziert die geforderten Posten anteilig, sodass die Gesamt-Foerdersumme ${fmtEur(maxEur)} nicht ueberschreitet (Differenz: ${fmtEur(diff)}).`,
      apply: (p) => scaleAllFoerderPosten(p, maxEur),
    });
  }

  // --- 2. Foerderanteil ueber maxProzent ----------------------------------
  const maxProz = richtlinie.foerderhoehe.maxProzentGesamtkosten;
  if (maxProz && gesamt > 0) {
    const aktuellProz = (foerder / gesamt) * 100;
    if (aktuellProz > maxProz + EPS) {
      // Wir wollen foerder so wahlen, dass foerder/gesamt = maxProz/100, wobei
      // gesamt = foerder + eigen — also foerder = (eigen * maxProz) / (100 - maxProz).
      const targetFoerder = maxProz < 100 ? (eigen * maxProz) / (100 - maxProz) : foerder;
      actions.push({
        id: "cap-foerder-max-prozent",
        label: `Foerderanteil auf ${maxProz} % kappen`,
        description: `Reduziert geforderte Posten so, dass der Foerderanteil maximal ${maxProz} % der Gesamtkosten betraegt (aktuell ${aktuellProz.toFixed(1)} %).`,
        apply: (p) => scaleAllFoerderPosten(p, Math.round(targetFoerder)),
      });
    }
  }

  // --- 3. Eigenanteil unter mindestProzent --------------------------------
  if (richtlinie.eigenmittel.pflicht) {
    const min = richtlinie.eigenmittel.mindestProzent ?? 0;
    if (gesamt > 0 && min > 0) {
      const aktuellProz = (eigen / gesamt) * 100;
      if (aktuellProz + EPS < min) {
        const benoetigtEigen = (gesamt * min) / 100;
        const fehlbetrag = Math.max(0, Math.round(benoetigtEigen - eigen));
        if (fehlbetrag > 0) {
          actions.push({
            id: "add-eigenanteil-posten",
            label: `Eigenanteil um ${fmtEur(fehlbetrag)} aufstocken`,
            description: `Fuegt einen neuen Eigenanteil-Posten ueber ${fmtEur(fehlbetrag)} hinzu, sodass die Eigenmittel den geforderten Mindestanteil von ${min} % erreichen. Bezeichnung kannst du danach noch anpassen.`,
            apply: (p) => [
              ...p,
              {
                id: genId("eigenanteil"),
                kategorie: "sonstiges",
                bezeichnung: `Eigenanteil Schultraeger (Aufstockung auf ${min} %)`,
                betragEur: fehlbetrag,
                begruendung: "Erfuellt die Eigenmittel-Pflicht der Foerderrichtlinie.",
                eigenanteil: true,
                // Vom Nutzer aktiv per Auto-Fix-Klick hinzugefuegt + deterministisch
                // aus der Richtlinie berechnet → bestaetigt, kein offener Vorschlag.
                istVorschlag: false,
              },
            ],
          });
        }
      }
    }
  }

  // --- 4. Nicht foerderfaehige Kategorien als Eigenanteil markieren -------
  const verbotene = new Set(
    richtlinie.kostenpositionen.filter((k) => !k.foerderfaehig).map((k) => k.kategorie)
  );
  if (verbotene.size > 0) {
    const verbotenePostenAlsFoerderung = posten.filter(
      (p) => verbotene.has(p.kategorie) && !p.eigenanteil
    );
    if (verbotenePostenAlsFoerderung.length > 0) {
      const summe = verbotenePostenAlsFoerderung.reduce((s, p) => s + p.betragEur, 0);
      const kats = [...new Set(verbotenePostenAlsFoerderung.map((p) => p.kategorie))].join(", ");
      actions.push({
        id: "flag-verbotene-kategorien-als-eigenanteil",
        label: `${verbotenePostenAlsFoerderung.length} nicht foerderfaehige Posten als Eigenanteil markieren`,
        description: `Die Richtlinie schliesst die Kategorie(n) ${kats} aus der Foerderung aus. Aktion verschiebt ${verbotenePostenAlsFoerderung.length} Posten (${fmtEur(summe)}) auf Eigenanteil — sie bleiben im Plan, zaehlen aber nicht mehr zur Foerdersumme.`,
        apply: (p) =>
          p.map((it) =>
            verbotene.has(it.kategorie) && !it.eigenanteil ? { ...it, eigenanteil: true } : it
          ),
      });
    }
  }

  // --- 5. Pro-Kategorie maxEur ueberschritten -----------------------------
  for (const regel of richtlinie.kostenpositionen) {
    if (!regel.foerderfaehig || !regel.maxEur) continue;
    const foerderInKat = sum(
      posten,
      (p) => p.kategorie === regel.kategorie && !p.eigenanteil
    );
    if (foerderInKat > regel.maxEur) {
      const diff = foerderInKat - regel.maxEur;
      actions.push({
        id: `cap-kategorie-max-eur-${regel.kategorie}`,
        label: `Kategorie "${regel.kategorie}" auf ${fmtEur(regel.maxEur)} kappen`,
        description: `Reduziert die geforderten Posten der Kategorie "${regel.kategorie}" anteilig, sodass deren Foerdersumme ${fmtEur(regel.maxEur)} nicht ueberschreitet (Differenz: ${fmtEur(diff)}).`,
        apply: (p) => scaleFoerderPostenInKategorie(p, regel.kategorie, regel.maxEur!),
      });
    }
  }

  // --- 6. Pro-Kategorie maxProzent ueberschritten -------------------------
  for (const regel of richtlinie.kostenpositionen) {
    if (!regel.foerderfaehig || !regel.maxProzent) continue;
    if (gesamt <= 0) continue;
    const foerderInKat = sum(
      posten,
      (p) => p.kategorie === regel.kategorie && !p.eigenanteil
    );
    const aktuellProz = (foerderInKat / gesamt) * 100;
    if (aktuellProz > regel.maxProzent + EPS) {
      const target = (gesamt * regel.maxProzent) / 100;
      actions.push({
        id: `cap-kategorie-max-prozent-${regel.kategorie}`,
        label: `Kategorie "${regel.kategorie}" auf ${regel.maxProzent} % kappen`,
        description: `Reduziert die geforderten Posten der Kategorie "${regel.kategorie}" so, dass sie maximal ${regel.maxProzent} % der Gesamtkosten ausmachen (aktuell ${aktuellProz.toFixed(1)} %).`,
        apply: (p) => scaleFoerderPostenInKategorie(p, regel.kategorie, Math.round(target)),
      });
    }
  }

  return actions;
}
