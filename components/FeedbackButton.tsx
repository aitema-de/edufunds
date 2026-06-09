"use client";

import { useState, FormEvent, useEffect } from "react";
import { MessageSquare, X, AlertTriangle, Lightbulb, HelpCircle, Loader2, CheckCircle2 } from "lucide-react";

type FeedbackType = "bug" | "feature" | "question";

interface Props {
  /** Wizard-Session-Token, wenn vorhanden (kommt aus localStorage oder URL). */
  sessionToken?: string;
  /** Bezahl-Token, wenn auf Download-Seite. */
  paidToken?: string;
}

/**
 * FeedbackButton — schwebt rechts unten auf Pilot-Pfad-Pages.
 * Klick oeffnet Modal mit Type-Tabs (Bug/Idee/Frage) + Beschreibung + optionaler
 * Kontaktangabe. POST /api/feedback erstellt parallel GitHub-Issue, ClickUp-Task,
 * Notify-Mail an office@aitema.de (und ggf. Bestaetigungs-Mail an den Piloten).
 *
 * Portiert vom SailHub FeedbackWidget (468 LOC, 4-Step-Wizard) als single-Modal —
 * fuer Pilot-Phase reicht das, einfach und schnell.
 */
export function FeedbackButton({ sessionToken, paidToken }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [email, setEmail] = useState("");
  const [wantsResponse, setWantsResponse] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: boolean; ticket?: string | null; error?: string } | null>(null);

  // Esc schliesst Modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10 || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          description: description.trim(),
          context: context.trim() || undefined,
          email: email.trim() || undefined,
          wantsResponse: wantsResponse && !!email.trim(),
          url: typeof window !== "undefined" ? window.location.href : undefined,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          sessionToken,
          paidToken,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setResult({ success: false, error: body.error || `HTTP ${r.status}` });
        return;
      }
      setResult({ success: true, ticket: body.ticket });
      // Form zuruecksetzen nach Erfolg
      setDescription("");
      setContext("");
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : "Netzwerkfehler" });
    } finally {
      setBusy(false);
    }
  };

  const closeModal = () => {
    if (busy) return;
    setOpen(false);
    // Nach Schliessen Result zuruecksetzen damit naechstes Oeffnen wieder Form zeigt
    setTimeout(() => setResult(null), 200);
  };

  return (
    <>
      {/* Schwebender Trigger-Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#0a1628] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0a1628]/20 transition hover:bg-[#1e3a61] hover:shadow-xl"
        aria-label="Feedback geben"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal-Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1628]/40 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="feedback-modal-title"
          >
            <button
              type="button"
              onClick={closeModal}
              disabled={busy}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 transition hover:bg-[#f8f5f0] hover:text-[#0a1628] disabled:opacity-50"
              aria-label="Schliessen"
            >
              <X className="h-5 w-5" />
            </button>

            {result?.success ? (
              <div className="text-center py-6">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-3" />
                <h2 className="font-serif text-2xl text-[#0a1628] mb-2">Danke!</h2>
                <p className="text-slate-600 mb-4">
                  {result.ticket
                    ? `Dein Feedback ist als Ticket ${result.ticket} eingegangen.`
                    : "Dein Feedback ist eingegangen."}
                </p>
                {wantsResponse && email.trim() && (
                  <p className="text-sm text-slate-500 mb-4">
                    Du bekommst eine Bestätigung an <span className="text-[#1e3a61]">{email}</span>.
                  </p>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#c9a227] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b8921e]"
                >
                  Schließen
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 id="feedback-modal-title" className="font-serif text-2xl text-[#0a1628]">
                    Feedback geben
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Was läuft schief — oder was könnte besser sein?
                  </p>
                </div>

                {/* Type-Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "bug", label: "Fehler", icon: AlertTriangle },
                    { value: "feature", label: "Idee", icon: Lightbulb },
                    { value: "question", label: "Frage", icon: HelpCircle },
                  ] as const).map((opt) => {
                    const Icon = opt.icon;
                    const active = type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-3 text-sm transition ${
                          active
                            ? "border-[#c9a227] bg-[#c9a227]/8 text-[#0a1628]"
                            : "border-[#0a1628]/15 bg-[#f8f5f0]/60 text-slate-600 hover:border-[#0a1628]/30 hover:text-[#0a1628]"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? "text-[#c9a227]" : "text-slate-500"}`} />
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1e3a61]">
                    Beschreibung <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      type === "bug"
                        ? "Was sollte passieren — was ist stattdessen passiert?"
                        : type === "feature"
                          ? "Welche Funktion vermisst du, was würde dir helfen?"
                          : "Was möchtest du wissen?"
                    }
                    rows={4}
                    required
                    className="w-full rounded-lg border border-[#0a1628]/15 bg-[#f8f5f0]/60 px-3 py-2 text-[#0a1628] placeholder-slate-400 transition focus:border-[#c9a227] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a227]/15"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{description.trim().length < 10 ? `Mindestens 10 Zeichen` : `${description.trim().length} Zeichen`}</span>
                  </div>
                </div>

                {/* Context (nur Bug) */}
                {type === "bug" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#1e3a61]">
                      Wo ist es passiert? <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="z. B. „Beim Klick auf Antrag generieren"
                      className="w-full rounded-lg border border-[#0a1628]/15 bg-[#f8f5f0]/60 px-3 py-2 text-[#0a1628] placeholder-slate-400 transition focus:border-[#c9a227] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a227]/15"
                    />
                  </div>
                )}

                {/* Email + wantsResponse */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1e3a61]">
                    Deine E-Mail <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="du@beispiel.de"
                    className="w-full rounded-lg border border-[#0a1628]/15 bg-[#f8f5f0]/60 px-3 py-2 text-[#0a1628] placeholder-slate-400 transition focus:border-[#c9a227] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a227]/15"
                  />
                  {email.trim() && (
                    <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={wantsResponse}
                        onChange={(e) => setWantsResponse(e.target.checked)}
                        className="rounded border-[#0a1628]/15 text-[#c9a227] focus:ring-[#c9a227]/30"
                      />
                      Bestätigungs-Mail erhalten
                    </label>
                  )}
                </div>

                {result?.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {result.error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={busy}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#f8f5f0] hover:text-[#0a1628] disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={busy || description.trim().length < 10}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#c9a227] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b8921e] disabled:cursor-not-allowed disabled:bg-[#c9a227]/40"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Wird gesendet…
                      </>
                    ) : (
                      "Absenden"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
