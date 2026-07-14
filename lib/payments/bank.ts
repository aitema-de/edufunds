/**
 * Bankverbindung + Rechnungs-Konstanten fuer den Rechnungskauf.
 *
 * 🔴 Die frueher hier hinterlegte Fallback-IBAN "DE91 4306 0967 1250 4734 00" ist
 * ein DUMMY — ihre Pruefsumme (ISO 13616, mod 97) ist ungueltig. Sie stand als
 * Default im Code, waehrend BANK_IBAN auf Produktion NICHT gesetzt war. Damit haette
 * jede Rechnungs- und Mahnmail eine nicht ueberweisbare IBAN als Zahlungsziel
 * genannt: Die Schule kann nicht zahlen, die Zahlung bleibt aus — und der Mahnlauf
 * schickt eine Mahnung mit derselben kaputten IBAN hinterher.
 *
 * Deshalb: KEIN Fallback mehr. Fehlt oder stimmt die IBAN nicht, wirft
 * getBankDetails() — der Rechnungskauf schlaegt fehl (500), statt eine falsche
 * Kontoverbindung zu versenden. Lieber ein sichtbarer Fehler als eine Rechnung,
 * die ins Leere zeigt. (Gleiche Logik wie beim LLM-Provider-Guard: lieber
 * Startfehler als stiller Schaden.)
 */

export interface BankDetails {
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
}

/** IBAN-Pruefsumme nach ISO 13616: Land+Pruefziffer ans Ende, Buchstaben→Zahlen, mod 97 == 1. */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const umgestellt = iban.slice(4) + iban.slice(0, 4);
  const ziffern = umgestellt.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  // Stueckweise mod 97 — die Zahl ist zu gross fuer Number.
  let rest = 0;
  for (const c of ziffern) rest = (rest * 10 + Number(c)) % 97;
  return rest === 1;
}

/** Fehlt eine Bankangabe oder ist die IBAN ungueltig? Namen der Probleme (leer = ok). */
export function bankConfigProblems(): string[] {
  const probleme: string[] = [];
  const iban = (process.env.BANK_IBAN ?? "").trim();
  if (!iban) probleme.push("BANK_IBAN fehlt");
  else if (!isValidIban(iban)) probleme.push("BANK_IBAN hat eine ungueltige Pruefsumme");
  if (!(process.env.BANK_ACCOUNT_HOLDER ?? "").trim()) probleme.push("BANK_ACCOUNT_HOLDER fehlt");
  if (!(process.env.BANK_BIC ?? "").trim()) probleme.push("BANK_BIC fehlt");
  return probleme;
}

export function getBankDetails(): BankDetails {
  const probleme = bankConfigProblems();
  if (probleme.length > 0) {
    throw new Error(
      `Bankverbindung nicht konfiguriert (${probleme.join(", ")}). ` +
        `Der Rechnungskauf nennt die IBAN als Zahlungsziel — ohne gueltige Angabe wird ` +
        `keine Rechnung versendet.`
    );
  }
  return {
    accountHolder: process.env.BANK_ACCOUNT_HOLDER!.trim(),
    iban: process.env.BANK_IBAN!.trim(),
    bic: process.env.BANK_BIC!.trim(),
    bankName: (process.env.BANK_NAME ?? "").trim() || "—",
  };
}

/** Zahlungsziel in Tagen ab Bestellung (Standard fuer die oeffentliche Hand). */
export const PAYMENT_TERM_DAYS = 14;

/** Erzeugt eine Bestellnummer der Form EDU-<base36(timestamp)>-<rand>. */
export function generateOrderNumber(now: number = Date.now()): string {
  const ts = now.toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 36 ** 3)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `EDU-${ts}-${rand}`;
}

/** Faelligkeitsdatum als ISO-Date (YYYY-MM-DD), PAYMENT_TERM_DAYS ab `from`. */
export function dueDateISO(from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + PAYMENT_TERM_DAYS);
  return d.toISOString().slice(0, 10);
}
