"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Sparkles,
  Search,
  Info,
  CreditCard,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROGRAMM_COUNT_LABEL } from "@/lib/programm-count";

const navItems = [
  {
    href: "/foerderprogramme",
    label: "Förderprogramme",
    badge: PROGRAMM_COUNT_LABEL,
    icon: Search,
  },
  {
    href: "/preise",
    label: "Preise",
    icon: CreditCard,
  },
  {
    href: "/ueber-uns",
    label: "Über uns",
    icon: Info,
  },
  {
    href: "/kontakt",
    label: "Kontakt",
    icon: Mail,
  },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      // Calculate scroll progress
      const winScroll = window.scrollY;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-evergreen focus:text-paper focus:px-3 focus:py-1.5 focus:rounded-md focus:outline-none focus:ring-1 focus:ring-gold-500/60 text-xs"
      >
        Inhalt überspringen
      </a>

      {/* Filigraner Paper-Header (Richtung F): halbtransparent + Haarlinie,
          verdichtet sich beim Scrollen leicht. Kein dunkles Glas mehr. */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 border-b backdrop-blur-md ${
          isScrolled
            ? "bg-paper/90 border-ink/10"
            : "bg-paper/70 border-ink/5"
        }`}
        role="banner"
      >
        <div className="container mx-auto flex items-center justify-between px-4 h-16">
          {/* Logo — Crest + Serif-Wortmarke (statt Bild-Logo) */}
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="EduFunds - Zur Startseite"
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-gold-500 bg-white font-serif text-sm text-evergreen shadow-[0_0_0_3px_rgba(201,162,39,0.12)] transition-transform group-hover:scale-105"
            >
              Ef
            </span>
            <span
              className="font-serif text-[22px] leading-none text-evergreen"
              style={{ fontWeight: 500 }}
            >
              Edu<span className="italic text-gold-700">Funds</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex lg:items-center lg:gap-1" role="navigation" aria-label="Hauptnavigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative px-4 py-2 text-sm font-medium text-ink/60 transition-all hover:text-evergreen rounded-lg hover:bg-ink/[0.03]"
              >
                <span className="flex items-center gap-2">
                  {item.label}
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gold-500/15 text-gold-700 border border-gold-500/25">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="absolute bottom-0.5 left-4 right-4 h-px bg-gradient-to-r from-gold-600 to-gold-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex lg:items-center lg:gap-3">
            <Button
              asChild
              size="sm"
              className="bg-evergreen text-paper hover:bg-evergreen-light shadow-none"
            >
              <Link href="/antrag/start">
                <Sparkles className="w-4 h-4" />
                Programme entdecken
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden rounded-xl text-ink hover:bg-ink/5"
            aria-label={isOpen ? "Menü schließen" : "Menü öffnen"}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Scroll progress — hauchduenne Goldlinie */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-transparent">
          <div
            className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-40 pt-16"
          >
            <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="relative container mx-auto px-4 py-4"
            >
              <div className="rounded-2xl border border-ink/10 bg-paper p-3 shadow-xl">
                <nav className="space-y-1">
                  {navItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 p-4 rounded-xl hover:bg-ink/[0.04] transition-colors"
                      >
                        <item.icon className="w-5 h-5 text-evergreen" />
                        <span className="text-ink font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-gold-500/15 text-gold-700 border border-gold-500/25">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </nav>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="mt-3 border-t border-ink/5 pt-3"
                >
                  <Button
                    asChild
                    className="w-full bg-evergreen text-paper hover:bg-evergreen-light"
                  >
                    <Link
                      href="/antrag/start"
                      onClick={() => setIsOpen(false)}
                    >
                      <Sparkles className="w-4 h-4" />
                      Programme entdecken
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Header;
