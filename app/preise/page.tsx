"use client";

import { motion } from "framer-motion";
import { Check, X, Sparkles, Zap, Building2, Users, HelpCircle, ChevronDown, Shield, Clock } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PricingCard } from "@/components/PricingCard";
import { useState } from "react";

const pricingPlans = [
  {
    name: "Freemium",
    description: "Ideal zum Ausprobieren",
    price: "0 €",
    period: "",
    priceSubtext: "Kostenlos für immer",
    icon: Zap,
    features: [
      { text: "Intelligente Suche", included: true },
      { text: "Alle Förderprogramme ansehen", included: true },
      { text: "Details zu Programmen", included: true },
      { text: "Filter nach Bundesland & Thema", included: true },
      { text: "Deadline-Tracking", included: true },
      { text: "KI-Antragsgenerierung", included: false },
      { text: "PDF-Export", included: false },
      { text: "Support", included: false },
    ],
    ctaText: "Kostenlos starten",
    ctaLink: "/registrieren",
    highlighted: false,
    badge: undefined,
  },
  {
    name: "Einzelantrag",
    description: "Für spontane Projekte",
    price: "29,90 €",
    period: "",
    priceSubtext: "Einmalige Zahlung",
    icon: Sparkles,
    features: [
      { text: "Alle Freemium-Funktionen", included: true },
      { text: "1 KI-generierter Antrag", included: true },
      { text: "PDF-Export", included: true },
      { text: "30 Tage E-Mail-Support", included: true },
      { text: "Antrags-Review", included: true },
      { text: "Weitere Anträge", included: false },
      { text: "Prioritäts-Support", included: false },
      { text: "Team-Funktionen", included: false },
    ],
    ctaText: "Antrag starten",
    ctaLink: "/foerderprogramme",
    highlighted: false,
    badge: undefined,
  },
  {
    name: "Jahresabo",
    description: "Für aktive Schulen",
    price: "149 €",
    period: "/ Jahr",
    priceSubtext: "5 Anträge inkl. | Weitere: 14,90 €",
    icon: Building2,
    features: [
      { text: "5 Anträge pro Jahr inklusive", included: true },
      { text: "Unbegrenzte Suche & Filter", included: true },
      { text: "KI-Antragsgenerierung", included: true },
      { text: "PDF-Export", included: true },
      { text: "Prioritäts-Support", included: true },
      { text: "Deadline-Tracking", included: true },
      { text: "Antrags-Review", included: true },
      { text: "Team-Funktionen", included: false },
    ],
    ctaText: "Anfragen",
    ctaLink: "/kontakt",
    highlighted: true,
    badge: "Empfohlen",
  },
  {
    name: "Schulträger-Abo",
    description: "Für Bildungsträger",
    price: "249 €",
    period: "/ Jahr",
    priceSubtext: "Weitere Anträge: 9,90 €",
    icon: Users,
    features: [
      { text: "20 Anträge pro Jahr inklusive", included: true },
      { text: "Mehrbenutzer-Account (bis 5)", included: true },
      { text: "Premium-Support", included: true },
      { text: "Schulungsangebot inklusive", included: true },
      { text: "KI-Antragsgenerierung", included: true },
      { text: "PDF-Export", included: true },
      { text: "Team-Funktionen", included: true },
      { text: "API-Zugriff", included: true },
    ],
    ctaText: "Anfragen",
    ctaLink: "/kontakt",
    highlighted: false,
    badge: "Bestes Preis-Leistung",
  },
];

