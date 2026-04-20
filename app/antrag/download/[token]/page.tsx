import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AntragResult } from "@/components/Wizard/AntragResult";
import { getSessionByPaidToken } from "@/lib/wizard/session";

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

export const metadata: Metadata = {
  title: "Antrag-Download – EduFunds",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function DownloadPage({ params }: Props) {
  const { token } = await params;
  const session = await getSessionByPaidToken(token);
  if (!session) notFound();

  const programm = foerderprogramme.find((p) => p.id === session.foerderprogrammId);
  if (!programm || !session.data.generation) notFound();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a1628] pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/antrag/meine"
              className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-[#c9a227]"
            >
              <ArrowLeft className="h-4 w-4" />
              Meine Anträge
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Bezahlt · freigeschaltet
            </div>
          </div>
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-slate-100">
              Dein Antrag — einsatzbereit
            </h1>
            <p className="max-w-2xl text-slate-400">
              Kopiere den Volltext + Finanzplan in einem Rutsch ins Antrags-Portal oder
              lade eine der Dateien herunter. Dieser Download-Link bleibt 30 Tage
              aktiv — lege dir ein Bookmark an.
            </p>
          </div>
          <AntragResult
            programm={programm}
            generation={session.data.generation}
            costs={session.data.costs ?? null}
            sessionToken={session.sessionToken}
            paidToken={session.paidToken ?? null}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
