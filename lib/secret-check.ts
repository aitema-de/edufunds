/**
 * Runtime-Secret-Prüfung (Go-Live-Härtung).
 *
 * BEWUSST KEIN Build-Time-Check: Im CI/Build dürfen Prod-Secrets fehlen, ein
 * harter Build-Fehler wäre falsch. Stattdessen ein lauter Log beim ersten Request
 * in Production — damit ein fehlendes kritisches Secret SOFORT auffällt, statt
 * still zu degradieren (Retention-Cron liefert 503 und läuft nie → PII sammelt
 * sich; Admin-Login gesperrt; Zahlungen/Webhook tot; LLM-Generierung 401/402).
 */

interface RequiredSecret {
  key: string;
  hint: string;
}

const REQUIRED_PRODUCTION_SECRETS: RequiredSecret[] = [
  { key: "DATABASE_URL", hint: "DB-Verbindung" },
  { key: "STRIPE_SECRET_KEY", hint: "Zahlungen" },
  { key: "STRIPE_WEBHOOK_SECRET", hint: "Webhook-Signaturprüfung" },
  { key: "CRON_SECRET", hint: "Retention-/Newsletter-Cron" },
  { key: "ADMIN_PASSWORD_HASH", hint: "Admin-Login" },
];

/** Der je nach LLM_PROVIDER erwartete API-Key (mistral = Default/EU). */
export function providerKeyName(): string {
  const p = (process.env.LLM_PROVIDER || "mistral").toLowerCase();
  if (p === "deepseek") return "DEEPSEEK_API_KEY";
  if (p === "gemini") return "GEMINI_API_KEY";
  return "MISTRAL_API_KEY";
}

function isSet(key: string): boolean {
  return (process.env[key] ?? "").trim().length > 0;
}

/** Namen der in Production fehlenden kritischen Secrets (leer = alles gesetzt). */
export function missingProductionSecrets(): string[] {
  const required = [...REQUIRED_PRODUCTION_SECRETS.map((s) => s.key), providerKeyName()];
  return required.filter((k) => !isSet(k));
}

let alreadyLogged = false;

/**
 * Loggt den Secret-Status genau EINMAL pro Prozess und nur in Production.
 * Fehlende Secrets → lauter console.error; sonst eine knappe Bestätigung.
 * Wirft NICHT (darf den Request nicht abbrechen) — die betroffenen Endpunkte
 * sind bereits fail-closed (503/401), dies macht die Fehlkonfiguration nur sichtbar.
 */
export function logSecretStatusOnce(): void {
  if (alreadyLogged) return;
  alreadyLogged = true;
  if ((process.env.NODE_ENV || "") !== "production") return;
  const missing = missingProductionSecrets();
  if (missing.length > 0) {
    console.error(
      `[secret-check] 🔴 FEHLENDE Produktions-Secrets: ${missing.join(", ")} — ` +
        `betroffene Funktionen degradieren still (Zahlungen/Webhook/Cron/Admin/LLM). ` +
        `Bitte in .env.production setzen und Container neu erzeugen.`
    );
  } else {
    console.log("[secret-check] alle kritischen Produktions-Secrets vorhanden.");
  }
}
