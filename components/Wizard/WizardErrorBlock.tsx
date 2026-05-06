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
    <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 text-sm">
      <div className="flex items-start gap-2 text-orange-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-orange-100">{state.title}</p>
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
              className="inline-flex items-center gap-1.5 rounded border border-orange-400/60 bg-orange-500/20 px-3 py-1.5 text-xs font-medium text-orange-100 hover:bg-orange-500/30 disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" />
              Erneut versuchen
            </button>
          )}
          {showFallback && (
            <Link
              href={fallbackHref}
              className="inline-flex items-center gap-1.5 rounded border border-slate-600 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
            >
              <Search className="h-3 w-3" />
              Katalog manuell durchsuchen
            </Link>
          )}
        </div>
      )}
      <details className="mt-3 text-xs text-orange-300/70">
        <summary className="cursor-pointer hover:text-orange-300">Technische Details</summary>
        <code className="mt-1 block break-all rounded bg-slate-900/40 p-2 font-mono text-[11px] leading-relaxed">
          {state.raw}
        </code>
      </details>
    </div>
  );
}
