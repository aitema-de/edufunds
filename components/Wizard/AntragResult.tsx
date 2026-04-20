"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, FileDown, Loader2, RefreshCw } from "lucide-react";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { GenerationArtefacts } from "@/lib/wizard/types";

interface Props {
  programm: Foerderprogramm;
  generation: GenerationArtefacts;
  onRestart: () => void;
}

const MARKDOWN_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-6 text-2xl font-semibold text-slate-100">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-3 mt-8 text-lg font-semibold text-[#c9a227]">{children}</h2>
  ),
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
};

async function loadHtml2pdf() {
  const mod = await import("html2pdf.js");
  // html2pdf.js kann default- oder modul-exportieren, je nach Build
  return (mod as { default?: unknown }).default ?? mod;
}

export function AntragResult({ programm, generation, onRestart }: Props) {
  const [copied, setCopied] = useState(false);
  const [showCritique, setShowCritique] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const text = generation.finalText ?? "";

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = (mime: string, ext: string) => {
    const blob = new Blob([text], { type: mime });
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
          <h2 className="text-2xl font-semibold text-slate-100">Antragsentwurf fertig</h2>
          <p className="text-sm text-slate-400">für {programm.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            className="inline-flex items-center gap-2 rounded-lg border border-orange-500/60 bg-orange-500/10 px-3 py-2 text-sm text-orange-200 transition hover:bg-orange-500/20 disabled:opacity-50"
          >
            {pdfBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            PDF
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" /> Neu
          </button>
        </div>
      </header>
      <article className="rounded-lg border border-slate-700 bg-slate-900 p-8 text-slate-200 antrag-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
          {text}
        </ReactMarkdown>
      </article>
      {generation.critique && (
        <details
          className="mt-6 rounded-lg border border-slate-700 bg-slate-900/60 p-4"
          open={showCritique}
          onToggle={(e) => setShowCritique((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-sm font-medium text-slate-300">
            KI-Gutachten zum ersten Entwurf (zur Transparenz)
          </summary>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-400">{generation.critique}</pre>
        </details>
      )}

      {/* Unsichtbarer, druckoptimierter Klon für html2pdf */}
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
            {text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
