"use client";

import { motion } from "framer-motion";
import { Building2, CheckCircle, ArrowLeft, CreditCard, Shield, Clock, Star } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const features = [
  "5 Anträge pro Jahr inklusive",
  "Weitere Anträge nur 14,90 €",
  "Unbegrenzte Suche & Filter",
  "KI-Antragsgenerierung",
  "PDF-Export",
  "Prioritäts-Support",
  "Deadline-Tracking",
  "Antrags-Review",
];

export default function CheckoutJahresaboPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const handlePayment = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    alert("Zahlungssystem wird noch eingerichtet. Bitte kontaktieren Sie uns direkt.");
  };

  const price = billingCycle === "yearly" ? "149 €" : "14,90 €";
  const period = billingCycle === "yearly" ? "/ Jahr" : "/ Monat";
  const savings = billingCycle === "yearly" ? "Sparen Sie 20%" : "";

  return (
    <>
      <Header />
      <main className="min-h-screen pt-32 pb-20" style={{ backgroundColor: "#f8f5f0" }}>
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

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mb-8"
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: "rgba(201, 162, 39, 0.1)",
                  color: "#c9a227",
                  border: "1px solid rgba(201, 162, 39, 0.2)",
                }}
              >
                <Star className="w-4 h-4 fill-current" />
                Empfohlen für aktive Schulen
              </div>
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
                    border: "2px solid rgba(201, 162, 39, 0.3)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "rgba(201, 162, 39, 0.1)" }}
                    >
                      <Building2 className="w-6 h-6 text-[#c9a227]" />
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl" style={{ color: "#f8f5f0" }}>
                        Jahresabo
                      </h2>
                      <p style={{ color: "#94a3b8" }}>Für aktive Schulen</p>
                    </div>
                  </div>

                  {/* Billing Toggle */}
                  <div className="flex p-1 rounded-xl mb-6" style={{ backgroundColor: "rgba(5, 13, 24, 0.5)" }}>
                    <Button
                      variant={billingCycle === "yearly" ? "primary" : "ghost"}
                      onClick={() => setBillingCycle("yearly")}
                      className="flex-1 rounded-lg text-sm"
                    >
                      Jährlich
                      <span className="block text-xs opacity-80">Spare 20%</span>
                    </Button>
                    <Button
                      variant={billingCycle === "monthly" ? "primary" : "ghost"}
                      onClick={() => setBillingCycle("monthly")}
                      className="flex-1 rounded-lg text-sm"
                    >
                      Monatlich
                      <span className="block text-xs opacity-80">Flexibel</span>
                    </Button>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-5xl" style={{ color: "#c9a227" }}>
                        {price}
                      </span>
                      <span style={{ color: "#94a3b8" }}>{period}</span>
                    </div>
                    {savings && (
                      <p className="text-sm mt-2 text-[#c9a227]">{savings}</p>
                    )}
                    <p className="text-sm mt-2" style={{ color: "#64748b" }}>
                      zzgl. MwSt. | Jederzeit kündbar
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

              {/* Right: Payment */}
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
                    Zahlung
                  </h3>

                  {/* Payment Methods */}
                  <div className="space-y-3 mb-6">
                    <div
                      className="p-4 rounded-xl border-2 border-[#c9a227] flex items-center gap-3 cursor-pointer"
                      style={{ backgroundColor: "rgba(201, 162, 39, 0.05)" }}
                    >
                      <CreditCard className="w-5 h-5 text-[#c9a227]" />
                      <span style={{ color: "#f8f5f0" }}>Kreditkarte / SEPA</span>
                      <span className="ml-auto text-xs px-2 py-1 rounded bg-[#c9a227]/20 text-[#c9a227]">
                        Demnächst
                      </span>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div
                    className="p-4 rounded-xl mb-6"
                    style={{ backgroundColor: "rgba(201, 162, 39, 0.05)" }}
                  >
                    <p className="text-sm" style={{ color: "#94a3b8" }}>
                      <strong style={{ color: "#c9a227" }}>Hinweis:</strong> Das Zahlungssystem wird 
                      aktuell eingerichtet. Für Ihr Abonnement kontaktieren Sie uns bitte direkt:
                    </p>
                    <a
                      href="mailto:office@aitema.de?subject=EduFunds Jahresabo Anmeldung"
                      className="inline-flex items-center gap-2 mt-3 text-[#c9a227] hover:underline"
                    >
                      office@aitema.de
                    </a>
                  </div>

                  {/* Benefits Summary */}
                  <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: "rgba(5, 13, 24, 0.5)" }}>
                    <h4 className="font-medium mb-3" style={{ color: "#f8f5f0" }}>
                      Ihre Vorteile:
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2" style={{ color: "#94a3b8" }}>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        14 Tage kostenlos testen
                      </li>
                      <li className="flex items-center gap-2" style={{ color: "#94a3b8" }}>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Jederzeit kündbar
                      </li>
                      <li className="flex items-center gap-2" style={{ color: "#94a3b8" }}>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Keine versteckten Kosten
                      </li>
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto space-y-3">
                    <Button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      isLoading={isProcessing}
                      loadingText="Wird verarbeitet..."
                      className="w-full"
                    >
                      Abonnieren
                      <Building2 className="w-5 h-5" />
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/kontakt">
                        Fragen? Kontaktieren Sie uns
                      </Link>
                    </Button>
                  </div>

                  <p className="mt-4 text-xs text-center" style={{ color: "#64748b" }}>
                    Durch die Anmeldung akzeptieren Sie unsere{" "}
                    <Link href="/agb" className="text-[#c9a227] hover:underline">
                      AGB
                    </Link>
                    . 14 Tage Widerrufsrecht.
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
