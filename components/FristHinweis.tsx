import { CalendarClock, CalendarCheck } from "lucide-react";
import { formatFristDatum } from "@/lib/foerder-zustaende";

/**
 * Hinweis, dass die Bewerbungsfrist dieses Programms NICHT verifiziert ist.
 *
 * Hintergrund (17.–22.07.2026): Bei den meisten Programmen war "laeuft rollend"
 * von "Frist nicht erfasst" nicht unterscheidbar — beides ein fehlendes Feld.
 * So wurde ein Antrag fuer ein Programm verkauft, dessen einziger Stichtag 2019
 * lag. Seither trennt `fristZustand` (lib/foerder-zustaende.ts) drei Faelle:
 *
 *   belegt offen (keine/stichtag) -> kein Hinweis
 *   belegt geschlossen            -> gar nicht erst im Verkauf
 *   NICHT VERIFIZIERT (unbekannt / noch nicht migriert) -> DIESER Hinweis
 *
 * Entscheidung Kolja, 22.07.2026: Unverifizierte Programme bleiben verkaeuflich
 * — aber nur, wenn der Kunde es VOR dem Kauf sieht. Dieser Baustein ist die
 * Gegenleistung; er darf nicht stillschweigend entfallen.
 *
 * Wann rendern: `brauchtFristHinweis(programm.fristZustand)`.
 */
export function FristHinweis({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 ${className}`}
      data-testid="frist-hinweis"
    >
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
      <p className="text-xs leading-relaxed text-[#57534e]">
        <strong className="font-semibold text-[#1c1917]">Frist nicht verifiziert:</strong> Für
        dieses Programm liegt uns keine bestätigte Bewerbungsfrist vor. Bitte prüfen Sie vor der
        Einreichung beim Fördergeber, ob aktuell eine Bewerbungsrunde offen ist.
      </p>
    </div>
  );
}

/**
 * Positive Anzeige des naechsten belegten Stichtags (Issue #109).
 *
 * Gegenstueck zum unbekannt-Hinweis oben: Wiederkehrende Stichtag-Programme
 * bleiben ganzjaehrig verkaeuflich (Entscheidung Kolja 22.07.2026) — dieser
 * Baustein zeigt dem Kunden VOR dem Kauf, wann die naechste Runde ansteht.
 * Datum kommt aus `naechsteFrist(fristZustand)` (lib/foerder-zustaende.ts).
 */
export function NaechsteFristHinweis({
  datumIso,
  wiederkehrend = false,
  className = "",
}: {
  datumIso: string;
  wiederkehrend?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 ${className}`}
      data-testid="naechste-frist-hinweis"
    >
      <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
      <p className="text-xs leading-relaxed text-[#57534e]">
        <strong className="font-semibold text-[#1c1917]">
          Nächste Frist: {formatFristDatum(datumIso)}.
        </strong>{" "}
        {wiederkehrend
          ? "Das Programm schreibt regelmäßig aus — Sie können Ihren Antrag jetzt vorbereiten und zur nächsten Runde einreichen."
          : "Bis dahin können Sie Ihren Antrag vorbereiten und einreichen."}
      </p>
    </div>
  );
}

/** Kurzform der Naechste-Frist-Anzeige fuer Listen/Karten. */
export function NaechsteFristBadge({
  datumIso,
  className = "",
}: {
  datumIso: string;
  className?: string;
}) {
  return (
    <span
      className={`rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ${className}`}
      title="Belegter nächster Stichtag dieses Programms. Sie können Ihren Antrag jetzt vorbereiten und zur Runde einreichen."
      data-testid="naechste-frist-badge"
    >
      Nächste Frist: {formatFristDatum(datumIso)}
    </span>
  );
}

/** Kurzform fuer Listen/Karten, wo kein Platz fuer den vollen Kasten ist. */
export function FristHinweisBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ${className}`}
      title="Für dieses Programm liegt uns keine bestätigte Bewerbungsfrist vor. Bitte vor der Einreichung beim Fördergeber prüfen."
      data-testid="frist-hinweis-badge"
    >
      Frist nicht verifiziert
    </span>
  );
}
