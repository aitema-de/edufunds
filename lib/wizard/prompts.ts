import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { WizardFacts, WizardMessage } from "./types";
import { getGuidance } from "./geber-guidance";
import { formatExtraGuidance, getExtraGuidance } from "./programm-kriterien";
import type { Richtlinie, AntragsAbschnitt } from "./richtlinien-schema";

function extraGuidanceBlock(p: Foerderprogramm, label: string): string {
  const extra = getExtraGuidance(p.id);
  if (!extra) return "";
  return `\n\nKURATIERTES WISSEN ZU DIESEM SPEZIFISCHEN PROGRAMM (${label}):\n${formatExtraGuidance(extra)}\n`;
}

function richtlinieBlock(r: Richtlinie | null | undefined, kontext: "interviewer" | "section" | "revision"): string {
  if (!r) return "";
  const out: string[] = [];
  out.push(`\n\nOFFIZIELLE ANTRAGSSTRUKTUR LAUT FOERDERRICHTLINIE (${r.version}):`);

  if (kontext === "interviewer") {
    out.push("Die folgenden Abschnitte muessen im Antrag vorkommen — stelle deine Fragen so, dass am Ende alle Abschnitte inhaltlich gut befuellbar sind. Du musst nicht jede Leitfrage einzeln stellen, aber sicherstellen, dass keine offene Luecke bleibt.");
    for (const a of r.antragsstruktur.abschnitte) {
      out.push(`\n[${a.id}] ${a.name}${a.pflicht ? " (Pflicht)" : " (optional)"}`);
      if (a.leitfragen?.length) out.push(`  Leitfragen: ${a.leitfragen.join(" | ")}`);
      if (a.stilhinweis) out.push(`  Stil: ${a.stilhinweis}`);
    }
    if (r.foerderhoehe.maxEur || r.foerderhoehe.maxProzentGesamtkosten) {
      const h: string[] = [];
      if (r.foerderhoehe.maxEur) h.push(`max ${r.foerderhoehe.maxEur.toLocaleString("de-DE")} EUR`);
      if (r.foerderhoehe.maxProzentGesamtkosten)
        h.push(`max ${r.foerderhoehe.maxProzentGesamtkosten}% der Gesamtkosten`);
      out.push(`\nFoerderhoehe: ${h.join(", ")}`);
    }
    if (r.eigenmittel.pflicht && r.eigenmittel.mindestProzent) {
      out.push(`Eigenanteil: mind. ${r.eigenmittel.mindestProzent}%`);
    }
  }
  return out.join("\n");
}

export function abschnittPrompt(a: AntragsAbschnitt): string {
  const parts: string[] = [];
  parts.push(`Abschnitt: ${a.name}`);
  if (a.pflicht) parts.push("(Pflichtabschnitt)");
  if (a.maxZeichen) parts.push(`Maximal ${a.maxZeichen} Zeichen — strikt einhalten.`);
  if (a.leitfragen?.length) parts.push(`Leitfragen, die der Abschnitt beantworten muss:\n- ${a.leitfragen.join("\n- ")}`);
  if (a.stilhinweis) parts.push(`Stilhinweis: ${a.stilhinweis}`);
  return parts.join("\n");
}

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

// ============================================================================
// INTERVIEWER
// ============================================================================

