"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type {
  WizardFacts,
  WizardMessage,
  WizardPhase,
  GenerationArtefacts,
  PipelineStage,
  Texttiefe,
} from "@/lib/wizard/types";
import { STAGE_LABELS } from "@/lib/wizard/stage-labels";
import type { CostLedger } from "@/lib/wizard/pricing";
import type { EinreichungInfo } from "@/lib/wizard/einreichung";
import {
  clearSchoolProfile,
  loadSchoolProfile,
  profileToSeedFacts,
  syncProfileFromFacts,
  type SchoolProfile,
} from "@/lib/wizard/school-profile-client";
import {
  consumeHandoff,
  clearHandoff,
  handoffToSeedFacts,
  type MatchHandoff,
} from "@/lib/wizard/match-handoff-client";
import { QuestionCard } from "./QuestionCard";
import { ChronologySidebar } from "./ChronologySidebar";
import { GeneratingProgress } from "./GeneratingProgress";
import { AntragResult } from "./AntragResult";
import type { Foerderhoehe } from "@/lib/foerderhoehe-empfehlung";
import { FactsPanel } from "./FactsPanel";
import { KumulierungsWarnung, type Conflict } from "./KumulierungsWarnung";
import { ReadinessAmpel } from "./ReadinessAmpel";
import type { ReadinessReport } from "@/lib/wizard/facts-readiness";
import { listLocalSessions } from "@/lib/wizard/session-index-client";
import { WizardErrorBlock } from "./WizardErrorBlock";
import { ResumeOptIn } from "./ResumeOptIn";

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

/** Formatiert den ISO-Zeitstempel des Schulprofils als lesbares Datum (de-DE). */
function formatProfileDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

interface Props {
  programm: Foerderprogramm;
  einreichung?: EinreichungInfo | null;
  /** P4-B M-Erweiterung: strukturierte Förderhöhe aus dem Dossier für die Beantragungshöhe-Empfehlung. */
  foerderhoehe?: Foerderhoehe | null;
}

