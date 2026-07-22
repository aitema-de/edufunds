/**
 * Explizite Zustaende fuer Katalog-Angaben, deren FEHLEN bisher als Tatsache
 * missdeutet wurde. Der teure Fall: `bewerbungsfristEnde` ist bei den meisten
 * Programmen nicht gesetzt, und dann war "laeuft rollend" von "Frist nicht
 * erfasst" nicht unterscheidbar — beides ein fehlendes Feld. So wurde am
 * 17.07.2026 ein Antrag fuer den Foerderfonds Demokratie verkauft (echtes Geld),
 * dessen einziger belegter Stichtag am 30.09.2019 lag.
 *
 * Jeder Zustand hier trennt "belegt X" (art != "unbekannt", mit Quelle) von
 * "nicht erfasst" (art == "unbekannt", ohne Quelle). Das ist die Umsetzung von
 * "Ein fehlendes Feld ist keine Tatsache": Statt undefined tragen die Daten den
 * Zustand explizit, inkl. Beleg woher er stammt.
 *
 * Grundsatz FAIL-CLOSED: Eine unbekannte Frist ist NIE verkaufsfaehig — das
 * entscheidet `lib/programm-status.ts` (istFristVerkaufsfaehig). Umfang und
 * Einreichungsform sind nicht verkaufs-kritisch (sie steuern Pipeline-Qualitaet
 * bzw. UI), tragen aber denselben "unbekannt"-Zustand, damit auch dort das
 * fehlende Feld nicht als Tatsache gelesen wird.
 *
 * Alle Zustaende folgen demselben Skelett `{ art, <wert>?, quelle? }`. Weil die
 * belegten Werte je Domaene unterschiedliche Form haben (Frist: Datumsliste;
 * Umfang: Zahl), sind es getrennte diskriminierte Unions statt eines
 * polymorphen `wert`-Feldes.
 */

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Ist der String ein ISO-Datum YYYY-MM-DD? (Nur Format, nicht Kalender-Gueltigkeit.) */
export function istIsoDatum(s: string): boolean {
  return ISO_DATE_REGEX.test(s);
}

/**
 * Bewerbungsfrist als expliziter Zustand.
 *
 * - `keine`: belegt rollend / laufend einreichbar, keine Stichtage.
 * - `stichtag`: harte Termine (ISO YYYY-MM-DD). `jaehrlichWiederkehrend` deckt
 *   den haeufigen Fall "immer bis 30.06." ab; ohne das Flag verstreicht der
 *   Stichtag kalendarisch und das Programm gilt als abgelaufen.
 * - `unbekannt`: nicht erfasst. Fail-closed => nicht verkaeuflich.
 *
 * Loest das Katalog-Feld `bewerbungsfristEnde?: string` ab (bleibt fuer die
 * noch nicht migrierten Programme als Fallback bestehen, s. programm-status.ts).
 */
export type FristZustand =
  | { art: "keine"; quelle: string }
  | {
      art: "stichtag";
      stichtage: string[];
      jaehrlichWiederkehrend?: boolean;
      quelle: string;
    }
  | { art: "unbekannt" };

/**
 * Umfang des Antrags (Laengenbegrenzung durch den Foerdergeber).
 *
 * - `keine`: belegt, dass das Antragsformular keine Laengenbegrenzung vorgibt.
 * - `zeichen` / `seiten`: numerische Obergrenze in `wert`.
 * - `unbekannt`: nicht erfasst.
 *
 * Speist perspektivisch die (heute abgeschaltete) Compliance-Stage der
 * Pipeline; die pro-Abschnitt-Grenze `maxZeichen` im Dossier bleibt daneben
 * fuer feinere Vorgaben bestehen.
 */
export type UmfangZustand =
  | { art: "keine"; quelle: string }
  | { art: "zeichen"; wert: number; quelle: string }
  | { art: "seiten"; wert: number; quelle: string }
  | { art: "unbekannt" };

/** Kanaele, ueber die eingereicht werden kann. `unbekannt` allein = nicht erfasst. */
export type EinreichungsKanal =
  | "online-formular"
  | "online-portal"
  | "email"
  | "post"
  | "unbekannt";

/**
 * Strukturierte Einreichungsform. Loest den Freitext `einreichungsweg` im
 * Dossier ab (der daneben als menschenlesbare Langfassung bestehen bleibt).
 */
export interface EinreichungsForm {
  /** Mindestens ein Kanal. `["unbekannt"]` heisst: nicht erfasst. */
  kanaele: EinreichungsKanal[];
  /** Konkrete Zieladresse: Formular-URL, E-Mail oder Postanschrift. */
  adresse?: string;
  /** Freitext-Ergaenzung (z. B. "Bei Post gilt der Poststempel."). */
  hinweis?: string;
  /** Quelle des Belegs. Pflicht, sobald kanaele nicht `["unbekannt"]` ist. */
  quelle?: string;
}

/** Ist die Frist belegt-unbekannt bzw. gar nicht erfasst? */
export function istFristUnbekannt(fz: FristZustand | undefined): boolean {
  return !fz || fz.art === "unbekannt";
}
