"use client";

import type { WizardFacts, WizardMessage } from "@/lib/wizard/types";

interface Props {
  messages: WizardMessage[];
  facts: WizardFacts;
}

export function ChronologySidebar({ messages, facts }: Props) {
  const qa = messages.filter((m) => m.kind === "question" || m.kind === "answer");
  return (
    <aside className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Bisheriger Dialog
        </h4>
        {qa.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Antworten.</p>
        ) : (
          <ol className="space-y-3 text-sm">
            {qa.map((m) => (
              <li key={m.id}>
                <div
                  className={
                    m.role === "ai"
                      ? "text-slate-400"
                      : "text-slate-200 font-medium"
                  }
                >
                  {m.role === "ai" ? "KI" : "Du"}
                </div>
                <div className="text-slate-300 whitespace-pre-wrap">
                  {m.content}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Erfasste Fakten
        </h4>
        {Object.keys(facts).length === 0 ? (
          <p className="text-sm text-slate-500">
            Werden aus deinen Antworten strukturiert extrahiert.
          </p>
        ) : (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-slate-900 p-2 text-xs text-slate-300">
{JSON.stringify(facts, null, 2)}
          </pre>
        )}
      </section>
    </aside>
  );
}
