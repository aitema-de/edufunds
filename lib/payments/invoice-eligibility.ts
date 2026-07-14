/**
 * Wer darf auf Rechnung bestellen?
 *
 * Der Rechnungskauf schaltet SOFORT frei, bevor Geld geflossen ist (Kontingent bis
 * 459,90 EUR). Er existiert, weil Schulen und Traeger nicht mit Kreditkarte zahlen
 * koennen — nicht, damit sich jeder anonym bedienen kann. Ohne Tuer steht er jedem
 * offen, der eine Wegwerfadresse tippt.
 *
 * ── Warum eine Negativliste und keine Allowlist ─────────────────────────────
 * Eine Positivliste deutscher Schuldomains ist nicht baubar: die reichen von
 * `gymnasium-musterstadt.de` ueber `schulen.koeln.de` bis `gs-nord.schule`, dazu
 * Traeger, Kommunen, Landkreise, Bezirksregierungen. Eine strikte Allowlist wuerde
 * mehr echte Kunden abweisen als Betrueger. Also andersherum:
 *
 *   HART GESPERRT:  Freemail + Wegwerfadressen. Eine Schule bestellt praktisch nie
 *                   dienstlich per Rechnung von einer gmail-Adresse; ein Betrueger
 *                   fast immer.
 *   ERKANNT:        Institutionelle Muster (.schule, Schul-/Behoerden-Keywords, …)
 *                   — nur ein SIGNAL fuer die Admin-Ansicht, kein Tor. Wer kein
 *                   Muster trifft, darf trotzdem bestellen (viele Traeger haben
 *                   voellig unauffaellige Domains), taucht aber als "ungeprueft" auf.
 *
 * Ueber INVOICE_DOMAIN_ALLOWLIST lassen sich Einzelfaelle freischalten (z. B. ein
 * Foerderverein mit web.de-Adresse, der telefonisch bekannt ist).
 */

/** Freemail-Anbieter: keine dienstliche Adresse einer Institution. */
const FREEMAIL = new Set([
  "gmail.com", "googlemail.com",
  "gmx.de", "gmx.net", "gmx.at", "gmx.ch",
  "web.de", "freenet.de", "t-online.de", "arcor.de",
  "yahoo.com", "yahoo.de", "ymail.com",
  "hotmail.com", "hotmail.de", "outlook.com", "outlook.de", "live.de", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "aol.de",
  "protonmail.com", "proton.me", "pm.me",
  "posteo.de", "mailbox.org", "mail.de", "tutanota.com", "tuta.io",
  "zoho.com", "yandex.com", "yandex.ru",
]);

/** Wegwerfadressen: hier ist Nichtzahlung der Zweck, nicht der Unfall. */
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "throwawaymail.com", "yopmail.com", "trashmail.com",
  "trashmail.de", "wegwerfmail.de", "spam4.me", "sharklasers.com",
  "getnada.com", "dispostable.com", "maildrop.cc", "fakeinbox.com",
  "mohmal.com", "emailondeck.com", "mailde.de", "byom.de",
]);

/**
 * Muster, die auf Schule, Traeger oder Behoerde hindeuten. NUR ein Signal fuer die
 * Admin-Ansicht — kein Tor. Absichtlich grosszuegig: ein Fehltreffer kostet nichts,
 * ein Fehlalarm wuerde einen echten Kunden aussperren.
 */
const INSTITUTIONELL: RegExp[] = [
  /\.schule$/,                                   // .schule-TLD
  /\.bund\.de$/, /\.landtag\..+$/,               // Bund/Land
  /(^|[.-])schul(e|en|amt|traeger|träger)?[.-]/, // schulen.koeln.de, schul-it.…
  /schule|schulen|schulamt/,                     // …-schule.de
  /gymnasium|gesamtschule|grundschule|realschule|hauptschule|oberschule|mittelschule/,
  /berufskolleg|berufsschule|fachschule|gesamtschul|foerderschule|förderschule/,
  /\bkita\b|kindergarten|hort/,
  /(^|\.)(stadt|gemeinde|kreis|landkreis|bezirk|kommune)[.-]/,
  /\.(gv|ac)\.at$/, /\.edu$/, /\.ac\.uk$/,       // AT/int. Bildung & Verwaltung
  /bildung|paedagog|pädagog|foerderverein|förderverein/,
];

export type InvoiceEligibility =
  | { ok: true; institutionell: boolean; domain: string }
  | { ok: false; grund: "freemail" | "wegwerfadresse" | "ungueltig"; domain: string };

/** Kommagetrennte Domains aus der Env (Einzelfall-Freigaben bzw. Zusatz-Sperren). */
function envDomains(name: string): Set<string> {
  const raw = process.env[name];
  if (!raw) return new Set();
  return new Set(
    raw.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean)
  );
}

export function domainOf(email: string): string {
  const at = email.lastIndexOf("@");
  return at < 0 ? "" : email.slice(at + 1).trim().toLowerCase();
}

/** Erkennt institutionelle Muster — reines Signal, kein Tor. */
export function istInstitutionell(email: string): boolean {
  const domain = domainOf(email);
  if (!domain) return false;
  return INSTITUTIONELL.some((re) => re.test(domain));
}

/**
 * Darf mit dieser Adresse auf Rechnung bestellt werden?
 *
 * Reihenfolge: Allowlist schlaegt alles (Einzelfall-Freigabe), dann Sperren.
 */
export function pruefeRechnungsAdresse(email: string): InvoiceEligibility {
  const domain = domainOf(email);
  if (!domain || !domain.includes(".")) {
    return { ok: false, grund: "ungueltig", domain };
  }

  if (envDomains("INVOICE_DOMAIN_ALLOWLIST").has(domain)) {
    return { ok: true, institutionell: true, domain };
  }
  if (DISPOSABLE.has(domain)) {
    return { ok: false, grund: "wegwerfadresse", domain };
  }
  if (FREEMAIL.has(domain) || envDomains("INVOICE_DOMAIN_BLOCKLIST").has(domain)) {
    return { ok: false, grund: "freemail", domain };
  }

  return { ok: true, institutionell: istInstitutionell(email), domain };
}

/** Nutzertext zur Ablehnung — muss den Weg zeigen, nicht nur die Tuer zuschlagen. */
export function ablehnungsText(grund: "freemail" | "wegwerfadresse" | "ungueltig"): string {
  if (grund === "ungueltig") {
    return "Bitte geben Sie eine gültige E-Mail-Adresse an.";
  }
  if (grund === "wegwerfadresse") {
    return "Mit einer Wegwerf-Adresse ist der Kauf auf Rechnung nicht möglich. " +
      "Bitte verwenden Sie die dienstliche Adresse Ihrer Schule oder Ihres Trägers.";
  }
  return (
    "Der Kauf auf Rechnung ist der dienstlichen Adresse Ihrer Schule oder Ihres Trägers " +
    "vorbehalten (z. B. name@schule-musterstadt.de) — die Leistung wird dabei sofort " +
    "freigeschaltet, bevor die Zahlung eingeht. Mit einer privaten E-Mail-Adresse können " +
    "Sie stattdessen direkt per Karte bezahlen. Wenn Ihre Einrichtung keine eigene Domain " +
    "hat, schreiben Sie uns kurz — wir schalten Sie frei."
  );
}
