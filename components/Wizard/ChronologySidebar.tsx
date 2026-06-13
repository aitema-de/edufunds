"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import type { WizardFacts, WizardMessage } from "@/lib/wizard/types";
import { FactsPanel } from "./FactsPanel";

interface Props {
  messages: WizardMessage[];
  facts: WizardFacts;
  onEditAnswer?: (messageId: string, newContent: string) => Promise<boolean> | boolean;
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
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setDraft(current);
    setSaveError(null);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
    setSaveError(null);
  };
  const saveEdit = async () => {
    if (!editingId || !onEditAnswer || !draft.trim()) return;
    setSaveError(null);
    // Editor NUR bei Erfolg schliessen. Schlaegt das Speichern fehl, bleibt der
    // bearbeitete Text erhalten und der Fehler wird direkt am Editor angezeigt —
    // statt den Editor zu schliessen und stillschweigend den alten Text zu zeigen.
    const ok = await onEditAnswer(editingId, draft.trim());
    if (ok) {
      cancelEdit();
    } else {
      setSaveError(
        "Speichern hat nicht geklappt. Dein Text steht noch hier — bitte „Speichern“ erneut klicken."
      );
    }
  };

  return (
    <aside className="flex flex-col gap-6">
      <section className="rounded-xl border border-[#0a1628]/10 bg-white/80 p-4">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600">
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
                        m.role === "ai" ? "text-slate-600" : "text-[#1e3a61] font-medium"
                      }
                    >
                      {m.role === "ai" ? "KI" : "Du"}
                    </div>
                    {canEdit && !isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(m.id, m.content)}
                        className="rounded p-1 text-slate-500 opacity-0 transition hover:bg-slate-100 hover:text-[#1e3a61] group-hover:opacity-100"
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
                        className="min-h-[80px] w-full rounded border border-[#0a1628]/15 bg-white p-2 text-sm text-[#0a1628] focus:border-[#c9a227] focus:outline-none"
                        autoFocus
                      />
                      <div className="mt-1.5 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={editBusy}
                          className="inline-flex items-center gap-1 rounded border border-[#0a1628]/15 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          <X className="h-3 w-3" />
                          Abbrechen
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={editBusy || !draft.trim()}
                          className="inline-flex items-center gap-1 rounded bg-[#c9a227] px-2 py-1 text-xs font-medium text-white hover:bg-[#b8921e] disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" />
                          {editBusy ? "Speichere…" : "Speichern"}
                        </button>
                      </div>
                      {saveError && (
                        <p className="mt-1.5 rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-700">
                          {saveError}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-500">
                        Achtung: Alle späteren Fragen/Antworten werden verworfen und der
                        Dialog läuft ab hier neu.
                      </p>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-slate-700">{m.content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <section className="rounded-xl border border-[#0a1628]/10 bg-white/80 p-4">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600">
          Das weiß die KI bisher
        </h4>
        <FactsPanel facts={facts} compact />
      </section>
    </aside>
  );
}
