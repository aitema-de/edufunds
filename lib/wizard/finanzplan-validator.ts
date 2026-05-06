import type { Finanzplan, Finanzposten } from "./types";
import type { Richtlinie, Kostenposition } from "./richtlinien-schema";

export type WarnungsLevel = "error" | "warning" | "info";

export interface Warnung {
  level: WarnungsLevel;
  message: string;
  /** Optional: auf welchen Posten/Kategorie bezieht sich die Warnung? */
  kategorie?: Finanzposten["kategorie"];
  postenId?: string;
}

function sum(posten: Finanzposten[], pred: (p: Finanzposten) => boolean): number {
  return posten.filter(pred).reduce((s, p) => s + p.betragEur, 0);
}

export interface ValidationResult {
  warnungen: Warnung[];
  gesamtEur: number;
  foerderEur: number;
  eigenanteilEur: number;
  eigenanteilProzent: number;
  foerderungProzent: number;
  /** true, wenn keine error-Level-Warnung besteht. */
  okFuerFreigabe: boolean;
}

export function validateFinanzplan(
  plan: Finanzplan,
  richtlinie: Richtlinie | null | undefined
): ValidationResult {
  const warnungen: Warnung[] = [];
  const gesamt = sum(plan.posten, () => true);
  const eigen = sum(plan.posten, (p) => !!p.eigenanteil);
  const foerder = gesamt - eigen;

  const eigenProzent = gesamt > 0 ? (eigen / gesamt) * 100 : 0;
  const foerderProzent = gesamt > 0 ? (foerder / gesamt) * 100 : 0;

  if (gesamt === 0) {
    warnungen.push({
      level: "warning",
      message: "Keine Posten im Plan — bitte mindestens einen Posten anlegen, bevor du freigibst.",
    });
  }

  if (richtlinie) {
    // Gesamtbudget-Check
    if (richtlinie.foerderhoehe.maxEur && foerder > richtlinie.foerderhoehe.maxEur) {
      warnungen.push({
        level: "error",
        message: `Geforderte Foerdersumme ${foerder.toLocaleString("de-DE")} EUR ueberschreitet die max. Foerderhoehe von ${richtlinie.foerderhoehe.maxEur.toLocaleString("de-DE")} EUR.`,
      });
    }
    if (
      richtlinie.foerderhoehe.maxProzentGesamtkosten &&
      foerderProzent > richtlinie.foerderhoehe.maxProzentGesamtkosten + 0.5
    ) {
      warnungen.push({
        level: "error",
        message: `Foerderanteil ${foerderProzent.toFixed(1)} % ueberschreitet max. ${richtlinie.foerderhoehe.maxProzentGesamtkosten} % der Gesamtkosten.`,
      });
    }

    // Eigenanteil-Pflicht
    if (richtlinie.eigenmittel.pflicht) {
      const min = richtlinie.eigenmittel.mindestProzent ?? 0;
      if (eigenProzent + 0.5 < min) {
        warnungen.push({
          level: "error",
          message: `Eigenanteil ${eigenProzent.toFixed(1)} % liegt unter dem geforderten Minimum von ${min} %.`,
        });
      }
    }

    // Pro Kategorie
    const byKategorie = new Map<Finanzposten["kategorie"], Finanzposten[]>();
    for (const p of plan.posten) {
      const arr = byKategorie.get(p.kategorie) ?? [];
      arr.push(p);
      byKategorie.set(p.kategorie, arr);
    }

    for (const [kat, posten] of byKategorie) {
      const regel = richtlinie.kostenpositionen.find((k) => k.kategorie === kat);
      const summeKat = sum(posten, () => true);
      const foerderKat = sum(posten, (p) => !p.eigenanteil);

      if (!regel) {
        warnungen.push({
          level: "info",
          message: `Kategorie "${kat}" ist in der Richtlinie nicht explizit geregelt.`,
          kategorie: kat,
        });
        continue;
      }

      if (!regel.foerderfaehig) {
        warnungen.push({
          level: "error",
          message: `Kategorie "${kat}" ist laut Richtlinie NICHT foerderfaehig. ${regel.bedingungen?.join(" ") ?? ""}`,
          kategorie: kat,
        });
        continue;
      }

      if (regel.maxEur && foerderKat > regel.maxEur) {
        warnungen.push({
          level: "error",
          message: `Kategorie "${kat}": Foerderanteil ${foerderKat.toLocaleString("de-DE")} EUR ueberschreitet Max ${regel.maxEur.toLocaleString("de-DE")} EUR.`,
          kategorie: kat,
        });
      }

      if (regel.maxProzent && gesamt > 0) {
        const prozent = (foerderKat / gesamt) * 100;
        if (prozent > regel.maxProzent + 0.5) {
          warnungen.push({
            level: "error",
            message: `Kategorie "${kat}": ${prozent.toFixed(1)} % der Gesamtkosten, aber Max ${regel.maxProzent} %.`,
            kategorie: kat,
          });
        }
      }
    }

    // Kumulierungs-Pflicht-Hinweis als Info
    if (richtlinie.kumulierung.erlaubt === false) {
      warnungen.push({
        level: "info",
        message: "Dieses Programm erlaubt keine Doppelfoerderung derselben Massnahme aus anderen Mitteln.",
      });
    }
  } else {
    warnungen.push({
      level: "info",
      message: "Keine Richtlinie erfasst — Plan wird nicht gegen Foerderregeln validiert.",
    });
  }

  const okFuerFreigabe = !warnungen.some((w) => w.level === "error") && gesamt > 0;

  return {
    warnungen,
    gesamtEur: gesamt,
    foerderEur: foerder,
    eigenanteilEur: eigen,
    eigenanteilProzent: eigenProzent,
    foerderungProzent: foerderProzent,
    okFuerFreigabe,
  };
}
