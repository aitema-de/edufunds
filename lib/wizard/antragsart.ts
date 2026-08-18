/**
 * Antragsart — Preis-Bewerbung oder Projektfoerderung? (Architektur-Umbau 03.08.2026)
 * ===================================================================================
 *
 * DER BEFUND
 * ----------
 * Die Pipeline erzeugte fuer JEDEN Antrag einen Finanzplan. Der Katalog kennt aber
 * zwei grundverschiedene Antragsarten, und 20 von 189 Programmen (~11 %) sind
 * Preis-Bewerbungen: man bewirbt sich mit dem, was man BEREITS TUT, und beantragt
 * kein Budget fuer ein Vorhaben.
 *
 * Belegt an pv-004 (Deutscher Schulpreis), WIZ-05 vom 03.08.2026, gepaarte Messung
 * mit identischen Snapshots und Judges — nur das Dokument unterschied sich:
 *
 *   OHNE Finanzplan  → gemini 4,18. Woertlich: "Als Bewerbung um einen Preis statt
 *                      um Projektfoerderung enthaelt der Antrag korrekterweise
 *                      keinen Finanzplan."
 *   MIT  Finanzplan  → gemini 2,40. "Der Finanzplan ist inkonsistent, leitet die
 *                      Posten nicht aus einem konkreten Vorhaben ab."
 *
 * Der Kunde laedt das so herunter (components/Wizard/AntragResult.tsx haengt den
 * gerenderten Plan an den Export). Ein Budget in einer Preis-Bewerbung ist nicht
 * nur ueberfluessig, es liest sich wie ein Missverstaendnis der Ausschreibung.
 *
 * DAS DATENMODELL KANNTE DEN UNTERSCHIED NICHT
 * --------------------------------------------
 * `Foerderprogramm` hat kein Feld dafuer; `foerdergeberTyp` beschreibt den GEBER
 * (stiftung/bund/land), nicht die Antragsart. Der Deutsche Schulpreis ist eine
 * "stiftung" wie jede Projektfoerderung einer Stiftung.
 *
 * RISIKO-ASYMMETRIE — DESHALB KONJUNKTION STATT EINZELSIGNAL
 * ----------------------------------------------------------
 * Ein faelschlich als Preis eingestufter Antrag verliert seinen Finanzplan und ist
 * damit UNVOLLSTAENDIG — deutlich schlimmer als ein ueberfluessiger Plan. Deshalb
 * muessen ZWEI unabhaengige Signale zusammenkommen:
 *
 *   1. Namenssignal (Schulpreis / Wettbewerb / Award / Auszeichnung), UND
 *   2. die offizielle Antragsstruktur enthaelt KEINEN Finanzabschnitt.
 *
 * Beide einzeln waeren falsch, und beide Gegenbeispiele sind gemessen:
 *
 *   Erasmus+ (pv-005) hat KEINEN Finanzabschnitt in der Struktur — profitiert aber
 *     vom Finanzplan (4,06 → 4,15). Das Struktursignal allein haette ihn faelschlich
 *     unterdrueckt. Das Namenssignal rettet ihn: "Erasmus+" ist kein Preis.
 *   Deutscher Schulpreis (pv-004) traegt eine einzelne Kostenposition der Kategorie
 *     "sonstiges", deren eigene Bemerkung lautet "Preisgeld ist zweckgebunden […],
 *     aber keine Einzelposten-Pruefung". Eine Regel "kostenpositionen vorhanden ⇒
 *     Budget erwartet" liest genau dieses Dossier verkehrt herum — sie ist deshalb
 *     bewusst NICHT enthalten.
 *
 * Das semantisch richtige Signal ist die Antragsstruktur: sie sagt, ob das FORMULAR
 * einen Finanzteil verlangt. Ein Pflicht-Eigenanteil sticht weiterhin alles — wer
 * Eigenmittel fordert, will eine Rechnung sehen.
 */

