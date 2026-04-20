"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnliegenForm, type AnliegenValues } from "./AnliegenForm";
import { MatchResultList, type MatchEntry } from "./MatchResultList";
import { saveHandoff } from "@/lib/wizard/match-handoff-client";

export function StartClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchEntry[] | null>(null);
  const [lastInput, setLastInput] = useState<AnliegenValues | null>(null);

  const runMatch = async (values: AnliegenValues) => {
    setBusy(true);
    setError(null);
    setMatches(null);
    setLastInput(values);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      setMatches((body.matches ?? []) as MatchEntry[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matching fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const startAntrag = (m: MatchEntry) => {
    if (!lastInput) return;
    saveHandoff({
      anliegen: lastInput.anliegen,
      schulname: lastInput.schulname,
      schultyp: lastInput.schultyp,
      bundesland: lastInput.bundesland,
      geschaetztesBudgetEur: lastInput.geschaetztesBudgetEur,
      fromMatchScore: m.score,
    });
    router.push(`/antrag/${m.id}/wizard`);
  };

  return (
    <div className="space-y-6">
      <AnliegenForm onSubmit={runMatch} busy={busy} />
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {matches !== null && (
        <div className="pt-2">
          <MatchResultList matches={matches} onStartAntrag={startAntrag} />
        </div>
      )}
    </div>
  );
}
