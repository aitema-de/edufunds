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
  /**
   * Gutachter-Gewicht 1-3: wie teuer diese Luecke in der WIZ-05-Messung ist.
   * Steuert die Reihenfolge der Nachfassfragen (lib/wizard/interview-abschluss.ts).
   * Nur Regeln MIT `nachfrage` werden nachgefasst.
   */
  gewicht?: 1 | 2 | 3;
  /**
   * Woertliche Nachfassfrage, wenn der Interviewer abschliessen will, obwohl diese
   * Angabe fehlt. Bewusst deterministisch statt LLM-formuliert: die Frage muss
   * wiedererkennbar sein, damit sie GENAU EINMAL gestellt wird ("Fehlendes Feld ist
   * keine Tatsache" — wer nicht antworten kann, wird nicht bedraengt).
   */
  nachfrage?: string;
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
  /**
   * Die beiden folgenden Regeln kommen aus der Gutachter-Messung vom 30.07.2026
   * (scripts/eval-gutachter.ts, n=25, zwei unabhaengige Judge-Modelle). Dort sind
   * genau diese zwei fehlenden Angaben die meistgenannten Maengel:
   *
   *   Finanzplan  — schwaechstes Kriterium ueberhaupt (2,42 von 5; 39 von 50
   *                 Einzelurteilen mit Note <= 3). Woertlich wiederkehrend:
   *                 "benennt zwar Posten, enthaelt aber keinerlei konkrete Zahlen
   *                 ... und ist somit nicht pruefbar".
   *   Bedarf      — 3,38 von 5, 33 Urteile <= 3, wiederkehrend: "plausibel
   *                 behauptet, aber nicht mit konkreten Zahlen aus der Schule belegt".
   *
   * Die Pipeline darf beides NICHT erfinden (das waere Halluzination, vgl.
   * lib/wizard/fact-verification.ts) — die Angaben koennen nur vom Nutzer kommen.
   * Deshalb gehoeren sie in den Pre-Flight-Check, wo der Nutzer sie noch
   * nachliefern kann, statt spaeter im Antrag als Luecke aufzutauchen.
   *
   * Bewusst "mittel", nicht "hoch": die Ampel soll den Punkt sichtbar machen, aber
   * nicht ganze Sitzungen auf "kritisch" kippen. Ein Hochstufen auf "hoch" ist eine
   * Produktentscheidung, keine technische.
   */
  {
    feld: "budget.beantragt_eur",
    label: "Beantragte Fördersumme",
    schwere: "mittel",
    gewicht: 3,
    hinweis:
      "Ohne Betrag bleibt der Finanzplan unbeziffert — Gutachter bewerten ihn dann als nicht prüfbar.",
    nachfrage:
      "Eine letzte wichtige Sache, bevor ich schreibe: Welche Summe wollt ihr ungefähr beantragen? " +
      "Eine grobe Hausnummer reicht völlig — auch \"so um die 5.000 Euro\" hilft mehr als gar keine Zahl. " +
      "Falls ihr das wirklich noch nicht wisst, schreib einfach \"weiß ich nicht\", dann lasse ich es offen.",
    isMissing: (f) => {
      const v = get(f, "budget.beantragt_eur");
      return typeof v !== "number" || !Number.isFinite(v) || v <= 0;
    },
  },
  {
    feld: "budget.hauptposten",
    label: "Wofür das Geld ausgegeben wird",
    schwere: "mittel",
    gewicht: 2,
    hinweis: "Gutachter bemängeln Posten, die nicht aus dem Vorhaben abgeleitet sind.",
    nachfrage:
      "Wofür genau würdet ihr das Geld ausgeben? Zwei oder drei Stichworte reichen — " +
      "also z. B. \"Tablets, Honorar für eine Referentin, Material\". Wenn ihr zu einem Posten " +
      "schon einen Preis kennt oder ein Angebot habt, nenn ihn gern mit.",
    isMissing: (f) => isEmptyArray(get(f, "budget.hauptposten")),
  },
  {
    feld: "schule.schuelerzahl",
    label: "Schülerzahl",
    schwere: "mittel",
    gewicht: 2,
    hinweis:
      "Eine konkrete Zahl macht aus einem behaupteten Bedarf einen belegten — sie taucht in Bedarfs- und Wirkungsteil auf.",
    nachfrage:
      "Zwei Zahlen fehlen mir noch für den Bedarfsteil: Wie viele Schülerinnen und Schüler hat eure Schule " +
      "insgesamt, und wie viele sind es beim geplanten Vorhaben? Ungefähre Zahlen sind in Ordnung.",
    isMissing: (f) => {
      const v = get(f, "schule.schuelerzahl");
      return typeof v !== "number" || !Number.isFinite(v) || v <= 0;
    },
  },
];

