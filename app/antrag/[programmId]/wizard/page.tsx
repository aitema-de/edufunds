import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FolderOpen, Sparkles } from "lucide-react";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WizardShell } from "@/components/Wizard";

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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a1628] pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/foerderprogramme/${programm.id}`}
              className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-[#c9a227]"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Programm
            </Link>
            <Link
              href="/antrag/meine"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 px-3 py-1.5 text-sm text-slate-300 transition hover:border-[#c9a227]/50 hover:text-[#c9a227]"
            >
              <FolderOpen className="h-4 w-4" />
              Meine Anträge
            </Link>
          </div>
          <div className="mb-10">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-[#c9a227]/10 p-2">
                <Sparkles className="h-6 w-6 text-[#c9a227]" />
              </div>
              <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-orange-300">
                Beta
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-slate-100">
              KI-Antragswizard
            </h1>
            <p className="max-w-2xl text-slate-400">
              Adaptive Befragung + Pipeline mit Selbstkritik, programmspezifisch optimiert.
              Für „{programm.name}".
            </p>
          </div>
          <WizardShell programm={programm} />
        </div>
      </main>
      <Footer />
    </>
  );
}
