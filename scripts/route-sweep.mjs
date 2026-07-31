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

/**
 * Die Seitenliste kommt aus dem BUILD-MANIFEST, nicht aus einer Handliste.
 *
 * Grund (Befund 30.07.2026): Die frueher hier fest eingetragenen 15 Seiten waren
 * veraltet. Neun echte Seiten wurden nie gesweept — darunter der komplette
 * Kontingent-Kaufbereich (/kontingent, /kontingent/uebersicht), alle drei
 * Admin-Seiten, /avv, der Wizard-Einstieg /antrag/[programmId] und die
 * Download-Seite. Umgekehrt standen zwei Seiten drin, die es nicht mehr gibt
 * (/checkout/einzel, /checkout/jahresabo) — die haben als "unerwartetes 404"
 * Rauschen erzeugt. Eine Handliste veraltet lautlos; ein Manifest nicht.
 *
 * Voraussetzung: `next build` muss gelaufen sein (.next/server/app-paths-manifest.json).
 * Fehlt das Manifest, faellt der Sweeper auf eine Minimalliste zurueck und meldet das.
 */
const PARAM_BEISPIELE = {
  '[id]': PROG,
  '[programmId]': PROG,
  // Bewusst ein zufaelliges Token: hier wird geprueft, dass die Seite ohne
  // gueltige Zahlung NICHTS ausliefert — nicht, dass sie ein Dokument zeigt.
  '[token]': '00000000-0000-4000-8000-000000000000',
};

function seitenAusManifest() {
  try {
    const manifest = JSON.parse(
      readFileSync(new URL('../.next/server/app-paths-manifest.json', import.meta.url), 'utf8')
    );
    const seiten = Object.keys(manifest)
      .filter((k) => k.endsWith('/page'))
      .map((k) => k.slice(0, -'/page'.length) || '/')
      // interne Next-Sonderrouten
      .filter((p) => !p.startsWith('/_'))
      .map((p) => p.replace(/\[[^\]]+\]/g, (m) => PARAM_BEISPIELE[m] ?? 'beispiel'))
      .sort();
    return { seiten, ausManifest: true };
  } catch {
    return {
      seiten: ['/', '/foerderprogramme', `/foerderprogramme/${PROG}`, '/preise', '/kontakt', '/antrag/start'],
      ausManifest: false,
    };
  }
}

const { seiten: MANIFEST_SEITEN, ausManifest: SEITEN_AUS_MANIFEST } = seitenAusManifest();

const PAGES = [
  ...MANIFEST_SEITEN,
  // bewusst nicht-existente ID → erwartet sauberes 404/Not-Found, kein 500
  '/foerderprogramme/diese-id-gibt-es-nicht-xyz',
];

/** Seiten, auf denen ein 404 bei Beispiel-Parametern korrekt ist. */
const VIERNULLVIER_OK = new Set([
  `/antrag/download/${PARAM_BEISPIELE['[token]']}`,
  '/foerderprogramme/diese-id-gibt-es-nicht-xyz',
]);

// GET-APIs: { path, okStatuses } — okStatuses = zusaetzlich akzeptierte 4xx.
const GET_APIS = [
  { path: '/api/health' },
  { path: '/api/health/backend' },
  // Admin-only seit der Haertung (System-Metriken, Fehlerlogs, Client-IPs).
  // 401 ohne Anmeldung ist hier das RICHTIGE Verhalten, kein Fund.
  { path: '/api/health/dashboard', okStatuses: [401] },
  { path: '/api/foerderprogramme' },
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
  // Bezahl-Routen: ohne Keys ist 503 (Config-Gate) das KORREKTE Verhalten,
  // nur ein 500 waere ein Bug → okStatuses erlaubt das erwartete 503.
  { path: '/api/stripe/checkout', body: {}, okStatuses: [503], note: 'ohne Key → 503 (Config-Gate)' },
  { path: '/api/stripe/verify', body: {}, note: 'invalid → 4xx' },
  { path: '/api/paypal', body: {}, okStatuses: [503], note: 'ohne Credentials → 503 (Config-Gate)' },
];

const findings = [];
function bug(area, severity, route, detail, evidence) {
  findings.push({ area, severity, route, detail, evidence });
}

/**
 * Eigene Client-Kennung fuer den Sweep.
 *
 * Lokal laeuft kein Reverse-Proxy davor, der X-Forwarded-For anhaengt — der Header
 * ist hier also frei setzbar und landet als Rate-Limit-Schluessel im Server. Genau
 * das nutzt der Sweep: ohne eigene Kennung teilt er das Budget mit allem anderen,
 * was von 127.0.0.1 kommt (etwa einem direkt davor gelaufenen Pentest), und
 * meldet dann 429 als "Client-Error" — ein Fund, der nur ein Nachbar-Effekt ist.
 * In Produktion greift das nicht: dort haengt Traefik die echte Peer-IP RECHTS an,
 * und lib/rate-limit.ts liest von rechts.
 */
