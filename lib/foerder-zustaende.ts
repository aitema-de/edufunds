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
 * - `keine`: BELEGT rollend / laufend einreichbar, keine Stichtage.
 * - `stichtag`: harte Termine (ISO YYYY-MM-DD). `jaehrlichWiederkehrend` deckt
 *   den haeufigen Fall "immer bis 30.06." ab; ohne das Flag verstreicht der
 *   Stichtag kalendarisch und das Programm gilt als abgelaufen.
 * - `geschlossen`: BELEGT keine offene Runde. Kein Datum noetig — genau der
 *   Fall "Die Ausschreibung ist beendet" / "Wenn ein neuer Wettbewerb
 *   ausgeschrieben wird, geben wir das bekannt". Nicht verkaeuflich.
 * - `unbekannt`: NICHT VERIFIZIERT. Die Quelle schweigt zu Fristen — das ist
 *   etwas anderes als "belegt geschlossen".
 *
 * ⚠️ Der Unterschied `geschlossen` vs. `unbekannt` ist die ganze Pointe:
 *
 *   geschlossen = wir WISSEN, dass gerade nichts geht      -> nicht verkaeuflich
 *   unbekannt   = wir wissen es NICHT                       -> verkaeuflich MIT
 *                                                              sichtbarem Hinweis
 *
 * Beides in einen Topf zu werfen hiesse, entweder nachweislich tote Programme
 * zu verkaufen oder den halben Katalog wegen Schweigens der Quelle zu
 * verschrotten. Entscheidung Kolja, 22.07.2026: unverifiziert bleibt
 * verkaeuflich, aber der Kunde MUSS es vor dem Kauf sehen
 * (s. braucht FristHinweis + lib/programm-status.ts).
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
  | {
      art: "geschlossen";
      /** Was die Quelle woertlich sagt, plus Pruefdatum. */
      quelle: string;
      /** Freitext, falls eine Wiedereroeffnung angekuendigt aber undatiert ist. */
      wiedereroeffnungErwartet?: string;
    }
  | {
      art: "unbekannt";
      /** Optional: was geprueft wurde und warum es nichts hergab. */
      quelle?: string;
    };

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

/**
 * Muss dem Kunden VOR dem Kauf ein Frist-Hinweis angezeigt werden?
 *
 * Wahr, solange die Frist nicht positiv belegt ist — also bei `unbekannt`
 * (Quelle schweigt) UND bei fehlendem Feld (noch nicht migriert, Legacy-Weg).
 * Falsch nur bei `keine` und `stichtag`, wo eine belegte Aussage samt Quelle
 * vorliegt. (`geschlossen` ist gar nicht erst verkaeuflich.)
 *
 * Das ist die Gegenleistung dafuer, dass unverifizierte Programme im Verkauf
 * bleiben duerfen: Der Kunde erfaehrt, dass er die Frist selbst pruefen muss.
 */
export function brauchtFristHinweis(fz: FristZustand | undefined): boolean {
  if (!fz) return true; // noch nicht migriert -> ebenfalls unverifiziert
  return fz.art === "unbekannt";
}
