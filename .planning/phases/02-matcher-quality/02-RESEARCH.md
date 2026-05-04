# Phase 2: Matcher-Quality — Research

**Recherchiert:** 2026-05-03
**Domain:** LLM-Output-Parsing, TypeScript Discriminated Unions, React UI-Patterns, Eval-Skript-Erweiterung
**Confidence:** HIGH (alle kritischen Punkte aus Codebase verifiziert, LLM-Pattern aus Dokumentation + Erfahrungswissen)

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Locked Decisions

- **D-01:** Pipe-Format erweitert auf `id|score|passt_weil|achtung_bei` (4 Spalten). Bewahrt 28.04.-Speedup.
- **D-02:** Pipe-Char in Feldern verboten — Parser verwirft Zeilen mit Spalten≠4 (Soft-Failure).
- **D-03:** Laengenlimits im Prompt: `passt_weil` max ~25 Woerter, `achtung_bei` max ~20 Woerter. Kein Hard-Truncate im Parser.
- **D-04:** `begruendung` hart entfernt aus `MatchHit`. Alle Caller in derselben PR migriert.
- **D-05:** LLM entscheidet im Hauptcall ob vage — erste Zeile `CLARIFY|<frage>` statt `<id>|<score>|...`.
- **D-06:** „Vage"-Heuristik: mind. 2 von 3 Pflicht-Slots fehlen (Bundesland, Zielgruppe/Schultyp, thematischer Fokus).
- **D-07:** Klaerungsfrage max 1-2 Saetze, idealerweise mit konkreten Optionen.
- **D-08:** `MatchResult` wird Discriminated Union: `{ kind: 'ranking'; matches: MatchHit[]; cost: CostLedger }` | `{ kind: 'clarification'; question: string; cost: CostLedger }`.
- **D-09:** Max 1 Klaerungsrunde. Frontend sendet beim zweiten Call `forceRanking: true` — Prompt unterdrueckt `CLARIFY`-Option.
- **D-10:** `passt_weil` gruener Block + Check-Icon; `achtung_bei` oranger Block + Warn-Icon. Beide vor Antrag-starten-Button.
- **D-11:** Bei `kind === 'clarification'`: prominente Card mit Frage als h2, textarea, Submit „Praezisieren", Override-Link „Trotzdem ranken".
- **D-12:** Empty-State bei `matches.length === 0` + `kind === 'ranking'` bleibt unveraendert.
- **D-13:** Korpus um 5-7 gezielte Vague-Eintraege erweitert. Felder `expected_clarification: true`. 3 Edge-Cases erhalten `expected_clarification: true`.
- **D-14:** Optionales Korpus-Feld `expected_missing_slots: ('bundesland'|'zielgruppe'|'thema')[]`.
- **D-15:** Neue Eval-Metriken: Clarification-Precision (≥80%), Clarification-Recall/Falsch-Positiv-Rate (≤10%), Slot-Coverage (diagnostisch).
- **D-16:** Eval-Targets: Recall@3 ≥ 0.42, Off-Target < 5%, Clarif-Precision ≥ 80%, Clarif-Falsch-Pos ≤ 10%.
- **D-17:** PR-Gate: hart bei Aenderungen an `matcher.ts`, `matcher-korpus.json`, `eval-matcher.ts`. Manuell (kein GitHub-Action). Report als Force-Add.

### Claude's Discretion

- Genaue Prompt-Formulierung der „vage"-Heuristik (Sprache, Negativbeispiele)
- `forceRanking`-Implementation (Feldname, Conditional-Section vs. anderer Prompt)
- `previousAnliegen` + `neue_antwort` Konkatenation vs. separate Felder
- Konkrete 5-7 neue Vague-Korpus-Eintraege (Claude entwirft, Kolja kuratiert)
- UI-Detail-Polish (exakte Tailwind-Farben, Heroicon-Auswahl, Mobile-Stacking)
- Eval-Skript-Erweiterung: konkrete Output-Tabelle, Konsolen-Format, JSON-Schema-Aenderung

### Deferred Ideas (OUT OF SCOPE)

- CI-Integration via GitHub-Action
- NDCG-light / Position-aware Metrik
- Pipeline-Eval-Korpus (Phase 5)
- Multi-Round-Klaerungsfragen (Phase 3+)
- Score-Erwartungen pro Korpus-Eintrag
- Pre-Stage-Klassifier fuer vage-Erkennung
- Cron-Skripte auf DeepSeek migrieren (Phase 3)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MATCH-02 | Matcher liefert strukturierte Begründung pro Treffer (passt_weil + achtung_bei) statt 15-Wort-Pauschale | D-01/D-02/D-03 regeln Schema; D-04 Migration; Abschnitte 2+3+4 |
| MATCH-03 | Matcher erkennt vages Anliegen und stellt Klärungsfrage, bevor er rankt | D-05/D-06/D-07 regeln Trigger + Format; D-08/D-09 Response-Shape; Abschnitte 1+4+5+6 |
</phase_requirements>

---

## Executive Summary

**5 kritische Findings für den Planner:**

1. **Parser-Chirurgie ist der Kerneingriff** — `parsePipeMatches` in `matcher.ts` (Zeile 188–207) ist der einzige kritische Pfad. Er muss von 3-Spalten-`begruendung` auf 4-Spalten-`passt_weil|achtung_bei` umgebaut werden, plus CLARIFY-Dispatch vor der Zeilenverarbeitung. Alle anderen Aenderungen haengen davon ab.

2. **3 Caller-Ketten muessen synchron migriert werden** — `matcher.ts` (Typen), `app/api/match/route.ts` (JSON-Response-Shape), `components/Wizard/StartClient.tsx` (State-Typ + Dispatch-Switch), `components/Wizard/MatchResultList.tsx` (Rendering). Alle muessen in einer PR wegen D-04 (hart entfernen von `begruendung`).

3. **Eval-Skript hat geschlossene Architektur, gut erweiterbar** — `KorpusEntry`-Interface, `EntryResult`-Interface, `AggregateMetrics`-Interface, `aggregate()`-Funktion und `main()` sind klar getrennt. Neue Metriken kosten ~80 Zeilen Code, kein Umbau der Grundstruktur.

4. **CLARIFY-Konsistenz bei DeepSeek ist testbar, aber nicht garantiert** — aus Erfahrungswissen: DeepSeek `deepseek-chat` folgt strikt spezifizierten Output-Konventionen zuverlaessig, wenn (a) Beispiel-Output im System-Prompt enthalten ist, (b) der `CLARIFY`-Zweig explizit mit einem Negativbeispiel illustriert ist. Ohne Beispiel steigt Varianz erheblich. [ASSUMED — aus Projekterfahrung mit `facts-extractor.ts`, nicht metrisch quantifiziert]

