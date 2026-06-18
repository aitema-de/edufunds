"use client";

import { useState } from "react";
import { Check, Loader2, Lock, RefreshCw, ShieldCheck, Sparkles, Ticket } from "lucide-react";

interface Props {
  sessionToken: string;
  /** Preis in EUR fuer den gewaehlten Tier. */
  priceEur: number;
  tierLabel: string;
}

const DEV_MOCK_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_DEV_MOCK === "1";

const BENEFITS = [
  "Vollständiger Antragstext + Finanzplan",
  "Download als bearbeitbare Datei (RTF), PDF und Text",
  "Copy-&-Paste-Ansicht für eigene Vorlagen",
  "12 Monate Zugriff über Download-Link",
  "Nachträgliches Editieren der Antworten bleibt möglich",
];

type ErrorKind = "stripe-down" | "network" | "unknown";

interface ErrorState {
  kind: ErrorKind;
  message: string;
}

export function PaywallGate({ sessionToken, priceEur, tierLabel }: Props) {
  const [busy, setBusy] = useState(false);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [showRedeem, setShowRedeem] = useState(false);
  const [code, setCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const redeemCode = async () => {
    const value = code.trim();
    if (!value) {
      setRedeemError("Bitte geben Sie einen Kontingent-Code ein.");
      return;
    }
    setRedeemBusy(true);
    setRedeemError(null);
    try {
      const res = await fetch("/api/wizard/redeem-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, code: value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRedeemError(body.error ?? `Einlösung fehlgeschlagen (HTTP ${res.status}).`);
        return;
      }
      if (body.paidToken) {
        window.location.href = `/antrag/download/${body.paidToken}`;
        return;
      }
      setRedeemError("Unerwartete Antwort — bitte erneut versuchen.");
    } catch (e) {
      setRedeemError(
        e instanceof Error ? `Netzwerkfehler: ${e.message}` : "Netzwerkfehler — bitte erneut versuchen."
      );
    } finally {
      setRedeemBusy(false);
    }
  };

  const startCheckout = async () => {
    setBusy(true);
    setErrorState(null);
    try {
      const res = await fetch("/api/wizard/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, tier: "einzelantrag" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const kind: ErrorKind = res.status === 503 ? "stripe-down" : "unknown";
        const message =
          kind === "stripe-down"
            ? "Die Zahlungsanbindung wird gerade fertig eingerichtet. Wir schalten sie in den nächsten Tagen frei — schreiben Sie uns an support@edufunds.org, falls Sie den Antrag dringend brauchen."
            : (body.error ?? `Checkout konnte nicht gestartet werden (HTTP ${res.status}).`);
        setErrorState({ kind, message });
        return;
      }
      if (body.alreadyPaid && body.paidToken) {
        window.location.href = `/antrag/download/${body.paidToken}`;
        return;
      }
      if (body.checkoutUrl) {
        window.location.href = body.checkoutUrl;
        return;
      }
      setErrorState({ kind: "unknown", message: "Kein Checkout-Link erhalten." });
    } catch (e) {
      setErrorState({
        kind: "network",
        message:
          e instanceof Error
            ? `Netzwerkfehler: ${e.message}`
            : "Netzwerkfehler — bitte Verbindung prüfen und erneut versuchen.",
      });
    } finally {
      setBusy(false);
    }
  };

  const devMockPay = async () => {
    setBusy(true);
    setErrorState(null);
    try {
      const res = await fetch("/api/wizard/checkout/dev-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, tier: "einzelantrag" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      if (body.paidToken) {
        window.location.href = `/antrag/download/${body.paidToken}`;
        return;
      }
    } catch (e) {
      setErrorState({
        kind: "unknown",
        message: e instanceof Error ? e.message : "Mock-Pay fehlgeschlagen",
      });
    } finally {
      setBusy(false);
    }
  };

  const isStripeDown = errorState?.kind === "stripe-down";

  return (
    <>
      {/* Dunkler Verlauf ueber dem Content — erwartet, dass der Eltern-Container `relative` ist. */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#1c1917]/40 via-[#1c1917]/80 to-[#1c1917]" />
      <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border border-[#78350f]/40 bg-white/95 p-8 text-center shadow-2xl">
          <div className="mb-4 inline-flex rounded-full bg-[#78350f]/10 p-3">
            <Lock className="h-6 w-6 text-[#78350f]" />
          </div>
          <h3 className="mb-2 text-2xl font-semibold text-[#1c1917]">
            Antrag + Finanzplan freischalten
          </h3>
          <p className="mb-5 text-sm text-slate-600">
            Ihr Antragstext und der Finanzplan sind fertig. Mit dem{" "}
            <strong className="text-[#57534e]">{tierLabel}</strong> bekommen Sie den
            vollständigen Text und alle Downloads.
          </p>

          <ul className="mb-6 space-y-1.5 text-left">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mb-6 flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-[#1c1917]">{priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
            <span className="text-sm text-slate-600">einmalig</span>
          </div>

          {errorState && (
            <div
              className={`mb-4 rounded-lg border p-3 text-left text-sm ${
                isStripeDown
                  ? "border-[#78350f]/40 bg-[#78350f]/10 text-[#57534e]"
                  : "border-red-500/40 bg-red-500/10 text-red-200"
              }`}
            >
              <p className="leading-relaxed">{errorState.message}</p>
              {!isStripeDown && (
                <button
                  type="button"
                  onClick={DEV_MOCK_ENABLED ? devMockPay : startCheckout}
                  disabled={busy}
                  className="mt-2 inline-flex items-center gap-1.5 rounded border border-[#1c1917]/20 bg-white px-3 py-1 text-xs text-[#57534e] hover:bg-slate-100 disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Erneut versuchen
                </button>
              )}
            </div>
          )}

          {/* PILOT (temporaer): Solange der Dev-Mock aktiv ist, schaltet der
              Hauptbutton ohne Zahlung frei — der echte Stripe-Checkout laeuft noch
              im Sandbox-Modus und nimmt nur Testkarten an, was sich fuer Tester wie
              „Button tut nichts" anfuehlt. Ist die Flag aus, gilt der normale
              Stripe-Flow unveraendert. */}
          <button
            type="button"
            onClick={DEV_MOCK_ENABLED ? devMockPay : startCheckout}
            disabled={busy || (!DEV_MOCK_ENABLED && isStripeDown)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#78350f] px-6 py-3 font-semibold text-white transition hover:bg-[#92400e] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {busy
              ? DEV_MOCK_ENABLED
                ? "Wird freigeschaltet…"
                : "Stripe-Checkout wird vorbereitet…"
              : DEV_MOCK_ENABLED
                ? "Jetzt freischalten (Pilot — keine Zahlung)"
                : `Jetzt für ${priceEur.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € freischalten`}
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3 w-3" />
            <span>
              {DEV_MOCK_ENABLED
                ? "Pilotphase — Freischaltung kostenlos, keine Zahlung nötig"
                : "Sichere Zahlung über Stripe — Kreditkarte, SEPA, Apple Pay"}
            </span>
          </div>

          {/* Kontingent-Code (Schultraeger): Lehrkraft schaltet ohne eigene Zahlung frei */}
          <div className="mt-5 border-t border-slate-200 pt-4">
            {!showRedeem ? (
              <button
                type="button"
                onClick={() => setShowRedeem(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#57534e] transition-colors hover:text-[#78350f]"
              >
                <Ticket className="h-4 w-4" />
                Kontingent-Code einlösen
              </button>
            ) : (
              <div className="text-left">
                <label
                  htmlFor="kontingent-code"
                  className="mb-1 block text-sm font-medium text-[#1c1917]"
                >
                  Kontingent-Code Ihres Trägers
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Hat Ihr Schulträger ein Kontingent gekauft, schalten Sie Ihren Antrag hiermit
                  frei — ohne eigene Zahlung.
                </p>
                <div className="flex gap-2">
                  <input
                    id="kontingent-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") redeemCode();
                    }}
                    placeholder="EDU-XXXX-XXXX"
                    autoComplete="off"
                    disabled={redeemBusy}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-wider text-[#1c1917] placeholder:normal-case placeholder:tracking-normal focus:border-[#78350f] focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={redeemCode}
                    disabled={redeemBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#57534e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#16304f] disabled:opacity-50"
                  >
                    {redeemBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Einlösen
                  </button>
                </div>
                {redeemError && (
                  <p className="mt-2 text-left text-sm text-red-600">{redeemError}</p>
                )}
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Nach der Zahlung bekommen Sie einen Download-Link. Ihr Antrag bleibt darüber
            12 Monate verfügbar und ist auch unter „Meine Anträge" erreichbar.
          </p>
        </div>
      </div>
    </>
  );
}
