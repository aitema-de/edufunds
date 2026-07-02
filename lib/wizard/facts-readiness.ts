/**
 * Pre-Flight-Check vor dem Pipeline-Start: welche Pflicht-Facts fehlen?
 *
 * Zielsetzung: Nutzer sieht BEVOR er 1-3 Minuten Pipeline wartet, ob die
 * Datenbasis für einen tragfähigen Antrag reicht. Kein Blockieren, nur
 * transparentes Warnen.
 */

import type { WizardFacts } from "./types";
import type { Richtlinie } from "./richtlinien-schema";

export type ReadinessSchwere = "hoch" | "mittel" | "niedrig";

export interface ReadinessIssue {
  feld: string;
  label: string;
  schwere: ReadinessSchwere;
  hinweis?: string;
}

export type ReadinessStatus = "ok" | "hinweise" | "kritisch";

export interface ReadinessReport {
  status: ReadinessStatus;
  issues: ReadinessIssue[];
}

type Pfad = string;
type Checker = (facts: WizardFacts) => boolean;

interface Regel {
  feld: Pfad;
  label: string;
  schwere: ReadinessSchwere;
  hinweis?: string;
  isMissing: Checker;
}

function get<T = unknown>(obj: unknown, path: string): T | undefined {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur as T | undefined;
}

function isEmptyString(v: unknown): boolean {
  return typeof v !== "string" || v.trim().length === 0;
}

function isEmptyArray(v: unknown): boolean {
  return !Array.isArray(v) || v.length === 0 || v.every((x) => isEmptyString(x));
}

const REGELN: Regel[] = [
  {
    feld: "schule.name",
    label: "Name der Schule",
    schwere: "hoch",
    isMissing: (f) => isEmptyString(get(f, "schule.name")),
  },
  {
    feld: "schule.typ",
    label: "Schultyp",
    schwere: "mittel",
    isMissing: (f) => isEmptyString(get(f, "schule.typ")),
  },
  {
    feld: "projekt.titel",
    label: "Projekttitel",
    schwere: "hoch",
    isMissing: (f) => isEmptyString(get(f, "projekt.titel")),
  },
  {
    feld: "projekt.kurzbeschreibung",
    label: "Kurzbeschreibung des Projekts",
    schwere: "hoch",
    isMissing: (f) => isEmptyString(get(f, "projekt.kurzbeschreibung")),
  },
  {
    feld: "projekt.zielgruppe",
    label: "Zielgruppe (welche Kinder, wie viele)",
    schwere: "hoch",
    hinweis: "Ohne konkrete Zielgruppe wirkt der Antrag austauschbar.",
    isMissing: (f) => isEmptyString(get(f, "projekt.zielgruppe")),
  },
  {
    feld: "projekt.ziele",
    label: "Projektziele",
    schwere: "hoch",
    isMissing: (f) => isEmptyArray(get(f, "projekt.ziele")),
  },
  {
    feld: "projekt.aktivitaeten",
    label: "Konkrete Aktivitäten",
    schwere: "mittel",
    hinweis: "Was macht ihr eigentlich — Workshops, Anschaffungen, Fortbildungen?",
    isMissing: (f) => isEmptyArray(get(f, "projekt.aktivitaeten")),
  },
  {
    feld: "projekt.zeitraum",
    label: "Projektzeitraum",
    schwere: "niedrig",
    isMissing: (f) => isEmptyString(get(f, "projekt.zeitraum")),
  },
  {
    feld: "wirkung.erwartete_ergebnisse",
    label: "Erwartete Ergebnisse",
    schwere: "hoch",
    hinweis: "Was soll am Ende messbar anders sein?",
    isMissing: (f) => isEmptyArray(get(f, "wirkung.erwartete_ergebnisse")),
  },
  {
    feld: "wirkung.messbare_indikatoren",
    label: "Messbare Indikatoren",
    schwere: "mittel",
    hinweis: "Förderer mögen Zahlen: Teilnehmendenzahl, Stunden, Vorher/Nachher-Werte.",
    isMissing: (f) => isEmptyArray(get(f, "wirkung.messbare_indikatoren")),
  },
  {
    feld: "wirkung.nachhaltigkeit",
    label: "Nachhaltigkeit nach Projektende",
    schwere: "mittel",
    hinweis: "Wie geht es weiter, wenn die Förderung ausläuft?",
    isMissing: (f) => isEmptyString(get(f, "wirkung.nachhaltigkeit")),
  },
  {
    feld: "budget.hauptposten",
    label: "Hauptkostenposten",
    schwere: "mittel",
    isMissing: (f) => isEmptyArray(get(f, "budget.hauptposten")),
  },
];

