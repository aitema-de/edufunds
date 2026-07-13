"use client";

import { motion } from "framer-motion";
import { Check, X, Sparkles, Zap, Building2, Users, HelpCircle, ChevronDown, Shield, Clock } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PricingCard } from "@/components/PricingCard";
import { useState } from "react";
import {
  EINZELPREIS_CENTS,
  quotaPacks,
  formatEur,
  pricePerCreditCents,
} from "@/lib/payments/packs";

// Einzel-Optionen (Verein / einzelnes Projekt). Preis aus packs.ts (Single Source).
const introPlans = [
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
    ],
    ctaText: "Kostenlos starten",
    ctaLink: "/registrieren",
    highlighted: false,
    badge: undefined,
  },
  {
    name: "Einzelantrag",
    description: "Für ein einzelnes Projekt",
    price: formatEur(EINZELPREIS_CENTS),
    period: "",
    priceSubtext: "Einmalige Zahlung · kein Abo",
    icon: Sparkles,
    features: [
      { text: "Alle Freemium-Funktionen", included: true },
      { text: "1 KI-generierter Antrag", included: true },
      { text: "PDF-Export", included: true },
      { text: "Bezahlung per Karte am Download", included: true },
      { text: "E-Mail-Support", included: true },
    ],
    ctaText: "Antrag starten",
    ctaLink: "/foerderprogramme",
    highlighted: false,
    badge: undefined,
  },
];

// Kontingent-Pakete (Schule / Träger). Preise + Anzahl aus packs.ts (Single Source),
// Anzeigetexte hier in deutscher Schreibweise (packs.ts haelt ASCII fuer Tooling/Stripe).
const quotaCopy: Record<
  string,
  { description: string; icon: React.ElementType; badge?: string }
> = {
  pack5: { description: "Für Schulen mit einzelnen Projekten", icon: Building2 },
  pack10: { description: "Für aktive Schulen mit mehreren Vorhaben", icon: Building2, badge: "Empfohlen" },
  pack20: { description: "Für Schulträger mit mehreren Schulen", icon: Users, badge: "Bester Stückpreis" },
};

const quotaPlans = quotaPacks().map((pack) => {
  const copy = quotaCopy[pack.id] ?? { description: "", icon: Building2 };
  return {
    name: `${pack.credits} Anträge`,
    description: copy.description,
    price: formatEur(pack.priceCents),
    period: "",
    priceSubtext: `${formatEur(pricePerCreditCents(pack))} pro Antrag · inkl. MwSt`,
    icon: copy.icon,
    features: [
      { text: `${pack.credits} Anträge freischaltbar`, included: true },
      { text: "KI-Antragsgenerierung & PDF-Export", included: true },
      { text: "Ein Sammel-Code für alle Lehrkräfte", included: true },
      { text: "Lehrkräfte zahlen nichts selbst", included: true },
      { text: "Kauf per Rechnung oder Karte", included: true },
      { text: "12 Monate gültig · kein Abo", included: true },
    ],
    ctaText: "Kontingent kaufen",
    ctaLink: "/kontingent",
    highlighted: pack.id === "pack10",
    badge: copy.badge,
  };
});

