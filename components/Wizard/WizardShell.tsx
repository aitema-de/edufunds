"use client";

import { useCallback, useEffect, useState } from "react";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type {
  WizardFacts,
  WizardMessage,
  WizardPhase,
  GenerationArtefacts,
} from "@/lib/wizard/types";
import {
  clearSchoolProfile,
  loadSchoolProfile,
  profileToSeedFacts,
  syncProfileFromFacts,
  type SchoolProfile,
} from "@/lib/wizard/school-profile-client";
import { QuestionCard } from "./QuestionCard";
import { ChronologySidebar } from "./ChronologySidebar";
import { GeneratingProgress } from "./GeneratingProgress";
import { AntragResult } from "./AntragResult";

interface WizardApiState {
  sessionToken: string;
  phase: WizardPhase;
  question: { content: string; rationale?: string } | null;
  ready: { summary: string } | null;
  totalQuestions: number;
  maxQuestions: number;
  facts: WizardFacts;
}

const STORAGE_KEY_PREFIX = "edufunds.wizard.session.";

interface Props {
  programm: Foerderprogramm;
}

export function WizardShell({ programm }: Props) {
  const storageKey = STORAGE_KEY_PREFIX + programm.id;

  const [state, setState] = useState<WizardApiState | null>(null);
  const [messages, setMessages] = useState<WizardMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState<GenerationArtefacts | null>(null);
  const [generationStage, setGenerationStage] = useState<string>("");
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);

  const loadSession = useCallback(async (token: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wizard/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      setMessages(body.messages ?? []);
      setGeneration(body.generation ?? null);
      const lastQuestion = [...(body.messages as WizardMessage[])]
        .reverse()
        .find((m) => m.role === "ai" && m.kind === "question");
      setState({
        sessionToken: body.sessionToken,
        phase: body.phase,
        question: lastQuestion
          ? {
              content: lastQuestion.content,
              rationale: (lastQuestion.meta as { rationale?: string } | undefined)?.rationale,
            }
          : null,
        ready: null,
        totalQuestions: body.interviewer?.totalQuestions ?? 0,
        maxQuestions: body.interviewer?.maxQuestions ?? 12,
        facts: body.facts ?? {},
      });
      const synced = syncProfileFromFacts(body.facts ?? {});
      if (synced) setSchoolProfile(synced);
    } catch (e) {
      localStorage.removeItem(storageKey);
      setError(e instanceof Error ? e.message : "Session konnte nicht geladen werden.");
    } finally {
      setBusy(false);
    }
  }, [storageKey]);

  const startSession = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const profile = loadSchoolProfile();
      const seedFacts = profile ? profileToSeedFacts(profile) : undefined;
      const res = await fetch("/api/wizard/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programmId: programm.id, seedFacts }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as WizardApiState;
      setState(body);
      localStorage.setItem(storageKey, body.sessionToken);
      const synced = syncProfileFromFacts(body.facts);
      if (synced) setSchoolProfile(synced);
      if (body.question) {
        setMessages([
          {
            id: "initial",
            role: "ai",
            kind: "question",
            content: body.question.content,
            at: new Date().toISOString(),
            meta: body.question.rationale ? { rationale: body.question.rationale } : undefined,
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }, [programm.id, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSchoolProfile(loadSchoolProfile());
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      loadSession(existing);
    }
  }, [storageKey, loadSession]);

  const submitAnswer = useCallback(async () => {
    if (!state || !answer.trim() || busy) return;
    const userAnswer = answer.trim();
    setAnswer("");
    setBusy(true);
    setError(null);

    const optimistic: WizardMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      kind: "answer",
      content: userAnswer,
      at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/wizard/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: state.sessionToken, answer: userAnswer }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as WizardApiState;
      setState(body);
      const synced = syncProfileFromFacts(body.facts);
      if (synced) setSchoolProfile(synced);
      const q = body.question;
      if (q) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            kind: "question",
            content: q.content,
            at: new Date().toISOString(),
            meta: q.rationale ? { rationale: q.rationale } : undefined,
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Antwort konnte nicht gesendet werden");
    } finally {
      setBusy(false);
    }
  }, [answer, busy, state]);

  const startGeneration = useCallback(async () => {
    if (!state) return;
    setBusy(true);
    setError(null);
    setGenerationStage("Pipeline startet");
    setState((s) => (s ? { ...s, phase: "generating" } : s));
    try {
      const res = await fetch("/api/wizard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: state.sessionToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      setGeneration(body.generation);
      setState((s) => (s ? { ...s, phase: "complete" } : s));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generierung fehlgeschlagen");
      setState((s) => (s ? { ...s, phase: "failed" } : s));
    } finally {
      setBusy(false);
    }
  }, [state]);

  const editAnswer = useCallback(
    async (messageId: string, newContent: string) => {
      if (!state || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/wizard/edit-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: state.sessionToken,
            messageId,
            newAnswer: newContent,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const body = await res.json();
        setMessages(body.messages ?? []);
        setState({
          sessionToken: state.sessionToken,
          phase: body.phase,
          question: body.question,
          ready: body.ready,
          totalQuestions: body.totalQuestions,
          maxQuestions: body.maxQuestions,
          facts: body.facts,
        });
        const synced = syncProfileFromFacts(body.facts);
        if (synced) setSchoolProfile(synced);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Antwort konnte nicht aktualisiert werden");
      } finally {
        setBusy(false);
      }
    },
    [busy, state]
  );

  const resetSession = useCallback(() => {
    localStorage.removeItem(storageKey);
    setState(null);
    setMessages([]);
    setGeneration(null);
    setError(null);
  }, [storageKey]);

  if (!state) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-slate-100">
          Neuer KI-Antragswizard
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-slate-400">
          Der Wizard führt dich in 6–12 gezielten Fragen durch die relevanten Punkte für
          „{programm.name}". Anschließend schreibt eine Pipeline mit Selbstkritik den Antragsentwurf.
        </p>
        {schoolProfile && (
          <div className="mx-auto mb-6 max-w-xl rounded-lg border border-[#c9a227]/30 bg-[#c9a227]/5 px-4 py-3 text-left text-sm text-slate-300">
            <div className="mb-1 font-medium text-[#c9a227]">
              Bekanntes Schulprofil wird übernommen
            </div>
            <div className="text-slate-400">
              {[
                schoolProfile.name,
                schoolProfile.typ,
                schoolProfile.bundesland,
                schoolProfile.schuelerzahl ? `${schoolProfile.schuelerzahl} Schüler` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Grunddaten vorhanden"}
              <button
                type="button"
                onClick={() => {
                  clearSchoolProfile();
                  setSchoolProfile(null);
                }}
                className="ml-2 text-xs text-slate-500 underline hover:text-slate-300"
              >
                löschen
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-400">{error}</p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={startSession}
          className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {busy ? "Starte…" : "Wizard starten"}
        </button>
      </div>
    );
  }

  if (state.phase === "generating") {
    return <GeneratingProgress stage={generationStage} />;
  }

  if (state.phase === "complete" && generation?.finalText) {
    return (
      <AntragResult
        programm={programm}
        generation={generation}
        onRestart={resetSession}
      />
    );
  }

  const canGenerate = state.phase === "ready_to_generate";

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {state.question && state.phase === "interviewing" && (
          <QuestionCard
            question={state.question.content}
            rationale={state.question.rationale}
            totalQuestions={state.totalQuestions}
            maxQuestions={state.maxQuestions}
            answer={answer}
            setAnswer={setAnswer}
            onSubmit={submitAnswer}
            busy={busy}
          />
        )}
        {canGenerate && (
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-8 text-center">
            <h3 className="mb-2 text-xl font-semibold text-slate-100">
              Genug Informationen gesammelt
            </h3>
            <p className="mx-auto mb-6 max-w-md text-slate-300">
              Die KI hat alles, was sie für einen guten Antrag braucht. Soll sie jetzt schreiben?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setState((s) => (s ? { ...s, phase: "interviewing" } : s));
                }}
                className="rounded-lg border border-slate-600 px-5 py-2 text-slate-200 transition hover:bg-slate-700"
              >
                Noch mehr ergänzen
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={startGeneration}
                className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                Antrag schreiben lassen
              </button>
            </div>
          </div>
        )}
      </div>
      <ChronologySidebar
        messages={messages}
        facts={state.facts}
        onEditAnswer={editAnswer}
        editBusy={busy}
        disableEdit={state.phase !== "interviewing" && state.phase !== "ready_to_generate"}
      />
    </div>
  );
}
