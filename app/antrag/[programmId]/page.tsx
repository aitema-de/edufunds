import { notFound } from "next/navigation";
import { Metadata } from "next";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import { KIAntragAssistent } from "@/components/KIAntragAssistent";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

// Type assertion für JSON-Daten
const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

// Generate static paths for all programs
export async function generateStaticParams() {
  return foerderprogramme.map((programm) => ({
    programmId: programm.id,
  }));
}

interface AntragPageProps {
  params: Promise<{
    programmId: string;
  }>;
}

export async function generateMetadata({ params }: AntragPageProps): Promise<Metadata> {
  const { programmId } = await params;
  const programm = foerderprogramme.find(p => p.id === programmId);
  
  if (!programm) {
    return {
      title: "Programm nicht gefunden - EduFunds",
    };
  }

  return {
    title: `Antrag für ${programm.name} - EduFunds`,
    description: `Erstellen Sie Ihren Förderantrag für ${programm.name} mit KI-Unterstützung.`,
  };
}

export default async function AntragPage({ params }: AntragPageProps) {
  const { programmId } = await params;
  const programm = foerderprogramme.find(p => p.id === programmId);

  if (!programm) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-20 bg-[#0a1628]">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link 
              href={`/foerderprogramme/${programm.id}`}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-[#c9a227] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Programm
            </Link>
          </div>

          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#c9a227]/10 rounded-lg">
                <FileText className="h-6 w-6 text-[#c9a227]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-100">
                  Förderantrag erstellen
                </h1>
                <p className="text-slate-400">
                  für {programm.name}
                </p>
              </div>
            </div>
            <p className="text-slate-400 max-w-2xl">
              Unser KI-Antragsassistent hilft Ihnen, einen professionellen und 
              überzeugenden Förderantrag zu erstellen. Basierend auf den Details 
              von „{programm.name}" generiert die KI einen maßgeschneiderten Antragstext.
            </p>
          </div>

          {/* KI-Assistent */}
          <KIAntragAssistent programm={programm} />

          {/* Hinweise */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="font-semibold text-slate-200 mb-3">
                Wichtige Hinweise
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#c9a227]">•</span>
                  Der generierte Antrag ist ein Entwurf - überprüfen Sie ihn vor der Einreichung.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c9a227]">•</span>
                  Stellen Sie sicher, dass alle Angaben zu Ihrer Schule korrekt sind.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c9a227]">•</span>
                  Beachten Sie die offiziellen Antragsrichtlinien des Fördergebers.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c9a227]">•</span>
                  Frist: {programm.bewerbungsfristText}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
