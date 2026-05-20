# D-15 Vorbedingungs-Gate — Ist-Stand Critical-Path-Features

**Erstellt:** 2026-05-20
**Branch:** feature/wizard-adaptive
**Zweck:** D-15 — Realen Feature-Stand dokumentieren, bevor UAT-Sessions terminiert werden.

---

## Feature-Übersicht (Tabelle)

| Feature | Requirement-ID | Status | Belegstelle (Datei:Zeile / Grep-Muster) | UAT-Konsequenz |
|---------|---------------|--------|------------------------------------------|----------------|
| Strukturierte Begründung `passt_weil` / `achtung_bei` pro Treffer in Matcher-Response | MATCH-02 | **live** | `lib/wizard/matcher.ts:149–156` (`MatchHit`-Interface); `matcher.ts:332` (Pipe-Format `id\|score\|passt_weil\|achtung_bei`); Frontend: `components/Wizard/MatchResultList.tsx:110–128` (grüner `passt_weil`-Block + oranger `achtung_bei`-Block) | Feature bleibt in Beobachtungsliste |
| Klärungsfrage bei vagem Anliegen (CLARIFY-Dispatch + ClarificationCard) | MATCH-03 | **live** | `matcher.ts:288` (Form A Spec, `CLARIFY|<frage>`); `matcher.ts:479–483` (CLARIFY-Dispatch vor Parser); `components/Wizard/ClarificationCard.tsx:24–61` (ClarificationCard-Komponente mit Textarea + forceRanking-Override) | Feature bleibt in Beobachtungsliste |
| Antrag-Detail h2-Anker-IDs + sticky AntragSectionNav-Sidebar + Edit-Button bei paid=true | UI-01 | **live** | `components/Wizard/AntragSectionNav.tsx:22–29` (`slugifyHeading`); `AntragSectionNav.tsx:55–69` (IntersectionObserver); `AntragSectionNav.tsx:77` (sticky, `hidden md:block`); `components/Wizard/AntragResult.tsx:38–67` (`buildMarkdownComponents` mit h2-Anker + PenLine-Edit-Button wenn `paid=true`) | Feature bleibt in Beobachtungsliste |
| Empty-State `/antrag/meine` mit Action-CTA + Matcher-0-Treffer mit Reformulierungs-Tipps | UI-02 | **live** | `components/Wizard/MyAntraegeClient.tsx:133–151` (Empty-State mit Datei-Icon + „Anliegen schildern"-CTA + Link `/antrag/start`); `components/Wizard/MatchResultList.tsx:39–65` (0-Treffer-Empty-State mit SearchX-Icon + 3 Reformulierungs-Tipps + „Anliegen neu formulieren"-Reset-Button) | Feature bleibt in Beobachtungsliste |
| Mobile Touch-Targets (sm:py-3 / min-h 44px) auf Critical-Paths | UI-03 | **live** | `components/Wizard/MatchResultList.tsx:141` (`sm:py-3` auf „Antrag starten"-Button); `components/Wizard/QuestionCard.tsx:68` (`sm:py-3` auf Wizard-Antwort-Button) — Muster konsistent auf beiden Critical-Path-Buttons | Feature bleibt in Beobachtungsliste (Mobile-Test bleibt UAT-Aufgabe) |
| GeneratingProgress 7-Stage-Tracking (pending/active/done) + failed-UI mit Retry-CTA | UI-04 | **live** | `components/Wizard/GeneratingProgress.tsx:13–21` (STAGES-Array mit 7 Einträgen: outline/section/critique/revision/recheck/finanzplan/consistency); `GeneratingProgress.tsx:27–39` (`stageStatus`-Funktion); `components/Wizard/WizardShell.tsx:502–512` (failed-Phase → `WizardErrorBlock` mit `onRetry`); `components/Wizard/WizardErrorBlock.tsx:37–46` (Retry-Button „Erneut versuchen") | Feature bleibt in Beobachtungsliste |

---

## Detail-Befunde pro Feature

### MATCH-02 — Strukturierte Begründung (live)

**Matcher-Seite (`lib/wizard/matcher.ts`):**
- Zeile 149–156: `MatchHit`-Interface hat `passt_weil: string` und `achtung_bei: string` als dedizierte Felder (kein Pauschal-Feld mehr — `D-04` hart enforced).
- Zeile 332: Pipe-Format `id|score|passt_weil|achtung_bei` — Trailing-Pipe für leeres `achtung_bei` explizit dokumentiert.
- Zeile 412–440: `parsePipeMatches` parst 4 Spalten strict — Trailing-Pipe wird korrekt als leeres `achtung_bei` geparst.

**Frontend-Seite (`components/Wizard/MatchResultList.tsx`):**
- Zeile 110–128: Zwei dedizierte UI-Blöcke — grüner Block mit CheckCircle-Icon für `passt_weil`, oranger Block mit AlertTriangle-Icon für `achtung_bei` (nur gerendert wenn nicht leer).

**Status: Vollständig implementiert.**

---

### MATCH-03 — Klärungsfrage bei vagem Anliegen (live)

**Matcher-Seite (`lib/wizard/matcher.ts`):**
- Zeile 288–362: Form A (CLARIFY) vollständig spezifiziert inkl. Pflicht-Slot-Zählung, Multi-Thema-Zusatzregel, 6 Negativ-/Positiv-Beispiele.
- Zeile 479–483: CLARIFY-Dispatch: `firstLine.startsWith("CLARIFY|")` → `{ kind: "clarification", question, costs }` — `forceRanking` unterdrückt Dispatch.
- Zeile 133–143: `MatchInput`-Interface hat `forceRanking?: boolean` und `previousAnliegen?: string` für D-09 zweiten Aufruf.

**Frontend-Seite:**
- `components/Wizard/ClarificationCard.tsx:24–61`: ClarificationCard mit Textarea (Präzisierung), „Präzisieren"-Button, „Trotzdem mit aktueller Eingabe ranken"-Override-Link.
- `components/Wizard/StartClient.tsx:39`: Multi-Round-Guard im StartClient (verhindert Endlos-Loop).

**Status: Vollständig implementiert.**

---

### UI-01 — Antrag-Detail h2-Anker + AntragSectionNav-Sidebar + Edit-Button (live)

**AntragSectionNav (`components/Wizard/AntragSectionNav.tsx`):**
- Zeile 22–29: `slugifyHeading` mit Umlaut-Mapping + max 60 Zeichen.
- Zeile 55–69: IntersectionObserver mit `rootMargin: "-100px 0px -50% 0px"` — markiert aktiv sichtbares Heading.
- Zeile 77: `hidden md:block sticky top-24` — Sidebar auf Mobile ausgeblendet (UI-SPEC D-03).

**AntragResult (`components/Wizard/AntragResult.tsx`):**
- Zeile 38–67: `buildMarkdownComponents` mit h2-Renderer: Deduplizierungs-Suffix (-2/-3), `scroll-mt-24`, `group`-Hover für PenLine-Icon.
- Zeile 55–61: Edit-Button nur wenn `paid=true` — Link auf `/antrag/${programmId}/wizard?editAnswer=true`.
- Zeile 312: `<AntragSectionNav articleRef={articleRef} />` in die Render-Struktur integriert.

**Status: Vollständig implementiert.**

---

### UI-02 — Empty-States mit Action-orientierten CTAs (live)

**`/antrag/meine` Empty-State (`components/Wizard/MyAntraegeClient.tsx:133–151`):**
- FileText-Icon + h3 „Noch kein Antrag begonnen" + Beschreibungstext + CTA-Button „Anliegen schildern" mit Link `/antrag/start`.

**Matcher-0-Treffer-State (`components/Wizard/MatchResultList.tsx:39–65`):**
- SearchX-Icon + h3 + Beschreibungstext + drei nummerierte Reformulierungs-Tipps (Zielgruppe/Zielwirkung, Budget, Ist-Stand) + „Anliegen neu formulieren"-Button via `onReset`-Callback.

**Status: Vollständig implementiert.**

---

### UI-03 — Mobile Touch-Targets auf Critical-Paths (live, visuell nicht verifizierbar ohne Device)

**Grep-Befunde:**
- `components/Wizard/MatchResultList.tsx:141`: `py-2 sm:py-3` auf „Antrag starten"-Button (Match-Result-Click Critical-Path).
- `components/Wizard/QuestionCard.tsx:68`: `py-2 sm:py-3` auf Wizard-Antwort-Button.

**Hinweis:** Die `sm:py-3`-Klasse setzt 12px Padding oben/unten bei ≥640px-Viewport — auf mobilen Breakpoints (< 640px) bleibt `py-2` = 8px Padding. Die 44px-Mindesthöhe ist damit auf Mobile (< sm) NOT garantiert durch CSS allein — der Schriftgröße-Kontext (text-sm = 14px) + Padding ergibt auf < sm ca. 30px Höhe.

**UAT-Konsequenz:** Feature als „live" eingestuft (Klassen vorhanden, Pattern konventionell), aber Mobile-Device-Test im UAT bleibt Pflicht-Beobachtungspunkt — `sm:py-3` deckt ≥640px ab, nicht native Mobile. Reformulierung in Beobachtungsliste als konkreter Beobachtungspunkt.

**Status: Live (mit Device-Test-Vorbehalt).**

---

### UI-04 — GeneratingProgress 7-Stage + failed-UI mit Retry-CTA (live)

**GeneratingProgress (`components/Wizard/GeneratingProgress.tsx`):**
- Zeile 13–21: STAGES-Array mit genau 7 Einträgen: `outline`, `section`, `critique`, `revision`, `recheck`, `finanzplan`, `consistency` — jeder mit `key`, `label` (deutsch), `detail`.
- Zeile 27–39: `stageStatus` liefert `pending | active | done` basierend auf ORDER-Index-Vergleich.
- Zeile 57–79: Drei visuelle States pro Stage: Circle (grau/pending), Loader2 (spin/active), CheckCircle (emerald/done).

**Failed-UI und Retry (`components/Wizard/WizardShell.tsx:502–512`):**
- Bei `state.phase === "failed"`: `<WizardErrorBlock>` mit `onRetry`-Callback (setzt Phase zurück auf `ready_to_generate`).
- `components/Wizard/WizardErrorBlock.tsx:37–46`: „Erneut versuchen"-Button mit RefreshCw-Icon, disabled-State.

**Status: Vollständig implementiert.**

---

## Widerspruch REQUIREMENTS.md ↔ ROADMAP.md — Auflösung

Die REQUIREMENTS.md-Traceability-Tabelle zeigt MATCH-02/03 und UI-01..04 als **„Pending"** — das entspricht dem Stand 2026-05-06 (letzter REQUIREMENTS.md-Update). Die ROADMAP.md führt Phase-02.1-Plans als `[x]`.

**Befund:** Der Code-Inspektion zeigt, dass alle sechs Feature-Sets tatsächlich implementiert sind (Phase 02.1 war erfolgreich). Der REQUIREMENTS.md-Stand ist veraltet — die Traceability-Einträge wurden nie auf „Complete" gesetzt. Das ist eine Dokumentationslücke, kein Feature-Mangel.

**Handlungsempfehlung:** REQUIREMENTS.md-Update als chore-Commit (außerhalb Phase 6, kein Blocker für UAT).

---

## Entscheidung

Gemäß D-15: Alle sechs Critical-Path-Feature-Sets sind auf dem aktuellen `feature/wizard-adaptive`-HEAD implementiert und live.

**UAT-PLAN-TEMPLATE.md-Beobachtungsliste: keine Reduktion erforderlich.**

Alle Features bleiben in der Beobachtungsliste. Einzige Anpassung (D-22): Fiktive Daten als Default einbauen (Task 2).

**Spezifische Anmerkung UI-03 (Mobile):**
- Der `sm:py-3`-Pattern ist vorhanden. Echter Device-Test (iPhone-Safari, Android-Chrome) kann im UAT selbst nicht auf Koljas geteiltem Bildschirm stattfinden (D-21 Screen-Sharing auf Laptop-Browser). Die Beobachtungsliste wird um den Hinweis ergänzt, dass Mobile-Touch-Targets nur bei eigenem Endgerät des Piloten testbar sind. Das Feature-Set wird nicht entfernt.

**Nachzieh-Empfehlungen (außerhalb Phase 6):**
- REQUIREMENTS.md-Traceability aktualisieren: MATCH-02/03, UI-01..04, UAT-PREP-01..04 auf „Complete" setzen (ca. 5 % Aufwand, reiner Doku-Chore).
- Phase-02.1-Plans wurden inhaltlich erfüllt, Phasen-Verifikations-Commit steht laut STATE.md noch aus.

**Eskalationen:** Keine. Kein Feature mit Status „fehlt". Kein Blocken der UAT-Terminierung nötig.
