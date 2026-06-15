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
    <div className="rounded-xl border border-[#0a1628]/10 bg-white p-6">
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
          className="h-1 rounded-full bg-[#c9a227] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-[#0a1628]">{question}</h3>
      {rationale && (
        <p className="mb-4 text-sm text-slate-600">Warum? {rationale}</p>
      )}
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ihre Antwort — gerne konkret mit Zahlen und Beispielen. (Strg/⌘+Enter sendet)"
        className="min-h-[140px] w-full rounded-lg border border-[#0a1628]/15 bg-white p-3 text-[#0a1628] placeholder-slate-400 focus:border-[#c9a227] focus:outline-none"
      />
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{answer.length} Zeichen</span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || !answer.trim()}
          className="rounded-lg bg-[#c9a227] px-5 py-2 sm:py-3 text-sm font-semibold text-white transition hover:bg-[#b8921e] disabled:opacity-50"
        >
          {busy ? "Sende…" : "Antworten"}
        </button>
      </div>
    </div>
  );
}
