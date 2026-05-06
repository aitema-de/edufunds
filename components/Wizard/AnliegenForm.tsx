"use client";

import { KeyboardEvent, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
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
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-6">
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Dein Anliegen <span className="text-red-400">*</span>
          </label>
          <textarea
            value={anliegen}
            onChange={(e) => setAnliegen(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Beschreibe, was du an deiner Schule umsetzen willst — konkret, mit Zielgruppe und Wirkung. Beispiel: Wir wollen 120 Fünft- und Sechstklässlern Programmieren mit Calliope näherbringen. 80 % Migrationshintergrund, MINT-Lücke spürbar."
            rows={5}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3 sm:min-h-[140px] text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>
              {anliegen.trim().length < 20
                ? `Mindestens 20 Zeichen (${anliegen.trim().length}/20)`
                : `${anliegen.trim().length} Zeichen`}
            </span>
            <span>Strg/⌘+Enter sendet</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Schulname (optional)
            </label>
            <input
              type="text"
              value={schulname}
              onChange={(e) => setSchulname(e.target.value)}
              placeholder="z. B. Gymnasium Musterstadt"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Schultyp
            </label>
            <select
              value={schultyp}
              onChange={(e) => setSchultyp(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-slate-100 focus:border-orange-500 focus:outline-none"
            >
              {SCHULTYPEN.map((t) => (
                <option key={t} value={t}>
                  {t || "— nicht festgelegt —"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Bundesland
            </label>
            <select
              value={bundesland}
              onChange={(e) => setBundesland(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-slate-100 focus:border-orange-500 focus:outline-none"
            >
              {BUNDESLAENDER.map((b) => (
                <option key={b} value={b}>
                  {b || "— nicht festgelegt —"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Geschätztes Budget (EUR, optional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={budgetStr}
              onChange={(e) => setBudgetStr(e.target.value)}
              placeholder="z. B. 25000"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
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
