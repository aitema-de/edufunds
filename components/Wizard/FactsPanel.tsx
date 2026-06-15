"use client";

import { Building2, Target, TrendingUp, Wallet, Link2 } from "lucide-react";
import type { WizardFacts } from "@/lib/wizard/types";

interface Props {
  facts: WizardFacts;
  compact?: boolean;
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

function humanizeKey(k: string): string {
  // Jedes Wort gross schreiben (nicht nur das erste), sonst entsteht
  // "Erwartete ergebnisse" / "Messbare indikatoren".
  return k
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function FactsPanel({ facts, compact }: Props) {
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
              {entries.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-slate-500">{humanizeKey(k)}</dt>
                  <dd className="text-slate-700">{formatValue(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