/**
 * Prüft, ob eine vorhandene Richtlinie Zusatz-Pflichten auferlegt (Eigenanteil,
 * spezielle Pflichtabschnitte mit Leitfragen, die bestimmte Facts erwarten).
 * Aktuell konservativ: nur Eigenanteil — fehlt im Facts keine explizite Aussage,
 * geben wir einen "mittel"-Hinweis aus.
 */
function richtlinienZusatzIssues(
  facts: WizardFacts,
  richtlinie?: Richtlinie | null
): ReadinessIssue[] {
  if (!richtlinie) return [];
  const out: ReadinessIssue[] = [];
  if (richtlinie.eigenmittel?.pflicht) {
    const eigenMittelErwaehnt =
      typeof get(facts, "budget.eigenmittel_eur") === "number" ||
      (Array.isArray(get(facts, "budget.hauptposten")) &&
        (get<string[]>(facts, "budget.hauptposten") ?? []).some((p) =>
          /eigenanteil|eigenmittel|traeger|träger/i.test(String(p))
        ));
    if (!eigenMittelErwaehnt) {
      const mp = richtlinie.eigenmittel.mindestProzent
        ? ` (mind. ${richtlinie.eigenmittel.mindestProzent} %)`
        : "";
      out.push({
        feld: "budget.eigenmittel_eur",
        label: `Eigenanteil${mp}`,
        schwere: "mittel",
        hinweis:
          "Diese Förderung verlangt einen Eigenanteil. Ohne Angabe im Antrag ist das ein Risiko bei der Prüfung.",
      });
    }
  }
  return out;
}

/**
 * FP-V-2 (Pilot 19.06.): Signale dafür, dass der Nutzer Nachhaltigkeit/Verstetigung
 * in den Rohantworten bereits adressiert hat — auch wenn die Fakten-Extraktion das
 * Feld `wirkung.nachhaltigkeit` nicht befüllt hat. Verhindert einen unscharfen
 * "fehlt"-Hinweis, obwohl die Frage (z. B. in Frage 6) ausführlich beantwortet wurde.
 */
const NACHHALTIGKEIT_SIGNAL =
  /nachhaltig|verstetig|weiterf(?:ü|ue)hr|fortf(?:ü|ue)hr|langfristig|dauerhaft|nach (?:der |dem )?(?:förder|projekt|finanzierung)|auch (?:danach|künftig|weiterhin|in zukunft)|veranker|aus eigenmitteln (?:weiter|fort)/i;

export function evaluateFactsReadiness(
  facts: WizardFacts,
  richtlinie?: Richtlinie | null,
  userAnswers?: string[]
): ReadinessReport {
  const answersBlob = (userAnswers ?? []).join("\n");
  const issues: ReadinessIssue[] = [];
  for (const r of REGELN) {
    if (r.isMissing(facts)) {
      // FP-V-2: Nachhaltigkeit nicht als "fehlt" melden, wenn die Rohantworten sie
      // klar adressieren (Extraktion verfehlt das Freitext-Feld gelegentlich).
      if (
        r.feld === "wirkung.nachhaltigkeit" &&
        answersBlob &&
        NACHHALTIGKEIT_SIGNAL.test(answersBlob)
      ) {
        continue;
      }
      issues.push({ feld: r.feld, label: r.label, schwere: r.schwere, hinweis: r.hinweis });
    }
  }
  issues.push(...richtlinienZusatzIssues(facts, richtlinie));

  const hasHoch = issues.some((i) => i.schwere === "hoch");
  const hasMittel = issues.some((i) => i.schwere === "mittel");
  const status: ReadinessStatus = hasHoch ? "kritisch" : hasMittel ? "hinweise" : "ok";

  return { status, issues };
}