/**
 * Nachfass-faehige Luecken, absteigend nach Gutachter-Gewicht.
 *
 * WARUM DAS HIER LIEGT (Architektur-Befund 03.08.2026)
 * ---------------------------------------------------
 * Dieses Modul kannte die punktekostenden Luecken schon — es durfte sie nur
 * ANZEIGEN. `evaluateFactsReadiness` wurde ausschliesslich von
 * `app/api/wizard/readiness/route.ts` gerufen, einer passiven Ampel. Ueber das
 * Ende des Interviews entschied `nextStep()`, das die Regeln nicht kennt.
 *
 * Die Komponente mit dem Wissen hatte keine Autoritaet, die Komponente mit der
 * Autoritaet kein Wissen. Ergebnis: Das Interview endete, bevor Kosten- und
 * Mengenangaben erhoben waren, und der Generator konnte die Luecke nur noch als
 * `[TODO: …]` markieren — was der Gutachter mit 25× "Schaetzung" und 9×
 * "Platzhalter" abstraft (WIZ-05, n=25, zwei Judges).
 *
 * Diese Funktion gibt dem Regelwerk eine Stimme; die Autoritaet baut
 * `lib/wizard/interview-abschluss.ts` darauf.
 */
export interface NachfassLuecke {
  feld: Pfad;
  label: string;
  gewicht: number;
  nachfrage: string;
}

/**
 * Schon verneint? Dann nicht noch einmal fragen.
 * ----------------------------------------------
 * Das Gate fragt jede Luecke hoechstens einmal — aber nur bezogen auf die EIGENE
 * deterministische Nachfrage. Hat der Nutzer dasselbe Thema bereits auf eine freie
 * Interviewer-Frage hin verneint, merkt es das nicht und fragt trotzdem.
 *
 * Beobachtet am 05.08.2026 (gepaarter Lauf, n=25): In pv-res-004 hatte der Nutzer
 * VIER Mal zu Geld verneint ("wie hoch der Betrag waere, das haben wir noch
 * nicht ...") — das Gate fragte bei Frage 11 erneut nach der Foerdersumme und
 * erhielt erwartungsgemaess wieder ein "weiss ich nicht". Eine verbrannte Frage
 * aus einem Kontingent von drei. Das ist "Fehlendes Feld ist keine Tatsache" in
 * der zweiten Instanz: aus einem leeren Feld folgt nicht, dass die Angabe noch
 * zu holen ist.
 *
 * BEWUSST ENG GEHALTEN. Eine zu breite Regel waere schaedlicher als der Defekt,
 * den sie behebt: sie wuerde legitime Erstfragen unterdruecken und den Fuellgrad
 * senken. Deshalb muessen Verneinung UND ein feldspezifisches Themenwort in
 * DERSELBEN Antwort stehen, und die Themenwoerter sind absichtlich schmal.
 *
 * Zwei Faelle aus demselben Lauf, an denen die Enge geprueft ist:
 *   - pv-edge-003 sprach von "Bewegungsfoerderung" — ein Stamm `foerder` haette
 *     hier unterdrueckt. Die Frage wurde gestellt und brachte "zwischen 25.000
 *     und 30.000 Euro". Deshalb nur `foerdersumme|foerderhoehe|foerderbetrag`.
 *   - pv-edge-004 verneinte "noch nicht alles durchgerechnet" ohne Summenwort.
 *     Die Frage wurde gestellt und brachte immerhin Materialkosten von
 *     1.500–2.000 EUR. Deshalb gehoert `kosten` NICHT zu den Themenwoertern der
 *     Foerdersumme.
 *
 * Greift nur auf die Nachfrage. Die passive Ampel meldet das Feld weiter als
 * offen — es fehlt ja tatsaechlich.
 */
