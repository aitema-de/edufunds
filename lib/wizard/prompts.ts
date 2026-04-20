import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { WizardFacts, WizardMessage } from "./types";

function programmBlock(p: Foerderprogramm): string {
  const lines: string[] = [];
  lines.push(`Programm: ${p.name}`);
  if ((p as any).foerdergeber) lines.push(`Fördergeber: ${(p as any).foerdergeber}`);
  if ((p as any).foerdergeberTyp) lines.push(`Typ: ${(p as any).foerdergeberTyp}`);
  if ((p as any).beschreibung) lines.push(`Beschreibung: ${(p as any).beschreibung}`);
  if ((p as any).foerdersummeText) lines.push(`Förderhöhe: ${(p as any).foerdersummeText}`);
  if ((p as any).zielgruppeText) lines.push(`Zielgruppe: ${(p as any).zielgruppeText}`);
  if ((p as any).bewerbungsfristText) lines.push(`Frist: ${(p as any).bewerbungsfristText}`);
  if ((p as any).kategorien?.length) lines.push(`Kategorien: ${(p as any).kategorien.join(", ")}`);
  if ((p as any).foerderkriterien?.length)
    lines.push(`Offizielle Kriterien: ${(p as any).foerderkriterien.join("; ")}`);
  return lines.join("\n");
}

function historyBlock(messages: WizardMessage[]): string {
  if (!messages.length) return "(noch keine Antworten)";
  return messages
    .filter((m) => m.kind === "question" || m.kind === "answer")
    .map((m) => `${m.role === "ai" ? "KI-Frage" : "Antwort"}: ${m.content}`)
    .join("\n");
}

export const INTERVIEWER_SYSTEM = `Du bist ein erfahrener Berater für Fördermittelanträge an deutschen Schulen.
Deine Aufgabe: in einem strukturierten Dialog die Informationen sammeln, die für einen herausragenden, programmspezifischen Antrag nötig sind.

Regeln:
- Stelle pro Runde GENAU EINE Frage, präzise und knapp.
- Frage NICHT nach Offensichtlichem, das schon beantwortet wurde.
- Priorisiere: (1) Programmpassung / vom Fördergeber ausdrücklich bewertete Kriterien, (2) Projektwirkung (messbar, spezifisch), (3) Besonderheiten der Schule / Zielgruppe, (4) Nachhaltigkeit, (5) Budget-Logik. Erst am Ende Formalia.
- Wenn eine Antwort vage ist, hake gezielt nach (Zahlen, Beispiele, Messgrößen).
- Gehe davon aus, dass der Nutzer die Schule/das Projekt kennt, aber wenig Erfahrung mit Antragsprosa hat.
- Formuliere Fragen menschlich, nicht wie ein Formular. Kurze Einordnung (1 Satz), warum die Info wichtig ist, ist erlaubt.
- Höre auf zu fragen, sobald du genug Substanz für einen konkreten, glaubwürdigen Antrag hast (typ. 6–12 Fragen, nie mehr als 12).

Antwortformat: AUSSCHLIESSLICH valides JSON, keine Markdown-Fences:
{
  "kind": "question" | "ready",
  "content": "die nächste Frage ODER eine 2-Satz-Zusammenfassung, falls ready",
  "rationale": "warum diese Frage jetzt (nur wenn kind=question, max 1 Satz)",
  "facts_update": { /* strukturierte Fakten, die aus der letzten Antwort klar hervorgehen — merge mit bisherigen Fakten, keine Halluzination */ }
}`;

export function buildInterviewerUserPrompt(
  programm: Foerderprogramm,
  messages: WizardMessage[],
  facts: WizardFacts,
  totalQuestions: number,
  maxQuestions: number
): string {
  return `FÖRDERPROGRAMM (Kontext für die Fragenauswahl):
${programmBlock(programm)}

BISHERIGE FRAGEN/ANTWORTEN:
${historyBlock(messages)}

BEREITS STRUKTURIERT ERFASSTE FAKTEN:
${JSON.stringify(facts, null, 2)}

STATUS: ${totalQuestions} von maximal ${maxQuestions} Fragen gestellt.

Entscheide: Nächste Frage stellen ODER genug Info für einen guten Antrag? Antworte gemäß dem JSON-Schema.`;
}

