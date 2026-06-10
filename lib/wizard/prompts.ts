import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { WizardFacts, WizardMessage, ConsistencyIssue } from "./types";
import { getGuidance } from "./geber-guidance";
import { formatExtraGuidance, getExtraGuidance } from "./programm-kriterien";
import type { Richtlinie, AntragsAbschnitt } from "./richtlinien-schema";
import { PIPELINE_CONFIG } from "./config";

// ============================================================================
// PHASE 5 WAVE 3 — HEBEL 1: SHARP_HALLU_VERBOTS_BLOCK (D-20 Hebel 1)
// Angehängt an SECTION/CRITIQUE/REVISION/RECHECK_SYSTEM wenn
// PIPELINE_CONFIG.sharpPrompts === true (PIPELINE_SHARP_PROMPTS=1).
// ============================================================================

const SHARP_HALLU_VERBOTS_BLOCK = `
## VERBOTSLISTE — keine erfundenen Konkreta (Phase 5 Hebel 1 + Probe 09.06.)

Erwaehne NIE folgende Dinge, wenn sie nicht aus den User-Antworten explizit hervorgehen:
- Aktenzeichen, Beschluss-Daten, Geschaeftszeichen — auch nicht im Format "Az 123/2026"
- Tarif-Eingruppierungen (TV-L E9, TVoeD etc.) ohne explizite User-Angabe
- Geographische Spezifika (Bezirke, Stadtteile) ohne User-Bestaetigung
- Konkrete Schueler-Zahlen wenn User "weiss nicht so genau" / "ca." gesagt hat
- Paedagogische Spezifika (Willkommensklassen, MDM-Loesungen, Rahmenvertraege) ohne Beleg
- Haushaltsstellen oder Buchungs-Codes — diese sind IMMER Erfindung
- KMK-Bezuege oder Curriculum-Zitate wenn User "kenne KMK nicht" gesagt hat
- Konkrete Partner-Namen die nicht in den User-Antworten genannt wurden
- **Erhebungen/Studien/Belege als Faktum** (VERA-Vergleichsarbeiten, Bedarfsanalysen,
  Schulstatistiken, "Sekretariatseinschaetzung", "sozialraeumliche Belastung") — wenn der
  User keine Erhebung nannte, ist jede Evidenz-Behauptung erfunden.
- **Marken-, Produkt- oder App-Namen** (Anton, Bettermarks, iPad 10. Gen, Antolin, …) —
  wenn der User nur allgemein "Lern-Apps", "Tablets", "Instrumente" sagte: NICHT spezifizieren.
- **Externe Partner / Vereine / Kooperationen / Foerdervereine / Honorarkraefte** (Medienpaedagoge,
  Landschaftsbuero, Stadtbibliothek-als-Partner, Schulsozialarbeit), die der User nicht genannt hat.
- **Konkrete paedagogische Methoden / Formate / Zeitplaene** ("Dialogisches Vorlesen", "Storytelling",
  "Pre/Post-Smiley-Skala", "4-Phasen-Plan", "monatliche Hospitationen", Quartals-Termine) ohne User-Beleg.
- **Hochgerechnete Teil-/Mengenzahlen** ("ca. 150 Nutzer" aus "60% von 250", "25 Tablets" aus
  "20-30 vielleicht") — eine vom User genannte Spanne darf NIE zu einer festen Zahl werden.
- **Zusagen mit Rechtsfolge** als feststehend ausgeben: Gemeinnuetzigkeit ("ist als gemeinnuetzig
  anerkannt"), eigenes Bankkonto, Mittel-Verwaltungsberechtigung, "muendliche Zusage des Foerdervereins",
  erteilte Schultraeger-/Schulkonferenz-Zustimmung — wenn der User das nicht ausdruecklich bestaetigt hat,
  ist es eine Falschangabe gegenueber dem Foerdergeber. Nur als noch einzuholenden Schritt formulieren.

**Few-Shot-Negativbeispiele (mit ehrlicher GUT-Alternative):**

SCHLECHT (erfunden): "Gemaess KMK-Strategie 'Bildung in der digitalen Welt' wird der Schultraeger nach TV-L E9 IT-Personal bereitstellen."
GUT: "Die geplante IT-Personalstelle wird gemaess den tariflichen Vorgaben des Schultraegers eingruppiert (Details mit Schultraeger im Vergabeverfahren noch zu klaeren)."

SCHLECHT: "Die VERA-Vergleichsarbeiten der letzten Jahre zeigen erkennbare Lernrueckstaende in Rechtschreibung und Mathematik."
GUT: "Aus Sicht des Kollegiums besteht in den Bereichen Lesen und Mathematik Foerderbedarf. [TODO: durch konkrete Daten — z. B. Vergleichsarbeiten — vor Einreichung belegen]"

SCHLECHT: "Beschafft werden 25 iPads der 10. Generation samt Lizenzen fuer Anton und Bettermarks fuer rund 150 Nutzer."
GUT: "Beschafft werden Tablets (Stueckzahl im Rahmen von 20-30, exakte Zahl noch festzulegen) sowie Lern-App-Lizenzen fuer Mathe/Deutsch. [TODO: konkrete Geraete und Apps auswaehlen]"

SCHLECHT: "Der Foerderverein hat die Mittelverwaltung muendlich zugesagt und ist als gemeinnuetzig anerkannt."
GUT: "Als Mittelverwalter kommt der Foerderverein in Frage; die formale Zusage und der Gemeinnuetzigkeits-Nachweis sind vor Antragstellung einzuholen."

**Grundregel:** Lieber kuerzer und ehrlich als erfunden. Wo eine konkrete Angabe fehlt, setze einen sichtbaren
Luecken-Marker \`[TODO: … einholen]\` in den Text — NICHT eine plausibel klingende Erfindung und NICHT eine
nichtssagende Floskel. Eine echte, vom User genannte Angabe ist mehr wert als zehn erfundene.
`;