/**
 * Zwischen "weiss" und "nicht" stehen im echten Sprachgebrauch Woerter — "weiss
 * ICH nicht", "weiss ich EHRLICH GESAGT nicht". Ein Muster, das die beiden direkt
 * nebeneinander verlangt, findet fast keine echte Verneinung (Fehler beim ersten
 * Entwurf am 05.08.2026: es griff bei keinem einzigen Satz aus dem Lauf).
 *
 * Die Luecke ist auf drei Woerter begrenzt und darf KEIN Satzzeichen enthalten.
 * Das trennt "weiss ich nicht" von "Ich weiss, das ist nicht viel" — dort folgt
 * auf "weiss" ein Komma, und die Verneinung gehoert zu einem anderen Satzteil.
 */
const VERNEINUNG =
  /(wei(?:ß|ss)(?:\s+[^\s.,;:!?]+){0,3}\s+nicht|nicht\s+(?:genau\s+)?wei(?:ß|ss)|wissen wir (?:noch )?nicht|keine ahnung|keine (?:genaue )?vorstellung|m(?:ü|ue)ss?te ich (?:erst )?(?:noch )?(?:mal )?(?:nach)?(?:fragen|schauen|sehen|kl(?:ä|ae)ren)|noch nicht (?:durchgerechnet|festgelegt|gekl(?:ä|ae)rt|entschieden|besprochen|ausgerechnet|final)|(?:haben|hab|hatten) wir (?:noch )?nicht|kann (?:ich|man)(?:\s+[^\s.,;:!?]+){0,3}\s+nicht sagen|k(?:ö|oe)nnen wir (?:noch )?nicht sagen|schwer zu sagen)/i;

const NACHFASS_THEMA: Partial<Record<Pfad, RegExp>> = {
  "budget.beantragt_eur":
    /(f(?:ö|oe)rdersumme|f(?:ö|oe)rderh(?:ö|oe)he|f(?:ö|oe)rderbetrag|antragssumme|\bsumme\b|\bbetrag\b|wie ?viel geld)/i,
  "budget.hauptposten": /(kostenposten|hauptposten|\bposten\b|wof(?:ü|ue)r.*(geld|mittel))/i,
  "schule.schuelerzahl": /(sch(?:ü|ue)lerzahl|wie viele (sch(?:ü|ue)ler|kinder))/i,
  "budget.eigenmittel_eur": /(eigenanteil|eigenmittel|eigenleistung|selbst beisteuern)/i,
};

function bereitsVerneint(feld: Pfad, userAnswers?: string[]): boolean {
  const thema = NACHFASS_THEMA[feld];
  if (!thema || !userAnswers?.length) return false;
  return userAnswers.some((a) => VERNEINUNG.test(a) && thema.test(a));
}

export function offeneNachfassLuecken(
  facts: WizardFacts,
  richtlinie?: Richtlinie | null,
  userAnswers?: string[]
): NachfassLuecke[] {
  const report = evaluateFactsReadiness(facts, richtlinie, userAnswers);
  const offen = new Set(report.issues.map((i) => i.feld));
  const aus = REGELN.filter(
    (r): r is Regel & { nachfrage: string } =>
      typeof r.nachfrage === "string" && offen.has(r.feld)
  ).map((r) => ({
    feld: r.feld,
    label: r.label,
    gewicht: r.gewicht ?? 1,
    nachfrage: r.nachfrage,
  }));

  // Eigenanteil ist keine feste Regel, sondern haengt an der Richtlinie — die
  // Judges nennen ihn in 8 von 50 Urteilen ausdruecklich ("Eigenmittel/Folgekosten
  // nicht adressiert"). Wird nur nachgefasst, wenn die Richtlinie ihn verlangt.
  if (offen.has("budget.eigenmittel_eur")) {
    const mp = richtlinie?.eigenmittel?.mindestProzent;
    aus.push({
      feld: "budget.eigenmittel_eur",
      label: "Eigenanteil",
      gewicht: 2,
      nachfrage:
        `Diese Förderung verlangt einen Eigenanteil${mp ? ` von mindestens ${mp} %` : ""}. ` +
        "Was kann eure Schule selbst beisteuern — Geld aus dem Förderverein, Eigenleistung, " +
        "Sachmittel? Auch \"noch offen\" ist eine brauchbare Antwort, dann schreibe ich es so.",
    });
  }

  return aus
    .filter((l) => !bereitsVerneint(l.feld, userAnswers))
    .sort((a, b) => b.gewicht - a.gewicht);
}

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
