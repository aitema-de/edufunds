import { notFound, redirect } from "next/navigation";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";

// Type assertion für JSON-Daten
const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

interface AntragPageProps {
  params: Promise<{
    programmId: string;
  }>;
}

/* Legacy-Route /antrag/[programmId] (alter KIAntragAssistent mit totem
   localStorage-Gating). Seit 2026-07-01 reiner Redirect: KI-geeignete
   Programme gehen in den adaptiven Wizard (eigene Paywall-Logik), alle
   anderen zur Programm-Detailseite. Alte Bookmarks/Karten-Links bleiben
   damit funktionsfähig. */
export default async function AntragPage({ params }: AntragPageProps) {
  const { programmId } = await params;
  const programm = foerderprogramme.find((p) => p.id === programmId);

  if (!programm) {
    notFound();
  }

  if (programm.kiAntragGeeignet) {
    redirect(`/antrag/${programm.id}/wizard`);
  }
  redirect(`/foerderprogramme/${programm.id}`);
}
