/**
 * Offene Punkte aus dem Antragstext herauslösen — für den Export.
 *
 * WARUM
 * -----
 * Die Pipeline markiert Lücken und Unterstellungen bewusst im Text:
 *   [TODO: …]     — Angabe fehlt, der Nutzer muss sie beschaffen.
 *   [Annahme: …]  — vom Assistenten plausibel unterstellt, nur zu bestätigen.
 * Das ist richtig so ("Kennzeichnen statt verbieten", 02.07.2026) und bleibt in
 * der App unverändert sichtbar (components/Wizard/MarkerHighlight.tsx).
 *
 * Im EXPORT wirken dieselben Marker aber gegen den Nutzer. Die Gutachter-Messung
 * vom 30.07.2026 (n=25, zwei unabhängige Judge-Modelle) zeigt: beide Judges
 * nennen unabhängig voneinander denselben Hauptmangel —
 *   „durch zahlreiche TODO-Vermerke klar als unfertiger Entwurf erkennbar
 *    und nicht einreichungsreif."
 * Gemessener Abzug: 0,31 Punkte auf der 5er-Skala, das Kriterium „Sprache und
 * formale Reife" fällt von 3,62 auf 3,00.
 *
 * Die Lösung ist NICHT, die Marker im Export zu löschen. Dann reicht jemand
 * unbemerkt einen Antrag mit Lücken ein — die Marker sind die einzige Bremse
 * davor. Stattdessen wandern sie geschlossen nach VORNE, als Arbeitsliste vor
 * dem Antrag, mit einem unmissverständlichen Hinweis, dass diese Seite nicht
 * mit eingereicht wird. Der Antragskörper liest sich fertig, die Lücken sind
 * lauter als vorher.
 *
 * Diese Datei ist die EINZIGE Quelle für diese Umformung. `scripts/eval-gutachter.ts`
 * importiert sie ebenfalls — sonst misst die Eval etwas anderes, als der Kunde
 * herunterlädt (die Falle aus feedback-eval-muss-user-artefakt-messen).
 *
 * Alle Funktionen sind pur/deterministisch (kein LLM) und client-sicher.
 */

export interface OffenePunkte {
  /** Fehlende Angaben, die der Nutzer beschaffen muss. */
  todos: string[];
  /** Vom Assistenten unterstellte Inhalte, die der Nutzer bestätigen sollte. */
  annahmen: string[];
}

const TODO_RE = /\[TODO:\s*([^\]]*?)\s*\]/g;
const ANNAHME_RE = /\[Annahme:\s*([^\]]*?)\s*\]/g;

/** Sammelt beide Markerarten in Textreihenfolge, getrimmt und dedupliziert. */
export function sammleOffenePunkte(text: string): OffenePunkte {
  const lese = (re: RegExp): string[] => {
    const out: string[] = [];
    const gesehen = new Set<string>();
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text ?? "")) !== null) {
      const inhalt = m[1].trim();
      if (!inhalt || gesehen.has(inhalt)) continue;
      gesehen.add(inhalt);
      out.push(inhalt);
    }
    return out;
  };
  return { todos: lese(TODO_RE), annahmen: lese(ANNAHME_RE) };
}

/**
 * Entfernt die Arbeitsmarker aus dem Fließtext.
 *
 * `[TODO: …]` fliegt raus — die Information steht danach in der Arbeitsliste.
 * `[Annahme: X]` wird auf `X` reduziert: Der Satz ist inhaltlich gewollt und
 * muss stehen bleiben, nur die Klammer stört im eingereichten Dokument.
 *
 * Es wird NICHTS erfunden und nichts inhaltlich verändert.
 */
export function bereinigeAntragstext(text: string): string {
  return (text ?? "")
    .replace(/[ \t]*\[TODO:[^\]]*\]/g, "")
    .replace(ANNAHME_RE, "$1")
    // Reste einsammeln, die durch das Entfernen entstehen können.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

export interface ExportOptionen {
  /** Dokumentbezeichnung fürs Programm, z. B. "Antrag" oder "Medienkonzept". */
  dokumentLabel?: string;
  /** Fußzeile (KI-Kennzeichnung nach AI Act Art. 50) — kommt ans Ende. */
  footer?: string;
}

/**
 * Baut den Arbeitslisten-Block. Leer, wenn nichts offen ist — dann bekommt der
 * Export gar keinen Vorspann.
 */
export function baueOffenePunkteBlock(punkte: OffenePunkte, dokumentLabel = "Antrag"): string {
  const { todos, annahmen } = punkte;
  if (!todos.length && !annahmen.length) return "";

  const zeilen: string[] = [];
  zeilen.push(`# Offene Punkte — vor dem Einreichen erledigen`);
  zeilen.push("");
  zeilen.push(
    `**Diese Seite gehört NICHT in die Einreichung.** Sie ist Ihre Arbeitsliste zum ` +
      `${dokumentLabel} auf den folgenden Seiten. Löschen Sie sie, sobald alles erledigt ist.`
  );
  zeilen.push("");

  if (todos.length) {
    zeilen.push(`## Diese Angaben fehlen noch (${todos.length})`);
    zeilen.push("");
    zeilen.push(
      `Der Assistent darf sie nicht erfinden — nur Sie kennen sie. Solange sie fehlen, ` +
        `bewerten Fördergeber die betroffenen Stellen als nicht prüfbar.`
    );
    zeilen.push("");
    for (const t of todos) zeilen.push(`- [ ] ${t}`);
    zeilen.push("");
  }

  if (annahmen.length) {
    zeilen.push(`## Diese Annahmen bitte prüfen (${annahmen.length})`);
    zeilen.push("");
    zeilen.push(
      `Der Assistent hat sie als plausibel unterstellt. Stimmt eine nicht, ändern Sie ` +
        `die Stelle im ${dokumentLabel} — sonst steht dort etwas, das Sie nicht gesagt haben.`
    );
    zeilen.push("");
    for (const a of annahmen) zeilen.push(`- [ ] ${a}`);
    zeilen.push("");
  }

  zeilen.push("---");
  zeilen.push("");
  return zeilen.join("\n");
}

/**
 * Der vollständige Exporttext: Arbeitsliste (falls nötig), dann der bereinigte
 * Antrag, dann die Fußzeile.
 */
export function baueExportText(antragstext: string, opts: ExportOptionen = {}): string {
  const punkte = sammleOffenePunkte(antragstext);
  const block = baueOffenePunkteBlock(punkte, opts.dokumentLabel ?? "Antrag");
  const koerper = bereinigeAntragstext(antragstext);
  return `${block}${koerper}${opts.footer ?? ""}`;
}