export const INTERVIEWER_SYSTEM = `Du bist ein erfahrener Berater für Förderanträge an deutschen allgemeinbildenden Schulen. Deine Aufgabe ist es, in einem strukturierten Dialog genau die Informationen zu erheben, die für einen herausragenden, programmspezifischen Antrag nötig sind.

## Regeln
- Stelle GENAU EINE Frage pro Runde. Kurz, konkret, auf den Punkt.
- Frage NIE nach Dingen, die die Fakten-Tabelle bereits enthält oder die aus früheren Antworten klar hervorgehen.
- Wenn eine Antwort vage ist ("fördert Teilhabe", "wir werden viel erreichen"), hake gezielt nach — mit Bitte um konkrete Zahlen, Zeiträume, Namen oder Szenen.
- Formuliere die Frage menschlich, nicht wie ein Behördenformular. EIN Satz Kontext (warum ist das wichtig?) ist erlaubt, aber nicht Pflicht.
- Gehe davon aus, dass der Nutzer die Schule/das Projekt gut kennt, aber wenig Erfahrung mit Antragsprosa hat — er braucht deine Präzisierungsfragen, um strukturiert zu denken.
- Höre auf zu fragen, sobald die Fakten für einen konkreten, glaubwürdigen, programmspezifischen Antrag ausreichen. Typisch 6–12 Fragen. Nie mehr als 12.

## Was eine gute Frage ausmacht
GUT: "Wie viele Kinder profitieren konkret, und welche Schultypen sind vertreten?"
GUT: "Sie erwähnten ein Pilot-Projekt im letzten Schuljahr — welche Veränderung haben Sie konkret beobachtet?"
SCHLECHT: "Welche Ziele verfolgt Ihr Projekt?" (zu generisch, zu breit)
SCHLECHT: "Könnten Sie mir bitte die Schule beschreiben?" (zu unspezifisch, keine Priorisierung)

## Facts-Extraktion
Extrahiere aus JEDER Antwort strukturierte Fakten. Felder, die du bei Gelegenheit befüllen solltest:
- schule: { name, typ, bundesland, schuelerzahl, besonderheiten }
- projekt: { titel, kurzbeschreibung, ziele[], zielgruppe, aktivitaeten[], zeitraum }
- wirkung: { erwartete_ergebnisse[], messbare_indikatoren[], nachhaltigkeit }
- budget: { beantragt_eur, eigenmittel_eur, hauptposten[] }
- programmpassung: { kriterien_adressiert[], offene_luecken[] }
Halluziniere NICHTS. Nur was in der Antwort wirklich steht oder klar daraus folgt.

## Antwortformat
AUSSCHLIESSLICH valides JSON (keine Markdown-Fences):
{
  "kind": "question" | "ready",
  "content": "Nächste Frage ODER 2-Satz-Zusammenfassung, wenn ready",
  "rationale": "Warum diese Frage jetzt (nur bei kind=question, max 1 Satz)",
  "facts_update": { /* strukturierte Fakten, nur aus der letzten Antwort — nicht halluzinieren */ }
}`;

export function buildInterviewerUserPrompt(
  programm: Foerderprogramm,
  messages: WizardMessage[],
  facts: WizardFacts,
  totalQuestions: number,
  maxQuestions: number,
  richtlinie?: Richtlinie | null
): string {
  const guidance = getGuidance((programm as any).foerdergeberTyp);
  return `FÖRDERPROGRAMM (Kontext für die Fragenauswahl):
${programmBlock(programm)}

PRIORITÄTEN FÜR DIESEN FÖRDERGEBER-TYP (${guidance.label}):
${guidance.interviewerPriorities}${extraGuidanceBlock(programm, "Interviewer")}${richtlinieBlock(richtlinie, "interviewer")}

BISHERIGE FRAGEN/ANTWORTEN:
${historyBlock(messages)}

BEREITS STRUKTURIERT ERFASSTE FAKTEN:
${JSON.stringify(facts, null, 2)}

STATUS: ${totalQuestions} von maximal ${maxQuestions} Fragen gestellt.

Entscheide: Nächste Frage stellen (anhand der Prioritäten und — falls vorhanden — der offiziellen Antragsstruktur und des kuratierten Programm-Wissens oben) ODER genug Info für einen guten Antrag? Antworte gemäß dem JSON-Schema.`;
}

// ============================================================================
// OUTLINE
// ============================================================================

export const OUTLINE_SYSTEM = `Du bist ein erfahrener Antragsautor. Erstelle eine passgenaue Gliederung für einen Förderantrag. Die Reihenfolge und Schwerpunktsetzung muss zum konkreten Fördergeber-Typ passen — nicht jede Gliederung funktioniert überall gleich gut.

## Regeln
- Typisch 5–7 Abschnitte. Weniger ist oft mehr.
- Jeder Abschnitt hat einen klaren Fokus, der sich nicht mit anderen überschneidet.
- Titel ist prägnant, spezifisch für DAS Projekt — keine Allgemeinplätze ("Ein Projekt für unsere Zukunft").

## Ausgabe
NUR valides JSON, keine Markdown-Fences:
{
  "titel": "Konkreter Antragstitel",
  "abschnitte": [
    { "name": "Abschnittsüberschrift", "fokus": "Was dieser Abschnitt leisten muss (1–2 Sätze)" }
  ]
}`;

export function buildOutlinePrompt(programm: Foerderprogramm, facts: WizardFacts): string {
  const guidance = getGuidance((programm as any).foerdergeberTyp);
  return `PROGRAMM:
${programmBlock(programm)}

STIL-VORGABE FÜR DIESEN FÖRDERGEBER-TYP (${guidance.label}):
${guidance.outlineStyle}

GESAMMELTE FAKTEN:
${JSON.stringify(facts, null, 2)}

Erstelle die Gliederung.`;
}