import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { Richtlinie } from "./richtlinien-schema";

export type Antragsart = "projektfoerderung" | "preis";

export interface AntragsartUrteil {
  art: Antragsart;
  /** Braucht dieser Antrag einen Finanzplan? */
  brauchtFinanzplan: boolean;
  /** Nachvollziehbare Begruendung — geht ins Pipeline-Log und in die Artefakte. */
  grund: string;
}

/**
 * Namenssignale fuer eine Preis-/Wettbewerbsbewerbung. Bewusst eng: "Foerderpreis"
 * und "Innovationspreis" vergeben haeufig Projektmittel und werden hier NICHT
 * gefangen — sie tragen ein Budget-Signal in der Richtlinie, das ohnehin vorgeht,
 * und ohne Dossier bleibt es bei der sicheren Annahme Projektfoerderung.
 */
const PREIS_IM_NAMEN = /\b(?:schulpreis|wettbewerb|award|auszeichnung)\b/i;

/** Abschnittsnamen, die einen Finanzteil im Antragsformular anzeigen. */
const FINANZ_ABSCHNITT = /finanz|kostenplan|kosten-|budget|mittelverwendung|ausgaben|kalkulation/i;

/** Hat das offizielle Antragsformular einen Finanzteil? `null` = keine Struktur bekannt. */
export function hatFinanzAbschnitt(richtlinie?: Richtlinie | null): boolean | null {
  const abschnitte = richtlinie?.antragsstruktur?.abschnitte;
  if (!Array.isArray(abschnitte) || abschnitte.length === 0) return null;
  return abschnitte.some((a) => FINANZ_ABSCHNITT.test(`${a.name ?? ""} ${a.id ?? ""}`));
}

export function bestimmeAntragsart(
  programm: Foerderprogramm,
  richtlinie?: Richtlinie | null
): AntragsartUrteil {
  const p = programm as unknown as Record<string, unknown>;
  const name = [p.name, p.kurzbeschreibung].filter((x) => typeof x === "string").join(" ");

  // Pflicht-Eigenanteil sticht alles: wer Eigenmittel fordert, will eine Rechnung.
  if (richtlinie?.eigenmittel?.pflicht) {
    return {
      art: "projektfoerderung",
      brauchtFinanzplan: true,
      grund: "Richtlinie verlangt einen Eigenanteil",
    };
  }

  if (!PREIS_IM_NAMEN.test(name)) {
    return {
      art: "projektfoerderung",
      brauchtFinanzplan: true,
      grund: "kein Preis-Signal im Programmnamen",
    };
  }

  // Namenssignal allein genuegt nicht — die Antragsstruktur muss BESTAETIGEN, dass
  // das Formular keinen Finanzteil verlangt.
  const finanzAbschnitt = hatFinanzAbschnitt(richtlinie);
  if (finanzAbschnitt === true) {
    return {
      art: "projektfoerderung",
      brauchtFinanzplan: true,
      grund: "Antragsstruktur enthält einen Finanzabschnitt",
    };
  }
  if (finanzAbschnitt === null) {
    // Kein Dossier, keine Struktur, kein Beleg. Die Risiko-Asymmetrie oben gilt
    // hier genauso: ein fehlender Finanzplan macht den Antrag unvollstaendig, ein
    // ueberfluessiger kostet Punkte. Ohne Beleg wird nicht unterdrueckt.
    // Wirkung: Der Fix greift heute fuer 5 der 189 Programme; jedes weitere
    // Dossier ohne Finanzabschnitt schaltet automatisch eines dazu.
    return {
      art: "projektfoerderung",
      brauchtFinanzplan: true,
      grund: "Preis-Signal im Namen, aber keine Antragsstruktur zur Bestätigung",
    };
  }

  return {
    art: "preis",
    brauchtFinanzplan: false,
    grund: "Preis-Bewerbung; Antragsstruktur kennt keinen Finanzabschnitt",
  };
}
