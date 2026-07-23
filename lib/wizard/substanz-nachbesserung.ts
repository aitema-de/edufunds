/**
 * Substanz-Nachbesserung: gezielter Zweitpass fuer Abschnitte, deren
 * Begruendung die Revision NICHT nachgeliefert hat.
 *
 * Anlass (pv-011-Analyse, 22.07.2026): Bei vollem Findings-Stapel (~15)
 * triagiert das Revisionsmodell (mistral-small) zugunsten der
 * Halluzinations-Fixes — die substanz-Findings blieben laut Resolutions
 * ausdruecklich "offen — nicht erweitert". Prompt-Appelle allein sind dagegen
 * machtlos; dieser Pass macht die Reparatur DETERMINISTISCH VERIFIZIERBAR:
 *
 *   1. Nach der Revision misst pruefeSubstanz die FINALE Fassung.
 *   2. Nur die durchgefallenen Abschnitte gehen in EINEN gezielten LLM-Call —
 *      ohne konkurrierende Findings, mit nichts als dem Begruendungs-Auftrag.
 *   3. Uebernommen wird ein Abschnitt NUR, wenn er danach messbar Substanz
 *      traegt, ein belegtes Zeichenlimit einhaelt und nicht degeneriert ist
 *      (Never-Worse, wie Halluzinations-Gate und Fakt-Verifikation).
 *
 * Kostenprofil: 0 zusaetzliche Calls, wenn die Revision geliefert hat; sonst
 * genau 1 Call fuer alle Nachzuegler zusammen.
 */

import type { Richtlinie } from "./richtlinien-schema";
import { pruefeSubstanz, splitFinalText } from "./substanz";

export const SUBSTANZ_NACHBESSERUNG_SYSTEM = `Du bist Fachautor fuer Foerderantraege im Bildungsbereich.
Du erhaeltst einzelne Abschnitte eines fertigen Antrags, die ihr Vorhaben BESCHREIBEN, aber nicht BEGRUENDEN.
Deine einzige Aufgabe: jedem Abschnitt seine fachliche Begruendung geben.

REGELN:
- Verbinde das beschriebene Vorhaben ueber Kausalsaetze (weil / daher / auf dieser Grundlage / indem / sodass) mit dem paedagogischen Konzept, das seine NOTWENDIGKEIT traegt (z. B. Selbstwirksamkeit, Teilhabe, Praxislernen, Lebensweltorientierung — passend zum Vorhaben gewaehlt und AM VORHABEN erklaert, nicht als Etikett).
- Muster: "Wir tun X, weil <Konzept> zeigt, dass <Wirkmechanismus> — daher <Verbindung zum Ziel>."
- ALLE bestehenden Fakten, Zahlen, Namen und [Annahme: …]-Marker bleiben unveraendert erhalten. Du erfindest KEINE neuen Tatsachen ueber die Schule — die theoretische Rahmung ist erwuenschte Fachlichkeit, keine Halluzination.
- Steht beim Abschnitt ein ZEICHENLIMIT, gilt es hart: Ersetze dann beschreibende Saetze durch begruendende (verdichten statt anbauen). Ohne Limit ergaenzt du 2-4 Saetze Begruendung.
- Gib jeden Abschnitt VOLLSTAENDIG zurueck (nicht nur die neuen Saetze), ohne die "##"-Ueberschrift.

Antworte NUR mit JSON: {"abschnitte":[{"name":"<exakter Abschnittsname>","text":"<vollstaendiger ueberarbeiteter Abschnittstext>"}]}`;

export interface NachbesserungKandidat {
  name: string;
  text: string;
  /** Belegtes Formular-Limit (Zeichen), falls die Richtlinie eines nennt. */
  maxZeichen?: number;
}

export interface NachbesserungErgebnis {
  finalText: string;
  /** Abschnittsnamen, die nach der Revision ohne Substanz waren. */
  kandidaten: string[];
  /** Davon nach dem Pass messbar verbessert (uebernommen). */
  verbessert: string[];
  /** Davon weiterhin ohne Substanz (Original behalten oder Vorschlag verworfen). */
  verbleibend: string[];
}

function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Belegtes maxZeichen der Richtlinie fuer einen Abschnittsnamen (exakt, dann normalisiert). */
export function findeAbschnittsLimit(
  name: string,
  richtlinie?: Richtlinie | null
): number | undefined {
  const abschnitte = richtlinie?.antragsstruktur?.abschnitte;
  if (!abschnitte?.length) return undefined;
  const exakt = abschnitte.find((a) => a.name === name);
  if (exakt?.maxZeichen) return exakt.maxZeichen;
  const norm = abschnitte.find((a) => normName(a.name) === normName(name));
  return norm?.maxZeichen || undefined;
}

/** Findet die durchgefallenen Abschnitte der finalen Fassung. */
export function findeKandidaten(
  finalText: string,
  richtlinie?: Richtlinie | null
): NachbesserungKandidat[] {
  return splitFinalText(finalText)
    .filter((s) => {
      const b = pruefeSubstanz(s.name, s.text);
      return b.relevant && !b.hatSubstanz;
    })
    .map((s) => ({ name: s.name, text: s.text, maxZeichen: findeAbschnittsLimit(s.name, richtlinie) }));
}

