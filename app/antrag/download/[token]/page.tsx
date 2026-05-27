import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
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
      <PageHero
        variant="light"
        badge={{
          icon: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#10b981" }} />,
          text: "Bezahlt · Freigeschaltet",
        }}
        title="Dein Antrag —"
        titleAccent="einsatzbereit"
        subtitle="Kopiere den Volltext + Finanzplan in einem Rutsch ins Antrags-Portal oder lade eine der Dateien herunter. Dieser Download-Link bleibt 30 Tage aktiv — lege dir ein Bookmark an."
      >
        <div className="flex justify-center">
          <Link
            href="/antrag/meine"
            className="inline-flex items-center gap-2 rounded-lg border border-[#0a1628]/15 bg-white/70 px-4 py-2 text-sm font-medium text-[#0a1628] backdrop-blur-sm transition hover:border-[#c9a227]/40 hover:text-[#c9a227]"
          >
            <ArrowLeft className="h-4 w-4" />
            Meine Anträge
          </Link>
        </div>
      </PageHero>
      <main
        id="main-content"
        className="relative pb-24"
        style={{ backgroundColor: "#f8f5f0" }}
      >
        <div className="container mx-auto px-4">
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
