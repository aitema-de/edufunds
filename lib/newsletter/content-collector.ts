/**
 * Content-Collector für den Newsletter.
 *
 * Wählt DETERMINISTISCH (ohne LLM) die Förderprogramme aus, die in der nächsten
 * Ausgabe vorgestellt werden, und stellt Katalog-Kontext für den LLM-Redaktions-
 * teil bereit. Deterministisch heißt: keine erfundenen Programme, Fördergeber
 * oder Fristen — alles stammt 1:1 aus dem gepflegten Katalog
 * (data/foerderprogramme.json).
 *
 * Auswahllogik:
 *  - nur status='aktiv' UND kiAntragGeeignet=true (das kann EduFunds wirklich)
 *  - zuletzt vorgestellte Programme ausschließen (Rotation/Anti-Wiederholung)
 *  - sortiert nach "zuletzt verifiziert" (frischester Stand zuerst)
 *  - fällt zurück auf bereits gezeigte Programme, falls nach Ausschluss zu wenige
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Program } from '@/lib/newsletter';

/**
 * Fallback-Basis-URL, falls NEXT_PUBLIC_APP_URL nicht gesetzt ist. Bewusst die
 * APP-Domain (app.edufunds.org) — dort liegen die funktionalen Seiten
 * (/foerderprogramme, /antrag, /impressum, /datenschutz). Die frühere Vorgabe
 * `edufunds.org` (Marketing-Landing, separates Repo) hostet diese Pfade NICHT
 * und lieferte tote Links.
 */
export const NEWSLETTER_APP_URL_FALLBACK = 'https://app.edufunds.org';

/**
 * Erlaubte Ziel-Pfade für LLM-generierte Newsletter-Links. Der LLM darf KEINE
 * Programm-Slugs/Tiefpfade erfinden (Halluzinationsrisiko → 404) — Programm-
 * Detail-Links kommen ausschließlich deterministisch aus dem Katalog. Query-
 * Strings (z. B. ?kategorie=…) sind erlaubt.
 */
const SAFE_LLM_URL_PATHS = new Set(['/', '/foerderprogramme', '/antrag']);

/**
 * Härtet eine vom LLM gelieferte URL: akzeptiert nur die App-Domain
 * (baseUrl-Origin) und einen kleinen Allowlist-Pfad; verwirft alles andere
 * (fremde Domain, erfundener Pfad) zu ''. Verhindert tote/halluzinierte CTAs.
 */
export function sanitizeLlmUrl(url: string | undefined | null, baseUrl: string): string {
  if (!url) return '';
  let u: URL;
  let base: URL;
  try {
    u = new URL(url);
    base = new URL(baseUrl);
  } catch {
    return '';
  }
  if (u.origin !== base.origin) return '';
  const path = u.pathname.replace(/\/+$/, '') || '/';
  if (!SAFE_LLM_URL_PATHS.has(path)) return '';
  return u.toString();
}

/**
 * Entfernt aus Freitext eingebettete <a>-Anker mit nicht-erlaubter URL und
 * behält nur den Linktext. Schließt den Vektor „LLM schmuggelt unsicheren Link
 * als HTML-Anker in den Fließtext".
 */
export function stripUnsafeAnchors(text: string, baseUrl: string): string {
  return text.replace(
    /<a\s+href="([^"]*)"\s*>(.*?)<\/a>/gi,
    (_m, href: string, inner: string) => {
      const safe = sanitizeLlmUrl(href, baseUrl);
      return safe ? `<a href="${safe}">${inner}</a>` : inner;
    }
  );
}

export interface ProgramRecord {
  id: string;
  name: string;
  foerdergeber: string;
  foerdergeberTyp?: string;
  schulformen?: string[];
  bundeslaender?: string[];
  foerdersummeMin?: number;
  foerdersummeMax?: number;
  foerdersummeText?: string;
  kategorien?: string[];
  bewerbungsfristText?: string;
  infoLink?: string;
  kurzbeschreibung?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  verifiziertAm?: string;
  kiAntragGeeignet?: boolean;
}

export interface CollectedContent {
  /** Fertig gemappte Programmkarten für den Newsletter. */
  programs: Program[];
  /** IDs der gewählten Programme (für Persistenz/Rotation). */
  programIds: string[];
  /** Kompakter Katalog-Kontext, den der LLM-Redaktionsteil nutzen darf. */
  catalogContext: {
    totalActive: number;
    totalKiSuitable: number;
    topCategories: { kategorie: string; count: number }[];
    /** Knappe Zusammenfassung der gewählten Programme für den Prompt. */
    selectedSummaries: string[];
  };
}

const SCHULFORM_LABELS: Record<string, string> = {
  grundschule: 'Grundschulen',
  hauptschule: 'Hauptschulen',
  realschule: 'Realschulen',
  gymnasium: 'Gymnasien',
  gesamtschule: 'Gesamtschulen',
  foerderschule: 'Förderschulen',
  sekundarstufe: 'Sekundarstufe',
  berufsschule: 'Berufsschulen',
  hochschule: 'Hochschulen',
};

