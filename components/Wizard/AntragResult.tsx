"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Check, Coins, Copy, Download, FileDown, Loader2, PenLine, RefreshCw, Sparkles } from "lucide-react";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import {
  buildBeantragungsEmpfehlung,
  type Foerderhoehe,
} from "@/lib/foerderhoehe-empfehlung";
import type { Finanzplan, GenerationArtefacts } from "@/lib/wizard/types";
import { type CostLedger } from "@/lib/wizard/pricing";
import { FinanzplanView } from "./FinanzplanView";
import { FinanzplanEditor } from "./FinanzplanEditor";
import { TextVorschlaegeEditor, provenanz } from "./TextVorschlaegeEditor";
import { AbsatzReformulierer } from "./AbsatzReformulierer";
import { MIN_PASSAGE_LEN as REFORM_MIN_PASSAGE_LEN } from "@/lib/reformulierung";
import { highlightMarkers } from "./MarkerHighlight";
import { dokumentLabels, type DokumentLabels } from "@/lib/wizard/dokument-label";
import { renderFinanzplanMarkdown } from "@/lib/wizard/finanzplan-markdown";
import { PaywallGate } from "./PaywallGate";
import { AntragSectionNav, slugifyHeading } from "./AntragSectionNav";
import { KiHinweis, KI_EXPORT_HINWEIS } from "@/components/KiHinweis";
import { markdownToRtf } from "@/lib/export/rtf";
import { EinreichungInfo } from "./EinreichungInfo";
import type { EinreichungInfo as EinreichungInfoData } from "@/lib/wizard/einreichung";

/** Anzeige-Labels fuer Critique-Kategorien (Enum-Slugs -> Klartext mit Umlaut). */
const CRITIQUE_KATEGORIE_LABELS: Record<string, string> = {
  floskel: "Floskel",
  redundanz: "Redundanz",
  belegluecke: "Beleglücke",
  richtlinie: "Richtlinie",
  inkonsistenz: "Inkonsistenz",
  sonstiges: "Sonstiges",
};

/** Anzeige-Labels fuer Konsistenz-Check-Arten (Enum-Slugs -> Klartext). */
const CONSISTENCY_ART_LABELS: Record<string, string> = {
  "posten-ohne-textbezug": "Posten ohne Textbezug",
  "textbezug-ohne-posten": "Textbezug ohne Posten",
  "betrag-unstimmig": "Betrag unstimmig",
  sonstiges: "Sonstiges",
};

interface Props {
  programm: Foerderprogramm;
  generation: GenerationArtefacts;
  /** P4-B M-Erweiterung: strukturierte Förderhöhe aus dem Dossier (für die Beantragungshöhe-Empfehlung). */
  foerderhoehe?: Foerderhoehe | null;
  costs?: CostLedger | null;
  sessionToken?: string;
  /** Wenn gesetzt, ist der Antrag bereits bezahlt — Paywall wird nicht angezeigt. */
  paidToken?: string | null;
  einreichung?: EinreichungInfoData | null;
  /** 86cabdzwk: per-Programm-Dokumentlabel (Default "Antrag"/"Antragstext"). */
  labels?: DokumentLabels;
  onRestart?: () => void;
  onFinanzplanChange?: (plan: Finanzplan) => void;
}

/**
 * Baut MARKDOWN_COMPONENTS als Closure ueber paid + programmId.
 * h2 bekommt Anker-ID (slug) + scroll-mt-24 + on-hover PenLine-Edit-Button (nur paid=true).
 * Duplikat-h2-Texte erhalten -2/-3-Suffix (Pitfall-5-Pattern).
 */
interface ReformHook {
  /** Quelltext, in den node.position-Offsets zeigen (= der an ReactMarkdown übergebene String). */
  source: string;
  onPick: (start: number, end: number, passage: string) => void;
}

/** node.position aus react-markdown (v10) — nur die für den Splice nötigen Offsets. */
type MdNode = { position?: { start?: { offset?: number }; end?: { offset?: number } } };

