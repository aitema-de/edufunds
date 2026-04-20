"use client";

import { useState } from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";

interface Props {
  sessionToken: string;
  /** Preis in EUR fuer den gewaehlten Tier. */
  priceEur: number;
  tierLabel: string;
}

const DEV_MOCK_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_DEV_MOCK === "1";

export function PaywallGate({ sessionToken, priceEur, tierLabel }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wizard/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, tier: "einzelantrag" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      if (body.checkoutUrl) {
        window.location.href = body.checkoutUrl;
        return;
      }
      throw new Error("Kein Checkout-Link erhalten.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout konnte nicht gestartet werden");
    } finally {
      setBusy(false);
    }
  };

  const devMockPay = async () => {
    setBusy(true);
    setError(null);
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
      setError(e instanceof Error ? e.message : "Mock-Pay fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Dunkler Verlauf ueber dem Content — erwartet, dass der Eltern-Container `relative` ist. */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0a1628]/40 via-[#0a1628]/80 to-[#0a1628]" />
      <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border border-[#c9a227]/40 bg-slate-900/95 p-8 text-center shadow-2xl">
          <div className="mb-4 inline-flex rounded-full bg-[#c9a227]/10 p-3">
            <Lock className="h-6 w-6 text-[#c9a227]" />
          </div>
          <h3 className="mb-2 text-2xl font-semibold text-slate-100">
            Antrag + Finanzplan freischalten
          </h3>
          <p className="mb-6 text-sm text-slate-400">
            Dein Antragstext und der Finanzplan sind fertig. Um den vollständigen Text,
            alle Downloads (PDF, Word, Text) und den Copy-&amp;-Paste-Link zu erhalten,
            schließe bitte den <strong className="text-slate-200">{tierLabel}</strong> ab.
          </p>
          <div className="mb-6 flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-slate-100">{priceEur} €</span>
            <span className="text-sm text-slate-400">einmalig</span>
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-300">{error}</p>
          )}
          <button
            type="button"
            onClick={startCheckout}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#c9a227] px-6 py-3 font-semibold text-white transition hover:bg-[#b8921e] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {busy ? "Weiterleitung…" : `Jetzt für ${priceEur} € freischalten`}
          </button>
          {DEV_MOCK_ENABLED && (
            <button
              type="button"
              onClick={devMockPay}
              disabled={busy}
              className="mt-3 w-full rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-50"
              title="Nur im Entwicklungsmodus — simuliert eine erfolgreiche Zahlung ohne Stripe"
            >
              Dev-Mock: als bezahlt markieren
            </button>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Nach der Zahlung bekommst du einen Download-Link per E-Mail. Dein Antrag bleibt
            darüber 30 Tage verfügbar.
          </p>
        </div>
      </div>
    </>
  );
}
