"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Check, Minus, ChevronDown } from "lucide-react";
import {
  HourglassIcon,
  StampIcon,
  MapIcon,
  emblemForKategorie,
  markForTyp,
} from "@/components/landing/emblems";

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
   Regel aus dem Design-Refresh (Welle 1–3). */

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
      <ProductShowcase />
      <TrustStrip />
      <Problem />
      <Prozess />
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
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-brandy font-semibold"
            >
              <span className="size-1.5 rounded-full bg-brandy" />
              Fördermittel für Schulen. Vereinfacht.
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: EASE }}
              className="font-serif text-5xl md:text-7xl leading-[1.05] text-balance"
              style={{ fontWeight: 500 }}
            >
              Jedes Jahr bleiben Millionen an{" "}
              <span className="italic text-brandy">Fördermitteln</span> ungenutzt.
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
                className="bg-brandy text-paper py-2.5 pr-5 pl-5 flex items-center gap-2 rounded-full font-medium transition-transform hover:-translate-y-0.5 ring-1 ring-brandy"
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
              className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-brandy transition-colors group"
            >
              <span className="underline underline-offset-4 decoration-ink/20 group-hover:decoration-brandy">
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
                  <span className="block text-2xl font-serif italic text-brandy">{s.v}</span>
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
            <HeroInfographic />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---------- HeroInfographic — editoriales Dashboard-Mock ---------- */
