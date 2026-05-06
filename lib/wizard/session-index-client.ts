/**
 * Browser-lokaler Index aller Wizard-Sessions.
 * Jede gestartete Session legt unter `edufunds.wizard.session.<programmId>` den session_token ab.
 * Diese Library durchsucht den localStorage und gibt strukturierte Eintraege zurueck.
 */

const SESSION_KEY_PREFIX = "edufunds.wizard.session.";

export interface LocalSessionEntry {
  programmId: string;
  sessionToken: string;
}

export function listLocalSessions(): LocalSessionEntry[] {
  if (typeof window === "undefined") return [];
  const out: LocalSessionEntry[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(SESSION_KEY_PREFIX)) continue;
    const programmId = key.slice(SESSION_KEY_PREFIX.length);
    const sessionToken = window.localStorage.getItem(key);
    if (programmId && sessionToken) {
      out.push({ programmId, sessionToken });
    }
  }
  return out;
}

export function removeLocalSession(programmId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY_PREFIX + programmId);
}
