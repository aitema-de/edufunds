/**
 * lexoffice / Lexware Office Public API — Client fuer automatische Rechnungen.
 *
 * Base-URL `https://api.lexware.io` (umbenannt von lexoffice; alte Domain seit
 * 12/2025 tot). Auth via Bearer-API-Key (`LEXOFFICE_API_KEY`, Key aus
 * app.lexware.de/addons/public-api — nur XL-Tarif).
 *
 * Flow: createInvoice(finalize=true) -> getInvoice (Nummer) -> renderDocument
 * (documentFileId) -> downloadFile (PDF-Buffer). Die API verschickt KEINE Mail —
 * das PDF wird selbst per Resend zugestellt.
 *
 * Rate-Limit: 2 req/s -> withLexRetry wiederholt 429/5xx mit Backoff.
 */

const BASE = "https://api.lexware.io";

function apiKey(): string {
  return process.env.LEXOFFICE_API_KEY ?? "";
}

export function lexofficeConfigured(): boolean {
  return Boolean(process.env.LEXOFFICE_API_KEY);
}

export interface LexInvoiceAddress {
  name: string;
  supplement?: string;
  street?: string;
  zip?: string;
  city?: string;
  countryCode?: string; // ISO alpha-2, default DE
}

export interface CreateInvoiceInput {
  address: LexInvoiceAddress;
  lineItemName: string;
  /** Bruttobetrag, z. B. 29.90 (taxType=gross). */
  grossAmount: number;
  /** USt-Satz in Prozent, z. B. 19. */
  taxRatePercentage: number;
  currency?: string; // default EUR
  remark?: string;
  /**
   * Text der Zahlungsbedingung auf der Rechnung.
   *
   * MUSS gesetzt sein, sonst zieht lexoffice die Standard-Bedingung der
   * Organisation ("zahlbar innerhalb X Tagen") — und die ist hier IMMER falsch:
   * Jede Rechnung, die dieser Client erzeugt, gehoert zu einem bereits per
   * Stripe-Checkout bezahlten Kauf. Ein Zahlungsziel darauf fordert Geld ein,
   * das schon geflossen ist (Kunde zahlt womoeglich doppelt).
   *
   * Deshalb hier ein Default statt eines optionalen Felds: Wer diesen Client
   * spaeter fuer den Kauf auf Rechnung nutzt (org_orders — laeuft heute NICHT
   * ueber lexoffice), muss die Bedingung bewusst ueberschreiben.
   */
  paymentTermLabel?: string;
  /** Zahlungsziel in Tagen. Default 0 = sofort faellig//bereits beglichen. */
  paymentTermDurationDays?: number;
}

/**
 * Default-Zahlungsbedingung: Die Rechnung ist zum Zeitpunkt ihrer Entstehung
 * bereits bezahlt (Stripe-Checkout lief vor dem Webhook, der sie ausloest).
 */
export const ZAHLUNGSBEDINGUNG_BEREITS_BEZAHLT =
  "Bereits bezahlt — der Betrag wurde per Stripe-Checkout beglichen. " +
  "Diese Rechnung dient Ihrer Information und ist nicht zu überweisen.";

