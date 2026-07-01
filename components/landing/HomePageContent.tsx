"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Minus, ChevronDown, Sparkles } from "lucide-react";
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
   - DUNKLE Flaechen → amber (#d97706 / amber-200/300/400)
   Regel aus dem Design-Refresh (Welle 1–3).

   Richtung F „Akademisch/Institut" (Welle 1, 2026-07-01): Hero + Programme-Band
   auf evergreen (#1e3d32) als Struktur-Farbe umgestellt, Gold (gold-Skala) als
   Auszeichnung. brandy bleibt in den uebrigen Sektionen bis zur naechsten Welle. */

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
      <TrustStrip />
      <Problem />
      <LiveShowcase stats={stats} />
      <Datenschutz />
      <ProgrammeShowcase stats={stats} programme={programme} />
      <PreiseTeaser />
      <FAQ />
      <ClosingCta />
    </>
  );
}

/* ======================================================================
   HERO — asymmetrisch: Text links, animiertes Dashboard-Mock rechts
   ====================================================================== */
function Hero({ stats }: { stats: LandingStats }) {
  const heroStats = [
    { v: stats.total, l: "Programme" },
    { v: String(stats.bundeslaender), l: "Bundesländer" },
    { v: "EU", l: "KI-Modell" },
    { v: "DE", l: "Server" },
  ];
  return (
    <section id="top" className="pt-20 pb-16 px-6 bg-paper">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center">
          <div className="space-y-7">
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex items-center gap-3.5"
            >
              <span
                aria-hidden
                className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-gold-500 bg-white font-serif text-lg text-evergreen shadow-[0_0_0_4px_rgba(201,162,39,0.15)]"
              >
                Ef
              </span>
              <span className="text-xs uppercase tracking-widest text-evergreen font-semibold leading-snug">
                Fördermittel für Schulen. Vereinfacht.
                <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-wider text-ink/45">
                  Geprüft · Strukturiert · Unterschriftsreif
                </span>
              </span>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: EASE }}
              className="font-serif text-5xl md:text-7xl leading-[1.05] text-balance text-evergreen"
              style={{ fontWeight: 500 }}
            >
              Jedes Jahr bleiben Millionen an{" "}
              <span className="italic text-gold-700">Fördermitteln</span> ungenutzt.
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
              className="text-lg md:text-xl text-ink/70 max-w-[52ch] text-pretty leading-relaxed"
            >
              {stats.total} geprüfte Programme an einem Ort. Unser KI-Assistent
              erstellt unterschriftsreife Anträge in Minuten statt Wochen —
              DSGVO-konform, auf deutschen Servern, mit EU-KI.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="flex flex-wrap gap-4"
            >
              <Link
                href="/foerderprogramme"
                className="bg-evergreen text-paper py-2.5 pr-5 pl-5 flex items-center gap-2 rounded-full font-medium transition-transform hover:-translate-y-0.5 ring-1 ring-evergreen shadow-[0_14px_30px_-14px_rgba(30,61,50,0.5)]"
              >
                Förderfinder öffnen
                <ArrowRight className="size-4 shrink-0" />
              </Link>
              <Link
                href="/foerderprogramme"
                className="bg-paper text-ink py-2.5 px-5 flex items-center gap-2 rounded-full font-medium ring-1 ring-ink/15 hover:ring-ink/30 transition-all"
              >
                KI-Assistent testen
              </Link>
            </motion.div>

            <motion.a
              href="#preise"
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.28, ease: EASE }}
              className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-evergreen transition-colors group"
            >
              <span className="underline underline-offset-4 decoration-ink/20 group-hover:decoration-evergreen">
                Für Schulen &amp; Träger: Preise ansehen
              </span>
              <span aria-hidden>→</span>
            </motion.a>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
              className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ink/5 border border-ink/5 rounded-2xl overflow-hidden mt-10"
            >
              {heroStats.map((s) => (
                <div key={s.l} className="bg-paper p-5 space-y-1">
                  <span className="block text-2xl font-serif italic text-evergreen">{s.v}</span>
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">
                    {s.l}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            className="relative"
          >
            <HeroCertPanel total={stats.total} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---------- HeroCertPanel — Urkunden-Panel (Richtung F: Akademisch/Institut).
   Ersetzt das Dashboard-Mock: Antragsentwurf als „Urkunde" mit Doppelrahmen,
   Datenzeilen und gedrehtem Pruefsiegel. Werte sind illustrativ (Disclaimer). */
function HeroCertPanel({ total }: { total: string }) {
  const rows = [
    { k: "Beantragte Summe", v: "278.500 €", accent: "gold" },
    { k: "Abschnitte", v: "4 von 5 fertig" },
    { k: "Eignung (KI-geprüft)", v: "hoch", accent: "ok" },
    { k: "Status", v: "unterschriftsreif in Minuten" },
  ] as const;
  return (
    <div className="w-full max-w-md mx-auto lg:mx-0 p-2">
      <div className="rounded-md border border-[#d8d2c2] bg-white p-7 md:p-8 shadow-[0_30px_70px_-40px_rgba(30,61,50,0.45)] outline-double outline-[3px] outline-[#d8d2c2] outline-offset-[6px]">
        <div className="border-b border-[#e7e2d4] pb-5 mb-3 text-center">
          <span className="text-[10px] uppercase tracking-[0.22em] text-ink/45 font-medium">
            Antragsentwurf
          </span>
          <h4 className="font-serif text-2xl text-evergreen mt-1.5" style={{ fontWeight: 600 }}>
            DigitalPakt Schule 2.0
          </h4>
        </div>
        <dl>
          {rows.map((r, i) => (
            <div
              key={r.k}
              className={`flex items-baseline justify-between gap-4 py-2.5 text-sm ${
                i < rows.length - 1 ? "border-b border-[#f0ece0]" : ""
              }`}
            >
              <dt className="text-ink/55">{r.k}</dt>
              <dd
                className={`font-semibold text-right ${
                  "accent" in r && r.accent === "gold"
                    ? "text-gold-700"
                    : "accent" in r && r.accent === "ok"
                    ? "text-emerald-700"
                    : "text-ink"
                }`}
              >
                {r.v}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center justify-between gap-4 mt-5">
          <span className="font-serif italic text-evergreen text-[15px] leading-snug">
            EduFunds — Ihr Antrag, fertig formuliert.
          </span>
          <span
            aria-hidden
            className="grid size-14 shrink-0 -rotate-12 place-content-center rounded-full border-2 border-gold-500/60 text-center text-[9px] font-semibold uppercase tracking-wider text-gold-700 leading-tight"
          >
            Geprüft
            <br />
            {total}
          </span>
        </div>
        <p className="text-[10px] text-ink/40 mt-4">
          Illustratives Beispiel — keine realen Antragsdaten.
        </p>
      </div>
    </div>
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
    { label: "Bund", n: stats.bund, color: "#78350f" },
    { label: "Länder", n: stats.land, color: "#d97706" },
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
          <span className="text-xs uppercase tracking-widest text-brandy font-semibold">
            So funktioniert&apos;s
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-tight mt-3 text-balance" style={{ fontWeight: 500 }}>
            Vom Bedarf zum <span className="italic text-brandy">fertigen Antrag</span>.
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
              className="h-full bg-gradient-to-r from-brandy to-amber-500"
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
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full border-2 border-brandy bg-paper font-serif italic text-2xl text-brandy shadow-[0_10px_26px_-12px_rgba(120,53,15,0.5)]">
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
              className="absolute -bottom-4 -right-3 bg-brandy text-paper rounded-2xl px-5 py-3 shadow-xl"
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
            <div className="text-[11px] uppercase tracking-widest text-brandy font-semibold mb-5">In Zahlen</div>
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
            <div className="text-[11px] uppercase tracking-widest text-brandy font-semibold mb-4">Förderquellen</div>
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
            <div className="text-[11px] uppercase tracking-widest text-brandy font-semibold mb-4">Typische Fördersummen</div>
            <div className="flex items-end gap-3 h-[120px]">
              {bars.map((b, i) => (
                <motion.div
                  key={b.l}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: EASE }}
                  style={{ height: `${b.h}%`, transformOrigin: "bottom" }}
                  className="flex-1 rounded-t-lg bg-gradient-to-t from-brandy to-amber-500"
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
        <span className="text-[11px] tracking-widest uppercase text-white/40">app.edufunds.org</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
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
            <span className="inline-block h-3.5 w-[2px] bg-amber-400 align-middle animate-pulse" />
          </div>

          {/* Fortschritts-Ring */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
            <div className="relative size-16 shrink-0">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                <motion.circle
                  cx="32" cy="32" r={R} fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round"
                  transform="rotate(-90 32 32)" strokeDasharray={C}
                  initial={{ strokeDashoffset: C }}
                  whileInView={{ strokeDashoffset: C * (1 - 0.76) }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 1.4, delay: 0.3, ease: EASE }}
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-sm font-bold text-amber-400">76%</span>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-white/45">Fortschritt</div>
              <div className="text-[13px] text-white/80 mt-1">Antragstext wird formuliert …</div>
            </div>
          </div>
        </div>

        {/* Pipeline + Fakten */}
        <div className="p-6 bg-black/20">
          <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">Pipeline</span>
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
   TRUST STRIP — Förderquellen
   ====================================================================== */
function TrustStrip() {
  const labels = ["BMBF", "Landesministerien", "ESF+", "Stiftungen", "Kommunen", "EU"];
  return (
    <section className="border-y border-ink/5 bg-paper">
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-widest text-ink/40 font-medium">
        <span className="text-ink/60">Programme aus Mitteln von</span>
        {labels.map((l) => (
          <span key={l}>{l}</span>
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
                <div className="size-12 bg-paper rounded-full flex items-center justify-center ring-1 ring-brandy/15 text-brandy">
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
      title: "Deutsche Server, Hetzner",
      body: "Verarbeitung und Speicherung erfolgen in deutschen Rechenzentren — georedundant, DSGVO-konform.",
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
            <span className="text-xs uppercase tracking-widest text-brandy font-semibold">
              Datenschutz · ohne Kompromiss
            </span>
            <Reveal>
              <h2 className="font-serif text-3xl md:text-5xl leading-tight text-balance" style={{ fontWeight: 500 }}>
                Was die Schule anvertraut, bleibt <span className="italic text-brandy">vertraulich</span>.
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
                  <span className="text-[10px] uppercase tracking-widest text-brandy font-semibold">
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
    { n: stats.total, l: "Programme" },
    { n: String(stats.bund), l: "Bundesmittel" },
    { n: String(stats.land), l: "Landesmittel" },
    { n: String(stats.stiftung), l: "Stiftungen" },
    { n: String(stats.eu), l: "EU-Programme" },
  ];
  return (
    <section
      id="programme"
      className="py-24 px-6 bg-evergreen text-paper border-y-[3px] border-double border-gold-500/70"
    >
      <div className="max-w-7xl mx-auto">
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
              <div className="font-serif text-3xl md:text-4xl text-gold-300" style={{ fontWeight: 500 }}>{s.n}</div>
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
        { t: "PDF-Export, unterschriftsreif", on: false },
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
        { t: "Export als RTF / PDF, unterschriftsreif", on: true },
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
          <span className="text-xs uppercase tracking-widest text-brandy font-semibold">Preise</span>
          <Reveal>
            <h2 className="font-serif text-3xl md:text-5xl leading-tight mt-3 text-balance" style={{ fontWeight: 500 }}>
              Pro Antrag bezahlen. <span className="italic text-brandy">Kein Abo.</span>
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
                    ? "bg-[#1c1917] text-paper ring-[#1c1917] shadow-xl lg:-translate-y-2"
                    : "bg-paper text-ink ring-ink/10 hover:ring-ink/25",
                ].join(" ")}
              >
                {t.badge && (
                  <span className="absolute -top-3 left-6 bg-brandy text-paper text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full">
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
                      : "bg-brandy text-paper hover:bg-brandy/90",
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
      a: "Ausschließlich in deutschen Rechenzentren (Hetzner). Die KI-Modelle stammen von Mistral aus Frankreich — keine Datenflüsse in die USA, kein Cloud Act.",
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
      a: "Nein. EduFunds liefert die fachlichen und administrativen Inhalte unterschriftsreif. Prüfung und Verantwortung bleiben bei Schulleitung bzw. Träger.",
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
                  className="w-full flex items-center justify-between gap-4 text-left font-medium py-6 text-base hover:text-brandy transition-colors"
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
        <div className="bg-brandy text-paper rounded-[2rem] p-12 md:p-24 relative overflow-hidden">
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
                className="bg-paper text-brandy px-8 py-4 rounded-full font-semibold hover:bg-paper/90 transition-colors active:scale-[0.98] inline-flex items-center justify-center gap-2"
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
          <div className="absolute -top-12 -right-8 opacity-10 pointer-events-none font-serif italic text-[14rem] leading-none select-none text-paper">
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
