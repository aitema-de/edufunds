"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    id: 1,
    name: "Maria Schmidt",
    role: "Schulleiterin",
    school: "Grundschule am Park",
    location: "Berlin",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
    content: "Dank EduFunds konnten wir innerhalb von nur 3 Wochen einen erfolgreichen Antrag für unser MINT-Labor einreichen. Die KI-gestützte Textgenerierung hat uns enorm viel Zeit gespart!",
    amount: "€45.000",
    program: "DigitalPakt Schule",
    rating: 5,
  },
  {
    id: 2,
    name: "Thomas Müller",
    role: "Konrektor",
    school: "Gymnasium Weststadt",
    location: "München",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    content: "Endlich ein Tool, das die Bürokratie vereinfacht. Der Antrag für unsere digitale Ausstattung wurde beim ersten Versuch genehmigt. Absolut empfehlenswert!",
    amount: "€78.000",
    program: "Bayerisches Digitalförderprogramm",
    rating: 5,
  },
  {
    id: 3,
    name: "Anna Weber",
    role: "Förderverein Vorsitzende",
    school: "Realschule Sonnenberg",
    location: "Hamburg",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    content: "Als Förderverein hatten wir wenig Erfahrung mit Anträgen. EduFunds hat uns Schritt für Schritt begleitet - jetzt haben wir einen neuen Schulhof!",
    amount: "€32.000",
    program: "Schulhofprogramm Hamburg",
    rating: 5,
  },
  {
    id: 4,
    name: "Klaus Becker",
    role: "Schulleiter",
    school: "Gesamtschule Nordstadt",
    location: "Köln",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    content: "Die Matching-Funktion hat uns Förderprogramme gezeigt, von denen wir gar nicht wussten. Drei erfolgreiche Anträge in diesem Schuljahr!",
    amount: "€125.000",
    program: "Gute Schule 2020 NRW",
    rating: 5,
  },
];

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [autoplay]);

  const prev = () => {
    setAutoplay(false);
    setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  };

  const next = () => {
    setAutoplay(false);
    setCurrent((c) => (c + 1) % testimonials.length);
  };

  const t = testimonials[current];
  if (!t) return null;

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-emerald-400 text-sm font-medium mb-4">
            <Star className="w-4 h-4 fill-current" />
            Erfolgsgeschichten
          </span>
          <h2 className="text-slate-100 mb-4">
            Was unsere{" "}
            <span className="text-gradient-cyan">Nutzer sagen</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Schulen in ganz Deutschland nutzen EduFunds erfolgreich
          </p>
        </motion.div>

        {/* Testimonial Card */}
        <div className="max-w-4xl mx-auto">
          <div className="relative glass-strong rounded-3xl p-8 lg:p-12">
            {/* Quote icon */}
            <Quote className="absolute top-8 right-8 w-16 h-16 text-slate-700/30" />

            <AnimatePresence mode="wait">
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Success badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-emerald-400">
                    {t.amount} eingeworben • {t.program}
                  </span>
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-xl lg:text-2xl text-slate-300 leading-relaxed mb-8">
                  &ldquo;{t.content}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-slate-800 shadow-lg">
                    <Image
                      src={t.image}
                      alt={t.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 text-lg">{t.name}</div>
                    <div className="text-slate-400">{t.role}</div>
                    <div className="text-sm text-cyan-400">{t.school}, {t.location}</div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="absolute bottom-8 right-8 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={prev}
                className="rounded-full bg-slate-800/50 hover:bg-slate-700"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                className="rounded-full bg-slate-800/50 hover:bg-slate-700"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <Button
                key={i}
                variant="ghost"
                size="icon"
                onClick={() => { setAutoplay(false); setCurrent(i); }}
                className={`h-2 rounded-full transition-all p-0 ${
                  i === current 
                    ? "w-8 bg-cyan-500 hover:bg-cyan-400" 
                    : "w-2 bg-slate-600 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
        >
          {[
            { value: "98%", label: "Zufriedenheit" },
            { value: "€2.4M", label: "Eingeworben" },
            { value: "340+", label: "Erfolgreiche Anträge" },
            { value: "16", label: "Bundesländer" },
          ].map((stat) => (
            <div key={stat.label} className="feature-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gradient-cyan">
                {stat.value}
              </div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
