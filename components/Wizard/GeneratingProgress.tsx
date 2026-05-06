"use client";

import { Circle, Loader2, CheckCircle } from "lucide-react";
import type { PipelineStage } from "@/lib/wizard/types";

interface Props {
  /** Optional: dt. Klartext-Status fuer den unteren Hinweistext (z. B. "Pipeline startet"). */
  stage?: string;
  /** Aktueller Pipeline-Stage aus DB-Heartbeat — bestimmt pending/active/done je Item. */
  currentStage?: PipelineStage;
}

const STAGES: Array<{ key: PipelineStage; label: string; detail: string }> = [
  { key: "outline", label: "Gliederung strukturieren", detail: "Folgt der offiziellen Antragsstruktur, falls Richtlinie hinterlegt ist." },
  { key: "section", label: "Abschnitte schreiben", detail: "Pro Abschnitt ein eigener KI-Call mit den Fakten." },
  { key: "critique", label: "Gutachten erstellen", detail: "Ein strenger Durchgang sucht Floskeln, Lücken, Richtlinien-Verstöße." },
  { key: "revision", label: "Finale Fassung", detail: "Einarbeitung des Gutachtens in den Antragstext." },
  { key: "recheck", label: "Revision prüfen", detail: "Jedes Gutachten-Finding gegen die finale Fassung geprüft." },
  { key: "finanzplan", label: "Finanzplan-Entwurf", detail: "Programm-spezifische Kostenpositionen nach Richtlinie." },
  { key: "consistency", label: "Konsistenz prüfen", detail: "Antragstext und Finanzplan müssen zusammenpassen." },
];

const ORDER: PipelineStage[] = ["outline", "section", "critique", "revision", "recheck", "finanzplan", "consistency"];

function stageStatus(
  stageKey: PipelineStage,
  currentStage?: PipelineStage
): "pending" | "active" | "done" {
  if (!currentStage) return "pending";
  if (currentStage === "done") return "done";
  const currentIdx = ORDER.indexOf(currentStage);
  const myIdx = ORDER.indexOf(stageKey);
  if (myIdx < 0 || currentIdx < 0) return "pending";
  if (myIdx < currentIdx) return "done";
  if (myIdx === currentIdx) return "active";
  return "pending";
}

export function GeneratingProgress({ stage, currentStage }: Props) {
  return (
    <div className="rounded-xl border border-orange-500/40 bg-slate-800/40 p-10">
      <div className="mb-6 flex items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        <div>
          <h3 className="text-xl font-semibold text-slate-100">
            Pipeline schreibt deinen Antrag
          </h3>
          <p className="text-sm text-slate-400">
            Typisch 1–3 Minuten. Bleib auf der Seite — das Ergebnis erscheint automatisch.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {STAGES.map((s) => {
          const status = stageStatus(s.key, currentStage);
          const containerClass =
            status === "active"
              ? "flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-500/5 p-3"
              : status === "done"
                ? "flex items-start gap-3 rounded-lg border border-slate-700/40 bg-emerald-500/5 p-3"
                : "flex items-start gap-3 rounded-lg border border-slate-700/40 bg-slate-900/40 p-3";
          return (
            <li key={s.key} className={containerClass}>
              <div className="mt-0.5">
                {status === "pending" && <Circle className="h-5 w-5 text-slate-600" />}
                {status === "active" && <Loader2 className="h-5 w-5 animate-spin text-orange-400" />}
                {status === "done" && <CheckCircle className="h-5 w-5 text-emerald-400" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-200">{s.label}</div>
                <div className="text-xs text-slate-500">{s.detail}</div>
              </div>
            </li>
          );
        })}
      </ul>

      {stage && (
        <p className="mt-6 text-center text-sm text-orange-300">{stage}</p>
      )}
    </div>
  );
}
