# Phase 2: Matcher-Quality - Pattern Map

**Erstellt:** 2026-05-03
**Dateien analysiert:** 9 (6 zu modifizieren, 3 neu zu erstellen)
**Analoga gefunden:** 9 / 9

---

## Datei-Klassifikation

| Neue/Modifizierte Datei | Rolle | Datenfluss | Naechstes Analog | Match-Qualitaet |
|-------------------------|-------|------------|------------------|-----------------|
| `lib/wizard/matcher.ts` | service | request-response | sich selbst (Ist-Stand) | exact |
| `app/api/match/route.ts` | route/controller | request-response | sich selbst (Ist-Stand) | exact |
| `components/Wizard/MatchResultList.tsx` | component | request-response | sich selbst (Ist-Stand) | exact |
| `components/Wizard/StartClient.tsx` | component (client state) | request-response | sich selbst (Ist-Stand) | exact |
| `scripts/eval-matcher.ts` | utility/eval-script | batch | sich selbst (Ist-Stand) | exact |
| `data/eval/matcher-korpus.json` | data | batch | sich selbst (Ist-Stand) | exact |
| `__tests__/lib/wizard/matcher.parser.test.ts` | test | — | `__tests__/lib/wizard/title-fallback.test.ts` | role-match |
| `__tests__/lib/wizard/matcher.dispatch.test.ts` | test (mit Mock) | — | `__tests__/lib/wizard/facts-extractor.test.ts` | role-match |
| `__tests__/components/MatchResultList.test.tsx` | test (jsdom) | — | `__tests__/components/Footer.test.tsx` | role-match |

---

## Pattern-Zuweisungen

### `lib/wizard/matcher.ts` (service, request-response)

**Analog:** sich selbst — vollstaendige Ist-Implementierung lesen vor Aenderung.

**Imports-Pattern** (Zeilen 8-12):
```typescript
import foerderprogrammeData from "@/data/foerderprogramme.json";
import prioritaetenData from "@/data/richtlinien-prioritaeten.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { MODEL_FLASH, generateText } from "./llm";
import { addUsage, emptyLedger, type CostLedger } from "./pricing";
```

**Aktuelles Interface-Pattern** (Zeilen 34-54) — WIRD MIGRIERT:
```typescript
// IST-STAND (zu ersetzen durch Tagged Union gemaess D-08):
export interface MatchInput {
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
}

export interface MatchedProgramm {
  id: string;
  score: number;
  begruendung: string;  // <-- wird zu passt_weil + achtung_bei
  programm: Foerderprogramm;
}

export interface MatchResult {
  matches: MatchedProgramm[];
  costs: CostLedger;
  totalCandidates: number;
  filteredOut: number;
}
```

**Ziel-Typen gemaess D-08** (Feldname `costs` beibehalten, nicht `cost`):
```typescript
// NEU: forceRanking in MatchInput
export interface MatchInput {
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
  forceRanking?: boolean;          // D-09: zweiter Aufruf
  previousAnliegen?: string;       // D-09: separates Feld statt Pipe-Konkatenation
}

export interface MatchHit {
  id: string;
  score: number;
  passt_weil: string;   // ersetzt begruendung
  achtung_bei: string;  // neu, kann leer sein
  programm: Foerderprogramm;
}

export type MatchResult =
  | { kind: "ranking"; matches: MatchHit[]; costs: CostLedger; totalCandidates: number; filteredOut: number }
  | { kind: "clarification"; question: string; costs: CostLedger };
```

**Aktuelles Pipe-Parser-Pattern** (Zeilen 188-207) — IST-STAND (3-Spalten):
```typescript
function parsePipeMatches(text: string, validIds: Set<string>): RawMatch[] {
  const out: RawMatch[] = [];
  for (const rawLine of text.split("\n")) {
    if (/^\s*```/.test(rawLine) || !rawLine.trim()) continue;
    const cleaned = rawLine.trim().replace(/^[-*•]\s+|^\d+[.)]\s+/, "");
    const idx1 = cleaned.indexOf("|");
    if (idx1 < 0) continue;
    const idx2 = cleaned.indexOf("|", idx1 + 1);
    if (idx2 < 0) continue;
    const id = cleaned.slice(0, idx1).trim();
    const scoreStr = cleaned.slice(idx1 + 1, idx2).trim();
    const begruendung = cleaned.slice(idx2 + 1).trim();
    const score = parseInt(scoreStr, 10);
    if (!id || !validIds.has(id) || isNaN(score)) continue;
    out.push({ id, score, begruendung });
  }
  return out;
}
```

**Ziel-Parser** (4-Spalten-exakt, D-01/D-02) — Vorlage aus RESEARCH.md:
```typescript
// RawMatch muss zuerst auf passt_weil + achtung_bei umgestellt werden:
interface RawMatch {
  id: string;
  score: number;
  passt_weil: string;
  achtung_bei: string;
}

