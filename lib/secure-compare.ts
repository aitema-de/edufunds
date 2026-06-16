import { timingSafeEqual } from "crypto";

/**
 * Konstantzeit-Vergleich zweier Geheimnisse (API-Keys, Cron-Secrets, Tokens).
 *
 * Ein naiver `a === b`-Vergleich bricht beim ersten abweichenden Zeichen ab und
 * verraet ueber die Antwortzeit, wie viele fuehrende Zeichen korrekt waren
 * (Timing-Seitenkanal). `timingSafeEqual` vergleicht in konstanter Zeit.
 *
 * Gibt false zurueck, wenn einer der Werte fehlt oder die Laengen abweichen.
 * Der Laengen-Vergleich ist unkritisch (Laenge ist kein Geheimnis), nur der
 * Inhalts-Vergleich muss konstantzeitig sein.
 */
export function secureEquals(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
