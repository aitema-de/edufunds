"use client";

import { dokumentLabels } from "@/lib/wizard/dokument-label";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

interface Props {
  sessionToken: string;
  /** Stripe-Checkout-Session-ID aus der Redirect-URL (`cs`). Optional. */
  checkoutSessionId?: string;
}

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 60000;
/**
 * Nach dieser Zeit ohne Freischaltung fragen wir Stripe selbst, ob bezahlt wurde.
 * Der Webhook kommt normalerweise in ein bis zwei Sekunden — 12 s sind also bereits
 * ein Hinweis darauf, dass er gar nicht kommt (z. B. weil der Endpoint im
 * Stripe-Dashboard noch auf die alte Domain zeigt, Runbook 9.5). Ohne diesen
 * Rueckfall haette der Kunde gezahlt und bekaeme nichts.
 */
const RECONCILE_AFTER_MS = 12000;

type Status = "waiting" | "paid" | "timeout" | "no-token" | "network-error";

export function CheckoutSuccessClient({ sessionToken, checkoutSessionId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("waiting");
  const [paidToken, setPaidToken] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);
  // 86cabdzwk: per-Programm-Dokumentlabel aus dem Status-Response (Default "Antrag").
  const [labels, setLabels] = useState(() => dokumentLabels());

  useEffect(() => {
    if (!sessionToken) {
      setStatus("no-token");
      return;
    }
    const started = Date.now();
    let cancelled = false;
    let consecutiveFailures = 0;
    let reconcileTried = false;

    const interval = setInterval(() => {
      if (!cancelled) setElapsedMs(Date.now() - started);
    }, 250);

    const succeed = (token: string) => {
      setPaidToken(token);
      setStatus("paid");
      router.replace(`/antrag/download/${token}`);
    };

    /**
     * Sicherheitsnetz: Stripe direkt fragen, ob bezahlt wurde. Nur sinnvoll, wenn
     * die Checkout-Session-ID vorliegt. Bei Erfolg wird serverseitig freigeschaltet
     * — dieselbe Wirkung wie der Webhook.
     */
    const tryReconcile = async (): Promise<boolean> => {
      if (reconcileTried || !checkoutSessionId) return false;
      reconcileTried = true;
      try {
        const res = await fetch("/api/wizard/checkout/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken, cs: checkoutSessionId }),
        });
        if (!res.ok) return false;
        const body = await res.json();
        if (body.ok && body.paidToken) {
          if (!cancelled) succeed(body.paidToken);
          return true;
        }
      } catch {
        // Still: Der normale Poll laeuft weiter, der Timeout-Text bleibt der Fallback.
      }
      return false;
    };

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/wizard/${sessionToken}`, { cache: "no-store" });
        if (res.ok) {
          consecutiveFailures = 0;
          setNetworkError(null);
          const body = await res.json();
          if (body.dokumentLabel) setLabels(dokumentLabels(body.dokumentLabel, body.dokumentLabelGenus));
          if (body.paidToken) {
            succeed(body.paidToken);
            return;
          }
        } else {
          consecutiveFailures += 1;
        }
      } catch (e) {
        consecutiveFailures += 1;
        setNetworkError(e instanceof Error ? e.message : "Netzwerkfehler");
      }

      // Mehr als ~10 s in Folge keine erreichbare API -> Network-Fehler-State.
      if (consecutiveFailures >= 5) {
        setStatus("network-error");
        return;
      }

      // Webhook bleibt aus? Dann selbst bei Stripe nachfragen, statt weiter zu warten.
      if (Date.now() - started > RECONCILE_AFTER_MS && !reconcileTried) {
        if (await tryReconcile()) return;
      }

      if (Date.now() - started > MAX_WAIT_MS) {
        // Letzter Versuch, bevor wir den Kunden vertroesten.
        if (await tryReconcile()) return;
        if (!cancelled) setStatus("timeout");
        return;
      }
      if (!cancelled) setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // restartKey bewusst dabei — Retry-Button setzt ihn hoch, was den Effekt neu startet.
  }, [sessionToken, checkoutSessionId, router, restartKey]);

  const restart = () => {
    setStatus("waiting");
    setElapsedMs(0);
    setNetworkError(null);
    setRestartKey((k) => k + 1);
  };

  if (status === "paid" && paidToken) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
        <h1 className="mb-2 text-xl font-semibold text-[#1c1917]">Zahlung bestätigt</h1>
        <p className="mb-4 text-sm text-slate-700">{labels.ihr} wird gleich geöffnet.</p>
        <Link
          href={`/antrag/download/${paidToken}`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Direkt zum Download
        </Link>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="rounded-xl border border-[#1e3d32]/40 bg-[#1e3d32]/10 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#1e3d32]" />
        <h1 className="mb-2 text-xl font-semibold text-[#1c1917]">
          Freischaltung braucht noch einen Moment
        </h1>
        <p className="mb-4 text-sm text-slate-700">
          Die Zahlung ist durch, aber die Bestätigung vom Zahlungsanbieter ist noch nicht
          bei uns angekommen. Das passiert normalerweise innerhalb einer Minute.
        </p>
        <p className="mb-5 text-xs text-slate-600">
          Sie können diese Seite schließen — sobald die Bestätigung kommt, ist {labels.der}
          unter „Meine Anträge" erreichbar. Oder Sie warten hier weiter:
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1c1917]/20 bg-white px-4 py-2 text-sm text-[#1c1917] hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Weiter warten
          </button>
          <Link
            href="/antrag/meine"
            className="inline-flex items-center gap-2 rounded-lg border border-[#1c1917]/15 px-4 py-2 text-sm text-[#57534e] hover:bg-white"
          >
            Zu meinen Anträgen
          </Link>
        </div>
      </div>
    );
  }

  if (status === "network-error") {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <h1 className="mb-2 text-xl font-semibold text-[#1c1917]">
          Verbindungsproblem
        </h1>
        <p className="mb-3 text-sm text-slate-700">
          Wir konnten den Zahlungs-Status mehrfach hintereinander nicht abfragen. Prüfen Sie
          Ihre Verbindung — die Zahlung selbst ist bei Stripe sicher und wird beim
          nächsten Versuch erkannt.
        </p>
        {networkError && (
          <p className="mb-4 font-mono text-xs text-red-300">{networkError}</p>
        )}
        <button
          type="button"
          onClick={restart}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (status === "no-token") {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <h1 className="mb-2 text-xl font-semibold text-[#1c1917]">
          Kein Session-Token übermittelt
        </h1>
        <p className="text-sm text-slate-700">
          Bitte öffnen Sie {labels.den} über „Meine Anträge".
        </p>
        <Link
          href="/antrag/meine"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#1c1917]/15 px-4 py-2 text-sm text-[#57534e] hover:bg-white"
        >
          Zu meinen Anträgen
        </Link>
      </div>
    );
  }

  // waiting
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const progressPct = Math.min(100, (elapsedMs / MAX_WAIT_MS) * 100);
  return (
    <div className="rounded-xl border border-[#1c1917]/10 bg-white p-8 text-center">
      <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-[#1e3d32]" />
      <h1 className="mb-2 text-xl font-semibold text-[#1c1917]">Zahlung wird bestätigt</h1>
      <p className="mb-4 text-sm text-slate-600">
        Stripe sendet uns gleich die Bestätigung. Diese Seite leitet automatisch weiter,
        sobald sie da ist — meist nach wenigen Sekunden.
      </p>
      <div className="mx-auto mb-1 h-1 w-full max-w-xs overflow-hidden rounded-full bg-[#fdfdfc]">
        <div
          className="h-full bg-[#1e3d32] transition-all duration-300 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{elapsedSec} s gewartet…</p>
    </div>
  );
}
