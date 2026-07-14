'use client';

/**
 * Admin – Rechnungsbestellungen
 *
 * Zahlungseingang verbuchen und stornieren. Ohne diese Seite gab es keinen Weg,
 * eine Bestellung je auf 'paid' zu setzen — und weil die Bremse gegen unbezahlte
 * Sofort-Freischaltungen offene Bestellungen zaehlt, sperrte sie nach zwei
 * bezahlten Bestellungen den eigenen Stammkunden aus.
 *
 * Auth laeuft ueber das admin_session-Cookie (same-origin fetch).
 */

import { useCallback, useEffect, useState } from 'react';
import { Receipt, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2, Lock, Scissors } from 'lucide-react';

type OrderStatus = 'payment_pending' | 'paid' | 'cancelled';

interface Order {
  id: number;
  orderNumber: string;
  packId: string;
  credits: number;
  amountCents: number;
  orgName: string;
  contactName: string;
  email: string;
  creditCode: string | null;
  sessionToken: string | null;
  status: OrderStatus;
  dueDate: string | null;
  creditsGesperrt: boolean;
  institutionell: boolean;
  genutzteCredits: number | null;
  settledAmountCents: number | null;
  createdAt: string;
  tageUeberfaellig: number | null;
}

/** Einzelpreis in Cent — Basis der anteiligen Abrechnung (vgl. lib/payments/packs.ts). */
const EINZELPREIS_CENTS = 2990;

/** Was waere bei anteiliger Abrechnung zu fordern? Reine Vorschau, ohne Seiteneffekt. */
function proRataVorschau(o: Order): { genutzt: number; forderung: number; gutschrift: number } | null {
  if (o.genutzteCredits === null || o.credits <= 1) return null; // Einzelantrag: nichts aufzuteilen
  const genutzt = o.genutzteCredits;
  const forderung = Math.min(genutzt * EINZELPREIS_CENTS, o.amountCents);
  return { genutzt, forderung, gutschrift: o.amountCents - forderung };
}

const eur = (cents: number) =>
  (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const STATUS_LABEL: Record<OrderStatus, string> = {
  payment_pending: 'Offen',
  paid: 'Bezahlt',
  cancelled: 'Storniert',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | 'alle'>('alle');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === 'alle' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/admin/orders${qs}`);
      if (!res.ok) throw new Error(`Laden fehlgeschlagen (${res.status})`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(orderNumber: string, action: 'paid' | 'cancel' | 'settle', hinweis?: string) {
    if (action === 'cancel' && !confirm(`Bestellung ${orderNumber} wirklich stornieren?`)) return;
    if (action === 'settle' && !confirm(hinweis ?? `Bestellung ${orderNumber} anteilig abrechnen?`)) return;
    const reason =
      action === 'cancel' ? prompt('Grund für das Storno?', 'Nicht bezahlt') ?? 'Storno durch Admin' : undefined;

    setBusy(orderNumber);
    setError(null);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, action, reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Aktion fehlgeschlagen (${res.status})`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setBusy(null);
    }
  }

  const offen = orders.filter((o) => o.status === 'payment_pending');
  const ueberfaellig = offen.filter((o) => (o.tageUeberfaellig ?? -1) > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Receipt className="w-7 h-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Rechnungsbestellungen</h1>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Neu laden
          </button>
        </header>

        {(offen.length > 0 || ueberfaellig.length > 0) && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-2xl font-bold text-gray-900">{offen.length}</div>
              <div className="text-sm text-gray-600">offen</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-2xl font-bold text-amber-600">{ueberfaellig.length}</div>
              <div className="text-sm text-gray-600">überfällig</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-2xl font-bold text-gray-900">
                {eur(offen.reduce((s, o) => s + o.amountCents, 0))}
              </div>
              <div className="text-sm text-gray-600">offene Forderungen</div>
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-2">
          {(['alle', 'payment_pending', 'paid', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === f ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'
              }`}
            >
              {f === 'alle' ? 'Alle' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 p-6 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Lade…
          </div>
        ) : orders.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
            Keine Bestellungen.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="p-3 font-medium">Bestellung</th>
                  <th className="p-3 font-medium">Organisation</th>
                  <th className="p-3 font-medium">Betrag</th>
                  <th className="p-3 font-medium">Fällig</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const overdue = o.status === 'payment_pending' && (o.tageUeberfaellig ?? -1) > 0;
                  const pr = proRataVorschau(o);
                  return (
                    <tr key={o.id} className="border-b border-gray-100 last:border-0">
                      <td className="p-3">
                        <div className="font-mono text-xs text-gray-900">{o.orderNumber}</div>
                        <div className="text-xs text-gray-500">
                          {o.packId} · {o.credits} {o.credits === 1 ? 'Antrag' : 'Anträge'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-gray-900">{o.orgName}</div>
                        <div className="text-xs text-gray-500">{o.email}</div>
                        {!o.institutionell && (
                          <div className="mt-0.5 text-xs text-gray-500">
                            Domain ohne Schul-/Trägermerkmal — lohnt einen Blick
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-gray-900">
                        {o.settledAmountCents !== null ? (
                          <>
                            <div className="font-medium">{eur(o.settledAmountCents)}</div>
                            <div className="text-xs text-gray-500 line-through">{eur(o.amountCents)}</div>
                            <div className="text-xs text-gray-500">anteilig abgerechnet</div>
                          </>
                        ) : (
                          eur(o.amountCents)
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={overdue ? 'font-medium text-amber-700' : 'text-gray-600'}>
                          {o.dueDate ?? '—'}
                        </span>
                        {overdue && (
                          <div className="text-xs text-amber-700">
                            {o.tageUeberfaellig} Tage überfällig
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            o.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : o.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {STATUS_LABEL[o.status]}
                        </span>
                        {o.creditsGesperrt && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-red-700">
                            <Lock className="w-3 h-3" />
                            Kontingent gesperrt
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {o.status === 'payment_pending' ? (
                          <div className="flex gap-2">
                            <button
                              disabled={busy === o.orderNumber}
                              onClick={() => act(o.orderNumber, 'paid')}
                              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Bezahlt
                            </button>
                            {pr && o.settledAmountCents === null && (
                              <button
                                disabled={busy === o.orderNumber}
                                onClick={() =>
                                  act(
                                    o.orderNumber,
                                    'settle',
                                    `Anteilig abrechnen?\n\n${pr.genutzt} von ${o.credits} Anträgen genutzt.\n` +
                                      `Forderung: ${eur(pr.forderung)} statt ${eur(o.amountCents)}.\n` +
                                      `Die ${o.credits - pr.genutzt} offenen Credits verfallen.`
                                  )
                                }
                                title={`${pr.genutzt} genutzt → ${eur(pr.forderung)} statt ${eur(o.amountCents)}`}
                                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                              >
                                <Scissors className="w-3.5 h-3.5" />
                                Anteilig ({eur(pr.forderung)})
                              </button>
                            )}
                            <button
                              disabled={busy === o.orderNumber}
                              onClick={() => act(o.orderNumber, 'cancel')}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Storno
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
