"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, memo, useMemo, useCallback, useRef } from "react";
import useSWR from "swr";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ProgramCardSkeleton, ProgramCardSkeletonGrid } from "@/components/ProgramCardSkeleton";
import { Search, Filter, School, X, Landmark, MapPinned, HeartHandshake, Globe } from "lucide-react";
import type { Foerderprogramm } from '@/lib/foerderSchema';
import { foerderprogrammeFetcher, FOERDERPROGRAMME_CACHE_KEY, swrConfig } from "@/lib/swr-fetcher";
import { formatKategorie } from "@/lib/kategorie-labels";
import { isProgrammAbgelaufen } from "@/lib/programm-status";
import { useLocalStorage, useDebounce, usePagination } from "@/hooks/useLocalStorage";
import { PROGRAMM_COUNT_LABEL } from "@/lib/programm-count";

// Dynamic Import für GlassCard (Code-Splitting)
const GlassCard = dynamic(() => import("@/components/GlassCardOptimized").then(mod => ({ 
  default: mod.GlassCard 
})), {
  loading: () => <ProgramCardSkeleton />,
  ssr: false
});

// Bundesländer-Optionen (außerhalb der Komponente für stabile Referenz)
const BUNDESLAENDER = [
  { value: "", label: "Alle Bundesländer" },
  { value: "DE-BW", label: "Baden-Württemberg" },
  { value: "DE-BY", label: "Bayern" },
  { value: "DE-BE", label: "Berlin" },
  { value: "DE-BB", label: "Brandenburg" },
  { value: "DE-HB", label: "Bremen" },
  { value: "DE-HH", label: "Hamburg" },
  { value: "DE-HE", label: "Hessen" },
  { value: "DE-MV", label: "Mecklenburg-Vorpommern" },
  { value: "DE-NI", label: "Niedersachsen" },
  { value: "DE-NW", label: "Nordrhein-Westfalen" },
  { value: "DE-RP", label: "Rheinland-Pfalz" },
  { value: "DE-SL", label: "Saarland" },
  { value: "DE-SN", label: "Sachsen" },
  { value: "DE-ST", label: "Sachsen-Anhalt" },
  { value: "DE-SH", label: "Schleswig-Holstein" },
  { value: "DE-TH", label: "Thüringen" },
];

const FOERDERGEBER_TYPEN = [
  { value: "", label: "Alle Typen" },
  { value: "bund", label: "Bund" },
  { value: "land", label: "Land" },
  { value: "stiftung", label: "Stiftung" },
  { value: "eu", label: "EU" },
];

// Schulformen fuer Filter + Freitextsuche (Code -> Anzeigename)
const SCHULFORM_LABEL: Record<string, string> = {
  grundschule: "Grundschule",
  hauptschule: "Hauptschule",
  realschule: "Realschule",
  gymnasium: "Gymnasium",
  gesamtschule: "Gesamtschule",
  iss: "Integrierte Sekundarschule (ISS)",
  "iss-mit-go": "Integrierte Sekundarschule mit Oberstufe (ISS+GO)",
  foerderschule: "Förderschule",
  berufsschule: "Berufsschule",
};

const SCHULFORMEN = [
  { value: "", label: "Alle Schulformen" },
  { value: "grundschule", label: "Grundschule" },
  { value: "hauptschule", label: "Hauptschule" },
  { value: "realschule", label: "Realschule" },
  { value: "gymnasium", label: "Gymnasium" },
  { value: "gesamtschule", label: "Gesamtschule" },
  { value: "iss", label: "Integrierte Sekundarschule (ISS)" },
  { value: "foerderschule", label: "Förderschule" },
  { value: "berufsschule", label: "Berufsschule" },
];

