/**
 * Deterministischer Verbots-Detektor (WIZ-05-Befund 31.07.2026)
 * -------------------------------------------------------------
 * Die Reparatur der Fakten-Extraktion hat die Faktentabelle gefuellt (2/25 → 23/25).
 * Damit wurde der Antragstext spezifischer — und ein Teil dieser Spezifitaet ist
 * erfunden. Zwei mechanisch belegte Faelle aus dem Lauf 2026-07-31T18-49-50:
 *
 *   pv-005      "… × 56 EUR/Std (TV-L E11, Mittelwert)"   → finanzplan.posten[].begruendung
 *   pv-res-002  "01.01.2025–31.12.2025"                   → sections[3] → finalText
 *
 * Beide stehen in den Prompts ausdruecklich auf der Verbotsliste
 * (SHARP_HALLU_VERBOTS_BLOCK, SECTION_SYSTEM, FINANZPLAN_SYSTEM:884 verbietet
 * Tarif-Stufen woertlich) und kamen trotzdem durch. Die Verbote gehen also nicht
 * unter — es prueft sie nur niemand nach:
 *
 *   - hallucination-gate.ts nimmt den ENTWURF in den erlaubten Korpus auf. Was die
 *     Section-Stufe erfindet, ist dort per Konstruktion "gedeckt" und unsichtbar.
 *   - fact-verification.ts ist LLM-basiert und unterliegt damit genau dem Fehler,
 *     den es fangen soll; im Lauf oben hat es keinen der Faelle gemeldet.
 *   - Der Finanzplan wird NACH beiden Gates erzeugt (pipeline.ts) und laeuft durch
 *     keine einzige Ehrlichkeitspruefung.
 *
 * Dieses Modul schliesst die Luecke fuer die Klassen, in denen JEDE ungedeckte
 * Fundstelle eine Falschangabe gegenueber dem Foerdergeber ist — keine Ermessens-
 * frage, keine "fachliche Ausgestaltung". Rein deterministisch (kein LLM), damit
 * unit-testbar und nicht demselben Fehlermodus ausgesetzt wie der Text, den es prueft.
 *
 * BEWUSST NICHT enthalten: KMK-/Strategie-Zitate. pv-001 nennt die KMK-Strategie
 * ueberwiegend ehrlich ("ist dem Kollegium nicht bekannt", "[TODO: Analyse
 * durchfuehren]"), und der Nutzer nennt sie selbst. Der Korpus-Marker meint die
 * positive Behauptung ("KMK-Kompetenzen aktiv adressiert"); getroffen hat die
 * WIZ-02-Layer-2-Regex, die jede woertliche Titelnennung zaehlt. Ein Entferner
 * wuerde die Metrik schoenen und den Antrag verschlechtern — Fachbezug ist genau
 * das, was ein Gutachter sehen will.
 */

/** Klassen, deren ungedeckte Nennung IMMER eine Erfindung ist. */
export type VerbotsKlasse = "tarif" | "datum" | "aktenzeichen" | "haushaltsstelle";

export interface VerbotsTreffer {
  klasse: VerbotsKlasse;
  /** Die konkrete Fundstelle (fuer Dedup + Anzeige). */
  fund: string;
  /** Satz um die Fundstelle — Anker fuer den chirurgischen Repair. */
  zitat: string;
  /** Begruendung inkl. Reparatur-Anweisung (geht so in den Repair-Prompt). */
  warum: string;
}

// ---------------------------------------------------------------------------
// Muster
// ---------------------------------------------------------------------------

/**
 * Tarif-/Besoldungs-Eingruppierungen. Absichtlich breiter als die WIZ-02-Regex
 * (die nur TV-L kennt): das Produkt-Verbot in FINANZPLAN_SYSTEM nennt
 * "TV-L E9, EG10, A12, …" — jede Eingruppierung ohne Nutzerangabe ist erfunden.
 */
const TARIF_RE =
  /\b(?:TV[-\s]?(?:L|[oö]D|öD)|TVoeD|TV[-\s]?H|E[Gg])\s*[-\s]?(?:E\s*)?\d{1,2}\s*[a-zA-Z]?(?:\s*(?:Stufe|St\.)\s*\d)?\b/g;

/** Tagesgenaue Datumsangaben — "wenn User nur 'demnaechst' sagte, kein '12.03.2026'". */
const DATUM_RE = /\b(?:0?[1-9]|[12]\d|3[01])\.\s?(?:0?[1-9]|1[0-2])\.\s?(?:19|20)\d{2}\b/g;

/** Aktenzeichen/Geschaeftszeichen — "Schulen geben fast nie welche an". */
const AKTENZEICHEN_RE =
  /\b(?:Az\.?|A\.?Z\.?|G\.?Z\.?|Gz\.?|Gesch(?:ae|ä)ftszeichen)\s*[:.]?\s*[\dA-Z][\dA-Z\-.\/]{2,}\b/g;