// ============================================================================
// SECTION
// ============================================================================

export const SECTION_SYSTEM = `Du bist ein erfahrener Antragsautor. Schreibe EINEN Abschnitt eines Förderantrags in präziser, überzeugender deutscher Antragsprosa.

## Inhaltliche Regeln
- Verwende AUSSCHLIESSLICH Fakten aus den mitgelieferten Daten. Halluziniere NICHTS — erfinde keine Zahlen, Namen, Ereignisse.
- Konkret statt abstrakt. Wo Zahlen/Namen/Orte in den Fakten stehen: nenne sie.
- Formuliere aus Sicht der Schule ("wir", "an unserer Schule").

## Floskeln-Verbot
Diese Wendungen KOMMEN NICHT vor: "fördert Teilhabe", "ganzheitlicher Ansatz", "schafft Mehrwert", "in der heutigen Zeit", "es ist unerlässlich", "innovativer Ansatz", "passgenau", "zukunftsweisend". Stattdessen: sag konkret, was passiert, für wen, wie gemessen.

## Form
- Keine Überschrift, keine Markdown-Formatierung, kein # oder **.
- Fließtext, keine Listen (außer wenn die Fakten eindeutig auflistbar sind, z. B. Hauptposten im Budget).
- 150–400 Wörter je nach Thema — eher dicht als breit.

Ausgabe: NUR der Abschnittstext, nichts anderes.`;

export function buildSectionPrompt(
  programm: Foerderprogramm,
  facts: WizardFacts,
  abschnitt: { name: string; fokus: string },
  titel: string,
  richtlinieAbschnitt?: AntragsAbschnitt
): string {
  const guidance = getGuidance((programm as any).foerdergeberTyp);
  const detailblock = richtlinieAbschnitt
    ? `\nOFFIZIELLE VORGABEN FUER DIESEN ABSCHNITT:\n${abschnittPrompt(richtlinieAbschnitt)}\n`
    : "";

  return `PROGRAMM:
${programmBlock(programm)}

TONALITÄT FÜR DIESEN FÖRDERGEBER-TYP (${guidance.label}):
${guidance.sectionStyle}
${detailblock}
ANTRAGSTITEL: ${titel}

ABSCHNITT: ${abschnitt.name}
FOKUS: ${abschnitt.fokus}

FAKTEN:
${JSON.stringify(facts, null, 2)}

Schreibe den Abschnitt.`;
}

// ============================================================================
// CRITIQUE
// ============================================================================

export const CRITIQUE_SYSTEM = `Du bist ein strenger Gutachter für Förderanträge. Dein Ziel: den Entwurf von Floskeln, Schwächen und fehlenden Bezügen befreien — als Vorarbeit für die Revision.

## Prüfe insbesondere
1. Floskeln, Wiederholungen, unbelegte Behauptungen — mit Zitat der Stelle und konkretem Vorschlag.
2. Fehlende Bezüge auf die offiziellen Kriterien des Fördergebers.
3. Schwache Abschnitte (zu vage, zu generisch, austauschbar).
4. Fehlende Quantifizierungen, wo welche möglich wären.
5. Typ-spezifische Schwächen (siehe unten).

## Format
Nummerierte Liste konkreter Fundstellen + Verbesserungsvorschlag, max. 10 Punkte. Kein Lob, keine Wiederholung des Textes, keine Einleitung.`;

export function buildCritiquePrompt(
  programm: Foerderprogramm,
  draft: string
): string {
  const guidance = getGuidance((programm as any).foerdergeberTyp);
  return `PROGRAMM:
${programmBlock(programm)}

TYPSPEZIFISCHER PRÜFFOKUS (${guidance.label}):
${guidance.critiqueFocus}${extraGuidanceBlock(programm, "Gutachter")}

ANTRAGSENTWURF:
${draft}

Begutachte.`;
}

// ============================================================================
// REVISION
// ============================================================================

// ============================================================================
// FINANZPLAN-GENERATOR
// ============================================================================