const faqs = [
  {
    question: "Was ist ein Antrag?",
    answer:
      "Ein Antrag in EduFunds ist ein vollständig ausgearbeiteter Antragsentwurf, den unsere KI aus Ihren Angaben und den Anforderungen des Förderprogramms erstellt — individuell angepasst und professionell formuliert. Sie prüfen den Entwurf, passen ihn an und reichen ihn selbst ein; exportieren lässt er sich als PDF, Word oder Text.",
  },
  {
    question: "Wie funktioniert die KI-Generierung?",
    answer:
      "Unsere KI wertet die Anforderungen des gewählten Förderprogramms aus und verbindet sie mit Ihren Projektangaben. Daraus entsteht ein Antragsentwurf, der die uns bekannten Förderkriterien und Formvorgaben aufgreift. Weil KI Fehler machen kann, prüfen Sie den Entwurf vor der Einreichung — Fristen und formale Anforderungen bestätigen Sie bitte immer beim Fördergeber selbst.",
  },
  {
    question: "Brauche ich ein Abonnement?",
    answer:
      "Nein. EduFunds hat kein Abo. Die Suche ist kostenlos, ein einzelner Antrag kostet einmalig 29,90 €, und Kontingente sind Vorkasse-Pakete (Prepaid): Sie kaufen N Anträge im Voraus, es gibt keine automatische Verlängerung und keine wiederkehrende Zahlung.",
  },
  {
    question: "Wie funktioniert ein Kontingent für Schulen & Träger?",
    answer:
      "Sie kaufen ein Paket (5, 10 oder 20 Anträge) per Rechnung oder Karte und erhalten einen Sammel-Code. Diesen geben Sie an Ihre Lehrkräfte weiter – sie schalten damit ihre fertigen Anträge frei, ohne selbst zu zahlen. Ein Credit wird erst beim Freischalten eines fertigen Antrags verbraucht; abgebrochene Entwürfe kosten nichts. Das Kontingent ist 12 Monate ab Kauf gültig.",
  },
  {
    question: "Was passiert mit meinen Anträgen?",
    answer:
      "Freigeschaltete Anträge sind 12 Monate ab Kauf in Ihrem Account abrufbar und lassen sich jederzeit exportieren (PDF, Word, Text) — danach werden die Inhalte anonymisiert, exportieren Sie sie also rechtzeitig. Unbezahlte Entwürfe, an denen 90 Tage nicht gearbeitet wurde, werden ebenfalls anonymisiert. Für einen neuen Antrag wird ein freier Credit aus Ihrem Kontingent verbraucht oder ein Einzelantrag gekauft.",
  },
  {
    question: "Gibt es eine Mindestlaufzeit oder Kündigungsfrist?",
    answer:
      "Nein. Da es kein Abo gibt, entfallen Mindestlaufzeit und Kündigung vollständig. Der Einzelantrag ist einmalig, Kontingente sind ab Kauf 12 Monate gültig.",
  },
  {
    question: "Sind meine Daten sicher?",
    answer:
      "Ihre Daten werden bei Hetzner in Deutschland gespeichert und verschlüsselt übertragen. Die KI-Verarbeitung läuft bei Mistral AI (Paris) im europäischen Wirtschaftsraum — es findet kein Transfer in Drittländer statt, und Ihre Eingaben werden nicht zum Training von KI-Modellen verwendet. Vor der Übermittlung an die KI entfernen wir automatisch Identifikatoren wie E-Mail-Adressen, Telefonnummern und IBANs aus Freitexten. Wir setzen keine Tracking- oder Analysedienste ein. Einzelheiten in der Datenschutzerklärung und unter „AVV & Subprozessoren“.",
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
      style={{ borderColor: "rgba(217, 119, 6, 0.15)" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between gap-4 text-left group"
      >
        <span
          className="font-semibold text-lg group-hover:text-[#d4af37] transition-colors"
          style={{ color: "#fdfdfc" }}
        >
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          style={{ color: "#d4af37" }}
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
          style={{ color: "#a8a29e" }}
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
          style={{ backgroundColor: "#1c1917" }}
        >
          {/* Background Elements */}
          <div className="absolute inset-0 geometric-grid opacity-30" />
          <div className="absolute inset-0 dots-pattern" />

          {/* Floating Shape */}
          <div
            className="absolute top-20 right-10 w-72 h-72 animate-float-slow hidden lg:block"
            style={{
              background: "linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, transparent 100%)",
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
                style={{ color: "#d4af37" }}
              >
                Preisgestaltung
              </span>
              <h1
                className="font-serif mb-6"
                style={{ color: "#fdfdfc" }}
              >
                Transparente Preise.
                <br />
                <span style={{ color: "#d4af37" }}>Maximaler Wert.</span>
              </h1>
              <div className="flex justify-center mb-6">
                <div
                  className="accent-line"
                  style={{ background: "linear-gradient(90deg, #d4af37, #e4c55a)" }}
                />
              </div>
              <p
                className="text-lg leading-relaxed"
                style={{ color: "#a8a29e" }}
              >
                Wählen Sie das passende Modell für Ihre Schule oder Ihren Träger.
                Starten Sie kostenlos. Keine versteckten Kosten, kein Abo.
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
                    backgroundColor: "rgba(41, 37, 36, 0.6)",
                    border: "1px solid rgba(217, 119, 6, 0.1)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(217, 119, 6, 0.1)" }}
                  >
                    <benefit.icon className="w-4 h-4" style={{ color: "#d4af37" }} />
                  </div>
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: "#fdfdfc" }}
                    >
                      {benefit.title}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "#78716c" }}
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
          style={{ backgroundColor: "#1c1917" }}
        >
          <div className="container mx-auto px-6">
            {/* Einzel-Optionen: Verein / einzelnes Projekt */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto items-stretch">
              {introPlans.map((plan, index) => (
                <PricingCard
                  key={plan.name}
                  {...plan}
                  delay={index * 0.1}
                />
              ))}
            </div>

            {/* Kontingent: Schule / Träger */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-2xl mx-auto mt-24 mb-12"
            >
              <span
                className="inline-block font-mono text-xs tracking-widest uppercase mb-4"
                style={{ color: "#d4af37" }}
              >
                Für Schulen & Träger
              </span>
              <h2 className="font-serif mb-4" style={{ color: "#fdfdfc" }}>
                Kontingent vorab freischalten
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "#a8a29e" }}>
                Ein Sammel-Code für mehrere Anträge – Ihre Lehrkräfte schalten frei,
                ohne selbst zu zahlen. Vorkasse statt Abo, 12 Monate gültig.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
              {quotaPlans.map((plan, index) => (
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
              <p className="text-sm" style={{ color: "#78716c" }}>
                Alle Preise verstehen sich inkl. MwSt. Kein Abo, keine versteckten Kosten.
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section
          className="relative py-20 lg:py-28"
          style={{ backgroundColor: "#1c1917" }}
        >
          {/* Border Top */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ backgroundColor: "rgba(217, 119, 6, 0.15)" }}
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
                style={{ color: "#d4af37" }}
              >
                FAQ
              </span>
              <h2
                className="font-serif mb-6"
                style={{ color: "#fdfdfc" }}
              >
                Häufig gestellte Fragen
              </h2>
              <div className="flex justify-center">
                <div
                  className="accent-line"
                  style={{ background: "linear-gradient(90deg, #d4af37, #e4c55a)" }}
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
                style={{ color: "#a8a29e" }}
              >
                Noch Fragen? Wir helfen gerne weiter.
              </p>
              <Link
                href="/kontakt"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-[#d4af37]/50 text-[#d4af37] font-semibold hover:bg-[#d4af37] hover:text-[#1c1917] transition-all duration-300"
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
          style={{ backgroundColor: "#1c1917" }}
        >
          {/* Border Top */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ backgroundColor: "rgba(217, 119, 6, 0.15)" }}
          />

          {/* Background Decoration */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, rgba(217, 119, 6, 0.05) 0%, transparent 70%)",
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
                style={{ color: "#fdfdfc" }}
              >
                Bereit, Fördermittel zu erschließen?
              </h2>
              <p
                className="text-lg mb-8"
                style={{ color: "#a8a29e" }}
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
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl btn-primary-lg border-2 border-gold-500 text-gold-400 font-semibold hover:bg-gold-500 hover:text-[#1c1917] transition-colors"
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