/** Haushaltsstellen/Buchungs-Codes — "diese sind IMMER Erfindung". */
const HAUSHALTSSTELLE_RE =
  /\b(?:Haushaltsstelle|Haushaltstitel|Buchungsstelle|Kostenstelle)\s*[:.]?\s*[\d][\d\s.\/-]{3,}\b/g;

/**
 * VERWORFEN: eine Klasse "Einheitssatz" (\`56 EUR/Std\`, \`300 EUR pro Person\`).
 *
 * Sie lag nahe — pv-005 rechnet mit einem erfundenen Stundensatz. Die Probe gegen
 * alle 25 Antraege des Laufs 2026-07-31T18-49-50 hat sie aber widerlegt: 13 Treffer
 * in 6 Plaenen, davon die grosse Mehrheit LEGITIM ("Schaetzung: 24 Teilnehmende ×
 * 300 EUR fuer 10 Tage" bei Erasmus+, "500 EUR pro Person" fuer Fluege). Bei pv-005
 * haette der Sanitizer 5 von 8 Posten in inhaltsleere Floskeln verwandelt.
 *
 * Der Grund ist inhaltlich, nicht technisch: Ein GESCHAETZTER BETRAG ist das vom
 * Produkt ausdruecklich vorgeschriebene Ehrlichkeits-Mittel (FINANZPLAN_SYSTEM,
 * "Schaetz-Ehrlichkeit"), keine Halluzination. Falsch ist erst die Behauptung einer
 * ueberpruefbaren externen GRUNDLAGE — die Tarifgruppe. Genau die faengt \`tarif\`.
 * Und weil der Finanzplan das schwaechste Gutachter-Kriterium ist (2,39), waere ein
 * Detektor, der ihn entkernt, teurer als der Defekt, den er behebt.
 */

interface Muster {
  klasse: VerbotsKlasse;
  re: RegExp;
  warum: string;
}

const VERBOTS_MUSTER: ReadonlyArray<Muster> = [
  {
    klasse: "tarif",
    re: TARIF_RE,
    warum:
      "Tarif-/Besoldungs-Eingruppierung ohne Beleg in Nutzerangaben oder Richtlinie — laut Verbotsliste immer erfunden. Eingruppierung streichen und die Kostenart ohne Tarifbezug benennen; die Eingruppierung ist beim Schultraeger noch zu erfragen.",
  },
  {
    klasse: "datum",
    re: DATUM_RE,
    warum:
      "Tagesgenaues Datum ohne Beleg in Nutzerangaben oder Richtlinie — erfundene Praezision. Ersetze es durch die vom Nutzer genannte grobe Zeitangabe (z. B. \"nach den Sommerferien\", \"im Schuljahr\") oder streiche die Datumsangabe; keine Ersatz-Datierung erfinden.",
  },
  {
    klasse: "aktenzeichen",
    re: AKTENZEICHEN_RE,
    warum:
      "Aktenzeichen/Geschaeftszeichen ohne Nutzerbeleg — Schulen geben praktisch nie welche an, jedes solche Zeichen ist erfunden. Ersatzlos streichen.",
  },
  {
    klasse: "haushaltsstelle",
    re: HAUSHALTSSTELLE_RE,
    warum:
      "Haushaltsstelle/Buchungs-Code ohne Nutzerbeleg — laut Verbotsliste IMMER Erfindung. Ersatzlos streichen.",
  },
];

// ---------------------------------------------------------------------------
// Quellen-Abgleich
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Satz um eine Fundstelle — Anker fuer den chirurgischen Repair. Ein blosser
 * Treffer wie "TV-L E9" ist mit 7 Zeichen kuerzer als MIN_ZITAT_LEN der
 * Fakt-Verifikation und wuerde dort verworfen; ausserdem braucht der Repair
 * Kontext, um bei mehrfachem Vorkommen die richtige Stelle zu treffen.
 */
function satzUm(text: string, start: number, end: number): string {
  const vorher = Math.max(
    text.lastIndexOf(". ", start),
    text.lastIndexOf("\n", start),
    text.lastIndexOf("• ", start)
  );
  const von = vorher === -1 ? 0 : vorher + 1;
  const punkt = text.indexOf(". ", end);
  const zeile = text.indexOf("\n", end);
  const kandidaten = [punkt, zeile].filter((i) => i !== -1);
  const bis = kandidaten.length ? Math.min(...kandidaten) : text.length;
  return text.slice(von, bis).trim();
}

// Ein Repair-Prompt mit 30 Stellen fuehrt zu Triage statt Chirurgie — deckeln.
const MAX_TREFFER = 12;

/**
 * Findet ungedeckte Fundstellen der Verbots-Klassen in `text`.
 *
 * `erlaubteQuellen` ist bewusst weiter als die Nutzer-Ground-Truth: Programm und
 * Richtlinie gehoeren dazu. Eine Antragsfrist aus der Foerderrichtlinie ist ein
 * legitimes tagesgenaues Datum — nur was in KEINER Quelle steht, ist erfunden.
 */
