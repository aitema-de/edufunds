"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Euro,
  Calendar,
  MapPin,
  School,
  ExternalLink,
  Mail,
  Sparkles,
  Share2,
  FileText,
  Clock,
  Tag,
  Info,
  CheckCircle2,
  Brain,
  ArrowRight,
  Wand2,
} from "lucide-react";
import type { Foerderprogramm } from '@/lib/foerderSchema';
import foerderprogrammeData from '@/data/foerderprogramme.json';
import { KIAntragAssistent } from "@/components/KIAntragAssistent";
import { EinreichungInfo } from "@/components/Wizard/EinreichungInfo";
import type { EinreichungInfo as EinreichungInfoData } from "@/lib/wizard/einreichung";
import { formatKategorie } from "@/lib/kategorie-labels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

// Editorial-Card-Grundstil (Paper + feiner Ink-Rahmen, wie auf der Landingpage)
const CARD = "rounded-2xl border border-ink/10 bg-paper";

// Bundesländer Mapping
const BUNDESLAENDER_MAP: Record<string, string> = {
  "DE-BW": "Baden-Württemberg",
  "DE-BY": "Bayern",
  "DE-BE": "Berlin",
  "DE-BB": "Brandenburg",
  "DE-HB": "Bremen",
  "DE-HH": "Hamburg",
  "DE-HE": "Hessen",
  "DE-MV": "Mecklenburg-Vorpommern",
  "DE-NI": "Niedersachsen",
  "DE-NW": "Nordrhein-Westfalen",
  "DE-RP": "Rheinland-Pfalz",
  "DE-SL": "Saarland",
  "DE-SN": "Sachsen",
  "DE-ST": "Sachsen-Anhalt",
  "DE-SH": "Schleswig-Holstein",
  "DE-TH": "Thüringen",
};

// Schulformen Mapping
const SCHULFORMEN_MAP: Record<string, string> = {
  "grundschule": "Grundschule",
  "hauptschule": "Hauptschule",
  "realschule": "Realschule",
  "gymnasium": "Gymnasium",
  "gesamtschule": "Gesamtschule",
  "iss": "Integrierte Sekundarschule (ISS)",
  "iss-mit-go": "Integrierte Sekundarschule mit Oberstufe (ISS+GO)",
  "foerderschule": "Förderschule",
  "berufsschule": "Berufsschule",
};

// Fördergeber-Typ-Badge — helle, editoriale Tönung (statt der alten Dark-Akzente)
const FOERDERGEBER_STYLES = {
  bund: { bg: "bg-sky-50", text: "text-sky-800", ring: "ring-sky-200/70", label: "Bund" },
  land: { bg: "bg-violet-50", text: "text-violet-800", ring: "ring-violet-200/70", label: "Land" },
  stiftung: { bg: "bg-emerald-50", text: "text-emerald-800", ring: "ring-emerald-200/70", label: "Stiftung" },
  eu: { bg: "bg-blue-50", text: "text-blue-800", ring: "ring-blue-200/70", label: "EU" },
};

// Countdown Hook
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; urgent: boolean } | null>(null);

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const end = new Date(targetDate);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, urgent: false });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const urgent = days < 14;

      setTimeLeft({ days, hours, urgent });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 3600000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

// Share Function
function shareProgram(programm: Foerderprogramm) {
  if (navigator.share) {
    navigator.share({
      title: programm.name,
      text: programm.kurzbeschreibung,
      url: window.location.href,
    });
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert("Link kopiert!");
  }
}

