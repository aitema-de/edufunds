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
    kategorien?: string[];
    kurzbeschreibung?: string;
  };
}

interface Props {
  matches: MatchEntry[];
  /** Wird beim Klick auf "Antrag starten" aufgerufen, damit der Wizard den Anliegen-Kontext kennt. */
  onStartAntrag: (entry: MatchEntry) => void;
  /** D-05: Wird beim Klick auf "Anliegen neu formulieren" gerufen, setzt matchState auf null. */
  onReset?: () => void;
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-300 bg-emerald-500/10 border-emerald-500/40";
  if (score >= 70) return "text-orange-300 bg-orange-500/10 border-orange-500/40";
  return "text-slate-300 bg-slate-500/10 border-slate-500/40";
}

export function MatchResultList({ matches, onStartAntrag, onReset }: Props) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-8 text-center">
        <SearchX className="mx-auto mb-3 h-8 w-8 text-slate-500" />
        <h3 className="mb-2 text-lg font-semibold text-slate-200">
          Kein Programm passt zu diesem Anliegen
        </h3>
        <p className="mx-auto mb-4 max-w-md text-sm text-slate-400">
          Das passiert, wenn das Anliegen zu allgemein oder sehr speziell ist.
        </p>
        <ul className="mx-auto mb-6 max-w-md space-y-1 text-left text-sm text-slate-400">
          <li>Nenne Zielgruppe und Zielwirkung konkreter (z. B. „Leseförderung Klasse 1–2, 30 Kinder").</li>
          <li>Gib ein ungefähres Budget an (z. B. „5.000 bis 10.000 €").</li>
          <li>Erkläre, was die Schule bereits hat und was fehlt.</li>
        </ul>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Anliegen neu formulieren
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-400">
        {matches.length} Programm{matches.length === 1 ? "" : "e"} passen zu deinem Anliegen. Sortiert nach Passung:
      </div>
      {matches.map((m) => (
        <article
          key={m.id}
          className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 transition hover:border-slate-600"
        >
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-lg font-semibold text-slate-100">
                {m.programm.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {m.programm.foerdergeber && (
                  <span>{m.programm.foerdergeber}</span>
                )}
                {m.programm.foerdergeberTyp && (
                  <span className="rounded-full border border-slate-600 px-2 py-0.5 capitalize">
                    {m.programm.foerdergeberTyp}
                  </span>
                )}
                {m.programm.foerdersummeText && (
                  <span>· bis {m.programm.foerdersummeText}</span>
                )}
                {m.programm.bewerbungsfristText && (
                  <span>· Frist: {m.programm.bewerbungsfristText}</span>
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
            {/* passt_weil — gruener Block, immer gerendert */}
            <div className="flex items-start gap-2 rounded-lg bg-green-900/30 border border-green-700/50 px-3 py-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-400" aria-hidden="true" />
              <div>
                <span className="text-xs font-semibold text-green-400">Passt, weil: </span>
                <span className="text-sm text-green-200">{m.passt_weil}</span>
              </div>
            </div>
            {m.achtung_bei && (
              <div className="flex items-start gap-2 rounded-lg bg-orange-900/30 border border-orange-700/50 px-3 py-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" aria-hidden="true" />
                <div>
                  <span className="text-xs font-semibold text-orange-400">Achtung: </span>
                  <span className="text-sm text-orange-200">{m.achtung_bei}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/foerderprogramme/${m.programm.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-[#c9a227]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Programm-Details ansehen
            </Link>
            <button
              type="button"
              onClick={() => onStartAntrag(m)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 sm:py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Antrag starten
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