export interface CreatedInvoice {
  id: string;
  resourceUri?: string;
}

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 700;

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function lexFetch(
  path: string,
  init: RequestInit & { rawBinary?: boolean } = {}
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${apiKey()}`,
          Accept: init.rawBinary ? "application/pdf" : "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers ?? {}),
        },
      });
      if (!res.ok && isRetryable(res.status) && attempt < MAX_ATTEMPTS) {
        await delay(BASE_DELAY_MS * 2 ** (attempt - 1));
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`lexoffice ${init.method ?? "GET"} ${path} -> ${res.status}: ${body.slice(0, 300)}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      // Netzwerkfehler ebenfalls retrien
      if (attempt < MAX_ATTEMPTS && err instanceof TypeError) {
        await delay(BASE_DELAY_MS * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Baut den finalisierten (oder Entwurfs-)Rechnungs-Body. Exportiert fuer Tests. */
export function buildInvoiceBody(input: CreateInvoiceInput, isoDate: string) {
  const currency = input.currency ?? "EUR";
  return {
    voucherDate: isoDate,
    address: {
      name: input.address.name,
      ...(input.address.supplement ? { supplement: input.address.supplement } : {}),
      ...(input.address.street ? { street: input.address.street } : {}),
      ...(input.address.zip ? { zip: input.address.zip } : {}),
      ...(input.address.city ? { city: input.address.city } : {}),
      countryCode: input.address.countryCode ?? "DE",
    },
    lineItems: [
      {
        type: "custom",
        name: input.lineItemName,
        quantity: 1,
        unitName: "Stück",
        unitPrice: {
          currency,
          grossAmount: input.grossAmount,
          taxRatePercentage: input.taxRatePercentage,
        },
      },
    ],
    totalPrice: { currency },
    taxConditions: { taxType: "gross" },
    shippingConditions: { shippingType: "service", shippingDate: isoDate },
    // Ohne paymentConditions setzt lexoffice die Organisations-Standardbedingung
    // ("zahlbar in X Tagen"). Bei einer bereits per Stripe bezahlten Rechnung ist
    // das eine Zahlungsaufforderung fuer Geld, das schon da ist.
    // (Gefunden 17.07.2026 am ersten echten Rechnungsentwurf.)
    paymentConditions: {
      paymentTermLabel: input.paymentTermLabel ?? ZAHLUNGSBEDINGUNG_BEREITS_BEZAHLT,
      paymentTermDuration: input.paymentTermDurationDays ?? 0,
    },
    ...(input.remark ? { remark: input.remark } : {}),
  };
}

/**
 * Legt eine Rechnung an. `finalize=true` schreibt sie fest (fortlaufende
 * Nummer + PDF). Fuer Tests `finalize=false` (Entwurf, loeschbar, keine Nummer).
 */
export async function createInvoice(
  input: CreateInvoiceInput,
  opts: { finalize?: boolean; isoDate?: string } = {}
): Promise<CreatedInvoice> {
  const finalize = opts.finalize ?? true;
  const isoDate = opts.isoDate ?? new Date().toISOString();
  const res = await lexFetch(`/v1/invoices?finalize=${finalize}`, {
    method: "POST",
    body: JSON.stringify(buildInvoiceBody(input, isoDate)),
  });
  return (await res.json()) as CreatedInvoice;
}

/** Liest die fortlaufende Rechnungsnummer (voucherNumber) einer finalisierten Rechnung. */
export async function getInvoiceNumber(invoiceId: string): Promise<string | undefined> {
  const res = await lexFetch(`/v1/invoices/${invoiceId}`);
  const json = (await res.json()) as { voucherNumber?: string };
  return json.voucherNumber;
}

/**
 * Rendert das PDF-Dokument und liefert die documentFileId. Direkt nach
 * Finalisierung kann das Rendern minimal verzoegert sein -> kurzer Poll.
 */
export async function getInvoiceDocumentFileId(invoiceId: string): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await lexFetch(`/v1/invoices/${invoiceId}/document`);
      const json = (await res.json()) as { documentFileId?: string };
      if (json.documentFileId) return json.documentFileId;
    } catch (err) {
      if (attempt === 3) throw err;
    }
    await delay(800);
  }
  throw new Error(`lexoffice: kein documentFileId fuer Rechnung ${invoiceId}`);
}

/** Laedt eine Datei (PDF) als Buffer herunter. */
export async function downloadFile(fileId: string): Promise<Buffer> {
  const res = await lexFetch(`/v1/files/${fileId}`, { rawBinary: true });
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/** Loescht eine Rechnung (nur Entwuerfe loeschbar — fuer Test-Cleanup). */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  await lexFetch(`/v1/invoices/${invoiceId}`, { method: "DELETE" });
}
