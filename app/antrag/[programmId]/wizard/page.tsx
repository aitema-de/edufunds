import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FolderOpen, Sparkles, ShieldCheck, AlertCircle } from "lucide-react";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { FeedbackButton } from "@/components/FeedbackButton";
import { WizardShell } from "@/components/Wizard";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";

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

  return (
    <>
      <Header />
      <PageHero
        variant="light"
        badge={{
          icon: <Sparkles className="w-3.5 h-3.5" style={{ color: "#c9a227" }} />,
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
              className="inline-flex items-center gap-2 text-sm text-[#1e3a61] transition hover:text-[#c9a227]"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Programm
            </Link>
            <Link
              href="/antrag/meine"
              className="inline-flex items-center gap-2 rounded-lg border border-[#0a1628]/15 bg-white/70 px-3 py-1.5 text-sm font-medium text-[#0a1628] backdrop-blur-sm transition hover:border-[#c9a227]/40 hover:text-[#c9a227]"
            >
              <FolderOpen className="h-4 w-4" />
              Meine Anträge
            </Link>
          </div>
          {richtlinie && !richtlinieStub && (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Richtlinie erfasst — Antrag folgt offizieller Struktur
            </div>
          )}
          {richtlinie && richtlinieStub && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a227]/40 bg-[#c9a227]/10 px-3 py-1 text-xs text-[#b08d1f]">
              <AlertCircle className="h-3.5 w-3.5" />
              Richtlinie teilweise erfasst — einige Felder generisch
            </div>
          )}
          {!richtlinie && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0a1628]/15 bg-white/70 px-3 py-1 text-xs text-slate-600 backdrop-blur-sm">
              <AlertCircle className="h-3.5 w-3.5" />
              Keine Richtlinie erfasst — generische Struktur, offizielle Richtlinie parallel prüfen
            </div>
          )}
        </div>
      </PageHero>
      <main
        id="main-content"
        className="relative pb-24"
        style={{ backgroundColor: "#f8f5f0" }}
      >
        <div className="container mx-auto px-4">
          <WizardShell programm={programm} />
        </div>
      </main>
      <Footer />
      <FeedbackButton />
    </>
  );
}
