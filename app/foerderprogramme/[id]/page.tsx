import { notFound } from "next/navigation";
import type { Foerderprogramm } from '@/lib/foerderSchema';
import foerderprogrammeData from '@/data/foerderprogramme.json';
import FoerderprogrammDetailClient from "./FoerderprogrammDetailClient";

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

// Erlaube dynamische Rendering als Fallback
export const dynamicParams = true;

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

  return <FoerderprogrammDetailClient programm={programm} />;
}
