/**
 * Zentrale Paket-/Preis-Definitionen — die EINZIGE Quelle (Single Source) fuer
 *
 *   - die Preisseite (`app/preise/page.tsx`),
 *   - den Rechnungskauf eines Kontingents (B2, `app/kontingent`),
 *   - den spaeteren Self-Service-Kontingentkauf per Karte (B3).
 *
 * Damit driften Anzeige, Bestellung und Rechnung nie auseinander.
 *
 * Preise GELOCKT 2026-06-09 (D-8 in .planning/payments/MONETIZATION-ARCHITECTURE.md):
 * monoton steigender Mengenrabatt gegen den Einzelpreis 29,90 EUR.
 *
 *   Paket        Preis (inkl. MwSt)   EUR/Antrag   Rabatt
 *   Einzel        29,90 EUR           29,90        0,0 %
 *   5 Antraege   139,90 EUR           27,98        6,4 %
 *   10 Antraege  249,90 EUR           24,99       16,4 %
 *   20 Antraege  459,90 EUR           22,99       23,1 %
 *
 * Alle Betraege als Integer-Cent (inkl. 19 % MwSt) — keine Floats im Geldpfad.
 */

/** Mehrwertsteuersatz fuer EduFunds-Leistungen (Standard 19 %). */
export const VAT_RATE = 0.19;

export interface Pack {
  /** Stabiler technischer Bezeichner (Bestellungen/Metadaten referenzieren ihn). */
  id: string;
  /** Anzahl freigeschalteter Antraege (Credits). */
  credits: number;
  /** Bruttopreis in Cent (inkl. MwSt). */
  priceCents: number;
  /** Anzeigename. */
  label: string;
  /** Kurzbeschreibung fuer Karten/Listen. */
  description: string;
  /**
   * Per Rechnungskauf (`/kontingent`, B2) bzw. Self-Service-Kontingent (B3)
   * bestellbar? Der Einzelantrag laeuft NICHT hierueber, sondern ueber den
   * kanonischen Wizard-Kartenflow (`/api/wizard/checkout`).
   */
  isQuota: boolean;
}

export const EINZELPREIS_CENTS = 2990;

export const PACKS: Pack[] = [
  {
    id: "einzel",
    credits: 1,
    priceCents: EINZELPREIS_CENTS,
    label: "Einzelantrag",
    description: "Ein KI-generierter Foerderantrag inkl. Finanzplan.",
    isQuota: false,
  },
  {
    id: "pack5",
    credits: 5,
    priceCents: 13990,
    label: "5 Anträge",
    description: "Kontingent für Schulen mit einzelnen Projekten pro Jahr.",
    isQuota: true,
  },
  {
    id: "pack10",
    credits: 10,
    priceCents: 24990,
    label: "10 Anträge",
    description: "Kontingent für aktive Schulen mit mehreren Vorhaben.",
    isQuota: true,
  },
  {
    id: "pack20",
    credits: 20,
    priceCents: 45990,
    label: "20 Anträge",
    description: "Kontingent für Schulträger mit mehreren Schulen.",
    isQuota: true,
  },
];

/** Liefert ein Paket per id oder `undefined`. */
export function getPack(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id);
}

/** Nur die per Rechnung/Self-Service bestellbaren Kontingent-Pakete. */
export function quotaPacks(): Pack[] {
  return PACKS.filter((p) => p.isQuota);
}

/** Cent → deutsches Waehrungsformat, z. B. 13990 → "139,90 €". */
export function formatEur(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/** Bruttopreis pro Antrag in Cent (kaufmaennisch gerundet). */
export function pricePerCreditCents(pack: Pack): number {
  return Math.round(pack.priceCents / pack.credits);
}

export interface VatBreakdown {
  grossCents: number;
  netCents: number;
  vatCents: number;
}

/**
 * Zerlegt einen Bruttobetrag in Netto + MwSt (Brutto ist fuehrend, damit
 * Anzeige und Zahlbetrag exakt uebereinstimmen; Netto wird zurueckgerechnet).
 */
export function vatBreakdown(grossCents: number): VatBreakdown {
  const netCents = Math.round(grossCents / (1 + VAT_RATE));
  return { grossCents, netCents, vatCents: grossCents - netCents };
}
