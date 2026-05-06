"use client";

import dynamic from "next/dynamic";
import { Suspense, memo, useMemo, useCallback } from "react";
import useSWR from "swr";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ProgramCardSkeleton, ProgramCardSkeletonGrid } from "@/components/ProgramCardSkeleton";
import { Search, Filter, School, X, Landmark, MapPinned, HeartHandshake, Globe } from "lucide-react";
import type { Foerderprogramm } from '@/lib/foerderSchema';
import { foerderprogrammeFetcher, FOERDERPROGRAMME_CACHE_KEY, swrConfig } from "@/lib/swr-fetcher";
import { useLocalStorage, useDebounce, usePagination } from "@/hooks/useLocalStorage";

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

// Memoized Statistik-Komponente
const StatsSection = memo(function StatsSection({ stats }: { stats: { total: number; bund: number; land: number; stiftung: number; eu: number } }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(10, 22, 40, 0.08)', boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)' }}>
        <div className="w-10 h-10 rounded-lg bg-[#c9a227]/15 flex items-center justify-center mx-auto mb-2">
          <School className="w-5 h-5 text-[#c9a227]" />
        </div>
        <div className="text-2xl font-bold text-[#c9a227]">{stats.total}</div>
        <div className="text-xs text-[#1e3a61]">Grundschul-Programme</div>
      </div>
      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(10, 22, 40, 0.08)', boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)' }}>
        <div className="w-10 h-10 rounded-lg bg-[#1a4d4d]/15 flex items-center justify-center mx-auto mb-2">
          <Landmark className="w-5 h-5 text-[#1a4d4d]" />
        </div>
        <div className="text-2xl font-bold text-[#1a4d4d]">{stats.bund}</div>
        <div className="text-xs text-[#1e3a61]">Bundesmittel</div>
      </div>
      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(10, 22, 40, 0.08)', boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)' }}>
        <div className="w-10 h-10 rounded-lg bg-[#1e3a61]/15 flex items-center justify-center mx-auto mb-2">
          <MapPinned className="w-5 h-5 text-[#1e3a61]" />
        </div>
        <div className="text-2xl font-bold text-[#1e3a61]">{stats.land}</div>
        <div className="text-xs text-[#1e3a61]">Landesmittel</div>
      </div>
      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(10, 22, 40, 0.08)', boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)' }}>
        <div className="w-10 h-10 rounded-lg bg-[#b08d1f]/15 flex items-center justify-center mx-auto mb-2">
          <HeartHandshake className="w-5 h-5 text-[#b08d1f]" />
        </div>
        <div className="text-2xl font-bold text-[#b08d1f]">{stats.stiftung}</div>
        <div className="text-xs text-[#1e3a61]">Stiftungen</div>
      </div>
      <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(10, 22, 40, 0.08)', boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)' }}>
        <div className="w-10 h-10 rounded-lg bg-[#266666]/15 flex items-center justify-center mx-auto mb-2">
          <Globe className="w-5 h-5 text-[#266666]" />
        </div>
        <div className="text-2xl font-bold text-[#266666]">{stats.eu}</div>
        <div className="text-xs text-[#1e3a61]">EU-Programme</div>
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
    kategorie: ""
  });

  // Debounced Suchbegriff für bessere Performance
  const debouncedSuchbegriff = useDebounce(filterState.suchbegriff, 300);

  // Kategorien aus Daten generieren (memoized)
  const kategorien = useMemo(() => {
    if (!foerderprogramme) return [{ value: "", label: "Alle Kategorien" }];
    const alleKategorien = Array.from(new Set(foerderprogramme.flatMap(p => p.kategorien))).sort();
    return [
      { value: "", label: "Alle Kategorien" },
      ...alleKategorien.map(kat => ({ 
        value: kat, 
        label: kat.charAt(0).toUpperCase() + kat.slice(1).replace(/-/g, " ") 
      }))
    ];
  }, [foerderprogramme]);

  // Statistiken (memoized)
  const stats = useMemo(() => {
    if (!foerderprogramme) return { total: 0, bund: 0, land: 0, stiftung: 0, eu: 0 };
    return {
      total: foerderprogramme.length,
      bund: foerderprogramme.filter(p => p.foerdergeberTyp === 'bund').length,
      land: foerderprogramme.filter(p => p.foerdergeberTyp === 'land').length,
      stiftung: foerderprogramme.filter(p => p.foerdergeberTyp === 'stiftung').length,
      eu: foerderprogramme.filter(p => p.foerdergeberTyp === 'eu').length,
    };
  }, [foerderprogramme]);

  // Filter-Logik (memoized)
  const gefilterteProgramme = useMemo(() => {
    if (!foerderprogramme) return [];
    
    const suche = debouncedSuchbegriff.toLowerCase().trim();
    
    return foerderprogramme.filter((programm) => {
      // Suchbegriff
      if (suche) {
        const nameMatch = programm.name.toLowerCase().includes(suche);
        if (nameMatch) return true;
        
        const beschreibungMatch = programm.kurzbeschreibung?.toLowerCase().includes(suche);
        if (beschreibungMatch) return true;
        
        const foerdergeberMatch = programm.foerdergeber.toLowerCase().includes(suche);
        if (!foerdergeberMatch) return false;
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

      return true;
    });
  }, [foerderprogramme, debouncedSuchbegriff, filterState]);

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
      kategorie: ""
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

  if (error) {
    return (
      <>
        <Header />
        <main id="main-content" className="min-h-screen pt-24 pb-20" style={{ backgroundColor: '#f8f5f0' }}>
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Fehler beim Laden</h1>
            <p className="text-[#1e3a61]">Die Programme konnten nicht geladen werden. Bitte versuchen Sie es später erneut.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen pt-24 pb-20" style={{ backgroundColor: '#f8f5f0' }}>
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c9a227]/10 border border-[#c9a227]/20 mb-6">
              <School className="h-4 w-4 text-[#c9a227]" />
              <span className="text-sm font-medium text-[#c9a227]">Förderfinder</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#0a1628] mb-4">
              Förderprogramme für Grundschulen
            </h1>
            <p className="text-[#1e3a61] max-w-2xl mx-auto text-lg">
              Finden Sie passende Förderungen für Ihre Grundschule.
              Aktuell {isLoading ? '...' : `${stats.total}+ Programme`} im Überblick.
            </p>
            <div className="mt-6">
              <a
                href="/antrag/start"
                className="inline-flex items-center gap-2 rounded-lg bg-[#c9a227] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#b8921e]"
              >
                Beschreib dein Anliegen → KI findet passende Programme
              </a>
            </div>
          </div>

          {/* Stats */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(10, 22, 40, 0.08)' }}>
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
          <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(10, 22, 40, 0.08)', boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-[#c9a227]" />
                <h2 className="font-semibold text-[#0a1628]">Filter</h2>
                {aktiveFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#c9a227]/15 text-[#c9a227]">
                    {aktiveFilterCount} aktiv
                  </span>
                )}
              </div>
              {hatAktiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilter}
                  className="text-[#1e3a61] hover:text-[#c9a227]"
                >
                  <X className="h-4 w-4" />
                  Filter zurücksetzen
                </Button>
              )}
            </div>

            {/* Filter-Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Suchfeld */}
              <div className="relative">
                <label className="block text-xs text-[#1e3a61] mb-1.5">Suche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a61]/50" />
                  <input
                    type="text"
                    placeholder="Name, Beschreibung..."
                    value={filterState.suchbegriff}
                    onChange={(e) => handleFilterChange('suchbegriff', e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#f8f5f0] border border-[#ebe5dc] text-[#0a1628] text-sm placeholder:text-[#1e3a61]/50 focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/50 transition-all"
                  />
                  {filterState.suchbegriff && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleFilterChange('suchbegriff', '')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1e3a61]/50 hover:text-[#0a1628]"
                      aria-label="Suche löschen"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Bundesland-Dropdown */}
              <div>
                <label className="block text-xs text-[#1e3a61] mb-1.5">Bundesland</label>
                <select
                  value={filterState.bundesland}
                  onChange={(e) => handleFilterChange('bundesland', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f8f5f0] border border-[#ebe5dc] text-[#0a1628] text-sm focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/50 transition-all cursor-pointer appearance-none"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231e3a61' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, 
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
                <label className="block text-xs text-[#1e3a61] mb-1.5">Fördergeber</label>
                <select
                  value={filterState.foerdergeberTyp}
                  onChange={(e) => handleFilterChange('foerdergeberTyp', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f8f5f0] border border-[#ebe5dc] text-[#0a1628] text-sm focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/50 transition-all cursor-pointer appearance-none"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231e3a61' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, 
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
                <label className="block text-xs text-[#1e3a61] mb-1.5">Kategorie</label>
                <select
                  value={filterState.kategorie}
                  onChange={(e) => handleFilterChange('kategorie', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f8f5f0] border border-[#ebe5dc] text-[#0a1628] text-sm focus:outline-none focus:border-[#c9a227]/50 focus:ring-1 focus:ring-[#c9a227]/50 transition-all cursor-pointer appearance-none"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231e3a61' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, 
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
            </div>
          </div>

          {/* Ergebnis-Anzeige */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#0a1628]">
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
            <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(10, 22, 40, 0.08)', boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)' }}>
              <Search className="h-16 w-16 text-[#ebe5dc] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#0a1628] mb-2">
                Keine Programme gefunden
              </h3>
              <p className="text-[#1e3a61] max-w-md mx-auto mb-6">
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
                onPageChange={goToPage}
              />
            </>
          )}

          {/* Hinweis */}
          <div className="mt-12 rounded-2xl p-8 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(10, 22, 40, 0.08)', boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)' }}>
            <Search className="h-12 w-12 text-[#c9a227] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#0a1628] mb-2">
              Mehr Programme werden ergänzt
            </h3>
            <p className="text-[#1e3a61] max-w-xl mx-auto">
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