function buildMarkdownComponents(paid: boolean, programmId: string, reform?: ReformHook) {
  const usedIds = new Map<string, number>();
  return {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="mb-6 text-2xl font-semibold text-[#1c1917]">{children}</h1>
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
          className="group mb-3 mt-8 flex items-center gap-2 text-lg font-semibold text-[#1e3d32] scroll-mt-24"
        >
          <span>{children}</span>
          {paid && (
            <a
              href={`/antrag/${programmId}/wizard?editAnswer=true`}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-[#57534e] transition"
              title="Antwort zurück und neu beantworten"
              aria-label="Sektion bearbeiten"
            >
              <PenLine className="h-3.5 w-3.5" />
            </a>
          )}
        </h2>
      );
    },
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="mb-2 mt-6 text-base font-semibold text-[#1c1917]">{children}</h3>
    ),
    p: ({ children, node }: { children?: React.ReactNode; node?: MdNode }) => {
      const start = node?.position?.start?.offset;
      const end = node?.position?.end?.offset;
      const passage =
        reform && typeof start === "number" && typeof end === "number"
          ? reform.source.slice(start, end)
          : "";
      // Nur echte Prosa anbieten — keine ungeprüften [Annahme:]-Absätze (deren
      // Marker-Erhalt schützt die Ehrlichkeit; hier gar nicht erst anfassen).
      const eligible =
        !!reform &&
        typeof start === "number" &&
        typeof end === "number" &&
        passage.trim().length >= REFORM_MIN_PASSAGE_LEN &&
        !passage.includes("[Annahme:");
      return (
        <p className={"mb-4 leading-relaxed text-[#57534e]" + (eligible ? " group relative" : "")}>
          {highlightMarkers(children)}
          {eligible && (
            <button
              type="button"
              onClick={() => reform!.onPick(start!, end!, passage)}
              title="Diesen Absatz umformulieren"
              aria-label="Diesen Absatz umformulieren"
              // In den rechten Rand (article p-8 = 32px Gutter) gesetzt, damit das
              // Icon rechts am Absatz sitzt statt am Zeilenende — kein Text-Overlap.
              className="absolute -right-7 top-0.5 inline-flex items-center rounded p-0.5 text-slate-400 opacity-0 transition hover:bg-[#1e3d32]/10 hover:text-[#1e3d32] group-hover:opacity-100 focus:opacity-100 md:-right-8"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </p>
      );
    },
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-[#1c1917]">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-[#57534e]">{children}</em>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="mb-4 ml-6 list-disc space-y-1 text-[#57534e]">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-1 text-[#57534e]">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed">{highlightMarkers(children)}</li>
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
    <p style={{ marginBottom: "10pt", lineHeight: 1.5 }}>{highlightMarkers(children, "print")}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ marginLeft: "18pt", marginBottom: "10pt" }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ marginLeft: "18pt", marginBottom: "10pt" }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ marginBottom: "4pt" }}>{highlightMarkers(children, "print")}</li>
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
  foerderhoehe,
  costs,
  sessionToken,
  paidToken,
  einreichung,
  labels,
  onRestart,
  onFinanzplanChange,
}: Props) {
  const paid = !!paidToken;
  const l = labels ?? dokumentLabels();
  const articleRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [showCritique, setShowCritique] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [ackOpenFindings, setAckOpenFindings] = useState(false);
  // #4 (Produktvision): Antragstext + Text-Vorschläge sind live editierbar.
  // Beides als State, damit Bestätigen/Bearbeiten/Entfernen sofort im
  // gerenderten Antrag UND im Export (combinedText) wirken.
  const [text, setText] = useState(generation.finalText ?? "");
  const [textVorschlaege, setTextVorschlaege] = useState<string[]>(
    generation.factVerification?.vorschlaege ?? []
  );
  // P4-A Teil 1: aktiver Absatz für die On-Demand-Umformulierung (Quell-Offsets
  // aus node.position → deterministischer Splice).
  const [reformState, setReformState] = useState<{ start: number; end: number; passage: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Umformulierung nur für bezahlte, editierbare Sessions anbieten (wie die
  // Text-Vorschläge). Quelle = der volle `text`, der bei paid an ReactMarkdown geht.
  const markdownComponents = buildMarkdownComponents(
    paid,
    programm.id,
    paid && sessionToken
      ? { source: text, onPick: (start, end, passage) => setReformState({ start, end, passage }) }
      : undefined
  );

  // Übernommene Variante deterministisch per Offset in den finalText splicen und
  // über die bestehende textvorschlag-Route persistieren (kein neuer Speicher-Pfad).
  const applyReform = async (variante: string) => {
    if (!reformState || !sessionToken) return;
    const { start, end } = reformState;
    const next = text.slice(0, start) + variante + text.slice(end);
    const res = await fetch("/api/wizard/textvorschlag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, finalText: next, vorschlaege: textVorschlaege }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error || `Fehler ${res.status}`);
    }
    const j = (await res.json()) as { finalText: string; vorschlaege: string[] };
    setText(j.finalText);
    setTextVorschlaege(j.vorschlaege);
    setReformState(null);
  };
  // P4-B M-Erweiterung: kostenrelative Beantragungshöhe-Empfehlung. Das Projekt-
  // volumen kommt deterministisch aus dem Finanzplan (Summe der Posten; nur wenn
  // beziffert). Katalog-Zahlen dienen als Fallback, wenn kein Dossier-Deckel vorliegt.
  const finanzplanGesamtEur =
    generation.finanzplan && !generation.finanzplan.unbeziffert && generation.finanzplan.posten.length > 0
      ? generation.finanzplan.posten.reduce((s, p) => s + p.betragEur, 0)
      : undefined;
  const beantragungsEmpfehlung = buildBeantragungsEmpfehlung({
    foerderhoehe,
    katalog: {
      foerdersummeMin: programm.foerdersummeMin,
      foerdersummeMax: programm.foerdersummeMax,
      foerdersummeText: programm.foerdersummeText,
    },
    gesamtkostenEur: finanzplanGesamtEur,
  });
  const finanzplanMarkdown = generation.finanzplan
    ? renderFinanzplanMarkdown(generation.finanzplan)
    : "";
  // AI-Act Art. 50(2): KI-Kennzeichnung wandert mit dem exportierten Dokument
  // mit (Kopieren/.txt/.doc/PDF). Nur im Export, nicht im gerenderten Artikel —
  // on-screen trägt das die <KiHinweis variant="ergebnis"/>-Leiste.
  const exportFooter = `\n\n---\n${KI_EXPORT_HINWEIS}\n`;
  const baseExport = finanzplanMarkdown ? `${text}\n${finanzplanMarkdown}\n` : text;
  const combinedText = baseExport + exportFooter;

  // Hebel 2 (E2E-Probe 09.06.) — Auslieferungs-Block: Ein nicht abschliessend
  // adressiertes hoch-Finding des KI-Gutachters ist ein echtes Qualitaetsrisiko.
  // Der Export (Kopieren/Download/PDF) wird gesperrt, bis der Nutzer aktiv
  // bestaetigt, dass er die offenen Hinweise kennt und den Antrag selbst prueft.
  // Reine Konsistenz-Hinweise (von der Pipeline bereits abgeglichen) bleiben eine
  // weiche Warnung ohne Sperre.
  const hasOpenHigh = !!generation.hasOpenHighFindings;
  const hasConsistency = !!generation.hasConsistencyIssues;
  const exportBlocked = hasOpenHigh && !ackOpenFindings;

  const copy = async () => {
    if (exportBlocked) return;
    await navigator.clipboard.writeText(combinedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerDownload = (parts: BlobPart[], mime: string, ext: string) => {
    const blob = new Blob(parts, { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${l.datei}_${programm.id}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const download = (mime: string, ext: string) => {
    if (exportBlocked) return;
    triggerDownload([combinedText], mime, ext);
  };

  // RTF = Default-Download: offenes, BEARBEITBARES Format, das Pages, Word,
  // LibreOffice und Google Docs zuverlaessig oeffnen. Loest das fragile .doc=HTML
  // ab (oeffnete auf Mac/Pages nicht) und ist fuers Weiterbearbeiten besser
  // geeignet als das reine Ansichts-PDF.
  const downloadRtf = () => {
    if (exportBlocked) return;
    triggerDownload([markdownToRtf(combinedText, programm.name)], "application/rtf", "rtf");
  };

  const downloadPdf = async () => {
    if (exportBlocked || !printRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      const html2pdf = (await loadHtml2pdf()) as {
        (): {
          set: (opt: unknown) => { from: (el: HTMLElement) => { save: () => Promise<void> } };
        };
      };
      const opt = {
        margin: [15, 15, 20, 15] as [number, number, number, number],
        filename: `${l.datei}_${programm.id}.pdf`,
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
    <div className="rounded-xl border border-[#1e3d32]/40 bg-white p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#1c1917]">
            {l.entwurf} {paid ? "freigeschaltet" : "fertig"}
          </h2>
          <p className="text-sm text-slate-600">für {programm.name}</p>
        </div>
        <div className={paid ? "flex flex-wrap items-center gap-2" : "hidden"}>
          {/* RTF = Default: offenes, bearbeitbares Dokument (Pages/Word/LibreOffice).
              PDF zum Ansehen/Drucken, .txt + Kopieren als Fallback. */}
          <button
            type="button"
            onClick={downloadRtf}
            disabled={exportBlocked}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e3d32] px-4 py-2 sm:py-3 text-sm font-semibold text-white transition hover:bg-[#2a5244] disabled:opacity-50 disabled:pointer-events-none"
          >
            <Download className="h-4 w-4" /> {l.dokument} herunterladen (bearbeitbar)
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={pdfBusy || exportBlocked}
            title="PDF zum Ansehen und Drucken (nicht bearbeitbar)."
            className="inline-flex items-center gap-2 rounded-lg border border-[#1e3d32]/40 bg-[#1e3d32]/10 px-3 py-2 text-sm text-[#57534e] transition hover:bg-[#1e3d32]/20 disabled:opacity-50 disabled:pointer-events-none"
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
            onClick={copy}
            disabled={exportBlocked}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1c1917]/15 px-3 py-2 text-sm text-[#57534e] hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
          <button
            type="button"
            onClick={() => download("text/plain;charset=utf-8", "txt")}
            disabled={exportBlocked}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1c1917]/15 px-3 py-2 text-sm text-[#57534e] hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download className="h-4 w-4" /> .txt
          </button>
          {onRestart && (
            <>
              {/* Optischer Trenner: „Neuer Antrag" ist eine andere Art Aktion als
                  die Export-Buttons und soll fuer Wiederkehrer auffindbar sein (NEU-1). */}
              <span
                className="mx-1 hidden h-6 w-px self-center bg-slate-200 sm:block"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => {
                  // Restart verwirft den lokalen Zeiger auf diesen fertigen Antrag —
                  // vor dem Verlust kurz rueckfragen (er bleibt unter „Meine Anträge").
                  if (
                    window.confirm(
                      "Diesen fertigen Antrag schließen und einen neuen starten? Sie finden ihn weiterhin unter „Meine Anträge“."
                    )
                  ) {
                    onRestart();
                  }
                }}
                title="Einen neuen Förderantrag beginnen"
                className="inline-flex items-center gap-2 rounded-lg border border-[#1e3d32]/40 bg-[#1e3d32]/10 px-4 py-2 sm:py-3 text-sm font-semibold text-[#1e3d32] transition hover:bg-[#1e3d32]/20"
              >
                <RefreshCw className="h-4 w-4" /> Neuer Antrag
              </button>
            </>
          )}
        </div>
      </header>
      <KiHinweis variant="ergebnis" className="mb-5" />
      {paid && textVorschlaege.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <div className="font-semibold">
              {textVorschlaege.length} KI-Annahme{textVorschlaege.length === 1 ? "" : "n"} zu prüfen
            </div>
            <p className="mt-0.5 text-xs text-amber-800/90">
              Der Assistent hat Angaben ergänzt, die nicht aus Ihren Eingaben stammen. Sie sind im
              Text <mark className="rounded bg-amber-100 px-1 ring-1 ring-amber-300">[Annahme: …]</mark>{" "}
              markiert und bleiben auch im Export sichtbar gekennzeichnet, bis Sie sie{" "}
              {sessionToken ? "unten bestätigen, anpassen oder streichen" : "geprüft haben"}.
            </p>
          </div>
        </div>
      )}
      {hasOpenHigh && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              <div className="font-semibold text-red-900">
                Qualitätshinweise des KI-Prüfers — bitte vor Export prüfen
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs text-red-800/90 space-y-0.5">
                <li>
                  Mindestens ein <strong>hoch</strong>-Finding des Gutachters ist nicht
                  vollständig adressiert.
                </li>
                {hasConsistency && (
                  <li>
                    Antragstext und Finanzplan haben Inkonsistenzen (
                    {generation.consistencyIssues?.length ?? 0}).
                  </li>
                )}
                <li>Details unten unter „KI-Gutachten" — bitte selbst prüfen.</li>
              </ul>
            </div>
          </div>
          {paid && (
            <label className="mt-3 flex items-start gap-2 rounded border border-red-300 bg-white p-2.5 text-xs text-red-900">
              <input
                type="checkbox"
                checked={ackOpenFindings}
                onChange={(e) => setAckOpenFindings(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
              />
              <span>
                Ich habe die offenen Hinweise gelesen, den Antrag selbst geprüft und
                übernehme die Verantwortung für die Einreichung.{" "}
                <strong>Export ist bis dahin gesperrt.</strong>
              </span>
            </label>
          )}
        </div>
      )}
      {!hasOpenHigh && hasConsistency && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-[#1e3d32]/40 bg-[#1e3d32]/10 p-4 text-sm text-[#1c1917]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#1e3d32]" />
          <div>
            <div className="font-semibold text-[#1c1917]">Qualitätshinweise des KI-Prüfers</div>
            <ul className="mt-1 list-disc pl-5 text-xs text-[#57534e]/80 space-y-0.5">
              <li>Antragstext und Finanzplan haben Inkonsistenzen ({generation.consistencyIssues?.length ?? 0}).</li>
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
              "rounded-lg border border-[#1c1917]/15 bg-white p-8 text-[#57534e] antrag-prose " +
              (paid ? "" : "max-h-[420px] overflow-hidden blur-[3px] select-none")
            }
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {paid ? text : text.slice(0, 1800) + (text.length > 1800 ? "\n\n…" : "")}
            </ReactMarkdown>
          </article>
          <AntragSectionNav articleRef={articleRef} />
        </div>
        {reformState && sessionToken && (
          <AbsatzReformulierer
            sessionToken={sessionToken}
            passage={reformState.passage}
            onUebernehmen={applyReform}
            onAbbrechen={() => setReformState(null)}
          />
        )}
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
        {paid && (beantragungsEmpfehlung.hatEmpfehlung || beantragungsEmpfehlung.detail) && (
          <div className="mt-6 rounded-lg border border-[#1e3d32]/20 bg-[#1e3d32]/[0.04] p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#1c1917]">
              <Coins className="h-4 w-4 text-[#1e3d32]" />
              Wie viel sollten Sie beantragen?
            </div>
            <p className="text-sm text-[#57534e]">{beantragungsEmpfehlung.headline}</p>
            {beantragungsEmpfehlung.basis && (
              <p className="mt-1 text-xs text-slate-600">{beantragungsEmpfehlung.basis}</p>
            )}
            {beantragungsEmpfehlung.detail && (
              <p className="mt-1 text-xs italic text-slate-600">{beantragungsEmpfehlung.detail}</p>
            )}
            <p className="mt-2 text-[11px] text-slate-500">
              Grobe Orientierung — die tatsächliche Bewilligung entscheidet der Fördergeber.
            </p>
          </div>
        )}
        {!paid && sessionToken && (
          <PaywallGate sessionToken={sessionToken} priceEur={29.9} tierLabel="Einzelantrag" labels={l} />
        )}
      </div>
      {paid && textVorschlaege.length > 0 && sessionToken && (
        <TextVorschlaegeEditor
          sessionToken={sessionToken}
          finalText={text}
          vorschlaege={textVorschlaege}
          begruendungen={generation.factVerification?.vorschlaegeBegruendung}
          onChange={({ finalText, vorschlaege }) => {
            setText(finalText);
            setTextVorschlaege(vorschlaege);
          }}
        />
      )}
      {paid && textVorschlaege.length > 0 && !sessionToken && (
        <div className="mt-6 rounded-lg border border-[#1e3d32]/30 bg-[#1e3d32]/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1c1917]">
            <Sparkles className="h-4 w-4 text-[#1e3d32]" />
            Ergänzte Angaben — vom Assistenten hinzugefügt, bitte prüfen
          </div>
          <ul className="space-y-1.5 text-xs text-[#57534e]">
            {textVorschlaege.map((v, i) => {
              const warum = provenanz(generation.factVerification?.vorschlaegeBegruendung, v);
              return (
                <li key={i} className="flex gap-2 rounded border border-[#1c1917]/10 bg-white p-2">
                  <span className="shrink-0 text-[#1e3d32]">›</span>
                  <div>
                    <span>„{v}"</span>
                    {warum && (
                      <span className="mt-1 block text-[11px] italic text-[#1e3d32]/80">Warum ergänzt: {warum}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {paid && generation.critique && (
        <details
          className="mt-6 rounded-lg border border-[#1c1917]/15 bg-white p-4"
          open={showCritique}
          onToggle={(e) => setShowCritique((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            KI-Gutachten zum ersten Entwurf (zur Transparenz)
          </summary>
          {generation.critiqueFindings && generation.critiqueFindings.length > 0 && generation.critiqueResolutions && (
            <div className="mt-3 space-y-2 text-xs text-slate-700">
              {generation.critiqueFindings.map((f, i) => {
                const res = generation.critiqueResolutions?.find((r) => r.index === i + 1);
                const status = res?.status ?? "offen";
                const badge =
                  status === "geschlossen"
                    ? "border-green-500/40 text-green-700"
                    : status === "teilweise"
                      ? "border-yellow-500/40 text-yellow-700"
                      : "border-red-500/40 text-red-700";
                const schwereBadge =
                  f.schwere === "hoch"
                    ? "border-red-500/40 text-red-700"
                    : f.schwere === "mittel"
                      ? "border-[#1e3d32]/40 text-[#1e3d32]"
                      : "border-[#1c1917]/20 text-slate-700";
                return (
                  <div key={i} className="rounded border border-[#1c1917]/15 bg-[#fdfdfc] p-2.5">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${schwereBadge}`}>
                        {f.schwere}
                      </span>
                      <span className="rounded-full border border-[#1c1917]/15 px-2 py-0.5 text-[10px] text-slate-600">
                        {CRITIQUE_KATEGORIE_LABELS[f.kategorie] ?? f.kategorie} · {f.abschnitt}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${badge}`}>
                        {status}
                      </span>
                    </div>
                    <div className="mb-1 text-[#57534e]">„{f.zitat}"</div>
                    <div className="text-slate-600">→ {f.vorschlag}</div>
                    {res?.kommentar && (
                      <div className="mt-1 text-slate-500 italic">Re-Check: {res.kommentar}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!generation.critiqueResolutions && (
            <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-600">{generation.critique}</pre>
          )}
          {generation.consistencyIssues && generation.consistencyIssues.length > 0 && (
            <div className="mt-4 border-t border-[#1c1917]/15 pt-3">
              <div className="mb-2 text-xs font-medium text-slate-700">
                Konsistenz-Check Antrag × Finanzplan
              </div>
              <div className="space-y-2 text-xs text-slate-700">
                {generation.consistencyIssues.map((i, idx) => (
                  <div key={idx} className="rounded border border-[#1c1917]/15 bg-[#fdfdfc] p-2.5">
                    <div className="mb-1">
                      <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-[10px] uppercase text-amber-700">
                        {CONSISTENCY_ART_LABELS[i.art] ?? i.art}
                      </span>
                    </div>
                    <div className="text-[#57534e]">{i.beschreibung}</div>
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

      {/* So reichen Sie ein — direkt nach Antragstext/Downloads, damit der
          Nutzer beim Copy-Paste weiss, wohin mit dem Antrag. */}
      <div className="mt-6">
        <EinreichungInfo
          info={einreichung ?? null}
          kontaktEmail={programm.kontaktEmail}
          kontaktTelefon={programm.kontaktTelefon}
          bewerbungsfristText={programm.bewerbungsfristText}
        />
      </div>

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
