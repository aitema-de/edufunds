"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type {
  ReadinessIssue,
  ReadinessReport,
  ReadinessStatus,
} from "@/lib/wizard/facts-readiness";

interface Props {
  report: ReadinessReport;
}

function statusMeta(status: ReadinessStatus): {
  boxClass: string;
  iconClass: string;
  icon: typeof AlertTriangle;
  title: string;
  subtitle: string;
} {
  if (status === "kritisch") {
    return {
      boxClass: "border-red-500/40 bg-red-500/10",
      iconClass: "text-red-300",
      icon: AlertTriangle,
      title: "Datenbasis unvollständig",
      subtitle: "Diese Kernfelder fehlen — ohne sie bleibt der Antrag generisch.",
    };
  }
  if (status === "hinweise") {
    return {
      boxClass: "border-amber-500/40 bg-amber-500/10",
      iconClass: "text-amber-300",
      icon: Info,
      title: "Datenbasis reicht, könnte aber stärker sein",
      subtitle: "Diese Felder würden den Antrag deutlich schärfer machen.",
    };
  }
  return {
    boxClass: "border-green-500/40 bg-green-500/10",
    iconClass: "text-green-300",
    icon: CheckCircle2,
    title: "Datenbasis ist solide",
    subtitle: "Alle Kernfelder sind befüllt.",
  };
}

function schwereBadge(schwere: ReadinessIssue["schwere"]): string {
  if (schwere === "hoch") return "border-red-500/40 text-red-300";
  if (schwere === "mittel") return "border-amber-500/40 text-amber-300";
  return "border-[#1c1917]/20 text-slate-700";
}

export function ReadinessAmpel({ report }: Props) {
  const meta = statusMeta(report.status);
  const Icon = meta.icon;

  return (
    <div className={`rounded-lg border p-4 ${meta.boxClass}`}>
      <div className="mb-2 flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.iconClass}`} />
        <div>
          <div className="text-sm font-semibold text-[#1c1917]">{meta.title}</div>
          <div className="text-xs text-slate-700/80">{meta.subtitle}</div>
        </div>
      </div>
      {report.issues.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {report.issues.map((i) => (
            <li
              key={i.feld}
              className="flex flex-wrap items-start gap-2 rounded border border-[#1c1917]/10 bg-white/80 px-2.5 py-1.5 text-xs"
            >
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[10px] uppercase ${schwereBadge(
                  i.schwere
                )}`}
              >
                {i.schwere}
              </span>
              <div className="flex-1">
                <div className="font-medium text-[#57534e]">{i.label}</div>
                {i.hinweis && <div className="text-slate-600">{i.hinweis}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
