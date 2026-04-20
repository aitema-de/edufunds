"use client";

import { KeyboardEvent } from "react";

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
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-6">
      <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
        <span>
          Frage {totalQuestions} von voraussichtlich 6–{maxQuestions}
        </span>
        <span>
          {Math.round(progress)} %
        </span>
      </div>
      <div className="mb-4 h-1 w-full rounded-full bg-slate-700">
        <div
          className="h-1 rounded-full bg-orange-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-slate-100">{question}</h3>
      {rationale && (
        <p className="mb-4 text-sm text-slate-400">Warum? {rationale}</p>
      )}
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Deine Antwort — gerne konkret mit Zahlen und Beispielen. (Strg/⌘+Enter sendet)"
        className="min-h-[140px] w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
      />
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{answer.length} Zeichen</span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || !answer.trim()}
          className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {busy ? "Sende…" : "Antworten"}
        </button>
      </div>
    </div>
  );
}
