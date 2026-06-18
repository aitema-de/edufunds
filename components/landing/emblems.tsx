/**
 * Editoriale SVG-Embleme & Icons fuer die Landing-Page.
 * Portiert aus der Lovable-Vorlage (Aitema-gmbh/edufunds-hub). Alle Formen
 * nutzen `currentColor` → Farbe kommt per `text-*`-Klasse vom Aufrufer
 * (hell: text-brandy, dunkel: text-amber-...).
 */

type Props = { className?: string };

export function DigitalPaktEmblem({ className }: Props) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="40" cy="40" r="36" />
      <circle cx="40" cy="40" r="28" opacity="0.4" />
      <text x="40" y="48" textAnchor="middle" fontFamily="var(--font-serif), Georgia, serif" fontStyle="italic" fontSize="28" fill="currentColor" stroke="none">D</text>
      {[14, 22, 30, 50, 58, 66].map((x) =>
        [10, 70].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" stroke="none" />)
      )}
      {[10, 70].map((x) =>
        [22, 30, 50, 58].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" stroke="none" />)
      )}
    </svg>
  );
}

export function StartchancenEmblem({ className }: Props) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="40" cy="40" r="36" />
      <path d="M8 52 L72 52" />
      {[18, 28, 40, 52, 62].map((x, i) => {
        const h = [10, 16, 22, 18, 12][i];
        return <path key={x} d={`M${x} 52 L${x + 6} ${52 - h} L${x + 12} 52`} />;
      })}
      <circle cx="40" cy="22" r="5" />
      <path d="M40 12 L40 6 M30 18 L25 14 M50 18 L55 14 M28 24 L22 24 M52 24 L58 24" strokeWidth="1" />
    </svg>
  );
}

export function KulturEmblem({ className }: Props) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="40" cy="40" r="36" />
      <path d="M20 24 L40 30 L40 60 L20 54 Z" />
      <path d="M60 24 L40 30 L40 60 L60 54 Z" />
      <path d="M40 30 L40 60" />
      <path d="M24 32 L36 35 M24 38 L36 41 M24 44 L36 47 M44 35 L56 32 M44 41 L56 38 M44 47 L56 44" strokeWidth="0.75" opacity="0.6" />
    </svg>
  );
}

/** Lupe / Forschung & Innovation. */
export function ResearchEmblem({ className }: Props) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="40" cy="40" r="36" />
      <circle cx="35" cy="35" r="13" />
      <path d="M44 44 L56 56" strokeWidth="2" strokeLinecap="round" />
      <path d="M35 28 L35 42 M28 35 L42 35" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

/** Herz / Gesundheit & Soziales. */
export function HealthEmblem({ className }: Props) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="40" cy="40" r="36" />
      <path d="M40 54 C28 46 22 39 22 32 C22 26 27 23 32 25 C36 26 40 31 40 31 C40 31 44 26 48 25 C53 23 58 26 58 32 C58 39 52 46 40 54 Z" />
      <path d="M26 38 L34 38 L37 32 L42 46 L45 38 L54 38" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

/** Generisches Stiftungs-/Hand-Emblem. */
export function FoundationEmblem({ className }: Props) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="40" cy="40" r="36" />
      <path d="M40 22 L40 40 M40 22 L46 28 M40 22 L34 28" strokeLinecap="round" />
      <path d="M24 44 C24 52 31 58 40 58 C49 58 56 52 56 44" strokeLinecap="round" />
      <circle cx="40" cy="44" r="4" />
    </svg>
  );
}

export function BmbfMark({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M4 6 L4 20 L20 20 L20 6 Z" />
      <path d="M4 6 L12 2 L20 6" />
      <text x="12" y="16" textAnchor="middle" fontFamily="var(--font-serif), Georgia, serif" fontStyle="italic" fontSize="8" fill="currentColor" stroke="none">B</text>
    </svg>
  );
}

export function LandMark({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="12" cy="12" r="10" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const x = 12 + Math.cos(a) * 7;
        const y = 12 + Math.sin(a) * 7;
        return <circle key={i} cx={x} cy={y} r="0.9" fill="currentColor" stroke="none" />;
      })}
    </svg>
  );
}

/* ---------- Problem-Sektion Icons ---------- */

export function HourglassIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3 L18 3" />
      <path d="M6 21 L18 21" />
      <path d="M7 3 C7 8 17 10 17 12 C17 14 7 16 7 21" />
      <path d="M17 3 C17 8 7 10 7 12 C7 14 17 16 17 21" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      <circle cx="11" cy="19" r="0.5" fill="currentColor" />
      <circle cx="13" cy="19" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function StampIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="0.5" />
      <path d="M3 6 L12 14 L21 6" />
      <g transform="translate(13.5 13) rotate(-12)" opacity="0.9">
        <rect x="-4" y="-2.5" width="8" height="5" rx="0.5" strokeDasharray="1 1.5" />
        <text x="0" y="1.2" textAnchor="middle" fontFamily="var(--font-serif), Georgia, serif" fontStyle="italic" fontSize="3" fill="currentColor" stroke="none">abgel.</text>
      </g>
    </svg>
  );
}

export function MapIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6 L9 4 L15 6 L21 4 L21 18 L15 20 L9 18 L3 20 Z" />
      <path d="M9 4 L9 18" />
      <path d="M15 6 L15 20" />
      <path d="M17 9 L17 13 M17 9 L19.5 9.7 L17 11" />
      <circle cx="17" cy="13" r="0.6" fill="currentColor" />
    </svg>
  );
}

/** Mappt eine Programm-Kategorie auf ein passendes Emblem (mit Fallback). */
export function emblemForKategorie(kat?: string) {
  switch ((kat || "").toLowerCase()) {
    case "digitalisierung":
    case "ausstattung":
      return DigitalPaktEmblem;
    case "sport":
    case "bewegung":
      return StartchancenEmblem;
    case "kultur":
    case "musik":
    case "kunst":
      return KulturEmblem;
    case "gesundheit":
    case "praevention":
    case "soziales":
      return HealthEmblem;
    case "innovation":
    case "forschung":
    case "mint":
    case "chemie":
    case "naturwissenschaft":
      return ResearchEmblem;
    default:
      return FoundationEmblem;
  }
}

/** Mappt einen Foerdergeber-Typ auf eine kleine Marke. */
export function markForTyp(typ?: string) {
  return typ === "bund" ? BmbfMark : LandMark;
}
