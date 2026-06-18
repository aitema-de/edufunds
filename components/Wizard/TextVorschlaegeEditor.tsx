"use client";

import { useState } from "react";
import { Check, Loader2, PenLine, Sparkles, Trash2, X } from "lucide-react";

interface Props {
  sessionToken: string;
  finalText: string;
  vorschlaege: string[];
  /** Meldet die persistierten neuen Werte an den Parent (Antragstext + Restliste). */
  onChange: (next: { finalText: string; vorschlaege: string[] }) => void;
}

/**
 * Produktvision 2026-06-10 — #4: Text-Vorschläge interaktiv.
 * Jeder vom Assistenten ergänzte Satz (im Antragstext verankert) kann
 * bestätigt (aus der Liste nehmen, Text bleibt), bearbeitet (Formulierung im
 * Antragstext ersetzen) oder entfernt (aus dem Antragstext streichen) werden.
 * Der Client rechnet den neuen finalText + die Restliste aus und persistiert
 * sie über /api/wizard/textvorschlag; der Parent rendert beides live nach.
 */
export function TextVorschlaegeEditor({ sessionToken, finalText, vorschlaege, onChange }: Props) {
  const [busy, setBusy] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (vorschlaege.length === 0) return null;

  async function persist(index: number, nextFinalText: string, nextVorschlaege: string[]) {
    setBusy(index);
    setError(null);
    try {
      const res = await fetch("/api/wizard/textvorschlag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, finalText: nextFinalText, vorschlaege: nextVorschlaege }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Fehler ${res.status}`);
      }
      const j = (await res.json()) as { finalText: string; vorschlaege: string[] };
      onChange({ finalText: j.finalText, vorschlaege: j.vorschlaege });
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  // Vorschlag annehmen: aus der Liste nehmen, Antragstext bleibt unverändert.
  const confirm = (i: number) =>
    persist(i, finalText, vorschlaege.filter((_, idx) => idx !== i));

  // Vorschlag verwerfen: Satz aus dem Antragstext streichen + aus der Liste.
  const remove = (i: number) => {
    const next = stripWhitespace(finalText.replace(vorschlaege[i], ""));
    persist(i, next, vorschlaege.filter((_, idx) => idx !== i));
  };

  // Bearbeiten: Formulierung im Antragstext ersetzen + aus der Liste (= eigener Text).
  const saveEdit = (i: number) => {
    const val = draft.trim();
    if (!val) return;
    const next = finalText.replace(vorschlaege[i], val);
    persist(i, next, vorschlaege.filter((_, idx) => idx !== i));
  };

  return (
    <div className="mt-6 rounded-lg border border-[#78350f]/30 bg-[#78350f]/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1c1917]">
        <Sparkles className="h-4 w-4 text-[#78350f]" />
        Vorschläge des Assistenten im Antragstext — bitte prüfen
      </div>
      <p className="mb-3 text-xs text-slate-600">
        Diese Formulierungen hat der Assistent ergänzt, weil sie den Antrag fachlich stärken —
        sie stammen nicht aus Ihren Angaben. <strong>Übernehmen</strong> behält die Formulierung,
        <strong> Bearbeiten</strong> passt sie im Antragstext an, <strong>Entfernen</strong> streicht
        sie aus dem Antrag.
      </p>
      {error && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}
      <ul className="space-y-2 text-xs text-[#57534e]">
        {vorschlaege.map((v, i) => (
          <li key={i} className="rounded border border-[#1c1917]/10 bg-white p-2.5">
            {editing === i ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-[#1c1917]/20 p-2 text-xs text-[#57534e] focus:border-[#78350f] focus:outline-none"
                  aria-label="Vorschlag bearbeiten"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(i)}
                    disabled={busy === i || draft.trim().length === 0}
                    className="inline-flex items-center gap-1 rounded bg-[#57534e] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#1c1917] disabled:opacity-40"
                  >
                    {busy === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Übernehmen
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    disabled={busy === i}
                    className="inline-flex items-center gap-1 rounded border border-[#1c1917]/15 px-2.5 py-1 text-xs text-[#57534e] hover:bg-slate-100 disabled:opacity-40"
                  >
                    <X className="h-3 w-3" /> Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-[#78350f]">›</span>
                <span className="flex-1">„{v}"</span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => confirm(i)}
                    disabled={busy !== null}
                    title="Übernehmen"
                    aria-label="Vorschlag übernehmen"
                    className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                  >
                    {busy === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(i);
                      setDraft(v);
                      setError(null);
                    }}
                    disabled={busy !== null}
                    title="Bearbeiten"
                    aria-label="Vorschlag bearbeiten"
                    className="rounded p-1 text-[#57534e] hover:bg-slate-100 disabled:opacity-40"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={busy !== null}
                    title="Entfernen"
                    aria-label="Vorschlag entfernen"
                    className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Aufräumen nach dem Streichen eines Satzes: doppelte Leerzeichen/Leerzeilen glätten. */
function stripWhitespace(s: string): string {
  return s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
