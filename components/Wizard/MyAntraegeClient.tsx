"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2, ArrowRight, FileText } from "lucide-react";
import {
  listLocalSessions,
  removeLocalSession,
} from "@/lib/wizard/session-index-client";
import type { WizardPhase } from "@/lib/wizard/types";

interface SessionSummary {
  programmId: string;
  sessionToken: string;
  programmName: string;
  phase: WizardPhase;
  totalQuestions: number;
  maxQuestions: number;
  updatedAt: string;
  missing?: boolean;
  error?: string;
}

const PHASE_META: Record<
  WizardPhase,
  { label: string; className: string }
> = {
  interviewing: { label: "In Bearbeitung", className: "bg-orange-500/15 text-orange-300 border-orange-500/40" },
  ready_to_generate: { label: "Bereit zur Generierung", className: "bg-blue-500/15 text-blue-300 border-blue-500/40" },
  generating: { label: "Wird geschrieben…", className: "bg-purple-500/15 text-purple-300 border-purple-500/40" },
  complete: { label: "Fertig", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  failed: { label: "Fehler", className: "bg-red-500/15 text-red-300 border-red-500/40" },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function MyAntraegeClient() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const local = listLocalSessions();
    if (local.length === 0) {
      setSessions([]);
      return;
    }
    setSessions(null);

    Promise.all(
      local.map(async ({ programmId, sessionToken }) => {
        try {
          const res = await fetch(`/api/wizard/${sessionToken}`);
          if (res.status === 404) {
            return {
              programmId,
              sessionToken,
              programmName: "(Session auf dem Server nicht mehr vorhanden)",
              phase: "failed" as WizardPhase,
              totalQuestions: 0,
              maxQuestions: 12,
              updatedAt: new Date().toISOString(),
              missing: true,
            };
          }
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
          const body = await res.json();
          return {
            programmId,
            sessionToken,
            programmName: body.foerderprogrammName ?? programmId,
            phase: body.phase as WizardPhase,
            totalQuestions: body.interviewer?.totalQuestions ?? 0,
            maxQuestions: body.interviewer?.maxQuestions ?? 12,
            updatedAt: body.updatedAt ?? new Date().toISOString(),
          } satisfies SessionSummary;
        } catch (e) {
          return {
            programmId,
            sessionToken,
            programmName: programmId,
            phase: "failed" as WizardPhase,
            totalQuestions: 0,
            maxQuestions: 12,
            updatedAt: new Date().toISOString(),
            error: e instanceof Error ? e.message : "Fehler",
          } satisfies SessionSummary;
        }
      })
    ).then((results) => {
      results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setSessions(results);
    });
  }, [tick]);

  const handleRemove = (programmId: string) => {
    if (!confirm("Diese Session aus dem Browser entfernen? (Auf dem Server bleibt sie bestehen und ist über einen Link weiter erreichbar, falls du einen hast.)")) {
      return;
    }
    removeLocalSession(programmId);
    refresh();
  };

  if (sessions === null) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
        Lade Sessions…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-10 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-slate-500" />
        <h3 className="mb-2 text-lg font-semibold text-slate-100">
          Noch keine Anträge
        </h3>
        <p className="mx-auto mb-6 max-w-md text-sm text-slate-400">
          Starte über die Förderprogramm-Übersicht einen neuen Antrag mit dem
          Wizard. Hier findest du später deine laufenden und abgeschlossenen
          Entwürfe.
        </p>
        <Link
          href="/foerderprogramme"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Förderprogramme ansehen
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const meta = PHASE_META[s.phase] ?? PHASE_META.failed;
        const href = `/antrag/${s.programmId}/wizard`;
        return (
          <div
            key={s.sessionToken}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 transition hover:border-slate-600"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-slate-100">
                  {s.programmName}
                </h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${meta.className}`}
                >
                  {meta.label}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {!s.missing && !s.error && (
                  <>
                    {s.totalQuestions}/{s.maxQuestions} Fragen beantwortet ·{" "}
                  </>
                )}
                Letzter Stand: {formatDate(s.updatedAt)}
                {s.error && (
                  <span className="ml-2 text-red-400">· {s.error}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!s.missing && (
                <Link
                  href={href}
                  className="inline-flex items-center gap-2 rounded-lg border border-orange-500/50 bg-orange-500/10 px-3 py-2 text-sm font-medium text-orange-200 hover:bg-orange-500/20"
                >
                  Öffnen
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => handleRemove(s.programmId)}
                title="Aus Browser entfernen"
                className="rounded-lg border border-slate-600 p-2 text-slate-400 hover:border-red-500/50 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
