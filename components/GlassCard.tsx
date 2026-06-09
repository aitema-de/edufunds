import { Building2, Euro, Calendar, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Foerderprogramm } from "@/lib/foerderSchema";

interface GlassCardProps {
  programm: Foerderprogramm;
}

export function GlassCard({ programm }: GlassCardProps) {
  // Icon basierend auf Fördergeber-Typ
  const getTypeIcon = () => {
    switch (programm.foerdergeberTyp) {
      case "bund":
        return (
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        );
      case "land":
        return (
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        );
      case "stiftung":
        return (
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        );
      case "eu":
        return (
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-slate-400" />
          </div>
        );
    }
  };

  // Typ-Label
  const getTypeLabel = () => {
    switch (programm.foerdergeberTyp) {
      case "bund":
        return "Bundesmittel";
      case "land":
        return "Landesmittel";
      case "stiftung":
        return "Stiftung";
      case "eu":
        return "EU-Programm";
      default:
        return programm.foerdergeberTyp.toUpperCase();
    }
  };

  // Typ-Farbe
  const getTypeColor = () => {
    switch (programm.foerdergeberTyp) {
      case "bund":
        return "bg-cyan-500/20 text-cyan-400";
      case "land":
        return "bg-purple-500/20 text-purple-400";
      case "stiftung":
        return "bg-green-500/20 text-green-400";
      case "eu":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <article className="glass rounded-2xl p-6 md:p-8 hover:border-orange-500/30 transition-all group">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          {/* Header mit Icon und Badges */}
          <div className="flex items-start gap-4 mb-4">
            {getTypeIcon()}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor()}`}>
                  {getTypeLabel()}
                </span>
                {programm.kiAntragGeeignet && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
                    KI-geeignet
                  </span>
                )}
                {programm.status === "aktiv" && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                    Aktiv
                  </span>
                )}
              </div>
              
              {/* Titel */}
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-orange-400 transition-colors">
                {programm.name}
              </h3>
            </div>
          </div>

          {/* Fördergeber */}
          <p className="text-slate-400 text-sm mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            {programm.foerdergeber}
          </p>

          {/* Beschreibung - bereinigt */}
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            {programm.kurzbeschreibung?.replace(/für alle schulformen/gi, "").replace(/für alle schulen/gi, "")
              .replace(/\s+/g, " ").trim()}
          </p>

          {/* Details */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
            {programm.foerdersummeText && (
              <span className="flex items-center gap-1">
                <Euro className="h-4 w-4 text-slate-500 flex-shrink-0" />
                {programm.foerdersummeText}
              </span>
            )}
            {programm.bewerbungsfristText && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
                {programm.bewerbungsfristText}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0" />
              {programm.bundeslaender.includes("alle")
                ? "Alle Bundesländer"
                : `${programm.bundeslaender.length} Bundesländer`}
            </span>
          </div>

          {/* Kategorien */}
          <div className="flex flex-wrap gap-2">
            {programm.kategorien.slice(0, 5).map((kat) => (
              <span
                key={kat}
                className="px-2 py-1 rounded-md text-xs bg-slate-800 text-slate-400"
              >
                {kat}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 md:items-end">
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
}
