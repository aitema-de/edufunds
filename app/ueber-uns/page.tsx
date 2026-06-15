"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Target, Heart, Lightbulb, Users, Award, BookOpen } from "lucide-react";
import { PROGRAMM_COUNT_LABEL } from "@/lib/programm-count";

const values = [
  {
    icon: Heart,
    title: "Leidenschaft für Bildung",
    description: "Wir glauben an die Kraft von Bildung und wollen Schulen dabei unterstützen, das Beste aus ihren Möglichkeiten zu machen."
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "Mit modernster Technologie machen wir Fördermittel einfach und zugänglich. KI-gestützte Antragstellung spart Zeit und Ressourcen."
  },
  {
    icon: Users,
    title: "Gemeinschaft",
    description: "Wir verstehen die Herausforderungen von Schulen und entwickeln Lösungen, die wirklich gebraucht werden."
  },
  {
    icon: Award,
    title: "Qualität",
    description: "Wir setzen auf höchste Standards bei Datenqualität und Datenschutz. Ihre Daten sind bei uns sicher."
  }
];

export default function UeberUnsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ backgroundColor: "#f8f5f0" }}>
        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 80% 20%, rgba(201, 162, 39, 0.15) 0%, transparent 50%)`,
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
                style={{ backgroundColor: "rgba(201, 162, 39, 0.1)", color: "#7a5e12" }}>
                Über uns
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: "#0a1628" }}>
                Wir machen <span style={{ color: "#7a5e12" }}>Fördermittel</span> einfach
              </h1>
              <p className="text-lg" style={{ color: "#475569" }}>
                EduFunds ist die führende Plattform für Fördermittel an Schulen in Deutschland.
                Wir helfen Schulen, die passenden Förderprogramme zu finden und Anträge erfolgreich zu stellen.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-20" style={{ backgroundColor: "#f8f5f0" }}>
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl font-bold mb-6" style={{ color: "#0a1628" }}>
                  Unsere Mission
                </h2>
                <p className="text-lg mb-6" style={{ color: "#1e3a61" }}>
                  Jede Schule verdient Zugang zu Fördermitteln. Doch der Weg bis zum Zuschuss
                  ist oft steinig und kompliziert. Wir verändern das.
                </p>
                <p className="text-lg" style={{ color: "#1e3a61" }}>
                  Mit EduFunds machen wir Fördermittel transparent, zugänglich und nutzbar. 
                  Unsere KI-gestützte Plattform unterstützt Schulen bei der Suche nach passenden 
                  Programmen und der Erstellung überzeugender Anträge.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-2 gap-6"
              >
                <div className="p-6 rounded-2xl text-center" style={{ backgroundColor: "rgba(201, 162, 39, 0.1)" }}>
                  <div className="text-4xl font-bold mb-2" style={{ color: "#c9a227" }}>{PROGRAMM_COUNT_LABEL}</div>
                  <div className="text-sm" style={{ color: "#0a1628" }}>Förderprogramme</div>
                </div>
                <div className="p-6 rounded-2xl text-center" style={{ backgroundColor: "rgba(10, 22, 40, 0.05)" }}>
                  <div className="text-4xl font-bold mb-2" style={{ color: "#0a1628" }}>16</div>
                  <div className="text-sm" style={{ color: "#1e3a61" }}>Bundesländer</div>
                </div>
                <div className="p-6 rounded-2xl text-center" style={{ backgroundColor: "rgba(10, 22, 40, 0.05)" }}>
                  <div className="text-4xl font-bold mb-2" style={{ color: "#0a1628" }}>alle</div>
                  <div className="text-sm" style={{ color: "#1e3a61" }}>Schularten</div>
                </div>
                <div className="p-6 rounded-2xl text-center" style={{ backgroundColor: "rgba(201, 162, 39, 0.1)" }}>
                  <div className="text-4xl font-bold mb-2" style={{ color: "#c9a227" }}>KI</div>
                  <div className="text-sm" style={{ color: "#0a1628" }}>Unterstützung</div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold mb-4" style={{ color: "#0a1628" }}>
                Unsere Werte
              </h2>
              <p style={{ color: "#475569" }}>
                Diese Prinzipien leiten unsere Arbeit jeden Tag.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="p-6 rounded-2xl"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.85)", border: "1px solid rgba(201, 162, 39, 0.2)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: "rgba(201, 162, 39, 0.1)" }}>
                    <value.icon className="w-6 h-6" style={{ color: "#c9a227" }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "#0a1628" }}>
                    {value.title}
                  </h3>
                  <p className="text-sm" style={{ color: "#334155" }}>
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20" style={{ backgroundColor: "rgba(201, 162, 39, 0.05)" }}>
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold mb-4" style={{ color: "#0a1628" }}>
                Hinter EduFunds
              </h2>
              <p style={{ color: "#475569" }}>
                EduFunds ist ein Projekt der aitema GmbH - Ihr Partner für digitale Bildungslösungen.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl mx-auto p-8 rounded-2xl text-center"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.85)", border: "1px solid rgba(201, 162, 39, 0.2)" }}
            >
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ backgroundColor: "rgba(201, 162, 39, 0.2)" }}>
                <BookOpen className="w-10 h-10" style={{ color: "#c9a227" }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: "#0a1628" }}>
                aitema GmbH
              </h3>
              <p style={{ color: "#334155" }} className="mb-4">
                Wir entwickeln innovative Lösungen für Bildungseinrichtungen.
                Mit technologischer Expertise und pädagogischem Verständnis schaffen
                wir Werkzeuge, die den Schulalltag erleichtern.
              </p>
              <p style={{ color: "#7a5e12" }} className="font-medium">
                Ein Unternehmen mit Herz für Bildung
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
