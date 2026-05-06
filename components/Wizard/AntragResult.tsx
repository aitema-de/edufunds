"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Check, Copy, Download, FileDown, Loader2, PenLine, RefreshCw } from "lucide-react";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { Finanzplan, GenerationArtefacts } from "@/lib/wizard/types";
import { formatEur, type CostLedger } from "@/lib/wizard/pricing";
import { FinanzplanView } from "./FinanzplanView";
import { FinanzplanEditor } from "./FinanzplanEditor";
import { renderFinanzplanMarkdown } from "@/lib/wizard/finanzplan-markdown";
import { PaywallGate } from "./PaywallGate";
import { AntragSectionNav, slugifyHeading } from "./AntragSectionNav";

interface Props {
  programm: Foerderprogramm;
  generation: GenerationArtefacts;
  costs?: CostLedger | null;
  sessionToken?: string;
  /** Wenn gesetzt, ist der Antrag bereits bezahlt — Paywall wird nicht angezeigt. */
  paidToken?: string | null;
  onRestart?: () => void;
  onFinanzplanChange?: (plan: Finanzplan) => void;
}

/**
 * Baut MARKDOWN_COMPONENTS als Closure ueber paid + programmId.
 * h2 bekommt Anker-ID (slug) + scroll-mt-24 + on-hover PenLine-Edit-Button (nur paid=true).
 * Duplikat-h2-Texte erhalten -2/-3-Suffix (Pitfall-5-Pattern).
 */
function buildMarkdownComponents(paid: boolean, programmId: string) {
  const usedIds = new Map<string, number>();
  return {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="mb-6 text-2xl font-semibold text-slate-100">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => {
      const text =
        typeof children === "string"
          ? children
          : Array.isArray(children)
            ? children.filter((c) => typeof c === "string").join("")
            : String(children ?? "");
      const baseSlug = slugifyHeading(text) || "section";
      const count = (usedIds.get(baseSlug) ?? 0) + 1;
      usedIds.set(baseSlug, count);
      const id = count === 1 ? baseSlug : `${baseSlug}-${count}`;
      return (
        <h2
          id={id}
          className="group mb-3 mt-8 flex items-center gap-2 text-lg font-semibold text-[#c9a227] scroll-mt-24"
        >
          <span>{children}</span>
          {paid && (
            <a
              href={`/antrag/${programmId}/wizard?editAnswer=true`}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-200 transition"
              title="Antwort zurueck und neu beantworten"
              aria-label="Sektion bearbeiten"
            >
              <PenLine className="h-3.5 w-3.5" />
            </a>
          )}
        </h2>
      );
    },
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="mb-2 mt-6 text-base font-semibold text-slate-100">{children}</h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-4 leading-relaxed text-slate-200">{children}</p>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-slate-100">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-slate-200">{children}</em>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="mb-4 ml-6 list-disc space-y-1 text-slate-200">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-1 text-slate-200">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed">{children}</li>
    ),
  };
}

