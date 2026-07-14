import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { AntragResult } from "@/components/Wizard/AntragResult";
import { getSessionByPaidToken, isRefundedToken } from "@/lib/wizard/session";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { dokumentLabels } from "@/lib/wizard/dokument-label";
import { getEinreichung } from "@/lib/wizard/einreichung";

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

export const metadata: Metadata = {
  title: "Antrag-Download – EduFunds",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * Der Zugriff wurde nach einer Rueckerstattung entzogen. Kein Fehler, sondern
 * eine Folge des Refunds — entsprechend erklaeren statt 404 zu werfen.
 */
function ErstattetHinweis() {
  return (
    <>
      <Header />
      <PageHero
        variant="light"
        badge={{
          icon: <RotateCcw className="w-3.5 h-3.5" style={{ color: "#b45309" }} />,
          text: "Zahlung erstattet",
        }}
        title="Dieser Zugang wurde"
        titleAccent="beendet"
        subtitle="Der Kaufpreis für diesen Antrag wurde zurückerstattet. Damit ist der Download-Link erloschen — der Antrag steht nicht mehr zum Abruf bereit."
      />
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-[#57534e]">
          Sollte das nicht Ihrer Erwartung entsprechen — etwa weil Sie keine Erstattung
          beantragt haben —, melden Sie sich bitte bei uns. Wir klären das.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/kontakt"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e3d32] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#16302a]"
          >
            Kontakt aufnehmen
          </Link>
          <Link
            href="/antrag/meine"
            className="inline-flex items-center gap-2 rounded-lg border border-[#1c1917]/15 bg-white/70 px-4 py-2 text-sm font-medium text-[#1c1917] transition hover:border-[#1e3d32]/40 hover:text-[#1e3d32]"
          >
            <ArrowLeft className="h-4 w-4" />
            Meine Anträge
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default async function DownloadPage({ params }: Props) {
  const { token } = await params;
  const session = await getSessionByPaidToken(token);

  // Nach einer Rueckerstattung ist der paid_token entwertet (Migration 012) —
  // der Link ist tot. Eine nackte 404 liesse den Kunden im Unklaren, warum:
  // er hat den Link ja nachweislich einmal bekommen. Also erklaeren.
  if (!session && (await isRefundedToken(token))) {
    return <ErstattetHinweis />;
  }
  if (!session) notFound();

  const programm = foerderprogramme.find((p) => p.id === session.foerderprogrammId);
  if (!programm || !session.data.generation) notFound();

  const richtlinie = await loadRichtlinie(session.foerderprogrammId);
  const einreichung = getEinreichung(richtlinie);

  return (
    <>
      <Header />
      <PageHero
        variant="light"
        badge={{
          icon: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#10b981" }} />,
          text: "Bezahlt · Freigeschaltet",
        }}
        title="Ihr Antrag —"
        titleAccent="einsatzbereit"
        subtitle="Kopieren Sie den Volltext + Finanzplan in einem Rutsch ins Antrags-Portal oder laden Sie eine der Dateien herunter. Dieser Download-Link bleibt 12 Monate aktiv — legen Sie sich ein Bookmark an."
      >
        <div className="flex justify-center">
          <Link
            href="/antrag/meine"
            className="inline-flex items-center gap-2 rounded-lg border border-[#1c1917]/15 bg-white/70 px-4 py-2 text-sm font-medium text-[#1c1917] backdrop-blur-sm transition hover:border-[#1e3d32]/40 hover:text-[#1e3d32]"
          >
            <ArrowLeft className="h-4 w-4" />
            Meine Anträge
          </Link>
        </div>
      </PageHero>
      <main
        id="main-content"
        className="relative pb-24"
        style={{ backgroundColor: "#fdfdfc" }}
      >
        <div className="container mx-auto px-4">
          <AntragResult
            programm={programm}
            generation={session.data.generation}
            costs={session.data.costs ?? null}
            sessionToken={session.sessionToken}
            paidToken={session.paidToken ?? null}
            einreichung={einreichung}
            labels={dokumentLabels(richtlinie?.dokumentLabel, richtlinie?.dokumentLabelGenus)}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
