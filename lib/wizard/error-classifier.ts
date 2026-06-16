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

import { PROGRAMM_COUNT_ROUNDED } from "@/lib/programm-count";

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
      title: "Unsere KI ist gerade überlastet",
      message: `Das Modell hat sein Stunden-Kontingent ausgeschöpft. Versuchen Sie es in ein paar Minuten erneut, oder durchsuchen Sie unseren Katalog mit über ${PROGRAMM_COUNT_ROUNDED} Programmen direkt.`,
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
        "Die KI hat innerhalb von 30 Sekunden nicht geantwortet — meistens ein vorübergehendes Auslastungsproblem. Versuchen Sie es erneut.",
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
        "Wir konnten die KI nicht erreichen oder bekamen eine ungewohnte Antwort. Das ist meist vorübergehend. Versuchen Sie es erneut, oder durchsuchen Sie den Katalog manuell.",
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
      title: "Eingabe ist nicht gültig",
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
      "Etwas Unerwartetes ist passiert. Versuchen Sie es erneut, oder durchsuchen Sie den Katalog manuell. Falls das Problem bleibt, schreiben Sie uns an support@edufunds.org.",
    canRetry: true,
    hasManualFallback: true,
  };
}
