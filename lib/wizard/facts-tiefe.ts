/**
 * Tiefen-Analyse der Fakten — die fuenf Luecken aus der Gutachter-Messung.
 *
 * WARUM DIESES MODUL EXISTIERT
 * ----------------------------
 * `facts-readiness.ts` prueft, OB ein Slot befuellt ist. Die Gutachter-Messung vom
 * 30.07.2026 (WIZ-05, n=25, zwei unabhaengige Judge-Modelle) hat aber gezeigt: die
 * Slots sind meist befuellt — es fehlt die TIEFE darin. Woertlich wiederkehrende
 * Maengel der Judges:
 *
 *   Finanzplan (2,54 — schwaechstes Kriterium): "benennt zwar Posten, enthaelt aber
 *                keinerlei konkrete Zahlen ... und ist somit nicht pruefbar"
 *   Bedarf     (3,32): "plausibel behauptet, aber nicht mit konkreten Zahlen aus der
 *                Schule belegt"
 *   Umsetzung  (3,36): "Massnahmen aufgelistet, aber ohne Verantwortliche oder Zeitbezug"
 *   Wirkung    (3,68): "Indikatoren messen Output statt Wirkung" — kein Ausgangswert,
 *                kein Zielwert
 *   Verstetigung (3,66): "Zusage ohne Mechanik" — kein Beschluss, keine Zustaendigkeit
 *
 * Diese Angaben DARF die Pipeline nicht erfinden (WIZ-02 steht bei 98,9 — das soll so
 * bleiben). Sie koennen nur aus dem Interview kommen. Deshalb misst dieses Modul sie
 * deterministisch aus den Facts und speist damit zwei Stellen:
 *
 *   1. `factsCoverageBlock()` in prompts.ts — der Interviewer sieht, wo Tiefe fehlt.
 *   2. `scripts/eval-simuser.ts` — die Ausbeute-Metrik des simulierten Nutzers.
 *
 * ⚠️ BEWUSSTE KOPPLUNG, MIT BEKANNTER SCHWAECHE: Prompt und Metrik teilen sich diese
 * eine Definition. Das verhindert Drift, macht die Metrik aber zur NAHZIEL-Messung —
 * sie ist per Konstruktion auf die Prompt-Aenderung ausgerichtet (Goodhart). Sie kann
 * belegen, dass mehr Zahlen ins Interview kommen; sie kann NICHT belegen, dass der
 * Antrag dadurch besser wird. Das entscheidet weiterhin WIZ-05 (Gutachterurteil) und
 * WIZ-01/02 (Coverage/Halluzination) auf frisch erzeugten Sessions.
 *
 * Rein deterministisch, kein LLM.
 */

import type { WizardFacts } from "./types";

export type TiefeId =
  | "bedarf-ist-zahlen"
  | "kosten-je-posten"
  | "arbeitsplan-wer-wann"
  | "indikator-baseline-ziel"
  | "traeger-zusage";

/**
 * `geklaert` ist kein Zwischenschritt zwischen offen und erfuellt, sondern ein
 * eigener Zustand: der Nutzer hat den Punkt AUSDRUECKLICH verneint oder als offene
 * Luecke benannt ("kein Beschluss", "Budget wissen wir nicht"). Erneutes Fragen
 * waere die Schleife, die der Anti-Wiederholungs-Guard in interviewer.ts ohnehin
 * abbricht — und fuer den Nutzer ein Bug. Deshalb faellt `geklaert` aus der
 * Ausbeute-Quote heraus, statt sie zu druecken.
 */
export type TiefeStatus = "erfuellt" | "teilweise" | "offen" | "geklaert";

export interface TiefeBefund {
  id: TiefeId;
  label: string;
  status: TiefeStatus;
  /** Was der Interviewer konkret erfragen soll, solange der Punkt nicht erfuellt ist. */
  nachfrage: string;
  /** Kurzbegruendung des Status — fuer Report und Debugging, nicht fuer den Prompt. */
  beleg: string;
}

// ============================================================================
// Hilfen
// ============================================================================

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (Array.isArray(v)) return v.map(txt).join(" · ");
  return "";
}

function nichtLeer(v: unknown): boolean {
  return txt(v).trim().length > 0;
}

function liste(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => txt(x).trim()).filter((s) => s.length > 0);
}

