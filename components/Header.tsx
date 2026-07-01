"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Sparkles,
  Search,
  LayoutDashboard,
  Info,
  CreditCard,
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
    icon: CreditCard,
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
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-[#1c1917] focus:text-[#d4af37] focus:px-3 focus:py-1.5 focus:rounded-md focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50 text-xs"
      >
        Inhalt überspringen
      </a>

      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled ? "glass-strong" : "glass"
        }`}
        role="banner"
      >
        <div className="container mx-auto flex items-center justify-between px-4 h-16">
          {/* Logo */}
          <Link href="/" className="group flex items-center" aria-label="EduFunds - Zur Startseite">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/edufunds-logo.svg"
              alt="EduFunds"
              width={344}
              height={120}
              className="h-[54px] w-auto transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex lg:items-center lg:gap-1" role="navigation" aria-label="Hauptnavigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative px-4 py-2 text-sm font-medium text-[#a8a29e] transition-all hover:text-[#d4af37] rounded-lg hover:bg-[#fdfdfc]/5"
              >
                <span className="flex items-center gap-2">
                  {item.label}
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/20">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="absolute bottom-0.5 left-4 right-4 h-0.5 bg-gradient-to-r from-[#c9a227] to-[#e4c55a] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex lg:items-center lg:gap-3">
            <Button asChild size="sm" className="bg-gold-500 text-ink hover:bg-gold-400">
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
            className="lg:hidden rounded-xl"
            aria-label={isOpen ? "Menü schließen" : "Menü öffnen"}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Scroll progress */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1c1917]/30">
          <div
            className="h-full bg-gradient-to-r from-[#c9a227] to-[#e4c55a] transition-all duration-150"
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
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="relative container mx-auto px-4 py-6"
            >
              <nav className="space-y-2">
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
                      className="flex items-center gap-3 p-4 rounded-xl glass hover:bg-[#fdfdfc]/5 transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-[#d4af37]" />
                      <span className="text-[#fdfdfc]">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-[#d4af37]/20 text-[#d4af37]">
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
                className="mt-6 space-y-3"
              >
                <Button asChild className="w-full bg-gold-500 text-ink hover:bg-gold-400">
                  <Link
                    href="/antrag/start"
                    onClick={() => setIsOpen(false)}
                  >
                    <Sparkles className="w-4 h-4" />
                    Programme entdecken
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Header;