const BUNDESLAND_LABELS: Record<string, string> = {
  'DE-BW': 'Baden-Württemberg',
  'DE-BY': 'Bayern',
  'DE-BE': 'Berlin',
  'DE-BB': 'Brandenburg',
  'DE-HB': 'Bremen',
  'DE-HH': 'Hamburg',
  'DE-HE': 'Hessen',
  'DE-MV': 'Mecklenburg-Vorpommern',
  'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen',
  'DE-RP': 'Rheinland-Pfalz',
  'DE-SL': 'Saarland',
  'DE-SN': 'Sachsen',
  'DE-ST': 'Sachsen-Anhalt',
  'DE-SH': 'Schleswig-Holstein',
  'DE-TH': 'Thüringen',
  alle: 'bundesweit',
};

let cachedCatalog: ProgramRecord[] | null = null;

function loadCatalog(): ProgramRecord[] {
  if (cachedCatalog) return cachedCatalog;
  const path = join(process.cwd(), 'data', 'foerderprogramme.json');
  const raw = readFileSync(path, 'utf-8');
  cachedCatalog = JSON.parse(raw) as ProgramRecord[];
  return cachedCatalog;
}

/** Für Tests / explizites Laden eines abweichenden Katalogs. */
export function _setCatalogForTest(records: ProgramRecord[] | null): void {
  cachedCatalog = records;
}

function humanizeSchulformen(codes?: string[]): string {
  if (!codes || codes.length === 0) return 'Alle Schularten';
  if (codes.length >= 5) return 'Alle Schularten';
  const labels = codes.map((c) => SCHULFORM_LABELS[c] ?? c);
  return labels.join(', ');
}

function humanizeBundeslaender(codes?: string[]): string {
  if (!codes || codes.length === 0) return 'bundesweit';
  if (codes.includes('alle')) return 'bundesweit';
  if (codes.length > 3) return 'mehrere Bundesländer';
  return codes.map((c) => BUNDESLAND_LABELS[c] ?? c).join(', ');
}

function buildTargetGroup(rec: ProgramRecord): string {
  const schul = humanizeSchulformen(rec.schulformen);
  const land = humanizeBundeslaender(rec.bundeslaender);
  return land === 'bundesweit' ? `${schul} · bundesweit` : `${schul} · ${land}`;
}

/**
 * Knappe Frist für das Newsletter-Badge. `bewerbungsfristText` ist freiform und
 * teils ein ganzer Satz — als rotes Badge würde das überlaufen. Wir kürzen auf
 * eine kompakte Form (echte Daten bleiben erhalten; rollende Fristen → "laufend").
 */