export function detectVerbote(text: string, erlaubteQuellen: string): VerbotsTreffer[] {
  if (!text?.trim()) return [];
  const quellen = normalize(erlaubteQuellen ?? "");

  const out: VerbotsTreffer[] = [];
  const gesehen = new Set<string>();

  for (const { klasse, re, warum } of VERBOTS_MUSTER) {
    const frisch = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = frisch.exec(text)) !== null) {
      const fund = m[0].trim();
      if (quellen.includes(normalize(fund))) continue; // woertlich belegt

      const key = `${klasse}|${normalize(fund)}`;
      if (gesehen.has(key)) continue;
      gesehen.add(key);

      out.push({
        klasse,
        fund,
        zitat: satzUm(text, m.index, m.index + fund.length),
        warum,
      });
      if (out.length >= MAX_TREFFER) return out;
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Finanzplan-Bereinigung (deterministisch — kein LLM)
// ---------------------------------------------------------------------------

/**
 * Minimal-Vertrag statt `Finanzposten`: das Gate braucht nur diese zwei Felder,
 * und Tests koennen so ohne id/kategorie/betragEur arbeiten. Generisch, damit der
 * Aufrufer seinen konkreten Typ zurueckbekommt.
 */
export interface FinanzplanPostenLike {
  bezeichnung: string;
  begruendung?: string;
}

export interface FinanzplanBereinigung<T extends FinanzplanPostenLike> {
  posten: T[];
  /** Fundstellen, die entfernt wurden (fuer Log + Artefakt). */
  entfernt: VerbotsTreffer[];
  /** Indizes der Posten, deren Begruendung ersetzt wurde. */
  betroffen: number[];
}

/**
 * Ein Klammerzusatz ist in sich abgeschlossen — ihn zu entfernen ist die einzige
 * Prosa-Operation, die deterministisch grammatisch sicher ist.
 */
function ohneBelasteteKlammer(satz: string, fund: string): string {
  return satz
    .replace(/\s*[([][^)\]]*[)\]]/g, (klammer) =>
      klammer.includes(fund) ? "" : klammer
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

const MIN_BEGRUENDUNG_LEN = 20;

/**
 * Bereinigt Finanzplan-Begruendungen deterministisch. Beruehrt AUSSCHLIESSLICH
 * `begruendung` — `betragEur`, `kategorie` und `eigenanteil` bleiben unangetastet,
 * damit Summenlogik, Foerderquote und Eigenanteil-Pruefung unveraendert aufgehen.
 *
 * Zwei Stufen:
 *   1. Belasteten Klammerzusatz streichen ("… (TV-L E11, Mittelwert)"). Bleibt der
 *      Rest sauber und lang genug, ist der Satz gerettet.
 *   2. Sonst die ganze Begruendung durch eine ehrliche Pauschal-Formulierung
 *      ersetzen — genau das, was FINANZPLAN_SYSTEM ohnehin vorschreibt
 *      ("Sonst: … Posten als Pauschale ohne erfundene Splittung anlegen").
 */
export function bereinigeFinanzplanBegruendungen<T extends FinanzplanPostenLike>(
  posten: T[],
  erlaubteQuellen: string
): FinanzplanBereinigung<T> {
  const entfernt: VerbotsTreffer[] = [];
  const betroffen: number[] = [];

  const neu = posten.map((p, i) => {
    const begruendung = typeof p.begruendung === "string" ? p.begruendung : "";
    if (!begruendung.trim()) return p;

    const treffer = detectVerbote(begruendung, erlaubteQuellen);
    if (treffer.length === 0) return p;

    let kandidat = begruendung;
    for (const t of treffer) kandidat = ohneBelasteteKlammer(kandidat, t.fund);

    const rest = detectVerbote(kandidat, erlaubteQuellen);
    const geheilt = rest.length === 0 && kandidat.length >= MIN_BEGRUENDUNG_LEN;

    entfernt.push(...treffer);
    betroffen.push(i);

    const begruendungNeu = geheilt
      ? kandidat
      : `Schaetzung: ${p.bezeichnung} — Pauschale ohne belegte Kalkulationsgrundlage; Saetze und Mengen vor Einreichung durch Angebote bzw. Auskunft des Schultraegers belegen.`;
    return { ...p, begruendung: begruendungNeu } as T;
  });

  return { posten: neu, entfernt, betroffen };
}

/** Hinweis-Zeile fuer den bereinigten Plan (macht die Kuerzung fuer den Nutzer sichtbar). */
export const FINANZPLAN_BEREINIGT_HINWEIS =
  "Einzelne Begruendungen enthielten Kalkulationsgrundlagen (Tarif-Stufen, Stunden-/Tagessaetze), die nicht aus Ihren Angaben stammen. Sie wurden zu ehrlichen Pauschalen zurueckgenommen — bitte vor Einreichung durch Angebote oder eine Auskunft des Schultraegers belegen.";