function parsePipeMatches(text: string, validIds: Set<string>): RawMatch[] {
  const out: RawMatch[] = [];
  for (const rawLine of text.split("\n")) {
    if (/^\s*```/.test(rawLine) || !rawLine.trim()) continue;
    const cleaned = rawLine.trim().replace(/^[-*•]\s+|^\d+[.)]\s+/, "");
    if (cleaned.startsWith("CLARIFY|")) continue; // Dispatch passiert in runMatch()
    const parts = cleaned.split("|");
    if (parts.length !== 4) continue; // D-02: Soft-Failure
    const [id, scoreStr, passt_weil, achtung_bei] = parts.map(s => s.trim());
    const score = parseInt(scoreStr, 10);
    if (!id || !validIds.has(id) || isNaN(score)) continue;
    out.push({ id, score, passt_weil: passt_weil ?? "", achtung_bei: achtung_bei ?? "" });
  }
  return out;
}
```

**CLARIFY-Dispatch in runMatch()** (nach LLM-Call, vor Parser — Zeilen 225-251):
```typescript
// Muster: nach `const { value: rawText, usage } = await generateText(...)`
const firstLine = rawText.trim().split("\n")[0]?.trim() ?? "";
if (!input.forceRanking && firstLine.startsWith("CLARIFY|")) {
  const question = firstLine.slice("CLARIFY|".length).trim();
  return { kind: "clarification", question, costs };
}
// Danach normaler Ranking-Pfad mit parsePipeMatches + Score-Filter
```

**buildUserPrompt-Pattern** (Zeilen 162-175) — Profil-Block-Logik unveraendert, Erweiterung:
```typescript
// forceRanking als Conditional-Section ans Ende anhaengen:
if (input.forceRanking) {
  ctx.push(`\n[HINWEIS]: Auch wenn das Anliegen vage erscheint — KEIN CLARIFY. Direkt ranken.`);
}
// previousAnliegen als separaten Block (kein Pipe-Char im Anliegen-Text):
if (input.previousAnliegen) {
  ctx.push(`\nURSPRUENGLICHES ANLIEGEN (zur Kontext-Referenz):\n${input.previousAnliegen.trim()}`);
}
```

**Score-Threshold + matches-Aufbau** (Zeilen 236-248) — bleibt strukturell gleich, nur Feldnamen:
```typescript
// matches.push({ id: m.id, score: Math.round(m.score), begruendung: m.begruendung, programm: p });
// WIRD ZU:
matches.push({ id: m.id, score: Math.round(m.score), passt_weil: m.passt_weil, achtung_bei: m.achtung_bei, programm: p });
```

---

### `app/api/match/route.ts` (route, request-response)

**Analog:** sich selbst — Ist-Stand (49 Zeilen).

**Aktuelles Pattern** (Zeilen 1-48):
```typescript
import { NextRequest, NextResponse } from "next/server";
import { runMatch, type MatchInput } from "@/lib/wizard/matcher";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<MatchInput>;
    if (!body.anliegen || typeof body.anliegen !== "string") {
      return NextResponse.json({ error: "anliegen (string) erforderlich" }, { status: 400 });
    }
    const result = await runMatch({ anliegen: body.anliegen, /* ... */ });
    return NextResponse.json({
      matches: result.matches.map((m) => ({ id: m.id, score: m.score, begruendung: m.begruendung, programm: { ... } })),
      totalCandidates: result.totalCandidates,
      filteredOut: result.filteredOut,
      costs: result.costs,
    });
  } catch (err) {
    console.error("[api/match] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Matching fehlgeschlagen" },
      { status: 500 }
    );
  }
}
```

**Ziel-Pattern** (Union-Dispatch hinzufuegen, nach `const result = await runMatch(...)`):
```typescript
// MatchInput um forceRanking + previousAnliegen erweitern:
const result = await runMatch({
  anliegen: body.anliegen,
  schulname: body.schulname,
  schultyp: body.schultyp,
  bundesland: body.bundesland,
  geschaetztesBudgetEur: body.geschaetztesBudgetEur,
  forceRanking: body.forceRanking,
  previousAnliegen: body.previousAnliegen,
});

// Union-Dispatch:
if (result.kind === "clarification") {
  return NextResponse.json({ kind: "clarification", question: result.question, costs: result.costs });
}
return NextResponse.json({
  kind: "ranking",
  matches: result.matches.map((m) => ({
    id: m.id, score: m.score, passt_weil: m.passt_weil, achtung_bei: m.achtung_bei,
    programm: {
      id: m.programm.id, name: m.programm.name,
      foerdergeber: (m.programm as any).foerdergeber,
      // ... restliche Felder unveraendert wie Zeilen 29-35
    },
  })),
  totalCandidates: result.totalCandidates,
  filteredOut: result.filteredOut,
  costs: result.costs,
});
```

**Error-Handling-Pattern** (Zeilen 41-47) — unveraendert kopieren:
```typescript
} catch (err) {
  console.error("[api/match] Fehler:", err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Matching fehlgeschlagen" },
    { status: 500 }
  );
}
```

---

### `components/Wizard/MatchResultList.tsx` (component, request-response)

**Analog:** sich selbst — Ist-Stand (117 Zeilen).

**Imports-Pattern** (Zeile 1-4) — `CheckCircle` und `AlertTriangle` aus gleichem Paket:
```typescript
"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle, AlertTriangle, ExternalLink, HelpCircle, Star } from "lucide-react";
// HelpCircle: Clarification-Card-Icon
// CheckCircle: passt_weil-Block
// AlertTriangle: achtung_bei-Block
```

**Lokales MatchEntry-Interface** (Zeilen 6-21) — WIRD MIGRIERT (nicht aus matcher.ts importiert):
```typescript
export interface MatchEntry {
  id: string;
  score: number;
  passt_weil: string;   // ersetzt begruendung
  achtung_bei: string;  // neu
  programm: {
    id: string;
    name: string;
    foerdergeber?: string;
    foerdergeberTyp?: string;
    foerdersummeText?: string;
    foerdersummeMax?: number;
    bewerbungsfristText?: string;
    kategorien?: string[];
    kurzbeschreibung?: string;
  };
}
```

**scoreColor-Helper** (Zeilen 29-33) — unveraendert:
```typescript
function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-300 bg-emerald-500/10 border-emerald-500/40";
  if (score >= 70) return "text-orange-300 bg-orange-500/10 border-orange-500/40";
  return "text-slate-300 bg-slate-500/10 border-slate-500/40";
}
```

**Empty-State-Block** (Zeilen 36-49) — D-12: unveraendert kopieren:
```tsx
if (matches.length === 0) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-8 text-center">
      <h3 className="mb-2 text-lg font-semibold text-slate-200">
        Keine passenden Programme gefunden
      </h3>
      <p className="mx-auto max-w-md text-sm text-slate-400">
        Versuch es noch einmal mit einer anderen Formulierung oder mehr Details ...
      </p>
    </div>
  );
}
```

**Card-Layout-Kern** (Zeilen 56-116) — `<p className="mb-4 ...">m.begruendung</p>` (Zeile 93-95) ERSETZEN durch:
```tsx
{/* Strukturierte Begruendung — D-10 */}
<div className="mb-4 space-y-2">
  <div className="flex items-start gap-2 rounded-lg bg-green-900/30 border border-green-700/50 px-3 py-2">
    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
    <div>
      <span className="text-xs font-semibold text-green-400">Passt, weil: </span>
      <span className="text-sm text-green-200">{m.passt_weil}</span>
    </div>
  </div>
  {m.achtung_bei && (
    <div className="flex items-start gap-2 rounded-lg bg-orange-900/30 border border-orange-700/50 px-3 py-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
      <div>
        <span className="text-xs font-semibold text-orange-400">Achtung: </span>
        <span className="text-sm text-orange-200">{m.achtung_bei}</span>
      </div>
    </div>
  )}
</div>
```

**Clarification-Card als eigene Komponente** (neue Datei `components/Wizard/ClarificationCard.tsx`, D-11):
```tsx
"use client";

import { useState } from "react";
import { ArrowRight, HelpCircle } from "lucide-react";

interface Props {
  question: string;
  onSubmit: (praezisierung: string) => void;
  onForceRanking: () => void;
  busy?: boolean;
}

export function ClarificationCard({ question, onSubmit, onForceRanking, busy }: Props) {
  const [praezisierung, setPraezisierung] = useState("");
  return (
    <div className="rounded-xl border border-blue-700/50 bg-slate-800/60 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <HelpCircle className="h-6 w-6 shrink-0 text-blue-400 mt-0.5" />
        <h2 className="text-lg font-semibold text-slate-100">{question}</h2>
      </div>
      <textarea
        aria-label="Anliegen praezisieren"
        value={praezisierung}
        onChange={(e) => setPraezisierung(e.target.value)}
        placeholder="Praezisiere dein Anliegen hier..."
        className="w-full rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-3 text-sm text-slate-100 resize-none min-h-[80px]"
      />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={onForceRanking}
          className="text-xs text-slate-500 hover:text-slate-300 transition"
        >
          Trotzdem mit aktueller Eingabe ranken
        </button>
        <button
          type="button"
          disabled={!praezisierung.trim() || busy}
          onClick={() => onSubmit(praezisierung)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Praezisieren
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

**Props der MatchResultList erweitern** (D-11 erfordert Clarification-Branch aus dem Parent — Props bleiben auf `matches: MatchEntry[]`, weil StartClient die Union dispatcht und je nach `kind` entweder `<MatchResultList>` oder `<ClarificationCard>` rendert):
```typescript
// Props unveraendert — MatchResultList rendert NUR den Ranking-Fall
interface Props {
  matches: MatchEntry[];
  onStartAntrag: (entry: MatchEntry) => void;
}
```

---

### `components/Wizard/StartClient.tsx` (component, request-response)

**Analog:** sich selbst — Ist-Stand (83 Zeilen).

**Aktueller State** (Zeilen 15-21):
```typescript
const [busy, setBusy] = useState(false);
const [error, setError] = useState<RawError | null>(null);
const [matches, setMatches] = useState<MatchEntry[] | null>(null);
const [lastInput, setLastInput] = useState<AnliegenValues | null>(null);
```

**Ziel-State** (Union gemaess D-08/D-09):
```typescript
type MatchState =
  | { kind: "ranking"; matches: MatchEntry[] }
  | { kind: "clarification"; question: string }
  | null;

const [matchState, setMatchState] = useState<MatchState>(null);
const [lastInput, setLastInput] = useState<AnliegenValues | null>(null);
const [isSecondRound, setIsSecondRound] = useState(false); // D-09-Guard
```

**Aktueller runMatch-Handler** (Zeilen 22-46) — Vorlage fuer Migration:
```typescript
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
```

**Ziel-Dispatch nach `body = await res.json()`**:
```typescript
if (body.kind === "clarification") {
  setMatchState({ kind: "clarification", question: body.question });
} else {
  setMatchState({ kind: "ranking", matches: (body.matches ?? []) as MatchEntry[] });
  setIsSecondRound(false);
}
```

**Praezisierungs-Handler** (neu, D-09):
```typescript
const handlePraezisierung = async (praezisierung: string) => {
  if (!lastInput) return;
  setIsSecondRound(true);
  await runMatch({
    ...lastInput,
    anliegen: praezisierung,
    previousAnliegen: lastInput.anliegen,
    forceRanking: true, // D-09: zweiter Aufruf immer forceRanking
  });
};

const handleForceRanking = async () => {
  if (!lastInput) return;
  await runMatch({ ...lastInput, forceRanking: true });
};
```

**JSX-Render-Dispatch** (Zeilen 65-82) — Exhaustiveness-Check-Pattern:
```tsx
{matchState !== null && (
  <div className="pt-2">
    {matchState.kind === "ranking" && (
      <MatchResultList matches={matchState.matches} onStartAntrag={startAntrag} />
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
```

**startAntrag-Handler** (Zeilen 52-63) — unveraendert kopieren, `lastInput` bleibt der Referenz-Input.

---

### `scripts/eval-matcher.ts` (utility/eval-script, batch)

**Analog:** sich selbst — Ist-Stand (496 Zeilen vollstaendig gelesen).

**KorpusEntry-Interface** (Zeilen 38-49) — ERWEITERN:
```typescript
interface KorpusEntry {
  id: string;
  category: Category;
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
  expected_top3: string[];
  expected_off_target: string[];
  notes?: string;
  // Phase-2-Erweiterungen (D-13, D-14):
  expected_clarification?: boolean;   // default: false
  expected_missing_slots?: Array<"bundesland" | "zielgruppe" | "thema">;
}
```

**EntryResult-Interface** (Zeilen 51-67) — ERWEITERN:
```typescript
interface EntryResult {
  id: string;
  category: Category;
  expected_top3: string[];
  expected_off_target: string[];
  actual_top3: Array<{ id: string; score: number; passt_weil: string; achtung_bei: string }>;
  // begruendung -> passt_weil + achtung_bei nach Migration
  recall: number | null;
  offTargetHit: boolean | null;
  latencyMs: number;
  costs: { eurCents: number; usdCents: number; calls: number; totalTokens: number };
  totalCandidates: number;
  filteredOut: number;
  error?: string;
  // Phase-2-Erweiterungen (D-15):
  expectedClarification: boolean;       // Kopie aus KorpusEntry fuer aggregate()
  clarifResult: "hit" | "miss" | "false_pos" | "not_applicable";
  slotCoverage: number | null;          // 0-1, null wenn kein expected_missing_slots
}
```

**AggregateMetrics-Interface** (Zeilen 75-90) — ERWEITERN:
```typescript
interface AggregateMetrics {
  // ... bestehende Felder unveraendert ...
  // Phase-2-Erweiterungen:
  nExpectedClarif: number;
  nExpectedNoClarif: number;
  clarifPrecision: number | null;       // null wenn keine expected_clarification=true Eintraege
  clarifFalschPosRate: number | null;   // null wenn keine expected_clarification=false Eintraege
  slotCoverageMean: number | null;      // diagnostisch, null wenn keine expected_missing_slots
}
```

**aggregate()-Funktion** (Zeilen 227-287) — Erweiterungspunkte:
```typescript
// Nach bestehenden Berechnungen anfuegen:
const expectedClarifEntries = results.filter(r => r.expectedClarification && r.error === undefined);
const expectedNoClarifEntries = results.filter(r => !r.expectedClarification && r.error === undefined && r.clarifResult !== "not_applicable");
const clarifPrecision = expectedClarifEntries.length === 0 ? null
  : expectedClarifEntries.filter(r => r.clarifResult === "hit").length / expectedClarifEntries.length;
const clarifFalschPosRate = expectedNoClarifEntries.length === 0 ? null
  : expectedNoClarifEntries.filter(r => r.clarifResult === "false_pos").length / expectedNoClarifEntries.length;
const slotCovered = results.filter(r => r.slotCoverage !== null);
const slotCoverageMean = slotCovered.length === 0 ? null
  : slotCovered.reduce((s, r) => s + (r.slotCoverage ?? 0), 0) / slotCovered.length;
```

**Threshold-Gate am Ende von main()** (nach JSON-Report, D-16/D-17):
```typescript
// Muster: Konsolen-Bericht (Zeile 409-435) erst, dann Gate
const gate: Record<string, boolean> = {
  "Recall@3 >= 0.42":          m.recallAtThreeMean >= 0.42,
  "Off-Target < 5%":           m.offTargetRate < 0.05,
  "Clarif-Precision >= 80%":   m.clarifPrecision == null || m.clarifPrecision >= 0.80,
  "Clarif-FalschPos <= 10%":   m.clarifFalschPosRate == null || m.clarifFalschPosRate <= 0.10,
};
const failed = Object.entries(gate).filter(([, ok]) => !ok);
if (failed.length > 0) {
  console.error(`\n[GATE FAILED] ${failed.map(([k]) => k).join(", ")}`);
  process.exit(1);
}
console.log("\n[GATE PASSED] Alle D-16-Targets erfuellt.");
process.exit(0);
// Hinweis: main().catch()-Block Zeile 493-496 deckt Crashes ab — unveraendert lassen.
```

**Snapshot-Kompatibilitaet** (Zeile 200-207) — Shim fuer alte Snapshots mit `begruendung`:
```typescript
// In loadReplayResult() oder direkt beim Lesen des Replay-Ergebnisses:
if (result.kind === undefined) {
  // altes Format: { matches: [{...begruendung...}], costs, ... }
  // Shim: als ranking behandeln, begruendung als passt_weil
  result = {
    kind: "ranking" as const,
    matches: (result as any).matches.map((m: any) => ({
      ...m,
      passt_weil: m.begruendung ?? "",
      achtung_bei: "",
    })),
    costs: (result as any).costs,
    totalCandidates: (result as any).totalCandidates ?? 0,
    filteredOut: (result as any).filteredOut ?? 0,
  } as MatchResult;
}
```

**Log-Zeile pro Eintrag** (Zeile 401-404) — Erweiterung fuer Clarif-Status:
```typescript
console.log(
  `  Top-3: [${actualIds.join(", ")}]  Recall: ${
    recall === null ? "edge-case" : recall.toFixed(2)
  }  Clarif: ${clarifResult}  Off-Target: ${offTargetHit}  Latenz: ${(latencyMs / 1000).toFixed(2)}s`
);
```

---

### `data/eval/matcher-korpus.json` (data, batch)

**Analog:** sich selbst — Ist-Stand (22 Eintraege, vollstaendige Struktur aus ev-001 bis ev-003 gelesen).

**Bestehendes Schema-Muster** (aus ev-001):
```json
{
  "id": "ev-001",
  "category": "ausfuehrlich",
  "anliegen": "...",
  "schulname": "...",
  "schultyp": "grundschule",
  "bundesland": "Berlin",
  "geschaetztesBudgetEur": 8000,
  "expected_top3": ["id-1", "id-2"],
  "expected_off_target": ["id-3"],
  "notes": "..."
}
```

**Phase-2-Erweiterung fuer Edge-Cases** (ev-003, ev-019, ev-022 — D-13):
```json
{
  "id": "ev-003",
  "category": "vag",
  "anliegen": "...",
  "expected_top3": [],
  "expected_off_target": ["bmbf-digitalpakt-2", "aktion-mensch-schulkooperation"],
  "expected_clarification": true,
  "notes": "Edge-Case + Phase-2: expected_clarification gesetzt per D-13."
}
```

**Neue Vague-Eintraege (Typ 1 — Slot-fehlt-Kombo, D-13/D-14):**
```json
{
  "id": "ev-023",
  "category": "vag",
  "anliegen": "Wir wollen ein Projekt starten, das Kinder motiviert — vielleicht im kreativen Bereich.",
  "expected_top3": [],
  "expected_off_target": ["bmbf-digitalpakt-2"],
  "expected_clarification": true,
  "expected_missing_slots": ["bundesland", "zielgruppe"],
  "notes": "Typ 1: Thema halbwegs erkennbar (kreativ), aber kein BL, kein Schultyp — 2/3 Slots fehlen."
}
```

**Neue Anti-Beispiele (Typ 3 — Falsch-Positiv-Test, D-13):**
```json
{
  "id": "ev-025",
  "category": "vag",
  "anliegen": "Wir suchen Foerderung fuer einen Schulchor und Konzertfahrten — Budget ca. 4.000 Euro.",
  "schultyp": "gymnasium",
  "bundesland": "Hamburg",
  "expected_top3": ["kultur-macht-stark"],
  "expected_off_target": ["bmbf-digitalpakt-2"],
  "expected_clarification": false,
  "notes": "Typ 3 Anti-Beispiel: Thema (Musik/Kultur), BL, Schultyp alle bekannt. Darf NICHT clarify triggern."
}
```

**Wichtige Encoding-Regel:** JSON-Datei in ASCII (keine Umlaute in Datenfeldern) gemaess CLAUDE.md-Konvention.

---

### `__tests__/lib/wizard/matcher.parser.test.ts` (test, unit)

**Analog:** `__tests__/lib/wizard/title-fallback.test.ts` — Struktur mit `describe`/`it`, kein Mock noetig (Parser ist pure function).

**Import-Pattern** (aus title-fallback.test.ts Zeile 1):
```typescript
import { parsePipeMatches } from "@/lib/wizard/matcher";
// Hinweis: parsePipeMatches ist aktuell NICHT exportiert.
// Vor dem Schreiben der Tests: Funktion als export kennzeichnen ODER
// Tests ueber runMatch-Integration stellen. Empfehlung: eigene export fuer Testbarkeit.
```

**Test-Struktur-Vorlage** (aus title-fallback.test.ts):
```typescript
describe("parsePipeMatches — 4-Spalten-Format", () => {
  const VALID_IDS = new Set(["prog-a", "prog-b", "prog-c"]);

  it("parst korrekte 4-Spalten-Zeile", () => {
    const result = parsePipeMatches("prog-a|85|Guter Thema-Match.|Antragsfrist pruefen.", VALID_IDS);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: "prog-a", score: 85, passt_weil: "Guter Thema-Match.", achtung_bei: "Antragsfrist pruefen." });
  });

  it("verwirft Zeile mit 3 Spalten (Soft-Failure, D-02)", () => {
    const result = parsePipeMatches("prog-a|85|Kein viertes Feld", VALID_IDS);
    expect(result).toHaveLength(0);
  });

  it("parst Trailing-Pipe als leeres achtung_bei", () => {
    const result = parsePipeMatches("prog-a|85|Guter Match.|", VALID_IDS);
    expect(result[0]?.achtung_bei).toBe("");
  });

  it("ignoriert CLARIFY|-Zeilen (werden in runMatch dispatcht)", () => {
    const result = parsePipeMatches("CLARIFY|Welches Bundesland?", VALID_IDS);
    expect(result).toHaveLength(0);
  });
});
```

---

### `__tests__/lib/wizard/matcher.dispatch.test.ts` (test, unit mit Mock)

**Analog:** `__tests__/lib/wizard/facts-extractor.test.ts` fuer Struktur; `__tests__/components/Footer.test.tsx` fuer Mock-Pattern mit `jest.mock`.

**LLM-Mock-Pattern** (abgeleitet aus test/setup.tsx `jest.mock`-Konvention + Footer.test.tsx):
```typescript
// generateText in llm.ts mocken — LLM-Calls nicht real ausfuehren
jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  generateText: jest.fn(),
}));

import { generateText } from "@/lib/wizard/llm";
import { runMatch } from "@/lib/wizard/matcher";

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

const MOCK_USAGE = { promptTokens: 100, candidatesTokens: 50 };

describe("runMatch — CLARIFY-Dispatch", () => {
  beforeEach(() => jest.clearAllMocks());

  it("liefert kind=clarification wenn erste Zeile CLARIFY| ist", async () => {
    mockGenerateText.mockResolvedValue({
      value: "CLARIFY|Fuer welches Bundesland sucht ihr?",
      usage: MOCK_USAGE,
    });
    const result = await runMatch({ anliegen: "Wir brauchen irgendwas fuer Kinder." });
    expect(result.kind).toBe("clarification");
    if (result.kind === "clarification") {
      expect(result.question).toContain("Bundesland");
    }
  });

  it("liefert kind=ranking wenn forceRanking=true, auch bei CLARIFY-Antwort", async () => {
    mockGenerateText.mockResolvedValue({
      value: "CLARIFY|Fuer welches Bundesland sucht ihr?",
      usage: MOCK_USAGE,
    });
    const result = await runMatch({ anliegen: "Vage.", forceRanking: true });
    expect(result.kind).toBe("ranking");
  });
});
```

---

### `__tests__/components/MatchResultList.test.tsx` (test, jsdom)

**Analog:** `__tests__/components/Footer.test.tsx` — vollstaendige Vorlage fuer `@testing-library/react`-Pattern.

**Imports-Pattern** (aus Footer.test.tsx Zeile 1-2):
```typescript
import { render, screen } from '@testing-library/react';
import { MatchResultList } from '@/components/Wizard/MatchResultList';
// @testing-library/jest-dom ist in test/setup.tsx eingebunden — kein Extra-Import noetig
```

**Mock-Pattern fuer next/link** (aus test/setup.tsx — bereits global gesetzt, kein lokaler Mock noetig).

**Test-Struktur-Vorlage**:
```typescript
const MATCH_ENTRY = {
  id: "bmbf-digitalpakt-2",
  score: 88,
  passt_weil: "Bundesweite Foerderung digitaler Schulinfrastruktur.",
  achtung_bei: "Antragsfrist naht.",
  programm: { id: "bmbf-digitalpakt-2", name: "DigitalPakt 2.0", foerdergeber: "BMBF" },
};

describe("MatchResultList", () => {
  it("rendert passt_weil-Block mit gruener Farbe", () => {
    render(<MatchResultList matches={[MATCH_ENTRY]} onStartAntrag={jest.fn()} />);
    expect(screen.getByText("Passt, weil:")).toBeInTheDocument();
    expect(screen.getByText("Bundesweite Foerderung digitaler Schulinfrastruktur.")).toBeInTheDocument();
  });

  it("rendert achtung_bei-Block wenn nicht leer", () => {
    render(<MatchResultList matches={[MATCH_ENTRY]} onStartAntrag={jest.fn()} />);
    expect(screen.getByText("Achtung:")).toBeInTheDocument();
  });

  it("rendert achtung_bei-Block NICHT wenn leer", () => {
    render(<MatchResultList matches={[{ ...MATCH_ENTRY, achtung_bei: "" }]} onStartAntrag={jest.fn()} />);
    expect(screen.queryByText("Achtung:")).not.toBeInTheDocument();
  });

  it("rendert Empty-State bei leerer matches-Liste", () => {
    render(<MatchResultList matches={[]} onStartAntrag={jest.fn()} />);
    expect(screen.getByText("Keine passenden Programme gefunden")).toBeInTheDocument();
  });
});
```

**ClarificationCard-Test** (separate describe-Gruppe):
```typescript
import { ClarificationCard } from '@/components/Wizard/ClarificationCard';
import { fireEvent, waitFor } from '@testing-library/react';

describe("ClarificationCard", () => {
  it("rendert Klaerungsfrage als Ueberschrift", () => {
    render(<ClarificationCard question="Fuer welches Bundesland?" onSubmit={jest.fn()} onForceRanking={jest.fn()} />);
    expect(screen.getByText("Fuer welches Bundesland?")).toBeInTheDocument();
  });

  it("Submit-Button disabled wenn textarea leer", () => {
    render(<ClarificationCard question="..." onSubmit={jest.fn()} onForceRanking={jest.fn()} />);
    expect(screen.getByText("Praezisieren").closest("button")).toBeDisabled();
  });
});
```

---

## Gemeinsame Patterns

### Error-Handling (API-Route)
**Quelle:** `app/api/match/route.ts` Zeilen 41-47
**Anwenden auf:** `app/api/match/route.ts` (bleibt unveraendert)
```typescript
} catch (err) {
  console.error("[api/match] Fehler:", err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Matching fehlgeschlagen" },
    { status: 500 }
  );
}
```

### LLM-Aufruf (generateText-Pattern)
**Quelle:** `lib/wizard/matcher.ts` Zeilen 225-232
**Anwenden auf:** `lib/wizard/matcher.ts` (unveraendert — nur Nachverarbeitung aendert sich)
```typescript
const { value: rawText, usage } = await generateText(
  MODEL_FLASH,
  MATCHER_SYSTEM,
  buildUserPrompt(input, cards),
  { maxTokens: MATCHER_MAX_TOKENS }
);
const costs = addUsage(emptyLedger(), MODEL_FLASH, usage);
```

### Soft-Failure-Strategy (Eval-Skript)
**Quelle:** `scripts/eval-matcher.ts` Zeilen 328-354
**Anwenden auf:** Eval-Skript bleibt konsistent — Einzelfehler brechen Gesamtlauf nicht ab.
```typescript
try {
  result = await runMatch(input);
} catch (err) {
  errMsg = String(err instanceof Error ? err.message : err);
  console.warn(`${LOG_PREFIX} Eintrag ${entry.id} fehlgeschlagen, weiter mit naechstem:`, errMsg);
}
```

### Jest-Mock-Konvention fuer LLM
**Quelle:** `test/setup.tsx` + `__tests__/components/Footer.test.tsx` (jest.mock-Pattern)
**Anwenden auf:** `__tests__/lib/wizard/matcher.dispatch.test.ts`
```typescript
jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  generateText: jest.fn(),
}));
```

### Dark-Theme Tailwind-Klassen
**Quelle:** `components/Wizard/MatchResultList.tsx` Zeilen 29-33, 59, 107
**Anwenden auf:** `ClarificationCard.tsx`, neue Bloecke in `MatchResultList.tsx`
- Hintergruende: `bg-slate-800/40`, `bg-slate-800/60`
- Borders: `border-slate-700/50`, `border-blue-700/50`
- Status-Farben: `bg-green-900/30 border-green-700/50`, `bg-orange-900/30 border-orange-700/50`
- Buttons: `bg-orange-500 hover:bg-orange-600` (bestehend), `bg-blue-600 hover:bg-blue-700` (Clarification)

---

## Kein Analog gefunden

Alle Dateien haben direkte Analoga. Keine Eintraege in dieser Sektion.

---

## Wichtige Stolpersteine fuer den Planner

1. **`parsePipeMatches` ist aktuell NICHT exportiert** (Zeile 188 in matcher.ts: `function parsePipeMatches`). Fuer Unit-Tests in `matcher.parser.test.ts` muss die Funktion entweder als `export function` markiert oder ein separates Test-Barrel angelegt werden. Empfehlung: `export` hinzufuegen.

2. **`costs` vs. `cost`:** D-08 im CONTEXT.md schreibt `cost: CostLedger`, der Codebase-Standard ist `costs`. Immer `costs` verwenden.

3. **`MatchEntry`-Interface ist lokal in `MatchResultList.tsx` dupliziert** (nicht aus matcher.ts importiert). Beide muessen synchron migriert werden — `begruendung` → `passt_weil` + `achtung_bei`.

4. **Eval-Skript liest `result.matches.map(m => m.begruendung)`** (Zeile 384). Nach Migration muss das auf `m.passt_weil` + `m.achtung_bei` umgestellt werden. Snapshot-Format ebenfalls anpassen.

5. **`process.exit(0)` am Ende von main()** ist neu — der bestehende Code hat keinen expliziten exit. Den `main().catch()`-Block (Zeile 493-496) unveraendert lassen; `process.exit(0)` vor dem catch-Handler platzieren (aber nach dem JSON-Report).

---

## Metadaten

**Analog-Suchbereich:** `/home/kolja/edufunds-app/lib/wizard/`, `/home/kolja/edufunds-app/app/api/match/`, `/home/kolja/edufunds-app/components/Wizard/`, `/home/kolja/edufunds-app/scripts/`, `/home/kolja/edufunds-app/__tests__/`
**Gescannte Dateien:** 12 (vollstaendig gelesen)
**Pattern-Extraktion:** 2026-05-03
