"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Download, Info, Loader2, Plus, Sparkles, Trash2, ShieldCheck, Wand2, X } from "lucide-react";
import type { Finanzplan, Finanzposten } from "@/lib/wizard/types";

type ValidationResult = {
  warnungen: Array<{ level: "error" | "warning" | "info"; message: string; kategorie?: Finanzposten["kategorie"]; postenId?: string }>;
  gesamtEur: number;
  foerderEur: number;
  eigenanteilEur: number;
  eigenanteilProzent: number;
  foerderungProzent: number;
  okFuerFreigabe: boolean;
};

type AutofixMeta = { id: string; label: string; description: string };

const KATEGORIE_OPTIONS: Array<{ value: Finanzposten["kategorie"]; label: string }> = [
  { value: "personal", label: "Personalkosten" },
  { value: "sachkosten", label: "Sachkosten" },
  { value: "investitionen", label: "Investitionen" },
  { value: "honorare", label: "Honorare" },
  { value: "reisekosten", label: "Reisekosten" },
  { value: "overhead", label: "Overhead" },
  { value: "sonstiges", label: "Sonstiges" },
];

function formatEur(n: number): string {
  return n.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

interface Props {
  sessionToken: string;
  initialPlan: Finanzplan;
  onChange?: (plan: Finanzplan) => void;
}

export function FinanzplanEditor({ sessionToken, initialPlan, onChange }: Props) {
  const [posten, setPosten] = useState<Finanzposten[]>(initialPlan.posten);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [autofixes, setAutofixes] = useState<AutofixMeta[]>([]);
  const [autofixBusy, setAutofixBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legitimized, setLegitimized] = useState<boolean>(!!initialPlan.legitimiertAm);

  const gesamt = useMemo(() => posten.reduce((s, p) => s + p.betragEur, 0), [posten]);
  const eigen = useMemo(() => posten.filter((p) => p.eigenanteil).reduce((s, p) => s + p.betragEur, 0), [posten]);
  const foerder = gesamt - eigen;

  const addPosten = () => {
    setPosten((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        kategorie: "sachkosten",
        bezeichnung: "",
        betragEur: 0,
        begruendung: "",
        eigenanteil: false,
      },
    ]);
    setDirty(true);
  };

  const removePosten = (id: string) => {
    setPosten((prev) => prev.filter((p) => p.id !== id));
    setDirty(true);
  };

  const updatePosten = (id: string, patch: Partial<Finanzposten>) => {
    // Sobald der Nutzer einen Posten bearbeitet, übernimmt er ihn → kein Vorschlag mehr.
    setPosten((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch, istVorschlag: false } : p)));
    setDirty(true);
  };

  /** Vorschlag ohne inhaltliche Änderung bestätigen (istVorschlag → belegt). */
  const confirmVorschlag = (id: string) => updatePosten(id, {});

  const vorschlagCount = useMemo(() => posten.filter((p) => p.istVorschlag).length, [posten]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wizard/finanzplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, posten }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      setValidation(body.validation ?? null);
      setAutofixes(Array.isArray(body.autofixes) ? body.autofixes : []);
      setDirty(false);
      if (body.finanzplan) {
        setPosten(body.finanzplan.posten);
        onChange?.(body.finanzplan);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const applyAutofix = async (actionId: string) => {
    if (dirty) {
      await save();
    }
    setAutofixBusy(actionId);
    setError(null);
    try {
      const res = await fetch("/api/wizard/finanzplan/autofix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, actionId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      setValidation(body.validation ?? null);
      setAutofixes(Array.isArray(body.autofixes) ? body.autofixes : []);
      if (body.finanzplan) {
        setPosten(body.finanzplan.posten);
        onChange?.(body.finanzplan);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auto-Fix fehlgeschlagen");
    } finally {
      setAutofixBusy(null);
    }
  };

  const legitimize = async () => {
    if (dirty) {
      await save();
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wizard/finanzplan/legitimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      if (body.finanzplan) {
        setPosten(body.finanzplan.posten);
        setLegitimized(true);
        onChange?.(body.finanzplan);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Freigabe fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const rows: string[] = [];
    rows.push(["Kategorie", "Bezeichnung", "Typ", "Betrag_EUR", "Begruendung"].join(";"));
    for (const p of posten) {
      rows.push(
        [
          p.kategorie,
          `"${p.bezeichnung.replace(/"/g, '""')}"`,
          p.eigenanteil ? "Eigenanteil" : "Foerderung",
          String(p.betragEur),
          `"${(p.begruendung ?? "").replace(/"/g, '""')}"`,
        ].join(";")
      );
    }
    const csv = rows.join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Finanzplan_${sessionToken.slice(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Beim Mount einmal validieren lassen, um bestehende Warnungen anzuzeigen.
    // (Wir koennten auch die initialPlan.hinweise nehmen — Serverpflege ist verlaesslicher.)
    if (initialPlan.posten.length > 0) {
      save();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl border border-[#c9a227]/30 bg-[#f8f5f0] p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[#0a1628]">
          {legitimized ? "Finanzplan (freigegeben)" : "Finanzplan bearbeiten"}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-[#0a1628]/15 px-3 py-1.5 text-xs text-[#1e3a61] hover:bg-slate-100"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!legitimized && vorschlagCount > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#c9a227]/40 bg-[#c9a227]/10 p-3 text-xs text-[#0a1628]">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a227]" />
          <div>
            <span className="font-semibold">{vorschlagCount} {vorschlagCount === 1 ? "Betrag ist ein Vorschlag" : "Beträge sind Vorschläge"} des Assistenten.</span>{" "}
            Diese Beträge hat der Assistent auf Basis üblicher Kosten geschätzt — prüfe sie, passe sie an eure echten Angebote an oder bestätige sie mit „✓".
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0a1628]/15 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="pb-2 pr-3">Bezeichnung</th>
              <th className="pb-2 pr-3">Kategorie</th>
              <th className="pb-2 pr-3">Typ</th>
              <th className="pb-2 pr-3 text-right">Betrag (EUR)</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {posten.map((p) => (
              <tr key={p.id} className="border-b border-[#0a1628]/10 align-top">
                <td className="py-2 pr-3">
                  {p.istVorschlag && (
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-[#c9a227]/50 bg-[#c9a227]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#b8921e]">
                      <Sparkles className="h-3 w-3" /> Vorschlag
                    </span>
                  )}
                  <input
                    type="text"
                    value={p.bezeichnung}
                    disabled={legitimized}
                    onChange={(e) => updatePosten(p.id, { bezeichnung: e.target.value })}
                    placeholder="z. B. 15 Tablets für Klassensatz"
                    className="w-full rounded border border-[#0a1628]/15 bg-white p-1.5 text-[#0a1628] placeholder-slate-400 disabled:opacity-60"
                  />
                  <input
                    type="text"
                    value={p.begruendung ?? ""}
                    disabled={legitimized}
                    onChange={(e) => updatePosten(p.id, { begruendung: e.target.value })}
                    placeholder="Kurzbegründung (optional)"
                    className="mt-1 w-full rounded border border-[#0a1628]/15 bg-white p-1 text-xs text-slate-600 placeholder-slate-600 disabled:opacity-60"
                  />
                </td>
                <td className="py-2 pr-3">
                  <select
                    value={p.kategorie}
                    disabled={legitimized}
                    onChange={(e) => updatePosten(p.id, { kategorie: e.target.value as Finanzposten["kategorie"] })}
                    className="rounded border border-[#0a1628]/15 bg-white p-1.5 text-[#0a1628] disabled:opacity-60"
                  >
                    {KATEGORIE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!p.eigenanteil}
                      disabled={legitimized}
                      onChange={(e) => updatePosten(p.id, { eigenanteil: e.target.checked })}
                    />
                    Eigenanteil
                  </label>
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={p.betragEur}
                    disabled={legitimized}
                    onChange={(e) => updatePosten(p.id, { betragEur: Number(e.target.value) || 0 })}
                    className="w-32 rounded border border-[#0a1628]/15 bg-white p-1.5 text-right tabular-nums text-[#0a1628] disabled:opacity-60"
                  />
                </td>
                <td className="py-2">
                  {!legitimized && (
                    <div className="flex items-center gap-1">
                      {p.istVorschlag && (
                        <button
                          type="button"
                          onClick={() => confirmVorschlag(p.id)}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-500/15"
                          title="Vorschlag bestätigen (Betrag übernehmen)"
                          aria-label="Vorschlag bestätigen"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removePosten(p.id)}
                        className="rounded p-1 text-slate-500 hover:bg-red-500/20 hover:text-red-400"
                        title="Posten entfernen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-[#0a1628]/15">
              <td colSpan={2} className="pt-3 font-medium text-slate-700">Gesamtvolumen</td>
              <td className="pt-3 text-xs text-slate-500">
                Förderung {formatEur(foerder)}
                {eigen > 0 && " · Eigenanteil " + formatEur(eigen)}
              </td>
              <td className="pt-3 text-right font-semibold tabular-nums text-[#0a1628]">
                {formatEur(gesamt)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {!legitimized && (
        <div className="mt-3">
          <button
            type="button"
            onClick={addPosten}
            className="inline-flex items-center gap-1.5 rounded border border-[#0a1628]/15 px-3 py-1.5 text-xs text-slate-700 hover:bg-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Posten hinzufügen
          </button>
        </div>
      )}

      {validation && validation.warnungen.length > 0 && (
        <div className="mt-4 space-y-2">
          {validation.warnungen.map((w, i) => {
            const Icon = w.level === "error" ? X : w.level === "warning" ? AlertCircle : Info;
            const bg =
              w.level === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : w.level === "warning"
                  ? "border-[#c9a227]/30 bg-[#c9a227]/10 text-[#c9a227]"
                  : "border-[#0a1628]/15 bg-white text-slate-700";
            return (
              <div key={i} className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${bg}`}>
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {!legitimized && autofixes.length > 0 && (
        <div className="mt-4 rounded-lg border border-[#c9a227]/40 bg-[#c9a227]/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#c9a227]">
            <Wand2 className="h-3.5 w-3.5" />
            Auto-Fix-Vorschlaege
          </div>
          <ul className="space-y-2">
            {autofixes.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 rounded-md border border-[#0a1628]/15 bg-[#f8f5f0] p-2 sm:flex-row sm:items-start sm:gap-3">
                <div className="flex-1 text-xs text-slate-700">
                  <div className="font-medium text-[#0a1628]">{a.label}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{a.description}</div>
                </div>
                <button
                  type="button"
                  disabled={autofixBusy !== null || busy}
                  onClick={() => applyAutofix(a.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 self-start rounded border border-[#c9a227]/60 bg-[#c9a227]/10 px-3 py-1.5 text-xs font-medium text-[#f5d36a] transition hover:bg-[#c9a227]/20 disabled:opacity-50"
                >
                  {autofixBusy === a.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  Anwenden
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!legitimized && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={save}
            className="rounded-lg border border-[#0a1628]/15 px-4 py-2 text-sm text-[#1e3a61] transition hover:bg-slate-100 disabled:opacity-50"
          >
            {busy && dirty ? "Speichere…" : dirty ? "Änderungen speichern" : "Gespeichert"}
          </button>
          <button
            type="button"
            disabled={busy || (validation !== null && !validation.okFuerFreigabe)}
            onClick={legitimize}
            title={
              validation && !validation.okFuerFreigabe
                ? "Fehler-Warnungen zuerst beheben"
                : "Plan endgültig freigeben"
            }
            className="inline-flex items-center gap-2 rounded-lg bg-[#c9a227] px-5 py-2 font-semibold text-white transition hover:bg-[#b8921e] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Finanzplan freigeben
          </button>
        </div>
      )}

      {legitimized && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <Check className="h-4 w-4" />
          Finanzplan freigegeben — Teil des Antrags-Artefakts.
        </div>
      )}
    </div>
  );
}