/**
 * Zaehlt Zahlangaben. Bewusst eng: eine Jahreszahl allein ("seit 2024") ist keine
 * Bedarfszahl und kein Kostenbetrag — sonst waere jeder Satz mit Jahresangabe
 * automatisch "belegt" und die Metrik luege sich grün.
 *
 * Die Schuljahr-Kurzform muss VOR der einfachen Jahreszahl weg: sonst bleibt von
 * "Schuljahr 2025/26" die "26" stehen und zaehlt als Sachangabe. Genau das hat im
 * ersten Rauchtest ein Zahlen-Leck gemeldet, wo keines war.
 */
export function zahlAngaben(s: string): string[] {
  const ohneJahre = s
    .replace(/\b(?:19|20)\d{2}\s*[/–-]\s*\d{2,4}\b/g, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ");
  return ohneJahre.match(/\d+(?:[.,]\d+)?\s*(?:%|prozent|pp|eur|euro|€)?/gi) ?? [];
}

function hatZahl(s: string): boolean {
  return zahlAngaben(s).length > 0;
}

/**
 * Numerischer Kern einer Zahlangabe — zum VERGLEICHEN, nicht zum Anzeigen.
 *
 * Ohne das vergleicht man Schreibweisen statt Zahlen: Der Nutzer schreibt "45.000 EUR",
 * die Faktentabelle traegt `45000`, und ein Treue-Check meldet eine Erfindung, wo keine
 * ist (drei Fehlalarme am 31.07.2026). Deutsche Tausenderpunkte fallen weg, deutsche
 * Dezimalkommata werden zu Punkten — ein JSON-Dezimalpunkt ("1.5") bleibt unangetastet.
 */
export function zahlKern(z: string): number | null {
  const roh = z.replace(/[^\d.,]/g, "").replace(/[.,]+$/, "");
  if (!roh) return null;
  let norm = roh;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(roh)) norm = roh.replace(/\./g, ""); // 45.000 / 1.234.567
  norm = norm.replace(",", ".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

/** Normalisiert fuer Stichwortsuche: Kleinschreibung, Umlaute aufgeloest. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

/**
 * Hat der Nutzer diesen Punkt selbst als offen/nicht vorhanden benannt?
 * Quellen sind die beiden Slots, in denen genau das landet: die vom Nutzer
 * benannten Luecken und die ausdruecklichen Ausschluesse.
 */
function vomNutzerGeklaert(facts: WizardFacts, stichworte: RegExp): boolean {
  const luecken = liste(facts?.programmpassung?.offene_luecken).join(" · ");
  const ausgeschlossen = liste(facts?.ausgeschlossen as unknown).join(" · ");
  return stichworte.test(norm(`${luecken} ${ausgeschlossen}`));
}

// ============================================================================
// Die fuenf Tiefen-Pruefungen
// ============================================================================

// `lehrkr` statt `lehrkraft`: nach der Umlaut-Aufloesung heisst der Plural "lehrkraefte"
// und wuerde von der ausgeschriebenen Singularform nicht getroffen.
const ZUSTAENDIG =
  /verantwortlich|zustaendig|kollegium|lehrkr|lehrer|schulleitung|koordinat|sozialarbeit|fachschaft|team|ag-leitung|honorarkraft|extern|partner|verein|hausmeister|it-beauftragt|frau |herr /;

const ZEITBEZUG =
  /schuljahr|halbjahr|quartal|semester|monat|woche|woechentlich|taeglich|jaehrlich|ab (?:dem )?\d|start|beginn|phase|januar|februar|maerz|april|mai|juni|juli|august|september|oktober|november|dezember/;

const TRAEGER_POSITIV =
  /beschluss|beschluesse|zusage|zugesagt|vereinbarung|kooperationsvertrag|traeger|schultraeger|bezirksamt|schulamt|schulkonferenz|gesamtkonferenz|gemeinderat|stadtrat|kommune|vorstand|mitgliederversammlung|foerderverein/;

const TRAEGER_GEKLAERT =
  /beschluss|zusage|traeger|schultraeger|vereinbarung|bezirk|schulamt|schulkonferenz/;

const KOSTEN_GEKLAERT = /budget|kosten|summe|betrag|foerdersumme|eigenanteil|eigenmittel|finanz/;

const BEDARF_GEKLAERT = /bedarf|ausgangslage|ist-stand|zahlen|statistik|erhebung/;

const INDIKATOR_GEKLAERT = /indikator|messung|kennzahl|baseline|ausgangswert|zielwert|evaluation/;

const PLAN_GEKLAERT = /zeitplan|zeitraum|arbeitsplan|ablauf|termin|zustaendigkeit|verantwortlich/;

/** "von 12 % auf 8 %", "30% -> 50%", "12 % → unter 8 %" — Ausgangswert UND Zielwert. */
function hatBaselineUndZiel(s: string): boolean {
  const n = norm(s);
  if (/\bvon\b[^.;]*\bauf\b/.test(n) && zahlAngaben(n).length >= 2) return true;
  if (/(->|→|=>|auf)\s*\d/.test(n) && zahlAngaben(n).length >= 2) return true;
  return false;
}

export function analysiereTiefe(facts: WizardFacts): TiefeBefund[] {
  const s = facts?.schule ?? {};
  const p = facts?.projekt ?? {};
  const w = facts?.wirkung ?? {};
  const b = facts?.budget ?? {};

  const befunde: TiefeBefund[] = [];

  // -- 1. Ist-Zahlen zum Bedarf --------------------------------------------
  // Die Schuelerzahl allein ist die Groesse der Schule, nicht die Groesse des
  // Problems. Gezaehlt wird deshalb nur Zahlsubstanz in den Bedarfs-Feldern.
  {
    const quellen = [txt(s.besonderheiten), txt(p.kurzbeschreibung), txt(p.zielgruppe)];
    const mitZahl = quellen.filter((q) => hatZahl(q));
    const status: TiefeStatus = mitZahl.length >= 2
      ? "erfuellt"
      : mitZahl.length === 1
        ? "teilweise"
        : vomNutzerGeklaert(facts, BEDARF_GEKLAERT)
          ? "geklaert"
          : "offen";
    befunde.push({
      id: "bedarf-ist-zahlen",
      label: "Ist-Zahlen zum Bedarf",
      status,
      nachfrage:
        "Wie viele Kinder/Klassen sind vom Problem heute konkret betroffen, und woran macht ihr das fest (Erhebung, Beobachtung, Quote)?",
      beleg: `${mitZahl.length}/3 Bedarfsfelder mit Zahlangabe`,
    });
  }

  // -- 2. Kosten/Mengen je Posten ------------------------------------------
  // Schwaechstes Gutachter-Kriterium (2,54). Eine Gesamtsumme ohne bezifferte
  // Posten ist ausdruecklich nur "teilweise": genau daran scheitert die Pruefbarkeit.
  {
    const posten = liste(b.hauptposten);
    const beziffert = posten.filter((x) => hatZahl(x));
    const summe = typeof b.beantragt_eur === "number" && b.beantragt_eur > 0;
    let status: TiefeStatus;
    let beleg: string;
    if (posten.length > 0 && beziffert.length >= Math.ceil(posten.length / 2)) {
      status = "erfuellt";
      beleg = `${beziffert.length}/${posten.length} Posten beziffert`;
    } else if (summe || beziffert.length > 0) {
      status = "teilweise";
      beleg = summe
        ? `Gesamtsumme vorhanden, aber ${beziffert.length}/${posten.length} Posten beziffert`
        : `${beziffert.length}/${posten.length} Posten beziffert, keine Gesamtsumme`;
    } else if (vomNutzerGeklaert(facts, KOSTEN_GEKLAERT)) {
      status = "geklaert";
      beleg = "Nutzer hat die Kostenfrage selbst als offen benannt";
    } else {
      status = "offen";
      beleg = posten.length ? `${posten.length} Posten, keiner beziffert` : "keine Posten";
    }
    befunde.push({
      id: "kosten-je-posten",
      label: "Kosten und Mengen je Posten",
      status,
      nachfrage:
        "Was kostet der größte Posten ungefähr, und wie viele Stück/Stunden sind das? Eine grobe Hausnummer reicht — ohne Zahlen bleibt der Finanzplan für Gutachter nicht prüfbar.",
      beleg,
    });
  }

  // -- 3. Wer/Wann im Arbeitsplan ------------------------------------------
  {
    const aktivitaeten = liste(p.aktivitaeten);
    const blob = norm(aktivitaeten.join(" · ") + " " + txt(p.zeitraum));
    const werOk = ZUSTAENDIG.test(blob);
    const wannOk = nichtLeer(p.zeitraum) || ZEITBEZUG.test(blob);
    const status: TiefeStatus = werOk && wannOk
      ? "erfuellt"
      : werOk || wannOk
        ? "teilweise"
        : vomNutzerGeklaert(facts, PLAN_GEKLAERT)
          ? "geklaert"
          : "offen";
    befunde.push({
      id: "arbeitsplan-wer-wann",
      label: "Wer und Wann im Arbeitsplan",
      status,
      nachfrage:
        "Wer setzt die Maßnahmen um (Kollegium, externe Kraft, Partner), und wann läuft was — grober Ablauf über das Schuljahr?",
      beleg: `wer=${werOk ? "ja" : "nein"}, wann=${wannOk ? "ja" : "nein"}`,
    });
  }

  // -- 4. Baseline + Zielwert je Indikator ---------------------------------
  // Die Judges ruegen nicht fehlende Indikatoren, sondern Indikatoren OHNE
  // Ausgangs- und Zielwert ("misst Output statt Wirkung").
  {
    const kandidaten = [
      ...liste(w.messbare_indikatoren),
      ...liste(w.erwartete_ergebnisse),
      ...liste(p.ziele),
    ];
    const mitPaar = kandidaten.filter((x) => hatBaselineUndZiel(x));
    const mitZahl = kandidaten.filter((x) => hatZahl(x));
    const status: TiefeStatus = mitPaar.length > 0
      ? "erfuellt"
      : mitZahl.length > 0
        ? "teilweise"
        : vomNutzerGeklaert(facts, INDIKATOR_GEKLAERT)
          ? "geklaert"
          : "offen";
    befunde.push({
      id: "indikator-baseline-ziel",
      label: "Ausgangswert und Zielwert je Indikator",
      status,
      nachfrage:
        "Bei welchem Wert steht ihr heute, und welchen Wert wollt ihr erreichen (z. B. Teilnahmequote von 30 % auf 50 %)? Ohne Ausgangswert misst ein Indikator nur Aktivität, keine Wirkung.",
      beleg: `${mitPaar.length} Indikator(en) mit Ausgangs- UND Zielwert, ${mitZahl.length} mit Zahl`,
    });
  }

  // -- 5. Beschluesse/Zusagen des Traegers ---------------------------------
  {
    const blob = norm(
      [
        txt(w.nachhaltigkeit),
        liste(facts?.programmpassung?.kriterien_adressiert).join(" · "),
        txt(s.besonderheiten),
        txt(p.kurzbeschreibung),
      ].join(" · ")
    );
    const positiv = TRAEGER_POSITIV.test(blob);
    const geklaert = vomNutzerGeklaert(facts, TRAEGER_GEKLAERT);
    const status: TiefeStatus = positiv
      ? nichtLeer(w.nachhaltigkeit)
        ? "erfuellt"
        : "teilweise"
      : geklaert
        ? "geklaert"
        : "offen";
    befunde.push({
      id: "traeger-zusage",
      label: "Beschlüsse und Zusagen des Trägers",
      status,
      nachfrage:
        "Gibt es vom Schulträger (Bezirk, Kommune, Verein) etwas Schriftliches — Beschluss, Zusage, Vereinbarung? Auch ein 'noch nicht, aber Gespräch läuft' ist eine verwertbare Angabe.",
      beleg: positiv ? "Träger-/Beschlussbezug gefunden" : geklaert ? "vom Nutzer verneint" : "kein Bezug",
    });
  }

  return befunde;
}

/**
 * Ausbeute-Quote in [0,1]: erfuellt = 1, teilweise = 0,5, offen = 0.
 * `geklaert` faellt aus dem Nenner — dort ist nichts mehr zu holen, und eine
 * ehrliche Fehlanzeige darf die Messung nicht druecken.
 * Gibt `null` zurueck, wenn ALLE Punkte geklaert sind (nichts Messbares).
 */
export function tiefeQuote(befunde: TiefeBefund[]): number | null {
  const zaehlend = befunde.filter((b) => b.status !== "geklaert");
  if (zaehlend.length === 0) return null;
  const punkte = zaehlend.reduce(
    (s, b) => s + (b.status === "erfuellt" ? 1 : b.status === "teilweise" ? 0.5 : 0),
    0
  );
  return punkte / zaehlend.length;
}
