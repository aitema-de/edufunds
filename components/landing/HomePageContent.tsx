"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Minus, ChevronDown, Sparkles } from "lucide-react";
import { CANONICAL_APP_HOST } from "@/lib/app-url";
import {
  HourglassIcon,
  StampIcon,
  MapIcon,
  emblemForKategorie,
  markForTyp,
} from "@/components/landing/emblems";
import { PROGRAMM_COUNT_ROUNDED } from "@/lib/programm-count";

/* ---------- Typen (echte Daten kommen serverseitig aus app/page.tsx) ---------- */
export type LandingStats = {
  total: string; // Marketing-Label, z. B. "180+"
  bund: number;
  land: number;
  stiftung: number;
  eu: number;
  bundeslaender: number;
};

export type LandingProgramme = {
  name: string;
  geber: string;
  typ: string;
  kat?: string;
  summe?: string;
  frist?: string;
  kurz?: string;
};

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

/* Editoriale Akzente:
   - HELLE Flaechen → brandy (#78350f, text-brandy / bg-brandy)
   - DUNKLE Flaechen → amber (#d4af37 / amber-200/300/400)
   Regel aus dem Design-Refresh (Welle 1–3).

   Richtung F „Akademisch/Institut" (Welle 1+2, 2026-07-01): gesamte Home-Seite
   auf evergreen (#1e3d32) als Struktur-Farbe umgestellt, Gold (gold-Skala) als
   Auszeichnung — helle Flaechen: text-evergreen / italic text-gold-700; dunkle
   Flaechen (evergreen/ink): gold-300/400. brandy bleibt auf den uebrigen
   Seiten (Foerderprogramme, Wizard, Preise) bis zur naechsten Welle. */

export function HomePageContent({
  stats,
  programme,
}: {
  stats: LandingStats;
  programme: LandingProgramme[];
}) {
  return (
    <>
      <Hero stats={stats} />
      <ProgrammTicker programme={programme} total={stats.total} />
      <Problem />
      <LiveShowcase stats={stats} />
      <Datenschutz />
      <ProgrammeShowcase stats={stats} programme={programme} />
      <GruenderSektion />
      <PreiseTeaser />
      <FAQ />
      <ClosingCta />
    </>
  );
}

/* ======================================================================
   HERO — Variante 1c aus dem Landing-Handoff (02.07.2026): dunkelgruener
   Hero, Headline in Bricolage Grotesque (font-display), Gold-CTA #D4B160,
   Outline-Chips, Projektfoto mit schwebendem Status-Chip. Bewusster
   Richtungswechsel weg vom Serif-Hero (Kolja-Entscheid 02.07.).
   Gruenflaeche = bestehendes evergreen-Token (≈ Handoff #1E3A2F);
   #D4B160/#FBF9F3 sind 1c-spezifisch und haben kein Token.
   ====================================================================== */