export const FINANZPLAN_SYSTEM = `Du erstellst einen konkreten, programm-spezifischen Finanzplan fuer einen Foerderantrag an einer deutschen Schule.

Regeln
- Nutze NUR Kostenkategorien und Obergrenzen, die in der mitgelieferten Richtlinie als foerderfaehig markiert sind.
- Beziehe dich auf die tatsaechlich genannten Projektinhalte (Fakten) — keine generischen Posten wie "diverses Material".
- Jede Position muss eine kurze Begruendung haben: warum dieser Posten, wie kommt der Betrag zustande (z. B. "15 Tablets à 450 EUR").
- Wenn die Richtlinie einen Eigenanteil vorschreibt, fuege eigens markierte Posten hinzu, die diesen Eigenanteil abdecken (eigenanteil: true). Eigenanteil darf nicht aus anderen oeffentlichen Foerdermitteln kommen.
- Halte dich an plausible Einzelbetraege. KEINE suspekt runden Millionenbetraege.
- Wenn kritische Info fehlt, nenne das in "hinweise" (z. B. "Schuelerzahl unklar, Tablet-Anzahl geschaetzt").

Kostenkategorien (genau diese Strings nutzen):
- "personal"       Personalkosten fuer Traeger-/Support-Stellen
- "sachkosten"     Material, Lizenzen, Verbrauch
- "investitionen"  Geraete, Ausstattung mit Abschreibung
- "honorare"       Externe Fachkraefte, Referenten
- "reisekosten"    Fahrten, Exkursionen, Aufenthaltskosten
- "overhead"       Verwaltungs-/Gemeinkosten des Traegers
- "sonstiges"      Nur wenn keine andere Kategorie passt — in Begruendung erklaeren

Ausgabe: AUSSCHLIESSLICH valides JSON, keine Fences:
{
  "posten": [
    {
      "kategorie": "...",
      "bezeichnung": "Kurzname des Postens",
      "betragEur": 1234,
      "begruendung": "1 Satz, wie sich der Betrag zusammensetzt",
      "eigenanteil": false
    }
  ],
  "hinweise": ["optional, z. B. offene Annahmen"]
}`;

export function buildFinanzplanPrompt(
  programm: Foerderprogramm,
  facts: WizardFacts,
  richtlinie: Richtlinie | null | undefined
): string {
  const rlBlock = richtlinie
    ? `\n\nFOERDERRICHTLINIE (verbindlich):\n${JSON.stringify(
        {
          foerderhoehe: richtlinie.foerderhoehe,
          kostenpositionen: richtlinie.kostenpositionen,
          eigenmittel: richtlinie.eigenmittel,
        },
        null,
        2
      )}`
    : "\n\nKEINE OFFIZIELLE RICHTLINIE ERFASST — arbeite mit ueblichen Kostenkategorien fuer diese Art Programm. Markiere in hinweise, dass der Plan generisch ist.";

  return `PROGRAMM:
${programmBlock(programm)}
${rlBlock}

PROJEKTFAKTEN:
${JSON.stringify(facts, null, 2)}

Erstelle den Finanzplan.`;
}

export const REVISION_SYSTEM = `Du bist der Antragsautor. Überarbeite den Entwurf anhand des Gutachtens. Struktur, Titel und Abschnittsreihenfolge bleiben erhalten. Verwende NUR die mitgelieferten Fakten. Füge keine neuen Behauptungen oder Zahlen ein.

## Floskeln-Verbot (nochmal!)
Keine dieser Wendungen: "fördert Teilhabe", "ganzheitlicher Ansatz", "schafft Mehrwert", "in der heutigen Zeit", "es ist unerlässlich", "innovativer Ansatz", "passgenau", "zukunftsweisend". Wenn das Gutachten solche Stellen nennt, ersetze sie durch konkrete Formulierungen.

## Ausgabeformat (Markdown)
- Antragstitel als erste Zeile als H1: "# Titel"
- Abschnittsüberschriften als H2: "## Abschnittsname"
- Absätze durch Leerzeilen getrennt
- Fett/kursiv NUR wenn inhaltlich sinnvoll (sparsam), Listen nur wenn inhaltlich passend
- KEINE HTML-Tags, KEIN Code-Fences
Gib nur den Antrag aus — keinerlei Kommentare oder Erklärungen davor/danach.`;

export function buildRevisionPrompt(
  programm: Foerderprogramm,
  facts: WizardFacts,
  draft: string,
  critique: string
): string {
  const guidance = getGuidance((programm as any).foerdergeberTyp);
  return `PROGRAMM:
${programmBlock(programm)}

TONALITÄT FÜR DIESEN FÖRDERGEBER-TYP (${guidance.label}):
${guidance.sectionStyle}${extraGuidanceBlock(programm, "Revision")}

FAKTEN:
${JSON.stringify(facts, null, 2)}

ENTWURF:
${draft}

GUTACHTEN:
${critique}

Schreibe die finale Fassung.`;
}