const PRINT_MARKDOWN_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ fontSize: "22pt", fontWeight: 600, marginBottom: "18pt", color: "#111827" }}>
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ fontSize: "14pt", fontWeight: 600, marginTop: "18pt", marginBottom: "8pt", color: "#1f2937" }}>
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ fontSize: "12pt", fontWeight: 600, marginTop: "12pt", marginBottom: "6pt", color: "#1f2937" }}>
      {children}
    </h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ marginBottom: "10pt", lineHeight: 1.5 }}>{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ marginLeft: "18pt", marginBottom: "10pt" }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ marginLeft: "18pt", marginBottom: "10pt" }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ marginBottom: "4pt" }}>{children}</li>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: "12pt",
        fontSize: "10pt",
      }}
    >
      {children}
    </table>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead style={{ backgroundColor: "#f3f4f6" }}>{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th
      style={{
        border: "1px solid #d1d5db",
        padding: "4pt 6pt",
        textAlign: "left",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td style={{ border: "1px solid #e5e7eb", padding: "4pt 6pt", verticalAlign: "top" }}>
      {children}
    </td>
  ),
};

async function loadHtml2pdf() {
  const mod = await import("html2pdf.js");
  // html2pdf.js kann default- oder modul-exportieren, je nach Build
  return (mod as { default?: unknown }).default ?? mod;
}

export function AntragResult({
  programm,
  generation,
  costs,
  sessionToken,
  paidToken,
  onRestart,
  onFinanzplanChange,
}: Props) {
  const paid = !!paidToken;
  const markdownComponents = buildMarkdownComponents(paid, programm.id);
  const articleRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [showCritique, setShowCritique] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const text = generation.finalText ?? "";
  const finanzplanMarkdown = generation.finanzplan
    ? renderFinanzplanMarkdown(generation.finanzplan)
    : "";
  const combinedText = finanzplanMarkdown ? `${text}\n${finanzplanMarkdown}\n` : text;

  const copy = async () => {
    await navigator.clipboard.writeText(combinedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = (mime: string, ext: string) => {
    const blob = new Blob([combinedText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Foerderantrag_${programm.id}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!printRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      const html2pdf = (await loadHtml2pdf()) as {
        (): {
          set: (opt: unknown) => { from: (el: HTMLElement) => { save: () => Promise<void> } };
        };
      };
      const opt = {
        margin: [15, 15, 20, 15] as [number, number, number, number],
        filename: `Foerderantrag_${programm.id}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };
      await html2pdf().set(opt).from(printRef.current).save();
    } catch (e) {
      console.error("PDF-Export fehlgeschlagen:", e);
      alert("PDF konnte nicht erstellt werden. Bitte erneut versuchen.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-orange-500/40 bg-slate-800/40 p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">
            Antragsentwurf {paid ? "freigeschaltet" : "fertig"}
          </h2>
          <p className="text-sm text-slate-400">für {programm.name}</p>
        </div>
        <div className={paid ? "flex flex-wrap gap-2" : "hidden"}>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
          <button
            type="button"
            onClick={() => download("text/plain;charset=utf-8", "txt")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-4 w-4" /> .txt
          </button>
          <button
            type="button"
            onClick={() => download("application/msword", "doc")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-4 w-4" /> .doc
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={pdfBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-orange-500/60 bg-orange-500/10 px-3 py-2 sm:py-3 text-sm text-orange-200 transition hover:bg-orange-500/20 disabled:opacity-50"
          >
            {pdfBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            PDF
          </button>
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" /> Neu
            </button>
          )}
        </div>
      </header>
      {(generation.hasOpenHighFindings || generation.hasConsistencyIssues) && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 text-sm text-orange-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
          <div>
            <div className="font-semibold text-orange-100">Qualitätshinweise des KI-Prüfers</div>
            <ul className="mt-1 list-disc pl-5 text-xs text-orange-200/80 space-y-0.5">
              {generation.hasOpenHighFindings && (
                <li>Mindestens ein hoch-Finding des Gutachters ist nicht vollständig adressiert.</li>
              )}
              {generation.hasConsistencyIssues && (
                <li>Antragstext und Finanzplan haben Inkonsistenzen ({generation.consistencyIssues?.length ?? 0}).</li>
              )}
              <li>Details unten unter „KI-Gutachten" — vor Einreichung selbst prüfen.</li>
            </ul>
          </div>
        </div>
      )}
      <div className={paid ? "" : "relative"}>
        <div className="md:grid md:grid-cols-[1fr_180px] md:gap-8">
          <article
            ref={articleRef}
            className={
              "rounded-lg border border-slate-700 bg-slate-900 p-8 text-slate-200 antrag-prose " +
              (paid ? "" : "max-h-[420px] overflow-hidden blur-[3px] select-none")
            }
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {paid ? text : text.slice(0, 1800) + (text.length > 1800 ? "\n\n…" : "")}
            </ReactMarkdown>
          </article>
          <AntragSectionNav articleRef={articleRef} />
        </div>
        {generation.finanzplan && (
          <div className={"mt-6 " + (paid ? "" : "blur-[3px] select-none pointer-events-none")}>
            {sessionToken && !generation.finanzplan.legitimiertAm && paid ? (
              <FinanzplanEditor
                sessionToken={sessionToken}
                initialPlan={generation.finanzplan}
                onChange={onFinanzplanChange}
              />
            ) : (
              <FinanzplanView plan={generation.finanzplan} />
            )}
          </div>
        )}
        {!paid && sessionToken && (
          <PaywallGate sessionToken={sessionToken} priceEur={29} tierLabel="Einzelantrag" />
        )}
      </div>
      {costs && costs.calls > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2 text-xs text-slate-500">
          <span>
            KI-Kosten dieses Antrags (geschätzt): <strong className="text-slate-300">{formatEur(costs.eurCents)}</strong>
          </span>
          <span>
            {costs.calls} Calls · {costs.totalTokens.toLocaleString("de-DE")} Tokens
          </span>
        </div>
      )}
      {paid && generation.critique && (
        <details
          className="mt-6 rounded-lg border border-slate-700 bg-slate-900/60 p-4"
          open={showCritique}
          onToggle={(e) => setShowCritique((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-sm font-medium text-slate-300">
            KI-Gutachten zum ersten Entwurf (zur Transparenz)
          </summary>
          {generation.critiqueFindings && generation.critiqueFindings.length > 0 && generation.critiqueResolutions && (
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              {generation.critiqueFindings.map((f, i) => {
                const res = generation.critiqueResolutions?.find((r) => r.index === i + 1);
                const status = res?.status ?? "offen";
                const badge =
                  status === "geschlossen"
                    ? "border-green-500/40 text-green-300"
                    : status === "teilweise"
                      ? "border-yellow-500/40 text-yellow-300"
                      : "border-red-500/40 text-red-300";
                const schwereBadge =
                  f.schwere === "hoch"
                    ? "border-red-500/40 text-red-300"
                    : f.schwere === "mittel"
                      ? "border-orange-500/40 text-orange-300"
                      : "border-slate-500/40 text-slate-300";
                return (
                  <div key={i} className="rounded border border-slate-700/60 bg-slate-900/40 p-2.5">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${schwereBadge}`}>
                        {f.schwere}
                      </span>
                      <span className="rounded-full border border-slate-600/40 px-2 py-0.5 text-[10px] text-slate-400">
                        {f.kategorie} · {f.abschnitt}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${badge}`}>
                        {status}
                      </span>
                    </div>
                    <div className="mb-1 text-slate-200">„{f.zitat}"</div>
                    <div className="text-slate-400">→ {f.vorschlag}</div>
                    {res?.kommentar && (
                      <div className="mt-1 text-slate-500 italic">Re-Check: {res.kommentar}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!generation.critiqueResolutions && (
            <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-400">{generation.critique}</pre>
          )}
          {generation.consistencyIssues && generation.consistencyIssues.length > 0 && (
            <div className="mt-4 border-t border-slate-700/60 pt-3">
              <div className="mb-2 text-xs font-medium text-slate-300">
                Konsistenz-Check Antrag × Finanzplan
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                {generation.consistencyIssues.map((i, idx) => (
                  <div key={idx} className="rounded border border-slate-700/60 bg-slate-900/40 p-2.5">
                    <div className="mb-1">
                      <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-[10px] uppercase text-amber-300">
                        {i.art}
                      </span>
                    </div>
                    <div className="text-slate-200">{i.beschreibung}</div>
                    {i.posten && (
                      <div className="mt-0.5 text-slate-500">Posten: {i.posten}</div>
                    )}
                    {i.textstelle && (
                      <div className="mt-0.5 text-slate-500 italic">„{i.textstelle}"</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </details>
      )}

      {/* Unsichtbarer, druckoptimierter Klon für html2pdf — nur nach Zahlung rendern */}
      {paid && (
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "180mm",
          backgroundColor: "#ffffff",
          color: "#111827",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "11pt",
          padding: "12mm 0",
        }}
      >
        <div ref={printRef} style={{ padding: "0 12mm" }}>
          <div
            style={{
              borderBottom: "1px solid #d1d5db",
              marginBottom: "12pt",
              paddingBottom: "6pt",
              fontSize: "9pt",
              color: "#6b7280",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{programm.name}</span>
            <span>
              Erstellt am {new Date().toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          </div>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={PRINT_MARKDOWN_COMPONENTS}
          >
            {combinedText}
          </ReactMarkdown>
        </div>
      </div>
      )}
    </div>
  );
}
