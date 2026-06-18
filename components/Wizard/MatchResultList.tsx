"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle, ExternalLink, SearchX, Star } from "lucide-react";

export interface MatchEntry {
  id: string;
  score: number;
  passt_weil: string;
  achtung_bei: string;
  programm: {
    id: string;
    name: string;
    foerdergeber?: string;
    foerdergeberTyp?: string;
    foerdersummeText?: string;
    foerdersummeMax?: number;
    bewerbungsfristText?: string;
    bewerbungsfristEnde?: string;
    kategorien?: string[];
    kurzbeschreibung?: string;
  };
}

/**
 * Antragsfrist abgelaufen? Vergleicht bewerbungsfristEnde (ISO) mit heute.
 * Achtung: viele Programme haben jährlich WIEDERKEHRENDE Fristen — eine
 * abgelaufene Frist bedeutet nicht zwingend "Programm tot". Deshalb wird hier
 * nur markiert/nach unten sortiert, NICHT ausgeblendet.
 */
export function isFristAbgelaufen(ende?: string): boolean {
  if (!ende) return false;
  const d = new Date(ende);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

interface Props {
  matches: MatchEntry[];
  /** Wird beim Klick auf "Antrag starten" aufgerufen, damit der Wizard den Anliegen-Kontext kennt. */
  onStartAntrag: (entry: MatchEntry) => void;
  /** D-05: Wird beim Klick auf "Anliegen neu formulieren" gerufen, setzt matchState auf null. */
  onReset?: () => void;
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 70) return "text-[#78350f] bg-[#78350f]/10 border-[#78350f]/30";
  return "text-slate-600 bg-slate-100 border-slate-200";
}

export function MatchResultList({ matches, onStartAntrag, onReset }: Props) {
  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1c1917]/8 bg-white p-8 text-center shadow-[0_4px_20px_-4px_rgba(10,22,40,0.06)]">
        <SearchX className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <h3 className="mb-2 text-lg font-semibold text-[#1c1917]">
          Kein Programm passt zu diesem Anliegen
        </h3>
        <p className="mx-auto mb-4 max-w-md text-sm text-slate-600">
          Das passiert, wenn das Anliegen zu allgemein oder sehr speziell ist.
        </p>
        <ul className="mx-auto mb-6 max-w-md space-y-1 text-left text-sm text-slate-600">
          <li>Nennen Sie Zielgruppe und Zielwirkung konkreter (z. B. „Leseförderung Klasse 1–2, 30 Kinder").</li>
          <li>Geben Sie ein ungefähres Budget an (z. B. „5.000 bis 10.000 €").</li>
          <li>Erklären Sie, was die Schule bereits hat und was fehlt.</li>
        </ul>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg bg-[#78350f] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#92400e]"
          >
            Anliegen neu formulieren
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // Abgelaufene Fristen ans Ende (stabil — gleiche Passungs-Reihenfolge innerhalb der Gruppen).
  const sorted = [...matches].sort(
    (a, b) =>
      Number(isFristAbgelaufen(a.programm.bewerbungsfristEnde)) -
      Number(isFristAbgelaufen(b.programm.bewerbungsfristEnde))
  );

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        {matches.length} Programm{matches.length === 1 ? "" : "e"} passen zu Ihrem Anliegen. Sortiert nach Passung:
      </div>
      {sorted.map((m) => {
        const expired = isFristAbgelaufen(m.programm.bewerbungsfristEnde);
        return (
        <article
          key={m.id}
          className={`rounded-2xl border bg-white p-5 shadow-[0_4px_20px_-4px_rgba(10,22,40,0.06)] transition hover:shadow-[0_8px_28px_-6px_rgba(10,22,40,0.1)] ${
            expired ? "border-[#1c1917]/8 opacity-75" : "border-[#1c1917]/8 hover:border-[#78350f]/30"
          }`}
        >
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-lg font-semibold text-[#1c1917]">
                {m.programm.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                {m.programm.foerdergeber && (
                  <span>{m.programm.foerdergeber}</span>
                )}
                {m.programm.foerdergeberTyp && (
                  <span className="rounded-full border border-[#1c1917]/15 px-2 py-0.5 capitalize text-[#57534e]">
                    {m.programm.foerdergeberTyp}
                  </span>
                )}
                {m.programm.foerdersummeText && (
                  <span>· bis {m.programm.foerdersummeText}</span>
                )}
                {m.programm.bewerbungsfristText && (
                  <span>· Frist: {m.programm.bewerbungsfristText}</span>
                )}
                {expired && (
                  <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                    Frist abgelaufen
                  </span>
                )}
              </div>
            </div>
            <div
              className={`flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold ${scoreColor(
                m.score
              )}`}
              title="Passungs-Score"
            >
              <Star className="h-4 w-4" />
              {m.score}
            </div>
          </div>
          {/* Strukturierte Begruendung — D-10 (Plan 02-02): passt_weil + achtung_bei aus MatchHit */}
          <div className="mb-4 space-y-2">
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <span className="text-xs font-semibold text-emerald-700">Passt, weil: </span>
                <span className="text-sm text-emerald-900">{m.passt_weil}</span>
              </div>
            </div>
            {m.achtung_bei && (
              <div className="flex items-start gap-2 rounded-lg bg-[#78350f]/10 border border-[#78350f]/30 px-3 py-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#78350f]" aria-hidden="true" />
                <div>
                  <span className="text-xs font-semibold text-[#78350f]">Achtung: </span>
                  <span className="text-sm text-[#57534e]">{m.achtung_bei}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/foerderprogramme/${m.programm.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 transition hover:text-[#78350f]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Programm-Details ansehen
            </Link>
            <button
              type="button"
              onClick={() => onStartAntrag(m)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#78350f] px-4 py-2 sm:py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#92400e]"
            >
              Antrag starten
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </article>
        );
      })}
    </div>
  );
}
