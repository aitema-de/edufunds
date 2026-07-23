import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FolderOpen, Sparkles, ShieldCheck, AlertCircle } from "lucide-react";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { WizardShell } from "@/components/Wizard";
import { KiHinweis } from "@/components/KiHinweis";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { getEinreichung } from "@/lib/wizard/einreichung";

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

export async function generateStaticParams() {
  return foerderprogramme.map((p) => ({ programmId: p.id }));
}

interface Props {
  params: Promise<{ programmId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { programmId } = await params;
  const p = foerderprogramme.find((x) => x.id === programmId);
  return {
    title: p ? `Antragswizard – ${p.name} – EduFunds` : "Antragswizard – EduFunds",
  };
}

export default async function WizardPage({ params }: Props) {
  const { programmId } = await params;
  const programm = foerderprogramme.find((p) => p.id === programmId);
  if (!programm) notFound();
  const richtlinie = await loadRichtlinie(programm.id);
  const richtlinieStub = richtlinie?.version?.includes("stub") ?? false;
  const einreichung = getEinreichung(richtlinie);

  return (
    <>
      <Header />
      <PageHero
        variant="light"
        badge={{
          icon: <Sparkles className="w-3.5 h-3.5" style={{ color: "#1e3d32" }} />,
          text: "KI-Antragswizard · Beta",
        }}
        title="Adaptive Befragung +"
        titleAccent="Pipeline mit Selbstkritik"
        subtitle={`Programmspezifisch optimiert für „${programm.name}".`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/foerderprogramme/${programm.id}`}
              className="inline-flex items-center gap-2 text-sm text-[#57534e] transition hover:text-[#1e3d32]"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Programm
            </Link>
            <Link
              href="/antrag/meine"
              className="inline-flex items-center gap-2 rounded-lg border border-[#1c1917]/15 bg-white/70 px-3 py-1.5 text-sm font-medium text-[#1c1917] backdrop-blur-sm transition hover:border-[#1e3d32]/40 hover:text-[#1e3d32]"
            >
              <FolderOpen className="h-4 w-4" />
              Meine Anträge
            </Link>
          </div>
          {richtlinie && !richtlinieStub && (
            <div
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
              title="Die offizielle Förderrichtlinie liegt strukturiert vor — der Antrag folgt ihren Pflichtabschnitten und wird gegen die Förderregeln geprüft."
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Richtlinie erfasst — Antrag folgt offizieller Struktur
            </div>
          )}
          {richtlinie && richtlinieStub && (
            <div
              className="inline-flex items-center gap-2 rounded-full border border-[#1e3d32]/40 bg-[#1e3d32]/10 px-3 py-1 text-xs text-[#1e3d32]"
              title="Nur ein Teil der offiziellen Richtlinie ist erfasst — einige Abschnitte folgen einer Standardstruktur. Gleichen Sie den Antrag vor dem Einreichen mit der offiziellen Ausschreibung ab."
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Richtlinie teilweise erfasst — einige Felder generisch
            </div>
          )}
          {!richtlinie && (
            <div className="flex flex-col items-center gap-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1c1917]/15 bg-white/70 px-3 py-1 text-xs text-slate-600 backdrop-blur-sm">
                <AlertCircle className="h-3.5 w-3.5" />
                Keine offizielle Richtlinie hinterlegt — Antrag nutzt eine bewährte Standardstruktur
              </div>
              <p className="max-w-md text-center text-xs text-slate-500">
                Inhaltlich vollwertig — Sie müssen nichts weiter tun. Weil uns die
                Pflichtabschnitte dieses Programms aber nicht im Detail vorliegen, gleichen
                Sie den fertigen Antrag vor dem Einreichen kurz mit der offiziellen
                Ausschreibung ab.
              </p>
            </div>
          )}
        </div>
      </PageHero>
      <main
        id="main-content"
        className="relative pb-24"
        style={{ backgroundColor: "#fdfdfc" }}
      >
        <div className="container mx-auto px-4">
          {/* AI-Act Art. 50(1): Interaktions-Offenlegung auch fuer Deep-Links —
              Programm-Detailseite, Karten und Kumulierungs-Warnung verlinken
              direkt hierher, ohne den Hinweis auf /antrag/start zu passieren. */}
          <KiHinweis variant="interaktion" className="mx-auto mb-6 max-w-3xl" />
          <WizardShell
            programm={programm}
            einreichung={einreichung}
            foerderhoehe={richtlinie?.foerderhoehe ?? null}
            dokumentLabel={richtlinie?.dokumentLabel ?? null}
            dokumentLabelGenus={richtlinie?.dokumentLabelGenus ?? null}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