5. **Tailwind + lucide-react passen bereits zum Design-System** — `MatchResultList.tsx` importiert bereits `lucide-react` (ArrowRight, ExternalLink, Star). `CheckCircle` und `AlertTriangle` (oder `CircleCheck`, `TriangleAlert` in lucide-react v0.400+) sind im gleichen Paket. [VERIFIED: grepped import in MatchResultList.tsx Zeile 3]

**Primäre Empfehlung:** Drei Plans, alle in einer Welle — Plan 02-01 (Backend: Typen + Matcher + API + Eval), Plan 02-02 (Frontend: UI-Migration + Clarification-Card), Plan 02-03 (Korpus + Eval-Skript-Erweiterung + Baseline-Update).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| LLM-Output-Parsing (CLARIFY vs. Ranking) | API / Backend (`lib/wizard/matcher.ts`) | — | Parser laeuft serverseitig, bevor Daten an Frontend gehen |
| Response-Shape / Union-Typ | API / Backend (`app/api/match/route.ts`) | Frontend (Type-Guard) | API serialisiert `kind`; Frontend dispatched darauf |
| Clarification-UI | Frontend (`MatchResultList.tsx`) | — | Reine Render-Logik, kein serverseitiger State |
| Multi-Round-State (`forceRanking`) | Frontend Server (StartClient.tsx) | API-Surface (`MatchInput`) | Zustand liegt im Client-Component-State; API braucht neues optionales Feld |
| Eval-Metriken | Skript (`scripts/eval-matcher.ts`) | — | Laeuft als separates CLI-Tool, nicht im Server-Pfad |
| Korpus-Erweiterung | Daten (`data/eval/matcher-korpus.json`) | — | JSON-Datei, kein Tier im eigentlichen Sinne |

---

## 1. Conditional LLM Output Patterns (CLARIFY-Trigger)

### Architektur des CLARIFY-Outputs

Der MATCHER_SYSTEM-Prompt (aktuell Zeile 136–160 in `matcher.ts`) muss um einen konditionalen Output-Zweig erweitert werden. Das bewaehrte Pattern aus `facts-extractor.ts` und dem Interviewer zeigt: DeepSeek `deepseek-chat` folgt strikt formulierten Ausgabekonventionen zuverlaessig, wenn sie im System-Prompt durch **Positivbeispiel + Negativbeispiel** illustriert sind. [ASSUMED — aus Projekterfahrung]

**Empfohlene Prompt-Struktur:**

```
## AUSGABE — zwei moegliche Formen:

### Form A (wenn Anliegen VAGE — mind. 2 von 3 Slots fehlen):
CLARIFY|<frage>

Beispiel:
CLARIFY|Fuer welches Bundesland sucht ihr? Und welcher Schwerpunkt steht im Vordergrund — z.B. Digitalisierung, Sport, Kulturprojekt oder etwas anderes?

### Form B (wenn Anliegen KLAR genug):
id|score|passt_weil|achtung_bei
id|score|passt_weil|achtung_bei

Beispiel:
bmbf-digitalpakt-2|92|Bundesweite Foerderung digitaler Schulinfrastruktur, deckt Hardware ab.|Antragsfrist naht — Einreichung vor Juli pruefen.
kultur-macht-stark|75|Foerdert ausserschulische Kulturprojekte wie Theater-AGs.|Kein reiner Anschaffungs-Antrag — Projektcharakter erforderlich.

### NEGATIVBEISPIEL — was NICHT erlaubt ist:
CLARIFY|Was wollt ihr genau?            <- zu vage, keine konkreten Optionen
bmbf-digitalpakt-2|90|Passt.|           <- passt_weil zu kurz, kein Bezug zum Anliegen
kultur-macht-stark|85|gut.|             <- kein | als letztes Feld (achtung_bei fehlt, muss als leer erscheinen)
```

Das Negativbeispiel mit dem fehlenden Trailing-`|` (leeres `achtung_bei`) ist entscheidend — das LLM neigt sonst dazu, das leere Feld wegzulassen statt als Trailing-`|` zu kodieren. [ASSUMED — aus allg. LLM-Erfahrung mit Pipe-Formaten]

### Slot-Heuristik im Prompt

Die 3 Pflicht-Slots muessen im Prompt **namentlich** aufgelistet sein, damit das LLM sie pruefen kann:

```
## Fehlende-Slot-Heuristik (VAGE = mind. 2 fehlen):
- Bundesland: fehlt, wenn kein konkretes BL im Anliegen oder Schul-Profil
- Zielgruppe/Schultyp: fehlt, wenn kein Schultyp, keine Klassenstufe, keine Schuelergruppe
- Thematischer Fokus: fehlt, wenn kein konkretes Thema (z.B. "Sport", "Lesen", "Digital", "Inklusion")
```

Die Angaben aus dem Schul-Profil (Input-Felder `bundesland`, `schultyp`) zaehlen ebenfalls als Slot-Fuellung — das LLM sieht den gesamten User-Prompt mit Profil-Block.

### forceRanking-Implementierung

Empfehlung: `forceRanking: boolean` als optionales Feld in `MatchInput`. Im Prompt als Conditional-Section realisiert:

```typescript
// In buildUserPrompt():
if (input.forceRanking) {
  ctx.push(`\n[HINWEIS]: Auch wenn das Anliegen vage erscheint — KEIN CLARIFY. Direkt ranken (ggf. mit niedrigen Scores).`);
}
```

Das ist billiger als ein zweiter Prompt und robust. [ASSUMED — bewaehrtes Pattern aus BalkanGrant/DeepSeek-Erfahrung]

### CLARIFY-Konsistenz quantitativ

Die Clarification-Precision/Recall-Metriken aus D-15 sind der einzige valide Test. Erwartete Erstmessung nach Prompt-Engineering: Precision 80-90%, Falsch-Positiv-Rate 5-15%. Falls Falsch-Positiv-Rate > 10%: Negativ-Beispiele im Prompt schrittweise ergaenzen. Falls Precision < 80%: Slot-Heuristik im Prompt schrittweise verschaerfen. [ASSUMED — aus Analogie zu Iteration bei facts-extractor.ts]

---

## 2. Pipe-Format Parser-Haertung

### Ist-Zustand

Der aktuelle Parser (`parsePipeMatches`, Zeile 188–207) funktioniert nach dem Prinzip: `idx1 = cleaned.indexOf("|")` + `idx2 = cleaned.indexOf("|", idx1+1)` — alles rechts von `idx2` ist `begruendung`. Das toleriert irrtaemliche `|` in der Begründung durch Zusammenfuehren. [VERIFIED: matcher.ts Zeile 194–202]

### Neues Schema: exakt 4 Spalten

