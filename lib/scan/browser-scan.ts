/**
 * Playwright-Crawler für den wöchentlichen Quellen-Scan.
 *
 * WOFÜR ER GEBAUT IST — und wofür nicht:
 * Er löst **clientseitiges Rendering**. Immer mehr Förderportale liefern im HTML
 * nur ein Gerüst und bauen die Trefferliste erst im Browser zusammen; ein
 * `fetch()` sieht dort Navigation und sonst nichts. Beispiel Aktion Mensch:
 * statisch 292 Zeichen, im Browser 8.975 Zeichen mit fünf Förderangeboten
 * (gemessen 18.08.2026).
 *
 * Er löst **keinen Bot-Schutz**. Gegenprobe am selben Tag: die Förderdatenbank des
 * Bundes (Radware Bot Manager) beantwortet auch den echten Browser mit der
 * CAPTCHA-Seite „your activity and behavior on this site made us think that you are
 * a bot". Wer diese Sperre umgehen wollte, müsste den Browser verschleiern — das
 * tut dieses Modul bewusst nicht. Für solche Quellen ist der Weg ein offizieller
 * Export/API beim Betreiber, nicht ein besserer Crawler.
 *
 * Zwei Betriebsarten, gesteuert allein über data/program-sources.json:
 *   pfadFilter gesetzt → deterministische Link-Ernte, ohne LLM. Robust und billig.
 *   pfadFilter leer    → gerenderter Text geht an das LLM (wie typ="seite").
 *
 * LOKAL: Playwright findet seinen Browser nur, wenn die Revision zum Paket passt.
 * Sonst `npx playwright install chromium` oder den Pfad setzen:
 *   PLAYWRIGHT_EXECUTABLE_PATH=~/.cache/ms-playwright/chromium-1226/chrome-linux/chrome
 */

export interface RohLink {
  href: string;
  text: string;
}

export interface GeholteSeite {
  /** Sichtbarer Text der gerenderten Seite (document.body.innerText). */
  text: string;
  links: RohLink[];
  /** URL nach allen Weiterleitungen — deckt Umleitungen auf Fehler-/Sperrseiten auf. */
  endUrl: string;
  status: number;
}

export interface BrowserSeiteConfig {
  url: string;
  /** Optionaler Selektor, auf den vor dem Auslesen gewartet wird. */
  warteAufSelektor?: string;
  /** Optionaler Selektor eines Cookie-Hinweises, der die Liste verdeckt. */
  cookieBannerSelektor?: string;
  timeoutMs?: number;
  userAgent?: string;
}

export interface LinkKandidat {
  name: string;
  detailUrl: string;
}

const STANDARD_TIMEOUT = 45000;

/**
 * Nur im Slug-Fallback: die im Deutschen eindeutigen ASCII-Ersatzschreibungen zurueckdrehen.
 *
 * Bewusst eine kurze Positivliste und bewusst NUR auf Slugs angewandt, nie auf Fliesstext:
 * ein pauschales ae/oe/ue -> Umlaut zerstoert Woerter wie "neue" oder "Quelle". Die hier
 * gelisteten Folgen kommen in deutschen Foerder-Slugs praktisch nur als Umlaut-Ersatz vor.
 * Grund fuer den Aufwand: Programmnamen landen im Katalog und damit vor Nutzeraugen —
 * dort gilt "echte Umlaute" (CLAUDE.md).
 */
const SLUG_UMLAUTE: Array<[RegExp, string]> = [
  [/foerder/gi, "förder"],
  [/schueler/gi, "schüler"],
  [/buerger/gi, "bürger"],
  [/gruend/gi, "gründ"],
  [/staerk/gi, "stärk"],
  [/jaehrig/gi, "jährig"],
];

function slugUmlauteZurueck(text: string): string {
  let out = text;
  for (const [muster, ersatz] of SLUG_UMLAUTE) {
    out = out.replace(muster, (treffer) =>
      // Grossschreibung des Originals erhalten: "Foerderung" -> "Förderung".
      treffer[0] === treffer[0].toUpperCase()
        ? ersatz.charAt(0).toUpperCase() + ersatz.slice(1)
        : ersatz
    );
  }
  return out;
}

/**
 * Reine Aufforderungen ohne eigenen Inhalt — daraus wird kein Programmname.
 *
 * Gemessen 18.08.2026: Stiftung Bildung verlinkt alle 14 Foerderfonds mit dem Text
 * "Mehr Informationen" bzw. "Mehr Informationen!". Ohne diese Liste hiessen im Katalog
 * vierzehn verschiedene Programme gleich.
 */
const NUR_AUFFORDERUNG =
  /^(mehr( erfahren| dazu| lesen| infos?| informationen?)?|weiterlesen|weitere (infos?|informationen?)|hier( klicken| informieren)?|details?|jetzt (antrag|bewerben|starten|informieren)|alle ansehen|erfahren sie mehr|zum (programm|angebot)|angebot|uebersicht|übersicht)$/i;

