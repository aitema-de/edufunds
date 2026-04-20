"use client";

import { useState } from "react";
import { Check, Copy, Download, RefreshCw } from "lucide-react";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { GenerationArtefacts } from "@/lib/wizard/types";

interface Props {
  programm: Foerderprogramm;
  generation: GenerationArtefacts;
  onRestart: () => void;
}

export function AntragResult({ programm, generation, onRestart }: Props) {
  const [copied, setCopied] = useState(false);
  const [showCritique, setShowCritique] = useState(false);
  const text = generation.finalText ?? "";

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = (mime: string, ext: string) => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Foerderantrag_${programm.id}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-orange-500/40 bg-slate-800/40 p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">
            Antragsentwurf fertig
          </h2>
          <p className="text-sm text-slate-400">
            für {programm.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
          <button
            type="button"
            onClick={() => download("text/plain;charset=utf-8", "txt")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-4 w-4" /> .txt
          </button>
          <button
            type="button"
            onClick={() => download("application/msword", "doc")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-4 w-4" /> .doc
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" /> Neu
          </button>
        </div>
      </header>
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-6 text-slate-200">
        <pre className="whitespace-pre-wrap font-sans leading-relaxed">{text}</pre>
      </div>
      {generation.critique && (
        <details
          className="mt-6 rounded-lg border border-slate-700 bg-slate-900/60 p-4"
          open={showCritique}
          onToggle={(e) => setShowCritique((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-sm font-medium text-slate-300">
            KI-Gutachten zum ersten Entwurf (zur Transparenz)
          </summary>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-400">
{generation.critique}
          </pre>
        </details>
      )}
    </div>
  );
}