Mit D-01 (4 Spalten: `id|score|passt_weil|achtung_bei`) ist das Parser-Verhalten zu aendern. Empfohlene Implementierung:

```typescript
// Erweiterter Parser — 4-Spalten-exakt
function parsePipeMatches(text: string, validIds: Set<string>): RawMatch[] {
  const out: RawMatch[] = [];
  for (const rawLine of text.split("\n")) {
    if (/^\s*```/.test(rawLine) || !rawLine.trim()) continue;
    const cleaned = rawLine.trim().replace(/^[-*•]\s+|^\d+[.)]\s+/, "");
    
    // CLARIFY-Zeilen werden hier nicht verarbeitet — Dispatch passiert in runMatch()
    if (cleaned.startsWith("CLARIFY|")) continue;
    
    const parts = cleaned.split("|");
    // D-02: Exakt 4 Teile (Soft-Failure wenn nicht)
    if (parts.length !== 4) continue;
    
    const [id, scoreStr, passt_weil, achtung_bei] = parts.map(s => s.trim());
    const score = parseInt(scoreStr, 10);
    if (!id || !validIds.has(id) || isNaN(score)) continue;
    
    out.push({ id, score, passt_weil, achtung_bei: achtung_bei ?? "" });
  }
  return out;
}
```

**Wichtig:** `parts.length !== 4` ist der D-02-Gate. Bei `id|score|passt_weil|` (leeres achtung_bei) gibt `split("|")` 4 Teile zurueck (letzter = `""`). Das ist korrekt. [VERIFIED: JavaScript `"a|b|c|".split("|").length === 4` — geprueft mental, triviale Eigenschaft von String.split]

### CLARIFY-Dispatch in runMatch()

Der Dispatch muss **vor** dem Parser passieren:

```typescript
export async function runMatch(input: MatchInput): Promise<MatchResult> {
  // ... prefilter + LLM-Call wie bisher ...
  
  const { value: rawText, usage } = await generateText(...);
  const costs = addUsage(emptyLedger(), MODEL_FLASH, usage);
  
  // CLARIFY-Check: erste nicht-leere Zeile pruefen
  const firstLine = rawText.trim().split("\n")[0]?.trim() ?? "";
  if (!input.forceRanking && firstLine.startsWith("CLARIFY|")) {
    const question = firstLine.slice("CLARIFY|".length).trim();
    return { kind: "clarification", question, costs };
  }
  
  // Normaler Ranking-Pfad
  const validIds = new Set(programme.map((p) => p.id));
  const rawMatches = parsePipeMatches(rawText, validIds);
  // ... wie bisher, aber mit passt_weil + achtung_bei ...
  return { kind: "ranking", matches, costs };
}
```

### Soft-Failure-Strategie

D-02 sagt: Zeile mit Spalten≠4 wird ausgeschlossen, gesamtes Ranking bleibt valide. Das ist bereits durch `continue` im Parser-Loop korrekt implementierbar. Kein Throw, kein Log-Spam — nur stilles Ueberspringen der defekten Zeile. Wenn alle Zeilen defekt sind: leeres Ranking (`matches = []`), was D-12 (Empty-State unveraendert) korrekt triggert. [VERIFIED: D-02 + D-12 aus CONTEXT.md]

### Max-Tokens-Anpassung

Mit 4 Feldern statt 3 steigt die Output-Laenge. Aktuelle `MATCHER_MAX_TOKENS = 400` reicht fuer 3 Zeilen mit je ~25+20 Worten in `passt_weil`/`achtung_bei`. Grobe Schaetzung: 3 Zeilen × ~40 Tokens = 120 Output-Tokens, plus CLARIFY-Variante ~20 Tokens. 400 ist ausreichend. Erhoehung auf 600 als Sicherheitspuffer ist vertretbar falls Evaluierung Abschneidungen zeigt. [ASSUMED]

---

## 3. TypeScript Tagged Union Dispatch

### MatchResult-Union und MatchHit

Die neuen Typen gemaess D-08 ersetzen die bestehenden Interfaces in `matcher.ts`:

```typescript
export interface MatchHit {
  id: string;
  score: number;
  passt_weil: string;
  achtung_bei: string;
  programm: Foerderprogramm;
}

export type MatchResult =
  | { kind: "ranking"; matches: MatchHit[]; costs: CostLedger; totalCandidates: number; filteredOut: number }
  | { kind: "clarification"; question: string; costs: CostLedger };
```

Hinweis: Das bestehende `MatchResult`-Interface hat `costs` (nicht `cost`) — D-08 in CONTEXT.md schreibt `cost: CostLedger`, aber der Code verwendet `costs`. Konsistenz mit Codebase behalten: `costs`. [VERIFIED: matcher.ts Zeile 49–54, route.ts Zeile 38]

### Backward-Compat-Stolperstein in route.ts

`app/api/match/route.ts` Zeile 22–38 serialisiert aktuell `result.matches.map(...)` mit `begruendung`. Nach Migration muss auf `m.passt_weil` + `m.achtung_bei` umgestellt werden. Zusaetzlich muss die Route die Union dispatchen:

```typescript
if (result.kind === "clarification") {
  return NextResponse.json({ kind: "clarification", question: result.question, costs: result.costs });
}
return NextResponse.json({
  kind: "ranking",
  matches: result.matches.map((m) => ({
    id: m.id, score: m.score, passt_weil: m.passt_weil, achtung_bei: m.achtung_bei,
    programm: { /* wie bisher */ }
  })),
  totalCandidates: result.totalCandidates,
  filteredOut: result.filteredOut,
  costs: result.costs,
});
```

### MatchEntry-Typ in MatchResultList.tsx

Das lokale `MatchEntry`-Interface in `MatchResultList.tsx` (Zeile 6–21) muss von `begruendung: string` auf `passt_weil: string; achtung_bei: string` umgestellt werden. Dieses Interface ist nicht aus `matcher.ts` importiert — es ist lokal dupliziert. Empfehlung: weiter lokal lassen (API-Response-Shape ≠ interne Matcher-Typen), aber synchron aendern.

### StartClient.tsx State-Migration

`StartClient.tsx` verwaltet `matches: MatchEntry[] | null`. Mit der Union muss das zu:

```typescript
type MatchState = 
  | { kind: "ranking"; matches: MatchEntry[] }
  | { kind: "clarification"; question: string }
  | null;
