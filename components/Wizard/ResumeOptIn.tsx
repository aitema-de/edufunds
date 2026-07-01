"use client";

import { useState } from "react";
import { Loader2, Check, Smartphone } from "lucide-react";

/**
 * Opt-in im Wizard (B4): Autor kann den Antrag an seine E-Mail binden, um auf
 * einem anderen Gerät weiterzumachen. Bindung ist freiwillig; ein Magic-Link
 * gibt die geräteübergreifende Liste „Meine Anträge" frei.
 */
export function ResumeOptIn({ sessionToken }: { sessionToken: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/antrag/bind-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Speichern fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
      setDone(true);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-slate-700">
        <div className="flex items-center gap-2 font-medium text-emerald-700">
          <Check className="h-4 w-4" />
          Gesichert
        </div>
        <p className="mt-1 text-slate-600">
          Wir haben einen Link an <strong>{email.trim()}</strong> geschickt. Öffnen Sie ihn auf
          jedem Gerät, um hier weiterzumachen – unter „Meine Anträge".
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#1c1917]/15 bg-white/70 px-3 py-2 text-sm text-[#57534e] transition hover:border-[#1e3d32]/50 hover:bg-[#1e3d32]/5"
      >
        <Smartphone className="h-4 w-4 text-[#1e3d32]" />
        Auf anderem Gerät weitermachen
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-[#1e3d32]/30 bg-[#1e3d32]/5 px-4 py-3"
    >
      <label className="block text-sm font-medium text-[#57534e]">
        Auf anderem Gerät weitermachen
      </label>
      <p className="mt-0.5 mb-2 text-xs text-slate-600">
        Tragen Sie Ihre E-Mail ein – wir schicken Ihnen einen Link, mit dem Sie diesen Antrag überall
        wiederfinden. Kein Konto, kein Passwort.
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
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3d32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a5244] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Link senden
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
