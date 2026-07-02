import { Fragment } from "react";
import { MARKER_SPLIT_RE } from "@/lib/wizard/annahme-marker";

/**
 * Hebt `[Annahme: …]`- und `[TODO: …]`-Marker im gerenderten Antragstext sichtbar
 * hervor (Produktentscheidung 02.07.2026, ClickUp 86caht7eq: KI-Annahmen eindeutig
 * kennzeichnen, damit der Nutzer sie bestaetigen oder verwerfen kann).
 *
 * Wird in den ReactMarkdown-Komponenten (p/li) auf die children angewandt:
 * String-Kinder werden am Marker-Muster gesplittet, Marker als <mark> gerendert,
 * verschachtelte Elemente (strong/em/…) bleiben unangetastet.
 */
export function highlightMarkers(
  children: React.ReactNode,
  variant: "screen" | "print" = "screen"
): React.ReactNode {
  if (typeof children === "string") return splitString(children, variant);
  if (Array.isArray(children)) {
    return children.map((c, i) => <Fragment key={i}>{highlightMarkers(c, variant)}</Fragment>);
  }
  return children;
}

const SCREEN_STYLES: Record<"annahme" | "todo", string> = {
  annahme:
    "rounded bg-amber-100 px-1 py-0.5 text-amber-900 ring-1 ring-amber-300",
  todo: "rounded bg-slate-100 px-1 py-0.5 text-slate-700 ring-1 ring-slate-300",
};

const PRINT_STYLES: Record<"annahme" | "todo", React.CSSProperties> = {
  annahme: { backgroundColor: "#fef3c7", color: "#78350f", padding: "0 2pt" },
  todo: { backgroundColor: "#f1f5f9", color: "#334155", padding: "0 2pt" },
};

const TITLES: Record<"annahme" | "todo", string> = {
  annahme:
    "KI-Annahme — nicht aus Ihren Angaben. Bitte unten bestätigen, anpassen oder streichen.",
  todo: "Lücke — diese Angabe vor der Einreichung ergänzen.",
};

function splitString(s: string, variant: "screen" | "print"): React.ReactNode {
  const parts = s.split(MARKER_SPLIT_RE);
  if (parts.length === 1) return s;
  return parts.map((part, i) => {
    const kind = part.startsWith("[Annahme:")
      ? ("annahme" as const)
      : part.startsWith("[TODO:")
        ? ("todo" as const)
        : null;
    if (!kind) return <Fragment key={i}>{part}</Fragment>;
    return variant === "screen" ? (
      <mark key={i} className={SCREEN_STYLES[kind]} title={TITLES[kind]}>
        {part}
      </mark>
    ) : (
      <mark key={i} style={PRINT_STYLES[kind]}>
        {part}
      </mark>
    );
  });
}