const [matchState, setMatchState] = useState<MatchState>(null);
```

Der `runMatch`-Handler in StartClient liest `body.kind` und dispatched entsprechend. Fuer den zweiten Aufruf (Praezisierung) wird `forceRanking: true` mit dem neuen `anliegen`-Wert gesendet. [VERIFIED: StartClient.tsx Zeile 15–46 analysiert]

### Exhaustive Switch

Im Frontend (StartClient.tsx + MatchResultList.tsx) `switch (result.kind)` mit Exhaustiveness-Check:

```typescript
switch (matchState.kind) {
  case "ranking":   return <MatchResultList ... />;
  case "clarification": return <ClarificationCard ... />;
  default: {
    const _: never = matchState; // TypeScript-Exhaustiveness-Check
    return null;
  }
}
```

[ASSUMED — Standard TypeScript-Pattern, kein Context7-Check noetig]

---

## 4. UI Pattern (Heroicons + Tailwind + Clarification-Card)

### Icon-Auswahl mit lucide-react

`MatchResultList.tsx` importiert bereits `lucide-react` (Zeile 3). [VERIFIED: MatchResultList.tsx Zeile 3] Das Design-System nutzt lucide-react, **nicht** Heroicons. Relevante Icons:

- **`passt_weil`:** `CheckCircle` (ausgefuelllter Check-Kreis, klar positiv) oder `CircleCheck` (v0.460+). Empfehlung: `CheckCircle` — bewaehrt, immer verfuegbar.
- **`achtung_bei`:** `AlertTriangle` (klassisches Warn-Icon) oder `TriangleAlert` (v0.460+). Empfehlung: `AlertTriangle` — sprechender Name.
- **Clarification-Card:** `HelpCircle` oder `MessageCircle` fuer die Frage-Icon.

### Tailwind-Klassen

Das bestehende Design ist Dark-Mode-orientiert (slate-800/slate-700-Hintergruende). Farbschemata die harmonieren:

- **passt_weil (gruen):** `bg-green-900/30 border border-green-700/50 text-green-300` — konsistent mit emerald-Score-Badge (Zeile 30 in MatchResultList)
- **achtung_bei (orange):** `bg-orange-900/30 border border-orange-700/50 text-orange-300` — konsistent mit `bg-orange-500`-Button (Zeile 107)
- **Clarification-Card:** `bg-slate-800/60 border border-blue-700/50 rounded-xl p-6` — neutral, prominenter als normale Card

Alternativer Ansatz (heller, mehr Kontrast): `bg-green-50 border-green-200 text-green-800` — aber das passt **nicht** zum Dark-Theme des bestehenden Designs. [VERIFIED: MatchResultList.tsx Zeile 29–33, 107 — Dark-Theme-Farbpalette bestaetigt]

### Card-Layout-Pattern fuer passt_weil + achtung_bei

```tsx
{/* Strukturierte Begruendung — ersetzt <p className="mb-4 ...">m.begruendung</p> */}
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

### Clarification-Card-Layout (D-11)

```tsx
function ClarificationCard({ question, onSubmit, onForceRanking }: Props) {
  const [praezisierung, setPraezisierung] = useState("");
  return (
    <div className="rounded-xl border border-blue-700/50 bg-slate-800/60 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <HelpCircle className="h-6 w-6 shrink-0 text-blue-400 mt-0.5" />
        <h2 className="text-lg font-semibold text-slate-100">{question}</h2>
      </div>
      <textarea
        value={praezisierung}
        onChange={(e) => setPraezisierung(e.target.value)}
        placeholder="Praezisiere dein Anliegen hier..."
        className="w-full rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-3 text-sm text-slate-100 resize-none min-h-[80px]"
      />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onForceRanking()}
          className="text-xs text-slate-500 hover:text-slate-300 transition"
        >
          Trotzdem mit aktueller Eingabe ranken
        </button>
        <button
          type="button"
          disabled={!praezisierung.trim()}
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

**Accessibility-Hinweis:** `textarea` muss `aria-label` haben (oder ein `<label>`). Focus-Management: nach Ersetzen des Clarification-Blocks durch Ranking-Ergebnis soll kein Fokus-Jump auftreten (kein `autofocus` auf textarea noetig, da User gerade getippt hat). [ASSUMED — Standard a11y-Praxis]

### Mobile-Stacking

Die bestehende Card-Struktur nutzt `flex flex-wrap` in kritischen Bereichen. Die `passt_weil`/`achtung_bei`-Bloecke sind Full-Width-Stacks — kein Flex-Split, kein Wrapping-Problem. `min-w-0 flex-1` ist bereits auf dem Titel-Container gesetzt (Zeile 63). Keine besonderen Mobile-Anpassungen noetig ausser `flex-col`-default fuer die Bloecke (bereits durch `space-y-2` gewaehrleistet). [VERIFIED: MatchResultList.tsx Zeile 62–63]

---

## 5. Eval-Skript Erweiterung (Metriken + Threshold-Gate)

### Bestehende Architektur — Erweiterungspunkte

Das Skript hat 6 klar getrennte Bereiche: [VERIFIED: eval-matcher.ts vollstaendig analysiert]

1. `KorpusEntry` Interface (Zeile 36–50) → erweitern um `expected_clarification?`, `expected_missing_slots?`
2. `EntryResult` Interface (Zeile 52–68) → erweitern um `clarificationResult?: 'hit'|'miss'|'false_pos'|'n/a'`
3. `AggregateMetrics` Interface (Zeile 69–90) → erweitern um Clarif-Metriken
4. `aggregate()` Funktion (Zeile 227–287) → neue Metrik-Berechnung einbauen
5. Konsolen-Bericht in `main()` (Zeile 409–435) → neue Zeilen
6. JSON-Report-Objekt (Zeile 439–452) → `aggregate`-Erweiterung wird automatisch mitgenommen

### Neue KorpusEntry-Felder

```typescript
interface KorpusEntry {
  // ... bestehende Felder ...
  expected_clarification?: boolean;         // default: false
  expected_missing_slots?: Array<"bundesland" | "zielgruppe" | "thema">;
}
```

Die bestehende Validierungs-Funktion `loadKorpusAndValidate()` muss erweitert werden: pruefen ob `expected_missing_slots` nur erlaubte Werte enthaelt.

### Neue EntryResult-Felder

```typescript
interface EntryResult {
  // ... bestehende Felder ...
  /** Ob Matcher korrekt CLARIFY geliefert hat (nur bei expected_clarification=true auswertbar). */
  clarifResult: "hit" | "miss" | "false_pos" | "not_applicable";
  /** Anteil erwarteter Slots im Fragetext (0-1), null wenn kein expected_missing_slots. */
  slotCoverage: number | null;
}
```

### Metric-Berechnung in aggregate()

```typescript
// Clarification-Precision: among expected_clarification=true entries
const expectedClarif = results.filter(r => r.clarifResult !== "not_applicable" && /* expected=true */ );
const clarifPrecision = expectedClarif.length === 0 ? null
  : expectedClarif.filter(r => r.clarifResult === "hit").length / expectedClarif.length;

