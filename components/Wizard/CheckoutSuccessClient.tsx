"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

interface Props {
  sessionToken: string;
}

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 60000;

type Status = "waiting" | "paid" | "timeout" | "no-token" | "network-error";

export function CheckoutSuccessClient({ sessionToken }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("waiting");
  const [paidToken, setPaidToken] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    if (!sessionToken) {
      setStatus("no-token");
      return;
    }
    const started = Date.now();
    let cancelled = false;
    let consecutiveFailures = 0;

    const interval = setInterval(() => {
      if (!cancelled) setElapsedMs(Date.now() - started);
    }, 250);

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/wizard/${sessionToken}`, { cache: "no-store" });
        if (res.ok) {
          consecutiveFailures = 0;
          setNetworkError(null);
          const body = await res.json();
          if (body.paidToken) {
            setPaidToken(body.paidToken);
            setStatus("paid");
            router.replace(`/antrag/download/${body.paidToken}`);
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

      if (Date.now() - started > MAX_WAIT_MS) {
        setStatus("timeout");
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
  }, [sessionToken, router, restartKey]);

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
        <h1 className="mb-2 text-xl font-semibold text-slate-100">Zahlung bestaetigt</h1>
        <p className="mb-4 text-sm text-slate-300">Dein Antrag wird gleich geoeffnet.</p>
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
      <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-orange-400" />
        <h1 className="mb-2 text-xl font-semibold text-slate-100">
          Freischaltung braucht noch einen Moment
        </h1>
        <p className="mb-4 text-sm text-slate-300">
          Die Zahlung ist durch, aber die Bestaetigung vom Zahlungsanbieter ist noch nicht
          bei uns angekommen. Das passiert normalerweise innerhalb einer Minute.
        </p>
        <p className="mb-5 text-xs text-slate-400">
          Du kannst diese Seite schliessen — sobald die Bestaetigung kommt, ist der Antrag
          unter „Meine Antraege" erreichbar. Oder du wartest hier weiter:
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Weiter warten
          </button>
          <Link
            href="/antrag/meine"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Zu meinen Antraegen
          </Link>
        </div>
      </div>
    );
  }

  if (status === "network-error") {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <h1 className="mb-2 text-xl font-semibold text-slate-100">
          Verbindungsproblem
        </h1>
        <p className="mb-3 text-sm text-slate-300">
          Wir konnten den Zahlungs-Status mehrfach hintereinander nicht abfragen. Pruefe
          deine Verbindung — die Zahlung selbst ist bei Stripe sicher und wird beim
          naechsten Versuch erkannt.
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
        <h1 className="mb-2 text-xl font-semibold text-slate-100">
          Kein Session-Token uebermittelt
        </h1>
        <p className="text-sm text-slate-300">
          Bitte oeffne den Antrag ueber „Meine Antraege".
        </p>
        <Link
          href="/antrag/meine"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Zu meinen Antraegen
        </Link>
      </div>
    );
  }

  // waiting
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const progressPct = Math.min(100, (elapsedMs / MAX_WAIT_MS) * 100);
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-8 text-center">
      <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-[#c9a227]" />
      <h1 className="mb-2 text-xl font-semibold text-slate-100">Zahlung wird bestaetigt</h1>
      <p className="mb-4 text-sm text-slate-400">
        Stripe sendet uns gleich die Bestaetigung. Diese Seite leitet automatisch weiter,
        sobald sie da ist — meist nach wenigen Sekunden.
      </p>
      <div className="mx-auto mb-1 h-1 w-full max-w-xs overflow-hidden rounded-full bg-slate-700/50">
        <div
          className="h-full bg-[#c9a227] transition-all duration-300 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{elapsedSec} s gewartet…</p>
    </div>
  );
}