const faqs = [
  {
    question: "Was ist ein Antrag?",
    answer:
      "Ein Antrag in EduFunds ist ein vollständig ausgefüllter Förderantrag, den unsere KI basierend auf Ihren Angaben und den Anforderungen des Förderprogramms generiert. Jeder Antrag ist individuell angepasst, professionell formuliert und bereit zur Einreichung. Sie können den Antrag als PDF exportieren oder online bearbeiten.",
  },
  {
    question: "Wie funktioniert die KI-Generierung?",
    answer:
      "Unsere KI analysiert die spezifischen Anforderungen des gewählten Förderprogramms und kombiniert diese mit Ihren Projektinformationen. Sie erstellt professionelle Antragstexte, die auf erfolgreichen Vorlagen basieren und von Pädagogen optimiert wurden. Die KI berücksichtigt Fristen, Förderkriterien und formale Anforderungen.",
  },
  {
    question: "Kann ich zwischen den Tarifen wechseln?",
    answer:
      "Ja, Sie können jederzeit upgraden. Wenn Sie vom Freemium-Plan auf einen Bezahlplan wechseln, erhalten Sie sofortigen Zugriff auf alle Funktionen. Bei einem Upgrade von Einzelantrag auf Jahresabo wird die Differenz angerechnet. Ein Downgrade ist zum Ende der Laufzeit möglich.",
  },
  {
    question: "Was passiert mit meinen Anträgen?",
    answer:
      "Alle Ihre Anträge bleiben auch nach Ablauf des Abonnements in Ihrem Account gespeichert und einsehbar. Sie können sie jederzeit als PDF exportieren. Neu generierte Anträge erfordern jedoch ein aktives Abonnement oder einen Einzelkauf.",
  },
  {
    question: "Gibt es eine Mindestlaufzeit?",
    answer:
      "Für das Jahresabo und das Schulträger-Abo beträgt die Mindestlaufzeit 12 Monate. Die Kündigung ist mit einer Frist von 30 Tagen zum Ende der Laufzeit möglich. Der Einzelantrag ist einmalig und unbefristet gültig.",
  },
  {
    question: "Sind meine Daten sicher?",
    answer:
      "Ja, Datenschutz hat für uns höchste Priorität. Alle Daten werden ausschließlich in deutschen Rechenzentren gespeichert, sind DSGVO-konform und verschlüsselt. Wir geben keine Daten an Dritte weiter und verwenden Ihre Informationen nur für die Antragserstellung.",
  },
];

