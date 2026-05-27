"use client";

import { useCallback, useEffect, useState } from "react";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type {
  WizardFacts,
  WizardMessage,
  WizardPhase,
  GenerationArtefacts,
  PipelineStage,
} from "@/lib/wizard/types";
import { STAGE_LABELS } from "@/lib/wizard/stage-labels";
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
import { ReadinessAmpel } from "./ReadinessAmpel";
import type { ReadinessReport } from "@/lib/wizard/facts-readiness";
import { listLocalSessions } from "@/lib/wizard/session-index-client";
import { WizardErrorBlock } from "./WizardErrorBlock";

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
  generation?: GenerationArtefacts | null;
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
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);

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
        generation: body.generation ?? null,
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

  // Readiness-Check, sobald der Wizard ready ist. Serverseitig ausgewertet,
  // damit Richtlinien-basierte Zusatzchecks (z. B. Eigenanteils-Pflicht) mitlaufen.
  useEffect(() => {
    if (state?.phase !== "ready_to_generate" || !state.sessionToken) {
      setReadiness(null);
      return;
    }
    let cancelled = false;
    fetch("/api/wizard/readiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: state.sessionToken }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d === "object" && "status" in d) {
          setReadiness(d as ReadinessReport);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state?.phase, state?.sessionToken]);

  // D-12 Reload-Resume: Bei phase=generating polle die GET-Route alle 2 Sekunden,
  // statt /api/wizard/generate neu zu starten (Pattern S-1 aus CheckoutSuccessClient).
  useEffect(() => {
    if (state?.phase !== "generating" || !state.sessionToken) return;
    let cancelled = false;
    let consecutiveFailures = 0;

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/wizard/${state.sessionToken}`, { cache: "no-store" });
        if (res.ok) {
          // Recovery: vorherige Connection-Hicccups (BEFUND-2) waren transient — Banner wegnehmen.
          if (consecutiveFailures > 0) setError(null);
          consecutiveFailures = 0;
          const body = await res.json();
          if (cancelled) return;
          // Stage-Heartbeat aus DB-Persistenz
          const stageKey = body.generation?.stage as PipelineStage | undefined;
          if (stageKey) setGenerationStage(STAGE_LABELS[stageKey] ?? stageKey);
          // Phase-Uebergang erkennen
          if (body.phase === "complete" && body.generation?.finalText) {
            setGeneration(body.generation);
            setState((s) => s ? { ...s, phase: "complete", costs: body.costs ?? s.costs, generation: body.generation } : s);
            return; // Polling stoppt durch Effect-Re-Run (state.phase != generating)
          }
          if (body.phase === "failed") {
            setState((s) => s ? { ...s, phase: "failed" } : s);
            setError("Generierung fehlgeschlagen — bitte neu versuchen.");
            return;
          }
          // Andernfalls: state.generation aktualisieren fuer GeneratingProgress.currentStage
          if (body.generation) {
            setState((s) => s ? { ...s, generation: body.generation } : s);
          }
        } else {
          consecutiveFailures += 1;
        }
      } catch {
        consecutiveFailures += 1;
      }
      // BEFUND-2 (2026-05-27): Statt komplett zu stoppen, in Degraded-Mode wechseln.
      // Server-Pipeline läuft im Hintergrund weiter (idempotent durch phase=complete-Check);
      // die Verbindung kann sich erholen (Cloudflare/Traefik-Hicccup, kurzfristiger TCP-Reset).
      if (consecutiveFailures === 5) {
        setError("Server-Verbindung instabil — Pipeline läuft im Hintergrund weiter. Falls dein Antrag nicht binnen 2 Minuten erscheint, lade die Seite neu (deine Eingaben bleiben gespeichert).");
      }
      // Erstmal 2s zwischen Polls, ab dem 5. failure auf 8s drosseln (degraded mode).
      const nextInterval = consecutiveFailures >= 5 ? 8000 : 2000;
      if (!cancelled) setTimeout(tick, nextInterval);
    };
    tick();
    return () => { cancelled = true; };
  }, [state?.phase, state?.sessionToken]);

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
        // 409 = Pipeline lief schon durch (Idempotenz / Reload-Race). D-12-Polling
        // (Z. 217 ff.) erkennt phase=complete beim nächsten Tick.
        if (res.status === 409) {
          setBusy(false);
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      setGeneration(body.generation);
      setState((s) => (s ? { ...s, phase: "complete", costs: body.costs ?? s.costs } : s));
    } catch (e) {
      // BEFUND-2 (2026-05-27): Browser-Fetch wirft TypeError bei Netzwerk-Fehlern
      // (ERR_CONNECTION_REFUSED, ECONNRESET, abgeschnittene Cloudflare-Connection).
      // Die Pipeline läuft serverseitig oft trotzdem weiter — D-12-Polling-Effect
      // (Z. 217 ff.) holt das Ergebnis nach, solange phase=generating bleibt.
      // Daher: bei TypeError phase=generating LASSEN, Polling übernimmt.
      if (e instanceof TypeError) {
        setBusy(false);
        return;
      }
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
        <div className="rounded-xl border border-[#0a1628]/10 bg-white/80 p-8 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-[#0a1628]">
          Neuer KI-Antragswizard
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-slate-600">
          Der Wizard führt dich in 6–12 gezielten Fragen durch die relevanten Punkte für
          „{programm.name}". Anschließend schreibt eine Pipeline mit Selbstkritik den Antragsentwurf.
        </p>
        {handoff && (
          <div className="mx-auto mb-4 max-w-xl rounded-lg border border-[#c9a227]/30 bg-[#c9a227]/5 px-4 py-3 text-left text-sm text-slate-700">
            <div className="mb-1 font-medium text-[#c9a227]">
              Dein Anliegen wird übernommen
            </div>
            <div className="text-slate-600 italic">
              „{handoff.anliegen.length > 200
                ? handoff.anliegen.slice(0, 200) + "…"
                : handoff.anliegen}"
              {handoff.fromMatchScore && (
                <span className="ml-2 text-xs text-[#c9a227]">
                  · Passung {handoff.fromMatchScore} %
                </span>
              )}
            </div>
          </div>
        )}
        {schoolProfile && (
          <div className="mx-auto mb-6 max-w-xl rounded-lg border border-[#c9a227]/30 bg-[#c9a227]/5 px-4 py-3 text-left text-sm text-slate-700">
            <div className="mb-1 font-medium text-[#c9a227]">
              Bekanntes Schulprofil wird übernommen
            </div>
            <div className="text-slate-600">
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
                className="ml-2 text-xs text-slate-500 underline hover:text-slate-700"
              >
                löschen
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="mx-auto mb-4 max-w-xl text-left">
            <WizardErrorBlock message={error} onRetry={startSession} busy={busy} />
          </div>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={startSession}
          className="rounded-lg bg-[#c9a227] px-6 py-3 font-semibold text-white transition hover:bg-[#b8921e] disabled:opacity-50"
        >
          {busy ? "Starte…" : "Wizard starten"}
        </button>
      </div>
      </>
    );
  }

  if (state.phase === "generating") {
    return <GeneratingProgress
      stage={generationStage}
      currentStage={state.generation?.stage as PipelineStage | undefined}
    />;
  }

  if (state.phase === "failed") {
    return (
      <WizardErrorBlock
        message={error ?? "Die Generierung ist fehlgeschlagen. Pruefe deine Verbindung und versuche es erneut."}
        onRetry={() => {
          setError(null);
          setState((s) => s ? { ...s, phase: "ready_to_generate" } : s);
        }}
        busy={false}
      />
    );
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
          <div className="mb-4">
            <WizardErrorBlock message={error} />
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
          <div className="rounded-xl border border-[#c9a227]/40 bg-[#c9a227]/10 p-8">
            <h3 className="mb-2 text-xl font-semibold text-[#0a1628]">
              Genug Informationen gesammelt
            </h3>
            <p className="mb-6 max-w-xl text-slate-700">
              Die KI hat aus deinen Antworten diese Fakten erfasst. Passt das, schreibt sie jetzt den Antrag — sechs Schritte:
              Gliederung → Abschnitte → Gutachten → Revision → Re-Check → Finanzplan + Konsistenzprüfung. Typisch 1–3 Minuten, ca. 0,20–0,35 € KI-Kosten.
            </p>
            <div className="mb-4 rounded-lg border border-[#0a1628]/10 bg-[#f8f5f0] p-4">
              <FactsPanel facts={state.facts} compact />
            </div>
            {readiness && (
              <div className="mb-6">
                <ReadinessAmpel report={readiness} />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setState((s) => (s ? { ...s, phase: "interviewing" } : s));
                }}
                className="rounded-lg border border-[#0a1628]/15 px-5 py-2 text-[#1e3a61] transition hover:bg-slate-100"
              >
                Noch mehr ergänzen
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={startGeneration}
                className={
                  "rounded-lg px-6 py-2 font-semibold text-white transition disabled:opacity-50 " +
                  (readiness?.status === "kritisch"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-[#c9a227] hover:bg-[#b8921e]")
                }
                title={
                  readiness?.status === "kritisch"
                    ? "Es fehlen Kernfakten — der Antrag wird wahrscheinlich generisch. Besser erst ergänzen."
                    : undefined
                }
              >
                {readiness?.status === "kritisch"
                  ? "Trotzdem generieren"
                  : "Antrag schreiben lassen"}
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