const SWEEP_XFF = process.env.SWEEP_XFF ?? '203.0.113.201';

async function fetchSafe(url, opts) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { ...(opts?.headers ?? {}), 'X-Forwarded-For': SWEEP_XFF },
      signal: AbortSignal.timeout(20000),
    });
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
  if (!SEITEN_AUS_MANIFEST) {
    bug(
      'setup',
      'medium',
      'app-paths-manifest',
      'Kein .next/server/app-paths-manifest.json — Sweep laeuft auf Minimalliste. Erst `next build` ausfuehren.',
      ''
    );
  }
  for (const p of PAGES) {
    const r = await fetchSafe(BASE + p);
    const is404Expected = VIERNULLVIER_OK.has(p) || p.includes('gibt-es-nicht');
    if (r.status === 0) { bug('pages', 'high', `GET ${p}`, `Request fehlgeschlagen: ${r.err}`, ''); continue; }
    if (r.status >= 500) { bug('pages', 'high', `GET ${p}`, `Server-Error ${r.status}`, r.text.slice(0, 300)); continue; }
    if (r.status === 404 && !is404Expected) { bug('pages', 'medium', `GET ${p}`, `Unerwartetes 404`, ''); continue; }
    if (r.status === 200 && is404Expected) { bug('pages', 'low', `GET ${p}`, `Nicht-existente ID liefert 200 statt 404`, ''); }
    const marker = ERROR_MARKERS.find(m => r.text.includes(m));
    if (marker && !is404Expected) bug('pages', 'high', `GET ${p}`, `Error-Boundary/Marker im HTML: "${marker}"`, r.text.slice(Math.max(0, r.text.indexOf(marker) - 80), r.text.indexOf(marker) + 120));
  }

  // --- GET APIs ---
  for (const eintrag of GET_APIS) {
    const a = eintrag.path;
    const r = await fetchSafe(BASE + a);
    if (r.status === 0) bug('api', 'high', `GET ${a}`, `Request fehlgeschlagen: ${r.err}`, '');
    else if (r.status >= 500) bug('api', 'high', `GET ${a}`, `Server-Error ${r.status}`, r.text.slice(0, 300));
    else if (r.status >= 400 && !eintrag.okStatuses?.includes(r.status))
      bug('api', 'medium', `GET ${a}`, `Client-Error ${r.status} auf GET`, r.text.slice(0, 200));
  }

  // --- POST APIs ---
  for (const c of POST_APIS) {
    const r = await fetchSafe(BASE + c.path, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c.body),
    });
    if (r.status === 0) { bug('api', 'high', `POST ${c.path}`, `Request fehlgeschlagen: ${r.err} [${c.note}]`, ''); continue; }
    // 5xx auf ungültigen Body = Bug (fehlende Validierung), AUSSER explizit
    // erwartete Status (z. B. 503 Config-Gate bei nicht konfigurierten Bezahl-Routen).
    if (r.status >= 500 && !(c.okStatuses?.includes(r.status))) {
      bug('api', 'high', `POST ${c.path}`, `Server-Error ${r.status} bei [${c.note}]`, r.text.slice(0, 300));
    }
  }

  // --- Dev-Log auf neue Fehler scannen ---
  const after = devlogTail();
  const newLines = after.slice(Math.max(0, after.length - (after.length - logBefore)));
  const errLines = after.filter(l => /\b(Error|unhandledRejection|TypeError|ECONNREFUSED|⨯)\b/.test(l) && !l.includes('middleware') && !l.includes('deprecated'));
  if (errLines.length) bug('server', 'medium', 'dev-log', `${errLines.length} Fehlerzeile(n) im Dev-Log während Sweep`, errLines.slice(-8).join('\n'));

  const out = {
    base: BASE,
    ranAt: new Date().toISOString(),
    seitenQuelle: SEITEN_AUS_MANIFEST ? 'build-manifest' : 'fallback-minimalliste',
    gesweepteSeiten: PAGES,
    counts: { pages: PAGES.length, getApis: GET_APIS.length, postApis: POST_APIS.length, findings: findings.length },
    findings,
  };
  writeFileSync(new URL('../.planning/test-fix/sweep-results.json', import.meta.url), JSON.stringify(out, null, 2));
  console.log(
    `Sweep fertig: ${PAGES.length} Seiten (${SEITEN_AUS_MANIFEST ? 'aus Build-Manifest' : 'FALLBACK-Liste'}), ` +
      `${GET_APIS.length} GET-APIs, ${POST_APIS.length} POST-Faelle -> ${findings.length} Findung(en).`
  );
  for (const f of findings) console.log(`  [${f.severity}] ${f.route} — ${f.detail}`);
}
run();
