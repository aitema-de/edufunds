"use client";

import { motion } from "framer-motion";
import { Sparkles, CheckCircle, ArrowLeft, CreditCard, Shield, Clock, FileText, Banknote, Loader2 } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const features = [
  "1 KI-generierter Antrag",
  "PDF-Export",
  "30 Tage E-Mail-Support",
  "Antrags-Review",
  "Unbegrenzte Suche",
  "Keine Laufzeit",
];

type PaymentMethod = "rechnung" | "lastschrift" | "stripe" | "paypal";

export default function CheckoutEinzelPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("rechnung");
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  
  // Kundendaten
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    school: "",
    street: "",
    zip: "",
    city: "",
    iban: "",
    bic: "",
    accountHolder: "",
  });

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      if (selectedPayment === "stripe") {
        // Stripe Checkout
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productType: "einzel",
            customerData,
            successUrl: `${window.location.origin}/checkout/success?method=stripe`,
            cancelUrl: `${window.location.origin}/checkout/einzel`,
          }),
        });

        const data = await response.json();

        if (data.sessionUrl) {
          // Weiterleitung zu Stripe Checkout
          window.location.href = data.sessionUrl;
          return;
        } else {
          alert(data.error || "Fehler bei Stripe");
        }
      } else if (selectedPayment === "paypal") {
        // PayPal Checkout
        const response = await fetch("/api/paypal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productType: "einzel",
            customerData,
          }),
        });

        const data = await response.json();

        if (data.approvalUrl) {
          // Weiterleitung zu PayPal
          window.location.href = data.approvalUrl;
          return;
        } else {
          alert(data.error || "Fehler bei PayPal");
        }
      } else {
        // Rechnung oder Lastschrift
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productType: "einzel",
            paymentMethod: selectedPayment,
            amount: 29,
            customerData,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setOrderComplete(true);
          setOrderData(data);
        } else {
          alert(data.error || "Ein Fehler ist aufgetreten");
        }
      }
    } catch (error) {
      alert("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Bestellung erfolgreich abgeschlossen
  if (orderComplete && orderData) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-32 pb-20" style={{ backgroundColor: "#0a1628" }}>
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center mb-8"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">
                  Bestellung erfolgreich!
                </h1>
                <p className="text-[#64748b]">
                  Vielen Dank für Ihre Bestellung. Ihre Bestellnummer:
                </p>
                <p className="text-2xl font-mono text-[#c9a227] mt-2">
                  {orderData.orderNumber}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-8 rounded-2xl border border-[#c9a227]/20"
                style={{ backgroundColor: "rgba(15, 31, 56, 0.6)" }}
              >
                <h2 className="text-xl font-semibold text-white mb-6">
                  Zahlungsinformationen
                </h2>

                {orderData.paymentInstructions?.type === "rechnung" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-green-400">
                      <FileText className="w-5 h-5" />
                      <span>Rechnung wurde per E-Mail versendet</span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0a1628]/5">
                      <p className="text-[#64748b] text-sm mb-2">Bitte überweisen Sie den Betrag auf:</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-white"><strong>Empfänger:</strong> {orderData.paymentInstructions.bankDetails.recipient}</p>
                        <p className="text-white"><strong>IBAN:</strong> {orderData.paymentInstructions.bankDetails.iban}</p>
                        <p className="text-white"><strong>BIC:</strong> {orderData.paymentInstructions.bankDetails.bic}</p>
                        <p className="text-white"><strong>Bank:</strong> {orderData.paymentInstructions.bankDetails.bank}</p>
                        <p className="text-white"><strong>Verwendungszweck:</strong> {orderData.paymentInstructions.bankDetails.reference}</p>
                      </div>
                      <p className="text-[#64748b] text-sm mt-4">
                        <strong>Zahlungsziel:</strong> {new Date(orderData.paymentInstructions.dueDate).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </div>
                )}

                {orderData.paymentInstructions?.type === "lastschrift" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-green-400">
                      <Banknote className="w-5 h-5" />
                      <span>SEPA-Lastschriftmandat erstellt</span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0a1628]/5">
                      <p className="text-[#64748b] text-sm mb-2">Der Betrag wird abgebucht am:</p>
                      <p className="text-white text-lg font-semibold">
                        {new Date(orderData.paymentInstructions.collectionDate).toLocaleDateString("de-DE")}
                      </p>
                      <p className="text-[#64748b] text-sm mt-4">
                        Mandatsreferenz: {orderData.mandate?.mandateReference}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-[#c9a227]/10">
                  <p className="text-[#64748b] text-sm text-center">
                    Bei Fragen kontaktieren Sie uns unter{" "}
                    <a href="mailto:office@aitema.de" className="text-[#c9a227] hover:underline">
                      office@aitema.de
                    </a>
                  </p>
                </div>
              </motion.div>

              <div className="mt-8 text-center">
                <Button asChild>
                  <Link href="/">
                    Zurück zur Startseite
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-32 pb-20" style={{ backgroundColor: "#0a1628" }}>
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            {/* Back Link */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8"
            >
              <Link
                href="/preise"
                className="inline-flex items-center gap-2 text-[#94a3b8] hover:text-[#c9a227] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück zu den Preisen
              </Link>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: Plan Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className="p-8 rounded-2xl h-full"
                  style={{
                    backgroundColor: "rgba(15, 31, 56, 0.6)",
                    border: "1px solid rgba(201, 162, 39, 0.2)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "rgba(201, 162, 39, 0.1)" }}
                    >
                      <Sparkles className="w-6 h-6 text-[#c9a227]" />
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl" style={{ color: "#f8f5f0" }}>
                        Einzelantrag
                      </h2>
                      <p style={{ color: "#94a3b8" }}>Für spontane Projekte</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-5xl" style={{ color: "#c9a227" }}>
                        29 €
                      </span>
                      <span style={{ color: "#94a3b8" }}>einmalig</span>
                    </div>
                    <p className="text-sm mt-2" style={{ color: "#64748b" }}>
                      zzgl. MwSt. | Einmalige Zahlung, kein Abo
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold" style={{ color: "#f8f5f0" }}>
                      Enthaltene Leistungen:
                    </h3>
                    <ul className="space-y-3">
                      {features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-[#c9a227] flex-shrink-0" />
                          <span style={{ color: "#94a3b8" }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-6 border-t" style={{ borderColor: "rgba(201, 162, 39, 0.1)" }}>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2" style={{ color: "#64748b" }}>
                        <Shield className="w-4 h-4" />
                        Sichere Zahlung
                      </div>
                      <div className="flex items-center gap-2" style={{ color: "#64748b" }}>
                        <Clock className="w-4 h-4" />
                        Sofortiger Zugriff
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right: Payment Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div
                  className="p-8 rounded-2xl h-full flex flex-col"
                  style={{
                    backgroundColor: "rgba(15, 31, 56, 0.6)",
                    border: "1px solid rgba(201, 162, 39, 0.1)",
                  }}
                >
                  <h3 className="font-serif text-xl mb-6" style={{ color: "#f8f5f0" }}>
                    Kundendaten
                  </h3>

                  {/* Customer Form */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm text-[#64748b] mb-1">Name *</label>
                      <input
                        type="text"
                        value={customerData.name}
                        onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-[#c9a227] focus:outline-none"
                        placeholder="Max Mustermann"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#64748b] mb-1">E-Mail *</label>
                      <input
                        type="email"
                        value={customerData.email}
                        onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-[#c9a227] focus:outline-none"
                        placeholder="max@schule.de"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#64748b] mb-1">Schule *</label>
                      <input
                        type="text"
                        value={customerData.school}
                        onChange={(e) => setCustomerData({ ...customerData, school: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-[#c9a227] focus:outline-none"
                        placeholder="Grundschule Musterstadt"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#64748b] mb-1">Straße *</label>
                      <input
                        type="text"
                        value={customerData.street}
                        onChange={(e) => setCustomerData({ ...customerData, street: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-[#c9a227] focus:outline-none"
                        placeholder="Musterstraße 123"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#64748b] mb-1">PLZ *</label>
                        <input
                          type="text"
                          value={customerData.zip}
                          onChange={(e) => setCustomerData({ ...customerData, zip: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-[#c9a227] focus:outline-none"
                          placeholder="12345"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#64748b] mb-1">Ort *</label>
                        <input
                          type="text"
                          value={customerData.city}
                          onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-[#c9a227] focus:outline-none"
                          placeholder="Musterstadt"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <h3 className="font-serif text-xl mb-4" style={{ color: "#f8f5f0" }}>
                    Zahlungsmethode
                  </h3>

                  {/* Payment Methods */}
                  <div className="space-y-3 mb-6">
                    {/* Rechnung */}
                    <div
                      onClick={() => setSelectedPayment("rechnung")}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPayment === "rechnung"
                          ? "border-[#c9a227] bg-[#c9a227]/5"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className={`w-5 h-5 ${selectedPayment === "rechnung" ? "text-[#c9a227]" : "text-[#64748b]"}`} />
                        <div className="flex-1">
                          <span className={selectedPayment === "rechnung" ? "text-white font-medium" : "text-slate-300"}>
                            Rechnungskauf
                          </span>
                          <p className="text-xs text-slate-500">14 Tage Zahlungsziel</p>
                        </div>
                        {selectedPayment === "rechnung" && (
                          <CheckCircle className="w-5 h-5 text-[#c9a227]" />
                        )}
                      </div>
                    </div>

                    {/* Lastschrift */}
                    <div
                      onClick={() => setSelectedPayment("lastschrift")}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPayment === "lastschrift"
                          ? "border-[#c9a227] bg-[#c9a227]/5"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Banknote className={`w-5 h-5 ${selectedPayment === "lastschrift" ? "text-[#c9a227]" : "text-[#64748b]"}`} />
                        <div className="flex-1">
                          <span className={selectedPayment === "lastschrift" ? "text-white font-medium" : "text-slate-300"}>
                            SEPA-Lastschrift
                          </span>
                          <p className="text-xs text-slate-500">Automatischer Einzug</p>
                        </div>
                        {selectedPayment === "lastschrift" && (
                          <CheckCircle className="w-5 h-5 text-[#c9a227]" />
                        )}
                      </div>
                    </div>

                    {/* Stripe (Kreditkarte, Apple Pay, Google Pay) */}
                    <div
                      onClick={() => setSelectedPayment("stripe")}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPayment === "stripe"
                          ? "border-[#c9a227] bg-[#c9a227]/5"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className={`w-5 h-5 ${selectedPayment === "stripe" ? "text-[#c9a227]" : "text-[#64748b]"}`} />
                        <div className="flex-1">
                          <span className={selectedPayment === "stripe" ? "text-white font-medium" : "text-slate-300"}>
                            Kreditkarte / Apple Pay / Google Pay
                          </span>
                          <p className="text-xs text-slate-500">Sichere Stripe-Zahlung</p>
                        </div>
                        {selectedPayment === "stripe" && (
                          <CheckCircle className="w-5 h-5 text-[#c9a227]" />
                        )}
                      </div>
                    </div>

                    {/* PayPal */}
                    <div
                      onClick={() => setSelectedPayment("paypal")}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPayment === "paypal"
                          ? "border-[#c9a227] bg-[#c9a227]/5"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <svg className={`w-5 h-5 ${selectedPayment === "paypal" ? "text-[#c9a227]" : "text-[#64748b]"}`} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.629h6.844c2.454 0 4.352.518 5.53 1.493 1.023.84 1.46 2.077 1.271 3.628-.015.12-.044.241-.063.36-.397 2.46-1.776 4.49-3.873 5.735-1.758 1.023-3.95 1.546-6.506 1.546H9.91l-.786 5.166a.641.641 0 0 1-.633.74H7.076v-.02z"/>
                          <path d="M20.067 8.94c-.015.12-.044.241-.063.36-.397 2.46-1.776 4.49-3.873 5.735-1.758 1.023-3.95 1.546-6.506 1.546H9.91l-.786 5.166a.641.641 0 0 1-.633.74H7.076l.786-5.166h2.034c2.556 0 4.748-.523 6.506-1.546 2.097-1.245 3.476-3.275 3.873-5.735.02-.12.048-.24.063-.36.189-1.551-.248-2.788-1.271-3.628-1.178-.975-3.076-1.493-5.53-1.493H5.701l-.786 5.166h-.02L2.47 20.597a.641.641 0 0 0 .633.74h4.606l.786-5.166h2.034c2.556 0 4.748-.523 6.506-1.546 2.097-1.245 3.476-3.275 3.873-5.735.02-.12.048-.24.063-.36.189-1.551-.248-2.788-1.271-3.628-1.178-.975-3.076-1.493-5.53-1.493H5.701l-.786 5.166h-.02L2.47 20.597a.641.641 0 0 0 .633.74h4.606l.786-5.166h2.034c2.556 0 4.748-.523 6.506-1.546 2.097-1.245 3.476-3.275 3.873-5.735.02-.12.048-.24.063-.36z"/>
                        </svg>
                        <div className="flex-1">
                          <span className={selectedPayment === "paypal" ? "text-white font-medium" : "text-slate-300"}>
                            PayPal
                          </span>
                          <p className="text-xs text-slate-500">Schnell & sicher bezahlen</p>
                        </div>
                        {selectedPayment === "paypal" && (
                          <CheckCircle className="w-5 h-5 text-[#c9a227]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lastschrift Form */}
                  {selectedPayment === "lastschrift" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4 mb-6 p-4 rounded-xl bg-[#0a1628]/5"
                    >
                      <h4 className="font-medium text-white">Bankverbindung</h4>
                      <div>
                        <label className="block text-sm text-[#64748b] mb-1">IBAN *</label>
                        <input
                          type="text"
                          value={customerData.iban}
                          onChange={(e) => setCustomerData({ ...customerData, iban: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-[#c9a227] focus:outline-none"
                          placeholder="DE00 0000 0000 0000 0000 00"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-[#64748b] mb-1">BIC (optional)</label>
                          <input
                            type="text"
                            value={customerData.bic}
                            onChange={(e) => setCustomerData({ ...customerData, bic: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-[#c9a227] focus:outline-none"
                            placeholder="BIC"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-[#64748b] mb-1">Kontoinhaber *</label>
                          <input
                            type="text"
                            value={customerData.accountHolder || customerData.name}
                            onChange={(e) => setCustomerData({ ...customerData, accountHolder: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-[#c9a227] focus:outline-none"
                            placeholder={customerData.name}
                            required
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Mit der Bestellung erteilen Sie ein SEPA-Lastschriftmandat.
                      </p>
                    </motion.div>
                  )}

                  {/* CTA */}
                  <div className="mt-auto space-y-3">
                    <Button
                      onClick={handlePayment}
                      disabled={isProcessing || !customerData.name || !customerData.email || !customerData.school}
                      isLoading={isProcessing}
                      loadingText="Wird verarbeitet..."
                      className="w-full"
                    >
                      Jetzt kaufen
                      <Sparkles className="w-5 h-5" />
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/kontakt">
                        Fragen? Kontaktieren Sie uns
                      </Link>
                    </Button>
                  </div>

                  <p className="mt-4 text-xs text-center" style={{ color: "#64748b" }}>
                    Durch den Kauf akzeptieren Sie unsere{" "}
                    <Link href="/agb" className="text-[#c9a227] hover:underline">
                      AGB
                    </Link>
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
