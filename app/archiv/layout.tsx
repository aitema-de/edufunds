import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archiv - Abgelaufene Förderprogramme",
  description: "Übersicht abgelaufener Förderprogramme für Schulen. Finden Sie Informationen zu vergangenen Ausschreibungen als Referenz.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ArchivLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
