"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Copy, Loader2, Mail, Check, ChevronDown, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface Redemption {
  redeemedAt: string;
  note: string | null;
}
interface BuyerCode {
  code: string;
  creditsTotal: number;
  creditsUsed: number;
  creditsRemaining: number;
  source: string;
  orgName: string | null;
  createdAt: string;
  expiresAt: string | null;
  expired: boolean;
  redemptions: Redemption[];
}

const GOLD = "#1e3d32";
const INK = "#1c1917";
const NEXT = "/kontingent/uebersicht";

function sourceLabel(s: string): string {
  if (s === "stripe") return "Karte";
  if (s === "invoice") return "Rechnung";
  if (s === "manual") return "Manuell";
  return s;
}
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function KontingentUebersichtPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [codes, setCodes] = useState<BuyerCode[]>([]);
  const [notice, setNotice] = useState<"verified" | "link-error" | null>(null);

  // Login (Magic-Link).
  const [loginEmail, setLoginEmail] = useState("");
  const [loadedAt, setLoadedAt] = useState(0);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [copied, setCopied] = useState<string | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);

  useEffect(() => {
    setLoadedAt(Date.now());
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") setNotice("verified");
    else if (params.get("error") === "link") setNotice("link-error");
    if (params.has("verified") || params.has("error")) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    fetch("/api/kontingent/dashboard")
      .then(async (res) => {
        if (res.status === 401 || res.status === 503) {
          setEmail(null);
          return;
        }
        const data = await res.json().catch(() => ({}));
        setEmail(data.email ?? null);
        setCodes(Array.isArray(data.codes) ? data.codes : []);
      })
      .catch(() => setEmail(null))
      .finally(() => setLoading(false));
  }, []);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !loginEmail.trim()) return;
    setSending(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/antrag/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), next: NEXT, website, timestamp: loadedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(data.error ?? "Versand fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
      setSent(true);
    } catch {
      setLoginError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSending(false);
    }
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ backgroundColor: "#fdfdfc" }}>
        <section className="pt-32 pb-10">
          <div className="container mx-auto px-6 max-w-3xl">
            <span
              className="inline-block px-4 py-2 rounded-full text-xs font-medium tracking-wider uppercase mb-4"
              style={{ backgroundColor: "rgba(30, 61, 50, 0.1)", color: "#1e3d32" }}
            >
              Käufer-Übersicht
            </span>
            <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: INK }}>
              Meine Kontingente
            </h1>
            <p style={{ color: "#64748b" }}>
              Verbrauch und Einlösungen Ihrer gekauften Kontingente – an Ihre E-Mail gebunden.
            </p>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-6 max-w-3xl">
            {notice === "link-error" && (
              <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
                Der Link ist abgelaufen oder wurde bereits verwendet. Fordern Sie unten einen neuen an.
              </div>
            )}

            {loading ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#1c1917]/10 bg-white p-6 text-slate-700">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: GOLD }} />
                Lade…
              </div>
            ) : !email ? (
              // Nicht angemeldet -> Magic-Link anfordern
              sent ? (
                <div className="rounded-xl border border-[#1c1917]/10 bg-white p-6">
                  <div className="flex items-center gap-2 font-medium text-emerald-700">
                    <Check className="h-5 w-5" /> Link gesendet
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Falls zu <strong>{loginEmail.trim()}</strong> Kontingente gehören, haben wir Ihnen einen
                    Link geschickt. Öffnen Sie ihn auf diesem Gerät, um Ihre Übersicht zu sehen (30 Minuten gültig).
                  </p>
                </div>
              ) : (
                <form onSubmit={requestLink} className="rounded-xl border border-[#1c1917]/10 bg-white p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Building2 className="h-5 w-5" style={{ color: GOLD }} />
                    <h2 className="text-base font-semibold" style={{ color: INK }}>Anmelden</h2>
                  </div>
                  <p className="mb-3 text-sm text-slate-600">
                    Geben Sie die E-Mail ein, mit der Sie das Kontingent gekauft haben – wir schicken Ihnen einen Link,
                    ganz ohne Passwort.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="beschaffung@schule.de"
                      className="flex-1 rounded-lg border border-[#1c1917]/15 bg-white px-3 py-2 text-sm"
                      style={{ color: INK }}
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      style={{ backgroundColor: INK }}
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      Link senden
                    </button>
                  </div>
                  <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
                    <label>
                      Website
                      <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                    </label>
                  </div>
                  {loginError && <p className="mt-2 text-xs text-red-600" role="alert">{loginError}</p>}
                </form>
              )
            ) : codes.length === 0 ? (
              <div className="rounded-xl border border-[#1c1917]/10 bg-white p-8 text-center">
                <p className="text-sm text-slate-600">
                  Angemeldet als <strong>{email}</strong>. Mit dieser E-Mail sind keine Kontingente verknüpft.
                </p>
                <Link
                  href="/kontingent"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: GOLD }}
                >
                  Kontingent kaufen
                </Link>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-600">
                  Angemeldet als <strong>{email}</strong>.
                </p>
                <div className="space-y-4">
                  {codes.map((c) => {
                    const pct = c.creditsTotal > 0 ? Math.round((c.creditsUsed / c.creditsTotal) * 100) : 0;
                    const open = openCode === c.code;
                    return (
                      <div key={c.code} className="rounded-xl border border-[#1c1917]/10 bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-lg font-bold tracking-widest"
                              style={{ fontFamily: "monospace", color: INK }}
                            >
                              {c.code}
                            </span>
                            <button
                              onClick={() => copy(c.code)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
                              style={{ color: "#1e3d32" }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copied === c.code ? "Kopiert" : "Kopieren"}
                            </button>
                          </div>
                          <span
                            className="rounded-full border px-2 py-0.5 text-xs"
                            style={{ borderColor: "rgba(10,22,40,0.15)", color: "#64748b" }}
                          >
                            {sourceLabel(c.source)}
                          </span>
                        </div>

                        <div className="mt-4">
                          <div className="mb-1 flex justify-between text-sm">
                            <span style={{ color: "#64748b" }}>
                              {c.creditsUsed} von {c.creditsTotal} verbraucht
                            </span>
                            <span className="font-semibold" style={{ color: INK }}>
                              {c.creditsRemaining} frei
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#ece7da" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: GOLD }} />
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "#475569" }}>
                          <span>Gekauft: {formatDate(c.createdAt)}</span>
                          <span className={c.expired ? "text-red-600" : ""}>
                            {c.expired ? "Abgelaufen am" : "Gültig bis"}: {formatDate(c.expiresAt)}
                          </span>
                        </div>

                        {c.redemptions.length > 0 && (
                          <div className="mt-4 border-t pt-3" style={{ borderColor: "rgba(10,22,40,0.08)" }}>
                            <button
                              onClick={() => setOpenCode(open ? null : c.code)}
                              className="flex items-center gap-1 text-sm font-medium"
                              style={{ color: "#57534e" }}
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                              {c.redemptions.length} Einlösung{c.redemptions.length === 1 ? "" : "en"}
                            </button>
                            {open && (
                              <ul className="mt-2 space-y-1">
                                {c.redemptions.map((r, i) => (
                                  <li key={i} className="text-xs" style={{ color: "#64748b" }}>
                                    Eingelöst am {formatDate(r.redeemedAt)}
                                    {r.note ? ` · ${r.note}` : ""}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="mt-6 flex items-center gap-2 text-xs" style={{ color: "#64748b" }}>
                  <ShieldCheck className="h-4 w-4" style={{ color: GOLD }} />
                  Brauchen Sie mehr?{" "}
                  <Link href="/kontingent" className="underline" style={{ color: "#1e3d32" }}>
                    Weiteres Kontingent kaufen
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
