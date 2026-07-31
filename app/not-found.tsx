import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Search, ArrowLeft, Home, HelpCircle } from "lucide-react";
import Link from "next/link";
import foerderprogrammeData from "@/data/foerderprogramme.json";

export const metadata = {
  title: "Seite nicht gefunden",
  description: "Die gesuchte Seite existiert nicht. Entdecken Sie Förderprogramme für Schulen.",
};

/**
 * Vorschläge auf der 404-Seite.
 *
 * Hier stand bis zum 30.07.2026:
 *
 *     foerderprogrammeData.sort(() => 0.5 - Math.random()).slice(0, 3)
 *
 * Zwei Fehler in einer Zeile, beide mit Wirkung weit außerhalb dieser Seite:
 *
 * 1. `.sort()` arbeitet IN PLACE — und zwar auf dem importierten Katalog-Array
 *    selbst, nicht auf einer Kopie. Im Server-Prozess teilen sich ALLE Module
 *    dasselbe Objekt. Ein einziger 404-Aufruf hat damit die Reihenfolge des
 *    Katalogs für den restlichen Lebenszyklus des Containers zufällig
 *    durcheinandergeworfen — für die Programmliste, das Archiv und jede andere
 *    Stelle, die sich auf die Katalog-Reihenfolge stützt. Nachgewiesen über die
 *    Archiv-Seite: nach einem 404-Aufruf wich die serverseitig gerenderte
 *    Reihenfolge von der clientseitigen ab, was React beim Hydrieren mit
 *    Fehler #418 abbrechen ließ.
 *
 * 2. `() => 0.5 - Math.random()` ist kein gültiger Vergleicher (nicht
 *    transitiv, nicht reproduzierbar) und liefert ohnehin keine gleichverteilte
 *    Mischung. Zusätzlich läuft `Math.random()` beim Server-Rendern und beim
 *    Hydrieren getrennt — dieselbe Zeile hätte also auch auf der 404-Seite
 *    selbst einen Hydration-Mismatch erzeugt.
 *
 * Ersatz: eine stabile, deterministische Auswahl. Sie ist bei jedem Aufruf
 * gleich, mutiert nichts und kann serverseitig wie clientseitig nur dasselbe
 * Ergebnis haben. Für eine Vorschlagsliste auf einer Fehlerseite ist Zufall
 * ohnehin kein Wert an sich — Verlässlichkeit schon.
 */
const VORSCHLAEGE = foerderprogrammeData
  .filter((p) => p.status === "aktiv" && p.kiAntragGeeignet)
  .slice(0, 3);

export default function NotFound() {
  const randomPrograms = VORSCHLAEGE;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-20" style={{ backgroundColor: '#fdfdfc' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            {/* 404 */}
            <div 
              className="text-9xl font-bold mb-4"
              style={{ 
                color: '#1c1917',
                opacity: 0.15
              }}
            >
              404
            </div>

            {/* Title */}
            <h1 
              className="text-3xl font-bold mb-4"
              style={{ color: '#1c1917' }}
            >
              Seite nicht gefunden
            </h1>

            {/* Description */}
            <p 
              className="mb-8 max-w-md mx-auto"
              style={{ color: '#64748b' }}
            >
              Die von Ihnen gesuchte Seite existiert leider nicht oder wurde verschoben.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #1e3d32 0%, #1e3d32 100%)',
                  color: '#1c1917'
                }}
              >
                <Home className="w-5 h-5" />
                Zur Startseite
              </Link>
              
              <Link
                href="/foerderprogramme"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border font-medium transition-all hover:shadow-md"
                style={{ 
                  borderColor: '#1e3d32',
                  color: '#1e3d32',
                  backgroundColor: 'transparent'
                }}
              >
                <Search className="w-5 h-5" />
                Programme durchsuchen
              </Link>
              
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border font-medium transition-all hover:shadow-md"
                style={{ 
                  borderColor: '#1c1917',
                  color: '#1c1917',
                  backgroundColor: 'transparent'
                }}
              >
                <HelpCircle className="w-5 h-5" />
                Hilfe
              </Link>
            </div>

            {/* Alternative Programme */}
            <div className="text-left">
              <h2 
                className="text-xl font-semibold mb-6 text-center"
                style={{ color: '#1c1917' }}
              >
                Vielleicht interessiert Sie das:
              </h2>
              
              <div className="grid md:grid-cols-3 gap-4">
                {randomPrograms.map((programm) => (
                  <Link
                    key={programm.id}
                    href={`/foerderprogramme/${programm.id}`}
                    className="p-4 rounded-xl border transition-all group hover:shadow-md"
                    style={{ 
                      backgroundColor: 'white',
                      borderColor: 'rgba(28, 25, 23, 0.08)'
                    }}
                  >
                    <span 
                      className="text-xs font-medium mb-2 block"
                      style={{ color: '#1e3d32' }}
                    >
                      {programm.foerdergeberTyp.toUpperCase()}
                    </span>
                    <h3 
                      className="font-medium line-clamp-2 transition-colors"
                      style={{ color: '#1c1917' }}
                    >
                      {programm.name}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
