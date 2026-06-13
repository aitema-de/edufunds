'use client';

/**
 * Admin – Newsletter-Verwaltung
 *
 * Liste der Ausgaben (Entwurf → freigegeben → versendet), Live-HTML-Vorschau,
 * Bearbeitung des redaktionellen Teils, Testversand, Freigabe und Live-Versand.
 * Auth läuft über das admin_session-Cookie (same-origin fetch).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Mail, Plus, RefreshCw, Send, CheckCircle, Eye, Save,
  Users, FileText, AlertTriangle, Loader2,
} from 'lucide-react';

interface NewsItem { text: string; url?: string }
interface Program {
  name: string; funder: string; deadline: string;
  targetGroup: string; description: string; url: string;
}
interface NewsletterData {
  issueNumber: string; issueDate: string; leadTitle: string; leadContent: string;
  signature?: string;
  programs: Program[]; tipTitle: string; tipContent: string;
  insightCategory: string; insightReadTime: number; insightTitle: string;
  insightContent: string; insightCtaText?: string; insightCtaUrl?: string;
  newsItems: NewsItem[]; year: number;
}
interface Issue {
  id: number; issueNumber: string; subject: string | null;
  status: 'draft' | 'approved' | 'sending' | 'sent' | 'failed';
  data: NewsletterData; generatedBy: string; llmProvider: string | null;
  createdAt: string; sentAt: string | null;
  sendStats: { total: number; successful: number; failed: number } | null;
}

const STATUS_LABEL: Record<Issue['status'], { text: string; cls: string }> = {
  draft: { text: 'Entwurf', cls: 'bg-gray-100 text-gray-700' },
  approved: { text: 'Freigegeben', cls: 'bg-blue-100 text-blue-700' },
  sending: { text: 'Versand läuft', cls: 'bg-amber-100 text-amber-700' },
  sent: { text: 'Versendet', cls: 'bg-green-100 text-green-700' },
  failed: { text: 'Fehlgeschlagen', cls: 'bg-red-100 text-red-700' },
};

export default function NewsletterAdminPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [subscribers, setSubscribers] = useState<number>(0);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [draft, setDraft] = useState<NewsletterData | null>(null);
  const [subject, setSubject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/newsletter/issues', { credentials: 'include' });
      if (res.status === 401) {
        window.location.href = '/admin/login?next=/admin/newsletter';
        return;
      }
      const json = await res.json();
      if (json.success) {
        setIssues(json.issues);
        setSubscribers(json.confirmedSubscribers);
      }
    } catch {
      setMsg({ kind: 'err', text: 'Liste konnte nicht geladen werden.' });
    } finally {
      setLoading(false);
    }
  }, []);

  const openIssue = useCallback(async (id: number) => {
    setBusy('open');
    setMsg(null);
    try {
      const res = await fetch(`/api/newsletter/issues/${id}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setSelected(json.issue);
        setDraft(json.issue.data);
        setSubject(json.issue.subject ?? '');
        setPreviewHtml(json.preview?.html ?? '');
      }
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // Deep-Link aus der Benachrichtigung: ?issue=ID
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('issue');
    if (id) openIssue(Number(id));
  }, [openIssue]);

  const generate = async () => {
    setBusy('generate');
    setMsg(null);
    try {
      const res = await fetch('/api/newsletter/issues', { method: 'POST', credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setMsg({ kind: 'ok', text: `Neuer Entwurf erstellt: ${json.issue.issueNumber}` });
        await loadList();
        await openIssue(json.issue.id);
      } else {
        setMsg({ kind: 'err', text: json.message || 'Generierung fehlgeschlagen' });
      }
    } catch {
      setMsg({ kind: 'err', text: 'Generierung fehlgeschlagen' });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!selected || !draft) return;
    setBusy('save');
    setMsg(null);
    try {
      const res = await fetch(`/api/newsletter/issues/${selected.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: draft, subject: subject || null }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ kind: 'ok', text: 'Gespeichert. Vorschau aktualisiert.' });
        await loadList();
        await openIssue(selected.id);
      } else {
        setMsg({ kind: 'err', text: json.message || 'Speichern fehlgeschlagen' });
      }
    } finally {
      setBusy(null);
    }
  };

  const approve = async () => {
    if (!selected) return;
    setBusy('approve');
    try {
      const res = await fetch(`/api/newsletter/issues/${selected.id}/approve`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      setMsg(json.success
        ? { kind: 'ok', text: 'Freigegeben. Versand ist jetzt möglich.' }
        : { kind: 'err', text: json.message || 'Freigabe fehlgeschlagen' });
      await loadList();
      if (json.success) await openIssue(selected.id);
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    if (!selected) return;
    const email = window.prompt('Test-E-Mail-Adresse:');
    if (!email) return;
    setBusy('test');
    try {
      const res = await fetch(`/api/newsletter/issues/${selected.id}/send`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, testEmails: [email] }),
      });
      const json = await res.json();
      setMsg(json.success
        ? { kind: 'ok', text: `Testversand an ${email} gesendet (${json.stats?.successful ?? 1} ok).` }
        : { kind: 'err', text: `Testversand fehlgeschlagen: ${json.error || json.message || 'unbekannter Fehler'}` });
    } finally {
      setBusy(null);
    }
  };

  const sendLive = async () => {
    if (!selected) return;
    if (!window.confirm(`Newsletter wirklich an ${subscribers} bestätigte Abonnenten versenden?`)) return;
    setBusy('send');
    try {
      const res = await fetch(`/api/newsletter/issues/${selected.id}/send`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      setMsg(json.success
        ? { kind: 'ok', text: `Versendet: ${json.stats.successful}/${json.stats.total} erfolgreich.` }
        : { kind: 'err', text: json.message || 'Versand fehlgeschlagen' });
      await loadList();
      if (json.success) await openIssue(selected.id);
    } finally {
      setBusy(null);
    }
  };

  const editable = selected && selected.status !== 'sent' && selected.status !== 'sending';
  const canApprove = selected?.status === 'draft';
  const canSend = selected?.status === 'approved';

  const upd = (patch: Partial<NewsletterData>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Mail className="w-7 h-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Newsletter-Verwaltung</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" /> {subscribers} bestätigte Abonnenten
            </span>
            <button onClick={loadList} className="p-2 rounded hover:bg-gray-200" title="Aktualisieren">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={generate}
              disabled={busy === 'generate'}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === 'generate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Neuen Entwurf erstellen
            </button>
          </div>
        </header>

        {msg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${msg.kind === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste */}
          <div className="lg:col-span-1 space-y-2">
            {issues.length === 0 && !loading && (
              <div className="text-sm text-gray-500 bg-white rounded-lg p-4 border">
                Noch keine Ausgaben. „Neuen Entwurf erstellen" startet die erste.
              </div>
            )}
            {issues.map((it) => {
              const s = STATUS_LABEL[it.status];
              return (
                <button
                  key={it.id}
                  onClick={() => openIssue(it.id)}
                  className={`w-full text-left bg-white rounded-lg p-4 border transition ${selected?.id === it.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{it.issueNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.text}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">{it.data.leadTitle}</div>
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    {it.generatedBy === 'cron' ? 'Auto' : 'Manuell'}
                    {it.llmProvider ? ` · ${it.llmProvider}` : ''}
                    {it.sendStats ? ` · ${it.sendStats.successful}/${it.sendStats.total} versendet` : ''}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {!selected || !draft ? (
              <div className="bg-white rounded-lg border p-10 text-center text-gray-400">
                <Eye className="w-8 h-8 mx-auto mb-2" />
                Ausgabe links auswählen oder neuen Entwurf erstellen.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Aktionsleiste */}
                <div className="bg-white rounded-lg border p-4 flex flex-wrap items-center gap-2">
                  <button onClick={save} disabled={!editable || busy === 'save'}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm">
                    <Save className="w-4 h-4" /> Speichern
                  </button>
                  <button onClick={sendTest} disabled={busy === 'test'}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm">
                    <Send className="w-4 h-4" /> Testversand
                  </button>
                  <button onClick={approve} disabled={!canApprove || busy === 'approve'}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm">
                    <CheckCircle className="w-4 h-4" /> Freigeben
                  </button>
                  <button onClick={sendLive} disabled={!canSend || busy === 'send'}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm">
                    {busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    An alle versenden
                  </button>
                  {!canSend && selected.status === 'draft' && (
                    <span className="text-xs text-amber-600 flex items-center gap-1 ml-auto">
                      <AlertTriangle className="w-3 h-3" /> Erst freigeben, dann versenden
                    </span>
                  )}
                </div>

                {/* Editor + Vorschau */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">Inhalt bearbeiten</h3>
                    <Field label="Betreff (optional, überschreibt Default)">
                      <input className="inp" value={subject} disabled={!editable}
                        onChange={(e) => setSubject(e.target.value)} />
                    </Field>
                    <Field label="Editorial – Titel">
                      <input className="inp" value={draft.leadTitle} disabled={!editable}
                        onChange={(e) => upd({ leadTitle: e.target.value })} />
                    </Field>
                    <Field label="Persönlicher Brief (Editorial-Text)">
                      <textarea className="inp h-32" value={draft.leadContent} disabled={!editable}
                        onChange={(e) => upd({ leadContent: e.target.value })} />
                    </Field>
                    <Field label="Unterschrift">
                      <input className="inp" value={draft.signature ?? ''} disabled={!editable}
                        placeholder="Kolja & das EduFunds-Team"
                        onChange={(e) => upd({ signature: e.target.value })} />
                    </Field>
                    <Field label="Praxis-Tipp – Titel">
                      <input className="inp" value={draft.tipTitle} disabled={!editable}
                        onChange={(e) => upd({ tipTitle: e.target.value })} />
                    </Field>
                    <Field label="Praxis-Tipp – Text">
                      <textarea className="inp h-24" value={draft.tipContent} disabled={!editable}
                        onChange={(e) => upd({ tipContent: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Insight – Kategorie">
                        <input className="inp" value={draft.insightCategory} disabled={!editable}
                          onChange={(e) => upd({ insightCategory: e.target.value })} />
                      </Field>
                      <Field label="Lesezeit (Min.)">
                        <input type="number" className="inp" value={draft.insightReadTime} disabled={!editable}
                          onChange={(e) => upd({ insightReadTime: Number(e.target.value) || 1 })} />
                      </Field>
                    </div>
                    <Field label="Insight – Titel">
                      <input className="inp" value={draft.insightTitle} disabled={!editable}
                        onChange={(e) => upd({ insightTitle: e.target.value })} />
                    </Field>
                    <Field label="Insight – Text">
                      <textarea className="inp h-32" value={draft.insightContent} disabled={!editable}
                        onChange={(e) => upd({ insightContent: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="CTA-Text">
                        <input className="inp" value={draft.insightCtaText ?? ''} disabled={!editable}
                          onChange={(e) => upd({ insightCtaText: e.target.value })} />
                      </Field>
                      <Field label="CTA-URL">
                        <input className="inp" value={draft.insightCtaUrl ?? ''} disabled={!editable}
                          onChange={(e) => upd({ insightCtaUrl: e.target.value })} />
                      </Field>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Vorgestellte Programme (automatisch aus Katalog)
                      </div>
                      <ul className="text-sm text-gray-700 list-disc pl-5 space-y-0.5">
                        {draft.programs.map((p, i) => (
                          <li key={i}>{p.name} <span className="text-gray-400">– {p.funder}</span></li>
                        ))}
                      </ul>
                    </div>

                    <NewsEditor
                      items={draft.newsItems}
                      disabled={!editable}
                      onChange={(newsItems) => upd({ newsItems })}
                    />
                  </div>

                  {/* Vorschau */}
                  <div className="bg-white rounded-lg border overflow-hidden flex flex-col">
                    <div className="px-4 py-2 border-b text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Vorschau
                    </div>
                    <iframe
                      title="Newsletter-Vorschau"
                      srcDoc={previewHtml}
                      className="w-full flex-1 min-h-[600px] bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(.inp) {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        :global(.inp:focus) { border-color: #3b82f6; box-shadow: 0 0 0 1px #93c5fd; }
        :global(.inp:disabled) { background: #f9fafb; color: #6b7280; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NewsEditor({
  items, disabled, onChange,
}: { items: NewsItem[]; disabled: boolean; onChange: (items: NewsItem[]) => void }) {
  const set = (i: number, patch: Partial<NewsItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div className="pt-2 border-t">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">Kurzmeldungen</span>
        {!disabled && (
          <button type="button" className="text-xs text-blue-600 hover:underline"
            onClick={() => onChange([...items, { text: '' }])}>+ Meldung</button>
        )}
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1">
              <input className="inp" placeholder="Text" value={it.text} disabled={disabled}
                onChange={(e) => set(i, { text: e.target.value })} />
              <input className="inp" placeholder="URL (optional, edufunds.org)" value={it.url ?? ''} disabled={disabled}
                onChange={(e) => set(i, { url: e.target.value || undefined })} />
            </div>
            {!disabled && (
              <button type="button" className="text-red-500 text-xs mt-2"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}>✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
