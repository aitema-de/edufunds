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
    fokus: "Stellt Schule, Träger und antragstellende Stelle vor — Profil, Standort, Schülerzahl, relevante Vorerfahrungen.",
  },
  {
    name: "Vorhaben und Anliegen",
    fokus: "Beschreibt das konkrete Projekt: Was soll umgesetzt werden, was ist der Anlass, welche Frage steht im Zentrum.",
  },
  {
    name: "Bedarfsbegruendung",
    fokus: "Belegt den Bedarf an der Maßnahme — Status quo, identifizierte Lücke, warum gerade jetzt, warum mit dieser Förderung.",
  },
  {
    name: "Zielgruppe und Beteiligte",
    fokus: "Definiert die Schüler, Lehrkräfte, externen Partner — Anzahl, Charakteristika, Auswahlkriterien, geplante Rollen.",
  },
  {
    name: "Maßnahmen und Zeitplan",
    fokus: "Listet die konkreten Aktivitäten in Reihenfolge mit Meilensteinen und Verantwortlichkeiten.",
  },
  {
    name: "Erwartete Wirkung und Nachhaltigkeit",
    fokus: "Beschreibt, was sich durch das Projekt ändern soll, woran man Erfolg misst, und wie das Ergebnis nach Förderende fortbesteht.",
  },
  {
    name: "Finanzierung und Eigenanteil",
    fokus: "Fasst Kostenstruktur, beantragte Fördersumme und Eigenanteil zusammen. Verweist auf detaillierten Finanzplan.",
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
