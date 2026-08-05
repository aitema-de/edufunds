/**
 * Abschluss-Autoritaet fuer das Interview (Architektur-Umbau 03.08.2026)
 * ======================================================================
 *
 * DER BEFUND
 * ----------
 * Die WIZ-05-Messung vom 03.08.2026 (n=25, zwei Judges) hat gezeigt, dass die
 * Gutachternote NICHT an der Textqualitaet haengt und auch nicht an
 * Halluzinationen — die Schranken wurden geheertet (WIZ-02 92,4 → 97,2, alle
 * belegten Faelle zu) und die Note blieb bei 3,25.
 *
 * Sie haengt an der DATENLAGE. Ueber 50 Einzelurteile lauten die Maengel:
 *
 *     25×  "Schaetzung"                      9×  "Platzhalter"
 *     14×  "nicht aus dem Vorhaben abgeleitet"  8×  "Eigenmittel/Folgekosten"
 *
 * Das sind exakt die Formulierungen, die "Kennzeichnen statt Erfinden"
 * (Produktentscheidung 02.07.2026) absichtlich erzeugt. Ehrlichkeit und
 * Bewertbarkeit ziehen hier gegeneinander: ein markierter Platzhalter ist auf der
 * Wahrheits-Achse ein Erfolg und auf der Gutachter-Achse ein Abzug. Die Note laesst
 * sich auf dieser Achse nur heben, indem der Nutzer die Angabe LIEFERT — nicht,
 * indem die Pipeline besser darueber hinwegschreibt.
 *
 * DER ARCHITEKTURFEHLER
 * ---------------------
 * Das System wusste bereits deterministisch, welche Angaben fehlen:
 * `facts-readiness.ts` fuehrt die Regeln, inklusive der beiden Felder, die die
 * Gutachter-Messung vom 30.07. als meistgenannte Maengel identifiziert hatte.
 *
 * Nur hatte dieses Wissen keinerlei Autoritaet. `evaluateFactsReadiness` wurde
 * ausschliesslich von `app/api/wizard/readiness/route.ts` gerufen — einer passiven
 * Ampel. Ueber das ENDE des Interviews entschied `nextStep()` allein anhand des
 * LLM-Urteils "ready", und das LLM kennt die Regeln nicht.
 *
 *     Die Komponente mit dem Wissen hatte keine Autoritaet.
 *     Die Komponente mit der Autoritaet hatte kein Wissen.
 *
 * Danach war es zu spaet: der Generator kann eine fehlende Zahl nur noch als
 * `[TODO: …]` markieren.
 *
 * DIE UMKEHR
 * ----------
 * Dieses Modul gibt dem Regelwerk das Vetorecht. Will der Interviewer abschliessen,
 * obwohl eine punktekostende Luecke offen ist und Fragenbudget bleibt, wird der
 * Abschluss in eine gezielte Nachfrage umgewandelt.
 *
 * VIER SICHERUNGEN gegen ein Interview, das zur Behoerden-Befragung wird:
 *
 *   1. GENAU EINMAL je Luecke. Die Nachfrage ist deterministisch formuliert und
 *      damit im Verlauf wiedererkennbar. Wer "weiss ich nicht" antwortet, wird
 *      nicht erneut gefragt — "Fehlendes Feld ist keine Tatsache".
 *   2. HARTE OBERGRENZE von MAX_NACHFASSEN Nachfragen je Interview.
 *   3. maxQuestions bleibt unangetastet. Das Gate verschiebt das Ende, es hebt den
 *      Deckel nicht an.
 *   4. Nur Luecken MIT hinterlegter Nachfrage blockieren — nicht jede
 *      Readiness-Warnung. Die Auswahl folgt der Gutachter-Evidenz, nicht dem Gefuehl.
 *
 * GEGENPROBE, DIE DIESE RICHTUNG STUETZT: Hebel 5 (Tiefen-Block, 31.07.) verkuerzte
 * das Interview um 2,4 Fragen und senkte dabei die Zahlangaben in den Fakten von 5,9
 * auf 4,4 — er steht seitdem auf AUS. Kuerzer sammelt weniger; genau die Angaben,
 * an denen es dem Finanzplan fehlt, kommen dann seltener zustande.
 */

import type { WizardFacts } from "./types";
import type { Richtlinie } from "./richtlinien-schema";
import { offeneNachfassLuecken, type NachfassLuecke } from "./facts-readiness";

/**
 * Mehr als drei Nachfassfragen machen aus einem Beratungsgespraech ein Formular.
 * Die drei schwersten Luecken decken laut Gutachter-Evidenz den Grossteil des
 * Abzugs ab (Foerdersumme, Kostenposten, Schuelerzahl).
 */
export const MAX_NACHFASSEN = 3;

export type AbschlussGrund =
  /** Keine nachfassbare Luecke offen — Abschluss ist in Ordnung. */
  | "keine-luecke"
  /** Fragenbudget erschoepft — der harte Deckel schlaegt das Gate. */
  | "fragenbudget"
  /** Nachfass-Kontingent aufgebraucht. */
  | "kontingent"
  /** Alle offenen Luecken wurden bereits einmal erfragt. */
  | "bereits-gefragt"
  /** Luecke offen und Nachfrage moeglich — Abschluss wird verweigert. */
  | "nachfassen"
  /** Nur Messbetrieb: Gate per `EDUFUNDS_EVAL_ABSCHLUSS_GATE=aus` stillgelegt. */
  | "eval-abgeschaltet";

