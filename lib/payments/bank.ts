/**
 * Bankverbindung + Rechnungs-Konstanten fuer den Kontingent-Rechnungskauf (B2).
 *
 * Werte stammen aus Env (Produktion), mit den dokumentierten aitema-GLS-Daten als
 * Fallback fuer Dev/Staging. Quelle der Stammdaten:
 * .planning/payments/LEGACY-CHECKOUT-REFERENCE.md (waren frueher hartkodiert).
 */

export interface BankDetails {
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
}

export function getBankDetails(): BankDetails {
  return {
    accountHolder: process.env.BANK_ACCOUNT_HOLDER ?? "aitema GmbH",
    iban: process.env.BANK_IBAN ?? "DE91 4306 0967 1250 4734 00",
    bic: process.env.BANK_BIC ?? "GENODEM1GLS",
    bankName: process.env.BANK_NAME ?? "GLS Bank",
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
