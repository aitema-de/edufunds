/**
 * Handverlesene Zusatz-Kriterien pro Förderprogramm.
 *
 * Das ist Fleissarbeit: pro Programm ~20 Minuten Recherche (Richtlinie lesen,
 * frühere Ablehnungen/Bewilligungen auswerten, Gespraeche mit Fördergeber).
 * Jede Ergaenzung hebt die Antragsqualitaet messbar.
 *
 * Wenn fuer eine programmId KEIN Eintrag existiert, faellt der Wizard auf
 * die automatischen Programm-Felder aus foerderprogramme.json + die
 * generische Geber-Typ-Guidance zurueck.
 */

export interface ExtraGuidance {
  /** Was der Geber inhaltlich besonders honoriert (ueber die offiziellen Kriterien hinaus). */
  gewichtet: string[];
  /** Harte Pflichten, ohne die der Antrag durchfaellt. */
  pflichten?: string[];
  /** Typische Ablehnungsgruende / haeufige Fehler. */
  fallen?: string[];
}

/**
 * Keys sind die IDs aus data/foerderprogramme.json.
 */
const KRITERIEN: Record<string, ExtraGuidance> = {
  "bmbf-digitalpakt-2": {
    gewichtet: [
      "Medienkonzept der Schule muss erkennbar dahinter stehen (nicht nur Hardware-Wunschliste).",
      "Qualifizierung der Lehrkraefte ist verpflichtender Teil — wie wird das gesichert?",
      "Anbindung an Bildungsplan und KMK-Strategie 'Bildung in der digitalen Welt'.",
      "Nachhaltigkeit: wie werden die Geraete nach Laufzeit betrieben/erneuert?",
    ],
    pflichten: [
      "Schultraeger-Einbindung ist Bedingung (Kommune/Landkreis ist Antragstellerin).",
      "Mittel-Abfluss gemaess Richtlinie; Zweckbindung 7 Jahre.",
    ],
    fallen: [
      "Reine Geraete-Beschaffung ohne paedagogisches Konzept wird regelmaessig zurueckgestellt.",
      "Keine Einbindung des IT-Supports/Schultraegers ist haeufiger Ablehnungsgrund.",
    ],
  },

  "bosch-schulpreis": {
    gewichtet: [
      "Deutscher Schulpreis bewertet GESAMTES Schulprofil anhand 6 Qualitaetsbereiche: Leistung, Umgang mit Vielfalt, Unterrichtsqualitaet, Verantwortung, Schulklima/-leben, Schule als lernende Institution.",
      "Konkrete Belege statt Bekenntnisse: Daten, Projekte, Strukturen, nicht nur Leitbild-Saetze.",
      "Perspektive aller Beteiligten: Schueler, Eltern, Kollegium, Schulleitung — werden alle im Antrag sichtbar?",
    ],
    pflichten: [
      "Kein Einzelprojekt-Preis, sondern Auszeichnung fuer die Schule als Ganzes.",
      "Externe Jurys besuchen Shortlist-Schulen — alles im Antrag muss verifizierbar sein.",
    ],
    fallen: [
      "Marketing-Sprache und PR-Projektberichte statt substantielle Prozessbeschreibung.",
      "Fehlende Selbstkritik / ausschliesslich positive Schulbeschreibung wirkt unglaubwuerdig.",
    ],
  },

  "mercator-digitalisierung": {
    gewichtet: [
      "Stiftung Mercator foerdert strategische Partnerschaften, nicht Einzel-Schulprojekte — Partner (Hochschule, Kommune, andere Schule) sind zentral.",
      "Skalierbarkeit und Transfer in andere Schulen sind zwingend mitzudenken.",
      "Digitalisierung als Mittel zur Chancengleichheit, nicht als Technik-Thema an sich.",
    ],
    fallen: [
      "Antraege ohne konkrete Transfer-/Skalierungsperspektive werden selten beruecksichtigt.",
      "Antragsteller ohne Kooperations-Substanz ('wir planen Kontakt aufzunehmen') sind zu schwach.",
    ],
  },
};

export function getExtraGuidance(programmId: string): ExtraGuidance | null {
  return KRITERIEN[programmId] ?? null;
}

export function formatExtraGuidance(g: ExtraGuidance): string {
  const out: string[] = [];
  if (g.gewichtet.length) {
    out.push("Besonders gewichtet vom Fördergeber:");
    g.gewichtet.forEach((x) => out.push(`- ${x}`));
  }
  if (g.pflichten?.length) {
    out.push("\nHarte Pflichten (Antrag fällt sonst durch):");
    g.pflichten.forEach((x) => out.push(`- ${x}`));
  }
  if (g.fallen?.length) {
    out.push("\nTypische Fallstricke / Ablehnungsgründe:");
    g.fallen.forEach((x) => out.push(`- ${x}`));
  }
  return out.join("\n");
}
