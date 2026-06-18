"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2, ArrowRight, FileText, Smartphone, Check, Mail } from "lucide-react";
import {
  listLocalSessions,
  removeLocalSession,
} from "@/lib/wizard/session-index-client";
import type { WizardPhase } from "@/lib/wizard/types";
import { type CostLedger } from "@/lib/wizard/pricing";

interface SessionSummary {
  programmId: string;
  sessionToken: string;
  programmName: string;
  phase: WizardPhase;
  totalQuestions: number;
  maxQuestions: number;
  updatedAt: string;
  costs?: CostLedger | null;
  missing?: boolean;
  error?: string;
}

// Geräteübergreifend gebundene Session (von /api/antrag/list).
interface ServerSession {
  sessionToken: string;
  programmId: string;
  programmName: string;
  status: string;
  phase: string | null;
  paid: boolean;
  updatedAt: string;
}

const PHASE_META: Record<
  WizardPhase,
  { label: string; className: string }
> = {
  interviewing: { label: "In Bearbeitung", className: "bg-[#78350f]/15 text-[#78350f] border-[#78350f]/40" },
  ready_to_generate: { label: "Bereit zur Generierung", className: "bg-blue-500/15 text-blue-600 border-blue-500/40" },
  generating: { label: "Wird geschrieben…", className: "bg-purple-500/15 text-purple-600 border-purple-500/40" },
  complete: { label: "Fertig", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40" },
  failed: { label: "Fehler", className: "bg-red-500/15 text-red-600 border-red-500/40" },
};

function badgeFor(phase: string | null, paid: boolean): { label: string; className: string } {
  if (paid) return { label: "Freigeschaltet", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40" };
  if (phase && phase in PHASE_META) return PHASE_META[phase as WizardPhase];
  return { label: "In Bearbeitung", className: "bg-[#78350f]/15 text-[#78350f] border-[#78350f]/40" };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function MyAntraegeClient() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [tick, setTick] = useState(0);

  // Geräteübergreifende Identität (B4).
  const [serverSessions, setServerSessions] = useState<ServerSession[] | null>(null);
  const [identityEmail, setIdentityEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<"verified" | "link-error" | "config-error" | null>(null);

  // Magic-Link anfordern.
  const [email, setEmail] = useState("");
  const [loadedAt, setLoadedAt] = useState(0);
  const [website, setWebsite] = useState(""); // Honeypot
  const [sending, setSending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // URL-Hinweise (verified / error) auswerten.
  useEffect(() => {
    setLoadedAt(Date.now());
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") setNotice("verified");
    else if (params.get("error") === "link") setNotice("link-error");
    else if (params.get("error") === "config") setNotice("config-error");
    if (params.has("verified") || params.has("error")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Server-Liste laden (falls Identity-Cookie vorhanden).
  useEffect(() => {
    let active = true;
    fetch("/api/antrag/list")
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401 || res.status === 503) {
          setServerSessions(null);
          setIdentityEmail(null);
          return;
        }
        const data = await res.json().catch(() => ({}));
        setIdentityEmail(data.email ?? null);
        setServerSessions(Array.isArray(data.sessions) ? data.sessions : []);
      })
      .catch(() => {
        if (active) setServerSessions(null);
      });
    return () => {
      active = false;
    };
  }, [notice]);

  // Lokale (Browser-)Sessions laden.
  useEffect(() => {
    const local = listLocalSessions();
    if (local.length === 0) {
      setSessions([]);
      return;
    }
    setSessions(null);

    Promise.all(
      local.map(async ({ programmId, sessionToken }) => {
        try {
          const res = await fetch(`/api/wizard/${sessionToken}`);
          if (res.status === 404) {
            return {
              programmId,
              sessionToken,
              programmName: "(Session auf dem Server nicht mehr vorhanden)",
              phase: "failed" as WizardPhase,
              totalQuestions: 0,
              maxQuestions: 12,
              updatedAt: new Date().toISOString(),
              missing: true,
            };
          }
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
          const body = await res.json();
          return {
            programmId,
            sessionToken,
            programmName: body.foerderprogrammName ?? programmId,
            phase: body.phase as WizardPhase,
            totalQuestions: body.interviewer?.totalQuestions ?? 0,
            maxQuestions: body.interviewer?.maxQuestions ?? 12,
            updatedAt: body.updatedAt ?? new Date().toISOString(),
            costs: body.costs ?? null,
          } satisfies SessionSummary;
        } catch (e) {
          return {
            programmId,
            sessionToken,
            programmName: programmId,
            phase: "failed" as WizardPhase,
            totalQuestions: 0,
            maxQuestions: 12,
            updatedAt: new Date().toISOString(),
            error: e instanceof Error ? e.message : "Fehler",
          } satisfies SessionSummary;
        }
      })
    ).then((results) => {
      results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setSessions(results);
    });
  }, [tick]);

  const handleRemove = (programmId: string) => {
    if (!confirm("Diese Session aus dem Browser entfernen? (Auf dem Server bleibt sie bestehen und ist über einen Link weiter erreichbar, falls Sie einen haben.)")) {
      return;
    }
    removeLocalSession(programmId);
    refresh();
  };

  async function requestMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !email.trim()) return;
    setSending(true);
    setMagicError(null);
    try {
      const res = await fetch("/api/antrag/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), website, timestamp: loadedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMagicError(data.error ?? "Versand fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
      setMagicSent(true);
    } catch {
      setMagicError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* URL-Hinweise */}
      {notice === "link-error" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          Der Link ist abgelaufen oder wurde bereits verwendet. Fordern Sie unten einen neuen an.
        </div>
      )}
      {notice === "config-error" && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          Die geräteübergreifende Funktion ist gerade nicht verfügbar.
        </div>
      )}

      {/* Geräteübergreifend: Identität / Magic-Link */}
      <div className="rounded-xl border border-[#1c1917]/10 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-[#78350f]" />
          <h2 className="text-base font-semibold text-[#1c1917]">Geräteübergreifend</h2>
        </div>

        {identityEmail ? (
          <>
            <p className="mb-4 text-sm text-slate-600">
              Angemeldet als <strong>{identityEmail}</strong>. Diese Anträge sind an Ihre E-Mail
              gebunden und auf jedem Gerät erreichbar.
            </p>
            {serverSessions === null ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#78350f]" /> Lade…
              </div>
            ) : serverSessions.length === 0 ? (
              <p className="text-sm text-slate-500">
                Noch keine Anträge mit dieser E-Mail verknüpft. Tippen Sie im Wizard auf „Auf anderem
                Gerät weitermachen", um einen Antrag zu binden.
              </p>
            ) : (
              <div className="space-y-3">
                {serverSessions.map((s) => {
                  const meta = badgeFor(s.phase, s.paid);
                  return (
                    <div
                      key={s.sessionToken}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-[#1c1917]/10 bg-[#fdfdfc] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-[#1c1917]">
                            {s.programmName}
                          </h3>
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${meta.className}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Letzter Stand: {formatDate(s.updatedAt)}
                        </div>
                      </div>
                      <Link
                        href={`/antrag/${s.programmId}/wizard?session=${encodeURIComponent(s.sessionToken)}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#78350f]/50 bg-[#78350f]/10 px-3 py-2 text-sm font-medium text-[#57534e] hover:bg-[#78350f]/20 sm:ml-auto"
                      >
                        Öffnen
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : magicSent ? (
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
            <p>
              Falls Anträge mit <strong>{email.trim()}</strong> verknüpft sind, haben wir Ihnen einen
              Link geschickt. Öffnen Sie ihn auf diesem Gerät, um Ihre Anträge zu sehen (30 Minuten gültig).
            </p>
          </div>
        ) : (
          <form onSubmit={requestMagicLink}>
            <p className="mb-2 text-sm text-slate-600">
              Anträge auf einem anderen Gerät begonnen? Geben Sie Ihre E-Mail ein – wir schicken Ihnen einen
              Link, ganz ohne Passwort.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@schule.de"
                className="flex-1 rounded-lg border border-[#1c1917]/15 bg-white px-3 py-2 text-sm text-[#1c1917]"
              />
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#78350f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#92400e] disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Link senden
              </button>
            </div>
            {/* Honeypot */}
            <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>
            {magicError && (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {magicError}
              </p>
            )}
          </form>
        )}
        <p className="mt-4 border-t border-[#1c1917]/10 pt-3 text-xs text-slate-500">
          Kontingent für eine Schule/einen Träger gekauft?{" "}
          <Link href="/kontingent/uebersicht" className="font-medium text-[#78350f] underline">
            Zur Käufer-Übersicht
          </Link>
        </p>
      </div>

      {/* Lokale Sessions (dieser Browser) */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-[#1c1917]">In diesem Browser</h2>
        {sessions === null ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#1c1917]/10 bg-white/80 p-6 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#78350f]" />
            Lade Sessions…
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-[#1c1917]/10 bg-white/80 p-10 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-500" />
            <h3 className="mb-2 text-lg font-semibold text-[#1c1917]">
              Noch kein Antrag begonnen
            </h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-slate-600">
              Schildern Sie Ihr Anliegen und finden Sie in Sekunden das passende Förderprogramm für Ihre Schule.
            </p>
            <Link
              href="/antrag/start"
              className="inline-flex items-center gap-2 rounded-lg bg-[#78350f] px-5 py-2 text-sm font-semibold text-white hover:bg-[#92400e]"
            >
              Anliegen schildern
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const meta = PHASE_META[s.phase] ?? PHASE_META.failed;
              const href = `/antrag/${s.programmId}/wizard`;
              return (
                <div
                  key={s.sessionToken}
                  className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 rounded-xl border border-[#1c1917]/10 bg-white p-4 transition hover:border-[#1c1917]/15"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-[#1c1917]">
                        {s.programmName}
                      </h3>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {!s.missing && !s.error && (
                        <>
                          {s.totalQuestions}/{s.maxQuestions} Fragen beantwortet ·{" "}
                        </>
                      )}
                      Letzter Stand: {formatDate(s.updatedAt)}
                      {s.error && <span className="ml-2 text-red-500">· {s.error}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    {!s.missing && (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#78350f]/50 bg-[#78350f]/10 px-3 py-2 text-sm font-medium text-[#57534e] hover:bg-[#78350f]/20"
                      >
                        Öffnen
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(s.programmId)}
                      title="Aus Browser entfernen"
                      className="rounded-lg border border-[#1c1917]/15 p-2 text-slate-600 hover:border-red-500/50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