function Hero({ stats }: { stats: LandingStats }) {
  const chips = [
    `${stats.total} Programme`,
    `${stats.bundeslaender} Bundesländer`,
    "DSGVO-konform",
  ];
  return (
    <section id="top" className="relative overflow-hidden bg-evergreen px-6 pt-16 pb-16 lg:pt-[76px] lg:pb-[84px]">
      <div className="relative max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_560px] gap-12 lg:gap-[72px] items-center">
          <div>
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6, ease: EASE }}
              className="text-[12.5px] uppercase tracking-[0.15em] font-bold text-[#D4B160] mb-[22px]"
            >
              Fördermittel für Schulen. Vereinfacht.
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
              className="font-display font-semibold text-[40px] md:text-[52px] lg:text-[60px] leading-[1.06] text-[#FBF9F3] text-balance mb-6"
            >
              Jedes Jahr bleiben <span className="text-[#D4B160]">Millionen an Fördermitteln</span> ungenutzt.
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
              className="text-lg leading-[1.6] text-[#FBF9F3]/[0.78] max-w-[520px] text-pretty mb-8"
            >
              {stats.total} geprüfte Programme an einem Ort. Unser KI-Assistent
              erstellt einen fertigen Antragsentwurf in Minuten statt Wochen —
              DSGVO-konform, Daten in Deutschland, KI in der EU.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.18, ease: EASE }}
            >
              {/* EIN primärer CTA mit Ergebnis- + Aufwandsversprechen
                  (Marketing-Analyse Befund 02: zwei gleichrangige CTAs
                  verwässern den Einstieg; KI-Assistent folgt im Funnel). */}
              <div className="mb-3.5">
                {/* Pfeil laeuft im Text mit (kein Flex-Spalt): bricht das Label
                    um, sitzt er hinter „finden" statt am rechten Pill-Rand. */}
                <Link
                  href="/foerderprogramme"
                  className="bg-[#D4B160] text-evergreen text-base font-bold leading-snug rounded-full py-4 px-[30px] inline-block text-center hover:bg-[#DDBE74] transition-colors duration-150 active:scale-[0.98]"
                >
                  <span className="text-balance">
                    Passende Förderprogramme für Ihre Schule finden{" "}
                    <ArrowRight aria-hidden className="inline size-[18px] align-[-3.5px]" />
                  </span>
                </Link>
              </div>
              <div className="text-[13.5px] text-[#FBF9F3]/55 mb-[30px]">
                Kostenlos · Ergebnis in 2 Minuten
              </div>
              <div className="flex flex-wrap gap-2.5">
                {chips.map((c) => (
                  <span
                    key={c}
                    className="border border-[#FBF9F3]/25 text-[#FBF9F3]/85 text-[13.5px] font-semibold rounded-full px-4 py-2"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            className="relative"
          >
            {/* Unsplash-Stand-in (lokal in /public/landing) — vor Launch durch
                echtes Projektfoto ersetzen, siehe Handoff-README „Assets" */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/hero-projekt.jpg"
              alt="Schülerinnen und Schüler arbeiten gemeinsam an einem Projekt"
              width={1120}
              height={1040}
              className="w-full h-[420px] lg:h-[520px] object-cover rounded-2xl"
            />
            {/* Schwebende Antragskarte nach 1a-Spez (300px, Label + Titel +
                zwei Datenzeilen) — Produktbeweis statt unklarem Status-Chip. */}
            <div className="absolute left-4 right-4 lg:left-[-40px] lg:right-auto lg:w-[300px] bottom-14 lg:bottom-9 bg-white border border-[#EDE9DE] rounded-[14px] px-6 py-5 shadow-[0_18px_40px_rgba(30,58,47,0.35)]">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-bold text-[#98A29C]">
                Antragsentwurf
              </div>
              <div className="font-serif text-[19px] leading-snug text-evergreen mt-0.5" style={{ fontWeight: 600 }}>
                DigitalPakt Schule 2.0
              </div>
              <div className="mt-3 pt-3 border-t border-[#F0EDE4] flex items-baseline justify-between gap-3 text-sm">
                <span className="text-[#7A8580]">Beantragte Summe</span>
                <span className="font-bold text-[#A8842C]">278.500 €</span>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-[#F0EDE4] flex items-baseline justify-between gap-3 text-sm">
                <span className="text-[#7A8580]">Status</span>
                <span className="font-semibold text-[#22302B]">Entwurf fertig</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[#FBF9F3]/40">
              Symbolfoto · Illustratives Beispiel — keine realen Antragsdaten.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ======================================================================
   PRODUCT SHOWCASE — dunkel, animiertes Produkt-Mock (statt Video)
   ====================================================================== */
function LiveShowcase({ stats }: { stats: LandingStats }) {
  const steps = [
    { n: "01", t: "Interview", b: "Kurzes Gespräch über Ihr Vorhaben." },
    { n: "02", t: "Gliederung", b: "Automatische Argumentationskette." },
    { n: "03", t: "Abschnitte", b: "Präzise Texte nach Richtlinie." },
    { n: "04", t: "Finalfassung", b: "Unterschriftsreifes Dokument." },
  ];

  // Donut-Segmente aus echten Förderquellen-Typen
  const segs = [
    { label: "Bund", n: stats.bund, color: "#1e3d32" },
    { label: "Länder", n: stats.land, color: "#c9a227" },
    { label: "Stiftungen", n: stats.stiftung, color: "#a8a29e" },
    { label: "EU", n: stats.eu, color: "#44403c" },
  ];
  const segSum = segs.reduce((a, s) => a + s.n, 0) || 1;
  let acc = 0;
  const conic = segs
    .map((s) => {
      const start = (acc / segSum) * 100;
      acc += s.n;
      const end = (acc / segSum) * 100;
      return `${s.color} ${start}% ${end}%`;
    })
    .join(", ");

  const bars = [
    { h: 32, l: "5 T€" },
    { h: 52, l: "25 T€" },
    { h: 78, l: "150 T€" },
    { h: 100, l: "500 T€" },
    { h: 60, l: "div." },
  ];

  return (
    <section id="prozess" className="py-24 px-6 bg-paper">
      <div className="max-w-7xl mx-auto">
        {/* Überschrift */}
        <div className="max-w-2xl mb-14">
          <span className="text-xs uppercase tracking-widest text-evergreen font-semibold">
            So funktioniert&apos;s
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-tight mt-3 text-balance" style={{ fontWeight: 500 }}>
            Vom Bedarf zum <span className="italic text-gold-700">fertigen Antrag</span>.
          </h2>
          <p className="text-ink/70 mt-5 text-pretty leading-relaxed">
            Vier Schritte, eine Sitzung — begleitet von unserer KI. Sehen Sie unten live,
            wie ein Antrag entsteht, und die Demo in voller Länge.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6 mb-20">
          <div className="hidden md:block absolute top-[31px] left-[12%] right-[12%] h-[3px] bg-ink/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-evergreen to-gold-500"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.4, ease: EASE }}
              style={{ transformOrigin: "left" }}
            />
          </div>
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.12}>
              <div className="relative text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full border-2 border-gold-500 bg-paper font-serif italic text-2xl text-evergreen shadow-[0_10px_26px_-12px_rgba(30,61,50,0.45)]">
                  {s.n}
                </div>
                <h4 className="font-semibold font-sans mb-1.5">{s.t}</h4>
                <p className="text-sm text-ink/65 leading-relaxed max-w-[24ch] mx-auto">{s.b}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Live-Generator (dunkel) + Video */}
        <div className="grid lg:grid-cols-2 gap-6 items-stretch mb-6">
          <LiveGenerator />

          <div className="relative">
            <div className="relative h-full rounded-3xl overflow-hidden ring-1 ring-ink/10 shadow-xl bg-black">
              <video
                src="/edufunds-demo.mp4"
                poster="/edufunds-demo-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="EduFunds Demo: vom Schulprofil zum fertigen Förderantrag"
                className="block w-full h-full min-h-[280px] object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
              <div className="absolute left-5 bottom-4 text-paper">
                <div className="font-serif text-lg" style={{ fontWeight: 500 }}>EduFunds in Aktion</div>
                <div className="text-xs text-paper/75">Demo · 0:10</div>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
              whileInView={{ opacity: 1, scale: 1, rotate: -5 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
              className="absolute -bottom-4 -right-3 bg-evergreen text-paper rounded-2xl px-5 py-3 shadow-xl"
            >
              <div className="font-serif text-2xl leading-none" style={{ fontWeight: 500 }}>10 Min.</div>
              <div className="text-[11px] text-paper/80 mt-1">statt 14 Tage</div>
            </motion.div>
          </div>
        </div>

        {/* Dynamische Infografiken */}
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {/* In Zahlen */}
          <div className="rounded-2xl border border-ink/10 bg-paper p-6">
            <div className="text-[11px] uppercase tracking-widest text-evergreen font-semibold mb-5">In Zahlen</div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="font-serif text-4xl leading-none text-ink"><CountUp to={PROGRAMM_COUNT_ROUNDED} suffix="+" /></div>
                <div className="text-xs text-ink/65 mt-1.5">geprüfte Programme</div>
              </div>
              <div>
                <div className="font-serif text-4xl leading-none text-ink"><CountUp to={stats.bundeslaender} /></div>
                <div className="text-xs text-ink/65 mt-1.5">Bundesländer</div>
              </div>
              <div>
                <div className="font-serif text-4xl leading-none text-ink"><CountUp to={100} suffix=" %" /></div>
                <div className="text-xs text-ink/65 mt-1.5">DSGVO-konform</div>
              </div>
              <div>
                <div className="font-serif text-4xl leading-none text-ink">EU</div>
                <div className="text-xs text-ink/65 mt-1.5">KI aus Frankreich</div>
              </div>
            </div>
          </div>

          {/* Donut Förderquellen */}
          <div className="rounded-2xl border border-ink/10 bg-paper p-6">
            <div className="text-[11px] uppercase tracking-widest text-evergreen font-semibold mb-4">Förderquellen</div>
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotate: -90 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 1, ease: EASE }}
              className="mx-auto size-32 rounded-full"
              style={{
                background: `conic-gradient(${conic})`,
                WebkitMask: "radial-gradient(circle 40px at center, transparent 98%, #000)",
                mask: "radial-gradient(circle 40px at center, transparent 98%, #000)",
              }}
            />
            <div className="mt-4 space-y-1.5 text-xs text-ink/70">
              {segs.map((s) => (
                <span key={s.label} className="flex items-center gap-2">
                  <i className="size-2.5 rounded-[3px]" style={{ background: s.color }} /> {s.label} · {s.n}
                </span>
              ))}
            </div>
          </div>

          {/* Balken Fördersummen */}
          <div className="rounded-2xl border border-ink/10 bg-paper p-6">
            <div className="text-[11px] uppercase tracking-widest text-evergreen font-semibold mb-4">Typische Fördersummen</div>
            <div className="flex items-end gap-3 h-[120px]">
              {bars.map((b, i) => (
                <motion.div
                  key={b.l}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: EASE }}
                  style={{ height: `${b.h}%`, transformOrigin: "bottom" }}
                  className="flex-1 rounded-t-lg bg-gradient-to-t from-evergreen to-evergreen-light"
                />
              ))}
            </div>
            <div className="flex gap-3 mt-2 text-[11px] text-ink/45">
              {bars.map((b) => (
                <span key={b.l} className="flex-1 text-center">{b.l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Live-Generator (dunkle „So entsteht ein Antrag"-Karte) ---------- */
function LiveGenerator() {
  const R = 26;
  const C = 2 * Math.PI * R;
  const docLines = [96, 88, 92, 70, 84];
  const pipeline = [
    { l: "Schulprofil ausgewertet", done: true },
    { l: "Bedarf strukturiert", done: true },
    { l: "Richtlinie abgeglichen", done: true },
    { l: "Antragstext formuliert", done: false },
  ];
  const chips = [
    { k: "Fördersumme", v: "≈ 250.000 €" },
    { k: "Eigenanteil", v: "10 %" },
    { k: "Laufzeit", v: "36 Mon." },
    { k: "Frist", v: "31.03.26" },
  ];
  return (
    <div className="rounded-3xl overflow-hidden ring-1 ring-ink/10 shadow-xl bg-[#161311] text-paper">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-400/60" />
          <span className="size-2.5 rounded-full bg-amber-300/60" />
          <span className="size-2.5 rounded-full bg-emerald-400/60" />
        </div>
        <span className="text-[11px] tracking-widest uppercase text-white/40">{CANONICAL_APP_HOST}</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-gold-400 font-medium">
          <Sparkles className="size-3" /> generiert
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.9fr]">
        {/* Dokument */}
        <div className="p-6 border-b sm:border-b-0 sm:border-r border-white/10">
          <span className="text-[10px] uppercase tracking-widest text-white/40">Abschnitt 3 / 7</span>
          <h4 className="font-serif text-lg mt-1 mb-4" style={{ fontWeight: 500 }}>Pädagogisches Konzept &amp; Bedarf</h4>
          <div className="space-y-2.5">
            {docLines.map((w, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0, opacity: 0 }}
                whileInView={{ scaleX: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.18, ease: EASE }}
                style={{ width: `${w}%`, transformOrigin: "left" }}
                className="h-2.5 rounded-full bg-white/10"
              />
            ))}
            <span className="inline-block h-3.5 w-[2px] bg-gold-400 align-middle animate-pulse" />
          </div>

          {/* Fortschritts-Ring */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
            <div className="relative size-16 shrink-0">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                <motion.circle
                  cx="32" cy="32" r={R} fill="none" stroke="#d4af37" strokeWidth="6" strokeLinecap="round"
                  transform="rotate(-90 32 32)" strokeDasharray={C}
                  initial={{ strokeDashoffset: C }}
                  whileInView={{ strokeDashoffset: C * (1 - 0.76) }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 1.4, delay: 0.3, ease: EASE }}
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-sm font-bold text-gold-300">76%</span>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-white/45">Fortschritt</div>
              <div className="text-[13px] text-white/80 mt-1">Antragstext wird formuliert …</div>
            </div>
          </div>
        </div>

        {/* Pipeline + Fakten */}
        <div className="p-6 bg-black/20">
          <span className="text-[10px] uppercase tracking-widest text-gold-400 font-semibold">Pipeline</span>
          <div className="mt-4 space-y-3">
            {pipeline.map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.22, ease: EASE }}
                className="flex items-center gap-2.5 text-[12.5px]"
              >
                <span className={`grid size-[18px] place-items-center rounded-full text-[10px] font-bold ${s.done ? "bg-emerald-400 text-[#1c1917]" : "bg-white/10 text-white/50"}`}>
                  {s.done ? "✓" : i + 1}
                </span>
                <span className={s.done ? "text-white/85" : "text-white/50"}>{s.l}</span>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {chips.map((c, i) => (
              <motion.div
                key={c.k}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 1.1 + i * 0.12, ease: EASE }}
                className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2"
              >
                <div className="text-[9px] uppercase tracking-widest text-white/40">{c.k}</div>
                <div className="font-serif text-[15px] mt-0.5">{c.v}</div>
              </motion.div>
            ))}
          </div>
          <p className="text-[9px] text-white/35 mt-3">Illustratives Beispiel — keine realen Antragsdaten.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- CountUp (zählt beim Sichtbarwerden hoch) ---------- */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setVal(Math.floor(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

/* ======================================================================
   PROGRAMM-TICKER — Endlos-Laufband mit echten Programmnamen (Richtung F).
   Ersetzt den statischen TrustStrip; die Foerderquellen-Info laeuft als
   Abschlussitem mit. Zwei identische Haelften (2. aria-hidden) → nahtlose
   CSS-Schleife (.ticker-track, globals.css); reduced-motion stoppt sie.
   ====================================================================== */
function ProgrammTicker({
  programme,
  total,
}: {
  programme: LandingProgramme[];
  total: string;
}) {
  const items = [
    ...programme.map((p) => p.name),
    "aus Mitteln von BMBF · Landesministerien · ESF+ · Stiftungen · Kommunen · EU",
  ];
  return (
    <section
      aria-label={`Beispiele aus dem Katalog mit ${total} Programmen`}
      className="relative overflow-hidden border-y border-gold-500/40 bg-evergreen py-3"
    >
      <div className="ticker-track flex w-max">
        {[0, 1].map((half) => (
          <ul
            key={half}
            aria-hidden={half === 1}
            className="flex items-center gap-10 pr-10 whitespace-nowrap"
          >
            <li className="text-[10px] uppercase tracking-[0.25em] text-paper/60 font-medium">
              Aus dem Katalog · {total} Programme
            </li>
            {items.map((n, i) => (
              <li key={`${half}-${i}`} className="flex items-center gap-10">
                <span className="font-serif italic text-[15px] text-gold-300">{n}</span>
                <span aria-hidden className="size-1 rounded-full bg-gold-500/50" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

/* ======================================================================
   PROBLEM
   ====================================================================== */
function Problem() {
  const items = [
    {
      title: "Akuter Zeitmangel",
      body: "Schulleitungen sind bereits überlastet. Das Durchforsten von 50-seitigen Förderrichtlinien bleibt oft auf der Strecke.",
      Icon: HourglassIcon,
    },
    {
      title: "Bürokratische Hürden",
      body: "Die Sprache der Förderanträge ist oft unnötig komplex. Ein kleiner Formfehler führt häufig zur sofortigen Ablehnung.",
      Icon: StampIcon,
    },
    {
      title: "Fehlende Übersicht",
      body: "Es gibt keinen zentralen Ort, der alle Bundes-, Landes- und Stiftungsmittel für Ihre spezifische Schule bündelt.",
      Icon: MapIcon,
    },
  ];
  return (
    <section className="py-24 px-6 bg-[#f6f3ec] border-y border-ink/5">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <h2 className="font-serif text-3xl md:text-4xl text-balance mb-16 max-w-2xl" style={{ fontWeight: 500 }}>
            Warum Schulen wertvolles Budget verlieren.
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-12">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.08}>
              <div className="space-y-4">
                <div className="size-12 bg-paper rounded-full flex items-center justify-center ring-1 ring-evergreen/15 text-evergreen">
                  <it.Icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold font-sans">{it.title}</h3>
                <p className="text-ink/60 text-sm leading-relaxed max-w-[35ch] text-pretty">
                  {it.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ======================================================================
   DATENSCHUTZ
   ====================================================================== */
function Datenschutz() {
  const points = [
    {
      kicker: "EU-KI",
      title: "Mistral aus Frankreich",
      body: "Wir nutzen europäische KI-Modelle. Keine Datenweitergabe an US-Anbieter, kein Cloud Act, keine Grauzone.",
    },
    {
      kicker: "Hosting",
      title: "Daten in Deutschland, KI in der EU",
      body: "Ihre Daten liegen bei Hetzner in Deutschland. Die KI-Verarbeitung läuft bei Mistral AI (Paris) im EU-Raum — kein Transfer in Drittländer.",
    },
    {
      kicker: "Training",
      title: "Kein Training mit Ihren Daten",
      body: "Ihre Anträge, Schulnamen und Konzepte fließen nie in ein Modelltraining ein.",
    },
    {
      kicker: "Vorfilter",
      title: "Personenbezogene Daten maskiert",
      body: "Vor jedem KI-Aufruf werden Namen, Adressen und sensible Angaben automatisch maskiert und danach rückgeführt.",
    },
  ];
  return (
    <section id="datenschutz" className="py-24 px-6 bg-[#f6f3ec] border-y border-ink/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-16">
          <div className="space-y-6">
            <span className="text-xs uppercase tracking-widest text-evergreen font-semibold">
              Datenschutz · ohne Kompromiss
            </span>
            <Reveal>
              <h2 className="font-serif text-3xl md:text-5xl leading-tight text-balance" style={{ fontWeight: 500 }}>
                Was die Schule anvertraut, bleibt <span className="italic text-gold-700">vertraulich</span>.
              </h2>
            </Reveal>
            <p className="text-ink/70 max-w-[42ch] leading-relaxed">
              Schulen tragen besondere Verantwortung. Deshalb haben wir EduFunds so
              gebaut, dass selbst der vorsichtigste Datenschutzbeauftragte ruhig
              schlafen kann.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {["DSGVO", "EU-KI", "DE-Hosting", "Daten-Maskierung", "Kein Abo"].map((b) => (
                <span
                  key={b}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-paper ring-1 ring-ink/10 text-ink/70"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-ink/5 rounded-2xl overflow-hidden ring-1 ring-ink/5">
            {points.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06}>
                <div className="bg-paper p-6 space-y-3 h-full">
                  <span className="text-[10px] uppercase tracking-widest text-evergreen font-semibold">
                    {p.kicker}
                  </span>
                  <h3 className="font-serif text-xl leading-snug" style={{ fontWeight: 500 }}>{p.title}</h3>
                  <p className="text-sm text-ink/65 leading-relaxed">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ======================================================================
   PROGRAMME SHOWCASE — dunkel, echte Stats + echte Programme
   ====================================================================== */
function ProgrammeShowcase({
  stats,
  programme,
}: {
  stats: LandingStats;
  programme: LandingProgramme[];
}) {
  const statCards = [
    // "180+" → CountUp bis 180 mit "+"-Suffix; Rest reine Zahlen
    { n: parseInt(stats.total, 10) || 0, suffix: stats.total.replace(/^\d+/, ""), l: "Programme" },
    { n: stats.bund, suffix: "", l: "Bundesmittel" },
    { n: stats.land, suffix: "", l: "Landesmittel" },
    { n: stats.stiftung, suffix: "", l: "Stiftungen" },
    { n: stats.eu, suffix: "", l: "EU-Programme" },
  ];
  return (
    <section
      id="programme"
      className="relative overflow-hidden py-24 px-6 bg-evergreen text-paper border-y-[3px] border-double border-gold-500/70"
    >
      {/* Feines helles Raster auf dem Gruen — Akten-Textur (dekorativ) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(253,253,252,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(253,253,252,0.05)_1px,transparent_1px)] [background-size:46px_46px]"
      />
      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-4">
            <Reveal>
              <h2 className="font-serif text-3xl md:text-5xl text-paper" style={{ fontWeight: 500 }}>
                Aktuelle Förderungen.
              </h2>
            </Reveal>
            <p className="text-white/60 max-w-[52ch] text-pretty">
              Eine Auswahl aus {stats.total} Programmen von Bund, Ländern, Stiftungen und EU,
              die unsere Plattform aktiv unterstützt — mit Summen, Fristen und Zielgruppen.
            </p>
          </div>
          <Link
            href="/foerderprogramme"
            className="text-sm font-medium border-b border-white/80 pb-1 hover:text-gold-300 hover:border-gold-300 transition-colors self-start md:self-auto"
          >
            Alle {stats.total} Programme ansehen →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-white/15 rounded-2xl overflow-hidden ring-1 ring-white/15 mb-12">
          {statCards.map((s) => (
            <div key={s.l} className="bg-evergreen px-4 py-5 text-center">
              <div className="font-serif text-3xl md:text-4xl text-gold-300" style={{ fontWeight: 500 }}>
                <CountUp to={s.n} suffix={s.suffix} />
              </div>
              <div className="text-[11px] uppercase tracking-widest text-white/60 mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {programme.map((c, i) => {
            const Emblem = emblemForKategorie(c.kat);
            const Geber = markForTyp(c.typ);
            const badge =
              c.typ === "bund" ? "Bund" : c.typ === "land" ? "Land" : c.typ === "eu" ? "EU" : "Stiftung";
            return (
              <Reveal key={c.name} delay={i * 0.06}>
                <div className="group bg-white/[0.04] p-7 rounded-2xl ring-1 ring-white/5 hover:ring-white/15 hover:-translate-y-1 transition-all flex flex-col justify-between gap-6 h-full">
                  <div className="space-y-5">
                    <div className="flex justify-between items-start gap-3">
                      <Emblem className="size-14 text-gold-300" />
                      <span className="px-2 py-1 bg-white/5 text-white/70 text-[10px] font-semibold uppercase tracking-wider rounded whitespace-nowrap">
                        {badge}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {c.kat && (
                        <span className="text-[11px] uppercase tracking-widest text-white/40">{c.kat}</span>
                      )}
                      <h3 className="font-serif text-xl leading-snug text-paper" style={{ fontWeight: 500 }}>{c.name}</h3>
                      {c.kurz && (
                        <p className="text-sm text-white/55 leading-relaxed pt-1 line-clamp-3">{c.kurz}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {c.summe && (
                      <div className="flex justify-between text-sm border-t border-white/10 pt-4 gap-2">
                        <span className="text-white/45 shrink-0">Fördersumme</span>
                        <span className="font-medium text-right line-clamp-2">{c.summe}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm gap-2">
                      <span className="text-white/45 shrink-0">Geber</span>
                      <span className="font-medium flex items-center gap-2 text-right">
                        <Geber className="size-4 text-white/50 shrink-0" />
                        <span className="line-clamp-1">{c.geber}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="text-center text-xs text-white/40 mt-10">
          Quelle: foerderdatenbank.de, BMBF, Landesministerien, Stiftungsverzeichnisse · laufend aktualisiert
        </p>
      </div>
    </section>
  );
}

/* ======================================================================
   GRUENDER-SEKTION — Vertrauens-Baustein aus dem Landing-Handoff
   (02.07.2026), platziert zwischen Programm-Uebersicht und Preisen.
   Portraets sind noch nicht fotografiert → Platzhalter-Kachel mit
   Handschrift-Vornamen; sobald Fotos da sind: Dateien nach
   /public/landing/ legen und im FOUNDERS-Array `foto` setzen.
   ====================================================================== */
const FOUNDERS: {
  name: string;
  vorname: string;
  rolle: string;
  bio: string;
  foto?: string;
}[] = [
  {
    name: "Kolja Schumann",
    vorname: "Kolja",
    rolle: "Geschäftsführung & Produkt",
    bio: "Ich habe selbst jahrelang Förderanträge geschrieben — für Vereine, Projekte und unser eigenes Unternehmen. Dabei wurde mir klar: Nicht die Ideen fehlen, sondern die Zeit für den Papierkram. Genau da setzt EduFunds an.",
  },
  {
    name: "Fedo Hagge-Kubat",
    vorname: "Fedo",
    rolle: "Technik & KI",
    bio: "Ich baue die KI hinter EduFunds so, dass sie klingt wie eine erfahrene Antragsschreiberin — nicht wie ein Chatbot. Jedes Programm im Katalog ist geprüft, jede Formulierung nachvollziehbar. Und was Schulen uns anvertrauen, bleibt in Europa.",
  },
];

function GruenderSektion() {
  return (
    <section id="gruender" className="py-[88px] px-6 bg-paper">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center mb-14">
          <Reveal>
            <span className="inline-block text-xs uppercase tracking-[0.16em] font-bold text-[#A8842C] bg-[#F3EDDD] rounded-full px-4 py-[7px] mb-5">
              Wer dahinter steht
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="heading-strong font-serif text-3xl md:text-[44px] leading-[1.15] text-evergreen text-balance max-w-[760px] mx-auto mb-4">
              Wir sind zwei Gründer — und wir kennen den Antragsfrust aus eigener Erfahrung.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[17px] leading-[1.6] text-[#55625C] max-w-[620px] mx-auto text-pretty">
              EduFunds ist kein anonymes Portal. Hinter jeder Antwort, jedem geprüften
              Programm und jedem Antrag stehen wir persönlich.
            </p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-[920px] mx-auto">
          {FOUNDERS.map((f, i) => (
            <Reveal key={f.name} delay={i * 0.08}>
              <div className="bg-white border border-[#E4E0D4] rounded-2xl p-6 flex flex-col gap-[18px] h-full">
                {f.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.foto}
                    alt={`Porträt von ${f.name}`}
                    className="w-full h-[340px] object-cover rounded-xl"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="w-full h-[340px] rounded-xl bg-[#F3EDDD] grid place-content-center"
                  >
                    <span className="font-hand text-[64px] text-[#A8842C]">{f.vorname}</span>
                  </div>
                )}
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="heading-strong font-serif text-2xl text-evergreen">
                      {f.name}
                    </h3>
                    <span aria-hidden className="font-hand text-[26px] text-[#A8842C]">
                      {f.vorname}
                    </span>
                  </div>
                  <div className="text-xs uppercase tracking-[0.12em] font-bold text-[#A8842C] mt-1 mb-3">
                    Mitgründer · {f.rolle}
                  </div>
                  <p className="text-[15px] leading-[1.6] text-[#44514B] text-pretty">{f.bio}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <div className="max-w-[720px] mx-auto mt-12 border-t border-[#E4E0D4] pt-8 text-center">
            <p className="font-serif italic text-xl leading-normal text-evergreen text-balance mb-2">
              „Kein Schulprojekt sollte an einem Formular scheitern. Dafür stehen wir —
              mit Namen und Gesicht."
            </p>
            <div className="text-[13px] text-[#7A8580]">Kolja &amp; Fedo, Gründer von EduFunds</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Kontaktkarte am Entscheidungspunkt (Landing-Handoff B) ---------- */
function KontaktKarte() {
  return (
    <div className="mt-12 flex justify-center">
      <div className="flex flex-col sm:flex-row items-center gap-5 bg-white border border-[#E4E0D4] rounded-2xl px-7 py-6 max-w-[620px] w-full sm:w-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/kontakt-avatar.jpg"
          alt="Porträt von Kolja Schumann"
          width={336}
          height={336}
          className="size-[84px] shrink-0 rounded-full object-cover"
        />
        <div className="grid gap-1 text-center sm:text-left">
          <div className="font-serif text-[19px] text-evergreen" style={{ fontWeight: 600 }}>
            Fragen zu Preisen oder Ihrem Antrag?
          </div>
          <p className="text-[14.5px] leading-[1.55] text-[#55625C]">
            Schreiben Sie mir direkt — ich antworte persönlich, meist noch am selben Tag.
          </p>
          <div className="text-[13px] text-[#7A8580] mt-0.5">Kolja, Mitgründer</div>
        </div>
        <a
          href="mailto:office@edufunds.org"
          className="shrink-0 w-full sm:w-auto text-center bg-evergreen text-paper text-[14.5px] font-semibold rounded-full px-[22px] py-3 hover:bg-[#2C5243] transition-colors duration-150"
        >
          E-Mail schreiben
        </a>
      </div>
    </div>
  );
}

/* ======================================================================
   PREISE-TEASER — echte Preise (Single Source: lib/payments/packs.ts)
   ====================================================================== */
function PreiseTeaser() {
  const tiers = [
    {
      name: "Suche",
      price: "0 €",
      sub: "kostenlos & ohne Konto",
      cta: "Förderfinder öffnen",
      href: "/foerderprogramme",
      ghost: true,
      features: [
        { t: `Zugriff auf alle ${"189"} Programme`, on: true },
        { t: "Filter nach Bundesland & Schulform", on: true },
        { t: "KI-Antragsgenerierung", on: false },
        { t: "PDF-Export des Antragsentwurfs", on: false },
      ],
    },
    {
      name: "Einzelantrag",
      price: "29,90 €",
      sub: "einmalig · kein Abo",
      cta: "Antrag starten",
      href: "/foerderprogramme",
      features: [
        { t: "Ein vollständiger KI-Antrag inkl. Finanzplan", on: true },
        { t: "Export als RTF / PDF", on: true },
        { t: "Geräteübergreifender Zugriff per Magic-Link", on: true },
        { t: "Wiederverwendung für Folgejahr", on: false },
      ],
    },
    {
      name: "Kontingent 5",
      price: "139,90 €",
      sub: "27,98 € / Antrag · 12 Monate",
      cta: "Kontingente ansehen",
      href: "/preise",
      featured: true,
      badge: "Beliebt bei Schulen",
      features: [
        { t: "5 KI-Anträge, frei einsetzbar", on: true },
        { t: "Sammel-Code für das Kollegium", on: true },
        { t: "Credit erst beim Freischalten verbraucht", on: true },
        { t: "Kauf per Karte oder Rechnung", on: true },
      ],
    },
    {
      name: "Träger",
      price: "ab 249,90 €",
      sub: "10 & 20 Anträge",
      cta: "Pakete vergleichen",
      href: "/preise",
      features: [
        { t: "Mehrere Schulen unter einem Dach", on: true },
        { t: "Bester Stückpreis (ab 22,99 €)", on: true },
        { t: "Zentrale Kontingent-Verwaltung", on: true },
        { t: "Rechnung & Ansprechpartner", on: true },
      ],
    },
  ];
  return (
    <section id="preise" className="py-24 px-6 bg-[#f6f3ec] border-y border-ink/5">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-16">
          <span className="text-xs uppercase tracking-widest text-evergreen font-semibold">Preise</span>
          <Reveal>
            <h2 className="font-serif text-3xl md:text-5xl leading-tight mt-3 text-balance" style={{ fontWeight: 500 }}>
              Pro Antrag bezahlen. <span className="italic text-gold-700">Kein Abo.</span>
            </h2>
          </Reveal>
          <p className="text-ink/65 mt-5 text-pretty leading-relaxed">
            Schulen bezahlen ungern monatlich. Deshalb verkaufen wir Anträge einzeln
            oder als Prepaid-Kontingent — per Karte oder Rechnung, ohne Verlängerungsfalle.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.06}>
              <div
                className={[
                  "relative rounded-2xl p-7 flex flex-col gap-6 ring-1 transition-all h-full",
                  t.featured
                    ? "bg-evergreen text-paper ring-evergreen shadow-xl lg:-translate-y-2"
                    : "bg-paper text-ink ring-ink/10 hover:ring-ink/25",
                ].join(" ")}
              >
                {t.badge && (
                  <span className="absolute -top-3 left-6 bg-gold-500 text-ink text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full">
                    {t.badge}
                  </span>
                )}
                <div className="space-y-1">
                  <div className={["text-xs uppercase tracking-widest font-semibold", t.featured ? "text-white/60" : "text-ink/45"].join(" ")}>
                    {t.name}
                  </div>
                  <div className="font-serif text-4xl" style={{ fontWeight: 500 }}>{t.price}</div>
                  <div className={["text-sm", t.featured ? "text-white/65" : "text-ink/55"].join(" ")}>{t.sub}</div>
                </div>
                <ul className="space-y-2.5 text-sm flex-1">
                  {t.features.map((f) => (
                    <li
                      key={f.t}
                      className={[
                        "flex items-start gap-2 leading-snug",
                        f.on
                          ? t.featured ? "text-paper" : "text-ink/85"
                          : t.featured ? "text-white/35 line-through" : "text-ink/35 line-through",
                      ].join(" ")}
                    >
                      <span aria-hidden className="mt-0.5 shrink-0">
                        {f.on ? <Check className="size-4 text-emerald-500" /> : <Minus className="size-4" />}
                      </span>
                      <span>{f.t}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.href}
                  className={[
                    "text-center text-sm font-medium py-2.5 px-4 rounded-full transition-all active:scale-[0.98]",
                    t.featured
                      ? "bg-paper text-ink hover:bg-paper/90"
                      : t.ghost
                      ? "ring-1 ring-ink/15 hover:ring-ink/30"
                      : "bg-evergreen text-paper hover:bg-evergreen/90",
                  ].join(" ")}
                >
                  {t.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="text-xs text-ink/45 mt-8 text-center max-w-2xl mx-auto">
          Alle Preise inkl. MwSt. Kein Abo, keine versteckten Kosten. Kontingente sind
          12 Monate ab Kauf gültig und nicht an einzelne Personen gebunden.
        </p>

        {/* Kontaktkarte am Entscheidungspunkt (Landing-Handoff Baustein B) */}
        <Reveal delay={0.1}>
          <KontaktKarte />
        </Reveal>
      </div>
    </section>
  );
}

/* ======================================================================
   FAQ — eigenes Accordion (kein UI-Primitive im Projekt)
   ====================================================================== */
function FAQ() {
  const items = [
    {
      q: "Wo werden unsere Daten verarbeitet?",
      a: "Ihre Daten liegen bei Hetzner in Deutschland. Die KI-Verarbeitung läuft bei Mistral AI (Paris) auf Rechenzentren im Europäischen Wirtschaftsraum — keine Datenflüsse in die USA, kein Cloud Act.",
    },
    {
      q: "Werden unsere Anträge zum Training verwendet?",
      a: "Nein. Wir trainieren keine Modelle mit Ihren Eingaben. Personenbezogene Daten werden vor jeder KI-Anfrage automatisch maskiert und erst danach wieder eingesetzt.",
    },
    {
      q: "Wie sind die Konditionen?",
      a: "Kauf pro Antrag, kein Abo. Die Suche ist kostenlos, ein Einzelantrag kostet einmalig 29,90 €, Kontingente (5/10/20 Anträge) sind günstigere Prepaid-Pakete mit 12 Monaten Gültigkeit.",
    },
    {
      q: "Ersetzt die KI die Unterschrift?",
      a: "Nein. EduFunds liefert einen vollständig ausgearbeiteten Entwurf der fachlichen und administrativen Inhalte. Prüfung, Freigabe und Verantwortung bleiben bei Schulleitung bzw. Träger — KI kann Fehler machen, prüfen Sie den Entwurf vor der Einreichung.",
    },
    {
      q: "Wir sind ein Träger mit mehreren Schulen — geht das?",
      a: "Ja. Mit einem Kontingent kaufen Sie Anträge im Voraus und geben einen Sammel-Code an Ihre Lehrkräfte weiter, die damit ihre fertigen Anträge freischalten.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 px-6 bg-paper border-t border-ink/5">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl mb-12 text-center" style={{ fontWeight: 500 }}>
          Häufige Fragen.
        </h2>
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 text-left font-medium py-6 text-base hover:text-evergreen transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{it.q}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-ink/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-ink/65 leading-relaxed pb-6">{it.a}</p>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ======================================================================
   CLOSING CTA
   ====================================================================== */
function ClosingCta() {
  return (
    <section className="py-24 px-6 bg-paper">
      <div className="max-w-7xl mx-auto">
        <div className="bg-evergreen text-paper rounded-[2rem] p-12 md:p-24 relative overflow-hidden border-[3px] border-double border-gold-500/60">
          {/* Akten-Raster + Siegel-Ornament (dekorativ) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(253,253,252,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(253,253,252,0.05)_1px,transparent_1px)] [background-size:46px_46px]"
          />
          <div
            aria-hidden
            className="absolute top-8 right-8 hidden md:grid size-24 -rotate-12 place-content-center rounded-full border-2 border-gold-300/40 text-center text-[11px] font-semibold uppercase tracking-wider text-gold-300/80 leading-tight"
          >
            Geprüft
            <br />
            {PROGRAMM_COUNT_ROUNDED}+
          </div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-serif text-4xl md:text-6xl mb-8 leading-[1.05] text-paper" style={{ fontWeight: 500 }}>
              Bereit, Fördermittel für Ihre Schule zu heben?
            </h2>
            <p className="text-lg mb-12 text-paper/80 leading-relaxed">
              Öffnen Sie den Förderfinder, filtern Sie nach Ihrer Schulform und Ihrem
              Bundesland — und lassen Sie den KI-Assistenten den ersten Antrag entwerfen.
              Die Suche ist kostenlos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/foerderprogramme"
                className="bg-paper text-evergreen px-8 py-4 rounded-full font-semibold hover:bg-paper/90 transition-colors active:scale-[0.98] inline-flex items-center justify-center gap-2"
              >
                Förderfinder öffnen
                <ArrowRight className="size-5" />
              </Link>
              <Link
                href="/preise"
                className="ring-1 ring-paper/40 text-paper px-8 py-4 rounded-full font-semibold hover:bg-paper/10 transition-colors inline-flex items-center justify-center"
              >
                Preise ansehen
              </Link>
            </div>
          </div>
          <div className="absolute right-[-10%] bottom-[-10%] opacity-25 pointer-events-none">
            <div className="size-96 bg-paper rounded-full blur-3xl" />
          </div>
          <div className="absolute -top-12 -right-8 opacity-10 pointer-events-none font-serif italic text-[14rem] leading-none select-none text-paper animate-float">
            €
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- kleiner Reveal-Wrapper (whileInView) ---------- */
function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