const benefits = [
  {
    icon: Shield,
    title: "DSGVO-konform",
    description: "Deutsche Server, verschlüsselte Daten",
  },
  {
    icon: Clock,
    title: "Sofortiger Zugriff",
    description: "Direkt nach Zahlung loslegen",
  },
  {
    icon: Check,
    title: "Sichere Zahlung",
    description: "SSL-verschlüsselt",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="border-b last:border-b-0"
      style={{ borderColor: "rgba(201, 162, 39, 0.15)" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between gap-4 text-left group"
      >
        <span
          className="font-semibold text-lg group-hover:text-[#c9a227] transition-colors"
          style={{ color: "#f8f5f0" }}
        >
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          style={{ color: "#c9a227" }}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p
          className="pb-5 leading-relaxed"
          style={{ color: "#94a3b8" }}
        >
          {answer}
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function PricingPage() {
  return (
    <>
      <Header />
      <main id="main-content">
        {/* Hero Section */}
        <section
          className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden"
          style={{ backgroundColor: "#0a1628" }}
        >
          {/* Background Elements */}
          <div className="absolute inset-0 geometric-grid opacity-30" />
          <div className="absolute inset-0 dots-pattern" />

          {/* Floating Shape */}
          <div
            className="absolute top-20 right-10 w-72 h-72 animate-float-slow hidden lg:block"
            style={{
              background: "linear-gradient(135deg, rgba(201, 162, 39, 0.05) 0%, transparent 100%)",
              borderRadius: "40% 60% 60% 40% / 60% 40% 60% 40%",
            }}
          />

          <div className="container mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-center max-w-3xl mx-auto"
            >
              <span
                className="inline-block font-mono text-xs tracking-widest uppercase mb-4"
                style={{ color: "#c9a227" }}
              >
                Preisgestaltung
              </span>
              <h1
                className="font-serif mb-6"
                style={{ color: "#f8f5f0" }}
              >
                Transparente Preise.
                <br />
                <span style={{ color: "#c9a227" }}>Maximaler Wert.</span>
              </h1>
              <div className="flex justify-center mb-6">
                <div
                  className="accent-line"
                  style={{ background: "linear-gradient(90deg, #c9a227, #e4c55a)" }}
                />
              </div>
              <p
                className="text-lg leading-relaxed"
                style={{ color: "#94a3b8" }}
              >
                Wählen Sie den passenden Plan für Ihre Schule. Starten Sie kostenlos
                und skalieren Sie bei Bedarf. Keine versteckten Kosten.
              </p>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex flex-wrap justify-center gap-6 mt-12"
            >
              {benefits.map((benefit, index) => (
                <div
                  key={benefit.title}
                  className="flex items-center gap-3 px-5 py-3 rounded-xl"
                  style={{
                    backgroundColor: "rgba(15, 31, 56, 0.6)",
                    border: "1px solid rgba(201, 162, 39, 0.1)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(201, 162, 39, 0.1)" }}
                  >
                    <benefit.icon className="w-4 h-4" style={{ color: "#c9a227" }} />
                  </div>
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: "#f8f5f0" }}
                    >
                      {benefit.title}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "#64748b" }}
                    >
                      {benefit.description}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <section
          className="relative py-20 lg:py-28"
          style={{ backgroundColor: "#0a1628" }}
        >
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto items-stretch">
              {pricingPlans.map((plan, index) => (
                <PricingCard
                  key={plan.name}
                  {...plan}
                  delay={index * 0.1}
                />
              ))}
            </div>

            {/* Additional Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-16 text-center"
            >
              <p
                className="text-sm"
                style={{ color: "#64748b" }}
              >
                Alle Preise verstehen sich inkl. MwSt.
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section
          className="relative py-20 lg:py-28"
          style={{ backgroundColor: "#0a1628" }}
        >
          {/* Border Top */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ backgroundColor: "rgba(201, 162, 39, 0.15)" }}
          />

          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-center max-w-2xl mx-auto mb-16"
            >
              <span
                className="inline-block font-mono text-xs tracking-widest uppercase mb-4"
                style={{ color: "#c9a227" }}
              >
                FAQ
              </span>
              <h2
                className="font-serif mb-6"
                style={{ color: "#f8f5f0" }}
              >
                Häufig gestellte Fragen
              </h2>
              <div className="flex justify-center">
                <div
                  className="accent-line"
                  style={{ background: "linear-gradient(90deg, #c9a227, #e4c55a)" }}
                />
              </div>
            </motion.div>

            <div className="max-w-3xl mx-auto">
              {faqs.map((faq, index) => (
                <FAQItem key={index} {...faq} />
              ))}
            </div>

            {/* Contact CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-16 text-center"
            >
              <p
                className="mb-4"
                style={{ color: "#94a3b8" }}
              >
                Noch Fragen? Wir helfen gerne weiter.
              </p>
              <Link
                href="/kontakt"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-[#c9a227]/50 text-[#c9a227] font-semibold hover:bg-[#c9a227] hover:text-[#050d18] transition-all duration-300"
              >
                <HelpCircle className="w-4 h-4" />
                Kontakt aufnehmen
              </Link>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section
          className="relative py-20 lg:py-28 overflow-hidden"
          style={{ backgroundColor: "#0a1628" }}
        >
          {/* Border Top */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ backgroundColor: "rgba(201, 162, 39, 0.15)" }}
          />

          {/* Background Decoration */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, rgba(201, 162, 39, 0.05) 0%, transparent 70%)",
            }}
          />

          <div className="container mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="max-w-3xl mx-auto text-center"
            >
              <h2
                className="font-serif mb-6"
                style={{ color: "#f8f5f0" }}
              >
                Bereit, Fördermittel zu erschließen?
              </h2>
              <p
                className="text-lg mb-8"
                style={{ color: "#94a3b8" }}
              >
                Starten Sie kostenlos und entdecken Sie, wie einfach Förderanträge
                mit EduFunds sein können.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/registrieren"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl btn-primary btn-primary-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  Kostenlos starten
                </Link>
                <Link
                  href="/foerderprogramme"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl btn-outline btn-primary-lg"
                >
                  Programme erkunden
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
