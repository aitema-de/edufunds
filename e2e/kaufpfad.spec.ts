/**
 * E2E über den KAUFPFAD — der Weg, der Geld bewegt.
 *
 * Bis heute klickte kein Test je durch Paywall, Freischaltung oder Rechnungskauf.
 * Die vier anderen Specs decken statische Seiten und ein Legacy-Formular ab.
 *
 * Läuft NUR über `npm run test:e2e:kaufpfad` (scripts/e2e-kaufpfad.mjs bootet
 * PostgreSQL + Next-Server und reicht Port und Session-Tokens per Env herein).
 *
 * Das KI-Interview wird bewusst NICHT gefahren: es kostet echte LLM-Calls und ist
 * nicht deterministisch; seine Qualität sichern die Pipeline-Evals. Geseedet wird
 * eine Session mit FERTIGEM Antrag — ab der Paywall ist es echt.
 */
import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

const TOKENS = JSON.parse(process.env.E2E_TOKENS ?? "{}") as Record<string, string>;
const PROGRAMM_ID = process.env.E2E_PROGRAMM_ID!;
const DATABASE_URL = process.env.DATABASE_URL!;

const SCHUL_MAIL = "sekretariat@gymnasium-musterstadt.de";
/**
 * Die Bremse zaehlt OFFENE Rechnungen PRO E-MAIL. Der Rechnungskauf-Test oben legt
 * bereits eine offene Rechnung auf SCHUL_MAIL an — mit derselben Adresse waere die
 * Bremse hier schon bei der zweiten Bestellung dran und der Test wuerde das Falsche
 * messen. Also eine eigene Adresse mit sauberem Zaehlerstand.
 */
const BREMSE_MAIL = "verwaltung@schulen-musterkreis.de";

async function db<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();
  try {
    const r = await c.query(sql, params);
    return r.rows as T[];
  } finally {
    await c.end();
  }
}

/** Öffnet den fertigen (unbezahlten) Antrag über den Resume-Link. */
async function oeffneAntrag(page: Page, token: string) {
  await page.goto(`/antrag/${PROGRAMM_ID}/wizard?session=${token}`);
  await expect(page.getByRole("button", { name: /freischalten/i }).first()).toBeVisible();
}

/** Füllt das Rechnungsformular aus und sendet es ab. */
async function rechnungAbsenden(page: Page, email: string) {
  await page.getByRole("button", { name: /Auf Rechnung/i }).click();
  await page.getByPlaceholder(/Organisation/i).fill("Gymnasium Musterstadt");
  await page.getByPlaceholder(/Ansprechpartner/i).fill("Frau Beispiel");
  await page.getByPlaceholder(/Dienstliche E-Mail/i).fill(email);
  await page.getByPlaceholder(/Rechnungsadresse/i).fill("Musterweg 1, 12345 Musterstadt");
  // Die Route weist Absendungen unter 3 Sekunden nach Laden als Bot ab.
  await page.waitForTimeout(3200);
  await page.getByRole("button", { name: /Freischalten & Rechnung/i }).click();
}

test.describe("Paywall", () => {
  test("versperrt den fertigen Antrag, solange nicht bezahlt ist", async ({ page }) => {
    await oeffneAntrag(page, TOKENS.karte);

    // Der Antrag ist fertig — aber es gibt keinen Weg zum Download.
    await expect(page.getByRole("button", { name: /freischalten/i }).first()).toBeVisible();
    expect(page.url()).not.toContain("/antrag/download/");

    // Und in der DB ist nichts freigeschaltet.
    const [row] = await db<{ paid_token: string | null; status: string }>(
      `SELECT paid_token, status FROM ki_antraege WHERE session_token = $1`,
      [TOKENS.karte]
    );
    expect(row.paid_token).toBeNull();
    expect(row.status).toBe("complete");
  });
});

test.describe("Kauf per Karte", () => {
  test("schaltet frei und führt auf die Download-Seite", async ({ page }) => {
    await oeffneAntrag(page, TOKENS.karte);

    // Dev-Mock steht für die Stripe-Zahlung (NEXT_PUBLIC_PAYWALL_DEV_MOCK=1).
    await page.getByRole("button", { name: /Jetzt freischalten/i }).click();

    await page.waitForURL(/\/antrag\/download\/.+/, { timeout: 20_000 });

    // Die Download-Seite zeigt den Antrag — nicht die Paywall.
    await expect(page.getByText(/Bezahlt · Freigeschaltet/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /freischalten/i })).toHaveCount(0);

    // Und die DB stimmt mit dem überein, was der Browser sieht.
    const [row] = await db<{ paid_token: string; status: string; entitlement_source: string }>(
      `SELECT paid_token, status, entitlement_source FROM ki_antraege WHERE session_token = $1`,
      [TOKENS.karte]
    );
    expect(row.status).toBe("paid");
    expect(row.paid_token).toBeTruthy();
    expect(page.url()).toContain(row.paid_token);
  });

  test("der Download-Link trägt auch nach einem Neuladen (kein Sitzungs-Zufall)", async ({ page }) => {
    const [row] = await db<{ paid_token: string }>(
      `SELECT paid_token FROM ki_antraege WHERE session_token = $1`,
      [TOKENS.karte]
    );
    await page.goto(`/antrag/download/${row.paid_token}`);
    await expect(page.getByText(/Bezahlt · Freigeschaltet/i)).toBeVisible();
  });
});

