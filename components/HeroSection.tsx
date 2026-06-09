"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, School, Building2, HeartHandshake, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import foerderprogramme from "@/data/foerderprogramme.json";

export function HeroSection() {
  const stats = {
    total: "160+",
    bund: foerderprogramme.filter(p => p.foerdergeberTyp === 'bund').length,
    land: foerderprogramme.filter(p => p.foerdergeberTyp === 'land').length,
    stiftung: foerderprogramme.filter(p => p.foerdergeberTyp === 'stiftung').length,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#f8f5f0' }}>
      {/* Geometric Background Elements */}
      <div className="absolute inset-0 geometric-grid" />
      <div className="absolute inset-0 dots-pattern" />
      
      {/* Floating Geometric Shapes */}
      <div 
        className="absolute top-[15%] right-[10%] w-64 h-64 animate-float hidden lg:block"
        style={{ 
          background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.08) 0%, rgba(201, 162, 39, 0.02) 100%)',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
        }}
      />
      <div 
        className="absolute bottom-[20%] left-[5%] w-48 h-48 animate-float-delayed hidden lg:block"
        style={{ 
          background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.06) 0%, rgba(10, 22, 40, 0.02) 100%)',
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
        }}
      />
      <div 
        className="absolute top-[40%] left-[15%] w-24 h-24 animate-float-slow hidden lg:block"
        style={{ 
          border: '2px solid rgba(201, 162, 39, 0.15)',
          borderRadius: '50%',
        }}
      />

      <div className="container mx-auto px-6 pt-32 pb-20 lg:pt-40 lg:pb-32 relative z-10">
        <motion.div 
          className="max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Top Badge */}
          <motion.div variants={itemVariants} className="flex justify-center mb-8">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs tracking-wider uppercase"
              style={{ 
                backgroundColor: 'rgba(10, 22, 40, 0.05)',
                border: '1px solid rgba(10, 22, 40, 0.1)',
                color: '#0a1628',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#c9a227' }} />
              <span>KI-gestützter Antragsassistent</span>
            </div>
          </motion.div>

          {/* Main Headline - Editorial Style */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 
              className="font-serif tracking-tight mb-4"
              style={{ color: '#0a1628' }}
            >
              Fördermittel für
              <br />
              <span style={{ color: '#c9a227' }}>Schulen.</span>
              <br />
              <span className="text-4xl md:text-5xl lg:text-6xl italic opacity-60">
                Vereinfacht.
              </span>
            </h1>
            
            <div className="flex justify-center mb-6">
              <div 
                className="accent-line"
                style={{ background: 'linear-gradient(90deg, #c9a227, #e4c55a)' }}
              />
            </div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-center max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{ color: '#1e3a61' }}
          >
            Finden und beantragen Sie passende Förderungen für Ihre Schule 
            mit intelligenter Suche und KI-Unterstützung.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          >
            <Button asChild size="lg" variant="secondary" className="group">
              <Link href="/foerderprogramme">
                <Search className="w-5 h-5" />
                <span className="font-semibold">Förderfinder öffnen</span>
                <ArrowRight 
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
                />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline-navy" className="group">
              <Link href="/foerderprogramme">
                <Sparkles className="w-5 h-5 text-[#c9a227] group-hover:text-[#0a1628]" />
                <span className="font-semibold">KI-Assistent testen</span>
              </Link>
            </Button>
          </motion.div>

          {/* Stats - Card Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {[
              { value: stats.total, label: 'Programme', icon: School, color: '#c9a227' },
              { value: stats.bund, label: 'Bund', icon: Building2, color: '#1a4d4d' },
              { value: stats.land, label: 'Länder', icon: HeartHandshake, color: '#1e3a61' },
              { value: stats.stiftung, label: 'Stiftungen', icon: Sparkles, color: '#b08d1f' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="group p-5 rounded-2xl transition-all duration-300"
                style={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(10, 22, 40, 0.06)',
                  boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)',
                }}
                whileHover={{ 
                  y: -4,
                  boxShadow: '0 12px 40px -8px rgba(10, 22, 40, 0.12)',
                }}
                transition={{ duration: 0.3 }}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div 
                  className="text-3xl font-serif mb-1"
                  style={{ color: '#0a1628' }}
                >
                  {stat.value}
                </div>
                <div 
                  className="text-sm font-medium"
                  style={{ color: '#1e3a61', opacity: 0.7 }}
                >
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom Trust Bar */}
          <motion.div
            variants={itemVariants}
            className="mt-16 pt-8 border-t flex flex-wrap items-center justify-center gap-8"
            style={{ borderColor: 'rgba(10, 22, 40, 0.08)' }}
          >
            {[
              'Für alle Schularten',
              'DSGVO-konform',
              '130+ Programme',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  style={{ color: '#1a4d4d' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span 
                  className="text-sm font-medium"
                  style={{ color: '#1e3a61' }}
                >
                  {item}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
