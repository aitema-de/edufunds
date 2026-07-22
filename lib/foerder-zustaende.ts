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
  /** Wie bei FristZustand: optionale Notiz, WAS geprueft wurde und wo die
   *  Limits liegen (typisch: im Antragsportal, Portal-Name notieren). */
  | { art: "unbekannt"; quelle?: string };

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

/**
 * Naechster kuenftiger Stichtag eines Programms als ISO-Datum (YYYY-MM-DD),
 * oder null, wenn keiner bestimmbar ist.
 *
 * Hintergrund (Issue #109, Entscheidung Kolja 22.07.2026): Wiederkehrende
 * Stichtag-Programme bleiben ganzjaehrig verkaeuflich — dann muss der Kunde
 * aber sehen, WANN die naechste Runde ansteht, sonst kauft er blind ein
 * Dossier fuer einen Termin in ferner Zukunft.
 *
 * Regeln:
 * - Nur `art === "stichtag"` liefert ein Datum; `keine` (laufend) und
 *   `unbekannt` (eigener Hinweis) bewusst nicht.
 * - Ein Stichtag HEUTE zaehlt als kuenftig (Lehre aus dem Gate-Haertungsfall
 *   17.07.2026: UTC-Mitternacht < now liess "heute" faelschlich verfallen).
 * - Vergangene Stichtage werden NUR bei `jaehrlichWiederkehrend` ins naechste
 *   Jahr gerollt (Monat/Tag behalten; 29.02. normalisiert Date auf den 01.03.).
 * - Mehrere Stichtage/Saeulen: der zeitlich naechste gewinnt.
 * - Vergangen + nicht wiederkehrend -> null (Verkaufsfaehigkeit regelt das
 *   Gate `istFristVerkaufsfaehig`, hier geht es NUR um Anzeige).
 */
export function naechsteFrist(
  fz: FristZustand | undefined,
  now: Date = new Date()
): string | null {
  if (!fz || fz.art !== "stichtag") return null;
  if (!Array.isArray(fz.stichtage) || fz.stichtage.length === 0) return null;

  const heute = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const kandidaten: number[] = [];

  for (const s of fz.stichtage) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) continue; // kaputtes Datum ignorieren statt werfen (Anzeige-Pfad)
    const monat = Number(m[2]) - 1;
    const tag = Number(m[3]);
    const t = Date.UTC(Number(m[1]), monat, tag);
    if (t >= heute) {
      kandidaten.push(t);
    } else if (fz.jaehrlichWiederkehrend) {
      const diesesJahr = Date.UTC(now.getUTCFullYear(), monat, tag);
      kandidaten.push(
        diesesJahr >= heute ? diesesJahr : Date.UTC(now.getUTCFullYear() + 1, monat, tag)
      );
    }
  }

  if (kandidaten.length === 0) return null;
  return new Date(Math.min(...kandidaten)).toISOString().slice(0, 10);
}

/** ISO-Datum (YYYY-MM-DD) -> deutsche Anzeige (TT.MM.JJJJ). */
export function formatFristDatum(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
