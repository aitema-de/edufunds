import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import {
  getWizardSession,
  updateWizardSession,
  appendMessage,
} from "@/lib/wizard/session";
import { nextStep } from "@/lib/wizard/interviewer";
import { extractFacts } from "@/lib/wizard/facts-extractor";
import { withPromptCacheKey, cacheKeyFromSession } from "@/lib/wizard/llm";
import { addUsage, emptyLedger } from "@/lib/wizard/pricing";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { readJsonBody } from "@/lib/json-body";

const programme = foerderprogrammeData as Foerderprogramm[];

export async function POST(req: NextRequest) {
  try {
    const gelesen = await readJsonBody<{ sessionToken?: string; answer?: string }>(req);
    if (!gelesen.ok) return gelesen.response;
    const { sessionToken, answer } = gelesen.body;
    if (!sessionToken || typeof answer !== "string") {
      return NextResponse.json(
        { error: "sessionToken und answer (string) erforderlich" },
        { status: 400 }
      );
    }
    const trimmed = answer.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Antwort darf nicht leer sein" },
        { status: 400 }
      );
    }
    // DoS-/Kosten-Schutz: Antworten gehen ins LLM — unbegrenzte Laenge vermeiden.
    if (trimmed.length > 8000) {
      return NextResponse.json(
        { error: "Antwort ist zu lang (max. 8.000 Zeichen)." },
        { status: 400 }
      );
    }

    const session = await getWizardSession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { error: "Session nicht gefunden" },
        { status: 404 }
      );
    }
    // "interviewing" = laufendes Interview; "ready_to_generate" = Interview war
    // beendet, aber der Nutzer klickt "Noch mehr ergänzen" und reicht zusätzliche
    // Angaben nach. Beide Phasen akzeptieren eine Antwort (nextStep re-evaluiert
    // und liefert eine Folgefrage oder erneut ready).
    //
    // "failed" MUSS ebenfalls durch — dieselbe Falle wie in der generate-Route
    // (13.08.2026, Antrag 37). Nach einem Fehlschlag zeigt das Frontend den
    // Fehlerblock; ein Klick auf "Erneut versuchen" setzt NUR den lokalen Zustand
    // auf "ready_to_generate" zurueck und rendert wieder den normalen Wizard —
    // samt "Noch mehr ergaenzen" (WizardShell.tsx). Wer dort erst noch etwas
    // nachtraegt, statt sofort neu zu generieren, landete ohne diesen Zweig wieder
    // im 409, obwohl die generate-Route ihn inzwischen durchlaesst. Fachlich ist
    // das unbedenklich: nextStep re-evaluiert und setzt die Phase unten sauber
    // auf "interviewing" bzw. "ready_to_generate".
    if (
      session.data.phase !== "interviewing" &&
      session.data.phase !== "ready_to_generate" &&
      session.data.phase !== "failed"
    ) {
      return NextResponse.json(
        { error: `Session ist in Phase ${session.data.phase}, keine Antwort erwartet` },
        { status: 409 }
      );
    }

    const programm = programme.find((p) => p.id === session.foerderprogrammId);
    if (!programm) {
      return NextResponse.json(
        { error: "Programm nicht mehr in Daten vorhanden" },
        { status: 404 }
      );
    }

    // Antwort als Nachricht aufnehmen. Sonderfall Retry: Ist die LETZTE Nachricht
    // bereits eine User-Antwort (statt einer AI-Frage), ist der vorige Turn nach
    // dem Speichern der Antwort fehlgeschlagen (keine Folgefrage erzeugt). Dann
    // ist diese Einsendung ein Wiederholversuch — die letzte Antwort ersetzen,
    // nicht doppelt anhaengen (verhindert Duplikate, auch bei korrigierter Antwort).
    const msgs = session.data.messages;
    const last = msgs[msgs.length - 1];
    const isUnprocessedRetry = last?.role === "user" && last.kind === "answer";

    let data = isUnprocessedRetry
      ? {
          ...session.data,
          messages: [
            ...msgs.slice(0, -1),
            { ...last, content: trimmed, at: new Date().toISOString() },
          ],
        }
      : appendMessage(session.data, {
          role: "user",
          kind: "answer",
          content: trimmed,
          // factsBefore speichern, damit wir die Antwort spaeter editierbar machen koennen
          meta: { factsBefore: session.data.facts },
        });

    // Datenverlust-Schutz: die rohe Antwort SOFORT persistieren, BEVOR die
    // LLM-Stages laufen. Schlaegt eine Stage fehl (z. B. abgeschnittenes JSON aus
    // DeepSeek in nextStep), ist die Nutzerantwort bereits gespeichert und
    // ueberlebt Reload und Retry — frueher ging sie verloren, weil
    // updateWizardSession erst nach den LLM-Calls erreicht wurde.
    await updateWizardSession(sessionToken, data);

    // Stage 1: dedizierte Fakten-Extraktion ueber den gesamten Verlauf.
    // Faellt sie aus, behaelt der Aufrufer den alten Stand — der Interviewer arbeitet dann
    // wie zuvor mit teilbefuellten Facts, aber stuerzt nicht ab.
    // Auch das Interview laeuft im Cache-Kontext: Beide Stufen schicken die
    // wachsende Gespraechs-Chronik jedes Mal komplett mit, und sie zaehlt gegen
    // dasselbe Minutenkontingent wie die Generierung. Session 37 verbrauchte im
    // Interview allein 265.573 Tokens.
    const cacheKey = cacheKeyFromSession(sessionToken);
    const extracted = await withPromptCacheKey(cacheKey, () =>
      extractFacts(data.messages, data.facts)
    );
    data = { ...data, facts: extracted.facts };
    if (extracted.usage) {
      data = {
        ...data,
        costs: addUsage(data.costs ?? emptyLedger(), extracted.usage.model, extracted.usage.usage),
      };
    }

    // Stage 2: Interviewer entscheidet die naechste Frage anhand des frischen Facts-Stands.
    const richtlinie = await loadRichtlinie(programm.id);
    let step: Awaited<ReturnType<typeof nextStep>>["step"];
    let usage: Awaited<ReturnType<typeof nextStep>>["usage"];
    try {
      ({ step, usage } = await withPromptCacheKey(cacheKey, () =>
        nextStep(
          programm,
          data.messages,
          data.facts,
          data.interviewer.totalQuestions,
          data.interviewer.maxQuestions,
          richtlinie
        )
      ));
    } catch (stepErr) {
      // nextStep konnte keine valide Frage erzeugen (z. B. abgeschnittenes JSON).
      // Die Antwort ist oben bereits persistiert — kein Datenverlust. Wir melden
      // einen wiederholbaren Fehler; der Retry oben ersetzt die Antwort statt sie
      // zu doppeln, sodass ein erneutes Senden den Turn sauber abschliesst.
      console.error("[wizard/answer] nextStep fehlgeschlagen (Antwort gesichert):", stepErr);
      return NextResponse.json(
        {
          error:
            "Die KI war kurz nicht erreichbar. Ihre Antwort ist gespeichert — bitte senden Sie sie gleich noch einmal.",
          retryable: true,
        },
        { status: 503 }
      );
    }
    // Interviewer kann via facts_update noch ergaenzen (Fallback), aber Extractor ist fuehrend.
    data = { ...data, facts: step.updatedFacts };

    if (usage) {
      data = { ...data, costs: addUsage(data.costs ?? emptyLedger(), usage.model, usage.usage) };
    }

    if (step.kind === "question") {
      data = appendMessage(data, {
        role: "ai",
        kind: "question",
        content: step.question,
        meta: step.rationale ? { rationale: step.rationale } : undefined,
      });
      data = {
        ...data,
        interviewer: {
          ...data.interviewer,
          totalQuestions: data.interviewer.totalQuestions + 1,
        },
      };
      // Dieser Zweig setzte die Phase bisher GAR NICHT — aus "interviewing" und
      // "ready_to_generate" heraus war das unauffaellig, weil beide stehenbleiben
      // durften. Kommt die Antwort aber aus "failed" (s. Guard oben), bliebe die
      // Session auf "failed" stehen und der Nutzer saesse sofort wieder fest.
      // Nur diesen Fall normalisieren, damit die beiden bewaehrten Pfade
      // unveraendert bleiben.
      if (data.phase === "failed") {
        data = { ...data, phase: "interviewing" };
      }
    } else {
      data = { ...data, phase: "ready_to_generate" };
    }

    // Der Fehler des letzten Generierungsversuchs ist mit der neuen Angabe
    // ueberholt — sonst klebt er an einer Session, die laengst weiterlaeuft.
    if (data.lastError) {
      data = { ...data, lastError: undefined };
    }

    const updated = await updateWizardSession(sessionToken, data);
    return NextResponse.json({
      sessionToken,
      phase: updated.data.phase,
      question:
        step.kind === "question"
          ? { content: step.question, rationale: step.rationale }
          : null,
      ready: step.kind === "ready" ? { summary: step.summary } : null,
      totalQuestions: updated.data.interviewer.totalQuestions,
      maxQuestions: updated.data.interviewer.maxQuestions,
      facts: updated.data.facts,
      costs: updated.data.costs ?? null,
    });
  } catch (err) {
    console.error("[wizard/answer] Fehler:", err);
    return NextResponse.json(
      { error: "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
