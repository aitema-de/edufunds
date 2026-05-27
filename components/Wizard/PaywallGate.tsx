"use client";

import { useState } from "react";
import { Check, Loader2, Lock, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

interface Props {
  sessionToken: string;
  /** Preis in EUR fuer den gewaehlten Tier. */
  priceEur: number;
  tierLabel: string;
}

const DEV_MOCK_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_DEV_MOCK === "1";

const BENEFITS = [
  "Vollstaendiger Antragstext + Finanzplan",
  "Download als PDF, Word und Text",
  "Copy-&-Paste-Ansicht fuer eigene Vorlagen",
  "30 Tage Zugriff ueber Download-Link",
  "Nachtraegliches Editieren der Antworten bleibt moeglich",
];

type ErrorKind = "stripe-down" | "network" | "unknown";

interface ErrorState {
  kind: ErrorKind;
  message: string;
}

export function PaywallGate({ sessionToken, priceEur, tierLabel }: Props) {
  const [busy, setBusy] = useState(false);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);

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
            ? "Die Zahlungsanbindung wird gerade fertig eingerichtet. Wir schalten sie in den naechsten Tagen frei — schreib uns an support@edufunds.org, falls du den Antrag dringend brauchst."
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
            : "Netzwerkfehler — bitte Verbindung pruefen und erneut versuchen.",
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
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0a1628]/40 via-[#0a1628]/80 to-[#0a1628]" />
      <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border border-[#c9a227]/40 bg-white/95 p-8 text-center shadow-2xl">
          <div className="mb-4 inline-flex rounded-full bg-[#c9a227]/10 p-3">
            <Lock className="h-6 w-6 text-[#c9a227]" />
          </div>
          <h3 className="mb-2 text-2xl font-semibold text-[#0a1628]">
            Antrag + Finanzplan freischalten
          </h3>
          <p className="mb-5 text-sm text-slate-600">
            Dein Antragstext und der Finanzplan sind fertig. Mit dem{" "}
            <strong className="text-[#1e3a61]">{tierLabel}</strong> bekommst du den
            vollstaendigen Text und alle Downloads.
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
            <span className="text-4xl font-bold text-[#0a1628]">{priceEur} €</span>
            <span className="text-sm text-slate-600">einmalig</span>
          </div>

          {errorState && (
            <div
              className={`mb-4 rounded-lg border p-3 text-left text-sm ${
                isStripeDown
                  ? "border-[#c9a227]/40 bg-[#c9a227]/10 text-[#1e3a61]"
                  : "border-red-500/40 bg-red-500/10 text-red-200"
              }`}
            >
              <p className="leading-relaxed">{errorState.message}</p>
              {!isStripeDown && (
                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={busy}
                  className="mt-2 inline-flex items-center gap-1.5 rounded border border-[#0a1628]/20 bg-white px-3 py-1 text-xs text-[#1e3a61] hover:bg-slate-100 disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Erneut versuchen
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={startCheckout}
            disabled={busy || isStripeDown}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#c9a227] px-6 py-3 font-semibold text-white transition hover:bg-[#b8921e] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {busy
              ? "Stripe-Checkout wird vorbereitet…"
              : `Jetzt fuer ${priceEur} € freischalten`}
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3 w-3" />
            <span>Sichere Zahlung ueber Stripe — Kreditkarte, SEPA, Apple Pay</span>
          </div>

          {DEV_MOCK_ENABLED && (
            <button
              type="button"
              onClick={devMockPay}
              disabled={busy}
              className="mt-3 w-full rounded-lg border border-[#0a1628]/15 px-4 py-2 text-xs text-slate-600 hover:bg-white disabled:opacity-50"
              title="Nur im Entwicklungsmodus — simuliert eine erfolgreiche Zahlung ohne Stripe"
            >
              Dev-Mock: als bezahlt markieren
            </button>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Nach der Zahlung bekommst du einen Download-Link. Dein Antrag bleibt darueber
            30 Tage verfuegbar und ist auch unter „Meine Antraege" erreichbar.
          </p>
        </div>
      </div>
    </>
  );
}
