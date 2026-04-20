"use client";

import { Circle, Loader2 } from "lucide-react";

interface Props {
  stage: string;
}

/**
 * Die Pipeline laeuft serverseitig synchron — der Client hat keine Live-Updates.
 * Wir zeigen die vier Stages als Checkliste, mit einem weichen "in Arbeit"-Puls.
 */
const STAGES = [
  { key: "outline", label: "Gliederung strukturieren", detail: "Die KI bestimmt die Reihenfolge der Abschnitte." },
  { key: "sections", label: "Abschnitte schreiben", detail: "Pro Abschnitt ein eigener KI-Call mit den Fakten." },
  { key: "critique", label: "Gutachten erstellen", detail: "Ein strenger Durchgang sucht Floskeln und Lücken." },
  { key: "revision", label: "Finale Fassung", detail: "Einarbeitung des Gutachtens in den Antragstext." },
];

export function GeneratingProgress({ stage }: Props) {
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
        {STAGES.map((s) => (
          <li key={s.key} className="flex items-start gap-3 rounded-lg border border-slate-700/40 bg-slate-900/40 p-3">
            <div className="mt-0.5">
              <Circle className="h-5 w-5 text-slate-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-200">{s.label}</div>
              <div className="text-xs text-slate-500">{s.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      {stage && (
        <p className="mt-6 text-center text-sm text-orange-300">{stage}</p>
      )}
    </div>
  );
}
