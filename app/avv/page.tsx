import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Scale, ShieldCheck, Server, Mail } from "lucide-react";

export const metadata = {
  title: "Auftragsverarbeitung & Subprozessoren | EduFunds",
  description:
    "Auftragsverarbeitungsvertrag (Art. 28 DSGVO) und vollständige Liste der Subprozessoren von EduFunds.",
};

/** Subprozessoren — Stand geprüft am 13.07.2026 gegen den real eingesetzten Stack. */
const SUBPROZESSOREN = [
  {
    name: "Hetzner Online GmbH",
    sitz: "Deutschland",
    zweck: "Hosting, Datenbank",
    ort: "Deutschland",
    grundlage: "EU — kein Drittlandtransfer",
  },
  {
    name: "Mistral AI SAS",
    sitz: "Frankreich",
    zweck: "KI-Textgenerierung (Sprachmodell)",
    ort: "EU",
    grundlage: "EU — kein Drittlandtransfer; kein Training mit Ihren Daten",
  },
  {
    name: "Stripe Payments Europe, Ltd.",
    sitz: "Irland (EU)",
    zweck: "Zahlungsabwicklung",
    ort: "EU / USA",
    grundlage: "EU-US Data Privacy Framework bzw. Standardvertragsklauseln",
  },
  {
    name: "Haufe-Lexware GmbH & Co. KG (Lexware Office)",
    sitz: "Deutschland",
    zweck: "Rechnungserstellung",
    ort: "Deutschland",
    grundlage: "EU — kein Drittlandtransfer",
  },
  {
    name: "Plus Five Five, Inc. (Resend)",
    sitz: "USA",
    zweck: "Versand transaktionaler E-Mails",
    ort: "USA",
    grundlage: "EU-US Data Privacy Framework bzw. Standardvertragsklauseln",
  },
];

export default function AvvPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen pt-24 pb-20 bg-[#fdfdfc]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e3d32]/10 border border-[#1e3d32]/20 mb-6">
              <Scale className="h-4 w-4 text-[#1e3d32]" />
              <span className="text-sm font-medium text-[#1e3d32]">Rechtliche Informationen</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#1c1917] mb-4">
              Auftragsverarbeitung &amp; Subprozessoren
            </h1>
            <p className="text-[#64748b] text-lg max-w-2xl mx-auto">
              Wer Ihre Daten in unserem Auftrag verarbeitet — und wie Sie den
              Auftragsverarbeitungsvertrag nach Art. 28 DSGVO erhalten.
            </p>
          </div>

          <div className="space-y-6">
            {/* Wann ein AVV nötig ist */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#1e3d32]/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-[#1e3d32]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1c1917]">
                  Auftragsverarbeitungsvertrag (AVV)
                </h2>
              </div>
              <div className="space-y-4 text-[#1c1917]/80 leading-relaxed text-base">
                <p>
                  Wenn Sie EduFunds als Einrichtung nutzen (Förderverein, Schule oder
                  Schulträger) und dabei personenbezogene Daten eingeben, verarbeiten wir diese
                  in Ihrem Auftrag. Für diesen Fall stellen wir Ihnen einen
                  Auftragsverarbeitungsvertrag nach Art. 28 DSGVO zur Verfügung.
                </p>
                <p>
                  Fordern Sie ihn formlos per E-Mail an — wir senden Ihnen die aktuelle Fassung
                  zur Unterzeichnung zu:
                </p>
                <p>
                  <a
                    href="mailto:office@aitema.de?subject=AVV%20EduFunds"
                    className="inline-flex items-center gap-2 text-[#1e3d32] hover:text-[#2a5244] transition-colors underline underline-offset-2 font-medium"
                  >
                    <Mail className="h-4 w-4" />
                    office@aitema.de
                  </a>
                </p>
                <p className="text-sm text-[#64748b]">
                  Hinweis: Unser Produkt ist so gebaut, dass für die Antragserstellung möglichst
                  keine personenbezogenen Daten nötig sind. Freitexte werden vor der Übermittlung
                  an das Sprachmodell automatisch von Identifikatoren bereinigt. Näheres in der{" "}
                  <Link
                    href="/datenschutz"
                    className="text-[#1e3d32] hover:text-[#2a5244] underline underline-offset-2"
                  >
                    Datenschutzerklärung
                  </Link>
                  .
                </p>
              </div>
            </section>

            {/* Subprozessoren */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#1e3d32]/20 flex items-center justify-center">
                  <Server className="h-5 w-5 text-[#1e3d32]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1c1917]">Eingesetzte Subprozessoren</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#1c1917]/10">
                      <th className="py-3 pr-4 font-semibold text-[#1c1917]">Dienstleister</th>
                      <th className="py-3 pr-4 font-semibold text-[#1c1917]">Zweck</th>
                      <th className="py-3 pr-4 font-semibold text-[#1c1917]">Datenstandort</th>
                      <th className="py-3 font-semibold text-[#1c1917]">Grundlage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SUBPROZESSOREN.map((s) => (
                      <tr key={s.name} className="border-b border-[#1c1917]/6 align-top">
                        <td className="py-4 pr-4">
                          <span className="font-medium text-[#1c1917]">{s.name}</span>
                          <span className="block text-[#64748b]">{s.sitz}</span>
                        </td>
                        <td className="py-4 pr-4 text-[#1c1917]/80">{s.zweck}</td>
                        <td className="py-4 pr-4 text-[#1c1917]/80">{s.ort}</td>
                        <td className="py-4 text-[#1c1917]/80">{s.grundlage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-6 text-sm text-[#64748b] leading-relaxed">
                Die KI-Verarbeitung findet ausschließlich in der EU statt (Mistral AI, Paris).
                Wir setzen weder ein Content Delivery Network noch Web-Analyse- oder
                Tracking-Dienste ein. Über Änderungen an dieser Liste informieren wir
                AVV-Kunden vorab.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4">Öffentliche Schulen</h2>
              <p className="text-[#1c1917]/80 leading-relaxed text-base">
                Öffentliche Schulen unterliegen zusätzlich dem Schul- und Landesdatenschutzrecht
                ihres Bundeslandes. Bitte prüfen Sie vor dem Einsatz, ob eine Freigabe durch die
                Schulaufsicht oder den Schulträger erforderlich ist. Wir unterstützen Sie dabei
                mit den nötigen Unterlagen.
              </p>
            </section>
          </div>

          <p className="mt-10 text-center text-sm text-[#64748b]">Stand: Juli 2026</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
