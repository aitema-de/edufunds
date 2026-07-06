"use client";

import { useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import {
  REFORMULIER_DIREKTIVEN,
  type ReformulierDirektive,
} from "@/lib/reformulierung";

interface Props {
  sessionToken: string;
  /** Der ausgewählte Absatz (Roh-Markdown) — Grenzen kommen deterministisch aus node.position. */
  passage: string;
  /** Meldet die vom Nutzer übernommene, gate-geprüfte Variante an den Parent (→ Splice + Persist). */
  onUebernehmen: (variante: string) => Promise<void> | void;
  onAbbrechen: () => void;
}

const GRUND_TEXT: Record<string, string> = {
  neue_angaben:
    "Die Umformulierung hätte Angaben ergänzt, die nicht in Ihrem Absatz stehen — zur Sicherheit verworfen.",
  marker_verloren: "Der Absatz enthält eine ungeprüfte Annahme — bitte diese zuerst oben klären.",
  unveraendert: "Die Formulierung ließ sich hier nicht sinnvoll verändern.",
  leer: "Es kam keine verwertbare Fassung zurück. Bitte erneut versuchen.",
  zu_kurz: "Dieser Absatz ist zu kurz zum Umformulieren.",
  zu_lang: "Dieser Absatz ist zu lang zum Umformulieren.",
};

/**
 * P4-A Teil 1 — On-Demand-Umformulierung EINES Absatzes. Zustandslose Generierung
 * über /api/wizard/reformulieren (gate-geprüft), Vorher/Nachher-Vorschau, dann
 * Übernehmen (Parent splict + persistiert) oder Verwerfen. Der Absatz-Text selbst
 * bleibt unverändert, bis der Nutzer aktiv übernimmt.
 */
export function AbsatzReformulierer({ sessionToken, passage, onUebernehmen, onAbbrechen }: Props) {
  const [busy, setBusy] = useState<ReformulierDirektive | null>(null);
  const [applying, setApplying] = useState(false);
  const [variante, setVariante] = useState<string | null>(null);
  const [gewaehlt, setGewaehlt] = useState<ReformulierDirektive | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);

  const anfordern = async (direktive: ReformulierDirektive) => {
    setBusy(direktive);
    setHinweis(null);
    setVariante(null);
    try {
      const res = await fetch("/api/wizard/reformulieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, passage, direktive }),
      });
      if (res.status === 429) {
        setHinweis("Zu viele Umformulierungen in kurzer Zeit — bitte einen Moment warten.");
        return;
      }
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        variante?: string;
        grund?: string;
        error?: string;
      };
      if (!res.ok) {
        setHinweis(j.error || `Fehler ${res.status}`);
        return;
      }
      if (j.ok && typeof j.variante === "string") {
        setVariante(j.variante);
        setGewaehlt(direktive);
      } else {
        setHinweis(GRUND_TEXT[j.grund ?? ""] ?? "Konnte nicht sicher umformuliert werden.");
      }
    } catch {
      setHinweis("Umformulierung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(null);
    }
  };

  const uebernehmen = async () => {
    if (!variante) return;
    setApplying(true);
    setHinweis(null);
    try {
      await onUebernehmen(variante);
      // Parent schließt das Panel (setReformState(null)).
    } catch {
      setHinweis("Speichern fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-[#1e3d32]/40 bg-[#1e3d32]/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1c1917]">
          <RefreshCw className="h-4 w-4 text-[#1e3d32]" />
          Absatz umformulieren
        </div>
        <button
          type="button"
          onClick={onAbbrechen}
          disabled={applying}
          aria-label="Schließen"
          className="text-slate-400 hover:text-[#57534e] disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!variante && (
        <>
          <p className="mb-2 rounded border border-[#1c1917]/10 bg-white p-2.5 text-xs italic text-slate-600">
            „{passage.trim()}"
          </p>
          <p className="mb-2 text-xs text-slate-600">
            Wie soll dieser Absatz klingen? Die Fakten bleiben unverändert — nur Stil und Länge ändern sich.
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(REFORMULIER_DIREKTIVEN) as ReformulierDirektive[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => anfordern(d)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1 rounded border border-[#1e3d32]/40 bg-white px-2.5 py-1 text-xs font-medium text-[#1e3d32] hover:bg-[#1e3d32]/10 disabled:opacity-40"
              >
                {busy === d ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {REFORMULIER_DIREKTIVEN[d].label}
              </button>
            ))}
          </div>
        </>
      )}

      {variante && (
        <div className="space-y-2 text-xs">
          <div>
            <div className="mb-1 font-medium text-slate-500">Vorher</div>
            <p className="rounded border border-[#1c1917]/10 bg-white/60 p-2.5 text-slate-500 line-through decoration-slate-300">
              {passage.trim()}
            </p>
          </div>
          <div>
            <div className="mb-1 font-medium text-[#1e3d32]">
              Nachher{gewaehlt ? ` · ${REFORMULIER_DIREKTIVEN[gewaehlt].label.toLowerCase()}` : ""}
            </div>
            <p className="rounded border border-[#1e3d32]/30 bg-white p-2.5 text-[#57534e]">{variante}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={uebernehmen}
              disabled={applying}
              className="inline-flex items-center gap-1 rounded bg-[#1e3d32] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#14291f] disabled:opacity-40"
            >
              {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Übernehmen
            </button>
            <button
              type="button"
              onClick={() => {
                setVariante(null);
                setGewaehlt(null);
              }}
              disabled={applying}
              className="inline-flex items-center gap-1 rounded border border-[#1c1917]/15 px-3 py-1.5 text-xs text-[#57534e] hover:bg-slate-100 disabled:opacity-40"
            >
              Andere Fassung
            </button>
          </div>
        </div>
      )}

      {hinweis && (
        <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {hinweis}
        </p>
      )}
    </div>
  );
}
