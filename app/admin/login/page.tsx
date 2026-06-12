'use client';

/**
 * Admin-Login.
 *
 * Schlichtes Formular, das gegen POST /api/admin/login authentifiziert (setzt
 * das admin_session-Cookie) und danach in den Admin-Bereich weiterleitet.
 * Ziel per ?next=… überschreibbar (Default: /admin/newsletter).
 */

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Nur same-origin-relative Pfade als Redirect-Ziel zulassen (kein Open Redirect):
  // absolute URLs (https://evil), protokoll-relative (//evil) und Backslash-Varianten ablehnen.
  const rawNext = params.get('next') || '/admin/newsletter';
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')
      ? rawNext
      : '/admin/newsletter';

  const [email, setEmail] = useState('office@aitema.de');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        router.push(next);
      } else {
        setError(json.message || 'Anmeldung fehlgeschlagen.');
      }
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{ backgroundColor: '#e7ddc7' }}
      className="min-h-screen flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm bg-[#fffdf7] border border-[#e4d9bf] shadow-[0_2px_28px_rgba(60,50,30,0.12)] rounded-lg p-8">
        <div className="text-center mb-7">
          <div
            className="text-3xl font-bold tracking-tight text-[#23201b]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            EduFunds<span className="text-[#c2772b]">.</span>
          </div>
          <div className="mt-2 text-[11px] tracking-[3px] uppercase text-[#8a8175]">
            Admin-Bereich
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500">E-Mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1f4d3f] focus:ring-1 focus:ring-[#1f4d3f]/30"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Passwort</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1f4d3f] focus:ring-1 focus:ring-[#1f4d3f]/30"
            />
          </label>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !password}
            className="w-full flex items-center justify-center gap-2 bg-[#1f4d3f] text-[#fffdf7] rounded-md py-2.5 text-sm font-semibold hover:bg-[#1a4236] disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Anmelden
          </button>
        </form>
      </div>
    </div>
  );
}
