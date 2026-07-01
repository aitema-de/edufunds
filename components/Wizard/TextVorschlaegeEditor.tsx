"use client";

import { useState } from "react";
import { Check, Loader2, PenLine, Sparkles, Trash2, X } from "lucide-react";

interface Props {
  sessionToken: string;
  finalText: string;
  vorschlaege: string[];
  /** P2 (Feedback 24.06.): optionale Begruendung pro Vorschlag (Lookup per zitat) — zeigt das "Warum". */
  begruendungen?: Array<{ zitat: string; warum: string }>;
  /** Meldet die persistierten neuen Werte an den Parent (Antragstext + Restliste). */
  onChange: (next: { finalText: string; vorschlaege: string[] }) => void;
}

/**
 * P2: nutzerfreundliche "Warum"-Begruendung fuer einen Vorschlag (Lookup per zitat).
 * Der generische Detektor-Default wird neutral-positiv umformuliert. Exportiert, damit
 * die schreibgeschuetzte Variante (AntragResult ohne Session) dieselbe Logik nutzt.
 */
export function provenanz(
  begruendungen: Array<{ zitat: string; warum: string }> | undefined,
  zitat: string
): string | null {
  const w = begruendungen?.find((b) => b.zitat === zitat)?.warum?.trim();
  if (!w) return null;
  if (/nicht durch nutzerangaben gedeckt/i.test(w)) {
    return "fachliche Ergänzung des Assistenten, nicht aus Ihren Angaben";
  }
  return w;
}

/**
 * Produktvision 2026-06-10 — #4: Text-Vorschläge interaktiv.
 * P4-A Teil 2 (Feedback 24.06.): als aktive Rückfrage gerahmt — der Tester
 * wünschte, dass die KI ergänzte, nicht aus den Eingaben gedeckte Angaben
 * „markiert und nachfragt". Jeder ergänzte Satz (im Antragstext verankert)
 * wird als Rückfrage gestellt: „Ja, trifft zu" (bestätigen, Text bleibt),
 * „Anpassen" (Formulierung ersetzen) oder „Streichen" (aus dem Antrag nehmen).
 * Der Client rechnet den neuen finalText + die Restliste aus und persistiert
 * sie über /api/wizard/textvorschlag; der Parent rendert beides live nach.
 */
export function TextVorschlaegeEditor({ sessionToken, finalText, vorschlaege, begruendungen, onChange }: Props) {
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
    <div className="mt-6 rounded-lg border border-[#1e3d32]/30 bg-[#1e3d32]/5 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#1c1917]">
        <Sparkles className="h-4 w-4 text-[#1e3d32]" />
        Kurze Rückfrage: Stimmen diese ergänzten Angaben?
        <span className="rounded-full border border-[#1e3d32]/30 bg-white px-2 py-0.5 text-[11px] font-medium text-[#1e3d32]">
          noch {vorschlaege.length} zu prüfen
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-600">
        Der Assistent hat diese Formulierungen ergänzt, weil sie den Antrag fachlich stärken —
        sie stammen aber <strong>nicht direkt aus Ihren Angaben</strong>. Bitte prüfen Sie jede kurz:
        <strong> Ja, trifft zu</strong> behält sie, <strong>Anpassen</strong> passt die Formulierung an,
        <strong> Streichen</strong> nimmt sie aus dem Antrag.
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
                  className="w-full rounded border border-[#1c1917]/20 p-2 text-xs text-[#57534e] focus:border-[#1e3d32] focus:outline-none"
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
              <div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-[#1e3d32]">›</span>
                  <div className="flex-1">
                    <span>„{v}"</span>
                    {provenanz(begruendungen, v) && (
                      <span className="mt-1 block text-[11px] italic text-[#1e3d32]/80">
                        Warum ergänzt: {provenanz(begruendungen, v)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 pl-4">
                  <button
                    type="button"
                    onClick={() => confirm(i)}
                    disabled={busy !== null}
                    aria-label="Angabe bestätigen — trifft zu"
                    className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                  >
                    {busy === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Ja, trifft zu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(i);
                      setDraft(v);
                      setError(null);
                    }}
                    disabled={busy !== null}
                    aria-label="Formulierung anpassen"
                    className="inline-flex items-center gap-1 rounded border border-[#1c1917]/15 px-2 py-1 text-[11px] font-medium text-[#57534e] hover:bg-slate-100 disabled:opacity-40"
                  >
                    <PenLine className="h-3 w-3" />
                    Anpassen
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={busy !== null}
                    aria-label="Angabe aus dem Antrag streichen"
                    className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    <Trash2 className="h-3 w-3" />
                    Streichen
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <details className="mt-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-medium text-[#1e3d32]">Warum solche Begriffe?</summary>
        <p className="mt-1.5 leading-relaxed">
          Förderanträge nutzen bestimmte Signalwörter — etwa <em>Partizipation</em>, <em>Nachhaltigkeit</em>,{" "}
          <em>Bildungsgerechtigkeit</em> oder <em>Wirkungsorientierung</em> —, weil Fördergeber genau darauf achten.
          Der Assistent setzt sie bewusst ein, immer am konkreten Vorhaben verankert (nicht als hohle Floskel), um die
          Förderchancen zu erhöhen. Sie können jede Formulierung übernehmen, anpassen oder entfernen.
        </p>
      </details>
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
