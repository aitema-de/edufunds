/**
 * Deterministischer Dubletten-Detektor für den fertigen Antragstext.
 *
 * WARUM (Tester-Feedback #008, 19.08.2026):
 * Der Tester fand im Abschnitt "Finanzierung und Mengengerüst" zwei Sätze, die
 * praktisch dasselbe sagen:
 *
 *   "Ein möglicher Ansatz ist, die Folgekosten für Ersatz, Reparatur und
 *    punktuelle Ergänzungen perspektivisch in die reguläre Material- und
 *    Ausstattungsplanung der Schule aufzunehmen."
 *   "Die Folgekosten für Ersatz, Reparatur und punktuelle Ergänzungen sollen
 *    perspektivisch in die reguläre Material- und Ausstattungsplanung der Schule
 *    aufgenommen werden."
 *
 * Das ist kein Stilproblem, sondern eine Signatur: Die Pipeline hat DREI
 * chirurgische Reparaturstufen (Halluzinations-Gate, Fakt-Verifikation,
 * Konsistenz-Revision), die einen Satz ERSETZEN sollen. Ein Sprachmodell kann
 * dabei aber anfügen statt ersetzen — hier offensichtlich die entschärfte
 * Fassung ("Ein möglicher Ansatz ist …") neben das stehengebliebene Original.
 *
 * Statt jede Reparaturstufe einzeln zu härten (drei Prompts, drei Eval-Läufe,
 * und die nächste neue Stufe hat das Problem wieder), prüft dieses Modul das
 * ERGEBNIS. Deterministisch, ohne LLM, robust gegen den Verursacher.
 */

/**
 * Ab dieser Überlappung gelten zwei Sätze als dieselbe Aussage.
 *
 * Gemessen am echten Fall (Antrag 37): Die beiden Sätze unterscheiden sich nur
 * in der Marker-Phrase ("Ein möglicher Ansatz ist") und einer Flexionsform
 * ("aufzunehmen"/"aufgenommen"). Jaccard über die Vereinigungsmenge kam damit
 * auf 0,71 und hätte die Dublette verfehlt; der Overlap-Koeffizient (Schnitt
 * geteilt durch den KÜRZEREN Satz) trifft mit 0,91. Overlap ist hier auch das
 * inhaltlich richtige Maß: Gesucht ist "steckt die Aussage des einen Satzes
 * vollständig im anderen?", nicht "sind beide gleich lang formuliert?".
 */
const AEHNLICHKEIT_SCHWELLE = 0.8;

/**
 * Zusätzliche Schranke gegen den Preis des Overlap-Maßes: Ein kurzer Satz steckt
 * schnell komplett in einem viel längeren, ohne dass er redundant wäre
 * ("Das Projekt fördert Lesekompetenz." in einem Satz, der zusätzlich das Wie,
 * Wer und Wann nennt). Beide Sätze müssen daher ähnlich informationsdicht sein.
 */
const MIN_LAENGEN_VERHAELTNIS = 0.6;
/** Kürzere Sätze sind zu oft zufällig ähnlich ("Das Projekt ist nachhaltig."). */
const MIN_WOERTER = 8;

/** Füllwörter, deren Übereinstimmung nichts über gleiche Aussage sagt. */
const FUELLWOERTER = new Set([
  "der","die","das","den","dem","des","ein","eine","einer","einem","einen","eines",
  "und","oder","aber","auch","sowie","als","wie","für","von","mit","bei","aus","auf",
  "in","im","an","am","zu","zum","zur","über","unter","durch","nach","vor","ist","sind",
  "wird","werden","wurde","wurden","soll","sollen","kann","können","hat","haben","sich",
  "nicht","dass","damit","weil","daher","dabei","dazu","diese","dieser","dieses","es",
]);