function HeroInfographic() {
  return (
    <div className="relative aspect-[4/5] w-full max-w-md mx-auto lg:mx-0">
      {/* Backdrop card — gefundene Programme */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -4 }}
        transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
        className="absolute top-6 -left-2 md:-left-6 w-[58%] bg-paper rounded-2xl ring-1 ring-ink/10 shadow-xl p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold">
            Treffer
          </span>
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="font-serif text-4xl text-ink leading-none">
          12<span className="text-ink/30 text-2xl"> / 189</span>
        </div>
        <p className="text-xs text-ink/55 leading-relaxed">
          passende Programme für Ihr Schulprofil — sortiert nach Fristen.
        </p>
        <div className="space-y-1.5 pt-1">
          {[
            { n: "DigitalPakt 2.0", d: "31.03." },
            { n: "Startchancen", d: "15.04." },
            { n: "Kultur macht stark", d: "30.06." },
          ].map((p) => (
            <div key={p.n} className="flex items-center justify-between text-[11px] border-t border-ink/5 pt-1.5">
              <span className="font-medium text-ink truncate">{p.n}</span>
              <span className="text-ink/40 tabular-nums">{p.d}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main card — Antrag-Generator */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: 0 }}
        animate={{ opacity: 1, y: 0, rotate: 2 }}
        transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
        className="absolute top-0 right-0 w-[78%] bg-[#1c1917] text-paper rounded-2xl shadow-2xl ring-1 ring-black/20 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-400/60" />
            <span className="size-2 rounded-full bg-amber-300/60" />
            <span className="size-2 rounded-full bg-emerald-400/60" />
          </div>
          <span className="text-[10px] tracking-widest uppercase text-white/40">
            app.edufunds.org
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
              Antrag wird erstellt
            </span>
            <h4 className="font-serif text-lg leading-snug mt-1 text-paper">
              DigitalPakt 2.0 · Beispielschule
            </h4>
          </div>

          <div className="space-y-2">
            {[
              { l: "Schulprofil ausgewertet", done: true },
              { l: "Bedarf strukturiert", done: true },
              { l: "Richtlinie abgeglichen", done: true },
              { l: "Antragstext formuliert", done: false },
            ].map((s, i) => (
              <div key={s.l} className="flex items-center gap-3 text-xs">
                <span
                  className={`size-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    s.done ? "bg-emerald-400 text-[#1c1917]" : "bg-white/10 text-white/40"
                  }`}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                <span className={s.done ? "text-white/85" : "text-white/45"}>{s.l}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
              <span>Fortschritt</span>
              <span className="text-amber-400 font-semibold">76 %</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "76%" }}
                transition={{ duration: 1.6, delay: 1, ease: EASE }}
                className="h-full bg-amber-500 rounded-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-white/10 rounded-lg overflow-hidden mt-3">
            {[
              { k: "Fördersumme", v: "428.500 €" },
              { k: "Eigenanteil", v: "10 %" },
              { k: "Laufzeit", v: "36 Monate" },
              { k: "Frist", v: "31.03.2026" },
            ].map((f) => (
              <div key={f.k} className="bg-[#1c1917] p-2.5">
                <div className="text-[9px] uppercase tracking-widest text-white/40">{f.k}</div>
                <div className="text-sm font-serif text-paper mt-0.5">{f.v}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Floating callout — Zeitersparnis */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: -6 }}
        transition={{ duration: 0.7, delay: 1.2, ease: EASE }}
        className="absolute -bottom-2 left-4 md:left-0 bg-brandy text-paper rounded-2xl shadow-xl px-5 py-3.5 max-w-[62%]"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-3xl leading-none">Wochen</span>
          <span className="text-paper/70 text-xs">→ Minuten</span>
        </div>
        <p className="text-[11px] text-paper/85 mt-1.5 leading-tight">
          Vom Bedarf zum fertigen Antrag — in einer Sitzung.
        </p>
      </motion.div>
    </div>
  );
}

/* ======================================================================
   PRODUCT SHOWCASE — dunkel, animiertes Produkt-Mock (statt Video)
   ====================================================================== */
function ProductShowcase() {
  const facts = [
    { n: "180+", l: "Geprüfte Programme" },
    { n: "Minuten", l: "statt Wochen" },
    { n: "EU-KI", l: "Mistral · Frankreich" },
    { n: "DSGVO", l: "DE-Hosting" },
  ];
  return (
    <section className="py-24 px-6 bg-[#1c1917] text-paper">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-12 space-y-4">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
            Live-Einblick
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-tight text-balance text-paper" style={{ fontWeight: 500 }}>
            So sieht <span className="italic text-amber-400">EduFunds</span> in Aktion aus.
          </h2>
          <p className="text-paper/70 max-w-[52ch] text-pretty leading-relaxed">
            Vom Schul-Steckbrief zum unterschriftsreifen Antrag — in einer Sitzung.
            Keine Vorlagen, keine 50-seitigen Richtlinien.
          </p>
        </div>

        {/* Produkt-Demo-Video */}
        <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl bg-black">
          <video
            src="/edufunds-demo.mp4"
            poster="/edufunds-demo-poster.jpg"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-label="EduFunds Demo: vom Schulprofil zum fertigen Förderantrag"
            className="block w-full h-auto aspect-video object-cover"
          />

          {/* Fakten-Leiste */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border-t border-white/10">
            {facts.map((f) => (
              <div key={f.l} className="bg-[#161311] px-4 py-5 md:py-6 text-center">
                <div className="font-serif text-2xl md:text-3xl text-amber-300 leading-none" style={{ fontWeight: 500 }}>
                  {f.n}
                </div>
                <div className="text-[10px] md:text-[11px] uppercase tracking-widest text-white/55 mt-2">
                  {f.l}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/40 mt-4">
          Kurzer Einblick in EduFunds — vom Schulprofil zum fertigen Förderantrag.
        </p>
      </div>
    </section>
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
   PROZESS
   ====================================================================== */
function Prozess() {
  const steps = [
    { n: "01", t: "Interview", b: "Unsere KI führt Sie durch ein kurzes Gespräch über Ihr Vorhaben." },
    { n: "02", t: "Gliederung", b: "Das System erstellt automatisch eine logische Argumentationskette." },
    { n: "03", t: "Abschnitte", b: "Präzise Texte werden generiert, abgestimmt auf die Richtlinien." },
    { n: "04", t: "Finalfassung", b: "Sie erhalten ein unterschriftsreifes Dokument inkl. aller Anhänge." },
  ];
  return (
    <section id="prozess" className="py-24 px-6 bg-paper">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <span className="text-xs uppercase tracking-widest text-brandy font-semibold block mb-4">
            Die Lösung
          </span>
          <Reveal>
            <h2 className="font-serif text-3xl md:text-5xl max-w-[30ch] text-balance leading-tight" style={{ fontWeight: 500 }}>
              Vom Bedarf zum fertigen Antrag in vier Schritten.
            </h2>
          </Reveal>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="space-y-6">
                <div className="text-6xl font-serif italic text-brandy/25 leading-none">{s.n}</div>
                <div>
                  <h4 className="font-semibold mb-2 font-sans">{s.t}</h4>
                  <p className="text-sm text-ink/60 leading-relaxed">{s.b}</p>
                </div>
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
                KI darf in der Schule nichts <span className="italic text-brandy">verraten</span>.
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
    <section id="programme" className="py-24 px-6 bg-[#1c1917] text-paper">
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
            className="text-sm font-medium border-b border-white/80 pb-1 hover:text-amber-400 hover:border-amber-400 transition-colors self-start md:self-auto"
          >
            Alle {stats.total} Programme ansehen →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-white/10 rounded-2xl overflow-hidden ring-1 ring-white/10 mb-12">
          {statCards.map((s) => (
            <div key={s.l} className="bg-[#1c1917] px-4 py-5 text-center">
              <div className="font-serif text-3xl md:text-4xl text-amber-300" style={{ fontWeight: 500 }}>{s.n}</div>
              <div className="text-[11px] uppercase tracking-widest text-white/50 mt-1">{s.l}</div>
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
                      <Emblem className="size-14 text-amber-300" />
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