// Get Similar Programs
function getSimilarPrograms(currentId: string, kategorien: string[], limit: number = 3) {
  return foerderprogramme
    .filter(p => p.id !== currentId && p.kategorien.some(k => kategorien.includes(k)))
    .sort((a, b) => {
      const aMatches = a.kategorien.filter(k => kategorien.includes(k)).length;
      const bMatches = b.kategorien.filter(k => kategorien.includes(k)).length;
      if (bMatches !== aMatches) return bMatches - aMatches;
      // Deterministischer Tie-Breaker: alphabetisch nach ID, damit Server- und Client-Render
      // identische Reihenfolge liefern (kein Hydration-Mismatch).
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .slice(0, limit);
}

interface FoerderprogrammDetailClientProps {
  programm: Foerderprogramm;
  einreichung?: EinreichungInfoData | null;
}

export default function FoerderprogrammDetailClient({ programm, einreichung }: FoerderprogrammDetailClientProps) {
  const [showKIAssistent, setShowKIAssistent] = useState(false);

  const countdown = useCountdown(programm.bewerbungsfristEnde ?? null);
  const similarPrograms = getSimilarPrograms(programm.id, programm.kategorien);

  const foerdergeberStyle = FOERDERGEBER_STYLES[programm.foerdergeberTyp as keyof typeof FOERDERGEBER_STYLES] || FOERDERGEBER_STYLES.bund;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-paper pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/foerderprogramme"
              className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-brandy transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Zurück zur Übersicht</span>
            </Link>
          </div>

          {/* Hero Section — helles, editoriales Panel */}
          <header className="relative overflow-hidden rounded-3xl ring-1 ring-ink/10 bg-[#f6f3ec] mb-12">
            {/* Dezente Deko, an der Landingpage angelehnt */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.5]"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(28,25,23,0.06) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
            <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brandy/[0.06] blur-3xl" />

            <div className="relative p-8 md:p-12">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${foerdergeberStyle.bg} ${foerdergeberStyle.text} ${foerdergeberStyle.ring}`}>
                  {foerdergeberStyle.label}
                </span>
                {programm.kiAntragGeeignet && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-brandy/10 text-brandy ring-1 ring-brandy/20 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    KI-geeignet
                  </span>
                )}
                {programm.status === "aktiv" && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aktiv
                  </span>
                )}
              </div>

              <h1
                className="font-serif text-3xl md:text-5xl text-ink mb-4 leading-tight text-balance"
                style={{ fontWeight: 500 }}
              >
                {programm.name}
              </h1>

              <div className="flex items-center gap-3 text-ink/70 mb-6">
                <Building2 className="h-5 w-5 text-brandy" />
                <span className="text-lg">{programm.foerdergeber}</span>
              </div>

              <p className="text-ink/70 text-lg max-w-3xl leading-relaxed mb-8">
                {programm.kurzbeschreibung}
              </p>

              <div className="flex flex-wrap gap-4">
                {programm.kiAntragGeeignet && (
                  <Button
                    size="lg"
                    onClick={() => {
                      const hasSubscription = localStorage.getItem('edufunds_subscription') === 'active';
                      const hasEinzelantrag = localStorage.getItem('edufunds_einzelantrag') === 'valid';

                      if (!hasSubscription && !hasEinzelantrag) {
                        window.location.href = '/preise?reason=ki_feature';
                        return;
                      }
                      setShowKIAssistent(true);
                    }}
                  >
                    <Wand2 className="h-5 w-5" />
                    KI-Antrag generieren
                    <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">Pro</span>
                  </Button>
                )}
                {programm.antragsLink && (
                  <Button asChild size="lg">
                    <a
                      href={programm.antragsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="h-5 w-5" />
                      Antrag starten
                    </a>
                  </Button>
                )}
                {programm.infoLink && (
                  <Button asChild size="lg" variant="outline">
                    <a
                      href={programm.infoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-5 w-5" />
                      Offizielle Seite
                    </a>
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => shareProgram(programm)}
                >
                  <Share2 className="h-5 w-5" />
                  Teilen
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className={`${CARD} p-6 md:p-8`}>
                <h2 className="font-serif text-2xl text-ink mb-4 flex items-center gap-3" style={{ fontWeight: 500 }}>
                  <Info className="h-6 w-6 text-brandy" />
                  Beschreibung
                </h2>
                <p className="text-ink/70 leading-relaxed text-lg">
                  {programm.beschreibung || programm.kurzbeschreibung}
                </p>
              </section>

              <section className={`${CARD} p-6 md:p-8`}>
                <h2 className="font-serif text-2xl text-ink mb-6 flex items-center gap-3" style={{ fontWeight: 500 }}>
                  <Euro className="h-6 w-6 text-brandy" />
                  Förderbetrag
                </h2>
                <div className="rounded-xl border border-brandy/20 bg-brandy/[0.06] p-6">
                  <div className="font-serif text-3xl md:text-4xl text-brandy mb-2" style={{ fontWeight: 600 }}>
                    {programm.foerdersummeText}
                  </div>
                  {programm.foerdersummeMin && programm.foerdersummeMax && (
                    <div className="text-ink/60">
                      Bereich: {programm.foerdersummeMin.toLocaleString("de-DE")} € – {programm.foerdersummeMax.toLocaleString("de-DE")} €
                    </div>
                  )}
                </div>
              </section>

              <section className={`${CARD} p-6 md:p-8`}>
                <h2 className="font-serif text-2xl text-ink mb-4 flex items-center gap-3" style={{ fontWeight: 500 }}>
                  <Tag className="h-6 w-6 text-brandy" />
                  Kategorien
                </h2>
                <div className="flex flex-wrap gap-2.5">
                  {programm.kategorien.map((kategorie) => (
                    <span
                      key={kategorie}
                      className="px-4 py-2 rounded-full bg-paper text-ink/70 text-sm font-medium ring-1 ring-ink/10 hover:ring-brandy/30 transition-colors"
                    >
                      {formatKategorie(kategorie)}
                    </span>
                  ))}
                </div>
              </section>

              <section className={`${CARD} p-6 md:p-8`}>
                <h2 className="font-serif text-2xl text-ink mb-4 flex items-center gap-3" style={{ fontWeight: 500 }}>
                  <School className="h-6 w-6 text-brandy" />
                  Geeignete Schulformen
                </h2>
                <div className="flex flex-wrap gap-2.5">
                  {programm.schulformen.map((schulform) => (
                    <span
                      key={schulform}
                      className="px-4 py-2 rounded-full bg-paper text-ink/80 text-sm font-medium ring-1 ring-ink/10 inline-flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-brandy" />
                      {SCHULFORMEN_MAP[schulform] || schulform}
                    </span>
                  ))}
                </div>
              </section>

              <section className={`${CARD} p-6 md:p-8`}>
                <h2 className="font-serif text-2xl text-ink mb-4 flex items-center gap-3" style={{ fontWeight: 500 }}>
                  <MapPin className="h-6 w-6 text-brandy" />
                  Verfügbar in
                </h2>
                {programm.bundeslaender.includes("alle") ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-brandy/[0.06] ring-1 ring-brandy/20">
                    <CheckCircle2 className="h-5 w-5 text-brandy" />
                    <span className="text-brandy font-semibold">Alle Bundesländer</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {programm.bundeslaender.map((code) => (
                      <div
                        key={code}
                        className="px-3 py-2 rounded-lg bg-paper text-ink/70 text-sm text-center ring-1 ring-ink/10"
                      >
                        {BUNDESLAENDER_MAP[code] || code}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-8">
              <section className={`${CARD} p-6`}>
                <h2 className="font-serif text-xl text-ink mb-4 flex items-center gap-3" style={{ fontWeight: 500 }}>
                  <Calendar className="h-5 w-5 text-brandy" />
                  Bewerbungsfrist
                </h2>

                <div className="space-y-4">
                  {countdown && countdown.days > 0 && (
                    <div className={`p-4 rounded-xl ring-1 ${countdown.urgent ? 'bg-red-50 ring-red-200' : 'bg-brandy/[0.06] ring-brandy/20'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className={`h-5 w-5 ${countdown.urgent ? 'text-red-600' : 'text-brandy'}`} />
                        <span className={`text-sm font-medium ${countdown.urgent ? 'text-red-600' : 'text-brandy'}`}>
                          {countdown.urgent ? 'Bald ablaufend!' : 'Noch Zeit'}
                        </span>
                      </div>
                      <div className={`font-serif text-3xl ${countdown.urgent ? 'text-red-600' : 'text-brandy'}`} style={{ fontWeight: 600 }}>
                        {countdown.days} <span className="text-lg font-normal">Tage</span>
                      </div>
                      {countdown.hours > 0 && (
                        <div className="text-ink/60 text-sm">
                          und {countdown.hours} Stunden
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    {programm.bewerbungsfristText && (
                      <div className="text-ink font-medium">
                        {programm.bewerbungsfristText}
                      </div>
                    )}
                    {programm.bewerbungsfristStart && (
                      <div className="text-sm text-ink/60">
                        Start: {formatDate(programm.bewerbungsfristStart)}
                      </div>
                    )}
                    {programm.bewerbungsfristEnde && (
                      <div className="text-sm text-ink/60">
                        Ende: {formatDate(programm.bewerbungsfristEnde)}
                      </div>
                    )}
                    {!programm.bewerbungsfristStart && !programm.bewerbungsfristEnde && (
                      <div className="text-sm text-ink/60">
                        Laufende Bewerbungsphase
                      </div>
                    )}
                  </div>

                  {programm.bewerbungsart && (
                    <div className="pt-4 border-t border-ink/10">
                      <span className="text-sm text-ink/50">Bewerbungsart:</span>
                      <div className="text-ink/80 capitalize mt-1">
                        {programm.bewerbungsart === "online" ? "Online-Antrag" :
                         programm.bewerbungsart === "schriftlich" ? "Schriftlicher Antrag" :
                         programm.bewerbungsart}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className={`${CARD} p-6`}>
                <h2 className="font-serif text-xl text-ink mb-4 flex items-center gap-3" style={{ fontWeight: 500 }}>
                  <Mail className="h-5 w-5 text-brandy" />
                  Kontakt
                </h2>
                {programm.kontaktEmail ? (
                  <a
                    href={`mailto:${programm.kontaktEmail}`}
                    className="flex items-center gap-3 p-4 rounded-xl bg-[#f6f3ec] ring-1 ring-ink/10 hover:ring-brandy/30 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-brandy/10 flex items-center justify-center group-hover:bg-brandy/20 transition-colors">
                      <Mail className="h-5 w-5 text-brandy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink/50">E-Mail</div>
                      <div className="text-ink/80 text-sm truncate">{programm.kontaktEmail}</div>
                    </div>
                  </a>
                ) : (
                  <p className="text-ink/50 text-sm">
                    Keine Kontaktdaten verfügbar. Bitte besuchen Sie die offizielle Webseite.
                  </p>
                )}
              </section>

              <EinreichungInfo
                info={einreichung ?? null}
                kontaktEmail={programm.kontaktEmail}
                kontaktTelefon={programm.kontaktTelefon}
                bewerbungsfristText={programm.bewerbungsfristText}
              />

              <section className={`${CARD} p-6`}>
                <h2 className="font-serif text-xl text-ink mb-4 flex items-center gap-3" style={{ fontWeight: 500 }}>
                  <ExternalLink className="h-5 w-5 text-brandy" />
                  Weitere Links
                </h2>
                <div className="space-y-3">
                  {programm.infoLink && (
                    <a
                      href={programm.infoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl bg-[#f6f3ec] ring-1 ring-ink/10 hover:ring-brandy/30 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-brandy/10 flex items-center justify-center group-hover:bg-brandy/20 transition-colors">
                        <Info className="h-5 w-5 text-brandy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ink/50">Informationen</div>
                        <div className="text-ink/80 text-sm truncate">Offizielle Programmseite</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-ink/40" />
                    </a>
                  )}
                  {programm.antragsLink && (
                    <a
                      href={programm.antragsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl bg-[#f6f3ec] ring-1 ring-ink/10 hover:ring-brandy/30 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-brandy/10 flex items-center justify-center group-hover:bg-brandy/20 transition-colors">
                        <FileText className="h-5 w-5 text-brandy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ink/50">Antrag</div>
                        <div className="text-ink/80 text-sm truncate">Direkt zum Antragsportal</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-ink/40" />
                    </a>
                  )}
                </div>
              </section>

              {programm.kiAntragGeeignet && programm.kiHinweise && (
                <section className={`${CARD} p-6`}>
                  <h2 className="font-serif text-xl text-ink mb-4 flex items-center gap-3" style={{ fontWeight: 500 }}>
                    <Brain className="h-5 w-5 text-brandy" />
                    KI-Hinweise
                  </h2>
                  <div className="p-4 rounded-xl bg-brandy/[0.06] ring-1 ring-brandy/20">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-brandy mt-0.5 shrink-0" />
                      <p className="text-ink/70 text-sm leading-relaxed">
                        {programm.kiHinweise}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>

          {similarPrograms.length > 0 && (
            <section className="mt-16">
              <h2 className="font-serif text-2xl text-ink mb-8 flex items-center gap-3" style={{ fontWeight: 500 }}>
                <Tag className="h-6 w-6 text-brandy" />
                Ähnliche Programme
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarPrograms.map((similar) => {
                  const similarStyle = FOERDERGEBER_STYLES[similar.foerdergeberTyp as keyof typeof FOERDERGEBER_STYLES] || FOERDERGEBER_STYLES.bund;
                  return (
                    <Link
                      key={similar.id}
                      href={`/foerderprogramme/${similar.id}`}
                      className={`${CARD} p-6 shadow-sm hover:ring-1 hover:ring-brandy/30 hover:-translate-y-1 transition-all group`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${similarStyle.bg} ${similarStyle.text} ${similarStyle.ring}`}>
                          {similarStyle.label}
                        </span>
                        {similar.kiAntragGeeignet && (
                          <Sparkles className="h-4 w-4 text-brandy" />
                        )}
                      </div>
                      <h3 className="font-serif text-lg text-ink mb-2 group-hover:text-brandy transition-colors line-clamp-2" style={{ fontWeight: 500 }}>
                        {similar.name}
                      </h3>
                      <p className="text-ink/60 text-sm mb-4 line-clamp-2">
                        {similar.kurzbeschreibung}
                      </p>
                      <div className="flex items-center gap-2 text-brandy text-sm font-medium">
                        Details ansehen
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <Dialog open={showKIAssistent} onOpenChange={setShowKIAssistent}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-paper border-ink/10">
            <DialogHeader className="sr-only">
              <DialogTitle>KI-Antragsassistent</DialogTitle>
            </DialogHeader>
            <KIAntragAssistent
              programm={programm}
              onClose={() => setShowKIAssistent(false)}
            />
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </>
  );
}
