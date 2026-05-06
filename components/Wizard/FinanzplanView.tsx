"use client";

import type { Finanzplan, Finanzposten } from "@/lib/wizard/types";
import { Wallet } from "lucide-react";

interface Props {
  plan: Finanzplan;
}

const KATEGORIE_LABEL: Record<Finanzposten["kategorie"], string> = {
  personal: "Personalkosten",
  sachkosten: "Sachkosten",
  investitionen: "Investitionen",
  honorare: "Honorare",
  reisekosten: "Reisekosten",
  overhead: "Overhead / Verwaltung",
  sonstiges: "Sonstiges",
};

function formatEur(cents: number): string {
  return cents.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function FinanzplanView({ plan }: Props) {
  const gesamt = plan.posten.reduce((s, p) => s + p.betragEur, 0);
  const foerderung = plan.posten.filter((p) => !p.eigenanteil).reduce((s, p) => s + p.betragEur, 0);
  const eigen = plan.posten.filter((p) => p.eigenanteil).reduce((s, p) => s + p.betragEur, 0);

  const byKategorie = new Map<Finanzposten["kategorie"], Finanzposten[]>();
  for (const p of plan.posten) {
    const arr = byKategorie.get(p.kategorie) ?? [];
    arr.push(p);
    byKategorie.set(p.kategorie, arr);
  }

  return (
    <div className="rounded-xl border border-[#c9a227]/30 bg-slate-900/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-[#c9a227]" />
        <h3 className="text-lg font-semibold text-slate-100">Finanzplan-Entwurf</h3>
      </div>

      {plan.posten.length === 0 ? (
        <p className="text-sm text-slate-400">
          Kein Finanzplan erzeugt — ggf. fehlten Richtlinien-Daten.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-2 pr-4">Posten</th>
                <th className="pb-2 pr-4">Kategorie</th>
                <th className="pb-2 pr-4">Typ</th>
                <th className="pb-2 text-right">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {[...byKategorie.entries()].flatMap(([kat, posten]) =>
                posten.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800 align-top">
                      <td className="py-2 pr-4">
                        <div className="text-slate-200">{p.bezeichnung}</div>
                        {p.begruendung && (
                          <div className="text-xs text-slate-500">{p.begruendung}</div>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-slate-400">{KATEGORIE_LABEL[kat]}</td>
                      <td className="py-2 pr-4">
                        {p.eigenanteil ? (
                          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
                            Eigenanteil
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400">Förderung</span>
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-200">
                        {formatEur(p.betragEur)}
                      </td>
                    </tr>
                ))
              )}
              <tr className="border-t-2 border-slate-600">
                <td colSpan={2} className="pt-3 text-slate-400">Gesamtvolumen</td>
                <td className="pt-3 text-xs text-slate-500">
                  davon Förderung: {formatEur(foerderung)}
                  {eigen > 0 && " · Eigenanteil: " + formatEur(eigen)}
                </td>
                <td className="pt-3 text-right font-semibold tabular-nums text-slate-100">
                  {formatEur(gesamt)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {plan.hinweise && plan.hinweise.length > 0 && (
        <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange-300">
            Hinweise der KI
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
            {plan.hinweise.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 text-[11px] text-slate-500">
        Entwurf vom {new Date(plan.generiertAm).toLocaleString("de-DE")}.
        {plan.legitimiertAm && (
          <> Freigegeben am {new Date(plan.legitimiertAm).toLocaleString("de-DE")}.</>
        )}
      </div>
    </div>
  );
}
