/**
 * Generischer Outline-Fallback fuer den no-Richtlinie-Pfad in der Pipeline.
 *
 * Wird verwendet, wenn der LLM-Outline-Aufruf fehlschlaegt (z. B. Gemini-429).
 * Liefert eine 7-Abschnitt-Standardstruktur, die fuer nahezu jeden
 * Foerderantrag passt. Schlechter als ein KI-generierter, programm-spezifischer
 * Outline — aber funktional. Die Section-Generierung im naechsten Pipeline-
 * Schritt nutzt jeden Abschnitt einzeln und kann unabhaengig fehlschlagen.
 */

import type { GenerationArtefacts, WizardFacts } from "./types";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { buildFallbackTitle } from "./title-fallback";

type Outline = NonNullable<GenerationArtefacts["outline"]>;

const STANDARD_ABSCHNITTE: Outline["abschnitte"] = [
  {
    name: "Antragsteller und Schule",
    fokus: "Stellt Schule, Traeger und antragstellende Stelle vor — Profil, Standort, Schuelerzahl, relevante Vorerfahrungen.",
  },
  {
    name: "Vorhaben und Anliegen",
    fokus: "Beschreibt das konkrete Projekt: Was soll umgesetzt werden, was ist der Anlass, welche Frage steht im Zentrum.",
  },
  {
    name: "Bedarfsbegruendung",
    fokus: "Belegt den Bedarf an der Massnahme — Status quo, identifizierte Luecke, warum gerade jetzt, warum mit dieser Foerderung.",
  },
  {
    name: "Zielgruppe und Beteiligte",
    fokus: "Definiert die Schueler, Lehrkraefte, externen Partner — Anzahl, Charakteristika, Auswahlkriterien, geplante Rollen.",
  },
  {
    name: "Massnahmen und Zeitplan",
    fokus: "Listet die konkreten Aktivitaeten in Reihenfolge mit Meilensteinen und Verantwortlichkeiten.",
  },
  {
    name: "Erwartete Wirkung und Nachhaltigkeit",
    fokus: "Beschreibt, was sich durch das Projekt aendern soll, woran man Erfolg misst, und wie das Ergebnis nach Foerderende fortbesteht.",
  },
  {
    name: "Finanzierung und Eigenanteil",
    fokus: "Fasst Kostenstruktur, beantragte Foerdersumme und Eigenanteil zusammen. Verweist auf detaillierten Finanzplan.",
  },
];

export function buildFallbackOutline(
  programm: Pick<Foerderprogramm, "name">,
  facts: WizardFacts
): Outline {
  return {
    titel: buildFallbackTitle(programm, facts),
    abschnitte: STANDARD_ABSCHNITTE.map((a) => ({ name: a.name, fokus: a.fokus })),
  };
}
