/**
 * Kanonische öffentliche Adresse der Plattform. Seit der Domain-Zusammenführung
 * (Cutover Phase 2) bedient die App selbst die Apex-Domain; `app.`/`www.` leiten
 * per 301 hierher. Einzige Quelle der Wahrheit für alle Fallbacks — früher lagen
 * über ein Dutzend abweichender Literale im Code (app.edufunds.org, edufunds.de,
 * localhost), die nach dem Switch tote oder falsche Links erzeugt hätten.
 */
export const CANONICAL_APP_URL = "https://edufunds.org";

/**
 * Vertrauenswürdige öffentliche Basis-URL aus Server-Konfiguration.
 *
 * WICHTIG (Sicherheit): NIEMALS aus Request-Headern (Host/Origin) ableiten, wenn
 * die URL in ausgehende E-Mails (z. B. Magic-Links) eingebettet wird. Sonst kann
 * ein Angreifer per Host-Header-Injection den Link auf seine Domain umbiegen und
 * Tokens abgreifen. Liefert null, wenn nicht konfiguriert — der Aufrufer darf dann
 * keinen Link versenden (fail-safe).
 */
export function trustedAppUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_APP_URL;
  if (!u) return null;
  const trimmed = u.trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(trimmed) ? trimmed : null;
}

/**
 * Öffentliche Basis-URL für nicht-sicherheitskritische Links (Newsletter-Buttons,
 * robots/sitemap, Admin-Hinweise). Anders als `trustedAppUrl()` fällt sie auf die
 * kanonische Domain zurück statt null zu liefern — ein Link auf die Live-Domain
 * ist hier besser als gar keiner. Für tokenführende Links (Magic-Link, Opt-in)
 * weiterhin `trustedAppUrl()` verwenden.
 */
export function publicAppUrl(): string {
  return trustedAppUrl() ?? CANONICAL_APP_URL;
}

/**
 * Validiert einen „next"-Redirect-Pfad: nur lokale Pfade (Single-Slash-Start,
 * kein protocol-relative `//`, keine Query/Fragmente/Doppelpunkte). Verhindert
 * Open-Redirect über den Magic-Link. Liefert den Pfad oder null.
 */
export function sanitizeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("//")) return null;
  if (!/^\/[A-Za-z0-9/_-]*$/.test(value)) return null;
  return value;
}
