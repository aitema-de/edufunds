/**
 * Uebergibt den Matching-Kontext (Anliegen + Schul-Profil) an den Wizard.
 * Der Wizard liest das beim Mount und uebernimmt es als seedFacts, sodass
 * die KI nicht mehr nach dem Anliegen fragt.
 *
 * Verwendet localStorage statt sessionStorage: sessionStorage ist tab-gebunden
 * und in Safari beim Navigieren zwischen Seiten unzuverlaessig — der Handoff
 * (und damit das eingegebene Anliegen) ging dabei verloren. localStorage
 * ueberlebt Tab-Wechsel und Reload. Der Handoff wird NICHT mehr beim Lesen
 * geloescht, sondern erst per clearHandoff(), nachdem die Wizard-Session
 * erfolgreich gestartet wurde — so ueberlebt er auch einen fehlgeschlagenen
 * Startversuch.
 */

import type { WizardFacts } from "./types";

const KEY = "edufunds.wizard.handoff";

export interface MatchHandoff {
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
  fromMatchScore?: number;
  savedAt: string;
}

export function saveHandoff(h: Omit<MatchHandoff, "savedAt">): void {
  if (typeof window === "undefined") return;
  const payload: MatchHandoff = { ...h, savedAt: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(payload));
}

/**
 * Liest den Handoff, OHNE ihn zu loeschen. Geloescht wird erst per
 * clearHandoff() nach erfolgreichem Wizard-Start.
 */
export function consumeHandoff(): MatchHandoff | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MatchHandoff;
  } catch {
    return null;
  }
}

export function clearHandoff(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function handoffToSeedFacts(h: MatchHandoff): Partial<WizardFacts> {
  const facts: Partial<WizardFacts> = {};
  const schule: Record<string, unknown> = {};
  if (h.schulname) schule.name = h.schulname;
  if (h.schultyp) schule.typ = h.schultyp;
  if (h.bundesland) schule.bundesland = h.bundesland;
  if (Object.keys(schule).length) facts.schule = schule;

  const projekt: Record<string, unknown> = {};
  if (h.anliegen) projekt.kurzbeschreibung = h.anliegen;
  if (Object.keys(projekt).length) facts.projekt = projekt;

  if (h.geschaetztesBudgetEur) {
    facts.budget = { beantragt_eur: h.geschaetztesBudgetEur };
  }
  return facts;
}
