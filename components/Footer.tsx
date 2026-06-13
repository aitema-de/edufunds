"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, MapPin, Heart, ArrowRight, Sparkles } from "lucide-react";
import { NewsletterForm } from "./NewsletterForm";

const footerLinks = {
  product: {
    title: "Produkt",
    links: [
      { label: "Förderprogramme", href: "/foerderprogramme" },
      { label: "Preise", href: "/preise" },
      { label: "KI-Antragsassistent", href: "/#ki-assistent" },
      { label: "Archiv", href: "/archiv" }
    ]
  },
  company: {
    title: "Unternehmen",
    links: [
      { label: "Über uns", href: "/ueber-uns" },
      { label: "Kontakt", href: "/kontakt" }
    ]
  },
  legal: {
    title: "Rechtliches",
    links: [
      { label: "Impressum", href: "/impressum" },
      { label: "Datenschutz", href: "/datenschutz" },
      { label: "AGB", href: "/agb" }
    ]
  }
};

const stats = [
  { value: "130+", label: "Förderprogramme" },
  { value: "90%", label: "Erfolgsquote" },
  { value: "24h", label: "Support" }
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden" style={{ backgroundColor: '#050d18' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#c9a227]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#1a4d4d]/5 rounded-full blur-3xl" />
      </div>

      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/50 to-transparent" />

      {/* Stats Bar */}
      <div className="relative border-b border-[#0f1f38]">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-3 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center group"
              >
                <div className="text-3xl md:text-4xl font-bold text-gradient-gold group-hover:scale-105 transition-transform">
                  {stat.value}
                </div>
                <div className="text-sm text-[#94a3b8] mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-16 pb-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="col-span-2"
          >
            <Link href="/" className="inline-block mb-6 group" aria-label="EduFunds - Zur Startseite">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/edufunds-logo.svg"
                alt="EduFunds"
                width={344}
                height={120}
                className="h-11 w-auto transition-transform group-hover:scale-[1.02]"
              />
            </Link>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6 max-w-xs">
              Die intelligente Plattform für Schulförderung. Finden Sie passende Programme und erstellen Sie erfolgreiche Anträge mit KI-Unterstützung.
            </p>
            <div className="space-y-3 mb-6">
              <a href="mailto:office@aitema.de" className="flex items-center gap-3 text-sm text-[#94a3b8] hover:text-[#c9a227] transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-[#0f1f38] flex items-center justify-center group-hover:bg-[#c9a227]/20 transition-colors">
                  <Mail className="h-4 w-4 text-[#c9a227]" />
                </div>
                office@aitema.de
              </a>
              <div className="flex items-center gap-3 text-sm text-[#94a3b8]">
                <div className="w-8 h-8 rounded-lg bg-[#0f1f38] flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-[#c9a227]" />
                </div>
                Berlin, Deutschland
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href="https://twitter.com/aitema_de"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="w-10 h-10 rounded-xl glass hover:bg-[#c9a227]/20 hover:border-[#c9a227]/30 border border-[#1e3a5f]/50 flex items-center justify-center transition-all duration-300"
              >
                <span className="text-[#94a3b8] hover:text-[#c9a227] text-xs font-bold uppercase">T</span>
              </a>
              <a
                href="https://linkedin.com/company/aitema"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 rounded-xl glass hover:bg-[#c9a227]/20 hover:border-[#c9a227]/30 border border-[#1e3a5f]/50 flex items-center justify-center transition-all duration-300"
              >
                <span className="text-[#94a3b8] hover:text-[#c9a227] text-xs font-bold uppercase">L</span>
              </a>
            </div>
          </motion.div>

          {/* Link Columns - Mobile: 3 Spalten nebeneinander */}
          <div className="col-span-1 sm:col-span-1 md:col-span-3">
            <div className="grid grid-cols-3 gap-4">
              {Object.values(footerLinks).map((section, sectionIndex) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + sectionIndex * 0.1 }}
                >
                  <h3 className="font-semibold text-[#f8f5f0] mb-4 flex items-center gap-2 text-sm md:text-base">
                    {section.title}
                  </h3>
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-sm text-[#94a3b8] hover:text-[#c9a227] transition-colors flex items-center gap-1 group"
                        >
                          <ArrowRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative py-10 px-8 rounded-3xl glass-strong mb-10 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#c9a227]/10 rounded-full blur-3xl" />
          <div className="relative max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c9a227]/10 border border-[#c9a227]/20 mb-4"
            >
              <Sparkles className="h-4 w-4 text-[#c9a227]" />
              <span className="text-sm font-medium text-[#c9a227]">Bleiben Sie informiert</span>
            </motion.div>
            <h3 className="text-2xl font-bold text-[#f8f5f0] mb-3">Newsletter abonnieren</h3>
            <p className="text-[#94a3b8] mb-6">Erhalten Sie wöchentlich Updates zu neuen Förderprogrammen, Tipps für erfolgreiche Anträge und exklusive Einblicke.</p>
            <NewsletterForm />
            <p className="text-xs text-[#94a3b8] mt-4">Kein Spam, jederzeit abmeldbar. Wir respektieren Ihre Privatsphäre.</p>
          </div>
        </motion.div>

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-[#0f1f38] text-sm text-[#64748b]"
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>© {currentYear} EduFunds.</span>
            <span>Ein Projekt der</span>
            <a href="https://aitema.de" target="_blank" rel="noopener noreferrer" className="text-[#c9a227] hover:underline">aitema GmbH</a>
          </div>
          <div className="flex items-center gap-1">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />
            <span>in Berlin</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

export default Footer;
