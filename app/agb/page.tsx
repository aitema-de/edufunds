import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";
import { EINZELPREIS_CENTS, formatEur } from "@/lib/payments/packs";

export const metadata = {
  title: "AGB | EduFunds",
  description: "Allgemeine Geschäftsbedingungen der EduFunds Plattform.",
};

/**
 * Paragraph-Baustein — hält die 14 Abschnitte optisch identisch.
 */
function Paragraf({
  nr,
  titel,
  children,
}: {
  nr: string;
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
      <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
        <span className="text-[#1e3d32] font-bold">{nr}</span>
        {titel}
      </h2>
      <div className="text-[#1c1917]/80 space-y-4 leading-relaxed text-base">{children}</div>
    </section>
  );
}

export default function AGBPage() {
  const einzelpreis = formatEur(EINZELPREIS_CENTS);

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen pt-24 pb-20 bg-[#fdfdfc]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e3d32]/10 border border-[#1e3d32]/20 mb-6">
              <FileText className="h-4 w-4 text-[#1e3d32]" />
              <span className="text-sm font-medium text-[#1e3d32]">Rechtliches</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#1c1917] mb-4">
              Allgemeine Geschäftsbedingungen
            </h1>
            <p className="text-[#64748b] text-lg max-w-2xl mx-auto">
              Für die Nutzung der EduFunds Plattform
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 mb-8 border-l-4 border-[#1e3d32] shadow-sm">
            <p className="text-[#1c1917]/80 text-base leading-relaxed">
              Diese AGB gelten für Verträge zwischen der aitema GmbH und Unternehmern im Sinne
              des § 14 BGB — insbesondere Fördervereinen, Schulen und Schulträgern. Ein
              Vertragsschluss mit Verbrauchern findet nicht statt.
            </p>
          </div>

          <div className="space-y-8">
            <Paragraf nr="§ 1" titel="Geltungsbereich">
              <p>
                (1) Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen der
                aitema GmbH, Prenzlauer Allee 229, 10405 Berlin (nachfolgend „Anbieter") und dem
                Kunden über die Nutzung der Plattform EduFunds.
              </p>
              <p>
                (2) Diese AGB gelten ausschließlich für Unternehmer im Sinne des § 14 BGB,
                juristische Personen des öffentlichen Rechts und öffentlich-rechtliche
                Sondervermögen. Als Unternehmer gelten auch eingetragene Vereine (insbesondere
                Fördervereine), Verbände, Stiftungen und sonstige Organisationen, unabhängig von
                ihrer Gemeinnützigkeit. Ein Vertragsschluss mit Verbrauchern im Sinne des § 13
                BGB findet nicht statt; der Kunde bestätigt beim Kauf, dass er im Namen einer
                Einrichtung handelt.
              </p>
              <p>
                (3) Abweichende Bedingungen des Kunden werden nicht Vertragsbestandteil, es sei
                denn, der Anbieter stimmt ihrer Geltung ausdrücklich in Textform zu.
              </p>
            </Paragraf>

            <Paragraf nr="§ 2" titel="Leistungsgegenstand">
              <p>
                (1) Der Anbieter stellt über EduFunds eine Software zur Verfügung, mit der Kunden
                Förderprogramme recherchieren und Entwürfe von Förderanträgen mit Unterstützung
                künstlicher Intelligenz erstellen können.
              </p>
              <p>
                (2) Die Recherche in der Förderdatenbank ist kostenfrei nutzbar. Kostenpflichtig
                ist die Erstellung und Freischaltung eines KI-generierten Antragsentwurfs.
              </p>
              <p>
                (3) Der Anbieter reicht keine Anträge ein und tritt nicht gegenüber Fördergebern
                auf. Die Einreichung, die Kommunikation mit dem Fördergeber und die Einhaltung
                von Fristen liegen allein beim Kunden.
              </p>
              <p>
                (4) Der Anbieter schuldet keine Rechts-, Steuer- oder Förderberatung im Sinne des
                Rechtsdienstleistungsgesetzes.
              </p>
            </Paragraf>

            <Paragraf nr="§ 3" titel="Vertragsschluss">
              <p>
                (1) Die Darstellung der Leistungen auf der Plattform ist kein bindendes Angebot,
                sondern eine Aufforderung zur Bestellung.
              </p>
              <p>
                (2) Der Kunde gibt ein verbindliches Angebot ab, indem er im Bestellvorgang die
                kostenpflichtige Leistung auswählt, seine Angaben vervollständigt und den
                Bezahlvorgang über den Zahlungsdienstleister abschließt.
              </p>
              <p>
                (3) Der Vertrag kommt mit der Bestätigung der Zahlung zustande. Der Anbieter
                bestätigt den Vertragsschluss unverzüglich per E-Mail; die Rechnung wird
                ebenfalls per E-Mail übermittelt.
              </p>
              <p>
                (4) Beim <strong className="text-[#1c1917]">Kauf auf Rechnung</strong> gilt
                abweichend von Absatz 3 die Regelung des § 4a.
              </p>
            </Paragraf>

            <Paragraf nr="§ 4" titel="Preise und Zahlung">
              <p>
                (1) Der Preis für einen Einzelantrag beträgt {einzelpreis}{" "}
                <strong className="text-[#1c1917]">
                  inklusive der gesetzlichen Umsatzsteuer von derzeit 19 %
                </strong>
                . Die auf der Plattform ausgewiesenen Preise sind Bruttopreise; ein Preis
                versteht sich stets einschließlich Umsatzsteuer.
              </p>
              <p>
                (2) Kontingente sind Vorkasse-Pakete: Der Kunde erwirbt eine bestimmte Anzahl von
                Anträgen im Voraus. Es besteht kein Abonnement; es erfolgt keine automatische
                Verlängerung und keine wiederkehrende Zahlung.
              </p>
              <p>
                (3) Erworbene Kontingente sind ab Kauf 12 Monate gültig. Nach Ablauf verfallen
                nicht genutzte Anträge, sofern nichts anderes vereinbart ist.
              </p>
              <p>
                (4) Die Zahlung erfolgt über den Zahlungsdienstleister Stripe. Es gelten ergänzend
                dessen Bedingungen für die Zahlungsabwicklung. Daneben kann der Anbieter den Kauf
                auf Rechnung anbieten (§ 4a).
              </p>
            </Paragraf>

            <Paragraf nr="§ 4a" titel="Kauf auf Rechnung">
              <p>
                (1) Bietet der Anbieter den Kauf auf Rechnung an, kommt der Vertrag{" "}
                <strong className="text-[#1c1917]">mit der Freischaltung der Leistung</strong>{" "}
                zustande; auf die Bestätigung der Zahlung (§ 3 Abs. 3) kommt es insoweit nicht an.
                Der Anbieter bestätigt den Vertragsschluss unverzüglich per E-Mail.
              </p>
              <p>
                (2) Die Vergütung ist innerhalb von{" "}
                <strong className="text-[#1c1917]">14 Tagen ab Zugang der Rechnung</strong> ohne
                Abzug zur Zahlung fällig.
              </p>
              <p>
                (3) Gerät der Kunde in Zahlungsverzug, schuldet er Verzugszinsen in Höhe von neun
                Prozentpunkten über dem Basiszinssatz (§ 288 Abs. 2 BGB) sowie eine Pauschale von
                40 € (§ 288 Abs. 5 BGB). Die Geltendmachung eines weitergehenden Verzugsschadens
                bleibt vorbehalten.
              </p>
              <p>
                (4) Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zur Leistung bis
                zum vollständigen Ausgleich der offenen Forderung zu sperren. Bereits exportierte
                Ergebnisse bleiben davon unberührt.
              </p>
            </Paragraf>

            <Paragraf nr="§ 5" titel="Leistungserbringung und Verfügbarkeit">
              <p>
                (1) Der Anbieter erbringt die Leistung mit der Sorgfalt eines ordentlichen
                Kaufmanns und ist um eine hohe Verfügbarkeit der Plattform bemüht.
              </p>
              <p>
                (2) Eine bestimmte Verfügbarkeitsquote wird nicht zugesichert. Wartungsfenster,
                Störungen bei Vorleistern und Ereignisse höherer Gewalt können zu vorübergehenden
                Einschränkungen führen.
              </p>
            </Paragraf>

            {/* Kernklausel — optisch hervorgehoben, weil sie die Erwartung des Kunden steuert. */}
            <section className="bg-white rounded-2xl p-8 border-l-4 border-[#1e3d32] border-y border-r border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4 flex items-center gap-3">
                <span className="text-[#1e3d32] font-bold">§ 6</span>
                <Sparkles className="h-5 w-5 text-[#1e3d32]" />
                KI-generierte Ergebnisse — keine Erfolgsgarantie
              </h2>
              <div className="text-[#1c1917]/80 space-y-4 leading-relaxed text-base">
                <p>
                  (1) Die Antragstexte werden maschinell durch ein KI-System erzeugt. Sie sind ein{" "}
                  <strong className="text-[#1c1917]">Entwurf</strong> und keine fertige, geprüfte
                  Einreichung.
                </p>
                <p>
                  (2) KI-Systeme können inhaltlich falsche, unvollständige oder erfundene Angaben
                  erzeugen. Der Kunde ist verpflichtet, jeden Entwurf vor der Einreichung
                  inhaltlich zu prüfen, insbesondere Zahlen, Fristen, Förderkriterien und Angaben
                  zur eigenen Einrichtung.
                </p>
                <p>
                  (3) Der Anbieter gewährleistet nicht, dass ein mit EduFunds erstellter Antrag
                  den formalen Anforderungen eines konkreten Förderprogramms genügt, fristgerecht
                  ist oder zu einer{" "}
                  <strong className="text-[#1c1917]">
                    Bewilligung oder Auszahlung von Fördermitteln
                  </strong>{" "}
                  führt. Eine Erfolgsgarantie wird ausdrücklich nicht übernommen.
                </p>
                <p>(4) Die Verantwortung für den eingereichten Antrag trägt allein der Kunde.</p>
              </div>
            </section>

            <Paragraf nr="§ 7" titel="Nutzungsrechte, Zugriffsdauer und KI-Training">
              <p>
                (1) Der Kunde erhält an den für ihn erstellten Antragstexten das
                uneingeschränkte, zeitlich unbefristete Recht zur Nutzung, insbesondere zur
                Einreichung bei Fördergebern.
              </p>
              <p>
                (2) Der Kunde bleibt Inhaber der von ihm eingegebenen Daten. Der Anbieter
                verwendet Kundendaten nicht zum Trainieren von KI-Modellen. Beim eingesetzten
                KI-Anbieter ist die Nutzung der Daten zu Trainingszwecken für das Konto des
                Anbieters deaktiviert (Training-Opt-out); Rückmeldefunktionen des KI-Anbieters,
                deren Nutzung eine Verwendung der Daten zu Trainingszwecken auslösen würde,
                werden nicht eingesetzt.
              </p>
              <p>
                (3) Der Online-Zugriff auf einen bezahlten Antrag über die Plattform besteht für
                12 Monate ab Kauf. Danach werden die Antragsinhalte im Rahmen des Löschkonzepts
                anonymisiert. Der Kunde ist gehalten, seinen Antrag rechtzeitig zu exportieren
                (PDF, Word oder Text); der Export steht ihm jederzeit zur Verfügung.
              </p>
            </Paragraf>

            <Paragraf nr="§ 8" titel="Pflichten des Kunden">
              <p>
                (1) Der Kunde stellt sicher, dass die von ihm eingegebenen Angaben richtig und
                vollständig sind und dass er zur Verwendung etwaiger Inhalte Dritter berechtigt
                ist.
              </p>
              <p>
                (2) Der Kunde gibt in die Freitextfelder keine personenbezogenen Daten ein, soweit
                dies nicht erforderlich ist. Der Anbieter weist hierauf in der Anwendung hin und
                bereinigt Freitexte vor der Übermittlung an das KI-System automatisiert um
                Identifikatoren.
              </p>
              <p>
                (3) Der Kunde ist für die sichere Aufbewahrung seiner Zugangsdaten und
                Freischaltcodes verantwortlich.
              </p>
            </Paragraf>

            <Paragraf nr="§ 9" titel="Datenschutz und Auftragsverarbeitung">
              <p>
                (1) Die Einzelheiten der Verarbeitung ergeben sich aus der{" "}
                <Link
                  href="/datenschutz"
                  className="text-[#1e3d32] hover:text-[#2a5244] transition-colors underline underline-offset-2"
                >
                  Datenschutzerklärung
                </Link>
                .
              </p>
              <p>
                (2) Soweit der Anbieter personenbezogene Daten im Auftrag des Kunden verarbeitet,
                wird der unter{" "}
                <Link
                  href="/avv"
                  className="text-[#1e3d32] hover:text-[#2a5244] transition-colors underline underline-offset-2"
                >
                  AVV &amp; Subprozessoren
                </Link>{" "}
                in der bei Vertragsschluss geltenden Fassung abrufbare
                Auftragsverarbeitungsvertrag nach Art. 28 DSGVO{" "}
                <strong className="text-[#1c1917]">
                  mit Vertragsschluss Bestandteil des Vertrags
                </strong>
                . Eines gesonderten Abschlusses bedarf es nicht; auf Wunsch stellt der Anbieter
                eine unterzeichnete Fassung bereit. Die vollständige Liste der Subprozessoren ist
                ebenfalls dort abrufbar.
              </p>
              <p>
                (3) Die KI-Verarbeitung findet ausschließlich im Europäischen Wirtschaftsraum
                statt.
              </p>
            </Paragraf>

            <Paragraf nr="§ 10" titel="Gewährleistung">
              <p>
                (1) Der Anbieter gewährleistet, dass die Plattform im Wesentlichen der
                Leistungsbeschreibung entspricht. § 6 (KI-generierte Ergebnisse) bleibt unberührt.
              </p>
              <p>
                (2) Mängel werden innerhalb angemessener Frist beseitigt.
                Gewährleistungsansprüche verjähren 12 Monate ab Bereitstellung der Leistung.
              </p>
            </Paragraf>

            <Paragraf nr="§ 11" titel="Haftung">
              <p>
                (1) Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit, für
                Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie nach
                den Vorschriften des Produkthaftungsgesetzes.
              </p>
              <p>
                (2) Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten
                (Kardinalpflichten) haftet der Anbieter auf den vertragstypischen, vorhersehbaren
                Schaden. Kardinalpflichten sind solche Pflichten, deren Erfüllung die
                ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren
                Einhaltung der Kunde regelmäßig vertrauen darf.
              </p>
              <p>
                (3) Im Übrigen — insbesondere bei leicht fahrlässiger Verletzung nicht
                wesentlicher Vertragspflichten — ist die Haftung ausgeschlossen; das gilt
                namentlich für entgangene Fördermittel, entgangenen Gewinn und Folgeschäden.{" "}
                <strong className="text-[#1c1917]">
                  Die Absätze 1 und 2 bleiben unberührt.
                </strong>
              </p>
            </Paragraf>

            <Paragraf nr="§ 12" titel="Vertragslaufzeit">
              <p>
                Der Vertrag über einen Einzelantrag oder ein Kontingent ist ein einmaliger
                Kaufvertrag über digitale Leistungen. Es besteht kein Dauerschuldverhältnis, keine
                Mindestlaufzeit und keine Kündigungsnotwendigkeit. Für die Gültigkeitsdauer von
                Kontingenten gilt § 4 Abs. 3, für die Zugriffsdauer § 7 Abs. 3.
              </p>
            </Paragraf>

            <Paragraf nr="§ 13" titel="Änderungen dieser AGB">
              <p>
                Der Anbieter kann diese AGB mit Wirkung für künftige Bestellungen ändern. Für
                bereits abgeschlossene Verträge gilt die bei Vertragsschluss geltende Fassung.
              </p>
            </Paragraf>

            <Paragraf nr="§ 14" titel="Schlussbestimmungen">
              <p>(1) Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.</p>
              <p>
                (2) Ausschließlicher Gerichtsstand für alle Streitigkeiten ist Berlin, sofern der
                Kunde Kaufmann, juristische Person des öffentlichen Rechts oder
                öffentlich-rechtliches Sondervermögen ist.
              </p>
              <p>
                (3) Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen
                Bestimmungen unberührt.
              </p>
            </Paragraf>

            <section className="bg-white rounded-2xl p-8 border border-[#1c1917]/8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1c1917] mb-4">Anbieter</h2>
              <div className="text-[#1c1917]/80 space-y-1 text-base">
                <p className="font-medium text-[#1c1917]">aitema GmbH</p>
                <p>Prenzlauer Allee 229</p>
                <p>10405 Berlin</p>
                <p>Deutschland</p>
                <p className="pt-2">
                  E-Mail:{" "}
                  <a
                    href="mailto:office@aitema.de"
                    className="text-[#1e3d32] hover:text-[#2a5244] transition-colors underline underline-offset-2"
                  >
                    office@aitema.de
                  </a>
                </p>
                <p className="pt-2 text-sm text-[#64748b]">
                  Handelsregister: Amtsgericht Charlottenburg, HRB 283978 B · USt-IdNr.:
                  DE461054353
                </p>
              </div>
            </section>
          </div>

          <p className="mt-10 text-center text-sm text-[#64748b]">Stand: Juli 2026</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
