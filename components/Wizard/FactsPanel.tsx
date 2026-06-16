"use client";

import { useState } from "react";
import { Building2, Target, TrendingUp, Wallet, Link2, PenLine, Check, X, Loader2 } from "lucide-react";
import type { WizardFacts } from "@/lib/wizard/types";

interface Props {
  facts: WizardFacts;
  compact?: boolean;
  /** Aktiviert Inline-Bearbeitung der Fakten-Kacheln. */
  editable?: boolean;
  /** Session-Token fuer den PATCH-Endpunkt (nur mit editable noetig). */
  sessionToken?: string;
  /** Callback mit den serverseitig aktualisierten Fakten nach erfolgreichem Speichern. */
  onFactsUpdate?: (facts: WizardFacts) => void;
}

/** Wandelt einen Fakt-Wert in seine editierbare Roh-Textform. */
function toDraft(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(String).join("\n");
  return String(v);
}

interface Section {
  key: keyof WizardFacts;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: Section[] = [
  { key: "schule", label: "Schule", icon: Building2 },
  { key: "projekt", label: "Projekt", icon: Target },
  { key: "wirkung", label: "Wirkung", icon: TrendingUp },
  { key: "budget", label: "Budget", icon: Wallet },
  { key: "programmpassung", label: "Programmpassung", icon: Link2 },
];

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("de-DE");
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.map(String).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// Bekannte Akronyme/Einheiten gross ausschreiben (sonst "Beantragt Eur").
const ACRONYMS: Record<string, string> = {
  eur: "EUR",
  ki: "KI",
  mint: "MINT",
  plz: "PLZ",
  url: "URL",
  id: "ID",
  it: "IT",
  pdf: "PDF",
};

function humanizeKey(k: string): string {
  // Jedes Wort gross schreiben (nicht nur das erste), sonst entsteht
  // "Erwartete ergebnisse" / "Messbare indikatoren".
  return k
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => {
      if (!w) return w;
      const acronym = ACRONYMS[w.toLowerCase()];
      if (acronym) return acronym;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

export function FactsPanel({ facts, compact, editable, sessionToken, onFactsUpdate }: Props) {
  const [editing, setEditing] = useState<{ section: string; key: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEdit = Boolean(editable && sessionToken);

  function startEdit(section: string, key: string, value: unknown) {
    setEditing({ section, key });
    setDraft(toDraft(value));
    setError(null);
  }
  function cancelEdit() {
    setEditing(null);
    setDraft("");
    setError(null);
  }
  async function saveEdit(section: string, key: string) {
    if (!sessionToken) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/wizard/${sessionToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, key, value: draft }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      onFactsUpdate?.(body.facts as WizardFacts);
      setEditing(null);
      setDraft("");
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  const hasAny = SECTIONS.some(
    (s) =>
      facts[s.key] &&
      typeof facts[s.key] === "object" &&
      Object.keys(facts[s.key] as object).length > 0
  );

  if (!hasAny) {
    return (
      <p className="text-sm text-slate-500">
        Werden aus Ihren Antworten strukturiert extrahiert.
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {SECTIONS.map(({ key, label, icon: Icon }) => {
        const section = facts[key];
        if (
          !section ||
          typeof section !== "object" ||
          Array.isArray(section) ||
          Object.keys(section as object).length === 0
        ) {
          return null;
        }
        const entries = Object.entries(section as Record<string, unknown>).filter(
          ([, v]) => v !== undefined && v !== null && v !== ""
        );
        if (entries.length === 0) return null;
        return (
          <div key={key} className="rounded-lg border border-[#0a1628]/10 bg-[#f8f5f0] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#7a5e12]">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {entries.map(([k, v]) => {
                const sectionKey = String(key);
                const isEditing = editing?.section === sectionKey && editing?.key === k;
                const isArrayVal = Array.isArray(v);
                return (
                  <div key={k} className="contents">
                    <dt className="text-slate-500">{humanizeKey(k)}</dt>
                    {isEditing ? (
                      <dd className="text-slate-700">
                        {isArrayVal ? (
                          <textarea
                            autoFocus
                            rows={Math.max(2, draft.split("\n").length)}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="w-full rounded border border-[#c9a227]/60 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#c9a227]"
                            placeholder="Ein Eintrag pro Zeile"
                            disabled={saving}
                          />
                        ) : (
                          <input
                            autoFocus
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(sectionKey, k);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="w-full rounded border border-[#c9a227]/60 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#c9a227]"
                            disabled={saving}
                          />
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(sectionKey, k)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded bg-[#7a5e12] px-2 py-0.5 text-[11px] font-medium text-white transition hover:bg-[#664f0f] disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Speichern
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded border border-[#0a1628]/15 px-2 py-0.5 text-[11px] text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                            Abbrechen
                          </button>
                        </div>
                        {error && <p className="mt-1 text-[11px] text-red-700">{error}</p>}
                      </dd>
                    ) : canEdit ? (
                      <dd className="group flex items-start justify-between gap-2 text-slate-700">
                        <span>{formatValue(v)}</span>
                        <button
                          type="button"
                          onClick={() => startEdit(sectionKey, k, v)}
                          className="shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-[#7a5e12] focus:opacity-100"
                          title="Fakt korrigieren"
                          aria-label={`${humanizeKey(k)} korrigieren`}
                        >
                          <PenLine className="h-3.5 w-3.5" />
                        </button>
                      </dd>
                    ) : (
                      <dd className="text-slate-700">{formatValue(v)}</dd>
                    )}
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
