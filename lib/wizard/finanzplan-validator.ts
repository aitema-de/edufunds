import type { Finanzplan, Finanzposten } from "./types";
import type { Richtlinie, Kostenposition } from "./richtlinien-schema";
import { pruefeArithmetik } from "./finanzplan-arithmetik";
import { HERLEITUNGS_SCHWELLE_EUR, pruefeHerleitung } from "./finanzplan-herleitung";

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
  richtlinie: Richtlinie | null | undefined,
  /**
   * Antragstext, falls vorhanden. Nur für den Summenabgleich: Nennt der Text
   * eine Gesamt-/Fördersumme, die nicht zur Postensumme passt, ist das ein
   * Widerspruch, den sonst niemand findet (Tester-Feedback #008).
   */
  antragstext?: string
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
        message: `Geforderte Fördersumme ${foerder.toLocaleString("de-DE")} EUR überschreitet die max. Förderhöhe von ${richtlinie.foerderhoehe.maxEur.toLocaleString("de-DE")} EUR.`,
      });
    }
    if (
      richtlinie.foerderhoehe.maxProzentGesamtkosten &&
      foerderProzent > richtlinie.foerderhoehe.maxProzentGesamtkosten + 0.5
    ) {
      warnungen.push({
        level: "error",
        message: `Foerderanteil ${foerderProzent.toFixed(1)} % überschreitet max. ${richtlinie.foerderhoehe.maxProzentGesamtkosten} % der Gesamtkosten.`,
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
          message: `Kategorie "${kat}" ist laut Richtlinie NICHT förderfähig. ${regel.bedingungen?.join(" ") ?? ""}`,
          kategorie: kat,
        });
        continue;
      }

      if (regel.maxEur && foerderKat > regel.maxEur) {
        warnungen.push({
          level: "error",
          message: `Kategorie "${kat}": Förderanteil ${foerderKat.toLocaleString("de-DE")} EUR überschreitet Max ${regel.maxEur.toLocaleString("de-DE")} EUR.`,
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
        message: "Dieses Programm erlaubt keine Doppelförderung derselben Maßnahme aus anderen Mitteln.",
      });
    }
  } else {
    warnungen.push({
      level: "info",
      message: "Keine Richtlinie erfasst — Plan wird nicht gegen Förderregeln validiert.",
    });
  }

  // Rechenprüfung (deterministisch, s. finanzplan-arithmetik.ts): Prozent-Posten,
  // Summenabgleich gegen `hinweise`/Antragstext, Selbstwiderspruch bei der
  // Förderfähigkeit. Bewusst NACH den Richtlinien-Regeln, damit die Reihenfolge
  // der Meldungen stabil bleibt.
  warnungen.push(...pruefeArithmetik(plan, richtlinie, antragstext));

  // Herleitungs-Pflicht (Paket 4, Feedback #008): Bei der Generierung setzt die
  // Pipeline für jeden unbelegten grossen Posten einen `[TODO: …]`-Marker, hier
  // ist also normalerweise nichts zu melden. Die Prüfung greift, wenn der
  // Nutzer im Editor Beträge erhöht oder eine Begründung samt Marker
  // überschreibt — dann steht wieder eine nackte Zahl im Plan.
  //
  // Bewusst `warning`, nie `error`: Es ist der Antragsteller, der entscheidet,
  // ob er den Posten so einreicht. Ein `error` würde die Freigabe sperren,
  // obwohl der Plan rechnerisch stimmt (die Sackgassen-Regel aus
  // finanzplan-arithmetik.ts).
  for (const b of pruefeHerleitung(plan.posten ?? [])) {
    warnungen.push({
      level: "warning",
      message:
        b.grund === "honorar-ohne-zeitgeruest"
          ? `Honorar „${b.bezeichnung}" (${b.betragEur.toLocaleString("de-DE")} EUR) ist nicht über ` +
            `Stundenzahl × Stundensatz aufgeschlüsselt. Fördergeber fragen genau danach — ` +
            `Umfang und Satz ergänzen oder als offenen Punkt markieren.`
          : `Der Posten „${b.bezeichnung}" (${b.betragEur.toLocaleString("de-DE")} EUR) liegt über ` +
            `${HERLEITUNGS_SCHWELLE_EUR.toLocaleString("de-DE")} EUR, ohne dass die Begründung zeigt, ` +
            `wie der Betrag zustande kommt (Menge × Einzelpreis).`,
      kategorie: plan.posten.find((p) => p.id === b.postenId)?.kategorie,
      postenId: b.postenId,
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
