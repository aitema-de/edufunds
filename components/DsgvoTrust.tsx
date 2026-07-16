import { Globe, ShieldCheck, MapPin, Lock } from "lucide-react";

/**
 * DSGVO-Trust-Baustein — kommuniziert die datenschutzkonforme Nutzung der KI
 * (EU-Verarbeitung, Daten in Deutschland, kein Training, Datenminimierung).
 * Dezent im Design-System gehalten. Zwei Varianten:
 *   - "full"    → Sektion mit drei Punkten (Landing/Marketing)
 *   - "compact" → schlanke Leiste (Plattform, z. B. Wizard-Start)
 */

const POINTS = [
  {
    icon: Globe,
    title: "KI aus der EU",
    text: "Antragstexte erzeugt ein europäischer KI-Anbieter (Mistral, Frankreich) — kein Transfer in Drittländer.",
  },
  {
    icon: MapPin,
    title: "Daten in Deutschland",
    text: "Ihre Konto- und Antragsdaten liegen auf Servern in Deutschland (Hetzner).",
  },
  {
    icon: ShieldCheck,
    title: "Kein Training, gefiltert",
    text: "Ihre Eingaben trainieren keine KI-Modelle. Personenbezogene Angaben werden vor der Verarbeitung automatisch herausgefiltert.",
  },
];

export function DsgvoTrust({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div
        className={`flex items-start gap-3 rounded-xl border border-[#1a4d4d]/15 bg-[#1a4d4d]/[0.04] px-4 py-3 ${className}`}
      >
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#1a4d4d]" />
        <p className="text-xs leading-relaxed text-[#57534e]">
          <strong className="font-semibold text-[#1c1917]">DSGVO-konform:</strong>{" "}
          KI-Verarbeitung in der EU, Ihre Daten auf Servern in Deutschland, kein Training mit Ihren
          Eingaben. Personenbezogene Angaben werden vor der Verarbeitung herausgefiltert.{" "}
          <a
            href="/datenschutz"
            className="font-medium text-[#1a4d4d] underline underline-offset-2 hover:text-[#1e3d32]"
          >
            Mehr dazu
          </a>
        </p>
      </div>
    );
  }

  return (
    <section className="py-16 lg:py-20" style={{ backgroundColor: "#fdfdfc" }}>
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <span className="mb-3 inline-block font-mono text-xs uppercase tracking-widest text-[#1a4d4d]">
            Datenschutz
          </span>
          <h2 className="font-serif text-2xl text-[#1c1917] md:text-3xl">
            KI-Förderanträge — <span className="text-[#1e3d32]">DSGVO-konform</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#57534e]">
            Wir verarbeiten Schul- und Projektdaten verantwortungsvoll: in der EU, ohne
            Drittland-Transfer und ohne dass Ihre Eingaben KI-Modelle trainieren.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {POINTS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-[#1c1917]/8 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(10,22,40,0.05)]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#1a4d4d]/20 bg-[#1a4d4d]/10">
                <p.icon className="h-5 w-5 text-[#1a4d4d]" />
              </div>
              <h3 className="mb-2 font-serif text-lg text-[#1c1917]">{p.title}</h3>
              <p className="text-sm leading-relaxed text-[#57534e]">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
