"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnliegenForm, type AnliegenValues } from "./AnliegenForm";
import { MatchResultList, type MatchEntry } from "./MatchResultList";
import { WizardErrorBlock } from "./WizardErrorBlock";
import { saveHandoff } from "@/lib/wizard/match-handoff-client";

interface RawError {
  message: string;
  httpStatus?: number;
}

export function StartClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<RawError | null>(null);
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
        const msg = body.error ?? `HTTP ${res.status}`;
        setError({ message: String(msg), httpStatus: res.status });
        return;
      }
      const body = await res.json();
      setMatches((body.matches ?? []) as MatchEntry[]);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Matching fehlgeschlagen" });
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    if (lastInput) runMatch(lastInput);
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
        <WizardErrorBlock
          message={error.message}
          httpStatus={error.httpStatus}
          onRetry={retry}
          busy={busy}
        />
      )}
      {matches !== null && (
        <div className="pt-2">
          <MatchResultList matches={matches} onStartAntrag={startAntrag} />
        </div>
      )}
    </div>
  );
}
