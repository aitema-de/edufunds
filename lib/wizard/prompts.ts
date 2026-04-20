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

function foerderhoeheLine(r: Richtlinie): string | null {
  const h: string[] = [];
  if (r.foerderhoehe.maxEur) h.push(`max ${r.foerderhoehe.maxEur.toLocaleString("de-DE")} EUR`);
  if (r.foerderhoehe.maxProzentGesamtkosten)
    h.push(`max ${r.foerderhoehe.maxProzentGesamtkosten}% der Gesamtkosten`);
  return h.length ? h.join(", ") : null;
}

function kumulierungLine(r: Richtlinie): string | null {
  const k = r.kumulierung;
  if (k.erlaubt === false) return "Kumulierung mit anderen Förderprogrammen: NICHT zulässig für dieselbe Maßnahme.";
  if (k.erlaubt === "bedingt") return "Kumulierung mit anderen Förderprogrammen: nur bedingt zulässig.";
  return null;
}

function richtlinieBlock(
  r: Richtlinie | null | undefined,
  kontext: "interviewer" | "section" | "critique" | "revision"
): string {
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
    const fh = foerderhoeheLine(r);
    if (fh) out.push(`\nFoerderhoehe: ${fh}`);
    if (r.eigenmittel.pflicht && r.eigenmittel.mindestProzent) {
      out.push(`Eigenanteil: mind. ${r.eigenmittel.mindestProzent}%`);
    }
  }

  if (kontext === "critique") {
    out.push(
      "Pruefe den Entwurf zusaetzlich daraufhin, dass er die Anforderungen dieser Richtlinie erfuellt. Lieber einen Finding zu viel als einen zu wenig."
    );
    out.push("\nPflichtabschnitte (muessen im Antrag erkennbar sein):");
    for (const a of r.antragsstruktur.abschnitte) {
      if (a.pflicht === false) continue;
      const parts = [`- ${a.name}`];
      if (a.maxZeichen) parts.push(`(max ${a.maxZeichen} Zeichen)`);
      if (a.stilhinweis) parts.push(`— Stil: ${a.stilhinweis}`);
      out.push(parts.join(" "));
    }
    const fh = foerderhoeheLine(r);
    if (fh) out.push(`\nFoerderhoehe laut Richtlinie: ${fh}. Pruefe, dass die beantragte Summe dazu passt und der Antrag diese Obergrenze nicht ueberschreitet.`);
    if (r.eigenmittel.pflicht) {
      const mp = r.eigenmittel.mindestProzent ? ` (mindestens ${r.eigenmittel.mindestProzent} %)` : "";
      out.push(`Eigenanteil verpflichtend${mp}. Pruefe, dass der Antrag das Eigenanteils-Thema adressiert.`);
    }
    const ku = kumulierungLine(r);
    if (ku) out.push(ku);
    if (r.notizen?.length) {
      out.push("\nWichtige Richtlinien-Hinweise, die der Entwurf nicht verletzen darf:");
      for (const n of r.notizen) out.push(`- ${n}`);
    }
  }

  if (kontext === "revision") {
    out.push(
      "Halte dich bei der Ueberarbeitung strikt an diese Richtlinien-Vorgaben. Keinen Pflichtabschnitt weglassen, kein Zeichenlimit ueberschreiten."
    );
    out.push("\nPflichtabschnitte:");
    for (const a of r.antragsstruktur.abschnitte) {
      if (a.pflicht === false) continue;
      const parts = [`- ${a.name}`];
      if (a.maxZeichen) parts.push(`(max ${a.maxZeichen} Zeichen)`);
      if (a.stilhinweis) parts.push(`— Stil: ${a.stilhinweis}`);
      out.push(parts.join(" "));
    }
    const fh = foerderhoeheLine(r);
    if (fh) out.push(`\nFoerderhoehe: ${fh}. Die im Antrag genannte Summe muss darunter bleiben.`);
    if (r.eigenmittel.pflicht) {
      const mp = r.eigenmittel.mindestProzent ? ` (mindestens ${r.eigenmittel.mindestProzent} %)` : "";
      out.push(`Eigenanteil verpflichtend${mp} — muss im Antrag erwaehnt sein.`);
    }
    if (r.notizen?.length) {
      out.push("\nZwingende Richtlinien-Hinweise:");
      for (const n of r.notizen) out.push(`- ${n}`);
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

export const CRITIQUE_SYSTEM = `Du bist ein strenger Gutachter für Förderanträge. Dein Ziel: konkrete, umsetzbare Findings für die Revision — keine Allgemeinplätze, keine Wiederholung des Textes.

## Prüfe insbesondere
1. Floskeln, Wiederholungen, unbelegte Behauptungen.
2. Richtlinien-Verletzungen (fehlender Pflichtabschnitt, Stilverstoß, Zeichenlimit, Eigenanteil nicht adressiert).
3. Fehlende Bezüge auf offizielle Kriterien des Fördergebers.
4. Schwache/generische Abschnitte — austauschbar klingende Passagen.
5. Fehlende Quantifizierungen, wo welche möglich wären.
6. Typ-spezifische Schwächen (siehe Prüffokus im User-Prompt).
7. Inkonsistenzen zwischen Abschnitten oder zum Finanzplan.

## Ausgabe
AUSSCHLIESSLICH valides JSON, keine Markdown-Fences:
{
  "zusammenfassung": "1–2 Sätze zum Gesamtstand (optional)",
  "findings": [
    {
      "abschnitt": "Name des Abschnitts ODER 'global' ODER 'finanzplan'",
      "zitat": "WÖRTLICHES Kurzzitat (max 120 Zeichen) der problematischen Stelle. Wenn Inhalt ganz fehlt: 'FEHLT'",
      "schwere": "hoch" | "mittel" | "niedrig",
      "kategorie": "floskel" | "belegluecke" | "richtlinie" | "inkonsistenz" | "sonstiges",
      "vorschlag": "Was soll die Revision stattdessen tun? 1–3 konkrete Sätze."
    }
  ]
}

## Regeln
- Max 10 Findings, priorisiert nach Schwere.
- Lieber wenige scharfe Findings als viele flache.
- "schwere: hoch" NUR bei Richtlinien-Verstoß oder ernstem Beleg-Loch.
- Zitat ist WÖRTLICH, kein Paraphrase.
- Keine Findings, die nur den Text loben.`;

export function buildCritiquePrompt(
  programm: Foerderprogramm,
  draft: string,
  richtlinie?: Richtlinie | null
): string {
  const guidance = getGuidance((programm as any).foerdergeberTyp);
  return `PROGRAMM:
${programmBlock(programm)}

TYPSPEZIFISCHER PRÜFFOKUS (${guidance.label}):
${guidance.critiqueFocus}${extraGuidanceBlock(programm, "Gutachter")}${richtlinieBlock(richtlinie, "critique")}

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

## Umgang mit dem Gutachten
Das Gutachten liefert nummerierte Findings mit Abschnitt, wörtlichem Zitat, Schwere und konkretem Vorschlag. Arbeite sie in dieser Reihenfolge ab: erst alle "hoch"-Findings (Richtlinien-Verstöße dürfen nicht stehenbleiben), dann "mittel", dann "niedrig". Bei "FEHLT" ergänze den fehlenden Inhalt aus den Fakten, ohne zu halluzinieren.

## Floskeln-Verbot (nochmal!)
Keine dieser Wendungen: "fördert Teilhabe", "ganzheitlicher Ansatz", "schafft Mehrwert", "in der heutigen Zeit", "es ist unerlässlich", "innovativer Ansatz", "passgenau", "zukunftsweisend". Wenn das Gutachten solche Stellen nennt, ersetze sie durch konkrete Formulierungen.

## Ausgabeformat (Markdown)
- Antragstitel als erste Zeile als H1: "# Titel"
- Abschnittsüberschriften als H2: "## Abschnittsname"
- Absätze durch Leerzeilen getrennt
- Fett/kursiv NUR wenn inhaltlich sinnvoll (sparsam), Listen nur wenn inhaltlich passend
- KEINE HTML-Tags, KEIN Code-Fences
Gib nur den Antrag aus — keinerlei Kommentare oder Erklärungen davor/danach.`;

// ============================================================================
// CONSISTENCY (Antragstext × Finanzplan)
// ============================================================================

export const CONSISTENCY_SYSTEM = `Du prüfst, ob der Antragstext und der Finanzplan inhaltlich zusammenpassen. Du bist kein Lektor — du suchst nur echte Mismatches zwischen den beiden.

## Was ein Issue ist
- "posten-ohne-textbezug": Ein Finanzposten taucht im Antrag nicht auf — weder direkt benannt noch sinngemäß in der passenden Sektion beschrieben.
- "textbezug-ohne-posten": Der Antragstext nennt eine konkrete Kostenart (Geräte, Honorare, Fortbildungen, Fahrten), ohne dass es im Finanzplan einen entsprechenden Posten gibt.
- "betrag-unstimmig": Im Antrag genannte Zahlen/Größen widersprechen den Beträgen im Finanzplan (z. B. "15 Tablets à 500 €" im Text, aber Finanzplan hat 20 × 400 €).
- "sonstiges": Andere klare Widersprüche.

## Was KEIN Issue ist
- Synonym-Unterschiede ("iPads" vs. "Tablets", "Referent" vs. "Trainer").
- Der Antrag summiert zusammen, Finanzplan splittet auf (oder umgekehrt) — solange Summen passen.
- Der Finanzplan nennt übliche Nebenposten (z. B. Overhead), die der Text nicht explizit auflistet.

## Ausgabe
AUSSCHLIESSLICH valides JSON, keine Markdown-Fences:
{
  "issues": [
    {
      "art": "posten-ohne-textbezug" | "textbezug-ohne-posten" | "betrag-unstimmig" | "sonstiges",
      "beschreibung": "1 Satz, was der Widerspruch ist",
      "posten": "optional: Bezeichnung des Finanzpostens",
      "textstelle": "optional: Kurzzitat aus dem Antrag (max 100 Zeichen)"
    }
  ]
}

Regeln
- "issues": [] ist eine völlig gültige Antwort, wenn der Antrag konsistent ist.
- Max 8 Issues.
- Keine stilistischen Findings, nur Inhalt/Zahlen.`;

export function buildConsistencyPrompt(finalText: string, finanzplanJson: string): string {
  return `ANTRAGSTEXT (finale Fassung):
${finalText}

FINANZPLAN (JSON):
${finanzplanJson}

Beurteile die Konsistenz der beiden. Liefere die Issues-Liste.`;
}

// ============================================================================
// RECHECK (nach Revision: wurden die Findings tatsächlich adressiert?)
// ============================================================================

export const RECHECK_SYSTEM = `Du prüfst, ob ein überarbeiteter Förderantrag die zuvor gefundenen Findings wirklich adressiert hat. Du urteilst pro Finding, nicht über den Text insgesamt.

## Status pro Finding
- "geschlossen": Die Kritik ist im überarbeiteten Text erkennbar umgesetzt. Das Zitat/die Lücke ist durch eine bessere Formulierung oder ergänzten Inhalt ersetzt.
- "teilweise": Ein Ansatz ist erkennbar, aber das Kernproblem bleibt (z. B. Floskel ist raus, aber ohne konkreten Ersatz).
- "offen": Die Kritik ist in der überarbeiteten Fassung unverändert oder nicht ausreichend adressiert.

## Ausgabe
AUSSCHLIESSLICH valides JSON, keine Markdown-Fences:
{
  "resolutions": [
    { "index": 1, "status": "geschlossen" | "teilweise" | "offen", "kommentar": "optional, 1 Satz: warum dieser Status" }
  ]
}

Regeln
- Ein Eintrag pro Finding, Index beginnt bei 1 und entspricht der Nummerierung im Gutachten.
- Keine neuen Findings erfinden — nur die gelisteten beurteilen.
- "geschlossen" nur, wenn Revision klar handelt. Bei Unsicherheit: "teilweise".
- Kommentar nur bei "teilweise" oder "offen" — bei "geschlossen" weglassen.`;

export function buildRecheckPrompt(findingsRendered: string, finalText: string): string {
  return `URSPRÜNGLICHE FINDINGS (aus dem Gutachten):
${findingsRendered}

ÜBERARBEITETER ANTRAG (finale Fassung):
${finalText}

Beurteile für jedes Finding den Status.`;
}

export function buildRevisionPrompt(
  programm: Foerderprogramm,
  facts: WizardFacts,
  draft: string,
  critique: string,
  richtlinie?: Richtlinie | null
): string {
  const guidance = getGuidance((programm as any).foerdergeberTyp);
  return `PROGRAMM:
${programmBlock(programm)}

TONALITÄT FÜR DIESEN FÖRDERGEBER-TYP (${guidance.label}):
${guidance.sectionStyle}${extraGuidanceBlock(programm, "Revision")}${richtlinieBlock(richtlinie, "revision")}

FAKTEN:
${JSON.stringify(facts, null, 2)}

ENTWURF:
${draft}

GUTACHTEN:
${critique}

Schreibe die finale Fassung.`;
}
