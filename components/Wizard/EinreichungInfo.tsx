import { Send, FileCheck2, Clock, Mail, Phone, CalendarClock } from "lucide-react";
import { fixDisplayUmlaut, type EinreichungInfo as EinreichungInfoData } from "@/lib/wizard/einreichung";

interface Props {
  info: EinreichungInfoData | null;
  kontaktEmail?: string;
  kontaktTelefon?: string;
  bewerbungsfristText?: string;
}

/**
 * Praesentationskarte „So reichen Sie ein" — heller Hintergrund, dunkler Text
 * (WCAG-AA). Gold ausschliesslich als Icon/Border-Akzent; Gold-Text nur in der
 * dunkleren Variante #7a5e12 auf hellem Grund. Faellt bei fehlenden
 * Dossier-Daten auf generische Hinweise zurueck.
 */
export function EinreichungInfo({ info, kontaktEmail, kontaktTelefon, bewerbungsfristText }: Props) {
  const einreichungsweg = info?.einreichungsweg ? fixDisplayUmlaut(info.einreichungsweg) : null;
  const anlagen = info?.anlagen?.map(fixDisplayUmlaut) ?? null;
  const bearbeitungsdauer = info?.bearbeitungsdauer ? fixDisplayUmlaut(info.bearbeitungsdauer) : null;

  return (
    <section className="rounded-2xl border border-[#c9a227]/30 bg-[#f8f5f0] p-6 text-[#1e3a61]">
      <h3 className="mb-4 flex items-center gap-3 text-xl font-bold text-[#0a1628]">
        <Send className="h-5 w-5 text-[#c9a227]" />
        So reichen Sie ein
      </h3>

      <div className="space-y-5 text-sm">
        <div>
          <div className="mb-1 font-semibold text-[#0a1628]">Einreichungsweg</div>
          {einreichungsweg ? (
            <p className="text-[#1e3a61]">{einreichungsweg}</p>
          ) : (
            <p className="text-slate-600">
              Diesen Antrag reichen Sie direkt beim Fördergeber ein. Den genauen Weg und die Frist
              entnehmen Sie bitte der offiziellen Ausschreibung.
            </p>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center gap-2 font-semibold text-[#0a1628]">
            <FileCheck2 className="h-4 w-4 text-[#c9a227]" />
            Erforderliche Unterlagen
          </div>
          {anlagen ? (
            <ul className="ml-1 list-disc space-y-1 pl-4 text-[#1e3a61]">
              {anlagen.map((anlage, i) => (
                <li key={i}>{anlage}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-600">
              Welche Anlagen verlangt werden, erfahren Sie in der Ausschreibung des Fördergebers.
            </p>
          )}
        </div>

        {bearbeitungsdauer && (
          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="h-4 w-4 text-[#c9a227]" />
            <span>Bearbeitungszeit: {bearbeitungsdauer}</span>
          </div>
        )}

        {(kontaktEmail || kontaktTelefon || bewerbungsfristText) && (
          <div className="space-y-2 border-t border-[#0a1628]/10 pt-4">
            {kontaktEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#c9a227]" />
                <a href={`mailto:${kontaktEmail}`} className="text-[#7a5e12] hover:underline">
                  {kontaktEmail}
                </a>
              </div>
            )}
            {kontaktTelefon && (
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="h-4 w-4 text-[#c9a227]" />
                <span>{kontaktTelefon}</span>
              </div>
            )}
            {bewerbungsfristText && (
              <div className="flex items-center gap-2 text-slate-700">
                <CalendarClock className="h-4 w-4 text-[#c9a227]" />
                <span>Frist: {bewerbungsfristText}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