// Memoized Statistik-Komponente
const StatsSection = memo(function StatsSection({ stats }: { stats: { total: number; bund: number; land: number; stiftung: number; eu: number } }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(28, 25, 23, 0.08)', boxShadow: '0 4px 20px -4px rgba(28, 25, 23, 0.05)' }}>
        <div className="w-10 h-10 rounded-lg bg-[#1e3d32]/15 flex items-center justify-center mx-auto mb-2">
          <School className="w-5 h-5 text-[#1e3d32]" />
        </div>
        <div className="text-2xl font-bold text-[#1e3d32]">{PROGRAMM_COUNT_LABEL}</div>
        <div className="text-xs text-[#57534e]">Schul-Programme</div>
      </div>
      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(28, 25, 23, 0.08)', boxShadow: '0 4px 20px -4px rgba(28, 25, 23, 0.05)' }}>
        <div className="w-10 h-10 rounded-lg bg-[#1a4d4d]/15 flex items-center justify-center mx-auto mb-2">
          <Landmark className="w-5 h-5 text-[#1a4d4d]" />
        </div>
        <div className="text-2xl font-bold text-[#1a4d4d]">{stats.bund}</div>
        <div className="text-xs text-[#57534e]">Bundesmittel</div>
      </div>
      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(28, 25, 23, 0.08)', boxShadow: '0 4px 20px -4px rgba(28, 25, 23, 0.05)' }}>
        <div className="w-10 h-10 rounded-lg bg-[#57534e]/15 flex items-center justify-center mx-auto mb-2">
          <MapPinned className="w-5 h-5 text-[#57534e]" />
        </div>
        <div className="text-2xl font-bold text-[#57534e]">{stats.land}</div>
        <div className="text-xs text-[#57534e]">Landesmittel</div>
      </div>
      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(28, 25, 23, 0.08)', boxShadow: '0 4px 20px -4px rgba(28, 25, 23, 0.05)' }}>
        <div className="w-10 h-10 rounded-lg bg-[#1e3d32]/15 flex items-center justify-center mx-auto mb-2">
          <HeartHandshake className="w-5 h-5 text-[#1e3d32]" />
        </div>
        <div className="text-2xl font-bold text-[#1e3d32]">{stats.stiftung}</div>
        <div className="text-xs text-[#57534e]">Stiftungen</div>
      </div>
      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(28, 25, 23, 0.08)', boxShadow: '0 4px 20px -4px rgba(28, 25, 23, 0.05)' }}>
        <div className="w-10 h-10 rounded-lg bg-[#266666]/15 flex items-center justify-center mx-auto mb-2">
          <Globe className="w-5 h-5 text-[#266666]" />
        </div>
        <div className="text-2xl font-bold text-[#266666]">{stats.eu}</div>
        <div className="text-xs text-[#57534e]">EU-Programme</div>
      </div>
    </div>
  );
});

// Pagination Komponente
const Pagination = memo(function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Erste Seite immer zeigen
    pages.push(1);

    // Bereich um aktuelle Seite
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');

    // Letzte Seite immer zeigen
    pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ← Zurück
      </Button>
      
      <div className="flex items-center gap-1">
        {getVisiblePages().map((page, index) => (
          <div key={index}>
            {page === '...' ? (
              <span className="px-2 text-slate-500">...</span>
            ) : (
              <Button
                variant={currentPage === page ? "primary" : "secondary"}
                size="icon-sm"
                onClick={() => onPageChange(page as number)}
                className="w-10 h-10"
              >
                {page}
              </Button>
            )}
          </div>
        ))}
      </div>
      
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Weiter →
      </Button>
    </div>
  );
});

