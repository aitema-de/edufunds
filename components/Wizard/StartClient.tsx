"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnliegenForm, type AnliegenValues } from "./AnliegenForm";
import { MatchResultList, type MatchEntry } from "./MatchResultList";
import { ClarificationCard } from "./ClarificationCard";
import { WizardErrorBlock } from "./WizardErrorBlock";
import { saveHandoff } from "@/lib/wizard/match-handoff-client";

/**
 * Tagged-Union-State fuer den Match-Flow (Plan 02-02 / D-08).
 * Backend liefert entweder eine Trefferliste oder eine Klaerungsfrage —
 * Frontend dispatched einmalig in JSX, kein Hybrid.
 */
type MatchState =
  | { kind: "ranking"; matches: MatchEntry[] }
  | { kind: "clarification"; question: string }
  | null;

interface RawError {
  message: string;
  httpStatus?: number;
}

/** AnliegenValues plus optionale Praezisierungs-Felder (zweite Runde nach D-09). */
type MatchRequestValues = AnliegenValues & {
  forceRanking?: boolean;
  previousAnliegen?: string;
};

export function StartClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<RawError | null>(null);
  const [matchState, setMatchState] = useState<MatchState>(null);
  const [lastInput, setLastInput] = useState<AnliegenValues | null>(null);
  // isSecondRound: D-09 Multi-Round-Guard — true nach erster CLARIFY-Antwort,
  // verhindert Endlos-Loop falls Backend trotz forceRanking erneut clarification liefert.
  const [isSecondRound, setIsSecondRound] = useState(false);

  const handleReset = () => {
    setMatchState(null);
    setError(null);
    setIsSecondRound(false);
    // lastInput bleibt — User soll im Form-Wert weiterhin sehen, was er getippt hat
  };

  const runMatch = async (values: MatchRequestValues) => {
    setBusy(true);
    setError(null);
    setMatchState(null);
    // WR-02: Frischer AnliegenForm-Submit (kein forceRanking-Flag) → Multi-Round-Guard
    // zuruecksetzen. Verhindert Sticky-Bug nach fehlgeschlagener zweiter Runde,
    // bei der setIsSecondRound(false) im Erfolgs-Branch nicht erreicht wurde.
    if (!values.forceRanking) setIsSecondRound(false);
    // lastInput haelt den User-sichtbaren Anliegen-Stand (ohne forceRanking-Flag),
    // damit Praezisieren auf den vorherigen Wert zurueckgreifen kann.
    setLastInput({
      anliegen: values.anliegen,
      schulname: values.schulname,
      schultyp: values.schultyp,
      bundesland: values.bundesland,
      geschaetztesBudgetEur: values.geschaetztesBudgetEur,
    });
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
      // Tagged-Union-Dispatch (D-08 + D-09 Multi-Round-Guard).
      if (body.kind === "clarification" && !isSecondRound) {
        setMatchState({ kind: "clarification", question: body.question });
      } else if (body.kind === "clarification" && isSecondRound) {
        // D-09 Guard: zweite Klaerung trotz forceRanking — Fallback auf leere Liste mit Hinweis.
        setMatchState({ kind: "ranking", matches: [] });
        setError({
          message:
            "Anliegen ist vage geblieben — bitte praezisere die Eingabe oder probiere mehr Details.",
        });
      } else if (body.kind === "ranking") {
        setMatchState({
          kind: "ranking",
          matches: (body.matches ?? []) as MatchEntry[],
        });
        setIsSecondRound(false);
      } else {
        // WR-01: Unbekanntes body.kind als Backend-Bug behandeln, NICHT als "keine Treffer".
        // Verhindert dass ein vergessenes kind-Feld silent als leeres Ranking durchrutscht.
        setError({
          message: `Unerwartetes Antwortformat (kind=${String(body.kind)}). Bitte erneut versuchen.`,
        });
      }
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Matching fehlgeschlagen" });
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    if (lastInput) runMatch(lastInput);
  };

  /**
   * D-11 Praezisieren-Pfad: User antwortet auf Klaerungsfrage.
   * Sendet zweiten /api/match-Call mit forceRanking=true und previousAnliegen.
   */
  const handlePraezisierung = async (praezisierung: string) => {
    if (!lastInput) return;
    setIsSecondRound(true);
    await runMatch({
      ...lastInput,
      anliegen: praezisierung,
      previousAnliegen: lastInput.anliegen,
      forceRanking: true,
    });
  };

  /**
   * D-11 Override-Pfad: User klickt "Trotzdem ranken" ohne Praezisierung.
   * Sendet zweiten /api/match-Call mit forceRanking=true ohne previousAnliegen.
   */
  const handleForceRanking = async () => {
    if (!lastInput) return;
    setIsSecondRound(true);
    await runMatch({ ...lastInput, forceRanking: true });
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
      {matchState !== null && (
        <div className="pt-2">
          {matchState.kind === "ranking" && (
            <MatchResultList matches={matchState.matches} onStartAntrag={startAntrag} onReset={handleReset} />
          )}
          {matchState.kind === "clarification" && (
            <ClarificationCard
              question={matchState.question}
              onSubmit={handlePraezisierung}
              onForceRanking={handleForceRanking}
              busy={busy}
            />
          )}
        </div>
      )}
    </div>
  );
}