export const OUTLINE_SYSTEM = `Du bist ein erfahrener Antragsautor. Erstelle eine klare Gliederung für einen Förderantrag, abgestimmt auf das konkrete Programm und die erhobenen Fakten.
Ausgabe: NUR valides JSON:
{
  "titel": "Antragstitel, prägnant",
  "abschnitte": [
    { "name": "Abschnittsüberschrift", "fokus": "Was dieser Abschnitt leisten muss, 1–2 Sätze" }
  ]
}
Typisch 5–7 Abschnitte. Reihenfolge passend zur Erwartungshaltung des Fördergebers.`;

export function buildOutlinePrompt(programm: Foerderprogramm, facts: WizardFacts): string {
  return `PROGRAMM:
${programmBlock(programm)}

GESAMMELTE FAKTEN:
${JSON.stringify(facts, null, 2)}

Erstelle die Gliederung.`;
}

export const SECTION_SYSTEM = `Du bist ein erfahrener Antragsautor. Schreibe EINEN Abschnitt eines Förderantrags in professioneller, präziser, überzeugender deutscher Antragsprosa.
- Nutze AUSSCHLIESSLICH Fakten aus den mitgelieferten Daten. Halluziniere NICHTS.
- Keine Floskeln. Konkret, quantifiziert wo möglich.
- Formuliere durchgängig aus Sicht der Schule.
- Keine Überschrift, keine Markdown-Formatierung, keine Listen — Fließtext.
- 150–400 Wörter je nach Thema, eher dicht als breit.
Ausgabe: NUR der Abschnittstext, nichts anderes.`;

export function buildSectionPrompt(
  programm: Foerderprogramm,
  facts: WizardFacts,
  abschnitt: { name: string; fokus: string },
  titel: string
): string {
  return `PROGRAMM:
${programmBlock(programm)}

ANTRAGSTITEL: ${titel}

ABSCHNITT: ${abschnitt.name}
FOKUS: ${abschnitt.fokus}

FAKTEN:
${JSON.stringify(facts, null, 2)}

Schreibe den Abschnitt.`;
}

export const CRITIQUE_SYSTEM = `Du bist ein strenger Gutachter für Förderanträge. Prüfe den Antragsentwurf und nenne konkret:
1. Stellen mit Floskeln, Wiederholungen, unbelegten Behauptungen.
2. Fehlende Bezüge auf die offiziellen Kriterien des Fördergebers.
3. Schwache Abschnitte (zu vage, zu generisch).

Antwortformat: nummerierte Liste mit konkreten Fundstellen und Verbesserungsvorschlägen, max. 10 Punkte. Kein Lob, keine Wiederholung des Textes.`;

export function buildCritiquePrompt(
  programm: Foerderprogramm,
  draft: string
): string {
  return `PROGRAMM:
${programmBlock(programm)}

ANTRAGSENTWURF:
${draft}

Begutachte.`;
}

export const REVISION_SYSTEM = `Du bist der Antragsautor. Überarbeite den Entwurf anhand des Gutachtens. Behalte Struktur und Titel bei. Verwende NUR die mitgelieferten Fakten. Keine neuen Behauptungen.
Ausgabe: NUR der überarbeitete Volltext des Antrags, mit klaren Abschnittsüberschriften (Plain Text, keine Markdown-Syntaxzeichen wie # oder **). Leerzeile zwischen Abschnitten.`;

export function buildRevisionPrompt(
  programm: Foerderprogramm,
  facts: WizardFacts,
  draft: string,
  critique: string
): string {
  return `PROGRAMM:
${programmBlock(programm)}

FAKTEN:
${JSON.stringify(facts, null, 2)}

ENTWURF:
${draft}

GUTACHTEN:
${critique}

Schreibe die finale Fassung.`;
}
