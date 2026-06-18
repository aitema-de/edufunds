import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { StartClient } from "@/components/Wizard/StartClient";
import { DsgvoTrust } from "@/components/DsgvoTrust";
import { KiHinweis } from "@/components/KiHinweis";
import { PROGRAMM_COUNT_ROUNDED } from "@/lib/programm-count";

export const metadata: Metadata = {
  title: "Neuen Antrag starten – EduFunds",
  description: `Beschreiben Sie Ihr Anliegen, und die KI findet die passendsten Förderprogramme aus über ${PROGRAMM_COUNT_ROUNDED} Angeboten.`,
};

export default function StartPage() {
  return (
    <>
      <Header />
      <PageHero
        variant="light"
        badge={{
          icon: <Sparkles className="w-3.5 h-3.5" style={{ color: "#78350f" }} />,
          text: "KI-Antragsassistent · Beta",
        }}
        title="Neuen Antrag"
        titleAccent="starten"
        subtitle={`Beschreiben Sie Ihr Anliegen in Ihren Worten. Die KI gleicht es mit über ${PROGRAMM_COUNT_ROUNDED} Förderprogrammen ab und schlägt Ihnen die fünf passendsten vor — mit Begründung. Danach starten Sie direkt den Antragswizard.`}
      >
        <div className="flex justify-center">
          <Link
            href="/antrag/meine"
            className="inline-flex items-center gap-2 rounded-lg border border-[#1c1917]/15 bg-white/70 px-4 py-2 text-sm font-medium text-[#1c1917] backdrop-blur-sm transition hover:border-[#78350f]/40 hover:text-[#78350f]"
          >
            <FolderOpen className="h-4 w-4" />
            Meine Anträge
          </Link>
        </div>
      </PageHero>
      <main
        id="main-content"
        className="relative pb-24"
        style={{ backgroundColor: "#fdfdfc" }}
      >
        <div className="container mx-auto max-w-3xl px-6">
          <KiHinweis variant="interaktion" className="mb-6" />
          <StartClient />
          <DsgvoTrust variant="compact" className="mt-8" />
        </div>
      </main>
      <Footer />
    </>
  );
}
