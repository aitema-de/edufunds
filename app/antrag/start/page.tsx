import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { FeedbackButton } from "@/components/FeedbackButton";
import { StartClient } from "@/components/Wizard/StartClient";

export const metadata: Metadata = {
  title: "Neuen Antrag starten – EduFunds",
  description:
    "Beschreibe dein Anliegen, und die KI findet die passendsten Förderprogramme aus über 135 Angeboten.",
};

export default function StartPage() {
  return (
    <>
      <Header />
      <PageHero
        variant="light"
        badge={{
          icon: <Sparkles className="w-3.5 h-3.5" style={{ color: "#c9a227" }} />,
          text: "KI-Antragsassistent · Beta",
        }}
        title="Neuen Antrag"
        titleAccent="starten"
        subtitle="Beschreib dein Anliegen in deinen Worten. Die KI gleicht es mit über 135 Förderprogrammen ab und schlägt dir die fünf passendsten vor — mit Begründung. Danach startest du direkt den Antragswizard."
      >
        <div className="flex justify-center">
          <Link
            href="/antrag/meine"
            className="inline-flex items-center gap-2 rounded-lg border border-[#0a1628]/15 bg-white/70 px-4 py-2 text-sm font-medium text-[#0a1628] backdrop-blur-sm transition hover:border-[#c9a227]/40 hover:text-[#c9a227]"
          >
            <FolderOpen className="h-4 w-4" />
            Meine Anträge
          </Link>
        </div>
      </PageHero>
      <main
        id="main-content"
        className="relative pb-24"
        style={{ backgroundColor: "#f8f5f0" }}
      >
        <div className="container mx-auto max-w-3xl px-6">
          <StartClient />
        </div>
      </main>
      <Footer />
      <FeedbackButton />
    </>
  );
}
