"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Building2, Copy, Loader2, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { quotaPacks, formatEur, pricePerCreditCents, EINZELPREIS_CENTS } from "@/lib/payments/packs";

interface OrderSuccess {
  orderNumber: string;
  creditCode: string;
  credits: number;
  amountCents: number;
  dueDate: string;
}

const GOLD = "#c9a227";
const INK = "#0a1628";

export default function KontingentPage() {
  const packs = useMemo(() => quotaPacks(), []);
  const [packId, setPackId] = useState<string>(packs[1]?.id ?? packs[0]?.id ?? "");
  const [loadedAt, setLoadedAt] = useState<number>(0);
  const [form, setForm] = useState({
    orgName: "",
    contactName: "",
    email: "",
    billingAddress: "",
    vatId: "",
    poNumber: "",
    note: "",
    website: "", // Honeypot
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OrderSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setLoadedAt(Date.now()), []);

  const selectedPack = packs.find((p) => p.id === packId);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/kontingent/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, ...form, timestamp: loadedAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bestellung fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
      setSuccess(data as OrderSuccess);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    if (!success) return;
    navigator.clipboard?.writeText(success.creditCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ backgroundColor: "#f8f5f0" }}>
        <section className="pt-32 pb-12">
          <div className="container mx-auto px-6 max-w-4xl text-center">
            <span
              className="inline-block px-4 py-2 rounded-full text-xs font-medium tracking-wider uppercase mb-6"
              style={{ backgroundColor: "rgba(201, 162, 39, 0.1)", color: GOLD }}
            >
              Kontingent für Schulen & Träger
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: INK }}>
              Anträge zentral <span style={{ color: GOLD }}>vorab freischalten</span>
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#64748b" }}>
              Kaufen Sie ein Kontingent per Rechnung. Ihre Lehrkräfte schalten ihre fertigen
              Anträge mit einem Code frei – ohne selbst zu zahlen.
            </p>
          </div>
        </section>

        {success ? (
          <section className="pb-24">
            <div className="container mx-auto px-6 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-8 bg-white shadow-sm"
                style={{ border: "1px solid rgba(201, 162, 39, 0.3)" }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(34,197,94,0.12)" }}
                  >
                    <Check className="w-6 h-6" style={{ color: "#16a34a" }} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: INK }}>
                      Bestellung eingegangen
                    </h2>
                    <p className="text-sm" style={{ color: "#64748b" }}>
                      Bestellnummer {success.orderNumber}
                    </p>
                  </div>
                </div>

                <p className="mb-2 text-sm font-medium" style={{ color: "#64748b" }}>
                  Ihr Kontingent-Code ({success.credits} Anträge, 12 Monate gültig)
                </p>
                <div
                  className="flex items-center justify-between rounded-xl px-5 py-4 mb-6"
                  style={{ backgroundColor: "#f5f3ec", border: `1px solid ${GOLD}` }}
                >
                  <span
                    className="text-2xl font-bold tracking-widest"
                    style={{ fontFamily: "monospace", color: INK }}
                  >
                    {success.creditCode}
                  </span>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                    style={{ color: GOLD }}
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? "Kopiert" : "Kopieren"}
                  </button>
                </div>

                <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
                  Eine Bestätigung mit Bankverbindung, Verwendungszweck (
                  <strong>{success.orderNumber}</strong>) und Zahlungsziel (
                  {new Date(success.dueDate).toLocaleDateString("de-DE")}) ist an{" "}
                  <strong>{form.email}</strong> unterwegs. Die formelle Rechnung erhalten Sie
                  separat. Betrag: <strong>{formatEur(success.amountCents)}</strong> inkl. MwSt.
                </p>
                <p className="text-sm mt-4" style={{ color: "#64748b" }}>
                  Geben Sie den Code an Ihre Lehrkräfte weiter – sie lösen ihn beim Freischalten
                  ihres Antrags ein.
                </p>
              </motion.div>
            </div>
          </section>
        ) : (
          <section className="pb-24">
            <div className="container mx-auto px-6 max-w-4xl">
              {/* Paketauswahl */}
              <div className="grid sm:grid-cols-3 gap-4 mb-10">
                {packs.map((pack) => {
                  const active = pack.id === packId;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => setPackId(pack.id)}
                      className="text-left rounded-2xl p-5 transition-all bg-white"
                      style={{
                        border: active ? `2px solid ${GOLD}` : "2px solid rgba(10,22,40,0.08)",
                        boxShadow: active ? "0 8px 24px rgba(201,162,39,0.15)" : "none",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg" style={{ color: INK }}>
                          {pack.label}
                        </span>
                        {active && <Check className="w-5 h-5" style={{ color: GOLD }} />}
                      </div>
                      <div className="text-2xl font-bold mb-1" style={{ color: INK }}>
                        {formatEur(pack.priceCents)}
                      </div>
                      <div className="text-xs" style={{ color: "#64748b" }}>
                        {formatEur(pricePerCreditCents(pack))} pro Antrag · inkl. MwSt
                      </div>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={submit} className="rounded-2xl p-8 bg-white shadow-sm" style={{ border: "1px solid rgba(10,22,40,0.08)" }}>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: INK }}>
                  <Building2 className="w-5 h-5" style={{ color: GOLD }} />
                  Rechnungsdaten
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Organisation / Schulträger *">
                    <input required value={form.orgName} onChange={(e) => update("orgName", e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Ansprechpartner *">
                    <input required value={form.contactName} onChange={(e) => update("contactName", e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="E-Mail (Code & Bestätigung) *">
                    <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="USt-IdNr. (optional)">
                    <input value={form.vatId} onChange={(e) => update("vatId", e.target.value)} style={inputStyle} />
                  </Field>
                </div>

                <Field label="Rechnungsadresse *">
                  <textarea required rows={3} value={form.billingAddress} onChange={(e) => update("billingAddress", e.target.value)} style={inputStyle} placeholder="Name, Straße, PLZ Ort" />
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Bestellnummer / Aktenzeichen (optional)">
                    <input value={form.poNumber} onChange={(e) => update("poNumber", e.target.value)} style={inputStyle} />
                  </Field>
                </div>

                <Field label="Anmerkung (optional)">
                  <textarea rows={2} value={form.note} onChange={(e) => update("note", e.target.value)} style={inputStyle} />
                </Field>

                {/* Honeypot – für Menschen unsichtbar */}
                <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
                  <label>
                    Website
                    <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} />
                  </label>
                </div>

                {error && (
                  <p className="mt-4 text-sm" style={{ color: "#dc2626" }} role="alert">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  <button
                    type="submit"
                    disabled={submitting || !selectedPack}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: INK }}
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {selectedPack
                      ? `Kostenpflichtig bestellen – ${formatEur(selectedPack.priceCents)}`
                      : "Bestellen"}
                  </button>
                  <span className="flex items-center gap-2 text-xs" style={{ color: "#64748b" }}>
                    <ShieldCheck className="w-4 h-4" style={{ color: GOLD }} />
                    Kauf auf Rechnung · Zahlungsziel 14 Tage · Code sofort
                  </span>
                </div>
                <p className="mt-4 text-xs" style={{ color: "#94a3b8" }}>
                  Einzelner Antrag ohne Kontingent? Den gibt es für {formatEur(EINZELPREIS_CENTS)} direkt
                  beim Antrag.
                </p>
              </form>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid rgba(10,22,40,0.15)",
  backgroundColor: "#fbfaf7",
  color: "#0a1628",
  fontSize: "15px",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mt-4 first:mt-0">
      <span className="block text-sm font-medium mb-1.5" style={{ color: "#475569" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
