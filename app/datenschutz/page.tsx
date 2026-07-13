import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Shield, Server, Mail, Lock, UserCheck, FileText, Sparkles } from "lucide-react";

export const metadata = {
  title: "Datenschutz | EduFunds",
  description: "Datenschutzerklärung der EduFunds Plattform gemäß DSGVO.",
};

export default function DatenschutzPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen pt-24 pb-20 bg-[#fdfdfc]">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e3d32]/10 border border-[#1e3d32]/20 mb-6">
              <Shield className="h-4 w-4 text-[#1e3d32]" />
              <span className="text-sm font-medium text-[#1e3d32]">DSGVO-konform</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#1c1917] mb-4">
              Datenschutz
            </h1>
            <p className="text-[#64748b] text-lg max-w-2xl mx-auto">
              Datenschutzerklärung gemäß der Datenschutz-Grundverordnung (DSGVO)
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {/* Überblick */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-2xl font-semibold text-[#1c1917] mb-6">1. Datenschutz auf einen Blick</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3">Allgemeine Hinweise</h3>
                  <p className="text-[#1c1917]/80 leading-relaxed text-base">
                    Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren 
                    personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene 
                    Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3">Datenerfassung auf dieser Website</h3>
                  <p className="text-[#1c1917]/80 leading-relaxed text-base mb-3">
                    <strong className="text-[#1c1917]">Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong>
                  </p>
                  <p className="text-[#1c1917]/80 leading-relaxed text-base">
                    Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. 
                    Dessen Kontaktdaten können Sie dem Abschnitt „Verantwortlicher" in dieser 
                    Datenschutzerklärung entnehmen.
                  </p>
                </div>
              </div>
            </section>

            {/* Verantwortlicher */}
            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#1e3d32]/20 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-[#1e3d32]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1c1917]">2. Verantwortlicher</h2>
              </div>

              <div className="text-[#1c1917]/80 space-y-4 text-base">
                <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
                <div className="bg-white border border-[#1c1917]/8 shadow-sm rounded-xl p-6 space-y-2">
                  <p className="font-medium text-[#1c1917]">aitema GmbH</p>
                  <p>Prenzlauer Allee 229</p>
                  <p>10405 Berlin</p>
                  <p className="text-[#475569]">Deutschland</p>
                  <div className="pt-2">
                    <p className="text-[#475569]">Vertreten durch:</p>
                    <p className="font-medium text-[#1c1917]">Kolja Schumann (Geschäftsführer)</p>
                  </div>
                  <div className="pt-2">
                    <p className="text-[#475569]">E-Mail:</p>
                    <a 
                      href="mailto:office@aitema.de"
                      className="text-[#1e3d32] hover:text-[#2a5244] transition-colors underline underline-offset-2"
                    >
                      office@aitema.de
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Hosting */}
            <section className="bg-white border border-[#1c1917]/8 shadow-sm rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#1e3d32]/20 flex items-center justify-center">
                  <Server className="h-5 w-5 text-[#1e3d32]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1c1917]">3. Hosting und Content Delivery Network</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3">Hetzner</h3>
                  <p className="text-[#1c1917]/80 leading-relaxed text-base">
                    Wir hosten unsere Website bei der Hetzner Online GmbH, Industriestr. 25, 
                    91710 Gunzenhausen, Deutschland. Die Server stehen ausschließlich in Deutschland.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3">Kein CDN, keine Web-Analyse</h3>
                  <p className="text-[#1c1917]/80 leading-relaxed text-base">
                    Wir setzen kein Content Delivery Network und keine Web-Analyse- oder
                    Tracking-Dienste ein. Ihre Anfragen erreichen unseren Server in Deutschland
                    direkt. Schriftarten liefern wir von unserem eigenen Server aus — es werden
                    also auch dafür keine Daten an Dritte übertragen.
                  </p>
                </div>
              </div>
            </section>

            {/* Kontaktformular */}
            <section className="bg-white border border-[#1c1917]/8 shadow-sm rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#1e3d32]/20 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-[#1e3d32]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1c1917]">4. Kontaktformular</h2>
              </div>

              <div className="text-[#1c1917]/80 space-y-4 text-base">
                <p className="leading-relaxed">
                  Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben 
                  aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten 
                  zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns 
                  gespeichert.
                </p>

                <div>
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3">E-Mail-Versand via Resend</h3>
                  <p className="leading-relaxed text-base">
                    Für den Versand von E-Mails über das Kontaktformular nutzen wir den Dienst 
                    Resend (Resend, Inc., San Francisco, CA, USA). Resend ist unter dem EU-US 
                    Data Privacy Framework zertifiziert.
                  </p>
                </div>
              </div>
            </section>

            {/* KI-gestützte Antragserstellung */}
            <section className="bg-white border border-[#1c1917]/8 shadow-sm rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#1e3d32]/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-[#1e3d32]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1c1917]">5. KI-gestützte Antragserstellung</h2>
              </div>

              <div className="text-[#1c1917]/80 space-y-4 text-base leading-relaxed">
                <p>
                  Für die Erstellung von Antragstexten und Finanzplänen verarbeiten wir die von Ihnen
                  eingegebenen Schul- und Projektangaben mithilfe eines spezialisierten
                  KI-Sprachmodells. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des mit
                  Ihnen geschlossenen Vertrags).
                </p>

                <div>
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3">
                    KI-Anbieter (Mistral AI, EU/EWR)
                  </h3>
                  <p>
                    Als KI-Dienstleister setzen wir die Mistral AI SAS, 15 rue des Halles, 75001 Paris,
                    Frankreich, ein. Die Verarbeitung erfolgt innerhalb des Europäischen
                    Wirtschaftsraums (Rechenzentren in Schweden und Norwegen); eine Übermittlung in
                    ein Drittland findet nicht statt. Mistral ist unser Auftragsverarbeiter im Sinne
                    von Art. 28 DSGVO; ein Vertrag zur Auftragsverarbeitung liegt vor. Die
                    eingesetzten Subprozessoren führen wir unter{" "}
                    <a
                      href="/avv"
                      className="text-[#1e3d32] hover:text-[#2a5244] transition-colors underline underline-offset-2"
                    >
                      AVV &amp; Subprozessoren
                    </a>{" "}
                    auf. Ihre Eingaben und die erzeugten Ausgaben werden vom Anbieter
                    <strong className="text-[#1c1917]"> nicht zum Training von KI-Modellen</strong> verwendet.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3">Datenminimierung</h3>
                  <p>
                    An die KI werden ausschließlich institutions- und projektbezogene Angaben
                    übermittelt. Wir bitten Sie, in den Eingabefeldern{" "}
                    <strong className="text-[#1c1917]">keine personenbezogenen Daten</strong> (z. B. Namen von
                    Schülern oder Einzelpersonen, Kontaktdaten) anzugeben. Technische Identifikatoren
                    wie E-Mail-Adressen, Telefonnummern und IBANs werden vor der Übermittlung an die KI
                    automatisch entfernt.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[#1c1917] mb-3">Hinweis zu KI-Inhalten</h3>
                  <p>
                    Die von der KI erzeugten Texte und Finanzpläne sind maschinell generierte Vorschläge
                    und vor einer Einreichung von Ihnen inhaltlich zu prüfen. Eine Förderzusage ist mit
                    der Nutzung nicht verbunden.
                  </p>
                </div>
              </div>
            </section>

            {/* Ihre Rechte */}
            <section className="bg-white border border-[#1c1917]/8 shadow-sm rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#1e3d32]/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-[#1e3d32]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1c1917]">6. Ihre Rechte</h2>
              </div>

              <p className="text-[#1c1917]/80 mb-4 text-base">Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
              
              <ul className="space-y-3 text-[#1c1917]/80 text-base">
                <li className="flex items-start gap-3">
                  <span className="text-[#1e3d32] mt-1">•</span>
                  <span>Recht auf Auskunft (Art. 15 DSGVO)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#1e3d32] mt-1">•</span>
                  <span>Recht auf Berichtigung (Art. 16 DSGVO)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#1e3d32] mt-1">•</span>
                  <span>Recht auf Löschung (Art. 17 DSGVO)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#1e3d32] mt-1">•</span>
                  <span>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#1e3d32] mt-1">•</span>
                  <span>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</span>
                </li>
              </ul>

              <p className="text-[#1c1917]/80 mt-4 text-base">
                Zur Ausübung Ihrer Rechte kontaktieren Sie bitte:{" "}
                <a 
                  href="mailto:office@aitema.de"
                  className="text-[#1e3d32] hover:text-[#2a5244] transition-colors underline underline-offset-2"
                >
                  office@aitema.de
                </a>
              </p>
            </section>

            {/* SSL */}
            <section className="bg-white border border-[#1c1917]/8 shadow-sm rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#1e3d32]/20 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-[#1e3d32]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1c1917]">7. SSL-/TLS-Verschlüsselung</h2>
              </div>

              <p className="text-[#1c1917]/80 leading-relaxed text-base">
                Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher 
                Inhalte eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen 
                Sie daran, dass die Adresszeile des Browsers von „http://" auf „https://" wechselt 
                und an dem Schloss-Symbol in Ihrer Browserzeile.
              </p>
            </section>
          </div>

          {/* Stand */}
          <p className="text-center text-[#64748b] text-sm mt-12">
            Stand: Juni 2026
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
