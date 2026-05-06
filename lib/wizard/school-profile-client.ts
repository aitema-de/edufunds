/**
 * Browser-lokales Schul-Profil (localStorage).
 *
 * Phase 1: ausschliesslich im Browser. Cross-Device-Sync kommt spaeter
 * zusammen mit Login/Magic-Link.
 */

import type { WizardFacts } from "./types";

const STORAGE_KEY = "edufunds.wizard.school_profile";

export interface SchoolProfile {
  name?: string;
  typ?: string;
  bundesland?: string;
  schuelerzahl?: number;
  besonderheiten?: string;
  updatedAt: string;
}

export function loadSchoolProfile(): SchoolProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SchoolProfile;
  } catch {
    return null;
  }
}

export function saveSchoolProfile(profile: SchoolProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearSchoolProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Uebernimmt neue Schul-Informationen aus frischen Facts in das Profil.
 * Nur gesetzte Felder werden ueberschrieben (kein Loeschen bei undefined).
 */
export function syncProfileFromFacts(facts: WizardFacts): SchoolProfile | null {
  const schule = facts.schule;
  if (!schule || typeof schule !== "object") return null;

  const current = loadSchoolProfile() ?? ({ updatedAt: new Date().toISOString() } as SchoolProfile);
  const next: SchoolProfile = { ...current };

  if (typeof schule.name === "string" && schule.name.trim()) next.name = schule.name.trim();
  if (typeof schule.typ === "string" && schule.typ.trim()) next.typ = schule.typ.trim();
  if (typeof schule.bundesland === "string" && schule.bundesland.trim())
    next.bundesland = schule.bundesland.trim();
  if (typeof schule.schuelerzahl === "number" && Number.isFinite(schule.schuelerzahl))
    next.schuelerzahl = schule.schuelerzahl;
  if (typeof schule.besonderheiten === "string" && schule.besonderheiten.trim())
    next.besonderheiten = schule.besonderheiten.trim();

  const changed = JSON.stringify({ ...current, updatedAt: undefined }) !==
    JSON.stringify({ ...next, updatedAt: undefined });
  if (!changed) return current;

  next.updatedAt = new Date().toISOString();
  saveSchoolProfile(next);
  return next;
}

export function profileToSeedFacts(profile: SchoolProfile): Partial<WizardFacts> {
  const schule: Record<string, unknown> = {};
  if (profile.name) schule.name = profile.name;
  if (profile.typ) schule.typ = profile.typ;
  if (profile.bundesland) schule.bundesland = profile.bundesland;
  if (profile.schuelerzahl) schule.schuelerzahl = profile.schuelerzahl;
  if (profile.besonderheiten) schule.besonderheiten = profile.besonderheiten;
  if (Object.keys(schule).length === 0) return {};
  return { schule };
}
