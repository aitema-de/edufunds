import type { Metadata } from "next";
import { PROGRAMM_COUNT_LABEL } from "@/lib/programm-count";

const programCount = PROGRAMM_COUNT_LABEL;

export const metadata: Metadata = {
  title: "Förderprogramme für Schulen",
  description: `Entdecken Sie ${programCount} Förderprogramme für Schulen. Bundesmittel, Landesmittel, Stiftungen und EU-Programme - mit KI-Antragsassistent.`,
  openGraph: {
    title: "Förderprogramme für Schulen | EduFunds",
    description: `${programCount} Förderprogramme im Überblick. Finden Sie passende Fördermittel für Ihre Schule.`,
    type: "website",
  },
};

export default function FoerderprogrammeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
