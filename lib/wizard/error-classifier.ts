/**
 * Klassifiziert rohe Fehler-Strings (typisch: Library-Throws, HTTP-Fehler)
 * in kategorisierte UI-Anzeigen mit anwender-freundlichen Texten.
 *
 * Genutzt im Wizard-Frontend (StartClient, WizardShell, FinanzplanEditor),
 * um zu vermeiden, dass User Roh-Strings wie
 *   „[GoogleGenerativeAI Error]: Error fetching from
 *    https://generativelanguage.googleapis.com/… [429 Too Many Requests]
 *    Resource exhausted. Please try again later."
 * sehen. Stattdessen Titel + erklaerender Text + Fallback-Aktionen.
 */

export type WizardErrorKind =
  | "rate-limit"
  | "gemini-down"
  | "timeout"
  | "validation"
  | "not-found"
  | "unknown";

export interface WizardErrorState {
  kind: WizardErrorKind;
  raw: string;
  title: string;
  message: string;
  /** true, wenn ein Retry-Button sinnvoll ist (transient/serverseitig) */
  canRetry: boolean;
  /** true, wenn der Anwender vom KI-Pfad auf manuelle Bedienung wechseln kann */
  hasManualFallback: boolean;
}

export function classifyWizardError(
  rawMessage: string,
  httpStatus?: number
): WizardErrorState {
  const r = (rawMessage ?? "").toLowerCase();

  if (
    r.includes("resource exhausted") ||
    r.includes("429") ||
    r.includes("too many requests") ||
    httpStatus === 429
  ) {
    return {
      kind: "rate-limit",
      raw: rawMessage,
      title: "Unsere KI ist gerade ueberlastet",
      message:
        "Das Modell hat sein Stunden-Kontingent ausgeschoepft. Versuche es in ein paar Minuten erneut, oder durchsuche unseren Katalog mit ueber 130 Programmen direkt.",
      canRetry: true,
      hasManualFallback: true,
    };
  }

  if (r.includes("zeitlimit") || r.includes("timeout") || httpStatus === 504) {
    return {
      kind: "timeout",
      raw: rawMessage,
      title: "Antwort kam nicht rechtzeitig",
      message:
        "Die KI hat innerhalb von 30 Sekunden nicht geantwortet — meistens ein voruebergehendes Auslastungsproblem. Versuche es erneut.",
      canRetry: true,
      hasManualFallback: true,
    };
  }

  if (
    r.includes("googlegenerativeai") ||
    r.includes("generativelanguage") ||
    r.includes("gemini") ||
    r.includes("kein valides json")
  ) {
    return {
      kind: "gemini-down",
      raw: rawMessage,
      title: "KI-Anbindung gerade nicht erreichbar",
      message:
        "Wir konnten die KI nicht erreichen oder bekamen eine ungewohnte Antwort. Das ist meist voruebergehend. Versuche es erneut, oder durchsuche den Katalog manuell.",
      canRetry: true,
      hasManualFallback: true,
    };
  }

  if (
    r.includes("mind. 20 zeichen") ||
    r.includes("zu kurz") ||
    r.includes("validation") ||
    r.includes("erforderlich") ||
    httpStatus === 400 ||
    httpStatus === 422
  ) {
    return {
      kind: "validation",
      raw: rawMessage,
      title: "Eingabe prueft sich nicht",
      message: rawMessage,
      canRetry: false,
      hasManualFallback: false,
    };
  }

  if (r.includes("nicht gefunden") || r.includes("not found") || httpStatus === 404) {
    return {
      kind: "not-found",
      raw: rawMessage,
      title: "Ressource nicht gefunden",
      message: rawMessage,
      canRetry: false,
      hasManualFallback: true,
    };
  }

  return {
    kind: "unknown",
    raw: rawMessage,
    title: "Etwas ist schiefgelaufen",
    message:
      "Etwas Unerwartetes ist passiert. Versuche es erneut, oder durchsuche den Katalog manuell. Falls das Problem bleibt, schreib uns an support@edufunds.org.",
    canRetry: true,
    hasManualFallback: true,
  };
}
