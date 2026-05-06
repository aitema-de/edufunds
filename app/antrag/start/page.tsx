import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
      <main className="min-h-screen bg-[#0a1628] pt-24 pb-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#c9a227]/10 p-2">
                <Sparkles className="h-6 w-6 text-[#c9a227]" />
              </div>
              <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-orange-300">
                Beta
              </span>
            </div>
            <Link
              href="/antrag/meine"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 px-3 py-1.5 text-sm text-slate-300 transition hover:border-[#c9a227]/50 hover:text-[#c9a227]"
            >
              <FolderOpen className="h-4 w-4" />
              Meine Anträge
            </Link>
          </div>
          <h1 className="mb-3 text-3xl font-bold text-slate-100">
            Neuen Antrag starten
          </h1>
          <p className="mb-10 max-w-2xl text-slate-400">
            Beschreib dein Anliegen in deinen Worten. Die KI gleicht es mit über
            135 Förderprogrammen ab und schlägt dir die fünf passendsten vor —
            mit Begründung. Danach startest du direkt den Antragswizard.
          </p>
          <StartClient />
        </div>
      </main>
      <Footer />
    </>
  );
}
