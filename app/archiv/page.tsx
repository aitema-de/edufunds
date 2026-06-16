"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Archive, Building2, ArrowLeft, RotateCcw, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import { isProgrammAbgelaufen } from "@/lib/programm-status";

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

// Abgelaufene Programme = Frist-Ende in der Vergangenheit (oder Status beendet),
// chronologisch sortiert: zuletzt abgelaufen zuerst.
const archivProgramme = foerderprogramme
  .filter((p) => isProgrammAbgelaufen(p))
  .sort((a, b) => {
    const da = a.bewerbungsfristEnde ? new Date(a.bewerbungsfristEnde).getTime() : 0;
    const db = b.bewerbungsfristEnde ? new Date(b.bewerbungsfristEnde).getTime() : 0;
    return db - da;
  });

const FOERDERGEBER_LABEL: Record<string, string> = {
  bund: "Bund",
  land: "Land",
  stiftung: "Stiftung",
  eu: "EU",
  uni: "Hochschule",
  sonstige: "Sonstige",
};

const datumFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatEnde(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return datumFormatter.format(d);
}

// Wiederkehrend? Viele Archiv-Programme sind jährliche Ausschreibungen, deren
// Frist nur turnusgemaess abgelaufen ist — das ist die eigentlich nuetzliche Info.
function istWiederkehrend(p: Foerderprogramm): boolean {
  const text = `${p.bewerbungsfristText ?? ""} ${p.name ?? ""}`.toLowerCase();
  return /jährl|jaehrl|quartal|halbjähr|halbjaehr|monatl|turnus/.test(text);
}

// Ein Eintrag der Zeitleiste.
function ArchivEintrag({
  programm,
  index,
  isLast,
}: {
  programm: Foerderprogramm;
  index: number;
  isLast: boolean;
}) {
  const ende = formatEnde(programm.bewerbungsfristEnde);
  const geberLabel =
    FOERDERGEBER_LABEL[programm.foerdergeberTyp] ?? programm.foerdergeberTyp;
  const wiederkehrend = istWiederkehrend(programm);

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      className="flex gap-4 md:gap-6"
    >
      {/* Zeitachse: Knoten + Verbindungslinie */}
      <div className="flex flex-col items-center" aria-hidden="true">
        <span className="mt-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#c9a227]/70 bg-[#f8f5f0]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c9a227]" />
        </span>
        {!isLast && (
          <span className="mt-1 w-px flex-1 bg-gradient-to-b from-[#c9a227]/35 to-[#c9a227]/10" />
        )}
      </div>

      {/* Inhalt – kein Kasten, nur Text mit dezentem Hover */}
      <div className="group -mx-3 mb-8 flex-1 rounded-xl px-3 py-1.5 transition-colors hover:bg-white/70 md:mb-10">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {ende && (
            <time
              dateTime={programm.bewerbungsfristEnde}
              className="text-sm font-semibold tracking-tight text-[#7a5e12]"
            >
              {ende}
            </time>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-[#0a1628]/55">
            <Building2 className="h-3.5 w-3.5" />
            {geberLabel}
          </span>
          {wiederkehrend && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#c9a227]/12 px-2 py-0.5 text-[11px] font-medium text-[#7a5e12]">
              <RotateCcw className="h-3 w-3" />
              Wiederkehrend – neue Runde erwartet
            </span>
          )}
        </div>

        <h3 className="text-base font-semibold leading-snug text-[#0a1628] md:text-lg">
          {programm.name}
        </h3>
        <p className="mt-0.5 text-sm text-[#0a1628]/55">{programm.foerdergeber}</p>

        {programm.kurzbeschreibung && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#0a1628]/65">
            {programm.kurzbeschreibung}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#0a1628]/55">
          {programm.foerdersummeText && (
            <span className="line-clamp-1">
              <span className="text-[#0a1628]/40">Fördersumme:</span>{" "}
              <span className="font-medium text-[#0a1628]/75">
                {programm.foerdersummeText}
              </span>
            </span>
          )}
          {programm.infoLink && (
            <a
              href={programm.infoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#7a5e12] transition-colors hover:text-[#c9a227] hover:underline"
            >
              Information
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export default function ArchivPage() {
  const anzahl = archivProgramme.length;

  return (
    <>
      <Header />
      <main
        id="main-content"
        className="min-h-screen pt-24 pb-20"
        style={{ backgroundColor: "#f8f5f0" }}
      >
        <div className="container mx-auto px-4">
          {/* Seitenkopf */}
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c9a227]/30 bg-[#c9a227]/10 px-4 py-2">
              <Archive className="h-4 w-4 text-[#7a5e12]" />
              <span className="text-sm font-medium text-[#7a5e12]">Archiv</span>
            </div>
            <h1 className="mb-4 text-4xl font-bold text-[#0a1628] md:text-5xl">
              Abgelaufene Förderprogramme
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-[#0a1628]/60">
              Hier sammeln sich Ausschreibungen, deren Frist verstrichen ist.
              Viele sind wiederkehrend – bitte prüfen Sie für aktuelle Runden
              direkt beim jeweiligen Fördergeber.
            </p>
          </div>

          {/* Zurück-Link + Zähler */}
          <div className="mx-auto mb-10 flex max-w-3xl items-center justify-between gap-4">
            <Link
              href="/foerderprogramme"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#7a5e12] transition-colors hover:text-[#c9a227]"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zu aktuellen Programmen
            </Link>
            {anzahl > 0 && (
              <span className="text-sm text-[#0a1628]/50">
                {anzahl} {anzahl === 1 ? "Programm" : "Programme"}
              </span>
            )}
          </div>

          {/* Zeitleiste */}
          {anzahl === 0 ? (
            <div className="mx-auto max-w-2xl rounded-2xl border border-[#0a1628]/10 bg-white/70 p-12 text-center">
              <Archive className="mx-auto mb-4 h-14 w-14 text-[#c9a227]/60" />
              <h2 className="mb-2 text-xl font-bold text-[#0a1628]">
                Keine abgelaufenen Programme
              </h2>
              <p className="mx-auto max-w-md text-[#0a1628]/60">
                Derzeit ist kein Förderprogramm im Archiv. Alle gelisteten
                Programme sind aktuell.
              </p>
            </div>
          ) : (
            <ol className="mx-auto max-w-3xl">
              {archivProgramme.map((programm, index) => (
                <ArchivEintrag
                  key={programm.id}
                  programm={programm}
                  index={index}
                  isLast={index === anzahl - 1}
                />
              ))}
            </ol>
          )}

          {/* Hinweis unten */}
          <div className="mx-auto mt-12 max-w-3xl text-center">
            <p className="text-sm text-[#0a1628]/55">
              Kennen Sie eine neue Ausschreibung zu einem dieser Programme?{" "}
              <Link
                href="/kontakt"
                className="font-medium text-[#7a5e12] underline-offset-2 hover:underline"
              >
                Schreiben Sie uns
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
