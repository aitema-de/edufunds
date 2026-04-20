"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  sessionToken: string;
}

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 60000;

export function CheckoutSuccessClient({ sessionToken }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"waiting" | "paid" | "timeout" | "error">("waiting");
  const [paidToken, setPaidToken] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionToken) {
      setStatus("error");
      return;
    }
    const started = Date.now();
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/wizard/${sessionToken}`, { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          if (body.paidToken) {
            setPaidToken(body.paidToken);
            setStatus("paid");
            router.replace(`/antrag/download/${body.paidToken}`);
            return;
          }
        }
      } catch {
        // ignore, wir pollen weiter
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
    };
  }, [sessionToken, router]);

  if (status === "paid" && paidToken) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
        <h1 className="mb-2 text-xl font-semibold text-slate-100">Zahlung bestätigt</h1>
        <p className="mb-4 text-sm text-slate-300">
          Dein Antrag wird gleich geöffnet.
        </p>
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
        <h1 className="mb-2 text-xl font-semibold text-slate-100">
          Freischaltung braucht noch einen Moment
        </h1>
        <p className="mb-4 text-sm text-slate-300">
          Die Zahlung ist durch, aber die Bestätigung vom Zahlungsanbieter ist noch nicht bei uns
          angekommen. Das passiert normalerweise innerhalb einer Minute. Die Freischaltung läuft
          automatisch — oben rechts siehst du dann deinen Download-Link. Du kannst diese Seite
          schließen; sobald die Bestätigung kommt, ist der Antrag unter „Meine Anträge" erreichbar.
        </p>
        <Link
          href="/antrag/meine"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Zu meinen Anträgen
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold text-slate-100">
          Kein Session-Token übermittelt
        </h1>
        <p className="text-sm text-slate-300">
          Bitte öffne den Antrag über „Meine Anträge".
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-8 text-center">
      <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-[#c9a227]" />
      <h1 className="mb-2 text-xl font-semibold text-slate-100">
        Zahlung wird bestätigt
      </h1>
      <p className="text-sm text-slate-400">
        Das dauert meistens nur ein paar Sekunden. Diese Seite aktualisiert sich automatisch,
        sobald der Zahlungsanbieter bestätigt hat.
      </p>
    </div>
  );
}
