"use client";

import { useState, useMemo, memo } from "react";
import Link from "next/link";
import { Building2, Euro, Calendar, MapPin, ArrowRight } from "lucide-react";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { formatKategorie } from "@/lib/kategorie-labels";

interface GlassCardProps {
  programm: Foerderprogramm;
}

// Optimierte Typ-Lookup-Tabellen (außerhalb der Komponente)
const TYPE_CONFIG = {
  bund: {
    label: "Bundesmittel",
    color: "bg-cyan-500/20 text-cyan-400",
    iconPath: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
  },
  land: {
    label: "Landesmittel",
    color: "bg-purple-500/20 text-purple-400",
    iconPath: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
  },
  stiftung: {
    label: "Stiftung",
    color: "bg-green-500/20 text-green-400",
    iconPath: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
  },
  eu: {
    label: "EU-Programm",
    color: "bg-blue-500/20 text-blue-400",
    iconPath: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  }
} as const;

const DEFAULT_TYPE = {
  label: "Unbekannt",
  color: "bg-slate-500/20 text-slate-400",
  iconPath: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
};

// Memoized GlassCard für bessere Performance
export const GlassCard = memo(function GlassCard({ programm }: GlassCardProps) {
  const typeConfig = TYPE_CONFIG[programm.foerdergeberTyp as keyof typeof TYPE_CONFIG] || DEFAULT_TYPE;
  
  // Beschreibung bereinigen (memoized)
  const cleanedDescription = useMemo(() => {
    return programm.kurzbeschreibung
      ?.replace(/für alle schulformen/gi, "")
      .replace(/für alle schulen/gi, "")
      .replace(/\s+/g, " ")
      .trim() || "";
  }, [programm.kurzbeschreibung]);

  // Bundesland-Text (memoized)
  const bundeslandText = useMemo(() => {
    return programm.bundeslaender.includes("alle")
      ? "Alle Bundesländer"
      : `${programm.bundeslaender.length} Bundesländer`;
  }, [programm.bundeslaender]);

  return (
    <article 
      className="rounded-2xl p-6 md:p-8 transition-all group card-lift"
      style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid rgba(10, 22, 40, 0.08)',
        boxShadow: '0 4px 20px -4px rgba(10, 22, 40, 0.05)'
      }}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header mit Icon und Badges */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.color.split(' ')[0]}`}>
              <svg className={`w-5 h-5 ${typeConfig.color.split(' ')[1]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeConfig.iconPath} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
                {programm.kiAntragGeeignet && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#c9a227]/15 text-[#7a5e12]">
                    KI-geeignet
                  </span>
                )}
                {programm.status === "aktiv" && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600">
                    Aktiv
                  </span>
                )}
              </div>
              
              {/* Titel */}
              <h3 className="text-xl font-bold text-[#0a1628] group-hover:text-[#c9a227] transition-colors line-clamp-2">
                {programm.name}
              </h3>
            </div>
          </div>

          {/* Fördergeber */}
          <p className="text-[#1e3a61] text-sm mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 flex-shrink-0 text-[#1e3a61]/60" />
            <span className="truncate">{programm.foerdergeber}</span>
          </p>

          {/* Beschreibung */}
          <p className="text-[#1e3a61]/80 text-sm leading-relaxed mb-4 line-clamp-3">
            {cleanedDescription}
          </p>

          {/* Details */}
          <div className="flex flex-wrap gap-4 text-sm text-[#1e3a61] mb-4">
            {programm.foerdersummeText && (
              <span className="flex items-center gap-1">
                <Euro className="h-4 w-4 text-[#c9a227] flex-shrink-0" />
                <span className="truncate font-medium text-[#7a5e12]">{programm.foerdersummeText}</span>
              </span>
            )}
            {programm.bewerbungsfristText && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-[#1e3a61]/50 flex-shrink-0" />
                <span className="truncate">{programm.bewerbungsfristText}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-[#1e3a61]/50 flex-shrink-0" />
              {bundeslandText}
            </span>
          </div>

          {/* Kategorien */}
          <div className="flex flex-wrap gap-2">
            {programm.kategorien.slice(0, 5).map((kat) => (
              <span
                key={kat}
                className="px-2 py-1 rounded-md text-xs bg-[#f8f5f0] text-[#1e3a61] border border-[#ebe5dc]"
              >
                {formatKategorie(kat)}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 md:items-end flex-shrink-0">
          <Link
            href={`/foerderprogramme/${programm.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-sm whitespace-nowrap"
          >
            Details ansehen
            <ArrowRight className="h-4 w-4" />
          </Link>
          {programm.antragsLink && (
            <Link
              href={`/antrag/${programm.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-outline text-sm whitespace-nowrap"
            >
              Antrag starten
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}, (prevProps, nextProps) => {
  // Custom comparison für React.memo
  return prevProps.programm.id === nextProps.programm.id &&
         prevProps.programm.updatedAt === nextProps.programm.updatedAt;
});

export default GlassCard;
