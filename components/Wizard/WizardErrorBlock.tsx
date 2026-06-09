"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw, Search } from "lucide-react";
import { classifyWizardError } from "@/lib/wizard/error-classifier";

interface Props {
  /** Roher Fehler-String aus catch oder API-Response. */
  message: string;
  /** Optional: HTTP-Status, hilft bei der Klassifizierung. */
  httpStatus?: number;
  /** Wird aufgerufen, wenn der User „Erneut versuchen" klickt. Wenn nicht
   *  uebergeben, erscheint kein Retry-Button (auch wenn der Fehler-Kind das
   *  zuliesse). */
  onRetry?: () => void;
  busy?: boolean;
  /** Falls vorhanden, ueberschreibt das Default-Ziel des Fallback-Links. */
  fallbackHref?: string;
}

export function WizardErrorBlock({ message, httpStatus, onRetry, busy, fallbackHref = "/foerderprogramme" }: Props) {
  const state = classifyWizardError(message, httpStatus);
  const showRetry = state.canRetry && !!onRetry;
  const showFallback = state.hasManualFallback;

  return (
    <div className="rounded-2xl border border-[#c9a227]/30 bg-[#c9a227]/8 p-4 text-sm shadow-[0_4px_20px_-4px_rgba(10,22,40,0.06)]">
      <div className="flex items-start gap-2 text-[#1e3a61]">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a227]" />
        <div className="flex-1">
          <p className="font-semibold text-[#0a1628]">{state.title}</p>
          <p className="mt-1 leading-relaxed">{state.message}</p>
        </div>
      </div>
      {(showRetry || showFallback) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {showRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded border border-[#c9a227]/40 bg-white px-3 py-1.5 text-xs font-medium text-[#0a1628] transition hover:border-[#c9a227] hover:bg-[#c9a227]/5 disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" />
              Erneut versuchen
            </button>
          )}
          {showFallback && (
            <Link
              href={fallbackHref}
              className="inline-flex items-center gap-1.5 rounded border border-[#0a1628]/15 bg-white px-3 py-1.5 text-xs text-[#1e3a61] transition hover:border-[#0a1628]/30 hover:bg-[#f8f5f0]"
            >
              <Search className="h-3 w-3" />
              Katalog manuell durchsuchen
            </Link>
          )}
        </div>
      )}
      <details className="mt-3 text-xs text-slate-500">
        <summary className="cursor-pointer hover:text-[#1e3a61]">Technische Details</summary>
        <code className="mt-1 block break-all rounded bg-[#f8f5f0] border border-[#0a1628]/8 p-2 font-mono text-[11px] leading-relaxed text-slate-700">
          {state.raw}
        </code>
      </details>
    </div>
  );
}
