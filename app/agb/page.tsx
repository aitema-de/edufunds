import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileText, Clock, Percent, Shield, CheckCircle, Euro } from "lucide-react";

export const metadata = {
  title: "AGB | EduFunds",
  description: "Allgemeine Geschäftsbedingungen der EduFunds Plattform.",
};

export default function AGBPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen pt-24 pb-20 bg-[#fdfdfc]">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#78350f]/10 border border-[#78350f]/20 mb-6">
              <FileText className="h-4 w-4 text-[#78350f]" />
              <span className="text-sm font-medium text-[#78350f]">Rechtliches</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#1c1917] mb-4">
              Allgemeine Geschäftsbedingungen
            </h1>
            <p className="text-[#64748b] text-lg max-w-2xl mx-auto">
              Für die Nutzung der EduFunds Plattform
            </p>
          </div>

          {/* Hinweis */}
          <div className="bg-white rounded-xl p-6 mb-8 border-l-4 border-[#78350f] shadow-sm">
            <p className="text-[#1c1917]/80 text-base leading-relaxed">
              Dies ist eine Übersetzung zur Information. Die deutsche Version ist rechtsverbindlich. 
              Diese AGB gelten für Verträge zwischen der aitema GmbH und Unternehmern im Sinne 
              des § 14 BGB.
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {/* § 1 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 1</span>
                Geltungsbereich
              </h2>
              <div className="text-[#1c1917]/80 space-y-4 leading-relaxed text-base">
                <p>
                  (1) Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen der 
                  aitema GmbH, Prenzlauer Allee 229, 10405 Berlin (nachfolgend „Anbieter") 
                  und dem Kunden (nachfolgend „Kunde") über die Erbringung von Software-as-a-Service 
                  (SaaS) und Beratungsleistungen.
                </p>
                <p>
                  (2) Diese AGB gelten ausschließlich für Unternehmer im Sinne des § 14 BGB, 
                  juristische Personen des öffentlichen Rechts und öffentlich-rechtliche 
                  Sondervermögen. Als Unternehmer gelten auch eingetragene Vereine, Verbände, 
                  Stiftungen und sonstige Organisationen, unabhängig von ihrer Gemeinnützigkeit.
                </p>
              </div>
            </section>

            {/* § 2 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 2</span>
                Vertragsschluss
              </h2>
              <p className="text-[#1c1917]/80 leading-relaxed text-base">
                Der Vertrag kommt zustande durch: (a) Unterzeichnung eines individuellen Vertrags 
                oder Angebots durch beide Parteien, (b) schriftliche Auftragsbestätigung durch den 
                Anbieter aufgrund einer Bestellung durch den Kunden, oder (c) Aktivierung des 
                Kundenkontos nach Registrierung und Bestätigung durch den Anbieter.
              </p>
            </section>

            {/* § 3 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-6 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 3</span>
                Leistungen
              </h2>

              <div className="space-y-6">
                <div className="bg-[#fdfdfc] rounded-xl p-6 border border-[#1c1917]/8">
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#78350f]" />
                    SaaS-Leistungen
                  </h3>
                  <p className="text-[#1c1917]/80 leading-relaxed text-base">
                    Der Anbieter stellt dem Kunden die vertraglich vereinbarte Software zur Nutzung 
                    über das Internet zur Verfügung. Der Anbieter garantiert eine Verfügbarkeit der 
                    Software von <strong className="text-[#1c1917]">98,5%</strong> im Jahresmittel.
                  </p>
                </div>

                <div className="bg-[#fdfdfc] rounded-xl p-6 border border-[#1c1917]/8">
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#78350f]" />
                    Beratungsleistungen
                  </h3>
                  <p className="text-[#1c1917]/80 leading-relaxed text-base">
                    Beratungsleistungen werden auf Basis eines separaten Angebots oder einer 
                    Leistungsbeschreibung erbracht. Sofern nicht anders vereinbart, werden 
                    Beratungsleistungen nach Aufwand abgerechnet.
                  </p>
                </div>

                <div className="bg-[#fdfdfc] rounded-xl p-6 border border-[#1c1917]/8">
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#78350f]" />
                    Support
                  </h3>
                  <p className="text-[#1c1917]/80 leading-relaxed text-base">
                    Der Anbieter bietet Support per E-Mail an: Montag bis Freitag, 09:00 – 17:00 
                    (MEZ/MESZ), ausgenommen gesetzliche Feiertage in Berlin.
                  </p>
                </div>
              </div>
            </section>

            {/* § 4 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 4</span>
                Pflichten des Kunden
              </h2>
              <p className="text-[#1c1917]/80 leading-relaxed text-base">
                Der Kunde stellt sicher, dass die bereitgestellten Daten vollständig und richtig sind. 
                Der Kunde ist verantwortlich für die sichere Aufbewahrung von Zugangsdaten, die 
                Einhaltung geltender Gesetze, die Rechtmäßigkeit der eingegebenen Daten sowie die 
                Einholung erforderlicher Einwilligungen Dritter.
              </p>
            </section>

            {/* § 5 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 5</span>
                Vergütung und Zahlung
              </h2>
              <div className="text-[#1c1917]/80 space-y-4 text-base">
                <div className="flex items-center gap-3">
                  <Euro className="h-5 w-5 text-[#78350f]" />
                  <p>Alle Preise verstehen sich zuzüglich gesetzlicher Umsatzsteuer.</p>
                </div>
                <p className="leading-relaxed">
                  Sofern nicht anders vereinbart, sind Rechnungen innerhalb von 14 Tagen nach 
                  Rechnungsdatum ohne Abzug zur Zahlung fällig.
                </p>
              </div>
            </section>

            {/* § 6 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 6</span>
                Vertragslaufzeit und Kündigung
              </h2>
              <div className="text-[#1c1917]/80 space-y-4 text-base">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-[#78350f] mt-0.5 shrink-0" />
                  <div>
                    <p className="leading-relaxed">
                      SaaS-Verträge haben eine Mindestlaufzeit von <strong className="text-[#1c1917]">12 Monaten</strong>. 
                      Nach Ablauf verlängert sich der Vertrag automatisch um weitere 12 Monate, 
                      sofern nicht gekündigt wird.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Percent className="h-5 w-5 text-[#78350f] mt-0.5 shrink-0" />
                  <p className="leading-relaxed">
                    SaaS-Verträge können nach der Mindestlaufzeit mit einer Kündigungsfrist von 
                    <strong className="text-[#1c1917]"> 30 Tagen</strong> zum Ende eines Kalendermonats gekündigt werden.
                  </p>
                </div>
              </div>
            </section>

            {/* § 7 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 7</span>
                Nutzungsrechte
              </h2>
              <p className="text-[#1c1917]/80 leading-relaxed text-base">
                Der Anbieter räumt dem Kunden ein einfaches, nicht übertragbares, nicht 
                unterlizenzierbares Recht ein, die bereitgestellte Software für die Dauer des 
                Vertrags zu nutzen. Der Kunde bleibt alleiniger Eigentümer aller Rechte an den 
                Kundendaten. Der Anbieter verwendet Kundendaten nicht zum Trainieren von KI-Modellen.
              </p>
            </section>

            {/* § 8 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 8</span>
                Datenschutz
              </h2>
              <div className="text-[#1c1917]/80 space-y-4 text-base">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-[#78350f] mt-0.5 shrink-0" />
                  <p className="leading-relaxed">
                    Die Parteien verpflichten sich, die geltenden Datenschutzvorschriften, insbesondere 
                    DSGVO und BDSG, einzuhalten. Soweit der Anbieter personenbezogene Daten im Auftrag 
                    des Kunden verarbeitet, schließen die Parteien einen Auftragsverarbeitungsvertrag 
                    gemäß Art. 28 DSGVO ab.
                  </p>
                </div>
                <p className="text-base">
                  → <a href="/datenschutz" className="text-[#78350f] hover:text-[#78350f] transition-colors underline underline-offset-2">Zur Datenschutzerklärung</a>
                </p>
              </div>
            </section>

            {/* § 9 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 9</span>
                Gewährleistung
              </h2>
              <p className="text-[#1c1917]/80 leading-relaxed text-base">
                Der Anbieter gewährleistet, dass die Software im Wesentlichen der vereinbarten 
                Leistungsbeschreibung entspricht. Mängel werden innerhalb angemessener Frist 
                beseitigt. Gewährleistungsansprüche verjähren 12 Monate nach Lieferung oder 
                Bereitstellung der mangelhaften Leistung.
              </p>
            </section>

            {/* § 10 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 10</span>
                Haftung
              </h2>
              <div className="text-[#1c1917]/80 space-y-4 leading-relaxed text-base">
                <p>
                  Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit, für 
                  Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie 
                  nach den Vorschriften des Produkthaftungsgesetzes.
                </p>
                <p>
                  Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die 
                  Haftung auf die Summe der Vergütung begrenzt, die der Kunde in den letzten 
                  12 Monaten gezahlt hat.
                </p>
              </div>
            </section>

            {/* § 11-14 */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#78350f] font-bold">§ 11-14</span>
                Weitere Bestimmungen
              </h2>
              <div className="text-[#1c1917]/80 space-y-3 text-base">
                <p><strong className="text-[#1c1917]">Verschwiegenheit:</strong> 3 Jahre nach Vertragsende</p>
                <p><strong className="text-[#1c1917]">Höhere Gewalt:</strong> Umfasst Pandemien, Cyberangriffe</p>
                <p><strong className="text-[#1c1917]">Änderungen:</strong> 6 Wochen Vorankündigung</p>
                <p><strong className="text-[#1c1917]">Anwendbares Recht:</strong> Deutsches Recht, unter Ausschluss des UN-Kaufrechts</p>
                <p><strong className="text-[#1c1917]">Gerichtsstand:</strong> Berlin</p>
              </div>
            </section>

            {/* Anbieter */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4">Anbieter</h2>
              <div className="text-[#1c1917]/80 space-y-2 text-base">
                <p className="font-medium text-[#1c1917]">aitema GmbH</p>
                <p>Prenzlauer Allee 229</p>
                <p>10405 Berlin</p>
                <p className="text-[#1c1917]/50">Deutschland</p>
                <p className="pt-2">
                  E-Mail:{" "}
                  <a 
                    href="mailto:office@aitema.de" 
                    className="text-[#78350f] hover:text-[#78350f] transition-colors underline underline-offset-2"
                  >
                    office@aitema.de
                  </a>
                </p>
              </div>
            </section>
          </div>

          {/* Stand */}
          <p className="text-center text-[#64748b] text-sm mt-12">
            Stand: Februar 2026
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