/** Satz auf seine bedeutungstragenden Wörter reduzieren. */
function kernwoerter(satz: string): Set<string> {
  return new Set(
    satz
      .toLowerCase()
      .replace(/[^a-zäöüß0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !FUELLWOERTER.has(w))
  );
}

/**
 * Overlap-Koeffizient zweier Sätze: gemeinsame Kernwörter geteilt durch die
 * kleinere der beiden Wortmengen. 1 = die Aussage des kürzeren Satzes steckt
 * vollständig im längeren.
 *
 * Gibt 0 zurück, wenn die Sätze zu unterschiedlich dicht sind — s.
 * MIN_LAENGEN_VERHAELTNIS.
 */
export function aehnlichkeit(a: string, b: string): number {
  const wa = kernwoerter(a);
  const wb = kernwoerter(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  const klein = Math.min(wa.size, wb.size);
  const gross = Math.max(wa.size, wb.size);
  if (klein / gross < MIN_LAENGEN_VERHAELTNIS) return 0;
  let schnitt = 0;
  for (const w of wa) if (wb.has(w)) schnitt++;
  return schnitt / klein;
}

export interface Dublette {
  /** Abschnitts-Überschrift, in der die Dublette steht. */
  abschnitt: string;
  /** Der Satz, der stehen bleiben sollte (der inhaltlich vollständigere). */
  behalten: string;
  /** Der Satz, der redundant ist. */
  redundant: string;
  /** Wortüberlappung 0..1 — für die Nachvollziehbarkeit im Befund. */
  aehnlichkeit: number;
}

/**
 * Trägt der Satz eine Vorsichts-Markierung? Das sind genau die Formen, die
 * Halluzinations-Gate und Fakt-Verifikation setzen, um eine Behauptung als
 * nicht belegte Ausgestaltung kenntlich zu machen.
 */
export function istVorsichtig(satz: string): boolean {
  return (
    /\[(Annahme|TODO):/i.test(satz) ||
    /\b(ein möglicher ansatz|denkbar (wäre|ist)|könnte|könnten|kann geprüft|vorgeschlagen|angestrebt|perspektivisch geplant|wir schlagen)\b/i.test(
      satz
    )
  );
}

function saetze(text: string): string[] {
  return text
    // Schliessende Klammern/Anführungszeichen NACH dem Satzzeichen gehören noch
    // zum Satz. Ohne sie verschmolz ein in "[Annahme: … .]" gewrappter Satz mit
    // dem folgenden zu einem einzigen — und ausgerechnet diese Marker-Sätze sind
    // der Hauptfall, den der Detektor finden soll.
    .split(/(?<=[.!?][\]\)"»'']?)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Findet Beinahe-Dubletten INNERHALB desselben Abschnitts.
 *
 * Bewusst nicht abschnittsübergreifend: Förderanträge werden feldweise gelesen,
 * eine bewusste Wiederholung über Abschnitte hinweg ist dort normal und oft
 * gewollt (das hat der Tester selbst so gesagt). Auffällig ist nur die Dopplung
 * im selben Absatz — die kann niemand gewollt haben.
 */
export function findeDubletten(finalText: string): Dublette[] {
  const gefunden: Dublette[] = [];
  let aktuellerAbschnitt = "(ohne Überschrift)";

  // Abschnittsweise, getrennt an H2-Überschriften.
  const bloecke: Array<{ titel: string; text: string }> = [];
  let puffer: string[] = [];
  for (const zeile of finalText.split("\n")) {
    if (/^##\s+/.test(zeile)) {
      if (puffer.length) bloecke.push({ titel: aktuellerAbschnitt, text: puffer.join("\n") });
      aktuellerAbschnitt = zeile.replace(/^##\s+/, "").trim();
      puffer = [];
    } else {
      puffer.push(zeile);
    }
  }
  if (puffer.length) bloecke.push({ titel: aktuellerAbschnitt, text: puffer.join("\n") });

  for (const block of bloecke) {
    const liste = saetze(block.text).filter(
      (s) => s.split(/\s+/).length >= MIN_WOERTER && !s.startsWith("#")
    );
    const schonGemeldet = new Set<number>();
    for (let i = 0; i < liste.length; i++) {
      if (schonGemeldet.has(i)) continue;
      for (let j = i + 1; j < liste.length; j++) {
        if (schonGemeldet.has(j)) continue;
        const score = aehnlichkeit(liste[i], liste[j]);
        if (score < AEHNLICHKEIT_SCHWELLE) continue;

        // Welcher Satz bleibt?
        //
        // ZUERST der VORSICHTIGERE. Die Dublette entsteht typischerweise, weil
        // eine Reparaturstufe eine Tatsachenbehauptung als Vorschlag entschärft
        // und die Urfassung stehen liess. Würde hier nur die Wortzahl
        // entscheiden, könnte der Detektor die entschärfte Fassung löschen und
        // die unbelegte Behauptung behalten — er würde also die Arbeit von
        // Halluzinations-Gate und Fakt-Verifikation rückgängig machen. Im
        // Zweifel bleibt die Fassung, die weniger behauptet.
        //
        // Erst wenn beide gleich vorsichtig sind, entscheidet die Zahl der
        // bedeutungstragenden Wörter (nicht die Zeichenlänge — sonst gewinnt die
        // geschwätzigere Fassung).
        const vI = istVorsichtig(liste[i]);
        const vJ = istVorsichtig(liste[j]);
        const [behalten, redundant] =
          vI !== vJ
            ? vI
              ? [liste[i], liste[j]]
              : [liste[j], liste[i]]
            : kernwoerter(liste[i]).size >= kernwoerter(liste[j]).size
              ? [liste[i], liste[j]]
              : [liste[j], liste[i]];

        gefunden.push({
          abschnitt: block.titel,
          behalten,
          redundant,
          aehnlichkeit: Math.round(score * 100) / 100,
        });
        schonGemeldet.add(j);
      }
    }
  }
  return gefunden;
}

/**
 * Entfernt die redundanten Sätze aus dem Text.
 *
 * Rein textuell und ohne LLM: Es wird exakt der Satz gestrichen, der als
 * redundant erkannt wurde — keine Umformulierung, kein Zusammenfassen. Damit
 * kann die Operation nichts erfinden und nichts verfälschen.
 */
export function entferneDubletten(finalText: string, dubletten: Dublette[]): string {
  let text = finalText;
  for (const d of dubletten) {
    // Satz samt vorangehendem Leerraum entfernen, damit keine Doppel-Leerzeichen
    // zurückbleiben. `split`/`join` statt Regex: Der Satz enthält Zeichen, die
    // in einem Regex Sonderbedeutung hätten.
    const mitLeerzeichen = ` ${d.redundant}`;
    text = text.includes(mitLeerzeichen)
      ? text.split(mitLeerzeichen).join("")
      : text.split(d.redundant).join("");
  }
  // Durch das Entfernen können doppelte Leerzeichen oder leere Absätze entstehen.
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
