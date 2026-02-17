import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mail, MapPin, Building2, Scale } from "lucide-react";

export const metadata = {
  title: "Impressum | EduFunds",
  description: "Impressum und rechtliche Informationen der EduFunds Plattform.",
};

export default function ImpressumPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen pt-24 pb-20 bg-[#f8f5f0]">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c9a227]/10 border border-[#c9a227]/20 mb-6">
              <Scale className="h-4 w-4 text-[#c9a227]" />
              <span className="text-sm font-medium text-[#c9a227]">Rechtliche Informationen</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#0a1628] mb-4">
              Impressum
            </h1>
            <p className="text-[#64748b] text-lg max-w-2xl mx-auto">
              Informationen gemäß § 5 TMG und § 55 Abs. 2 RStV
            </p>
          </div>

          {/* Content Cards */}
          <div className="space-y-6">
            {/* Anbieter */}
            <section className="bg-white rounded-2xl p-8 border border-[#0a1628]/8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#c9a227]/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-[#c9a227]" />
                </div>
                <h2 className="text-xl font-semibold text-[#0a1628]">Dienstanbieter</h2>
              </div>
              <div className="space-y-3 text-[#0a1628]/80 text-base">
                <p className="font-medium text-[#0a1628]">AITEMA GmbH i.G.</p>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#94a3b8] mt-0.5 shrink-0" />
                  <div>
                    <p>Prenzlauer Allee 229</p>
                    <p>10405 Berlin</p>
                    <p className="text-[#94a3b8]">Deutschland</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[#94a3b8] shrink-0" />
                  <a 
                    href="mailto:office@aitema.de" 
                    className="text-[#c9a227] hover:text-[#e4c55a] transition-colors underline underline-offset-2"
                  >
                    office@aitema.de
                  </a>
                </div>
              </div>
            </section>

            {/* Vertretung */}
            <section className="bg-white rounded-2xl p-8 border border-[#0a1628]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#0a1628] mb-4">Vertreten durch</h2>
              <p className="text-[#0a1628]/80 text-base">
                <strong className="text-[#0a1628]">Kolja Schumann</strong>, Geschäftsführer
              </p>
            </section>

            {/* Inhaltlich Verantwortlich */}
            <section className="bg-white rounded-2xl p-8 border border-[#0a1628]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#0a1628] mb-4">
                Inhaltlich verantwortlich nach § 55 Abs. 2 RStV
              </h2>
              <div className="text-[#0a1628]/80 space-y-1 text-base">
                <p className="font-medium text-[#0a1628]">Kolja Schumann</p>
                <p>Prenzlauer Allee 229</p>
                <p>10405 Berlin</p>
              </div>
            </section>

            {/* Streitschlichtung */}
            <section className="bg-white rounded-2xl p-8 border border-[#0a1628]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#0a1628] mb-4">Streitschlichtung</h2>
              <div className="text-[#0a1628]/80 space-y-4 text-base">
                <p>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
                </p>
                <a 
                  href="https://ec.europa.eu/consumers/odr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#c9a227] hover:text-[#e4c55a] transition-colors inline-flex items-center gap-2 underline underline-offset-2"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
                <p className="text-[#94a3b8] text-sm">
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                  Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </section>

            {/* Haftung für Inhalte */}
            <section className="bg-white rounded-2xl p-8 border border-[#0a1628]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#0a1628] mb-4">Haftung für Inhalte</h2>
              <p className="text-[#0a1628]/80 leading-relaxed text-base">
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten 
                nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als 
                Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde 
                Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige 
                Tätigkeit hinweisen.
              </p>
            </section>

            {/* Haftung für Links */}
            <section className="bg-white rounded-2xl p-8 border border-[#0a1628]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#0a1628] mb-4">Haftung für Links</h2>
              <p className="text-[#0a1628]/80 leading-relaxed text-base">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen 
                Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. 
                Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber 
                der Seiten verantwortlich.
              </p>
            </section>

            {/* Urheberrecht */}
            <section className="bg-white rounded-2xl p-8 border border-[#0a1628]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#0a1628] mb-4">Urheberrecht</h2>
              <p className="text-[#0a1628]/80 leading-relaxed text-base">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen 
                dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art 
                der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen 
                Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
            </section>
          </div>

          {/* Stand */}
          <p className="text-center text-[#94a3b8] text-sm mt-12">
            Stand: Februar 2026
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