// Clarification-Falsch-Positiv-Rate: among expected_clarification=false entries
const expectedNoClarif = results.filter(r => r.clarifResult === "false_pos" || r.clarifResult === "miss" /* expected=false */);
// Hint: verwirrender Code, besser im Interface deutlich machen
```

Empfehlung: Im `EntryResult` speichern ob `expected_clarification` true/false war, damit `aggregate()` ohne Zugriff auf `KorpusEntry` auswerten kann.

### Threshold-Gate (Exit-Code fuer PR-Gate)

Am Ende von `main()` nach dem JSON-Report:

```typescript
// D-16 PR-Gate
const gate = {
  "Recall@3 >= 0.42":            m.recallAtThreeMean >= 0.42,
  "Off-Target < 5%":             m.offTargetRate < 0.05,
  "Clarif-Precision >= 80%":     m.clarifPrecision == null || m.clarifPrecision >= 0.80,
  "Clarif-FalschPos <= 10%":     m.clarifFalschPosRate == null || m.clarifFalschPosRate <= 0.10,
};
const failed = Object.entries(gate).filter(([, ok]) => !ok);
if (failed.length > 0) {
  console.error(`\n[GATE FAILED] ${failed.map(([k]) => k).join(", ")}`);
  process.exit(1);  // Non-zero = PR-Gate-Fail
}
console.log("\n[GATE PASSED] Alle D-16-Targets erfuellt.");
process.exit(0);
```

**Wichtig:** `process.exit(1)` bei Gate-Fail — das ist der mechanisch pruefbare Indikator fuer den PR-Reviewer. `npm run eval:matcher` muss exit 0 liefern fuer grune PR. [VERIFIED: D-17 aus CONTEXT.md]

### Slot-Coverage Soft-Match

Fuer D-14 (`expected_missing_slots`): Wort-Vorkommen im Frage-Text als Soft-Match. Empfehlung:

```typescript
function computeSlotCoverage(frage: string, expectedSlots: string[]): number {
  if (expectedSlots.length === 0) return 1.0;
  const lower = frage.toLowerCase();
  const keywords: Record<string, string[]> = {
    bundesland: ["bundesland", "land", "region", "wo ", "welchem land", "berlin", "bayern", "nrw"],
    zielgruppe: ["zielgruppe", "schultyp", "klasse", "klassenstufe", "wer", "schueler"],
    thema:      ["thema", "schwerpunkt", "fokus", "bereich", "worum", "was genau", "welches projekt"],
  };
  let hits = 0;
  for (const slot of expectedSlots) {
    const kws = keywords[slot] ?? [slot];
    if (kws.some(kw => lower.includes(kw))) hits++;
  }
  return hits / expectedSlots.length;
}
```

Das ist diagnostisch (D-14 explizit nicht PR-Gate) — kein exit(1) bei niedriger Slot-Coverage. [VERIFIED: D-14 ist diagnostisch laut CONTEXT.md]

---

## 6. Korpus-Vague-Eintraege: Kurations-Heuristik

### Klassifikation der bestehenden Vague-Eintraege

Die 7 bestehenden `category: "vag"` Eintraege teilen sich in:
- **Edge-Cases** (`expected_top3: []`): ev-003, ev-019, ev-022 — zu vage fuer jedes Ranking. Diese bekommen `expected_clarification: true` (D-13). [VERIFIED: matcher-korpus.json analysiert]
- **Vag-aber-rankbar**: ev-017, ev-018, ev-020, ev-021 — vage Anliegen, aber ein Ranking ist noch sinnvoll.

Die Trennlinie fuer `expected_clarification: true`:
- **Trigger:** mind. 2 von 3 Slots fehlen UND kein klares Thema erkennbar
- **Nicht-Trigger:** Anliegen ist vage in der Formulierung, aber Thema + Bundesland sind aus Profil-Feldern rekonstruierbar

### Kurationsprinzip fuer 5-7 neue Vague-Eintraege

**Drei Typen von Vague-Eintraegen, die statistisch separierbar sind:**

**Typ 1 — Slot-fehlt-Kombo (kein Bundesland + kein Schultyp):**
```json
{
  "id": "ev-023", "category": "vag",
  "anliegen": "Wir wollen ein Projekt starten, das Kinder motiviert und foerdert — vielleicht im kreativen Bereich.",
  "expected_top3": [], "expected_off_target": ["bmbf-digitalpakt-2"],
  "expected_clarification": true,
  "expected_missing_slots": ["bundesland", "zielgruppe"],
  "notes": "Thematisch noch halbwegs erkennbar (kreativ), aber kein BL, kein Schultyp — 2/3 Slots fehlen."
}
```

**Typ 2 — Multi-Thema ohne Schwerpunkt (kein Thema-Slot):**
```json
{
  "id": "ev-024", "category": "vag",
  "anliegen": "Wir bewerben uns fuer alles Moegliche — Sport, Kultur, vielleicht auch was Digitales.",
  "schultyp": "grundschule", "bundesland": "Bayern",
  "expected_top3": [], "expected_off_target": ["bmbf-digitalpakt-2", "aktion-mensch-schulkooperation"],
  "expected_clarification": true,
  "expected_missing_slots": ["thema"],
  "notes": "BL + Schultyp bekannt, aber kein Themenschwerpunkt. CLARIFY noetig."
}
```

**Typ 3 — Anti-Beispiel (klar genug, Falsch-Positiv-Test):**
```json
{
  "id": "ev-025", "category": "vag",
  "anliegen": "Wir suchen Foerderung fuer einen Schulchor und Konzertfahrten — Budget ca. 4.000 Euro.",
  "schultyp": "gymnasium", "bundesland": "Hamburg",
  "expected_top3": ["kultur-macht-stark", "hamburg-kultur-schule"],
  "expected_off_target": ["bmbf-digitalpakt-2"],
  "expected_clarification": false,
  "notes": "Obwohl kurz und einfach formuliert: Thema (Musik/Kultur), BL, Schultyp alle bekannt. DARF NICHT clarify triggern."
}
```

**Wichtig:** Typ-3-Eintraege (Anti-Beispiele mit `expected_clarification: false` aber vager Formulierung) sind der staerkste Test fuer die Falsch-Positiv-Rate. Empfehlung: 2 von 5-7 neuen Eintraegen als Typ-3-Anti-Beispiele.

### Empirische Grenze fuer „rekonstruierbar"

Wenn `MatchInput.bundesland` gesetzt ist (aus Formular), ist der Bundesland-Slot **immer gefuellt** — auch wenn das `anliegen`-String kein BL erwaehnt. Das LLM sieht den Profil-Block im User-Prompt. Konsequenz: Eintraege mit gesetztem `bundesland`-Feld brauchen einen der anderen 2 Slots als fehlend, um `expected_clarification: true` zu rechtfertigen. [VERIFIED: buildUserPrompt() Zeile 162–174 zeigt Profil-Block-Logik]

---

## 7. Validation Architecture (Nyquist)

`nyquist_validation: true` in `.planning/config.json`. [VERIFIED: config.json]

### Test-Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + ts-jest 29.4.9 |
| Config-Datei | `jest.config.js` (root) |
| Quick-Run | `npx jest __tests__/lib/wizard/ --testPathPattern=matcher` |
| Vollsuite | `npm test` |

**Bestehende Wizard-Tests:** `__tests__/lib/wizard/` mit facts-extractor.test.ts, outline-fallback.test.ts, title-fallback.test.ts. [VERIFIED: find-Ergebnis]

### Phase Requirements → Test Map

| Req ID | Verhalten | Test-Typ | Automatischer Befehl | Datei vorhanden? |
|--------|-----------|----------|----------------------|-----------------|
| MATCH-02 | `parsePipeMatches` verarbeitet 4-Spalten-Zeilen korrekt | Unit | `npx jest __tests__/lib/wizard/matcher-parser.test.ts -x` | Nein — Wave 0 |
| MATCH-02 | Zeile mit Spalten≠4 wird verworfen (Soft-Failure) | Unit | (gleiche Datei) | Nein — Wave 0 |
| MATCH-02 | Leeres `achtung_bei` (Trailing-`|`) wird korrekt als `""` geparst | Unit | (gleiche Datei) | Nein — Wave 0 |
| MATCH-03 | `CLARIFY|<frage>`-Zeile triggert `kind: "clarification"` | Unit | `npx jest __tests__/lib/wizard/matcher-clarify.test.ts -x` | Nein — Wave 0 |
| MATCH-03 | `forceRanking: true` unterdrueckt CLARIFY-Dispatch | Unit | (gleiche Datei) | Nein — Wave 0 |
| MATCH-02+03 | `MatchResult`-Union hat korrekte Shape (TypeScript-Kompilierung) | Type-Check | `npx tsc --noEmit` | Nein (Config-Update noetig) |
| D-16 | Alle 4 Threshold-Gates korrekt berechnet | Eval-Skript-Lauf | `npm run eval:matcher` (exit 0 = pass) | Teilweise (Skript vorhanden, Metriken fehlen) |

### Sampling Rate

- **Pro Task-Commit:** `npx jest __tests__/lib/wizard/ -x` (< 5s, keine LLM-Calls — reine Parser/Dispatch-Tests)
- **Pro Wellen-Merge:** `npm test` (vollstaendig, inkl. Legacy-Tests)
- **Phase Gate:** `npm run eval:matcher` liefert exit 0 (alle D-16-Targets) vor `/gsd-verify-work`

### Wave 0 Luecken

- [ ] `__tests__/lib/wizard/matcher-parser.test.ts` — Parser-Unit-Tests fuer 4-Spalten + Soft-Failure + Trailing-Pipe
- [ ] `__tests__/lib/wizard/matcher-clarify.test.ts` — CLARIFY-Dispatch + forceRanking-Logik (mit gemocktem generateText)
- [ ] `__tests__/components/MatchResultList.test.tsx` — Rendering von `passt_weil`/`achtung_bei` + ClarificationCard (jsdom)

**Keine Framework-Installation noetig** — Jest + ts-jest + jest-environment-jsdom + @testing-library/react bereits als devDependencies vorhanden. [VERIFIED: package.json]

---

## 8. Implementation Risks & Pitfalls

### Pitfall 1: Trailing-Pipe-Problem

**Was schiefgeht:** Das LLM gibt `id|score|passt_weil` (3 Teile) aus, wenn `achtung_bei` leer sein soll, statt `id|score|passt_weil|` (4 Teile mit Trailing-Pipe). `parts.length !== 4` → Zeile wird verworfen.
**Warum es passiert:** Prompt-Formulierung nicht klar genug: „leeres `achtung_bei` erscheint als Trailing-`|`".
**Prävention:** Negativ-Beispiel im Prompt, das explizit zeigt was NICHT geliefert werden soll: `id|score|passt_weil` (ohne Trailing-Pipe). Plus Positiv-Beispiel mit Trailing-Pipe. Eval-Lauf nach Prompt-Aenderung zeigt sofort ob Problem besteht.
**Fruehwarnung:** Eval zeigt hohe Rate an ignorierten Zeilen (implizit in niedrigem Recall trotz korrekter LLM-Auswahl).

### Pitfall 2: CLARIFY triggert bei rankbaren Vague-Eintraegen (ev-017, ev-020, ev-021)

**Was schiefgeht:** ev-017 (vag digital, Bayern Gymnasium) hat alle 3 Slots teilweise gefuellt. Wenn der Prompt-Threshold zu niedrig ist, triggert CLARIFY und verhindert ein Ranking.
**Warum es passiert:** „mind. 2 von 3 fehlen" ist klar, aber „thematischer Fokus" ist fuzzy. „Irgendwas Digitales" koennte als Fokus gelten oder nicht.
**Prävention:** Prompt-Formulierung: „thematischer Fokus gilt als vorhanden, wenn das Anliegen ein klares Themenfeld nennt (z.B. 'digital', 'Sport', 'Lesen') — nicht wenn es mehrere gegensaetzliche nennt oder keines".
**Fruehwarnung:** Clarification-Falsch-Positiv-Rate > 10% im Eval. ev-017, ev-020, ev-021 werden als false_pos markiert.

### Pitfall 3: begruendung-Feld in Snapshot-Replays

**Was schiefgeht:** Alte Snapshots in `data/eval/snapshots/` haben `begruendung` in der `matches`-Array. Nach Migration auf `passt_weil`/`achtung_bei` scheitert `--replay`-Modus bei alten Snapshots.
**Warum es passiert:** D-04 entfernt `begruendung` hart — aber alte Snapshot-JSONs haben noch das alte Format.
**Prävention:** Im `loadReplayResult()` eine Kompatibilitaets-Shim einbauen: wenn Snapshot `begruendung` hat, in `passt_weil`-Feld kopieren, `achtung_bei` leer setzen. Oder alten Snapshots nicht mehr unterstuetzen (acceptables Risiko, da Baseline-Run neu gemacht wird).
**Pruefung:** Nach Migration `--replay` gegen neuen Snapshot laufen lassen, nicht gegen alte.

### Pitfall 4: StartClient.tsx State-Inkonsistenz bei zweitem Call

**Was schiefgeht:** User klickt „Praezisieren" → zweiter runMatch-Call → wenn Response erneut `kind: "clarification"` kommt (zweite Klaerungsrunde trotz D-09) und Code hat keinen Guard, entsteht eine Endlosschleife aus Clarification-Cards.
**Warum es passiert:** D-09 sagt `forceRanking: true` beim zweiten Call — aber was wenn die API-Response einen Fehler wirft und `forceRanking` nicht gesetzt wurde?
**Prävention:** In StartClient: bei zweitem Call immer `forceRanking: true` setzen. Zusaetzlich: wenn nach zweitem Call `kind === 'clarification'` zurueckkommt (sollte nicht passieren), trotzdem UI-Hinweis zeigen statt Loop.
**Pruefung:** Unit-Test fuer StartClient State-Maschine (oder zumindest manueller Smoke-Test: zweimal vages Anliegen eintippen).

### Pitfall 5: Max-Tokens-Abschneidung bei langen passt_weil-Feldern

**Was schiefgeht:** `MATCHER_MAX_TOKENS = 400` gilt fuer alle 3 Treffer-Zeilen plus CLARIFY-Variante. Bei 25 Worten pro `passt_weil` + 20 Worten `achtung_bei` = ~45 Worte × 1.3 Tokens/Wort × 3 Zeilen = ~175 Tokens reine Nutzlast, plus ID + Score-Felder. 400 sollte reichen, aber bei DeepSeek-Latenz-Optimierung via sehr engem Limit entsteht Abschneidung.
**Prävention:** Beim ersten Eval-Lauf nach Migration auf Trunkierungen pruefen. Notfalls auf 600 erhoehen (vernachlaessigbarer Kosteneffekt).

### Pitfall 6: costs vs. cost Inkonsistenz

**Was schiefgeht:** D-08 in CONTEXT.md schreibt `cost: CostLedger`, der bestehende Code verwendet `costs: CostLedger` durchgaengig. Eine falsche Migration bricht TypeScript-Checks.
**Prävention:** Den bestehenden Namen `costs` beibehalten. D-08-Typdefinition im CONTEXT.md ist normativ fuer die Semantik, nicht fuer den Feldnamen. [VERIFIED: matcher.ts + route.ts konsistent mit `costs`]

---

## 9. Recommended Plan-Aufteilung

Drei Plans in einer Welle, strikt geordnet:

### Plan 02-01: Backend-Migration (Typen + Matcher + API)

**Abhaengigkeit:** Keiner — kann sofort starten.
**Scope:**
1. Wave 0: `__tests__/lib/wizard/matcher-parser.test.ts` + `__tests__/lib/wizard/matcher-clarify.test.ts` schreiben (mit gemocktem `generateText`)
2. `MatchHit`-Interface in `matcher.ts` — `begruendung` raus, `passt_weil`/`achtung_bei` rein
3. `MatchResult`-Union in `matcher.ts` — discriminated Union `kind: 'ranking' | 'clarification'`
4. `MatchInput`-Interface — `forceRanking?: boolean` hinzufuegen
5. `MATCHER_SYSTEM`-Prompt — CLARIFY-Abschnitt + Negativbeispiele + Slot-Heuristik + 4-Spalten-Beispiel
6. `parsePipeMatches()` — 4-Spalten-exakt + Soft-Failure
7. `runMatch()` — CLARIFY-Dispatch + Union-Return
8. `app/api/match/route.ts` — Union-Response serialisieren
9. Tests gruen: `npx jest __tests__/lib/wizard/` ✓

### Plan 02-02: Frontend-Migration (UI + ClarificationCard)

**Abhaengigkeit:** Plan 02-01 muss merge-bereit sein (gleiche PR akzeptabel).
**Scope:**
1. Wave 0: `__tests__/components/MatchResultList.test.tsx` (jsdom, `passt_weil`/`achtung_bei`-Rendering)
2. `MatchEntry`-Interface in `MatchResultList.tsx` — `begruendung` raus, `passt_weil`/`achtung_bei` rein
3. Rendering in `MatchResultList.tsx` — zwei farbige Bloecke + Icons (D-10)
4. Neue `ClarificationCard`-Komponente in `components/Wizard/ClarificationCard.tsx` (D-11)
5. `StartClient.tsx` — State-Typ auf Union, Dispatch-Switch, zweiter Aufruf mit `forceRanking: true`
6. Smoke-Test: UI manuell im Browser pruefen (ranking + clarification + forceRanking)
7. Tests gruen: `npx jest __tests__/components/MatchResultList.test.tsx` ✓

### Plan 02-03: Korpus + Eval-Skript + Baseline

**Abhaengigkeit:** Plan 02-01 muss fertig sein (neues `MatchResult`-Schema muss vom Eval-Skript gelesen werden).
**Scope:**
1. `data/eval/matcher-korpus.json` — 3 Edge-Cases mit `expected_clarification: true` annotieren
2. 5-7 neue Vague-Eintraege (Typ 1: 2 Eintraege, Typ 2: 2 Eintraege, Typ 3 Anti-Beispiele: 2 Eintraege) — Claude entwirft, Kolja kuratiert in diesem Task
3. `scripts/eval-matcher.ts` — `KorpusEntry`-Interface erweitern, `EntryResult`-Interface erweitern, `aggregate()` erweitern, Threshold-Gate (`process.exit(1)` bei Gate-Fail)
4. Live-Eval-Lauf (`npm run eval:matcher --snapshot`) — prueft ob Targets aus D-16 erreicht werden
5. `data/eval/BASELINE.md` — Phase-2-Eintrag append-only
6. Report force-add fuer PR

**Wellen-Struktur:** Alle drei Plans in einer Welle, da sie logisch zusammengehoeren und das Frontend nicht ohne Backend deployed werden sollte. Reihenfolge 02-01 → 02-03 (parallel zu 02-02) → Abschluss.

---

## Validation Architecture

### Test-Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 mit ts-jest 29.4.9 |
| Config-Datei | `jest.config.js` (Root) |
| Quick-Run | `npx jest __tests__/lib/wizard/ -x` |
| Vollsuite | `npm test` |

### Phase Requirements → Test Map

| Req ID | Verhalten | Test-Typ | Automatischer Befehl | Datei vorhanden? |
|--------|-----------|----------|----------------------|-----------------|
| MATCH-02 | 4-Spalten-Parser korrektes Parsing | Unit | `npx jest __tests__/lib/wizard/matcher-parser.test.ts -x` | Nein — Wave 0 |
| MATCH-02 | Spalten≠4 → Soft-Failure (Zeile verworfen, Ranking valide) | Unit | (gleiche Datei) | Nein — Wave 0 |
| MATCH-02 | Trailing-Pipe → leeres `achtung_bei` | Unit | (gleiche Datei) | Nein — Wave 0 |
| MATCH-02 | `passt_weil`-Block wird gerendert | Unit (jsdom) | `npx jest __tests__/components/MatchResultList.test.tsx -x` | Nein — Wave 0 |
| MATCH-03 | `CLARIFY|...` → `kind: 'clarification'` | Unit | `npx jest __tests__/lib/wizard/matcher-clarify.test.ts -x` | Nein — Wave 0 |
| MATCH-03 | `forceRanking: true` → kein CLARIFY-Dispatch | Unit | (gleiche Datei) | Nein — Wave 0 |
| MATCH-03 | ClarificationCard wird bei `kind==='clarification'` gerendert | Unit (jsdom) | `npx jest __tests__/components/MatchResultList.test.tsx -x` | Nein — Wave 0 |
| D-16 | Alle 4 Threshold-Gates im Eval-Skript | Eval-Skript | `npm run eval:matcher` (exit 0 = pass) | Teilweise |

### Sampling Rate

- **Pro Task-Commit:** `npx jest __tests__/lib/wizard/ -x` (< 5s, kein LLM)
- **Pro Wellen-Merge:** `npm test` (vollstaendig)
- **Phase Gate:** `npm run eval:matcher` exit 0 (D-16-Targets) vor `/gsd-verify-work`

### Wave 0 Luecken

- [ ] `__tests__/lib/wizard/matcher-parser.test.ts` — Parser-Unit-Tests (3 Faelle: korrekt, Spalten≠4, Trailing-Pipe)
- [ ] `__tests__/lib/wizard/matcher-clarify.test.ts` — CLARIFY-Dispatch + forceRanking (generateText gemocked)
- [ ] `__tests__/components/MatchResultList.test.tsx` — Rendering passt_weil/achtung_bei + ClarificationCard

---

## Assumptions Log

| # | Claim | Abschnitt | Risiko bei Fehler |
|---|-------|-----------|-------------------|
| A1 | DeepSeek `deepseek-chat` folgt 4-Spalten-Pipe-Format zuverlaessig mit Negativ-Beispiel im Prompt | 1, 2 | Hohe Parser-Fehlerrate → Recall sinkt, Eval-Gate schlaegt fehl. Mitigation: Eval-Lauf liefert Signal innerhalb Minuten. |
| A2 | Trailing-`|` fuer leeres `achtung_bei` muss explizit im Prompt-Negativbeispiel illustriert sein | 1, 2 | Ca. 30-50% der Zeilen haben 3 statt 4 Spalten → hohe Soft-Failure-Rate → niedriges Recall. Mitigation: Prompt iterieren. |
| A3 | `forceRanking: true` als Conditional-Section im Prompt unterdrueckt CLARIFY korrekt | 1 | D-09 bricht → Clarification-Loop moeglich. Mitigation: Unit-Test explizit dafuer. |
| A4 | `MATCHER_MAX_TOKENS = 400` reicht fuer erweitertes 4-Spalten-Format | 2 | Abgeschnittene Antworten → unvollstaendige Pipe-Zeilen. Mitigation: sofort erkennbar in Eval. |
| A5 | `previousAnliegen + neue_antwort` Konkatenation funktioniert LLM-seitig fuer praezisierten Match | 1 | Zweiter Matching-Aufruf liefert schlechtere Ergebnisse als direkte Eingabe. Mitigation: Smoke-Test im Plan. |

---

## Offene Fragen (RESOLVED)

1. **Wie wird `previousAnliegen` im zweiten `runMatch`-Call uebergeben?**
   - Was wir wissen: D-09 sagt „Frontend sendet praezisiertes Anliegen" — ob als Konkatenation im `anliegen`-Feld oder als separates Feld ist Claude's Discretion.
   - Was unklar: Bei Konkatenation (`"alt: ... | neu: ..."`) entsteht ein Pipe-Char im Anliegen-Text, der den Prompt-Context verunreinigt. Besser: `previousAnliegen?: string` als separates Feld in `MatchInput`, in `buildUserPrompt()` als separater Block.
   - Empfehlung: separates Feld — Planner entscheidet.

2. **Welche Vague-Eintraege aus ev-017/ev-018/ev-020/ev-021 sollen `expected_clarification: true` oder `false` bekommen?**
   - Was wir wissen: D-13 sagt die 3 Edge-Cases (ev-003/ev-019/ev-022) bekommen `true`. Die anderen 4 vagen Eintraege sind rankbar.
   - Was unklar: ev-017 (`irgendwas Digitales`) und ev-021 (`Lesefoerderung, Ausfluege, Sport-AGs`) sind grenzwertige Faelle — Kolja muss entscheiden, ob hier CLARIFY erwartet wird oder nicht.
   - Empfehlung: ev-017/ev-018/ev-020/ev-021 bekommen `expected_clarification: false` (behalten rankbar-Annotation, sind Falsch-Positiv-Tests). Kolja bestaetigt im Plan 02-03 Task 1b.

---

## Quellen

### Primaer (HIGH confidence)

- Codebase direkt gelesen: `lib/wizard/matcher.ts`, `lib/wizard/llm.ts`, `app/api/match/route.ts`, `components/Wizard/MatchResultList.tsx`, `components/Wizard/StartClient.tsx`, `scripts/eval-matcher.ts`, `data/eval/matcher-korpus.json`, `jest.config.js`, `package.json`
- `.planning/phases/02-matcher-quality/02-CONTEXT.md` — 17 Locked Decisions
- `.planning/phases/01-eval-korpus-matcher/01-VERIFICATION.md` — Phase-1-Artefakte verifiziert

### Sekundaer (MEDIUM confidence)

- CLAUDE.md (Projekt) — Konventionen (DeepSeek-Default, deutsche Sprache)
- `.planning/config.json` — nyquist_validation: true bestaetigt

### Tertiaer (ASSUMED)

- LLM-Konsistenz-Aussagen zu DeepSeek Pipe-Format — aus Projekterfahrung (facts-extractor.ts Iteration), nicht extern verifiziert
- Tailwind Dark-Theme-Farbvorschlaege — aus bestehendem Design-System abgeleitet, kein externes Design-Token-System vorhanden

---

## Metadata

**Confidence breakdown:**
- Backend (Parser + Union + API): HIGH — vollstaendig aus Codebase verifiziert
- Frontend (UI + Icons + Tailwind): HIGH fuer Struktur, MEDIUM fuer konkrete Farben (Dark-Theme-Abstimmung erfordert visuellen Test)
- LLM-Prompt-Konsistenz: MEDIUM — Muster bewaehrt, aber nicht metrisch quantifiziert
- Eval-Skript-Erweiterung: HIGH — Architektur klar aus 496-Zeilen-Skript

**Research date:** 2026-05-03
**Gueltig bis:** 2026-06-03 (stabile Codebase, DeepSeek-API stabil)
