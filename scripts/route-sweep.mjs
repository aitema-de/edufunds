#!/usr/bin/env node
/**
 * Deterministischer Route-/API-Sweeper für den Test-&-Fix-Loop.
 * Findet 500er/Crashes/Error-Boundaries über alle Bereiche — ohne LLM-Kosten.
 *
 * LLM-Endpunkte (match, wizard/start, wizard/generate, assistant) werden NUR mit
 * ungültigem Body getroffen → erwartet 400/422, löst KEINEN DeepSeek-Call aus.
 *
 * Output: .planning/test-fix/sweep-results.json  (+ Konsolen-Summary)
 * Exit 0 immer (Findungen sind Daten, kein Prozessfehler).
 */
import { writeFileSync, readFileSync } from 'node:fs';

const BASE = process.env.SWEEP_BASE || 'http://localhost:3101';
const DEVLOG = '/tmp/edufunds-dev.log';

// Beispiel-IDs aus dem Katalog
const PROG = 'niedersachsen-sport';

// Error-Marker im gerenderten HTML (200 mit Error-Boundary zählt als Bug)
const ERROR_MARKERS = [
  'Application error',
  'Internal Server Error',
  'Unhandled Runtime Error',
  'This page could not be found',
  'client-side exception',
  'TypeError:',
  'ReferenceError:',
];

// --- Testfälle -------------------------------------------------------------
const PAGES = [
  '/', '/foerderprogramme', `/foerderprogramme/${PROG}`,
  '/preise', '/ueber-uns', '/kontakt', '/registrieren', '/archiv',
  '/impressum', '/datenschutz', '/agb',
  '/antrag/start', '/antrag/meine',
  '/checkout/einzel', '/checkout/jahresabo',
  '/admin/dashboard',
  // bewusst nicht-existente ID → erwartet sauberes 404/Not-Found, kein 500
  '/foerderprogramme/diese-id-gibt-es-nicht-xyz',
];

const GET_APIS = [
  '/api/health', '/api/health/backend', '/api/health/dashboard',
  '/api/foerderprogramme',
];

// POST-Fälle: { path, body, expectMax } — expectMax = höchster akzeptabler Status.
// Ungültige Bodies sollen 400/401/422 geben, NIEMALS 500.
const POST_APIS = [
  // LLM-Endpunkte: nur Invalid-Body (kein echter LLM-Call)
  { path: '/api/match', body: {}, note: 'invalid: kein anliegen → 400' },
  { path: '/api/wizard/start', body: {}, note: 'invalid: kein programmId → 400' },
  { path: '/api/wizard/start', body: { programmId: 'gibt-es-nicht' }, note: 'unbekanntes programm → 4xx' },
  { path: '/api/wizard/answer', body: {}, note: 'invalid → 4xx' },
  { path: '/api/wizard/generate', body: {}, note: 'invalid → 4xx' },
  { path: '/api/wizard/readiness', body: {}, note: 'invalid → 4xx' },
  { path: '/api/assistant/generate', body: {}, note: 'invalid → 4xx' },
  // Nicht-LLM
  { path: '/api/contact', body: {}, note: 'invalid → 400' },
  { path: '/api/contact', body: { name: 'Test', email: 'keine-mail', nachricht: 'x' }, note: 'ungültige email → 400' },
  { path: '/api/feedback', body: {}, note: 'invalid → 400' },
  { path: '/api/feedback', body: { type: 'bug', message: 'Sweep-Testmeldung', url: '/' }, note: 'gültig → 2xx (kein token = skip ok)' },
  { path: '/api/newsletter', body: {}, note: 'invalid → 400' },
  { path: '/api/newsletter', body: { email: 'keine-mail' }, note: 'ungültige email → 400' },
  { path: '/api/vitals', body: { name: 'LCP', value: 1 }, note: 'gültig → 2xx' },
  { path: '/api/admin/login', body: {}, note: 'invalid → 400/401' },
  { path: '/api/admin/login', body: { password: 'falsch-xyz' }, note: 'falsches pw → 401' },
  { path: '/api/wizard/checkout', body: {}, note: 'invalid → 4xx' },
  { path: '/api/checkout', body: {}, note: 'invalid → 4xx' },
  { path: '/api/stripe/checkout', body: {}, note: 'invalid → 4xx' },
  { path: '/api/stripe/verify', body: {}, note: 'invalid → 4xx' },
  { path: '/api/paypal', body: {}, note: 'invalid → 4xx' },
];

