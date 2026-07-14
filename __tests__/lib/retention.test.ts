/**
 * Löschkonzept (DSGVO Art. 5(1)e) — der Löschplan muss deterministisch die
 * richtigen Tabellen, Fristen und Schutz-Bedingungen treffen.
 */
import { buildRetentionPlan, DEFAULT_RETENTION } from "@/lib/retention";

const NOW = new Date("2026-06-12T12:00:00.000Z");

function op(name: string) {
  const found = buildRetentionPlan(NOW).find((o) => o.name === name);
  if (!found) throw new Error(`Op ${name} fehlt im Plan`);
  return found;
}

describe("buildRetentionPlan", () => {
  it("löscht abgelaufene Magic-Links anhand der aktuellen Zeit", () => {
    const o = op("magic_links_expired");
    expect(o.kind).toBe("delete");
    expect(o.sql).toMatch(/DELETE FROM magic_links/);
    expect(o.params[0]).toBe(NOW.toISOString());
  });

  it("löscht unbestätigte Newsletter-Einträge nach der konfigurierten Frist", () => {
    const o = op("newsletter_unconfirmed");
    expect(o.sql).toMatch(/confirmed = FALSE/);
    const expectedCutoff = new Date(
      NOW.getTime() - DEFAULT_RETENTION.unconfirmedNewsletterDays * 86400000
    ).toISOString();
    expect(o.params[0]).toBe(expectedCutoff);
  });

  it("löscht NUR verwaiste, unbezahlte, autorlose Antrags-Entwürfe", () => {
    const o = op("abandoned_anonymous_drafts");
    expect(o.sql).toMatch(/paid_token IS NULL/);
    expect(o.sql).toMatch(/author_email IS NULL/);
    // bezahlte/eingereichte Status dürfen NICHT gelöscht werden
    expect(o.sql).not.toMatch(/'paid'/);
    expect(o.sql).not.toMatch(/'submitted'/);
    expect(o.sql).toMatch(/status IN \('draft', 'in_progress', 'complete'\)/);
  });

  it("anonymisiert identitätsgebundene, nie bezahlte Entwürfe nach 90 Tagen (nicht löschen)", () => {
    const o = op("anonymize_abandoned_identified_drafts");
    expect(o.kind).toBe("anonymize");
    expect(o.sql).not.toMatch(/DELETE/);
    // Nur unbezahlte, aber E-Mail-gebundene Entwürfe
    expect(o.sql).toMatch(/author_email IS NOT NULL/);
    expect(o.sql).toMatch(/paid_token IS NULL/);
    expect(o.sql).toMatch(/paid_at IS NULL/);
    expect(o.sql).toMatch(/status IN \('draft', 'in_progress', 'complete'\)/);
    // PII wird entfernt
    expect(o.sql).toMatch(/antrag_data = '\{"_anonymized": true\}'::jsonb/);
    expect(o.sql).toMatch(/author_email = NULL/);
    expect(o.sql).toMatch(/stripe_customer_email = NULL/);
    expect(o.sql).toMatch(/ip_address = NULL/);
    // Idempotenz: bereits anonymisierte Zeilen ausgeschlossen
    expect(o.sql).toMatch(/NOT jsonb_exists\(antrag_data, '_anonymized'\)/);
    // Frist = abandonedIdentifiedDraftDays (Default 90)
    const expected = new Date(
      NOW.getTime() - DEFAULT_RETENTION.abandonedIdentifiedDraftDays * 86400000
    ).toISOString();
    expect(o.params[0]).toBe(expected);
  });

  it("Default-Frist für identitätsgebundene, unbezahlte Entwürfe = 90 Tage", () => {
    expect(DEFAULT_RETENTION.abandonedIdentifiedDraftDays).toBe(90);
  });

  it("die Lösch-Regel für anonyme Entwürfe fasst KEINE E-Mail-gebundenen Zeilen an (kein Overlap)", () => {
    // Sicherstellen, dass Delete (author_email IS NULL) und Anonymize
    // (author_email IS NOT NULL) sich gegenseitig ausschließen.
    expect(op("abandoned_anonymous_drafts").sql).toMatch(/author_email IS NULL/);
    expect(op("anonymize_abandoned_identified_drafts").sql).toMatch(/author_email IS NOT NULL/);
  });

  it("anonymisiert IP/User-Agent in allen drei betroffenen Tabellen", () => {
    expect(op("anonymize_ip_ki_antraege").sql).toMatch(/UPDATE ki_antraege SET ip_address = NULL/);
    expect(op("anonymize_ip_contact_requests").sql).toMatch(
      /user_agent = NULL, referrer = NULL/
    );
    expect(op("anonymize_ip_newsletter").sql).toMatch(/confirmed = TRUE/);
  });

  it("setzt die IP-Anonymisierungsfrist konsistent über die Tabellen", () => {
    const expected = new Date(
      NOW.getTime() - DEFAULT_RETENTION.ipAnonymizeDays * 86400000
    ).toISOString();
    expect(op("anonymize_ip_ki_antraege").params[0]).toBe(expected);
    expect(op("anonymize_ip_contact_requests").params[0]).toBe(expected);
    expect(op("anonymize_ip_newsletter").params[0]).toBe(expected);
  });

  it("anonymisiert bezahlte Anträge nach 12 Monaten, behält Audit-Refs, ist idempotent", () => {
    const o = op("anonymize_expired_paid_antraege");
    expect(o.kind).toBe("anonymize");
    // Greift NUR bezahlte Anträge nach Fristablauf
    expect(o.sql).toMatch(/status = 'paid'/);
    expect(o.sql).toMatch(/paid_at < \$1/);
    // PII wird entfernt
    expect(o.sql).toMatch(/antrag_data = '\{"_anonymized": true\}'::jsonb/);
    expect(o.sql).toMatch(/stripe_customer_email = NULL/);
    expect(o.sql).toMatch(/author_email = NULL/);
    // Audit-/GoBD-Referenzen werden NICHT angefasst
    expect(o.sql).not.toMatch(/invoice_number/);
    expect(o.sql).not.toMatch(/stripe_session_id/);
    expect(o.sql).not.toMatch(/DELETE/);
    // Idempotenz: bereits anonymisierte Zeilen werden ausgeschlossen
    expect(o.sql).toMatch(/NOT jsonb_exists\(antrag_data, '_anonymized'\)/);
    // Frist = paidAntragDays (Default 365)
    const expected = new Date(
      NOW.getTime() - DEFAULT_RETENTION.paidAntragDays * 86400000
    ).toISOString();
    expect(o.params[0]).toBe(expected);
  });

  it("Default-Frist für bezahlte Anträge = 365 Tage (12 Monate)", () => {
    expect(DEFAULT_RETENTION.paidAntragDays).toBe(365);
  });
});
