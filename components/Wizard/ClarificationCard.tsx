"use client";

import { useState } from "react";
import { ArrowRight, HelpCircle } from "lucide-react";

interface Props {
  question: string;
  onSubmit: (praezisierung: string) => void;
  onForceRanking: () => void;
  busy?: boolean;
}

/**
 * ClarificationCard — D-11 (Phase 2 Plan 02-02)
 *
 * Wird gerendert, wenn das Backend `kind: "clarification"` zurueckgibt.
 * Statt einer Trefferliste sieht der User eine Klaerungsfrage und kann
 *   (a) sein Anliegen praezisieren (Submit ruft `onSubmit` mit dem Wert)
 *   (b) das Ranking erzwingen (Override-Link ruft `onForceRanking`)
 *
 * Multi-Round-Guard liegt im StartClient — diese Komponente weiss nichts davon.
 * XSS: React rendert `{question}` als Text-Node — keine HTML-Interpretation (T-02-02-06).
 */
export function ClarificationCard({ question, onSubmit, onForceRanking, busy }: Props) {
  const [praezisierung, setPraezisierung] = useState("");

  return (
    <div className="rounded-xl border border-blue-700/50 bg-slate-800/60 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <HelpCircle className="h-6 w-6 shrink-0 text-blue-400 mt-0.5" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">{question}</h2>
      </div>
      <textarea
        aria-label="Anliegen praezisieren"
        value={praezisierung}
        onChange={(e) => setPraezisierung(e.target.value)}
        placeholder="Praezisiere dein Anliegen hier..."
        className="w-full rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-3 text-sm text-slate-100 resize-none min-h-[80px]"
      />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onForceRanking()}
          disabled={busy}
          className="text-xs text-slate-500 hover:text-slate-300 transition disabled:opacity-50"
        >
          Trotzdem mit aktueller Eingabe ranken
        </button>
        <button
          type="button"
          disabled={!praezisierung.trim() || busy}
          onClick={() => onSubmit(praezisierung)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Praezisieren
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