export function conciseDeadline(text?: string): string {
  const t = (text || '').trim();
  if (!t) return 'laufend';
  if (/laufend|fortlaufend|ganzj(ä|ae)hrig|jederzeit|keine\s+(feste\s+)?frist|formlos/i.test(t)) {
    return 'laufend';
  }
  // Konkretes Datum bevorzugen (z.B. "30. März 2026" / "22.02.2026").
  const date =
    /\b\d{1,2}\.\s?[A-Za-zÄÖÜäöü]+\.?\s?\d{4}\b/.exec(t) ||
    /\b\d{1,2}\.\d{1,2}\.\d{4}\b/.exec(t);
  if (date) return `Frist: ${date[0]}`;
  // Sonst erste Teilaussage, hart gekürzt.
  const head = t.split(/[;(]/)[0].trim();
  return head.length > 42 ? head.slice(0, 40).trimEnd() + '…' : head;
}

/**
 * Stellt deutsche Umlaute in ASCII-geschriebenem Katalogtext wieder her — aber
 * SICHER: nur über eine kuratierte Liste eindeutiger Wortstämme, kein blindes
 * ae/oe/ue→ä/ö/ü (das würde „neue", „Goethe", „Israel", „aktuell", „Steuer" usw.
 * zerstören). Stämme sind so gewählt, dass sie praktisch nie fälschlich greifen.
 */
const UMLAUT_STEMS: ReadonlyArray<readonly [string, string]> = [
  ['foerder', 'förder'], ['ueber', 'über'], ['moeglich', 'möglich'],
  ['schueler', 'schüler'], ['gemeinnuetz', 'gemeinnütz'], ['unterstuetz', 'unterstütz'],
  ['verguet', 'vergüt'], ['regelmaess', 'regelmäß'], ['maessig', 'mäßig'],
  ['gemaess', 'gemäß'], ['groess', 'größ'], ['zusaetz', 'zusätz'],
  ['grundsaetz', 'grundsätz'], ['traeg', 'träg'], ['taet', 'tät'],
  ['staedt', 'städt'], ['haeuf', 'häuf'], ['naehe', 'nähe'], ['raeum', 'räum'],
  ['laeng', 'läng'], ['staerk', 'stärk'], ['waehr', 'währ'], ['faehig', 'fähig'],
  ['buero', 'büro'], ['koenn', 'könn'], ['muess', 'müss'], ['wuerd', 'würd'],
  ['wuensch', 'wünsch'], ['fuehr', 'führ'], ['fuehl', 'fühl'], ['frueh', 'früh'],
  ['pruef', 'prüf'], ['gruend', 'gründ'], ['natuerlich', 'natürlich'],
  ['fuer', 'für'], ['jaehr', 'jähr'], ['saeule', 'säule'], ['qualitaet', 'qualität'],
  ['taetig', 'tätig'], ['paedagog', 'pädagog'], ['gelaende', 'gelände'],
];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function restoreUmlauts(text: string): string {
  let out = text;
  for (const [from, to] of UMLAUT_STEMS) {
    out = out.split(from).join(to);
    out = out.split(cap(from)).join(cap(to));
  }
  return out;
}

/** Tausenderpunkte (de) ohne ICU-Abhängigkeit: 50000 → "50.000". */
function groupThousands(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Knappe Förderhöhe für die Programmkarte. Bevorzugt die numerischen Katalogfelder
 * (eindeutig, kompakt); der freie `foerdersummeText` ist oft ein ganzer Satz und
 * würde als Chip überlaufen — er wird nur übernommen, wenn er kurz genug ist.
 * Gibt undefined zurück, wenn keine belastbare, knappe Angabe vorliegt.
 */
export function conciseAmount(rec: ProgramRecord): string | undefined {
  const min = rec.foerdersummeMin;
  const max = rec.foerdersummeMax;
  if (typeof max === 'number' && max > 0) {
    if (typeof min === 'number' && min > 0 && min !== max) {
      return `${groupThousands(min)}–${groupThousands(max)} €`;
    }
    return `bis zu ${groupThousands(max)} €`;
  }
  if (typeof min === 'number' && min > 0) {
    return `ab ${groupThousands(min)} €`;
  }
  const text = (rec.foerdersummeText || '').trim();
  if (text && text.length <= 32 && !/[.;]/.test(text)) {
    return restoreUmlauts(text);
  }
  return undefined;
}

function recordToProgram(rec: ProgramRecord, baseUrl: string): Program {
  return {
    name: restoreUmlauts(rec.name),
    funder: restoreUmlauts(rec.foerdergeber),
    deadline: restoreUmlauts(conciseDeadline(rec.bewerbungsfristText)),
    targetGroup: buildTargetGroup(rec),
    description: restoreUmlauts((rec.kurzbeschreibung || '').trim()),
    url: `${baseUrl}/foerderprogramme/${rec.id}`,
    amount: conciseAmount(rec),
  };
}

/** Sortierschlüssel: zuletzt verifiziert/aktualisiert zuerst, stabil per id. */
function freshnessKey(rec: ProgramRecord): string {
  return `${rec.verifiziertAm || rec.updatedAt || rec.createdAt || ''}|${rec.id}`;
}

export interface CollectOptions {
  count?: number;
  /** Programm-IDs, die zuletzt vorgestellt wurden und vermieden werden sollen. */
  excludeIds?: string[];
  baseUrl?: string;
}

export function collectNewsletterContent(opts: CollectOptions = {}): CollectedContent {
  const count = opts.count ?? 3;
  const exclude = new Set(opts.excludeIds ?? []);
  const baseUrl = (opts.baseUrl || NEWSLETTER_APP_URL_FALLBACK).replace(/\/$/, '');

  const catalog = loadCatalog();
  const active = catalog.filter((p) => p.status === 'aktiv');
  const suitable = active.filter((p) => p.kiAntragGeeignet === true);

  // Frischeste zuerst (absteigend).
  const ranked = [...suitable].sort((a, b) =>
    freshnessKey(b).localeCompare(freshnessKey(a))
  );

  // Bevorzugt nicht zuletzt gezeigte; falls zu wenige, mit gezeigten auffüllen.
  const fresh = ranked.filter((p) => !exclude.has(p.id));
  const chosen = (fresh.length >= count ? fresh : ranked).slice(0, count);

  // Top-Kategorien über den geeigneten Katalog.
  const catCounts = new Map<string, number>();
  for (const p of suitable) {
    for (const k of p.kategorien || []) {
      catCounts.set(k, (catCounts.get(k) ?? 0) + 1);
    }
  }
  const topCategories = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([kategorie, c]) => ({ kategorie, count: c }));

  const programs = chosen.map((rec) => recordToProgram(rec, baseUrl));

  return {
    programs,
    programIds: chosen.map((p) => p.id),
    catalogContext: {
      totalActive: active.length,
      totalKiSuitable: suitable.length,
      topCategories,
      selectedSummaries: chosen.map(
        (p) =>
          `${p.name} (${p.foerdergeber}; Zielgruppe ${buildTargetGroup(p)}; Frist: ${p.bewerbungsfristText?.trim() || 'laufend'})`
      ),
    },
  };
}