export function buildNachbesserungPrompt(kandidaten: NachbesserungKandidat[]): string {
  const parts: string[] = [
    `${kandidaten.length} Abschnitt(e) brauchen ihre fachliche Begruendung:`,
  ];
  kandidaten.forEach((k, i) => {
    parts.push("");
    parts.push(`--- Abschnitt ${i + 1}: ${k.name} ---`);
    if (k.maxZeichen) {
      parts.push(
        `ZEICHENLIMIT: max ${k.maxZeichen} Zeichen (hartes Formular-Limit; aktuell ${k.text.trim().length}). Verdichten statt anbauen.`
      );
    }
    parts.push(k.text.trim());
  });
  return parts.join("\n");
}

/**
 * Ersetzt die Koerper der genannten "## <name>"-Abschnitte im Markdown-Text.
 * Index-basiert (kein Regex ueber Nutzertext), Praeambel/Reihenfolge bleiben.
 */
export function spliceAbschnitte(
  finalText: string,
  ersatz: Map<string, string>
): string {
  const headerRe = /^##\s+(.*)$/gm;
  type Slot = { name: string; bodyStart: number; bodyEnd: number };
  const slots: Slot[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(finalText)) !== null) {
    const bodyStart = m.index + m[0].length;
    if (slots.length > 0) slots[slots.length - 1].bodyEnd = m.index;
    slots.push({ name: m[1].trim(), bodyStart, bodyEnd: finalText.length });
  }
  if (slots.length === 0) return finalText;

  let out = "";
  let cursor = 0;
  for (const slot of slots) {
    const neu = ersatz.get(normName(slot.name));
    if (neu === undefined) continue;
    out += finalText.slice(cursor, slot.bodyStart);
    out += `\n\n${neu.trim()}\n\n`;
    cursor = slot.bodyEnd;
  }
  out += finalText.slice(cursor);
  return out;
}

function normalizeAntwort(raw: unknown): Map<string, string> {
  const map = new Map<string, string>();
  const src = (raw ?? {}) as { abschnitte?: unknown };
  if (!Array.isArray(src.abschnitte)) return map;
  for (const a of src.abschnitte as Array<Record<string, unknown>>) {
    if (!a || typeof a !== "object") continue;
    if (typeof a.name !== "string" || typeof a.text !== "string") continue;
    const text = a.text.trim();
    if (!a.name.trim() || !text) continue;
    map.set(normName(a.name), text);
  }
  return map;
}

/**
 * Deterministische Uebernahme-Entscheidung je Abschnitt (Never-Worse):
 * messbar Substanz + Limit eingehalten + nicht degeneriert.
 */
export function akzeptiereVorschlag(
  kandidat: NachbesserungKandidat,
  vorschlag: string
): boolean {
  if (!pruefeSubstanz(kandidat.name, vorschlag).hatSubstanz) return false;
  if (kandidat.maxZeichen && vorschlag.length > kandidat.maxZeichen) return false;
  // Degeneriert = deutlich kuerzer als das Original OHNE Limit-Druck. Mit
  // belegtem Limit ist Kuerzen legitim (verdichten) — dann gilt das MILDERE
  // aus Original-Anteil und Limit-Anteil als Stummel-Schranke (ein kurzes
  // Original darf kurz bleiben, ein langes darf aufs Limit eindampfen).
  const originalAnteil = kandidat.text.trim().length * 0.6;
  const minLen = kandidat.maxZeichen
    ? Math.min(originalAnteil, kandidat.maxZeichen * 0.3)
    : originalAnteil;
  return vorschlag.length >= minLen;
}

export async function substanzNachbesserung(
  finalText: string,
  richtlinie: Richtlinie | null | undefined,
  deps: {
    generate: (system: string, user: string) => Promise<{ value: unknown }>;
  }
): Promise<NachbesserungErgebnis | null> {
  const kandidaten = findeKandidaten(finalText, richtlinie);
  if (kandidaten.length === 0) return null;

  const res = await deps.generate(
    SUBSTANZ_NACHBESSERUNG_SYSTEM,
    buildNachbesserungPrompt(kandidaten)
  );
  const antwort = normalizeAntwort(res.value);

  const ersatz = new Map<string, string>();
  const verbessert: string[] = [];
  const verbleibend: string[] = [];
  for (const k of kandidaten) {
    const vorschlag = antwort.get(normName(k.name));
    if (vorschlag && akzeptiereVorschlag(k, vorschlag)) {
      ersatz.set(normName(k.name), vorschlag);
      verbessert.push(k.name);
    } else {
      verbleibend.push(k.name);
    }
  }

  return {
    finalText: ersatz.size > 0 ? spliceAbschnitte(finalText, ersatz) : finalText,
    kandidaten: kandidaten.map((k) => k.name),
    verbessert,
    verbleibend,
  };
}
