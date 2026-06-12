"use client";

import { motion } from "framer-motion";
import { Search, Sparkles, FileText, Shield, Clock, Users } from "lucide-react";

const features = [
  {
    title: "Intelligente Suche",
    description: "Finden Sie passende Förderprogramme für Ihre Schule mit unserem durchdachten Filter-System. Nach Bundesland, Förderhöhe und Themenbereich.",
    icon: Search,
  },
  {
    title: "KI-Antragsassistent",
    description: "Generieren Sie professionelle Antragstexte mit KI. Basierend auf erfolgreichen Anträgen und den spezifischen Anforderungen jedes Programms.",
    icon: Sparkles,
  },
  {
    title: "Übersichtliche Details",
    description: "Alle Informationen zu Fristen, Förderbeträgen und Kriterien auf einen Blick. Nie wieder wichtige Details übersehen.",
    icon: FileText,
  },
];

const benefits = [
  {
    icon: Shield,
    title: "DSGVO-konform",
    description: "Daten auf Servern in Deutschland, KI-Verarbeitung in der EU — ohne Drittland-Transfer und ohne Training mit Ihren Eingaben.",
  },
  {
    icon: Clock,
    title: "Deadline-Tracking",
    description: "Verpassen Sie nie wieder eine Bewerbungsfrist mit automatischen Erinnerungen.",
  },
  {
    icon: Users,
    title: "Team-Feature",
    description: "Arbeiten Sie gemeinsam mit Kollegen an Förderanträgen in Echtzeit.",
  },
];

export function FeaturesSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section 
      className="py-24 lg:py-32 relative overflow-hidden"
      style={{ backgroundColor: '#f8f5f0' }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 geometric-grid" />
      <div className="absolute inset-0 dots-pattern" />
      
      {/* Floating Shape */}
      <div 
        className="absolute top-20 right-10 w-72 h-72 animate-float-slow hidden lg:block"
        style={{ 
          background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.08) 0%, transparent 100%)',
          borderRadius: '40% 60% 60% 40% / 60% 40% 60% 40%',
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-center mb-16"
        >
          <span 
            className="inline-block font-mono text-xs tracking-widest uppercase mb-4"
            style={{ color: '#c9a227' }}
          >
            Features
          </span>
          <h2 
            className="font-serif mb-6"
            style={{ color: '#0a1628' }}
          >
            Alles, was Sie für erfolgreiche
            <br />
            <span style={{ color: '#c9a227' }}>Förderanträge</span> brauchen
          </h2>
          <div className="flex justify-center">
            <div 
              className="w-16 h-0.5"
              style={{ background: 'linear-gradient(90deg, #c9a227, #e4c55a)' }}
            />
          </div>
        </motion.div>

        {/* Main Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto mb-20"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative"
            >
              {/* Card */}
              <div 
                className="h-full p-8 rounded-2xl transition-all duration-500 card-lift"
                style={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(10, 22, 40, 0.08)',
                  boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)',
                }}
              >
                {/* Corner Decoration */}
                <div 
                  className="absolute top-6 right-6 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    borderTop: '2px solid #c9a227',
                    borderRight: '2px solid #c9a227',
                  }}
                />

                {/* Icon */}
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110"
                  style={{ 
                    backgroundColor: 'rgba(201, 162, 39, 0.1)',
                    border: '1px solid rgba(201, 162, 39, 0.2)',
                  }}
                >
                  <feature.icon 
                    className="w-7 h-7" 
                    style={{ color: '#c9a227' }}
                  />
                </div>

                {/* Content */}
                <h3 
                  className="font-serif text-xl mb-3"
                  style={{ color: '#0a1628' }}
                >
                  {feature.title}
                </h3>
                <p 
                  className="text-sm leading-relaxed"
                  style={{ color: '#1e3a61' }}
                >
                  {feature.description}
                </p>

                {/* Hover Line */}
                <div 
                  className="absolute bottom-0 left-8 right-8 h-0.5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ background: 'linear-gradient(90deg, #c9a227, #e4c55a)' }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Benefits Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="border-t pt-12"
          style={{ borderColor: 'rgba(10, 22, 40, 0.08)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-4 group"
              >
                <div 
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{ 
                    backgroundColor: 'rgba(26, 77, 77, 0.1)',
                    border: '1px solid rgba(26, 77, 77, 0.2)',
                  }}
                >
                  <benefit.icon 
                    className="w-6 h-6 transition-colors duration-300"
                    style={{ color: '#1a4d4d' }}
                  />
                </div>
                <div>
                  <h4 
                    className="font-semibold mb-1"
                    style={{ color: '#0a1628' }}
                  >
                    {benefit.title}
                  </h4>
                  <p 
                    className="text-sm"
                    style={{ color: '#1e3a61' }}
                  >
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
