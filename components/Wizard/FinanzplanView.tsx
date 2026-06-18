"use client";

import type { Finanzplan, Finanzposten } from "@/lib/wizard/types";
import { Sparkles, Wallet } from "lucide-react";

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
    <div className="rounded-xl border border-[#78350f]/30 bg-[#fdfdfc] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-[#78350f]" />
        <h3 className="text-lg font-semibold text-[#1c1917]">Finanzplan-Entwurf</h3>
      </div>

      {plan.posten.length === 0 ? (
        plan.unbeziffert && plan.kostenrahmen?.length ? (
          <div>
            <p className="text-sm text-slate-600">
              Es liegen noch keine Kostenangaben vor — der Finanzplan ist daher noch{" "}
              <strong>unbeziffert</strong>. Die folgenden Positionen werden vor Einreichung
              durch konkrete Angebote beziffert:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#57534e]">
              {plan.kostenrahmen.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Kein Finanzplan erzeugt — ggf. fehlten Richtlinien-Daten.
          </p>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1c1917]/15 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-2 pr-4">Posten</th>
                <th className="pb-2 pr-4">Kategorie</th>
                <th className="pb-2 pr-4">Typ</th>
                <th className="pb-2 text-right">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {[...byKategorie.entries()].flatMap(([kat, posten]) =>
                posten.map((p) => (
                  <tr key={p.id} className="border-b border-[#1c1917]/10 align-top">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-1.5 text-[#57534e]">
                          {p.bezeichnung}
                          {p.istVorschlag && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#78350f]/50 bg-[#78350f]/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#92400e]">
                              <Sparkles className="h-2.5 w-2.5" /> Vorschlag
                            </span>
                          )}
                        </div>
                        {p.begruendung && (
                          <div className="text-xs text-slate-500">{p.begruendung}</div>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">{KATEGORIE_LABEL[kat]}</td>
                      <td className="py-2 pr-4">
                        {p.eigenanteil ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                            Eigenanteil
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400">Förderung</span>
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums text-[#57534e]">
                        {formatEur(p.betragEur)}
                      </td>
                    </tr>
                ))
              )}
              <tr className="border-t-2 border-[#1c1917]/15">
                <td colSpan={2} className="pt-3 text-slate-600">Gesamtvolumen</td>
                <td className="pt-3 text-xs text-slate-500">
                  davon Förderung: {formatEur(foerderung)}
                  {eigen > 0 && " · Eigenanteil: " + formatEur(eigen)}
                </td>
                <td className="pt-3 text-right font-semibold tabular-nums text-[#1c1917]">
                  {formatEur(gesamt)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {plan.hinweise && plan.hinweise.length > 0 && (
        <div className="mt-4 rounded-lg border border-[#78350f]/30 bg-[#78350f]/5 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#78350f]">
            Hinweise der KI
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
            {plan.hinweise.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.posten.some((p) => p.istVorschlag) && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#92400e]">
          <Sparkles className="h-3 w-3" />
          <span>„Vorschlag" = vom Assistenten geschätzter Betrag — vor Einreichung bestätigen oder anpassen.</span>
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