export function WizardShell({ programm, einreichung, foerderhoehe }: Props) {
  const storageKey = STORAGE_KEY_PREFIX + programm.id;

  const [state, setState] = useState<WizardApiState | null>(null);
  const [messages, setMessages] = useState<WizardMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState<GenerationArtefacts | null>(null);
  // P3-B (Feedback 24.06.): vom Nutzer wählbare Schreibtiefe für die Generierung.
  const [texttiefe, setTexttiefe] = useState<Texttiefe>("standard");
  const [generationStage, setGenerationStage] = useState<string>("");
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [handoff, setHandoff] = useState<MatchHandoff | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  // Token einer gespeicherten Session, deren Laden gerade fehlschlug. Solange
  // er gesetzt ist, bieten wir „Erneut laden" an, statt den Antrag zu verlieren.
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);

  const loadSession = useCallback(async (token: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wizard/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Nur wenn die Session serverseitig wirklich weg ist (404/410), den
        // lokalen Token verwerfen. Bei transienten Fehlern (5xx, Netzwerk)
        // bleibt der Token erhalten, damit der Antrag wiederfindbar ist.
        if (res.status === 404 || res.status === 410) {
          localStorage.removeItem(storageKey);
          setResumeToken(null);
          throw new Error(
            body.error ?? "Dieser Antrag wurde nicht gefunden oder ist abgelaufen."
          );
        }
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
      setResumeToken(null);
    } catch (e) {
      // Token NICHT loeschen — bei transienten Fehlern soll der Antrag beim
      // naechsten Versuch wieder ladbar sein. resumeToken bleibt gesetzt,
      // damit die UI „Erneut laden" anbietet (siehe !state-Zweig).
      setError(e instanceof Error ? e.message : "Antrag konnte nicht geladen werden.");
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
      setResumeToken(body.sessionToken);
      // Handoff erst jetzt verwerfen — nach erfolgreichem Start ist er
      // sicher in die Session eingeflossen.
      clearHandoff();
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
    // Cross-Device-Resume (B4): kommt ein ?session=<token> aus „Meine Anträge"
    // (per Magic-Link auf einem anderen Gerät), uebernimm den Token und merke ihn
    // lokal, damit kuenftige Besuche ohne Link weiterlaufen.
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("session");
    if (fromUrl) {
      localStorage.setItem(storageKey, fromUrl);
      // URL bereinigen, damit der Token nicht im Verlauf/Share haengen bleibt.
      window.history.replaceState(null, "", window.location.pathname);
    }
    const existing = fromUrl ?? localStorage.getItem(storageKey);
    if (existing) {
      setResumeToken(existing);
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
        setError("Server-Verbindung instabil — Pipeline läuft im Hintergrund weiter. Falls Ihr Antrag nicht binnen 2 Minuten erscheint, laden Sie die Seite neu (Ihre Eingaben bleiben gespeichert).");
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
      // Senden fehlgeschlagen: optimistische Nachricht entfernen und Eingabe
      // wiederherstellen, damit direkt erneut gesendet werden kann. Die Antwort
      // ist serverseitig bereits gesichert (Datenverlust-Schutz); erneutes Senden
      // schliesst den Turn ab (Server ersetzt die unverarbeitete Antwort statt zu doppeln).
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setAnswer(userAnswer);
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
        body: JSON.stringify({ sessionToken: state.sessionToken, texttiefe }),
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
  }, [state, texttiefe]);

  const editAnswer = useCallback(
    async (messageId: string, newContent: string): Promise<boolean> => {
      // Liefert true nur bei tatsaechlichem Erfolg zurueck. Der Aufrufer
      // (ChronologySidebar) laesst den Editor bei false offen und zeigt den
      // Fehler an — so wird ein fehlgeschlagenes Speichern nicht mehr als
      // „nichts passiert / alter Text bleibt" missverstanden.
      if (!state || busy) return false;
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
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Antwort konnte nicht aktualisiert werden");
        return false;
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

  // Wiederherstellungs-Ansicht: Es gibt einen gespeicherten Antrag, dessen
  // Laden gerade fehlschlug. Statt den Antrag scheinbar zu verlieren (und nur
  // „Wizard starten" anzubieten, was eine neue Session erzeugt), bieten wir
  // hier prominent das erneute Laden an.
  if (!state && resumeToken && error) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-8 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-[#1c1917]">
          Ihr Antrag ist gespeichert
        </h2>
        <p className="mx-auto mb-2 max-w-xl text-slate-700">
          Wir konnten ihn gerade nicht laden — das ist meist nur eine kurze
          Verbindungsstörung. Ihr Fortschritt ist sicher gespeichert und geht
          nicht verloren.
        </p>
        <p className="mx-auto mb-6 max-w-xl text-sm text-slate-500">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => loadSession(resumeToken)}
            className="rounded-lg bg-[#1e3d32] px-6 py-3 font-semibold text-white transition hover:bg-[#2a5244] disabled:opacity-50"
          >
            {busy ? "Lade…" : "Antrag erneut laden"}
          </button>
          <a
            href="/antrag/meine"
            className="rounded-lg border border-[#1c1917]/15 px-6 py-3 font-medium text-[#57534e] transition hover:bg-white"
          >
            Meine Anträge
          </a>
        </div>
        <button
          type="button"
          onClick={resetSession}
          className="mt-5 text-xs text-slate-600 underline hover:text-slate-600"
        >
          Stattdessen neuen Antrag starten
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <>
        <KumulierungsWarnung conflicts={conflicts} onDismiss={() => setConflicts([])} />
        <div className="rounded-xl border border-[#1c1917]/10 bg-white/80 p-8 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-[#1c1917]">
          KI-Antragswizard
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-slate-600">
          Der Wizard führt Sie in 6–12 gezielten Fragen durch die relevanten Punkte für
          „{programm.name}". Anschließend schreibt eine Pipeline mit Selbstkritik den Antragsentwurf.
        </p>
        {handoff && (
          <div className="mx-auto mb-4 max-w-xl rounded-lg border border-[#1e3d32]/30 bg-[#1e3d32]/5 px-4 py-3 text-left text-sm text-slate-700">
            <div className="mb-1 font-medium text-[#1e3d32]">
              Ihr Anliegen wird übernommen
            </div>
            <div className="text-slate-600 italic">
              „{handoff.anliegen.length > 200
                ? handoff.anliegen.slice(0, 200) + "…"
                : handoff.anliegen}"
              {handoff.fromMatchScore && (
                <span className="ml-2 text-xs text-[#1e3d32]">
                  · Passung {handoff.fromMatchScore} %
                </span>
              )}
            </div>
          </div>
        )}
        {schoolProfile && (
          <div className="mx-auto mb-6 max-w-xl rounded-lg border border-[#1e3d32]/30 bg-[#1e3d32]/5 px-4 py-3 text-left text-sm text-slate-700">
            <div className="mb-1 font-medium text-[#1e3d32]">
              Schulprofil aus einer früheren Sitzung
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Diese Angaben stammen aus einem früheren Antrag in diesem Browser
              {formatProfileDate(schoolProfile.updatedAt)
                ? ` (zuletzt ergänzt am ${formatProfileDate(schoolProfile.updatedAt)})`
                : ""}{" "}
              und werden als Ausgangspunkt übernommen. Passen sie nicht zu diesem
              Antrag, verwerfen Sie sie hier.
            </p>
            <div className="flex flex-wrap items-baseline gap-x-2 text-slate-700">
              <span className="font-medium">
                {[
                  schoolProfile.name,
                  schoolProfile.typ,
                  schoolProfile.bundesland,
                  schoolProfile.schuelerzahl ? `${schoolProfile.schuelerzahl} Schüler` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Grunddaten vorhanden"}
              </span>
              <button
                type="button"
                onClick={() => {
                  clearSchoolProfile();
                  setSchoolProfile(null);
                }}
                className="text-xs text-slate-500 underline hover:text-slate-700"
              >
                verwerfen
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
          className="rounded-lg bg-[#1e3d32] px-6 py-3 font-semibold text-white transition hover:bg-[#2a5244] disabled:opacity-50"
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
        message={error ?? "Die Generierung ist fehlgeschlagen. Pruefen Sie Ihre Verbindung und versuchen Sie es erneut."}
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
        foerderhoehe={foerderhoehe}
        costs={state.costs ?? null}
        sessionToken={state.sessionToken}
        paidToken={state.paidToken ?? null}
        einreichung={einreichung}
        onRestart={resetSession}
        onFinanzplanChange={(plan) => {
          setGeneration((g) => (g ? { ...g, finanzplan: plan } : g));
        }}
      />
    );
  }

  const canGenerate = state.phase === "ready_to_generate";

  // FP-NEU-B: Die angezeigte Fragenzahl aus den tatsaechlich gezeigten KI-Fragen
  // ableiten statt aus dem server-internen Zaehler. Letzterer kann bei einem
  // Resend (Netzwerk-Retry) doppelt hochzaehlen, sodass die Anzeige springt
  // (z. B. „Frage 3" → „Frage 6"). Die Zahl der gezeigten Fragen waechst dagegen
  // monoton um genau 1 pro Runde und entspricht dem, was der Nutzer wahrnimmt.
  const gezeigteFragen = messages.filter(
    (m) => m.role === "ai" && m.kind === "question"
  ).length;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4">
          <ResumeOptIn sessionToken={state.sessionToken} />
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Ihr Fortschritt wird automatisch gespeichert.{" "}
          <a href="/antrag/meine" className="underline hover:text-slate-700">
            Unter „Meine Anträge"
          </a>{" "}
          finden Sie ihn jederzeit wieder.
        </p>
        {error && (
          <div className="mb-4">
            <WizardErrorBlock message={error} />
          </div>
        )}
        {state.question && state.phase === "interviewing" && (
          <QuestionCard
            question={state.question.content}
            rationale={state.question.rationale}
            totalQuestions={gezeigteFragen || state.totalQuestions}
            maxQuestions={state.maxQuestions}
            answer={answer}
            setAnswer={setAnswer}
            onSubmit={submitAnswer}
            busy={busy}
          />
        )}
        {state.phase === "interviewing" && !state.question && (
          <div className="rounded-xl border border-[#1e3d32]/40 bg-white p-6">
            <h3 className="mb-1 text-lg font-semibold text-[#1c1917]">
              Noch etwas ergänzen?
            </h3>
            <p className="mb-3 text-sm text-slate-600">
              Schreiben Sie weitere Angaben, die im Antrag berücksichtigt werden sollen.
              Die KI bezieht sie ein und stellt bei Bedarf eine Anschlussfrage.
            </p>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Weitere Angaben zu Ihrem Vorhaben …"
              className="w-full rounded-lg border border-[#1c1917]/15 bg-[#fdfdfc] p-3 text-sm text-[#1c1917] placeholder-slate-500 focus:border-[#1e3d32] focus:outline-none focus:ring-2 focus:ring-[#1e3d32]/20"
            />
            <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setState((s) => (s ? { ...s, phase: "ready_to_generate" } : s))}
                className="rounded-lg border border-[#1c1917]/15 px-5 py-2 text-[#57534e] transition hover:bg-slate-100"
              >
                Fertig — zum Antrag
              </button>
              <button
                type="button"
                disabled={busy || !answer.trim()}
                onClick={submitAnswer}
                className="rounded-lg bg-[#1e3d32] px-6 py-2 font-semibold text-white transition hover:bg-[#2a5244] disabled:opacity-50"
              >
                {busy ? "Sende…" : "Ergänzung senden"}
              </button>
            </div>
            {/* 86ca910kr: gleiche Live-Rückmeldung wie in der QuestionCard. */}
            {busy && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 flex items-center gap-3 rounded-lg border border-[#1e3d32]/25 bg-[#1e3d32]/5 px-4 py-3 text-sm text-[#1e3d32]"
              >
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span>
                  Ihre Ergänzung ist angekommen — die KI arbeitet sie ein. Das dauert einen
                  Moment …
                </span>
              </div>
            )}
          </div>
        )}
        {canGenerate && (
          <div className="rounded-xl border border-[#1e3d32]/40 bg-[#1e3d32]/10 p-8">
            <h3 className="mb-2 text-xl font-semibold text-[#1c1917]">
              Genug Informationen gesammelt
            </h3>
            <p className="mb-4 max-w-xl text-slate-700">
              Die KI hat aus Ihren Antworten diese Fakten erfasst.{" "}
              <strong>Stimmt etwas nicht?</strong> Fahren Sie über eine Kachel und klicken Sie auf das
              Stift-Symbol, um den Wert direkt zu korrigieren. Für größere Änderungen bearbeiten Sie
              eine Antwort in der Gesprächs-Chronik oder klicken Sie unten auf „Noch mehr ergänzen".
              Passt alles, schreibt die KI den Antrag — sechs Schritte: Gliederung → Abschnitte →
              Gutachten → Revision → Re-Check → Finanzplan + Konsistenzprüfung. Typisch 1–3 Minuten.
            </p>
            <div className="mb-4 rounded-lg border border-[#1c1917]/10 bg-[#fdfdfc] p-4">
              <FactsPanel
                facts={state.facts}
                compact
                editable
                sessionToken={state.sessionToken}
                onFactsUpdate={(facts) => setState((s) => (s ? { ...s, facts } : s))}
              />
            </div>
            {readiness && (
              <div className="mb-6">
                <ReadinessAmpel report={readiness} />
              </div>
            )}
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-[#1c1917]">Schreibstil des Antrags</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Texttiefe wählen">
                {([
                  { key: "knapp", label: "Knapp", hint: "kurz & prägnant" },
                  { key: "standard", label: "Standard", hint: "ausgewogen" },
                  { key: "ausfuehrlich", label: "Ausführlich", hint: "mehr Tiefe" },
                ] as { key: Texttiefe; label: string; hint: string }[]).map((opt) => {
                  const active = texttiefe === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTexttiefe(opt.key)}
                      className={
                        "rounded-lg border px-3 py-1.5 text-sm transition " +
                        (active
                          ? "border-[#1e3d32] bg-[#1e3d32] text-white"
                          : "border-[#1c1917]/15 bg-[#fdfdfc] text-[#57534e] hover:bg-slate-100")
                      }
                    >
                      {opt.label} <span className={active ? "text-white/70" : "text-slate-400"}>· {opt.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setState((s) => (s ? { ...s, phase: "interviewing" } : s));
                }}
                className="rounded-lg border border-[#1c1917]/15 px-5 py-2 text-[#57534e] transition hover:bg-slate-100"
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
                    : "bg-[#1e3d32] hover:bg-[#2a5244]")
                }
                title={
                  readiness?.status === "kritisch"
                    ? "Sie können die oben markierten Felder noch ergänzen — oder den Antrag direkt schreiben lassen."
                    : undefined
                }
              >
                {readiness?.status === "kritisch"
                  ? "Antrag jetzt schreiben"
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