test.describe("Kauf auf Rechnung", () => {
  test("schaltet mit Schul-Adresse frei und legt die Bestellung an", async ({ page }) => {
    await oeffneAntrag(page, TOKENS.rechnung);
    await rechnungAbsenden(page, SCHUL_MAIL);

    await page.waitForURL(/\/antrag\/download\/.+/, { timeout: 20_000 });
    await expect(page.getByText(/Bezahlt · Freigeschaltet/i)).toBeVisible();

    // Die Bestellung steht — mit Antragsbezug, offen, 14 Tage Ziel.
    const [order] = await db<{
      status: string;
      amount_cents: number;
      email: string;
      session_token: string;
    }>(`SELECT status, amount_cents, email, session_token FROM org_orders WHERE session_token = $1`, [
      TOKENS.rechnung,
    ]);
    expect(order.status).toBe("payment_pending");
    expect(order.amount_cents).toBe(2990);
    expect(order.email).toBe(SCHUL_MAIL);
  });

  test("weist eine private Adresse ab — und schaltet NICHT frei (AGB § 4a)", async ({ page }) => {
    await oeffneAntrag(page, TOKENS.gate);
    await rechnungAbsenden(page, "lehrerin@gmail.com");

    // Der Kunde sieht die Begründung, nicht eine tote Seite.
    await expect(page.getByText(/dienstlichen Adresse Ihrer Schule/i)).toBeVisible();
    expect(page.url()).not.toContain("/antrag/download/");

    // Entscheidend: nichts freigeschaltet, keine Bestellung.
    const [row] = await db<{ paid_token: string | null }>(
      `SELECT paid_token FROM ki_antraege WHERE session_token = $1`,
      [TOKENS.gate]
    );
    expect(row.paid_token).toBeNull();
    const orders = await db(`SELECT 1 FROM org_orders WHERE email = $1`, ["lehrerin@gmail.com"]);
    expect(orders).toHaveLength(0);
  });

  test("die Bremse greift ab der dritten offenen Rechnung (409)", async ({ page }) => {
    // Zwei Bestellungen mit derselben Adresse gehen durch …
    for (const key of ["bremse1", "bremse2"] as const) {
      await oeffneAntrag(page, TOKENS[key]);
      await rechnungAbsenden(page, BREMSE_MAIL);
      await page.waitForURL(/\/antrag\/download\/.+/, { timeout: 20_000 });
    }

    // … die dritte nicht: der Rechnungskauf schaltet vor Zahlungseingang frei,
    // also deckelt MAX_OPEN_INVOICE_ORDERS das offene Risiko pro Besteller.
    await oeffneAntrag(page, TOKENS.bremse3);
    await rechnungAbsenden(page, BREMSE_MAIL);

    await expect(page.getByText(/bereits Rechnungen offen/i)).toBeVisible();
    expect(page.url()).not.toContain("/antrag/download/");

    // Und der dritte Antrag ist NICHT freigeschaltet — die Prüfung steht vor der
    // Freischaltung, nicht danach.
    const [row] = await db<{ paid_token: string | null }>(
      `SELECT paid_token FROM ki_antraege WHERE session_token = $1`,
      [TOKENS.bremse3]
    );
    expect(row.paid_token).toBeNull();
  });
});

test.describe("Rückerstattung", () => {
  test("entwertet den Download-Link und erklärt, warum (statt nackter 404)", async ({ page }) => {
    // Ausgangslage: der per Karte gekaufte Antrag ist freigeschaltet.
    const [vorher] = await db<{ paid_token: string }>(
      `SELECT paid_token FROM ki_antraege WHERE session_token = $1`,
      [TOKENS.karte]
    );
    const token = vorher.paid_token;
    await page.goto(`/antrag/download/${token}`);
    await expect(page.getByText(/Bezahlt · Freigeschaltet/i)).toBeVisible();

    // Der Stripe-Webhook entwertet nach voller Erstattung (revokeSessionAccess).
    await db(
      `UPDATE ki_antraege
          SET status = 'refunded', refunded_token = paid_token,
              paid_token = NULL, refunded_at = CURRENT_TIMESTAMP
        WHERE session_token = $1`,
      [TOKENS.karte]
    );

    await page.goto(`/antrag/download/${token}`);
    await expect(page.getByText(/Zahlung erstattet/i)).toBeVisible();
    await expect(page.getByText(/zurückerstattet/i)).toBeVisible();
    // Der Antragstext ist weg.
    await expect(page.getByText(/Bezahlt · Freigeschaltet/i)).toHaveCount(0);
  });
});
