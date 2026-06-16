"use client";

import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

export interface Conflict {
  otherSessionToken: string;
  otherProgrammId: string;
  otherProgrammName: string;
  similarityScore: number;
  reasons: string[];
  level: "error" | "warning";
}

interface Props {
  conflicts: Conflict[];
  onDismiss?: () => void;
}

export function KumulierungsWarnung({ conflicts, onDismiss }: Props) {
  if (conflicts.length === 0) return null;

  const hasError = conflicts.some((c) => c.level === "error");
  const box = hasError
    ? "border-red-500/40 bg-red-500/10 text-red-200"
    : "border-[#c9a227]/40 bg-[#c9a227]/10 text-[#1e3a61]";

  return (
    <div className={`mb-6 rounded-lg border ${box} p-4`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">
              {hasError ? "Kumulierungs-Konflikt" : "Hinweis zur Doppelförderung"}
            </div>
            <div className="text-xs opacity-80">
              Sie haben laufende Anträge für andere Programme, die nicht oder nur bedingt mit dem
              aktuellen kombinierbar sind. Bitte prüfen, bevor Sie beide einreichen.
            </div>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-1 text-slate-600 hover:bg-[#f8f5f0] hover:text-[#1e3a61]"
            title="Ausblenden"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {conflicts.map((c) => (
          <li key={c.otherSessionToken} className="rounded border border-[#0a1628]/10 bg-[#f8f5f0] p-2.5 text-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/antrag/${c.otherProgrammId}/wizard`}
                className="font-medium text-[#0a1628] hover:text-[#c9a227]"
              >
                {c.otherProgrammName}
              </Link>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  c.level === "error"
                    ? "border-red-500/40 text-red-300"
                    : "border-[#c9a227]/40 text-[#c9a227]"
                }`}
              >
                {c.level === "error" ? "unvereinbar" : "bedingt kombinierbar"}
              </span>
            </div>
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-700">
              {c.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
