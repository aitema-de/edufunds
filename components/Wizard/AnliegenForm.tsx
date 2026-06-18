"use client";

import { KeyboardEvent, useEffect, useState } from "react";
import { Loader2, Sparkles, Lock } from "lucide-react";
import {
  loadSchoolProfile,
  saveSchoolProfile,
} from "@/lib/wizard/school-profile-client";

export interface AnliegenValues {
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
}

interface Props {
  onSubmit: (values: AnliegenValues) => Promise<void> | void;
  busy?: boolean;
}

const SCHULTYPEN = [
  "",
  "Grundschule",
  "Hauptschule",
  "Realschule",
  "Gesamtschule",
  "Integrierte Sekundarschule (ISS)",
  "Integrierte Sekundarschule mit Oberstufe (ISS+GO)",
  "Gymnasium",
  "Oberschule",
  "Förderschule",
  "Berufsschule",
];

const BUNDESLAENDER = [
  "", "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen",
  "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen",
  "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen",
  "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
];

export function AnliegenForm({ onSubmit, busy }: Props) {
  const [anliegen, setAnliegen] = useState("");
  const [schulname, setSchulname] = useState("");
  const [schultyp, setSchultyp] = useState("");
  const [bundesland, setBundesland] = useState("");
  const [budgetStr, setBudgetStr] = useState("");

  useEffect(() => {
    const p = loadSchoolProfile();
    if (p) {
      if (p.name) setSchulname(p.name);
      if (p.typ) setSchultyp(p.typ);
      if (p.bundesland) setBundesland(p.bundesland);
    }
  }, []);

  const handleSubmit = async () => {
    const trimmed = anliegen.trim();
    if (trimmed.length < 20 || busy) return;

    // Schulprofil aktualisieren (lokal)
    if (schulname || schultyp || bundesland) {
      const current = loadSchoolProfile() ?? { updatedAt: new Date().toISOString() };
      saveSchoolProfile({
        ...current,
        name: schulname || current.name,
        typ: schultyp || current.typ,
        bundesland: bundesland || current.bundesland,
        updatedAt: new Date().toISOString(),
      });
    }

    const budget = budgetStr.trim() ? Number(budgetStr.replace(/\D/g, "")) : undefined;
    await onSubmit({
      anliegen: trimmed,
      schulname: schulname.trim() || undefined,
      schultyp: schultyp || undefined,
      bundesland: bundesland || undefined,
      geschaetztesBudgetEur: budget && Number.isFinite(budget) && budget > 0 ? budget : undefined,
    });
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = anliegen.trim().length >= 20 && !busy;

  return (
    <div className="rounded-2xl border border-[#1c1917]/8 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(10,22,40,0.06)]">
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#57534e]">
            Ihr Anliegen <span className="text-red-500">*</span>
          </label>
          <textarea
            value={anliegen}
            onChange={(e) => setAnliegen(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Beschreiben Sie, was Sie an Ihrer Schule umsetzen wollen — konkret, mit Zielgruppe und Wirkung. Beispiel: Wir wollen 120 Fünft- und Sechstklässlern Programmieren mit Calliope näherbringen. 80 % Migrationshintergrund, MINT-Lücke spürbar."
            rows={5}
            className="w-full rounded-lg border border-[#1c1917]/15 bg-[#fdfdfc]/60 p-3 sm:min-h-[140px] text-[#1c1917] placeholder-slate-400 transition focus:border-[#78350f] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#78350f]/15"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>
              {anliegen.trim().length < 20
                ? `Mindestens 20 Zeichen (${anliegen.trim().length}/20)`
                : `${anliegen.trim().length} Zeichen`}
            </span>
            <span>Strg/⌘+Enter sendet</span>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>
              <strong className="font-medium text-slate-600">Bitte keine personenbezogenen Daten eingeben</strong>{" "}
              — keine Namen von Schülern oder Einzelpersonen und keine Kontaktdaten. Der Antragstext
              braucht sie nicht. Anonyme Angaben über Gruppen (z. B. „80 % mit Migrationshintergrund")
              sind in Ordnung.
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#57534e]">
              Schulname (optional)
            </label>
            <input
              type="text"
              value={schulname}
              onChange={(e) => setSchulname(e.target.value)}
              placeholder="z. B. Gymnasium Musterstadt"
              className="w-full rounded-lg border border-[#1c1917]/15 bg-[#fdfdfc]/60 p-2 text-[#1c1917] placeholder-slate-400 transition focus:border-[#78350f] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#78350f]/15"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#57534e]">
              Schultyp
            </label>
            <select
              value={schultyp}
              onChange={(e) => setSchultyp(e.target.value)}
              className="w-full rounded-lg border border-[#1c1917]/15 bg-[#fdfdfc]/60 p-2 text-[#1c1917] transition focus:border-[#78350f] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#78350f]/15"
            >
              {SCHULTYPEN.map((t) => (
                <option key={t} value={t}>
                  {t || "— nicht festgelegt —"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#57534e]">
              Bundesland
            </label>
            <select
              value={bundesland}
              onChange={(e) => setBundesland(e.target.value)}
              className="w-full rounded-lg border border-[#1c1917]/15 bg-[#fdfdfc]/60 p-2 text-[#1c1917] transition focus:border-[#78350f] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#78350f]/15"
            >
              {BUNDESLAENDER.map((b) => (
                <option key={b} value={b}>
                  {b || "— nicht festgelegt —"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#57534e]">
              Geschätztes Budget (EUR, optional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={budgetStr}
              onChange={(e) => setBudgetStr(e.target.value)}
              placeholder="z. B. 25000"
              className="w-full rounded-lg border border-[#1c1917]/15 bg-[#fdfdfc]/60 p-2 text-[#1c1917] placeholder-slate-400 transition focus:border-[#78350f] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#78350f]/15"
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-[#78350f] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#92400e] disabled:cursor-not-allowed disabled:bg-[#78350f]/40"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Suche passende Programme…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Passende Programme finden
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
