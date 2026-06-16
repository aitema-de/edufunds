import { notFound } from "next/navigation";
import type { Foerderprogramm } from '@/lib/foerderSchema';
import foerderprogrammeData from '@/data/foerderprogramme.json';
import FoerderprogrammDetailClient from "./FoerderprogrammDetailClient";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { getEinreichung } from "@/lib/wizard/einreichung";

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

// Statische Generierung für alle Förderprogramme (kein dynamisches Fallback bei Export)

// Statische Generierung für alle Förderprogramme
export function generateStaticParams() {
  return foerderprogramme.map((programm) => ({
    id: programm.id,
  }));
}

// Metadaten für SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programm = foerderprogramme.find(p => p.id === id);
  
  if (!programm) {
    return {
      title: 'Programm nicht gefunden | EduFunds',
    };
  }

  return {
    title: `${programm.name} | EduFunds`,
    description: programm.kurzbeschreibung,
  };
}

export default async function FoerderprogrammDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programm = foerderprogramme.find(p => p.id === id);

  if (!programm) {
    notFound();
  }

  const richtlinie = await loadRichtlinie(programm.id);
  const einreichung = getEinreichung(richtlinie);

  return <FoerderprogrammDetailClient programm={programm} einreichung={einreichung} />;
}
