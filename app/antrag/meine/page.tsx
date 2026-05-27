import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MyAntraegeClient } from "@/components/Wizard/MyAntraegeClient";

export const metadata: Metadata = {
  title: "Meine Anträge – EduFunds",
  description: "Deine laufenden und abgeschlossenen Antragsentwürfe aus dem KI-Wizard.",
};

export default function MyAntraegePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f8f5f0] pt-24 pb-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-8">
            <Link
              href="/foerderprogramme"
              className="inline-flex items-center gap-2 text-slate-600 transition-colors hover:text-[#c9a227]"
            >
              <ArrowLeft className="h-4 w-4" />
              Zur Förderprogramm-Übersicht
            </Link>
          </div>
          <div className="mb-10">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-[#c9a227]/10 p-2">
                <FolderOpen className="h-6 w-6 text-[#c9a227]" />
              </div>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-[#0a1628]">Meine Anträge</h1>
            <p className="max-w-2xl text-slate-600">
              Alle Wizard-Sessions, die du in diesem Browser gestartet hast.
              Ohne Login — deshalb nur lokal. Cross-Device-Sync folgt in einer späteren Phase.
            </p>
          </div>
          <MyAntraegeClient />
        </div>
      </main>
      <Footer />
    </>
  );
}
