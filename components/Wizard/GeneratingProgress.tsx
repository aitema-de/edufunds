"use client";

import { Loader2 } from "lucide-react";

interface Props {
  stage: string;
}

export function GeneratingProgress({ stage }: Props) {
  return (
    <div className="rounded-xl border border-orange-500/40 bg-slate-800/40 p-10 text-center">
      <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-orange-400" />
      <h3 className="mb-2 text-xl font-semibold text-slate-100">
        Pipeline schreibt deinen Antrag
      </h3>
      <p className="mx-auto mb-6 max-w-md text-slate-400">
        Gliederung → Abschnitte → Gutachten → Finalfassung. Das dauert typisch 1–3 Minuten.
      </p>
      {stage && (
        <p className="text-sm text-orange-300">{stage}</p>
      )}
    </div>
  );
}
