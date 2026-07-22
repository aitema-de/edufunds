import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  HomePageContent,
  type LandingProgramme,
  type LandingStats,
} from "@/components/landing/HomePageContent";
import { PROGRAMM_COUNT_LABEL } from "@/lib/programm-count";
import { formatKategorie } from "@/lib/kategorie-labels";
import { isProgrammAbgelaufen } from "@/lib/programm-status";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import foerderprogramme from "@/data/foerderprogramme.json";

/* Homepage = redesignte Marketing-Landing im Editorial-Archival-Layout
   (Vorlage: Lovable-Landing Aitema-gmbh/edufunds-hub). Server-Component:
   echte Katalog-Zahlen + kuratierte Beispielprogramme werden als Props an
   die Client-Sektionen gereicht — der 297-KB-JSON bleibt serverseitig. */

type Programm = (typeof foerderprogramme)[number];

function buildStats(): LandingStats {
  // Nur die Finder-sichtbaren Programme zaehlen — dieselbe Basis wie
  // PROGRAMM_COUNT_LABEL (lib/programm-status.ts#isProgrammAbgelaufen).
  // Vorher zaehlte hier der GESAMTKATALOG inkl. archivierter/geschlossener
  // Eintraege: Donut + Quellen-Kacheln summierten auf 178 Programme direkt
  // neben der „130+"-Angabe.
  const sichtbar = (foerderprogramme as unknown as Foerderprogramm[]).filter(
    (p) => !isProgrammAbgelaufen(p)
  );
  const by = (typ: string) => sichtbar.filter((p) => p.foerdergeberTyp === typ).length;
  const bundeslaender = new Set<string>();
  sichtbar.forEach((p) => (p.bundeslaender || []).forEach((b) => bundeslaender.add(b)));
  // "bundesweit" zaehlt nicht als einzelnes Land
  bundeslaender.delete("bundesweit");
  const bund = by("bund");
  const land = by("land");
  const stiftung = by("stiftung");
  const eu = by("eu");
  return {
    total: PROGRAMM_COUNT_LABEL,
    bund,
    land,
    stiftung,
    eu,
    // Rest (sonstige/verband/uni/…), damit die Donut-Summe exakt dem
    // sichtbaren Katalog entspricht statt nur einem Ausschnitt.
    weitere: Math.max(0, sichtbar.length - bund - land - stiftung - eu),
    bundeslaender: Math.min(16, bundeslaender.size || 16),
  };
}

/** Kuratierte, bekannte Programme zuerst; danach mit gut gefuellten Eintraegen auffuellen. */
function buildFeatured(): LandingProgramme[] {
  const curatedNames = [
    "DigitalPakt Schule 2.0",
    "Deutscher Schulpreis",
    "Gesunde Schule",
    "Sportförderung Niedersachsen",
    "Mercator",
    "Chemie-Fonds",
  ];
  const toCard = (p: Programm): LandingProgramme => ({
    name: p.name,
    geber: p.foerdergeber,
    typ: p.foerdergeberTyp,
    kat: p.kategorien && p.kategorien[0] ? formatKategorie(p.kategorien[0]) : undefined,
    summe: p.foerdersummeText || undefined,
    frist: p.bewerbungsfristText || undefined,
    kurz: p.kurzbeschreibung || undefined,
  });

  const picked: Programm[] = [];
  const seen = new Set<string>();
  for (const needle of curatedNames) {
    const hit = foerderprogramme.find(
      (p) => !seen.has(p.id) && p.name.toLowerCase().includes(needle.toLowerCase())
    );
    if (hit) {
      picked.push(hit);
      seen.add(hit.id);
    }
  }
  // Auffuellen auf 6 mit gut gefuellten, KI-geeigneten Eintraegen
  for (const p of foerderprogramme) {
    if (picked.length >= 6) break;
    if (seen.has(p.id)) continue;
    if (p.kiAntragGeeignet && p.kurzbeschreibung && p.foerdersummeText) {
      picked.push(p);
      seen.add(p.id);
    }
  }
  return picked.slice(0, 6).map(toCard);
}

export default function Home() {
  const stats = buildStats();
  const programme = buildFeatured();

  return (
    <>
      <Header />
      <main id="main-content">
        <HomePageContent stats={stats} programme={programme} />
      </main>
      <Footer />
    </>
  );
}
