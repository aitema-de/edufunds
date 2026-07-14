"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Mail, MapPin, Clock, Send } from "lucide-react";
import Link from "next/link";

export default function KontaktPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ backgroundColor: "#fdfdfc" }}>
        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, rgba(30, 61, 50, 0.15) 0%, transparent 50%)`,
            }} />
          </div>
          
          <div className="container mx-auto px-6 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <span className="inline-block px-4 py-2 rounded-full text-xs font-medium tracking-wider uppercase mb-6"
                style={{ backgroundColor: "rgba(30, 61, 50, 0.1)", color: "#1e3d32" }}>
                Kontakt
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: "#1c1917" }}>
                Wir sind für Sie <span style={{ color: "#1e3d32" }}>da</span>
              </h1>
              <p className="text-lg" style={{ color: "#64748b" }}>
                Haben Sie Fragen zu Fördermitteln oder unserer Plattform? 
                Kontaktieren Sie uns - wir helfen gerne weiter.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Grid */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Contact Info */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h2 className="text-2xl font-bold mb-8" style={{ color: "#1c1917" }}>
                  So erreichen Sie uns
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "rgba(30, 61, 50, 0.1)" }}>
                      <Mail className="w-5 h-5" style={{ color: "#1e3d32" }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: "#1c1917" }}>E-Mail</h3>
                      <a href="mailto:office@edufunds.org" className="text-[#1e3d32] hover:text-[#2a5244] transition-colors underline underline-offset-2">
                        office@edufunds.org
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "rgba(30, 61, 50, 0.1)" }}>
                      <Clock className="w-5 h-5" style={{ color: "#1e3d32" }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: "#1c1917" }}>Erreichbarkeit</h3>
                      <p style={{ color: "#64748b" }}>
                        Mo-Fr: 9:00 - 17:00 Uhr
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "rgba(30, 61, 50, 0.1)" }}>
                      <MapPin className="w-5 h-5" style={{ color: "#1e3d32" }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: "#1c1917" }}>Anschrift</h3>
                      <p style={{ color: "#64748b" }}>
                        EduFunds by aitema GmbH<br />
                        Prenzlauer Allee 229<br />
                        10405 Berlin
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="p-8 rounded-2xl"
                style={{ backgroundColor: "white", border: "1px solid rgba(28, 25, 23, 0.08)" }}
              >
                <h2 className="text-2xl font-bold mb-6" style={{ color: "#1c1917" }}>
                  Nachricht senden
                </h2>
                
                <form className="space-y-4" action="/api/contact" method="POST">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "#64748b" }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: "white",
                        borderColor: "rgba(28, 25, 23, 0.15)",
                        color: "#1c1917"
                      }}
                      placeholder="Ihr Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "#475569" }}>
                      E-Mail *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: "rgba(28, 25, 23, 0.5)",
                        borderColor: "rgba(30, 61, 50, 0.3)",
                        color: "#fdfdfc"
                      }}
                      placeholder="ihre@email.de"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "#475569" }}>
                      Betreff *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      required
                      className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: "rgba(28, 25, 23, 0.5)",
                        borderColor: "rgba(30, 61, 50, 0.3)",
                        color: "#fdfdfc"
                      }}
                      placeholder="Worum geht es?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "#475569" }}>
                      Nachricht *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 resize-none"
                      style={{ 
                        backgroundColor: "rgba(28, 25, 23, 0.5)",
                        borderColor: "rgba(30, 61, 50, 0.3)",
                        color: "#fdfdfc"
                      }}
                      placeholder="Ihre Nachricht..."
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="datenschutz"
                      required
                      className="mt-1"
                    />
                    <label className="text-sm" style={{ color: "#475569" }}>
                      Ich habe die <Link href="/datenschutz" className="text-[#1e3d32] hover:text-[#2a5244] underline underline-offset-2">Datenschutzerklärung</Link> gelesen und stimme zu. *
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl btn-primary"
                  >
                    <Send className="w-5 h-5" />
                    Nachricht senden
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
