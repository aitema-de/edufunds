/**
 * Triage: lohnt diese Seite eine vollstaendige Dossier-Extraktion?
 *
 * WARUM DETERMINISTISCH UND NICHT MIT DEM LLM:
 * Die Triage sitzt VOR der teuren Extraktion, sie ist also die Stelle, an der Kandidaten
 * verschwinden. Ein LLM an dieser Stelle waere ein weiteres stilles Sieb — genau die Bauart,
 * die die Programm-Suche sechs Wochen lang unbemerkt leerlaufen liess. Stattdessen: feste,
 * nachlesbare Signale, und JEDE Ablehnung wird mit Grund und Fundstelle protokolliert.
 *
 * Der teurere Fehler ist die falsche Ablehnung: ein durchgewinkter Blindgaenger kostet eine
 * Extraktion und faellt im PR-Review auf; ein faelschlich verworfenes Foerderprogramm ist
 * unsichtbar verloren. Deshalb sind die Listen eher grosszuegig, und die Verworfenen stehen
 * vollstaendig im Report — wer dort ein echtes Programm findet, weiss sofort, welches Wort fehlt.
 */

export interface TriageSignale {
  geld: string[];
  zielgruppe: string[];
  antrag: string[];
  ausschluss: string[];
}

export interface TriageUrteil {
  weiter: boolean;
  begruendung: string;
  signale: TriageSignale;
}

/** Geld im Spiel? Ohne das ist es kein Foerderprogramm, sondern eine Informationsseite. */
const GELD = [
  "euro", "eur", "€", "zuschuss", "förderhöhe", "fördersumme", "förderbetrag",
  "finanzierung", "zuwendung", "bis zu", "eigenanteil", "fördermittel", "budget",
  "stipendium", "preisgeld", "kofinanzierung", "anteilsfinanzierung",
];

/**
 * Bezug zu Schule, Bildung, Kindern oder gemeinnuetziger Arbeit.
 * Bewusst breit: "Ganztag", "MINT" oder "Leseförderung" nennen das Wort Schule nie und sind
 * trotzdem genau unser Fall.
 */
const ZIELGRUPPE = [
  "schule", "schulen", "schüler", "schulisch", "grundschule", "gesamtschule", "gymnasium",
  "förderverein", "schulförderverein", "bildung", "bildungs", "unterricht", "lehrkräfte",
  "lehrerinnen", "kita", "kindergarten", "kinder", "jugend", "jugendliche", "ganztag",
  "mint", "leseförderung", "sprachförderung", "ausbildung", "berufsorientierung",
  "gemeinnützig", "verein", "ehrenamt", "elternarbeit", "nachwuchs",
];

/** Handelt es sich ueberhaupt um eine Ausschreibung und nicht um einen Bericht darueber? */
const ANTRAG = [
  "antrag", "anträge", "antragstellung", "beantragen", "bewerbung", "bewerben",
  "frist", "stichtag", "einreich", "ausschreibung", "förderrichtlinie", "richtlinie",
  "antragsberechtigt", "zuwendungsempfänger",
];

/**
 * Signale, dass das Programm nicht mehr laeuft.
 *
 * ⚠️ DIE EINZIGE LISTE, BEI DER EIN FEHLTREFFER VERWIRFT — und deshalb die einzige, die
 * praezise Formulierungen statt einzelner Woerter enthaelt. Gemessen am 18.08.2026: das blosse
 * Wort "ausgelaufen" steht bei der NBank im Navigationsmenue JEDER Seite ("Ausgelaufene
 * Foerderungen"), auch auf laufenden Programmen. Mit dem Wort in dieser Liste haette die Triage
 * die gesamte Quelle stillgelegt — 144 Programme, lautlos.
 *
 * Aufgenommen wird deshalb nur, was in einem Satz der Seite steht und nicht in einem Menue.
 * "(ausgelaufen)" mit Klammern ist erlaubt: das ist die Titelmarkierung, kein Menuepunkt.
 */
const AUSSCHLUSS = [
  "(ausgelaufen)",
  "nicht mehr möglich",
  "antragstellung ist beendet",
  "antragstellung ist nicht mehr",
  "keine anträge mehr",
  "programm ist beendet",
  "programm wurde beendet",
  "außer kraft",
];

function treffer(text: string, begriffe: string[]): string[] {
  const gefunden: string[] = [];
  for (const b of begriffe) {
    if (text.includes(b)) gefunden.push(b);
  }
  return gefunden;
}

export interface TriageOptionen {
  /** Mindestzahl unterschiedlicher Zielgruppen-Begriffe (Default 1). */
  mindestZielgruppe?: number;
}

/**
 * @param text Sichtbarer Text der Detailseite (bereits von HTML befreit).
 * @param name Programmname aus dem Scan — wird mitbewertet, weil er oft klarer ist als die Seite.
 */
export function bewerteText(text: string, name = "", opts: TriageOptionen = {}): TriageUrteil {
  const gesamt = `${name}\n${text}`.toLowerCase();
  const signale: TriageSignale = {
    geld: treffer(gesamt, GELD),
    zielgruppe: treffer(gesamt, ZIELGRUPPE),
    antrag: treffer(gesamt, ANTRAG),
    ausschluss: treffer(gesamt, AUSSCHLUSS),
  };

  if (gesamt.trim().length < 200) {
    return {
      weiter: true,
      begruendung:
        `Seitentext zu kurz (${gesamt.trim().length} Zeichen) fuer ein Urteil — im Zweifel ` +
        `weitergereicht, damit kein Programm still verlorengeht.`,
      signale,
    };
  }
  if (signale.ausschluss.length > 0) {
    return {
      weiter: false,
      begruendung: `Programm laeuft nicht mehr (${signale.ausschluss.join(", ")}).`,
      signale,
    };
  }
  if (signale.geld.length === 0) {
    return {
      weiter: false,
      begruendung: "Kein Geld-Signal auf der Seite — keine Foerderung, sondern eine Info-Seite.",
      signale,
    };
  }
  if (signale.zielgruppe.length < (opts.mindestZielgruppe ?? 1)) {
    return {
      weiter: false,
      begruendung:
        "Kein Bezug zu Schule, Bildung, Kindern, Jugend oder gemeinnuetziger Arbeit gefunden.",
      signale,
    };
  }
  if (signale.antrag.length === 0) {
    return {
      weiter: false,
      begruendung:
        "Keine Ausschreibungs-Signale (Antrag, Frist, Richtlinie) — vermutlich ein Bericht ueber " +
        "eine Foerderung, nicht die Foerderung selbst.",
      signale,
    };
  }
  return {
    weiter: true,
    begruendung:
      `Geld (${signale.geld.slice(0, 3).join(", ")}) + Zielgruppe ` +
      `(${signale.zielgruppe.slice(0, 3).join(", ")}) + Antrag (${signale.antrag.slice(0, 2).join(", ")}).`,
    signale,
  };
}