const findings = [];
function bug(area, severity, route, detail, evidence) {
  findings.push({ area, severity, route, detail, evidence });
}

async function fetchSafe(url, opts) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(20000) });
    const text = await res.text().catch(() => '');
    return { status: res.status, text, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, text: '', ms: Date.now() - t0, err: String(e?.message || e) };
  }
}

function devlogTail() {
  try { return readFileSync(DEVLOG, 'utf8').split('\n').slice(-400); } catch { return []; }
}

async function run() {
  const logBefore = devlogTail().length;

  // --- Pages ---
  for (const p of PAGES) {
    const r = await fetchSafe(BASE + p);
    const is404Expected = p.includes('gibt-es-nicht');
    if (r.status === 0) { bug('pages', 'high', `GET ${p}`, `Request fehlgeschlagen: ${r.err}`, ''); continue; }
    if (r.status >= 500) { bug('pages', 'high', `GET ${p}`, `Server-Error ${r.status}`, r.text.slice(0, 300)); continue; }
    if (r.status === 404 && !is404Expected) { bug('pages', 'medium', `GET ${p}`, `Unerwartetes 404`, ''); continue; }
    if (r.status === 200 && is404Expected) { bug('pages', 'low', `GET ${p}`, `Nicht-existente ID liefert 200 statt 404`, ''); }
    const marker = ERROR_MARKERS.find(m => r.text.includes(m));
    if (marker && !is404Expected) bug('pages', 'high', `GET ${p}`, `Error-Boundary/Marker im HTML: "${marker}"`, r.text.slice(Math.max(0, r.text.indexOf(marker) - 80), r.text.indexOf(marker) + 120));
  }

  // --- GET APIs ---
  for (const a of GET_APIS) {
    const r = await fetchSafe(BASE + a);
    if (r.status === 0) bug('api', 'high', `GET ${a}`, `Request fehlgeschlagen: ${r.err}`, '');
    else if (r.status >= 500) bug('api', 'high', `GET ${a}`, `Server-Error ${r.status}`, r.text.slice(0, 300));
    else if (r.status >= 400) bug('api', 'medium', `GET ${a}`, `Client-Error ${r.status} auf GET`, r.text.slice(0, 200));
  }

  // --- POST APIs ---
  for (const c of POST_APIS) {
    const r = await fetchSafe(BASE + c.path, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c.body),
    });
    if (r.status === 0) { bug('api', 'high', `POST ${c.path}`, `Request fehlgeschlagen: ${r.err} [${c.note}]`, ''); continue; }
    // 500 auf ungültigen Body = klarer Bug (fehlende Validierung)
    if (r.status >= 500) bug('api', 'high', `POST ${c.path}`, `Server-Error ${r.status} bei [${c.note}]`, r.text.slice(0, 300));
  }

  // --- Dev-Log auf neue Fehler scannen ---
  const after = devlogTail();
  const newLines = after.slice(Math.max(0, after.length - (after.length - logBefore)));
  const errLines = after.filter(l => /\b(Error|unhandledRejection|TypeError|ECONNREFUSED|⨯)\b/.test(l) && !l.includes('middleware') && !l.includes('deprecated'));
  if (errLines.length) bug('server', 'medium', 'dev-log', `${errLines.length} Fehlerzeile(n) im Dev-Log während Sweep`, errLines.slice(-8).join('\n'));

  const out = {
    base: BASE,
    ranAt: new Date().toISOString(),
    counts: { pages: PAGES.length, getApis: GET_APIS.length, postApis: POST_APIS.length, findings: findings.length },
    findings,
  };
  writeFileSync(new URL('../.planning/test-fix/sweep-results.json', import.meta.url), JSON.stringify(out, null, 2));
  console.log(`Sweep fertig: ${findings.length} Findung(en).`);
  for (const f of findings) console.log(`  [${f.severity}] ${f.route} — ${f.detail}`);
}
run();
