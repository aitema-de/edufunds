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
  X
} from "lucide-react";
import type { Foerderprogramm } from '@/lib/foerderSchema';
import foerderprogrammeData from '@/data/foerderprogramme.json';
import { KIAntragAssistent } from "@/components/KIAntragAssistent";
import { formatKategorie } from "@/lib/kategorie-labels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

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

// Fördergeber Typ Badge Styles
const FOERDERGEBER_STYLES = {
  bund: { bg: "bg-cyan-500/20", text: "text-cyan-400", label: "Bund" },
  land: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Land" },
  stiftung: { bg: "bg-green-500/20", text: "text-green-400", label: "Stiftung" },
  eu: { bg: "bg-blue-500/20", text: "text-blue-400", label: "EU" },
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
}

export default function FoerderprogrammDetailClient({ programm }: FoerderprogrammDetailClientProps) {
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
      <main id="main-content" className="min-h-screen pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/foerderprogramme"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-[#7a5e12] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Zurück zur Übersicht</span>
            </Link>
          </div>

          {/* Hero Section */}
          <div className="relative rounded-3xl overflow-hidden mb-12">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-900" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#c9a227]/10 via-transparent to-cyan-500/10" />
            
            <div className="relative p-8 md:p-12">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${foerdergeberStyle.bg} ${foerdergeberStyle.text}`}>
                  {foerdergeberStyle.label}
                </span>
                {programm.kiAntragGeeignet && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#c9a227]/20 text-[#c9a227] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    KI-geeignet
                  </span>
                )}
                {programm.status === "aktiv" && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-500/20 text-green-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Aktiv
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-[#0a1628] mb-4 leading-tight">
                {programm.name}
              </h1>

              <div className="flex items-center gap-3 text-slate-700 mb-6">
                <Building2 className="h-5 w-5 text-slate-600" />
                <span className="text-lg">{programm.foerdergeber}</span>
              </div>

              <p className="text-slate-700 text-lg max-w-3xl leading-relaxed mb-8">
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
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="glass rounded-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold text-[#0a1628] mb-4 flex items-center gap-3">
                  <Info className="h-6 w-6 text-[#c9a227]" />
                  Beschreibung
                </h2>
                <p className="text-slate-700 leading-relaxed text-lg">
                  {programm.beschreibung || programm.kurzbeschreibung}
                </p>
              </section>

              <section className="glass rounded-2xl p-6 md:p-8 border-[#c9a227]/20">
                <h2 className="text-2xl font-bold text-[#0a1628] mb-6 flex items-center gap-3">
                  <Euro className="h-6 w-6 text-[#c9a227]" />
                  Förderbetrag
                </h2>
                <div className="bg-gradient-to-br from-[#c9a227]/10 to-[#b08d1f]/5 rounded-xl p-6 border border-[#c9a227]/20">
                  <div className="text-3xl md:text-4xl font-bold text-[#7a5e12] mb-2">
                    {programm.foerdersummeText}
                  </div>
                  {programm.foerdersummeMin && programm.foerdersummeMax && (
                    <div className="text-slate-600">
                      Bereich: {programm.foerdersummeMin.toLocaleString("de-DE")} € - {programm.foerdersummeMax.toLocaleString("de-DE")} €
                    </div>
                  )}
                </div>
              </section>

              <section className="glass rounded-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold text-[#0a1628] mb-4 flex items-center gap-3">
                  <Tag className="h-6 w-6 text-[#c9a227]" />
                  Kategorien
                </h2>
                <div className="flex flex-wrap gap-3">
                  {programm.kategorien.map((kategorie) => (
                    <span
                      key={kategorie}
                      className="px-4 py-2 rounded-xl bg-white text-slate-700 text-sm font-medium border border-[#0a1628]/15 hover:border-[#c9a227]/30 transition-colors"
                    >
                      {formatKategorie(kategorie)}
                    </span>
                  ))}
                </div>
              </section>

              <section className="glass rounded-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold text-[#0a1628] mb-4 flex items-center gap-3">
                  <School className="h-6 w-6 text-[#c9a227]" />
                  Geeignete Schulformen
                </h2>
                <div className="flex flex-wrap gap-3">
                  {programm.schulformen.map((schulform) => (
                    <span
                      key={schulform}
                      className="px-4 py-2 rounded-xl bg-white/80 text-slate-700 text-sm font-medium border border-[#0a1628]/15 flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      {SCHULFORMEN_MAP[schulform] || schulform}
                    </span>
                  ))}
                </div>
              </section>

              <section className="glass rounded-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold text-[#0a1628] mb-4 flex items-center gap-3">
                  <MapPin className="h-6 w-6 text-[#c9a227]" />
                  Verfügbar in
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {programm.bundeslaender.includes("alle") ? (
                    <div className="col-span-full flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="h-6 w-6 text-green-400" />
                      <span className="text-green-400 font-medium">Alle Bundesländer</span>
                    </div>
                  ) : (
                    programm.bundeslaender.map((code) => (
                      <div
                        key={code}
                        className="px-3 py-2 rounded-lg bg-white/80 text-slate-700 text-sm text-center border border-[#0a1628]/15"
                      >
                        {BUNDESLAENDER_MAP[code] || code}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="glass rounded-2xl p-6 border-[#c9a227]/20">
                <h2 className="text-xl font-bold text-[#0a1628] mb-4 flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[#c9a227]" />
                  Bewerbungsfrist
                </h2>
                
                <div className="space-y-4">
                  {countdown && countdown.days > 0 && (
                    <div className={`p-4 rounded-xl ${countdown.urgent ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#c9a227]/10 border border-[#c9a227]/20'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className={`h-5 w-5 ${countdown.urgent ? 'text-red-400' : 'text-[#c9a227]'}`} />
                        <span className={`text-sm font-medium ${countdown.urgent ? 'text-red-400' : 'text-[#7a5e12]'}`}>
                          {countdown.urgent ? 'Bald ablaufend!' : 'Noch Zeit'}
                        </span>
                      </div>
                      <div className={`text-3xl font-bold ${countdown.urgent ? 'text-red-400' : 'text-[#7a5e12]'}`}>
                        {countdown.days} <span className="text-lg font-normal">Tage</span>
                      </div>
                      {countdown.hours > 0 && (
                        <div className="text-slate-600 text-sm">
                          und {countdown.hours} Stunden
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    {programm.bewerbungsfristText && (
                      <div className="text-[#1e3a61] font-medium">
                        {programm.bewerbungsfristText}
                      </div>
                    )}
                    {programm.bewerbungsfristStart && (
                      <div className="text-sm text-slate-600">
                        Start: {formatDate(programm.bewerbungsfristStart)}
                      </div>
                    )}
                    {programm.bewerbungsfristEnde && (
                      <div className="text-sm text-slate-600">
                        Ende: {formatDate(programm.bewerbungsfristEnde)}
                      </div>
                    )}
                    {!programm.bewerbungsfristStart && !programm.bewerbungsfristEnde && (
                      <div className="text-sm text-slate-600">
                        Laufende Bewerbungsphase
                      </div>
                    )}
                  </div>

                  {programm.bewerbungsart && (
                    <div className="pt-4 border-t border-[#0a1628]/15">
                      <span className="text-sm text-slate-500">Bewerbungsart:</span>
                      <div className="text-slate-700 capitalize mt-1">
                        {programm.bewerbungsart === "online" ? "Online-Antrag" : 
                         programm.bewerbungsart === "schriftlich" ? "Schriftlicher Antrag" : 
                         programm.bewerbungsart}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-[#0a1628] mb-4 flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[#c9a227]" />
                  Kontakt
                </h2>
                {programm.kontaktEmail ? (
                  <a
                    href={`mailto:${programm.kontaktEmail}`}
                    className="flex items-center gap-3 p-4 rounded-xl bg-white hover:bg-white transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#c9a227]/10 flex items-center justify-center group-hover:bg-[#c9a227]/20 transition-colors">
                      <Mail className="h-5 w-5 text-[#c9a227]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-500">E-Mail</div>
                      <div className="text-slate-700 text-sm truncate">{programm.kontaktEmail}</div>
                    </div>
                  </a>
                ) : (
                  <p className="text-slate-500 text-sm">
                    Keine Kontaktdaten verfügbar. Bitte besuchen Sie die offizielle Webseite.
                  </p>
                )}
              </section>

              <section className="glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-[#0a1628] mb-4 flex items-center gap-3">
                  <ExternalLink className="h-5 w-5 text-[#c9a227]" />
                  Weitere Links
                </h2>
                <div className="space-y-3">
                  {programm.infoLink && (
                    <a
                      href={programm.infoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl bg-white hover:bg-white transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                        <Info className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-500">Informationen</div>
                        <div className="text-slate-700 text-sm truncate">Offizielle Programmseite</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-500" />
                    </a>
                  )}
                  {programm.antragsLink && (
                    <a
                      href={programm.antragsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl bg-white hover:bg-white transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                        <FileText className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-500">Antrag</div>
                        <div className="text-slate-700 text-sm truncate">Direkt zum Antragsportal</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-500" />
                    </a>
                  )}
                </div>
              </section>

              {programm.kiAntragGeeignet && programm.kiHinweise && (
                <section className="glass rounded-2xl p-6 border-[#c9a227]/20">
                  <h2 className="text-xl font-bold text-[#0a1628] mb-4 flex items-center gap-3">
                    <Brain className="h-5 w-5 text-[#c9a227]" />
                    KI-Hinweise
                  </h2>
                  <div className="p-4 rounded-xl bg-[#c9a227]/10 border border-[#c9a227]/20">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-[#c9a227] mt-0.5 shrink-0" />
                      <p className="text-slate-700 text-sm leading-relaxed">
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
              <h2 className="text-2xl font-bold text-[#0a1628] mb-8 flex items-center gap-3">
                <Tag className="h-6 w-6 text-[#c9a227]" />
                Ähnliche Programme
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarPrograms.map((similar) => {
                  const similarStyle = FOERDERGEBER_STYLES[similar.foerdergeberTyp as keyof typeof FOERDERGEBER_STYLES] || FOERDERGEBER_STYLES.bund;
                  return (
                    <Link
                      key={similar.id}
                      href={`/foerderprogramme/${similar.id}`}
                      className="glass rounded-2xl p-6 hover:border-[#c9a227]/30 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${similarStyle.bg} ${similarStyle.text}`}>
                          {similarStyle.label}
                        </span>
                        {similar.kiAntragGeeignet && (
                          <Sparkles className="h-4 w-4 text-[#c9a227]" />
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-[#0a1628] mb-2 group-hover:text-[#7a5e12] transition-colors line-clamp-2">
                        {similar.name}
                      </h3>
                      <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                        {similar.kurzbeschreibung}
                      </p>
                      <div className="flex items-center gap-2 text-[#7a5e12] text-sm font-medium">
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-[#0a1628]/15">
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