/**
 * Aus Linktext und URL einen lesbaren Programmnamen machen.
 *
 * Der Linktext ist die bessere Quelle — er traegt die echte Schreibweise samt Umlauten
 * ("Zur Anschubförderung Arbeit"), waehrend der Slug sie verloren hat
 * ("anschubfoerderung-arbeit"). Portale stellen ihm aber ein Navigationswort voran; das
 * wird abgeschnitten, statt den ganzen Text zu verwerfen. Nur wenn nichts Tragfaehiges
 * uebrig bleibt, kommt der Slug zum Zug.
 */
export function nameAusLink(linkText: string, url: string): string {
  const roh = (linkText ?? "").replace(/\s+/g, " ").trim();
  const ohneNavi = roh
    .replace(/^(zu den|zu der|zum|zur|zu)\s+/i, "")
    // Schluss-Satzzeichen abschneiden, sonst rutscht "Mehr Informationen!" an der Liste vorbei.
    .replace(/[!.:…»>\s]+$/, "")
    .trim();
  const brauchbar =
    ohneNavi.length >= 6 && ohneNavi.length <= 120 && !NUR_AUFFORDERUNG.test(ohneNavi);
  if (brauchbar) {
    return ohneNavi.charAt(0).toUpperCase() + ohneNavi.slice(1);
  }
  const slug = url.split("?")[0].split("#")[0].replace(/\/+$/, "").split("/").pop() ?? "";
  const ausSlug = slug
    .replace(/\.(html?|php|aspx)$/i, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return slugUmlauteZurueck(ausSlug) || ohneNavi || roh;
}

/**
 * Passt eine URL zum konfigurierten Pfadfilter?
 *
 * Beide Seiten werden dekodiert verglichen. Ohne das findet der lesbar hinterlegte Filter
 * "/Förderprogramme/Aktuelle-Förderprogramme" seine eigenen Seiten nicht, weil die im
 * Sitemap-XML als "/F%C3%B6rderprogramme/Aktuelle-F%C3%B6rderprogramme" stehen — bei der
 * NBank betrifft das 144 Programmseiten, die sonst allesamt unsichtbar blieben.
 *
 * Die Uebersichtsseite selbst (Pfad == Filter) ist kein Programm und faellt raus.
 */
export function pfadPasst(url: string, filter: string): boolean {
  const dekodiert = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  let pfad = url;
  try {
    pfad = new URL(url).pathname;
  } catch {
    /* kein absoluter URL-String — dann direkt vergleichen */
  }
  const f = dekodiert(filter).replace(/\/+$/, "");
  const p = dekodiert(pfad).replace(/\/+$/, "");
  return p !== f && p.includes(f);
}

/**
 * Aus den Rohlinks der Seite die Programm-Detailseiten sieben.
 *
 * Verworfen werden Anker auf dieselbe Seite, Nicht-HTTP-Schemata und Dubletten.
 * Der Anker-Fall ist nicht theoretisch: Aktion Mensch verlinkt dieselbe Übersicht
 * fünfmal per `#152814`-Sprungmarke — ohne diesen Filter stünden fünf Geisterprogramme
 * im Katalog.
 */
export function filtereProgrammLinks(links: RohLink[], pfadFilter: string): LinkKandidat[] {
  const gesehen = new Set<string>();
  const treffer: LinkKandidat[] = [];
  for (const l of links) {
    if (!l.href || !/^https?:\/\//i.test(l.href)) continue;
    let u: URL;
    try {
      u = new URL(l.href);
    } catch {
      continue;
    }
    u.hash = "";
    if (!pfadPasst(u.toString(), pfadFilter)) continue;
    const norm = u.toString().replace(/\/$/, "");
    if (gesehen.has(norm)) continue;
    gesehen.add(norm);
    treffer.push({ name: nameAusLink(l.text, norm), detailUrl: norm });
  }
  return treffer;
}

/**
 * Urteil ueber eine gerenderte Seite: brauchbare Kandidaten, Text fuer das LLM — oder ein
 * benannter Fehler.
 *
 * Bewusst als reine Funktion getrennt vom Browser-Aufruf: Genau diese Schranken sind das,
 * was 2026 sechs Wochen lang gefehlt hat, und eine Schranke, die man nicht ohne Netz und
 * Browser testen kann, wird nicht getestet.
 */
export interface SeitenBefund {
  /** Deterministisch geerntete Kandidaten (nur mit pfadFilter). */
  candidates?: LinkKandidat[];
  /** Gerenderter Text fuer den LLM-Modus (ohne pfadFilter). */
  textFuerLlm?: string;
  /** Gesetzt, wenn die Quelle NICHT ausgewertet werden konnte. */
  fehler?: string;
}

export interface BewertungsConfig {
  quellUrl: string;
  pfadFilter?: string;
  mindestTextZeichen?: number;
}

export const MINDEST_TEXT_ZEICHEN = 500;

export function bewerteSeite(seite: GeholteSeite, cfg: BewertungsConfig): SeitenBefund {
  // Verlaesst die Seite die eigene Domain, sind wir auf einer Sperr- oder Fehlerseite
  // gelandet — so verhaelt sich der Radware Bot Manager (302 auf validate.perfdrive.com).
  let zielHost: string;
  let endHost: string;
  try {
    zielHost = new URL(cfg.quellUrl).host;
    endHost = new URL(seite.endUrl).host;
  } catch {
    return { fehler: `Unbrauchbare URL (${cfg.quellUrl} -> ${seite.endUrl}).` };
  }
  if (endHost !== zielHost) {
    return {
      fehler:
        `Umleitung von ${zielHost} nach ${endHost} — Sperr- oder Fehlerseite statt Inhalt ` +
        `(${seite.endUrl.slice(0, 120)}).`,
    };
  }

  // Eine Seite, die fast nichts rendert, ist keine leere Trefferliste, sondern ein Defekt.
  // Der Bildungsserver lieferte so 58 Zeichen ("Keine Datenbank gewaehlt!") — und der
  // Wochenlauf meldete daraufhin brav "0 gefunden".
  const mindest = cfg.mindestTextZeichen ?? MINDEST_TEXT_ZEICHEN;
  if (seite.text.length < mindest) {
    return {
      fehler:
        `Seite rendert nur ${seite.text.length} Zeichen Text (erwartet mindestens ${mindest}): ` +
        `"${seite.text.slice(0, 160).replace(/\s+/g, " ")}"`,
    };
  }

  if (!cfg.pfadFilter) return { textFuerLlm: seite.text };

  const treffer = filtereProgrammLinks(seite.links, cfg.pfadFilter);
  if (treffer.length === 0) {
    return {
      fehler:
        `Seite gerendert (${seite.text.length} Zeichen, ${seite.links.length} Links), aber kein ` +
        `einziger Link unter "${cfg.pfadFilter}" — die Seitenstruktur hat sich vermutlich geaendert. ` +
        `pfadFilter in data/program-sources.json pruefen.`,
    };
  }
  return { candidates: treffer };
}

/**
 * Links aus rohem HTML ziehen — fuer statische Seiten, die keinen Browser brauchen.
 *
 * Ergaenzt die Luecke zwischen den Quellentypen: "sitemap" erntet Links aus XML, "browser"
 * aus einer gerenderten Seite. Eine statische HTML-Uebersicht mit sauberen Links (Stiftung
 * Bildung listet dort ihre 14 Foerderfonds) brauchte bisher unnoetig Chromium.
 *
 * Relative Ziele werden gegen die Seiten-URL aufgeloest, damit der Pfadfilter greift.
 */
export function extrahiereLinksAusHtml(html: string, basisUrl: string): RohLink[] {
  const links: RohLink[] = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href: string;
    try {
      href = new URL(m[1], basisUrl).toString();
    } catch {
      continue;
    }
    const text = m[2]
      .replace(/<[^>]*>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    links.push({ href, text });
  }
  return links;
}

/** Chromium besorgen — mit verständlicher Meldung statt Stacktrace, wenn er fehlt. */
async function ladeChromium() {
  try {
    const mod = await import("@playwright/test");
    return mod.chromium;
  } catch (err) {
    throw new Error(
      `Playwright ist nicht installiert (${(err as Error).message}). ` +
        `Im Workflow: "npx playwright install --with-deps chromium". Lokal zusätzlich ` +
        `PLAYWRIGHT_EXECUTABLE_PATH auf einen vorhandenen Chromium setzen.`
    );
  }
}

/**
 * Eine Seite im echten Browser rendern und Text + Links zurückgeben.
 * Der Browser wird garantiert geschlossen — ein hängender Chromium würde den
 * Wochenlauf bis zum Job-Timeout blockieren.
 */
export async function holeSeiteMitBrowser(cfg: BrowserSeiteConfig): Promise<GeholteSeite> {
  const chromium = await ladeChromium();
  const timeout = cfg.timeoutMs ?? STANDARD_TIMEOUT;
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;

  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const ctx = await browser.newContext({
      locale: "de-DE",
      userAgent: cfg.userAgent,
    });
    const page = await ctx.newPage();
    const antwort = await page.goto(cfg.url, { waitUntil: "domcontentloaded", timeout });
    // Nachgeladene Listen brauchen den Netzwerk-Leerlauf; er ist aber nicht garantiert
    // (Portale mit Dauer-Polling erreichen ihn nie), deshalb nur als Bestversuch.
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    if (cfg.cookieBannerSelektor) {
      await page
        .locator(cfg.cookieBannerSelektor)
        .first()
        .click({ timeout: 5000 })
        .catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    }
    if (cfg.warteAufSelektor) {
      await page.waitForSelector(cfg.warteAufSelektor, { timeout: 20000 });
    }
    const text: string = await page.evaluate(() => document.body?.innerText ?? "");
    const links: RohLink[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]")).map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: ((a as HTMLAnchorElement).innerText || "").trim().slice(0, 200),
      }))
    );
    return {
      text: text.replace(/\n{3,}/g, "\n\n").trim(),
      links,
      endUrl: page.url(),
      status: antwort?.status() ?? 0,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
