"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import type { WizardFacts, WizardMessage } from "@/lib/wizard/types";

interface Props {
  messages: WizardMessage[];
  facts: WizardFacts;
  onEditAnswer?: (messageId: string, newContent: string) => Promise<void> | void;
  editBusy?: boolean;
  disableEdit?: boolean;
}

export function ChronologySidebar({
  messages,
  facts,
  onEditAnswer,
  editBusy,
  disableEdit,
}: Props) {
  const qa = messages.filter((m) => m.kind === "question" || m.kind === "answer");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setDraft(current);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };
  const saveEdit = async () => {
    if (!editingId || !onEditAnswer || !draft.trim()) return;
    await onEditAnswer(editingId, draft.trim());
    cancelEdit();
  };

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
            {qa.map((m) => {
              const isEditing = editingId === m.id;
              const canEdit =
                !disableEdit && m.role === "user" && m.kind === "answer" && !!onEditAnswer;
              return (
                <li key={m.id} className="group">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={
                        m.role === "ai" ? "text-slate-400" : "text-slate-200 font-medium"
                      }
                    >
                      {m.role === "ai" ? "KI" : "Du"}
                    </div>
                    {canEdit && !isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(m.id, m.content)}
                        className="rounded p-1 text-slate-500 opacity-0 transition hover:bg-slate-700 hover:text-slate-200 group-hover:opacity-100"
                        title="Antwort bearbeiten (Dialog läuft ab hier neu)"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-1">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        disabled={editBusy}
                        className="min-h-[80px] w-full rounded border border-slate-600 bg-slate-900 p-2 text-sm text-slate-100 focus:border-orange-500 focus:outline-none"
                        autoFocus
                      />
                      <div className="mt-1.5 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={editBusy}
                          className="inline-flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                        >
                          <X className="h-3 w-3" />
                          Abbrechen
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={editBusy || !draft.trim()}
                          className="inline-flex items-center gap-1 rounded bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" />
                          {editBusy ? "Speichere…" : "Speichern"}
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Achtung: Alle späteren Fragen/Antworten werden verworfen und der
                        Dialog läuft ab hier neu.
                      </p>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-slate-300">{m.content}</div>
                  )}
                </li>
              );
            })}
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