const RECHECK_AUDIT_BLOCK = `
## PFLICHT-AUDIT vor RECHECK-Ende (Phase 5 Hebel 1)

Bevor du das Resultat zurueckgibst, pruefe explizit:
1. Steht im Antrag eine konkrete Schueler-Zahl, ein TV-L-Code, ein Aktenzeichen oder ein Bezirks-Name?
2. Falls JA: kommt diese Information aus den User-Antworten? Wenn nein — Finding als "offen" markieren oder zu Luecken-Marker umschreiben.
3. Steht ein Datum im Format DD.MM.YYYY drin? Wenn ja: ist das aus User-Antworten oder erfunden? Wenn erfunden — Finding als "offen" oder im Kommentar vermerken.
`;

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
    for (const a of (r.antragsstruktur.abschnitte ?? [])) {
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
    for (const a of (r.antragsstruktur.abschnitte ?? [])) {
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
    for (const a of (r.antragsstruktur.abschnitte ?? [])) {
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
// FACTS-EXTRACTOR
// ============================================================================

export const FACTS_EXTRACTOR_SYSTEM = `Du bist ein praeziser Extraktor fuer Foerderantrag-Fakten. Deine einzige Aufgabe: aus dem Interview-Verlauf strukturierte Slots befuellen. Du entscheidest NICHT, was als naechstes gefragt wird — das macht der Interviewer separat.

## Arbeitsweise
- Lies ALLE bisherigen User-Antworten zusammen, nicht nur die letzte. Eine Schuelerzahl in Antwort 2 muss spaeter weiter im Slot stehen.
- Gehe **jeden** Slot der Schema-Vorlage durch. Pruefe pro Slot: steht etwas dazu in den Antworten?
- Wenn ja: Wert in den Slot eintragen, exakt wie genannt (Zahlen als Zahl, Listen als Array).
- Wenn nein: Slot weglassen — KEIN null, KEIN leerer String, KEIN leeres Array. Was du nicht ausgibst, bleibt unveraendert.
- Wenn der User mehrere Werte ueber mehrere Antworten hinweg liefert (z. B. Aktivitaeten in Antwort 3 und 7): kombiniere sie zu einem Array.
- Wenn ein Slot bereits gefuellt ist und im Verlauf keine widersprechende neue Info auftaucht: lasse den Slot weg (du brauchst ihn nicht zu wiederholen).
- Wenn der User einen vorher genannten Wert revidiert ("ach nein, doch 312 nicht 380"): ersetze den Slot mit dem neuen Wert.

## Halluzinations-Verbot
- Erfinde KEINE Zahlen, Namen, Daten, Bezirke, Kompetenz-Frameworks (KMK etc.).
- Wenn der User vage bleibt ("vielleicht 30 oder 40 Kinder"), trage NICHTS ein — Vagheit ist ein Signal an den Interviewer, nochmal nachzufragen.
- Wenn der User eine Schaetzung markiert ("gefuehlsmaessig", "glaube ich"): NICHT als Fakt extrahieren.
- Wenn der User explizit etwas verneint oder nicht weiss ("kenne ich nicht"): den Slot leer lassen.
- Eine Bezirksangabe nur uebernehmen, wenn der User selbst den Bezirk genannt hat. "Berlin" ist KEIN Hinweis auf einen bestimmten Bezirk.

## Subgruppe ist nicht Gesamtgruppe (haeufiger Fehler!)
NEGATIVBEISPIEL: User sagt "130 Kinder lernen in den Klassen 5 und 6". Das ist EINE TEILGRUPPE der Schule, NICHT die Gesamtschuelerzahl.
- FALSCH: schule.schuelerzahl = 130
- RICHTIG: schule.schuelerzahl bleibt leer; "130 Kinder in Klassen 5/6" gehoert in projekt.zielgruppe.

Generell: schule.schuelerzahl darf NUR gesetzt werden, wenn der User explizit eine GESAMTZAHL fuer die ganze Schule nennt (z. B. "wir haben 312 Schuelerinnen", "die Schule hat 480 Kinder"). Eine projektbezogene Teilzahl ("30 Kinder im Pilot", "die 60 Drittklaessler") gehoert NIE in schule.schuelerzahl.

Analog gilt: lehrer-Gesamtzahl vs. nur-Projekt-Lehrer; Klassenanzahl-Gesamt vs. nur-Klassen-im-Projekt. Im Zweifel: Slot leer lassen.

## Schema (genau diese Slots, alle optional)
{
  "schule": {
    "name": string,                          // exakt wie der User sie nennt
    "typ": string,                           // z. B. "Grundschule", "Gymnasium"
    "bundesland": string,                    // nur wenn explizit genannt
    "schuelerzahl": number,                  // GESAMTSCHUELERZAHL der Schule, nicht eine Subgruppe.
                                             // Wenn der User nur "130 Kinder in Klassen 5/6" sagt, ist
                                             // das KEINE Gesamtschuelerzahl — Slot leer lassen.
    "besonderheiten": string                 // freitext-Profil der Schule: alles, was sie konkret macht
                                             // ODER von einer Standard-Schule unterscheidet. Z. B. soziale
                                             // Zusammensetzung, vorhandene Infrastruktur (WLAN aus DP1,
                                             // 10 interaktive Whiteboards, 2 iPad-Koffer mit 16 Geraeten),
                                             // Standort-Besonderheiten (Bezirk wenn genannt, "geteilter
                                             // IT-Beauftragter mit 4 Reinickendorfer Schulen"), Lernplattformen
                                             // (Lernraum Berlin, itslearning), Ganztag, Zuegigkeit, etc.
                                             // Mehrere Punkte in einem Satz mit Komma trennen.
  },
  "projekt": {
    "titel": string,                         // wenn der User einen Titel/Namen nannte
    "kurzbeschreibung": string,              // 1–2 Saetze, was das Vorhaben tut
    "ziele": string[],                       // konkrete Ziele aus den Antworten
    "zielgruppe": string,                    // wen das Projekt erreicht
    "aktivitaeten": string[],                // konkrete Massnahmen
    "zeitraum": string                       // z. B. "Schuljahr 2026/27", "ab Sommer 2026"
  },
  "wirkung": {
    "erwartete_ergebnisse": string[],        // was nach Projektende anders ist
    "messbare_indikatoren": string[],        // KPIs/Messpunkte, die der User genannt hat
    "nachhaltigkeit": string                 // wie es nach Foerderende weiterlaeuft
  },
  "budget": {
    "beantragt_eur": number,                 // ohne Komma-Stellen, Euro-Wert
    "eigenmittel_eur": number,
    "hauptposten": string[]                  // Kostenpositionen, die der User genannt hat
  },
  "programmpassung": {
    "kriterien_adressiert": string[],        // wenn der User Programm-Kriterien explizit aufgegriffen hat
    "offene_luecken": string[]               // wenn der User selbst Luecken benannt hat
  }
}

## Ausgabe
AUSSCHLIESSLICH valides JSON, keine Markdown-Fences. Nur die Slots, die du gefuellt hast — leere Objekte/Arrays/Strings/null weglassen. Bei NICHTS gefunden: \`{}\`.`;

export function buildFactsExtractorUserPrompt(
  messages: WizardMessage[],
  currentFacts: WizardFacts
): string {
  const dialog = historyBlock(messages);
  return `INTERVIEW-VERLAUF (alle bisherigen Q/A in Reihenfolge):
${dialog}

BISHER STRUKTURIERT ERFASSTE FAKTEN (Stand vor diesem Lauf):
${JSON.stringify(currentFacts, null, 2)}

Extrahiere die Slots gemaess Schema. Nur was im Verlauf wirklich steht. Vagheit / Schaetzungen / "weiss ich nicht" → Slot weglassen.`;
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

## Was du NICHT machst
- Du extrahierst KEINE Fakten — eine separate Stage uebernimmt das. Fokussiere dich auf die Frage-Logik.
- Du befuellst KEINE Slots in der Fakten-Tabelle. Wenn du im JSON ein \`facts_update\` ausgibst, wird es als Fallback gemerged, ist aber nicht deine Hauptaufgabe.

## Antwortformat
AUSSCHLIESSLICH valides JSON (keine Markdown-Fences):
{
  "kind": "question" | "ready",
  "content": "Nächste Frage ODER 2-Satz-Zusammenfassung, wenn ready",
  "rationale": "Warum diese Frage jetzt (nur bei kind=question, max 1 Satz)"
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

const SECTION_SYSTEM_BASE = `Du bist ein erfahrener Antragsautor. Schreibe EINEN Abschnitt eines Förderantrags in präziser, überzeugender deutscher Antragsprosa.

## Halluzinations-Verbot (HART)
Du bekommst zusätzlich zu den FAKTEN die ROHEN USER-ANTWORTEN als Quellen-Anker. Du darfst AUSSCHLIESSLICH Tatsachen verwenden, die in den User-Antworten oder in den extrahierten Fakten stehen. Wenn etwas in keinem von beiden steht: NICHT in den Antrag aufnehmen. Lieber kürzer als erfunden.

NIEMALS in den Antragstext aufnehmen, wenn nicht im User-Input belegt:
- **Aktenzeichen, Geschäftszeichen, Beschluss-Nummern** (Az., G.Z., …) — Schulen geben fast nie welche an.
- **Tagesgenaue Datumsangaben** (Beschlüsse, Schreiben, Termine) — wenn User nur "demnächst" sagte, kein "12.03.2026" daraus machen.
- **Tarif-Stufen, Personalkosten-Berechnungen** ("TV-L E9a", "4h × 50 Wochen × 20 €/h") — nur wenn der User das selbst gerechnet hat.
- **Bezirks-/Behördennamen** über das hinaus, was der User nannte.
- **Phasen-Schemata mit Quartals- oder Monatsangaben** ("Phase 1: erste Monate 2026", "Q3/2026") — User-Verlauf liefert kaum solche Zeitleisten. Verwende stattdessen die vom User genannten Zeitpunkte direkt.
- **MDM-Lösung, Rahmenverträge, Stellenpläne** — generische Antrags-Versatzstücke. Erwähne nur, wenn der User selbst MDM/Rahmenvertrag/Stellenplan-Eintrag genannt hat.
- **Zitate aus Strategiedokumenten** (KMK-Strategie "Bildung in der digitalen Welt", Rahmenlehrplan, …) — wenn der User selbst sagte "kenne ich nicht", schreibe den Antrag NICHT so, als ob die Schule diese Strategie aktiv adressiert. Stattdessen: das Vorhaben adressiert "Medienkompetenz" / "kritischen Umgang mit Medien" (was der User selbst nannte).
- **Externe Anbieter, Hospitations-Pläne, Multiplikatoren-Programme** — nur, wenn der User sie nannte.
- **Konkrete Schüler-/Lehrerzahlen** über das hinaus, was im User-Input steht.

Wenn ein Pflicht-Abschnitt der Richtlinie eine Information verlangt, die im User-Input nicht steht, formuliere das ehrlich: "Eine schriftliche Zusage liegt noch nicht vor", "die genaue Verteilung wird im Rahmen der …-Konzept-Überarbeitung festgelegt". KEIN Erfinden.

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

export const SECTION_SYSTEM = PIPELINE_CONFIG.sharpPrompts
  ? `${SECTION_SYSTEM_BASE}\n\n${SHARP_HALLU_VERBOTS_BLOCK}`
  : SECTION_SYSTEM_BASE;

export function buildSectionPrompt(
  programm: Foerderprogramm,
  facts: WizardFacts,
  abschnitt: { name: string; fokus: string },
  titel: string,
  richtlinieAbschnitt?: AntragsAbschnitt,
  userAnswers?: string[],
  richtlinie?: Richtlinie | null
): string {
  const guidance = getGuidance((programm as any).foerdergeberTyp);
  const detailblock = richtlinieAbschnitt
    ? `\nOFFIZIELLE VORGABEN FUER DIESEN ABSCHNITT:\n${abschnittPrompt(richtlinieAbschnitt)}\n`
    : "";
  const userAnswersBlock = userAnswers?.length
    ? `\n\nROHE USER-ANTWORTEN (Quellen-Anker — alles im Antragstext muss sich hierauf oder auf die FAKTEN zurueckfuehren lassen):
${userAnswers.map((a, i) => `[Antwort ${i + 1}] ${a}`).join("\n\n")}`
    : "";

  const basePrompt = `PROGRAMM:
${programmBlock(programm)}

TONALITÄT FÜR DIESEN FÖRDERGEBER-TYP (${guidance.label}):
${guidance.sectionStyle}
${detailblock}
ANTRAGSTITEL: ${titel}

ABSCHNITT: ${abschnitt.name}
FOKUS: ${abschnitt.fokus}

FAKTEN:
${JSON.stringify(facts, null, 2)}${userAnswersBlock}

Schreibe den Abschnitt. Erfinde KEINE Aktenzeichen, Beschluss-Daten, Tarif-Berechnungen, Phasen-Quartale, MDM-Lösungen, Rahmenverträge oder Strategie-Zitate, die nicht im User-Input belegt sind. Lieber kürzer als erfunden.

KONKRETHEIT richtig: Deine Konkretheit speist sich aus den ECHTEN Angaben des Users (genannte Szenen, Namen, Zahlen, Beispiele) — greife genau diese als wiederkehrende, glaubwürdige Anker auf. Wo der User KEINE Angabe gemacht hat, hast du zwei erlaubte Optionen: (a) den Punkt weglassen/knapp halten, oder (b) einen sichtbaren Lücken-Marker \`[TODO: … vor Einreichung ergänzen]\` setzen. NICHT erlaubt: die Lücke mit erfundenen Konkreta füllen ODER mit nichtssagenden Floskeln überdecken. Eine vom User offen gelassene Frage ("weiß ich nicht", "müssten wir klären") darf NIE als feststehende Tatsache oder erteilte Zusage formuliert werden.

GELDBETRÄGE UND MENGEN IM TEXT: Jeden Euro-Betrag, jede Stückzahl und jeden Termin, den der User NICHT selbst genannt hat, kennzeichne im Fließtext sichtbar als Schätzung — z. B. "voraussichtlich rund 15.000 € (Schätzung, vor Einreichung durch Angebote zu belegen)" oder "ca. 25 Geräte (Anzahl noch festzulegen)". NIE als feststehende Kalkulation oder beschlossene Summe formulieren. Der Fließtext muss bei Zahlen genauso ehrlich sein wie der Finanzplan — keine Asymmetrie, bei der die Tabelle "Schätzung" sagt und der Text dieselbe Zahl als Fakt behauptet.`;

  // Hebel 3: Dossier-Injection (PIPELINE_USE_VORBILD_FORMULIERUNGEN)
  if (!PIPELINE_CONFIG.useVorbildFormulierungen || !richtlinie) {
    return basePrompt;
  }

  const abschnittId = richtlinieAbschnitt?.id;
  const vorbilder = (richtlinie.vorbildFormulierungen ?? []).filter(
    (v) => !abschnittId || v.abschnitt_id === abschnittId
  );
  const bestPractices = richtlinie.bestPractices ?? [];
  const rejectGruende = richtlinie.rejectGruende ?? [];

  if (vorbilder.length === 0 && bestPractices.length === 0 && rejectGruende.length === 0) {
    return basePrompt;
  }

  const injectionParts: string[] = [];
  if (vorbilder.length > 0) {
    injectionParts.push(`## Vorbild-Formulierungen fuer "${abschnitt.name}" (aus erfolgreichem Antrag, Stil-Inspiration)`);
    injectionParts.push(vorbilder.map((v) => `- "${v.formulierung}"${v.kontext ? ` [Kontext: ${v.kontext}]` : ""}`).join("\n"));
  }
  if (bestPractices.length > 0) {
    injectionParts.push(`\n## Best Practices erfolgreicher Antraege (Programm-spezifisch)`);
    injectionParts.push(bestPractices.slice(0, 3).map((b) => `- **${b.thema}:** ${b.was_funktionierte}${b.warum ? ` (${b.warum})` : ""}`).join("\n"));
  }
  if (rejectGruende.length > 0) {
    injectionParts.push(`\n## Vermeide diese Reject-Muster (aus echten Ablehnungen)`);
    injectionParts.push(rejectGruende.slice(0, 3).map((r) => `- ${r.grund}${r.vermeidung ? ` → ${r.vermeidung}` : ""}`).join("\n"));
  }

  const injectionBlock = injectionParts.join("\n");
  return `${basePrompt}\n\n${injectionBlock}`;
}

// ============================================================================
// CRITIQUE
// ============================================================================

const CRITIQUE_SYSTEM_BASE = `Du bist ein strenger Gutachter für Förderanträge. Dein Ziel: konkrete, umsetzbare Findings für die Revision — keine Allgemeinplätze, keine Wiederholung des Textes.

## ERSTE Pflicht-Prüfung — HALLUZINATIONS-AUDIT
Du bekommst zusätzlich zum ANTRAGSENTWURF die ROHEN USER-ANTWORTEN und die EXTRAHIERTEN FAKTEN. **Jede konkrete Tatsache im Entwurf MUSS sich auf User-Antworten ODER Fakten zurückführen lassen.** Wenn nicht: Halluzination, Schwere "hoch", Kategorie "belegluecke".

Verdächtige Halluzinations-Marker — bei JEDEM solchen Element prüfen, ob es im User-Input steht:
- **Aktenzeichen, Az., Geschäftszeichen** (z. B. "Az. 123/2026") — Schulen geben fast nie Aktenzeichen an. Wenn nicht im User-Input: ERFUNDEN.
- **Tagesgenaue Datumsangaben für Beschlüsse, Schreiben, Termine** ("Schreiben vom 15.03.2026", "Beschluss Schulkonferenz vom 12.12.2025") — wenn User nur "demnächst" oder "vor einigen Wochen" sagte: ERFUNDEN.
- **Präzise Prozentangaben** ("80 % der Lehrkräfte", "44 % Steigerung") — wenn nicht aus User-Input ableitbar: ERFUNDEN.
- **Konkrete Stundenzahlen, Stückzahlen, Geldbeträge mit Komma-Genauigkeit** — gegen User-Aussagen prüfen, oft hat User Spannweiten ("30 oder 40") oder Schätzungen ("vielleicht 5.000") gegeben, die nicht zu festen Zahlen werden dürfen.
- **Behörden-/Personennamen** (z. B. konkretes Bezirksamt, "Frau X aus Abteilung Y") — wenn User nur "der Träger" oder "das Schulamt" sagte: ERFUNDEN.
- **Bezirks-/Ortsangaben** — wenn User nur eine Stadt nannte, darf der Bezirk nicht erfunden werden.
- **Schülerzahlen, Klassengrößen, Lehrkräftezahlen** — exakte Zahlen müssen aus User-Antwort stammen.
- **Methodische Konkretisierungen** ("standardisiertes Beobachtungsraster", "monatliche Hospitationen", "TV-L E9a") — wenn User nichts dergleichen sagte: ERFUNDEN.
- **Zitate aus KMK-Strategie, Rahmenlehrplan, anderen Dokumenten** — wenn User selbst sagte "kenne ich nicht so genau": jede konkrete KMK-Verortung im Entwurf ist erfunden.
- **Einrichtungen, die User nicht erwähnte** ("Willkommensklassen", "Fachräume Naturwissenschaften") — wenn nicht im User-Input: ERFUNDEN.
- **Erhebungen/Studien/Belege** ("VERA-Vergleichsarbeiten zeigen…", "Bedarfsanalyse ergab…", "Sekretariatseinschätzung") — wenn der User keine Erhebung nannte: ERFUNDEN.
- **Marken-/Produkt-/App-Namen** (Anton, Bettermarks, "iPad 10. Generation", Antolin) — wenn User nur allgemein ("Lern-Apps", "Tablets") sprach: ERFUNDEN.
- **Externe Partner/Vereine/Honorarkräfte** (Medienpädagoge, Landschaftsbüro, Förderverein, Schulsozialarbeit, Stadtbibliothek-als-Partner) — wenn nicht vom User genannt: ERFUNDEN.
- **Pädagogische Methoden/Formate/Phasen-Zeitpläne** ("Dialogisches Vorlesen", "Pre/Post-Smiley-Skala", "4-Phasen-Plan", "monatliche Hospitationen") ohne User-Beleg: ERFUNDEN.
- **Zusagen mit Rechtsfolge als feststehend** ("ist als gemeinnützig anerkannt", "eigenes Bankkonto", "mündliche Zusage des Fördervereins", "Schulträger hat zugestimmt") — wenn nicht ausdrücklich vom User bestätigt: ERFUNDEN, Schwere "hoch" — Falschangabe ggü. dem Fördergeber.
- **Subgruppe→Gesamtzahl-Hochrechnung** ("ca. 150 Nutzer" aus "60 % von 250", feste Stückzahl aus einer Spanne "20-30"): wenn der User eine Spanne/Schätzung gab, ist die feste Zahl ERFUNDEN.

Zusätzlich Schwere "hoch": Stellen, an denen der Entwurf eine vom User offen gelassene Frage ("weiß ich nicht", "müssten wir klären") als feststehende Tatsache oder verbindliche Zusage formuliert (kaschierte Lücke).

## ZWEITE Prüfung — Richtlinien & Konsistenz
1. Richtlinien-Verstöße (fehlender Pflichtabschnitt, Stilverstoß, Zeichenlimit, Eigenanteil nicht adressiert).
2. Fehlende Bezüge auf offizielle Kriterien des Fördergebers.
3. Inkonsistenzen zwischen Abschnitten oder Antragstext × Finanzplan-Tabelle (Beträge!).
4. Antragstitel: muss vorhaben-übergreifender Titel sein, NICHT eine einzelne Aktivität.

## DRITTE Prüfung — Schwächen
5. Floskeln, Wiederholungen, unbelegte Behauptungen.
6. Schwache/generische Abschnitte — austauschbar klingende Passagen.
7. Fehlende Quantifizierungen, wo welche aus den User-Antworten ableitbar wären.
8. Typ-spezifische Schwächen (siehe Prüffokus im User-Prompt).

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
- **Mindestens 5 Findings, max 15.** Lieber zu viele als zu wenige — der Antrag durchläuft danach noch eine Revision.
- **Halluzinations-Findings sind IMMER "schwere: hoch", Kategorie "belegluecke".** Sie sind das wichtigste Output dieser Stufe.
- Zitat ist WÖRTLICH, keine Paraphrase.
- Keine Findings, die nur den Text loben.
- Wenn ein Abschnitt mehrere Halluzinationen enthält, liste sie als getrennte Findings (eines pro erfundener Tatsache).`;

export const CRITIQUE_SYSTEM = PIPELINE_CONFIG.sharpPrompts
  ? `${CRITIQUE_SYSTEM_BASE}\n\n${SHARP_HALLU_VERBOTS_BLOCK}`
  : CRITIQUE_SYSTEM_BASE;

export function buildCritiquePrompt(
  programm: Foerderprogramm,
  draft: string,
  richtlinie?: Richtlinie | null,
  userAnswers?: string[],
  facts?: WizardFacts
): string {
  const guidance = getGuidance((programm as any).foerdergeberTyp);
  const userInputBlock = (userAnswers?.length || facts)
    ? `

ROHE USER-ANTWORTEN (für Halluzinations-Audit):
${userAnswers?.length
  ? userAnswers.map((a, i) => `[Antwort ${i + 1}] ${a}`).join("\n\n")
  : "(keine Antworten übergeben)"}

EXTRAHIERTE FAKTEN (für Halluzinations-Audit):
${facts ? JSON.stringify(facts, null, 2) : "(keine Fakten übergeben)"}

WICHTIG: Jede konkrete Tatsache im ANTRAGSENTWURF muss sich auf die obigen USER-ANTWORTEN oder FAKTEN zurückführen lassen. Alles, was nur im Entwurf auftaucht, ist eine Halluzination — Schwere "hoch", Kategorie "belegluecke".`
    : "";
  return `PROGRAMM:
${programmBlock(programm)}

TYPSPEZIFISCHER PRÜFFOKUS (${guidance.label}):
${guidance.critiqueFocus}${extraGuidanceBlock(programm, "Gutachter")}${richtlinieBlock(richtlinie, "critique")}${userInputBlock}

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

## Halluzinations-Verbot (HART)
Du bekommst zusaetzlich zu den FAKTEN die ROHEN USER-ANTWORTEN als Quellen-Anker. Jede konkrete Zahl, Tarif-Stufe, Stundensatz oder Honorar-Hoehe muss sich auf den User-Input zurueckfuehren lassen. Wenn nicht: NICHT in den Finanzplan aufnehmen.

NIEMALS in Bezeichnung oder Begruendung erfinden:
- **Tarif-Stufen** (TV-L E9, EG10, A12, …) — wenn der User keine Eingruppierung nannte: weglassen.
- **Konkrete Honorar-/Stundensaetze** ("180 EUR Honorar", "60 EUR/Std", "75 EUR Vertretungskosten") — nur wenn der User selbst Saetze nannte. Sonst: in "hinweise" notieren, dass Saetze noch einzuholen sind, und Posten als Pauschale ohne erfundene Splittung anlegen.
- **Marken-/Modellnamen** ("Apple Pencil", "Microsoft Surface") — wenn der User nur "Stifte" oder "Tablets" sagte: nicht spezifizieren.
- **Erfundene Mengen-Aufschluesselungen** ("16 pro Klasse", "2 Lehrkraefte freigestellt") — nur wenn der User konkrete Mengen genannt hat.
- **Bildungsrabatt-Annahmen** ("ca. 90 EUR in Bildungstarifen plus Versand") — wenn der User nur einen Endpreis nannte: diesen verwenden.
- **Erfundene Personal-/Partner-Posten, die der User-Aussage widersprechen** — sagte der User z. B. "macht eine Kollegin nebenher / nicht offiziell", darf daraus KEIN bezahlter Personalposten werden. Sagte er "erstmal nur die Lehrkraefte", keine externe Honorarkraft erfinden.

## Schaetz-Ehrlichkeit (HART — wichtigster Punkt bei vagem Input)
Ein Finanzplan MUSS Betraege enthalten — aber er darf erfundene Betraege nicht als belegte Kalkulation tarnen.
- Hat der User fuer einen Posten KEINEN Betrag/Preis/keine Menge genannt, ist der Betrag eine **Schaetzung**. Beginne die \`begruendung\` solcher Posten dann mit dem Wort **"Schaetzung:"** (z. B. "Schaetzung: Klassensatz Tablets, ueblicher Geraetepreis, Stueckzahl noch festzulegen").
- Schaetzbetraege: konservativ und **rund** halten (z. B. 3.000, nicht 3.140). Keine erfundene Splittung ("25 × 540 EUR"), wenn der User die Menge nicht nannte — dann eine ehrliche Pauschale.
- Hat der User INSGESAMT keine einzige Geldangabe gemacht, setze in \`hinweise\` als ERSTEN Eintrag: "Alle Betraege sind grobe Schaetzungen ohne Angaben der Schule — vor Einreichung durch Angebote belegen."
- Erfinde keine Posten fuer Leistungen, die der User nicht erwaehnt hat, nur um den Plan "vollstaendig" wirken zu lassen.

## Konsistenz (HART — der Plan muss sachlich aufgehen)
- Die Summe aller Posten muss rechnerisch stimmen. Hat der User eine Gesamt-/Globalsumme genannt, MUESSEN die Foerderposten (ohne Eigenanteil) in der Summe dieser Zahl entsprechen (±2 %) — du gestaltest die genannte Globalsumme aus, du erfindest keine hoehere. Hat der User KEINE Summe genannt, waehle plausible, runde Einzelbetraege und nenne die Gesamtsumme stimmig.
- Erfinde keinen Posten, der einer Nutzeraussage WIDERSPRICHT (sagte der User "machen wir selbst" / "Lehrkraefte nebenher", KEINE bezahlte Personal-/Honorarstelle dafuer). Solche widerspruechlichen Posten gehoeren NICHT in den Plan.
- Ergaenzende Posten, die der User NICHT genannt hat, aber die fuer ein gutes Vorhaben sinnvoll sind, sind als Vorschlag ERLAUBT (begruendung mit "Schaetzung:" beginnen) — sie werden dem Nutzer als bestaetigbarer Vorschlag angezeigt.

## Regeln
- Nutze NUR Kostenkategorien und Obergrenzen, die in der mitgelieferten Richtlinie als foerderfaehig markiert sind.
- Beziehe dich auf die tatsaechlich genannten Projektinhalte (Fakten) — keine generischen Posten wie "diverses Material".
- Jede Position muss eine kurze Begruendung haben: warum dieser Posten, wie kommt der Betrag zustande (z. B. "15 Tablets à 450 EUR" — wenn der User 450 EUR genannt hat).
- Wenn die Richtlinie einen Eigenanteil vorschreibt, fuege eigens markierte Posten hinzu, die diesen Eigenanteil abdecken (eigenanteil: true). Eigenanteil darf nicht aus anderen oeffentlichen Foerdermitteln kommen.
- Halte dich an plausible Einzelbetraege. KEINE suspekt runden Millionenbetraege.
- Wenn kritische Info fehlt, nenne das in "hinweise" (z. B. "Schuelerzahl unklar, Tablet-Anzahl geschaetzt", "Honorar-Saetze nicht vom User genannt — Pauschale geschaetzt").

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
  richtlinie: Richtlinie | null | undefined,
  userAnswers?: string[]
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
  const userAnswersBlock = userAnswers?.length
    ? `\n\nROHE USER-ANTWORTEN (Quellen-Anker fuer Betraege/Mengen/Tarife):
${userAnswers.map((a, i) => `[Antwort ${i + 1}] ${a}`).join("\n\n")}`
    : "";

  return `PROGRAMM:
${programmBlock(programm)}
${rlBlock}

PROJEKTFAKTEN:
${JSON.stringify(facts, null, 2)}${userAnswersBlock}

Erstelle den Finanzplan. Erfinde keine Tarif-Stufen, Honorarsaetze, Marken-/Modellnamen oder Mengen-Aufschluesselungen, die nicht im User-Input belegt sind. Lieber Pauschalen mit "in hinweise erlaeutert" als erfundene Splittungen.`;
}

// ============================================================================
// FINANZPLAN — UNBEZIFFERTER KOSTENRAHMEN (kein Nutzer-Budget vorhanden)
// Probe 09.06.: Wenn der Nutzer KEINE Betraege/Preise genannt hat, werden bewusst
// KEINE erfundenen Euro-Posten erzeugt. Stattdessen eine beschreibende Liste der
// voraussichtlich noetigen Kostenpositionen OHNE Zahlen.
// ============================================================================

export const FINANZPLAN_KOSTENRAHMEN_SYSTEM = `Du erstellst einen UNBEZIFFERTEN Kostenrahmen fuer einen Foerderantrag an einer deutschen Schule.

WICHTIG: Der Nutzer hat KEINE Betraege, Preise, Stueckpreise oder ein Budget genannt. Du darfst deshalb KEINE Euro-Betraege erfinden — auch keine "geschaetzten". Liste stattdessen die voraussichtlich noetigen Kostenpositionen, abgeleitet aus den tatsaechlich genannten Projektinhalten.

Regeln:
- Jede Position = EIN kurzer, konkreter Satz, der beschreibt, WOFUER Kosten entstehen (z. B. "Anschaffung von Tablets fuer den Klasseneinsatz" oder "Honorar fuer eine externe Fortbildung zur Mediendidaktik"). KEINE Zahl, kein Euro-Betrag, keine Stueckzahl-Hochrechnung.
- Nur Positionen, die sich aus den genannten Inhalten ergeben. Nichts erfinden, was der Nutzer nicht erwaehnt hat.
- 3-7 Positionen. Wenn die Richtlinie einen Eigenanteil verlangt, eine Position "Eigenanteil des Schultraegers (Hoehe noch zu klaeren)" ergaenzen.
- Keine Marken-/Modellnamen, keine erfundenen Partner.

Ausgabe AUSSCHLIESSLICH valides JSON, keine Fences:
{
  "kostenrahmen": ["Position 1 ...", "Position 2 ..."],
  "hinweise": ["optional, z. B. 'Konkrete Betraege werden ueber Angebote vor Einreichung ermittelt.'"]
}`;

export function buildFinanzplanKostenrahmenPrompt(
  programm: Foerderprogramm,
  facts: WizardFacts,
  richtlinie: Richtlinie | null | undefined,
  userAnswers?: string[]
): string {
  const rl = richtlinie
    ? `\n\nFOERDERFAEHIGE KOSTENARTEN (Richtlinie):\n${JSON.stringify(richtlinie.kostenpositionen ?? null)}\nEigenmittel-Pflicht: ${richtlinie.eigenmittel?.pflicht ? "ja" : "nein"}`
    : "";
  const ua = userAnswers?.length
    ? `\n\nROHE USER-ANTWORTEN (Quelle fuer die Positionen):\n${userAnswers.map((a, i) => `[Antwort ${i + 1}] ${a}`).join("\n")}`
    : "";
  return `PROGRAMM:
${programmBlock(programm)}${rl}

PROJEKTFAKTEN:
${JSON.stringify(facts, null, 2)}${ua}

Der Nutzer hat keine Kostenangaben gemacht. Erstelle einen unbezifferten Kostenrahmen (Positionen OHNE Euro-Betraege) gemaess Schema.`;
}

/**
 * Entfernt unbelegte Euro-Betraege aus dem Antragstext, wenn der Finanzplan
 * unbeziffert ist — beseitigt die "Ehrlichkeits-Asymmetrie" (Text nennt Zahlen
 * als Fakt, Finanzplan hat keine).
 */
export const KOSTEN_ENTZIFFERUNG_SYSTEM = `Du ueberarbeitest einen fertigen Foerderantrag MINIMAL. Hintergrund: Es liegt noch KEINE Kostenbasis vor — der Finanzplan ist unbeziffert. Im Antragstext duerfen deshalb KEINE konkreten Euro-Betraege oder daraus abgeleitete Rechnungen stehen, die der Nutzer nicht belegt hat.

Aufgabe:
- Entferne jeden konkreten Euro-Betrag (z. B. "15.000 EUR", "ca. 500 € pro Geraet", "Gesamtkosten von 30.000 Euro") und ersetze ihn durch eine ehrliche Formulierung wie "die genauen Kosten werden im Finanzplan beziffert (Angebote werden vor Einreichung eingeholt)" oder lass den Halbsatz einfach weg.
- Konkrete MENGEN/Sachbedarf, die der Nutzer selbst nannte, duerfen bleiben (z. B. "rund 20 Tablets"), aber OHNE erfundenen Preis.
- Aendere NICHTS an Struktur, Titel, Abschnittsreihenfolge oder am uebrigen Inhalt. Keine neuen Inhalte.

Ausgabe: NUR der ueberarbeitete Antragstext als Markdown (H1-Titel, H2-Abschnitte), keine Kommentare davor/danach.`;

export function buildKostenEntzifferungPrompt(finalText: string): string {
  return `ANTRAGSTEXT (zu bereinigen — nur Euro-Betraege entschaerfen):\n\n${finalText}`;
}

const REVISION_SYSTEM_BASE = `Du bist der Antragsautor. Überarbeite den Entwurf anhand des Gutachtens. Struktur, Titel und Abschnittsreihenfolge bleiben erhalten. Verwende NUR die mitgelieferten Fakten. Füge keine neuen Behauptungen oder Zahlen ein.

## Ehrlichkeit bewahren — niemals verschlimmern (WICHTIG)
- Die Revision darf NIEMALS neue konkrete Fakten, Partner, Zahlen, Methoden, Termine oder Zusagen einführen, die nicht im Entwurf oder in den Fakten stehen. Ein Halluzinations-Finding behebt man durch STREICHEN oder durch einen ehrlichen Lücken-Marker — nicht durch eine andere Erfindung.
- Vorhandene ehrliche Lücken-Marker und Vorbehalte ("liegt derzeit nicht vor", "noch einzuholen", "[TODO: …]", "ist noch zu klären") BLEIBEN erhalten. Wandle eine offene Frage NIE in eine feststehende Tatsache oder verbindliche Zusage um (z. B. aus "Schulträger muss noch zustimmen" darf NICHT "Schulträger hat zugestimmt" werden).
- Wenn der User etwas verneint oder offen gelassen hat, formuliere es als noch zu klärenden Schritt — nicht als erledigt.
- Geldbeträge, Stückzahlen und Termine, die nicht vom User stammen, müssen auch im Fließtext als Schätzung/Vorbehalt erscheinen ("voraussichtlich ca. …, noch zu belegen") — NIE als feststehende Kalkulation. Wenn der Finanzplan einen Betrag als Schätzung führt, darf der Text dieselbe Zahl nicht als Fakt behaupten (keine Ehrlichkeits-Asymmetrie).

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

export const REVISION_SYSTEM = PIPELINE_CONFIG.sharpPrompts
  ? `${REVISION_SYSTEM_BASE}\n\n${SHARP_HALLU_VERBOTS_BLOCK}`
  : REVISION_SYSTEM_BASE;

// ============================================================================
// CONSISTENCY (Antragstext × Finanzplan)
// ============================================================================

export const CONSISTENCY_SYSTEM = `Du prüfst, ob der Antragstext und der Finanzplan inhaltlich zusammenpassen. Du bist kein Lektor — du suchst nur echte Mismatches zwischen den beiden.

## Was ein Issue ist
- "posten-ohne-textbezug": Ein Finanzposten taucht im Antrag nicht auf — weder direkt benannt noch sinngemäß in der passenden Sektion beschrieben.
- "textbezug-ohne-posten": Der Antragstext nennt eine konkrete Kostenart (Geräte, Honorare, Fortbildungen, Fahrten), ohne dass es im Finanzplan einen entsprechenden Posten gibt.
- "betrag-unstimmig": Im Antrag genannte Zahlen/Größen widersprechen den Beträgen im Finanzplan (z. B. "15 Tablets à 500 €" im Text, aber Finanzplan hat 20 × 400 €). DAZU GEHÖRT AUSDRÜCKLICH die Gesamtsumme: Nennt der Antragstext eine Gesamt-/Projektsumme oder beantragte Fördersumme, die deutlich (>20 %) von der Summe der Finanzplan-Posten abweicht, ist das ein "betrag-unstimmig"-Issue mit Schwere-Bezug auf beide Zahlen. Rechne die Posten-Summe und vergleiche sie mit jeder im Text genannten Gesamtsumme.
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
// CONSISTENCY-REVISION (Antragstext an Finanzplan angleichen, QA-01/03)
// ============================================================================

export const CONSISTENCY_REVISION_SYSTEM = `Du erhältst einen fertigen Förderantrag, den zugehörigen Finanzplan (strukturiertes JSON) und eine Liste konkreter Inkonsistenzen zwischen beiden. Deine Aufgabe: den ANTRAGSTEXT minimal so überarbeiten, dass er zum Finanzplan passt.

## Grundregel
Der FINANZPLAN ist die verbindliche Quelle für alle Beträge, Mengen und Posten. Ändere NIEMALS den Finanzplan — passe ausschließlich den Text an den Finanzplan an.

## Pro Inkonsistenz-Art
- "betrag-unstimmig": Korrigiere die im Text genannten Zahlen/Summen/Mengen exakt auf die Werte im Finanzplan. Achte besonders auf Gesamtsummen — sie müssen der Summe der Finanzplan-Posten entsprechen.
- "textbezug-ohne-posten": Entferne oder relativiere die im Text genannte Kostenart, für die es keinen Finanzposten gibt. Erfinde KEINEN neuen Posten und keine Zahl dafür.
- "posten-ohne-textbezug": Ergänze im inhaltlich passenden Abschnitt einen knappen, sachlichen Satz, der den Finanzposten aufgreift — ohne erfundene Details.
- "sonstiges": Löse den beschriebenen Widerspruch zugunsten des Finanzplans auf.

## Verbote
- Erfinde KEINE neuen Zahlen, Tarife, Mengen oder Posten, die nicht im Finanzplan stehen.
- Ändere nur, was zur Auflösung der gelisteten Inkonsistenzen nötig ist. Stil, Struktur, Überschriften und alle bereits konsistenten Inhalte bleiben unverändert.

## Ausgabeformat (Markdown)
- Antragstitel als erste Zeile als H1: "# Titel"
- Abschnittsüberschriften als H2: "## Abschnittsname"
- Absätze durch Leerzeilen getrennt, KEINE HTML-Tags, KEINE Code-Fences
Gib nur den überarbeiteten Antrag aus — keinerlei Kommentare davor oder danach.`;

export function buildConsistencyRevisionPrompt(
  finalText: string,
  finanzplanJson: string,
  issues: ConsistencyIssue[]
): string {
  const issueList = issues
    .map((i, n) => {
      const posten = i.posten ? ` (Posten: ${i.posten})` : "";
      const stelle = i.textstelle ? ` (Textstelle: "${i.textstelle}")` : "";
      return `${n + 1}. [${i.art}] ${i.beschreibung}${posten}${stelle}`;
    })
    .join("\n");

  return `ANTRAGSTEXT (aktuelle Fassung):
${finalText}

FINANZPLAN (JSON — verbindliche Quelle für alle Beträge):
${finanzplanJson}

GEFUNDENE INKONSISTENZEN:
${issueList}

Überarbeite den Antragstext minimal so, dass alle gelisteten Inkonsistenzen aufgelöst sind und Text und Finanzplan zusammenpassen. Gib nur den überarbeiteten Antrag aus.`;
}

// ============================================================================
// HALLUZINATIONS-DIFF-GATE (Probe 09.06., Hebel 1 — nach der Revision)
// ============================================================================

export const HALLUCINATION_GATE_SYSTEM = `Du überarbeitest einen fertigen Förderantrag CHIRURGISCH. In der letzten Überarbeitung sind konkrete Angaben in den Text geraten, die NICHT aus den Quellen (Nutzerangaben oder vorheriger Entwurf) stammen — sie wurden also frei erfunden. Du bekommst eine Liste genau dieser Angaben.

## Aufgabe
Entferne oder entschärfe AUSSCHLIESSLICH die gelisteten Angaben. Lass den restlichen Text Wort für Wort unverändert.

- Erfundene Geldbeträge / Mengen / Prozentzahlen: streiche die Zahl oder ersetze sie durch eine ehrliche Formulierung ("die genaue Höhe wird im Finanzplan beziffert", "Anzahl wird vor Einreichung festgelegt", "in noch zu bestimmender Höhe"). Erfinde KEINE Ersatzzahl.
- Erfundene Partner, Organisationen, Vereine (z. B. mit "e.V."/"gGmbH") oder Personen: streiche den Namen oder formuliere ihn als noch zu gewinnenden, unbenannten Partner ("eine noch zu gewinnende Kooperationspartnerin", "ein externer Anbieter, der noch ausgewählt wird"). Behaupte KEINE konkrete Zusage.
- Eine erfundene Angabe behebt man durch Streichen oder einen ehrlichen Lücken-Marker — NIEMALS durch eine andere Erfindung.

## Strikte Grenzen
- Ändere NICHTS an Struktur, Titel, Abschnittsreihenfolge, Stil oder an Angaben, die nicht in der Liste stehen.
- Erzeuge keine neuen Inhalte, keine neuen Zahlen, keine neuen Namen.

## Ausgabeformat (Markdown)
- Antragstitel als H1 ("# Titel"), Abschnitte als H2 ("## Abschnittsname"), Absätze durch Leerzeilen getrennt.
- KEINE HTML-Tags, KEINE Code-Fences.
Gib NUR den bereinigten Antragstext aus — keinerlei Kommentare davor oder danach.`;

export function buildHallucinationGatePrompt(
  finalText: string,
  introduced: { numbers: string[]; entities: string[] }
): string {
  const numList = introduced.numbers.length
    ? introduced.numbers.map((n) => `- ${n}`).join("\n")
    : "- (keine)";
  const entList = introduced.entities.length
    ? introduced.entities.map((e) => `- ${e}`).join("\n")
    : "- (keine)";

  return `ERFUNDENE ANGABEN (in der letzten Überarbeitung neu hinzugekommen, durch KEINE Quelle gedeckt — diese bereinigen):

Zahlen / Beträge / Mengen:
${numList}

Eigennamen / Partner / Personen:
${entList}

ANTRAGSTEXT (chirurgisch bereinigen — nur die gelisteten Angaben anfassen):

${finalText}`;
}

// ============================================================================
// FAKT-VERIFIKATIONS-PASS (Probe 09.06., Hebel 1b — nach dem Zahlen-Gate)
// Das deterministische Halluzinations-Gate faengt nur Zahlen/Eigennamen. Dieser
// LLM-Pass prueft NARRATIVE, pruefbare Behauptungen (Partner, Termine, Zusagen,
// Mengen, Kanaele, Verfahren) gegen die Nutzer-Ground-Truth — bewusst OHNE den
// Entwurf, damit auch im Section-Schritt erfundene Fakten erfasst werden.
// ============================================================================

export const FACT_VERIFICATION_DETECT_SYSTEM = `Du bist ein strenger Faktenpruefer fuer Foerderantraege. Du bekommst einen fertigen Antragstext, die GESICHERTEN Nutzerangaben (Ground Truth) und den Programm-Kontext. Deine einzige Aufgabe: konkrete, UEBERPRUEFBARE Tatsachenbehauptungen im Antrag finden, die NICHT durch die Nutzerangaben gedeckt sind — also vom Schreibmodell frei erfunden wurden.

## Was du flaggst (nur SPEZIFISCHE, NACHPRUEFBARE Behauptungen ueber DIESE Schule/dieses Projekt)
- PARTNER: ein benannter externer Partner/Verein/Betrieb/Person und dessen Rolle ("die Stadtbuecherei stellt Raeume", "in Kooperation mit dem oertlichen Sportverein"), den der Nutzer nicht genannt hat.
- TERMIN: ein konkretes Datum, ein Zeitplan oder Meilensteinplan ("ab September 2026", "in der dreimonatigen Pilotphase", "Auftaktveranstaltung im Oktober"), der nicht aus den Nutzerangaben stammt.
- ZUSAGE: eine feststehende Zusage/Genehmigung Dritter ("der Schultraeger hat zugestimmt", "die Eltern beteiligen sich"), die der Nutzer nicht bestaetigt hat.
- MENGE: eine konkrete Stueckzahl/Reichweite/Frequenz ("alle 12 Klassen", "woechentlich", "120 teilnehmende Kinder"), die nicht in den Nutzerangaben steht.
- KANAL: ein konkreter Verbreitungs-/Dokumentationsweg ("Verbreitung ueber den Schul-Newsletter und die Lokalpresse"), den der Nutzer nicht genannt hat.
- VERFAHREN: ein konkretes Verfahren/eine Methode als feststehend dargestellt, das der Nutzer nicht beschrieben hat.

## Was du NIEMALS flaggst
- Allgemeine Aussagen ueber das Thema, den Foerderzweck oder paedagogischen Wert ("digitale Kompetenzen sind fuer die Teilhabe wichtig") — das ist legitime Rahmung, keine Tatsachenbehauptung.
- Eine sinngemaesse Wiedergabe oder nachvollziehbare Ausgestaltung der vom Nutzer selbst genannten Projektidee.
- Bereits EHRLICH MARKIERTE Luecken/Vorbehalte ("noch zu klaeren", "[TODO: …]", "liegt derzeit nicht vor", "noch einzuholen", "voraussichtlich", "wird vor Einreichung festgelegt") — die sind erwuenscht und bleiben unangetastet.
- Angaben, die in der Ground Truth oder im Programm-Kontext stehen.
- Reine Zahlen/Eigennamen ohne Tatsachen-Charakter (die deckt ein anderer Pruefschritt ab).

## Ausgabe
AUSSCHLIESSLICH valides JSON, keine Markdown-Fences:
{
  "claims": [
    {
      "zitat": "woertliches Kurzzitat aus dem Antrag (max 120 Zeichen, exakt wie im Text)",
      "art": "partner" | "termin" | "zusage" | "menge" | "kanal" | "verfahren" | "sonstiges",
      "warum": "1 Satz: warum diese Behauptung durch die Nutzerangaben nicht gedeckt ist"
    }
  ]
}

Regeln
- "claims": [] ist eine voellig gueltige und HAEUFIGE Antwort. Im Zweifel NICHT flaggen — lieber eine echte Erfindung uebersehen als legitimen Inhalt zerstoeren.
- Das "zitat" MUSS woertlich (Zeichen fuer Zeichen) im Antragstext vorkommen, sonst wird es verworfen.
- Maximal 8 Eintraege, die gravierendsten zuerst.`;

export function buildFactVerificationDetectPrompt(
  finalText: string,
  groundTruth: string,
  programmKontext: string
): string {
  return `GESICHERTE NUTZERANGABEN (Ground Truth — nur was hier steht, gilt als belegt):
${groundTruth || "(keine strukturierten Angaben)"}

PROGRAMM-KONTEXT (legitime Rahmung, KEINE flagbare Erfindung):
${programmKontext}

ANTRAGSTEXT (auf erfundene, nicht gedeckte Tatsachenbehauptungen pruefen):
${finalText}

Liefere die claims-Liste.`;
}

export const FACT_VERIFICATION_REPAIR_SYSTEM = `Du ueberarbeitest einen fertigen Foerderantrag CHIRURGISCH. Ein Faktenpruefer hat konkrete Behauptungen markiert, die NICHT durch die Nutzerangaben gedeckt sind — sie wurden frei erfunden. Du bekommst genau diese Stellen.

## Aufgabe
Entschaerfe AUSSCHLIESSLICH die gelisteten Behauptungen. Lass den restlichen Text Wort fuer Wort unveraendert.
- Wandle jede markierte Behauptung in einen ehrlichen, offenen Punkt um, statt sie als feststehende Tatsache zu behaupten:
  - erfundener Partner → "ein noch zu gewinnender Kooperationspartner" / "noch zu klaeren".
  - erfundener Termin/Zeitplan → "der genaue Zeitplan wird vor Einreichung festgelegt".
  - erfundene Zusage Dritter → "die Zustimmung von … ist noch einzuholen".
  - erfundene Menge/Reichweite/Frequenz → "in noch zu bestimmendem Umfang".
  - erfundener Kanal/Verfahren → "die Form der Verbreitung/Umsetzung wird noch festgelegt".
- Eine erfundene Angabe behebt man durch Streichen oder einen ehrlichen Luecken-Marker — NIEMALS durch eine andere Erfindung. Erfinde keine Ersatz-Fakten, -Namen, -Zahlen oder -Termine.
- Schon vorhandene ehrliche Luecken-Marker bleiben unveraendert.

## Strikte Grenzen
- Aendere NICHTS an Struktur, Titel, Abschnittsreihenfolge, Stil oder an Angaben, die nicht markiert sind.

## Ausgabeformat (Markdown)
- Antragstitel als H1 ("# Titel"), Abschnitte als H2 ("## Abschnittsname"), Absaetze durch Leerzeilen getrennt.
- KEINE HTML-Tags, KEINE Code-Fences.
Gib NUR den bereinigten Antragstext aus — keinerlei Kommentare davor oder danach.`;

export function buildFactVerificationRepairPrompt(
  finalText: string,
  claims: Array<{ zitat: string; art: string; warum: string }>
): string {
  const list = claims.length
    ? claims.map((c, i) => `${i + 1}. [${c.art}] "${c.zitat}" — ${c.warum}`).join("\n")
    : "- (keine)";
  return `ERFUNDENE BEHAUPTUNGEN (durch keine Nutzerangabe gedeckt — diese entschaerfen):
${list}

ANTRAGSTEXT (chirurgisch bereinigen — nur die gelisteten Stellen anfassen):

${finalText}`;
}

// ============================================================================
// RECHECK (nach Revision: wurden die Findings tatsächlich adressiert?)
// ============================================================================

const RECHECK_SYSTEM_BASE = `Du prüfst, ob ein überarbeiteter Förderantrag die zuvor gefundenen Findings wirklich adressiert hat. Du urteilst pro Finding, nicht über den Text insgesamt.

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

export const RECHECK_SYSTEM = PIPELINE_CONFIG.sharpPrompts
  ? `${RECHECK_SYSTEM_BASE}\n\n${SHARP_HALLU_VERBOTS_BLOCK}\n\n${RECHECK_AUDIT_BLOCK}`
  : RECHECK_SYSTEM_BASE;

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
  const basePrompt = `PROGRAMM:
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

  // Hebel 3: Dossier-Injection fuer Revision (Stil-Inspiration, nicht 1:1-Kopieren)
  if (!PIPELINE_CONFIG.useVorbildFormulierungen || !richtlinie) {
    return basePrompt;
  }

  const vorbilder = richtlinie.vorbildFormulierungen ?? [];
  const bestPractices = richtlinie.bestPractices ?? [];
  const rejectGruende = richtlinie.rejectGruende ?? [];

  if (vorbilder.length === 0 && bestPractices.length === 0 && rejectGruende.length === 0) {
    return basePrompt;
  }

  const injectionParts: string[] = [];
  if (vorbilder.length > 0) {
    injectionParts.push(`## Vorbild-Formulierungen als Stil-Inspiration (NICHT 1:1 kopieren — sinngemass adaptieren)`);
    injectionParts.push(vorbilder.map((v) => `- "${v.formulierung}"${v.kontext ? ` [Kontext: ${v.kontext}]` : ""}`).join("\n"));
  }
  if (bestPractices.length > 0) {
    injectionParts.push(`\n## Best Practices (pruefe, ob die Revision diese Qualitaetsmerkmale aufweist)`);
    injectionParts.push(bestPractices.slice(0, 3).map((b) => `- **${b.thema}:** ${b.was_funktionierte}`).join("\n"));
  }
  if (rejectGruende.length > 0) {
    injectionParts.push(`\n## Reject-Muster (stelle sicher, dass diese im revidierten Antrag NICHT vorkommen)`);
    injectionParts.push(rejectGruende.slice(0, 3).map((r) => `- ${r.grund}${r.vermeidung ? ` → ${r.vermeidung}` : ""}`).join("\n"));
  }

  const injectionBlock = injectionParts.join("\n");
  return `${basePrompt}\n\n${injectionBlock}`;
}
