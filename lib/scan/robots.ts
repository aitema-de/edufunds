/**
 * robots.txt lesen und anwenden — Vorschaltung für den wöchentlichen Quellen-Scan.
 *
 * WARUM ALS CODE UND NICHT ALS KOMMENTAR:
 * Ein Crawler, der wöchentlich unbeaufsichtigt läuft, darf nicht davon abhängen,
 * dass sich jemand an eine Regel in einer Doku erinnert. Der Befund vom 18.08.2026
 * (Förderdatenbank des Bundes hinter Radware Bot Manager) hat gezeigt, wie schnell
 * aus „wir holen uns eine Übersichtsseite" ein Umgehen fremder Schutzmaßnahmen wird.
 * Deshalb prüft der Scanner vor JEDEM Quellen-Abruf die robots.txt der Domain und
 * bricht die Quelle mit einem sichtbaren Fehler ab, statt sie still zu überfahren.
 *
 * FAIL-CLOSED: Ist die robots.txt nicht abrufbar (Netzfehler, 5xx), gilt die Quelle
 * als gesperrt. Nur eine klare 404/410 bedeutet „es gibt keine Regeln" — das ist die
 * im Standard vorgesehene Auslegung und zugleich die einzige, die einen stillen
 * Freifahrtschein ausschließt.
 */

export interface RobotsRegeln {
  /** Disallow-Muster der zutreffenden Gruppe (leere Werte werden verworfen). */
  disallow: string[];
  /** Allow-Muster der zutreffenden Gruppe. Längere Übereinstimmung gewinnt. */
  allow: string[];
  /** Crawl-delay in Sekunden, falls die Quelle eines angibt. */
  crawlDelaySekunden: number | null;
  /** Woher die Regeln stammen — landet im Failure-Report, damit die Entscheidung nachvollziehbar ist. */
  herkunft: "robots" | "kein-robots" | "unerreichbar";
  /** Nur bei herkunft="unerreichbar": der Grund. */
  fehler?: string;
}

const ALLES_ERLAUBT: RobotsRegeln = {
  disallow: [],
  allow: [],
  crawlDelaySekunden: null,
  herkunft: "kein-robots",
};

/**
 * robots.txt-Text in Regeln für einen Agenten übersetzen.
 *
 * Gruppenlogik nach RFC 9309: aufeinanderfolgende `User-agent`-Zeilen bilden einen
 * gemeinsamen Kopf, die darauf folgenden Direktiven gelten für alle Agenten dieses
 * Kopfes. Es gewinnt die spezifischste Gruppe — der eigene Agentenname vor `*`.
 */
export function parseRobots(text: string, agent = "*"): RobotsRegeln {
  const gruppen = new Map<string, { allow: string[]; disallow: string[]; delay: number | null }>();
  let aktuelleAgenten: string[] = [];
  let kopfOffen = false;

  const hole = (a: string) => {
    let g = gruppen.get(a);
    if (!g) {
      g = { allow: [], disallow: [], delay: null };
      gruppen.set(a, g);
    }
    return g;
  };

  for (const rohZeile of text.split(/\r?\n/)) {
    const zeile = rohZeile.split("#")[0].trim();
    if (!zeile) continue;
    const trenner = zeile.indexOf(":");
    if (trenner < 0) continue;
    const feld = zeile.slice(0, trenner).trim().toLowerCase();
    const wert = zeile.slice(trenner + 1).trim();

    if (feld === "user-agent") {
      // Nach einer Direktive beginnt eine neue Gruppe, nicht die alte fortsetzen.
      if (!kopfOffen) aktuelleAgenten = [];
      aktuelleAgenten.push(wert.toLowerCase());
      kopfOffen = true;
      continue;
    }
    if (aktuelleAgenten.length === 0) continue;
    kopfOffen = false;

    for (const a of aktuelleAgenten) {
      const g = hole(a);
      if (feld === "disallow") {
        // Leerer Disallow-Wert heißt ausdrücklich „nichts gesperrt" — nicht aufnehmen.
        if (wert) g.disallow.push(wert);
      } else if (feld === "allow") {
        if (wert) g.allow.push(wert);
      } else if (feld === "crawl-delay") {
        const n = Number(wert.replace(",", "."));
        if (Number.isFinite(n) && n >= 0) g.delay = n;
      }
    }
  }

  const gewaehlt = gruppen.get(agent.toLowerCase()) ?? gruppen.get("*");
  if (!gewaehlt) return { ...ALLES_ERLAUBT, herkunft: "robots" };
  return {
    disallow: gewaehlt.disallow,
    allow: gewaehlt.allow,
    crawlDelaySekunden: gewaehlt.delay,
    herkunft: "robots",
  };
}

/** robots-Muster (`*` als Platzhalter, `$` als Zeilenende) auf einen Pfad anwenden. */
function musterTrifft(muster: string, pfad: string): boolean {
  const endeVerankert = muster.endsWith("$");
  const kern = endeVerankert ? muster.slice(0, -1) : muster;
  const regex = kern
    .split("*")
    .map((teil) => teil.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${regex}${endeVerankert ? "$" : ""}`).test(pfad);
}

/**
 * Darf dieser Pfad abgerufen werden?
 *
 * Bei Konflikt gewinnt das längere Muster (RFC 9309); bei gleicher Länge das Allow.
 */
export function istErlaubt(pfad: string, regeln: RobotsRegeln): boolean {
  let laengstesDisallow = -1;
  for (const m of regeln.disallow) {
    if (musterTrifft(m, pfad) && m.length > laengstesDisallow) laengstesDisallow = m.length;
  }
  if (laengstesDisallow < 0) return true;
  let laengstesAllow = -1;
  for (const m of regeln.allow) {
    if (musterTrifft(m, pfad) && m.length > laengstesAllow) laengstesAllow = m.length;
  }
  return laengstesAllow >= laengstesDisallow;
}

/** Pfad + Query aus einer absoluten URL — genau das, wogegen robots-Muster prüfen. */
export function pfadMitQuery(url: string): string {
  const u = new URL(url);
  return `${u.pathname}${u.search}`;
}

export interface RobotsLadeOptionen {
  agent?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** robots.txt einer Domain holen und auswerten. Fail-closed bei Netz-/Serverfehlern. */
export async function ladeRobots(
  url: string,
  opts: RobotsLadeOptionen = {}
): Promise<RobotsRegeln> {
  const { agent = "*", fetchImpl = fetch, timeoutMs = 15000 } = opts;
  const robotsUrl = new URL("/robots.txt", url).toString();
  try {
    // AbortSignal.timeout gibt es nicht ueberall (aeltere Runtimes, jsdom in den Tests) —
    // ohne diese Pruefung wuerde der Abruf mit einem TypeError abbrechen und die Quelle
    // faelschlich als "robots.txt unerreichbar" gesperrt.
    const signal =
      typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(timeoutMs)
        : undefined;
    const res = await fetchImpl(robotsUrl, signal ? { signal } : {});
    if (res.status === 404 || res.status === 410) return { ...ALLES_ERLAUBT };
    if (!res.ok) {
      return {
        disallow: ["/"],
        allow: [],
        crawlDelaySekunden: null,
        herkunft: "unerreichbar",
        fehler: `robots.txt antwortete HTTP ${res.status}`,
      };
    }
    return parseRobots(await res.text(), agent);
  } catch (err) {
    return {
      disallow: ["/"],
      allow: [],
      crawlDelaySekunden: null,
      herkunft: "unerreichbar",
      fehler: `robots.txt nicht abrufbar: ${(err as Error).message}`,
    };
  }
}
