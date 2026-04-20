"use client";

import { useCallback, useEffect, useState } from "react";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type {
  WizardFacts,
  WizardMessage,
  WizardPhase,
  GenerationArtefacts,
} from "@/lib/wizard/types";
import type { CostLedger } from "@/lib/wizard/pricing";
import {
  clearSchoolProfile,
  loadSchoolProfile,
  profileToSeedFacts,
  syncProfileFromFacts,
  type SchoolProfile,
} from "@/lib/wizard/school-profile-client";
import {
  consumeHandoff,
  handoffToSeedFacts,
  type MatchHandoff,
} from "@/lib/wizard/match-handoff-client";
import { QuestionCard } from "./QuestionCard";
import { ChronologySidebar } from "./ChronologySidebar";
import { GeneratingProgress } from "./GeneratingProgress";
import { AntragResult } from "./AntragResult";
import { FactsPanel } from "./FactsPanel";
import { KumulierungsWarnung, type Conflict } from "./KumulierungsWarnung";
import { listLocalSessions } from "@/lib/wizard/session-index-client";

interface WizardApiState {
  sessionToken: string;
  phase: WizardPhase;
  question: { content: string; rationale?: string } | null;
  ready: { summary: string } | null;
  totalQuestions: number;
  maxQuestions: number;
  facts: WizardFacts;
  costs?: CostLedger | null;
  paidToken?: string | null;
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
  const [handoff, setHandoff] = useState<MatchHandoff | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

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
        costs: body.costs ?? null,
        paidToken: body.paidToken ?? null,
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
      const profileSeed = profile ? profileToSeedFacts(profile) : undefined;
      const handoffSeed = handoff ? handoffToSeedFacts(handoff) : undefined;
      const seedFacts = { ...(profileSeed ?? {}), ...(handoffSeed ?? {}) };
      const hasSeed = Object.keys(seedFacts).length > 0;
      const res = await fetch("/api/wizard/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programmId: programm.id,
          seedFacts: hasSeed ? seedFacts : undefined,
        }),
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
  }, [handoff, programm.id, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSchoolProfile(loadSchoolProfile());
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      loadSession(existing);
    } else {
      // Nur beim ersten Start (kein fortgesetztes Gespraech) Handoff konsumieren
      const h = consumeHandoff();
      if (h) setHandoff(h);
    }

    // Kumulierungs-Check gegen andere Sessions im Browser (Initial-Lauf).
    // Wenn wir bereits einen sessionToken aus localStorage haben, schicken wir
    // den mit — sonst fehlen die eigenen Facts und Overlap-Heuristik ist blind.
    const others = listLocalSessions().filter((s) => s.programmId !== programm.id);
    if (others.length > 0) {
      fetch("/api/wizard/kumulierungs-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programmId: programm.id,
          otherSessionTokens: others.map((o) => o.sessionToken),
          ...(existing ? { currentSessionToken: existing } : {}),
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.conflicts && setConflicts(d.conflicts))
        .catch(() => {});
    }
  }, [storageKey, loadSession, programm.id]);

  // Re-Check Kumulierung, sobald Projekt-Facts sich aendern (debounced).
  // Faengt den Fall "Ueberlappung wird erst nach 2-3 Fragen sichtbar" ab.
  const projektKey = JSON.stringify(state?.facts?.projekt ?? null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!state?.sessionToken) return;
    const projekt = state.facts?.projekt as
      | { titel?: string; kurzbeschreibung?: string }
      | undefined;
    if (!projekt?.titel && !projekt?.kurzbeschreibung) return;
    const others = listLocalSessions().filter((s) => s.programmId !== programm.id);
    if (others.length === 0) return;
    const timer = setTimeout(() => {
      fetch("/api/wizard/kumulierungs-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programmId: programm.id,
          otherSessionTokens: others.map((o) => o.sessionToken),
          currentSessionToken: state.sessionToken,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.conflicts && setConflicts(d.conflicts))
        .catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [state?.sessionToken, projektKey, programm.id]);

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
      setState((s) => (s ? { ...s, phase: "complete", costs: body.costs ?? s.costs } : s));
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
          costs: body.costs ?? null,
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
      <>
        <KumulierungsWarnung conflicts={conflicts} onDismiss={() => setConflicts([])} />
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-slate-100">
          Neuer KI-Antragswizard
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-slate-400">
          Der Wizard führt dich in 6–12 gezielten Fragen durch die relevanten Punkte für
          „{programm.name}". Anschließend schreibt eine Pipeline mit Selbstkritik den Antragsentwurf.
        </p>
        {handoff && (
          <div className="mx-auto mb-4 max-w-xl rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3 text-left text-sm text-slate-300">
            <div className="mb-1 font-medium text-orange-300">
              Dein Anliegen wird übernommen
            </div>
            <div className="text-slate-400 italic">
              „{handoff.anliegen.length > 200
                ? handoff.anliegen.slice(0, 200) + "…"
                : handoff.anliegen}"
              {handoff.fromMatchScore && (
                <span className="ml-2 text-xs text-orange-400">
                  · Passung {handoff.fromMatchScore} %
                </span>
              )}
            </div>
          </div>
        )}
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
      </>
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
        costs={state.costs ?? null}
        sessionToken={state.sessionToken}
        paidToken={state.paidToken ?? null}
        onRestart={resetSession}
        onFinanzplanChange={(plan) => {
          setGeneration((g) => (g ? { ...g, finanzplan: plan } : g));
        }}
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
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-8">
            <h3 className="mb-2 text-xl font-semibold text-slate-100">
              Genug Informationen gesammelt
            </h3>
            <p className="mb-6 max-w-xl text-slate-300">
              Die KI hat aus deinen Antworten diese Fakten erfasst. Passt das, schreibt sie jetzt den Antrag — vier Schritte:
              Gliederung → Abschnitte → Gutachten → Finalfassung. Typisch 1–3 Minuten, ca. 0,20–0,35 € KI-Kosten.
            </p>
            <div className="mb-6 rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
              <FactsPanel facts={state.facts} compact />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
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
