"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, CheckCircle2, Shield, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROGRAMM_COUNT_LABEL } from "@/lib/programm-count";

export function CTASection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
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
      {/* Background Pattern */}
      <div className="absolute inset-0 dots-pattern" />
      
      {/* Geometric Decoration */}
      <div 
        className="absolute -top-20 -right-20 w-96 h-96 hidden lg:block"
        style={{
          background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.06) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />
      <div 
        className="absolute -bottom-32 -left-32 w-80 h-80 hidden lg:block"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.04) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-[10%] w-4 h-4 hidden lg:block"
        style={{ backgroundColor: '#c9a227', borderRadius: '2px' }}
        animate={{ 
          y: [0, -15, 0], 
          rotate: [0, 90, 0],
        }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-32 right-[15%] w-3 h-3 hidden lg:block"
        style={{ backgroundColor: '#1a4d4d', borderRadius: '50%' }}
        animate={{ 
          y: [0, -20, 0],
        }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute top-1/2 right-[8%] w-6 h-6 hidden lg:block"
        style={{ 
          border: '2px solid rgba(201, 162, 39, 0.3)',
          borderRadius: '4px',
        }}
        animate={{ 
          rotate: [0, 180, 360],
        }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-8">
            <span 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs tracking-wider uppercase"
              style={{ 
                backgroundColor: 'rgba(10, 22, 40, 0.05)',
                border: '1px solid rgba(10, 22, 40, 0.1)',
                color: '#0a1628',
              }}
            >
              <span 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: '#c9a227' }}
              />
              Jetzt durchstarten
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={itemVariants}
            className="font-serif mb-6"
            style={{ color: '#0a1628' }}
          >
            Bereit, Fördermittel{' '}
            <span style={{ color: '#7a5e12' }}>erfolgreich</span>
            <br />
            zu beantragen?
          </motion.h2>

          {/* Accent Line */}
          <motion.div variants={itemVariants} className="flex justify-center mb-8">
            <div 
              className="w-20 h-0.5"
              style={{ background: 'linear-gradient(90deg, #c9a227, #e4c55a)' }}
            />
          </motion.div>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
            style={{ color: '#1e3a61' }}
          >
            Nutzen Sie EduFunds, um Förderanträge für Ihre Schule professionell zu erstellen.
          </motion.p>

          {/* Benefits */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-8 mb-12"
          >
            {[
              { icon: Zap, text: "Kostenlos starten" },
              { icon: Shield, text: "100% DSGVO-konform" },
              { icon: Clock, text: "Sofortiger Zugang" },
            ].map((item) => (
              <div 
                key={item.text} 
                className="flex items-center gap-3"
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(26, 77, 77, 0.1)' }}
                >
                  <item.icon 
                    className="w-5 h-5" 
                    style={{ color: '#1a4d4d' }}
                  />
                </div>
                <span 
                  className="font-medium"
                  style={{ color: '#0a1628' }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button asChild size="lg" className="group">
              <Link href="/foerderprogramme">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Jetzt Programme entdecken</span>
                <ArrowRight 
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
                />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline-navy">
              <Link href="/ueber-uns">
                <span className="font-semibold">Mehr erfahren</span>
              </Link>
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-6 pt-8 border-t"
            style={{ borderColor: 'rgba(10, 22, 40, 0.08)' }}
          >
            {["Jederzeit kündbar", "DSGVO-konform", "Sichere Zahlung"].map((text) => (
              <span key={text} className="flex items-center gap-2">
                <CheckCircle2 
                  className="w-4 h-4" 
                  style={{ color: '#1a4d4d' }}
                />
                <span 
                  className="text-sm"
                  style={{ color: '#1e3a61' }}
                >
                  {text}
                </span>
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto"
        >
          {[
            { value: PROGRAMM_COUNT_LABEL, label: "Förderprogramme" },
            { value: "alle", label: "Schularten" },
            { value: "16", label: "Bundesländer" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              className="text-center p-6 rounded-2xl"
              style={{ 
                backgroundColor: '#ffffff',
                border: '1px solid rgba(10, 22, 40, 0.06)',
                boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)',
              }}
            >
              <div 
                className="text-3xl font-serif mb-1"
                style={{ 
                  background: 'linear-gradient(135deg, #c9a227 0%, #b08d1f 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
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
      </div>
    </section>
  );
}

export default CTASection;