/**
 * Vergleichsarm fuer die Wirkungsmessung — ausschliesslich fuer die Eval.
 * ---------------------------------------------------------------------
 * Ob dieses Gate den Fuellgrad der Faktentabelle hebt, laesst sich nur an einem
 * gepaarten Lauf ablesen: dieselben simulierten Personen einmal mit und einmal
 * ohne Gate. Ohne den Schalter bliebe als Vergleich nur ein aelterer Lauf gegen
 * ANDERE Personen — und dann erklaert "die neue Besetzung verweigert seltener"
 * jeden Anstieg genauso gut wie das Gate.
 *
 * Richtung der Vorgabe ist bewusst gewaehlt: Der Schalter kann nur ABschalten,
 * und nur bei exakt einem Wert. Fehlt die Variable oder steht etwas anderes
 * darin — der Normalfall in jeder Deployment-Umgebung — ist das Gate aktiv.
 * Ein Tippfehler kann es also nicht versehentlich stilllegen.
 */
const EVAL_ABSCHALT_WERT = "aus";
let abschaltungGemeldet = false;

function gateAbgeschaltet(): boolean {
  const aus = process.env.EDUFUNDS_EVAL_ABSCHLUSS_GATE === EVAL_ABSCHALT_WERT;
  if (aus && !abschaltungGemeldet) {
    abschaltungGemeldet = true;
    console.warn(
      "[interviewer] ⚠️  Abschluss-Gate per EDUFUNDS_EVAL_ABSCHLUSS_GATE=aus stillgelegt — " +
        "Vergleichsarm der Eval. In einer Nutzer-Umgebung ist das ein Defekt."
    );
  }
  return aus;
}

export interface AbschlussUrteil {
  darfEnden: boolean;
  grund: AbschlussGrund;
  /** Gesetzt genau dann, wenn `darfEnden === false`. */
  nachfrage?: NachfassLuecke;
  /** Wie viele Nachfragen bereits gestellt wurden (fuer Logging/Tests). */
  bereitsGefragt: number;
}

/** Whitespace-tolerantes Wiedererkennen einer bereits gestellten Nachfrage. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Wurde diese Nachfrage im Verlauf schon gestellt? Sie ist deterministisch
 * formuliert, also genuegt ein Vergleich gegen die bereits gestellten Fragen.
 * Verglichen wird ein Praefix, damit spaetere Feinschliffe an der Formulierung
 * alte Sessions nicht in eine Wiederholung laufen lassen.
 */
const WIEDERERKENNUNG_LEN = 60;

function bereitsGestellt(gestellteFragen: string[], nachfrage: string): boolean {
  const anker = normalize(nachfrage).slice(0, WIEDERERKENNUNG_LEN);
  if (!anker) return false;
  return gestellteFragen.some((q) => normalize(q).includes(anker));
}

/**
 * Wiedererkennungs-Anker der Nachfragen aus `facts-readiness.ts`. Dient nur dem
 * ZAEHLEN gestellter Nachfragen (Kontingent) — die Wiederholungspruefung je Luecke
 * laeuft ueber den vollen Text. Bewusst kurze, stabile Phrasen.
 */
const NACHFRAGE_MARKER = [
  "welche summe wollt ihr",
  "wofür genau würdet ihr das geld",
  "wie viele schülerinnen und schüler hat eure schule",
  "diese förderung verlangt einen eigenanteil",
];

function zaehleNachfragen(gestellteFragen: string[]): number {
  return gestellteFragen.filter((q) => {
    const n = normalize(q);
    return NACHFRAGE_MARKER.some((m) => n.includes(m));
  }).length;
}

/**
 * Entscheidet, ob das Interview enden darf.
 *
 * @param gestellteFragen  Alle bisher gestellten KI-Fragen (Wiederholungsschutz).
 * @param totalQuestions   Bereits gestellte Fragen insgesamt.
 * @param maxQuestions     Harter Deckel aus der Session.
 */
export function beurteileAbschluss(
  facts: WizardFacts,
  richtlinie: Richtlinie | null | undefined,
  userAnswers: string[] | undefined,
  gestellteFragen: string[],
  totalQuestions: number,
  maxQuestions: number
): AbschlussUrteil {
  const bereits = zaehleNachfragen(gestellteFragen);

  // Vergleichsarm: stellt den Zustand vor dem Umbau bitgenau her — jeder Weg zu
  // "ready" endet sofort, das Regelwerk wird nicht einmal befragt.
  if (gateAbgeschaltet()) {
    return { darfEnden: true, grund: "eval-abgeschaltet", bereitsGefragt: bereits };
  }

  const luecken = offeneNachfassLuecken(facts, richtlinie, userAnswers);

  if (totalQuestions >= maxQuestions) {
    return { darfEnden: true, grund: "fragenbudget", bereitsGefragt: bereits };
  }
  if (bereits >= MAX_NACHFASSEN) {
    return { darfEnden: true, grund: "kontingent", bereitsGefragt: bereits };
  }
  if (luecken.length === 0) {
    return { darfEnden: true, grund: "keine-luecke", bereitsGefragt: bereits };
  }

  const offen = luecken.find((l) => !bereitsGestellt(gestellteFragen, l.nachfrage));
  if (!offen) {
    return { darfEnden: true, grund: "bereits-gefragt", bereitsGefragt: bereits };
  }

  return { darfEnden: false, grund: "nachfassen", nachfrage: offen, bereitsGefragt: bereits };
}
