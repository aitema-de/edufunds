"use client";

import { KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  question: string;
  rationale?: string;
  totalQuestions: number;
  maxQuestions: number;
  answer: string;
  setAnswer: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
}

export function QuestionCard({
  question,
  rationale,
  totalQuestions,
  maxQuestions,
  answer,
  setAnswer,
  onSubmit,
  busy,
}: Props) {
  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  const progress = Math.min(100, (totalQuestions / maxQuestions) * 100);

  return (
    <div className="rounded-xl border border-[#1c1917]/10 bg-white p-6">
      <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
        <span>
          Frage {totalQuestions} von voraussichtlich 6–{maxQuestions}
        </span>
        <span>
          {Math.round(progress)} %
        </span>
      </div>
      <div className="mb-4 h-1 w-full rounded-full bg-slate-100">
        <div
          className="h-1 rounded-full bg-[#1e3d32] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-[#1c1917]">{question}</h3>
      {rationale && (
        <p className="mb-4 text-sm text-slate-600">Warum? {rationale}</p>
      )}
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={handleKey}
        disabled={busy}
        placeholder="Ihre Antwort — gerne konkret mit Zahlen und Beispielen. (Strg/⌘+Enter sendet)"
        className="min-h-[140px] w-full rounded-lg border border-[#1c1917]/15 bg-white p-3 text-[#1c1917] placeholder-slate-400 focus:border-[#1e3d32] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
      />
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{answer.length} Zeichen</span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || !answer.trim()}
          className="rounded-lg bg-[#1e3d32] px-5 py-2 sm:py-3 text-sm font-semibold text-white transition hover:bg-[#2a5244] disabled:opacity-50"
        >
          {busy ? "Sende…" : "Antworten"}
        </button>
      </div>
      {/* 86ca910kr: Nach dem Klick war unklar, ob das Senden ankam — prominente
          Live-Rückmeldung in der Hauptspalte, solange die KI die nächste Frage
          formuliert (der „Sende…"-Buttontext allein war zu subtil). */}
      {busy && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex items-center gap-3 rounded-lg border border-[#1e3d32]/25 bg-[#1e3d32]/5 px-4 py-3 text-sm text-[#1e3d32]"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            Ihre Antwort ist angekommen — die KI liest sie und formuliert die nächste Frage.
            Das dauert einen Moment …
          </span>
        </div>
      )}
    </div>
  );
}