// Hauptkomponente
export default function FoerderprogrammePage() {
  // Anker für Scroll-zum-Listenanfang beim Seitenwechsel
  const listRef = useRef<HTMLDivElement>(null);

  // SWR für Daten-Fetching mit Caching
  const { data: foerderprogramme, error, isLoading } = useSWR<Foerderprogramm[]>(
    FOERDERPROGRAMME_CACHE_KEY,
    foerderprogrammeFetcher,
    swrConfig
  );

  // Persistierter Filter-State
  const [filterState, setFilterState] = useLocalStorage('foerderprogramme-filters', {
    suchbegriff: "",
    bundesland: "",
    foerdergeberTyp: "",
    kategorie: "",
    schulform: ""
  });

  // Debounced Suchbegriff für bessere Performance
  const debouncedSuchbegriff = useDebounce(filterState.suchbegriff, 300);

  // Aktiver Katalog = alles, was NICHT ins Archiv gehoert (terminaler Status oder
  // abgelaufene Frist). Eine gemeinsame Basis fuer Statistik, Kategorien UND Filter,
  // damit die Zahlen ("X von Y", Fördergeber-Kacheln) und Dropdown-Optionen konsistent
  // nur den sichtbaren Katalog zaehlen — nicht die 23 archivierten Datensaetze im Roh-JSON.
  const aktiveProgramme = useMemo(() => {
    if (!foerderprogramme) return [];
    return foerderprogramme.filter((p) => !isProgrammAbgelaufen(p));
  }, [foerderprogramme]);

  // Kategorien aus Daten generieren (memoized) — nur aus dem aktiven Katalog, damit
  // keine Dropdown-Option auftaucht, die ausschliesslich archivierte Programme trifft.
  const kategorien = useMemo(() => {
    const alleKategorien = Array.from(new Set(aktiveProgramme.flatMap(p => p.kategorien))).sort();
    return [
      { value: "", label: "Alle Kategorien" },
      ...alleKategorien.map(kat => ({
        value: kat,
        label: formatKategorie(kat)
      }))
    ];
  }, [aktiveProgramme]);

  // Statistiken (memoized) — auf Basis des aktiven Katalogs
  const stats = useMemo(() => {
    return {
      total: aktiveProgramme.length,
      bund: aktiveProgramme.filter(p => p.foerdergeberTyp === 'bund').length,
      land: aktiveProgramme.filter(p => p.foerdergeberTyp === 'land').length,
      stiftung: aktiveProgramme.filter(p => p.foerdergeberTyp === 'stiftung').length,
      eu: aktiveProgramme.filter(p => p.foerdergeberTyp === 'eu').length,
    };
  }, [aktiveProgramme]);

  // Filter-Logik (memoized)
  const gefilterteProgramme = useMemo(() => {
    const suche = debouncedSuchbegriff.toLowerCase().trim();

    return aktiveProgramme.filter((programm) => {
      // Suchbegriff — durchsucht Name, Beschreibung, Foerdergeber UND die
      // Schulform-Tags (z. B. "Gymnasium") + Kategorien, damit eine Suche nach
      // einer Schulart nicht ins Leere laeuft (FP-03).
      if (suche) {
        const nameMatch = programm.name.toLowerCase().includes(suche);
        if (nameMatch) return true;

        const beschreibungMatch = programm.kurzbeschreibung?.toLowerCase().includes(suche);
        if (beschreibungMatch) return true;

        const foerdergeberMatch = programm.foerdergeber.toLowerCase().includes(suche);
        if (foerdergeberMatch) return true;

        const schulformMatch = programm.schulformen?.some(
          (s) => s.toLowerCase().includes(suche) || (SCHULFORM_LABEL[s]?.toLowerCase().includes(suche) ?? false)
        );
        if (schulformMatch) return true;

        const kategorieMatch = programm.kategorien?.some((k) => k.toLowerCase().includes(suche));
        if (!kategorieMatch) return false;
      }

      // Bundesland
      if (filterState.bundesland) {
        if (!programm.bundeslaender.includes("alle") && 
            !programm.bundeslaender.includes(filterState.bundesland)) {
          return false;
        }
      }

      // Fördergeber-Typ
      if (filterState.foerdergeberTyp && programm.foerdergeberTyp !== filterState.foerdergeberTyp) {
        return false;
      }

      // Kategorie
      if (filterState.kategorie && !programm.kategorien.includes(filterState.kategorie)) {
        return false;
      }

      // Schulform (FP-09)
      if (filterState.schulform && !programm.schulformen?.some((s) => s === filterState.schulform)) {
        return false;
      }

      return true;
    });
  }, [aktiveProgramme, debouncedSuchbegriff, filterState]);

  // Pagination (12 Items pro Seite für bessere Performance)
  const { 
    currentPage, 
    totalPages, 
    paginatedItems,
    goToPage,
    resetPage
  } = usePagination({
    items: gefilterteProgramme,
    itemsPerPage: 12,
  });

  // Filter zurücksetzen
  const resetFilter = useCallback(() => {
    setFilterState({
      suchbegriff: "",
      bundesland: "",
      foerdergeberTyp: "",
      kategorie: "",
      schulform: ""
    });
    resetPage();
  }, [setFilterState, resetPage]);

  // Aktive Filter zählen
  const aktiveFilterCount = Object.values(filterState).filter(Boolean).length;
  const hatAktiveFilter = aktiveFilterCount > 0;

  // Handler für Filter-Änderungen
  const handleFilterChange = useCallback((key: keyof typeof filterState, value: string) => {
    setFilterState(prev => ({ ...prev, [key]: value }));
    resetPage();
  }, [setFilterState, resetPage]);

  // Handler für Seitenwechsel: Seite wechseln UND an den Listenanfang scrollen.
  // Sonst bleibt der Viewport unten bei den Pagination-Buttons und die neue Seite
  // erscheint "von ganz unten" statt von oben (Pilot-Bug #001).
  const handlePageChange = useCallback((page: number) => {
    goToPage(page);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [goToPage]);

  if (error) {
    return (
      <>
        <Header />
        <main id="main-content" className="min-h-screen pt-24 pb-20" style={{ backgroundColor: '#fdfdfc' }}>
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Fehler beim Laden</h1>
            <p className="text-[#57534e]">Die Programme konnten nicht geladen werden. Bitte versuchen Sie es später erneut.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen pt-24 pb-20" style={{ backgroundColor: '#fdfdfc' }}>
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e3d32]/10 border border-[#1e3d32]/20 mb-6">
              <School className="h-4 w-4 text-[#1e3d32]" />
              <span className="text-sm font-medium text-[#1e3d32]">Förderfinder</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#1c1917] mb-4">
              Förderprogramme für Schulen
            </h1>
            <p className="text-[#57534e] max-w-2xl mx-auto text-lg">
              Finden Sie passende Förderungen für Ihre Schule.
              Aktuell {isLoading ? '...' : `${PROGRAMM_COUNT_LABEL} Programme`} im Überblick.
            </p>
            <div className="mt-6">
              <Link
                href="/antrag/start"
                prefetch
                className="inline-flex items-center gap-2 rounded-lg bg-[#1e3d32] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#2a5244]"
              >
                Beschreiben Sie Ihr Anliegen → KI findet passende Programme
              </Link>
            </div>
          </div>

          {/* Stats */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(28, 25, 23, 0.08)' }}>
                  <div className="w-10 h-10 rounded-lg bg-[#ebe5dc] mx-auto mb-2" />
                  <div className="h-8 w-12 bg-[#ebe5dc] mx-auto mb-1 rounded" />
                  <div className="h-3 w-20 bg-[#ebe5dc] mx-auto rounded" />
                </div>
              ))}
            </div>
          ) : (
            <StatsSection stats={stats} />
          )}

          {/* Filter-Bereich */}
          <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(28, 25, 23, 0.08)', boxShadow: '0 4px 20px -4px rgba(28, 25, 23, 0.05)' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-[#1e3d32]" />
                <h2 className="font-semibold text-[#1c1917]">Filter</h2>
                {aktiveFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#1e3d32]/15 text-[#1e3d32]">
                    {aktiveFilterCount} aktiv
                  </span>
                )}
              </div>
              {hatAktiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilter}
                  className="text-[#57534e] hover:text-[#1e3d32]"
                >
                  <X className="h-4 w-4" />
                  Filter zurücksetzen
                </Button>
              )}
            </div>

            {/* Filter-Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Suchfeld */}
              <div className="relative">
                <label className="block text-xs text-[#57534e] mb-1.5">Suche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#57534e]/50" />
                  <input
                    type="text"
                    placeholder="Name, Beschreibung..."
                    value={filterState.suchbegriff}
                    onChange={(e) => handleFilterChange('suchbegriff', e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#fdfdfc] border border-[#ebe5dc] text-[#1c1917] text-sm placeholder:text-[#57534e]/50 focus:outline-none focus:border-[#1e3d32]/50 focus:ring-1 focus:ring-[#1e3d32]/50 transition-all"
                  />
                  {filterState.suchbegriff && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleFilterChange('suchbegriff', '')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#57534e]/50 hover:text-[#1c1917]"
                      aria-label="Suche löschen"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Bundesland-Dropdown */}
              <div>
                <label className="block text-xs text-[#57534e] mb-1.5">Bundesland</label>
                <select
                  value={filterState.bundesland}
                  onChange={(e) => handleFilterChange('bundesland', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#fdfdfc] border border-[#ebe5dc] text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3d32]/50 focus:ring-1 focus:ring-[#1e3d32]/50 transition-all cursor-pointer appearance-none"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2357534e' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, 
                    backgroundRepeat: 'no-repeat', 
                    backgroundPosition: 'right 12px center' 
                  }}
                >
                  {BUNDESLAENDER.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fördergeber-Typ-Dropdown */}
              <div>
                <label className="block text-xs text-[#57534e] mb-1.5">Fördergeber</label>
                <select
                  value={filterState.foerdergeberTyp}
                  onChange={(e) => handleFilterChange('foerdergeberTyp', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#fdfdfc] border border-[#ebe5dc] text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3d32]/50 focus:ring-1 focus:ring-[#1e3d32]/50 transition-all cursor-pointer appearance-none"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2357534e' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, 
                    backgroundRepeat: 'no-repeat', 
                    backgroundPosition: 'right 12px center' 
                  }}
                >
                  {FOERDERGEBER_TYPEN.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kategorie-Dropdown */}
              <div>
                <label className="block text-xs text-[#57534e] mb-1.5">Kategorie</label>
                <select
                  value={filterState.kategorie}
                  onChange={(e) => handleFilterChange('kategorie', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#fdfdfc] border border-[#ebe5dc] text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3d32]/50 focus:ring-1 focus:ring-[#1e3d32]/50 transition-all cursor-pointer appearance-none"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2357534e' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, 
                    backgroundRepeat: 'no-repeat', 
                    backgroundPosition: 'right 12px center' 
                  }}
                >
                  {kategorien.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schulform-Dropdown (FP-09) */}
              <div>
                <label className="block text-xs text-[#57534e] mb-1.5">Schulform</label>
                <select
                  value={filterState.schulform || ""}
                  onChange={(e) => handleFilterChange('schulform', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#fdfdfc] border border-[#ebe5dc] text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3d32]/50 focus:ring-1 focus:ring-[#1e3d32]/50 transition-all cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2357534e' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center'
                  }}
                >
                  {SCHULFORMEN.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ergebnis-Anzeige */}
          <div ref={listRef} className="mb-6 scroll-mt-24">
            <h2 className="text-2xl font-bold text-[#1c1917]">
              {isLoading ? (
                <span className="inline-block w-48 h-8 bg-[#ebe5dc] rounded animate-pulse" />
              ) : gefilterteProgramme.length === stats.total ? (
                `Alle Programme (${stats.total})`
              ) : (
                `${gefilterteProgramme.length} von ${stats.total} Programmen gefunden`
              )}
            </h2>
          </div>

          {/* Programm-Liste */}
          {isLoading ? (
            <ProgramCardSkeletonGrid count={6} />
          ) : gefilterteProgramme.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(28, 25, 23, 0.08)', boxShadow: '0 4px 20px -4px rgba(28, 25, 23, 0.05)' }}>
              <Search className="h-16 w-16 text-[#ebe5dc] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#1c1917] mb-2">
                Keine Programme gefunden
              </h3>
              <p className="text-[#57534e] max-w-md mx-auto mb-6">
                Versuchen Sie es mit anderen Filterkriterien oder setzen Sie die Filter zurück.
              </p>
              <Button
                onClick={resetFilter}
              >
                <X className="h-4 w-4" />
                Filter zurücksetzen
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                <Suspense fallback={<ProgramCardSkeleton />}>
                  {paginatedItems.map((programm) => (
                    <GlassCard key={programm.id} programm={programm} />
                  ))}
                </Suspense>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}

          {/* Hinweis */}
          <div className="mt-12 rounded-2xl p-8 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(28, 25, 23, 0.08)', boxShadow: '0 4px 20px -4px rgba(28, 25, 23, 0.05)' }}>
            <Search className="h-12 w-12 text-[#1e3d32] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#1c1917] mb-2">
              Mehr Programme werden ergänzt
            </h3>
            <p className="text-[#57534e] max-w-xl mx-auto">
              Unsere Datenbank wächst stetig. Wir erfassen aktuell Programme 
              von Bund, Ländern, Stiftungen und der EU. Haben Sie ein Programm gefunden, 
              das hier fehlt? Melden Sie sich bei uns.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
