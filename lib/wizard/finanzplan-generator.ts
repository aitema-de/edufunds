import { randomUUID } from "crypto";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { Finanzplan, Finanzposten, WizardFacts } from "./types";
import type { Richtlinie } from "./richtlinien-schema";
import { MODEL_PRO, generateJson } from "./llm";
import { FINANZPLAN_SYSTEM, buildFinanzplanPrompt } from "./prompts";
import type { Usage } from "./pricing";

/**
 * Grobe Geld-Erkennung in einer User-Antwort: eine Zahl unmittelbar mit
 * Euro-Markierung (z. B. "10.000 EUR", "5000 €", "Euro 2000"). Reine Mengen
 * ("200 Kinder", "20 Tablets") zaehlen NICHT als Kostenbasis.
 */
const MONEY_RE = /(?:\d[\d.\s]*\s*(?:€|eur\b|euro)|(?:€|euro|eur)\s*\d)/i;

/**
 * true, wenn der Nutzer eine Kostenbasis geliefert hat — entweder ein Budget in
 * den Facts oder eine Geldangabe in den Roh-Antworten. Fehlt beides, wird der
 * Finanzplan im unbeziffert-Modus erzeugt (keine erfundenen Euro-Betraege).
 * Exportiert fuer Tests.
 */
export function hasUserKostenbasis(facts: WizardFacts, userAnswers?: string[]): boolean {
  const b = facts?.budget;
  if (b) {
    if (typeof b.beantragt_eur === "number" && b.beantragt_eur > 0) return true;
    if (typeof b.eigenmittel_eur === "number" && b.eigenmittel_eur > 0) return true;
  }
  if (userAnswers?.some((a) => MONEY_RE.test(a))) return true;
  return false;
}

interface RawPosten {
  kategorie?: string;
  bezeichnung?: string;
  betragEur?: number;
  begruendung?: string;
  eigenanteil?: boolean;
}

interface RawResult {
  posten: RawPosten[];
  hinweise?: string[];
}

const ALLOWED: Finanzposten["kategorie"][] = [
  "personal",
  "sachkosten",
  "investitionen",
  "honorare",
  "reisekosten",
  "overhead",
  "sonstiges",
];

function normalize(p: RawPosten): Finanzposten | null {
  if (!p?.bezeichnung || typeof p.betragEur !== "number" || !Number.isFinite(p.betragEur)) {
    return null;
  }
  const kat = (p.kategorie ?? "sonstiges").toLowerCase();
  const kategorie = (ALLOWED as string[]).includes(kat)
    ? (kat as Finanzposten["kategorie"])
    : "sonstiges";
  return {
    id: randomUUID(),
    kategorie,
    bezeichnung: p.bezeichnung.trim(),
    betragEur: Math.round(p.betragEur),
    begruendung: p.begruendung?.trim() || undefined,
    eigenanteil: Boolean(p.eigenanteil),
  };
}

/**
 * Stellt sicher, dass ein vom Nutzer explizit genannter Eigenanteil
 * (`facts.budget.eigenmittel_eur`) im Finanzplan als eigens markierter Posten
 * (`eigenanteil: true`) abgebildet wird.
 *
 * Hintergrund: Das LLM setzt das `eigenanteil`-Flag unzuverlaessig (der Prompt
 * weist es nur fuer richtlinien-pflichtige Eigenmittel an, nicht fuer die
 * konkrete Nutzerangabe). Ohne diese deterministische Normalisierung rechnet
 * `validateFinanzplan` 0 % Eigenanteil und blockiert die Freigabe (HTTP 422),
 * obwohl der Nutzer einen Eigenanteil zugesagt hat.
 *
 * Konvention: Gesamtkosten = Foerderung + Eigenmittel. Nicht als Eigenanteil
 * markierte Posten gelten als Foerderkosten und bleiben unveraendert; der
 * Eigenanteil wird als separater, sauber bezifferter Posten ergaenzt bzw.
 * (bei unzuverlaessiger LLM-Markierung) konsolidiert.
 *
 * Exportiert fuer Tests.
 */
export function applyStatedEigenanteil(
  posten: Finanzposten[],
  facts: WizardFacts,
  hinweise: string[]
): Finanzposten[] {
  const stated = facts?.budget?.eigenmittel_eur;
  if (typeof stated !== "number" || !Number.isFinite(stated) || stated <= 0) {
    return posten;
  }
  const round = Math.round(stated);
  const currentEigen = posten
    .filter((p) => p.eigenanteil)
    .reduce((s, p) => s + p.betragEur, 0);

  // Bereits korrekt abgebildet (±1 % Toleranz, mind. 1 EUR)? Dann nichts tun.
  const tol = Math.max(1, round * 0.01);
  if (Math.abs(currentEigen - round) <= tol) {
    return posten;
  }

  // Unzuverlaessige LLM-Eigenanteil-Posten konsolidieren und einen sauberen
  // Eigenanteil-Posten in Hoehe der Nutzerangabe einsetzen.
  const foerderPosten = posten.filter((p) => !p.eigenanteil);
  const eigenPosten: Finanzposten = {
    id: randomUUID(),
    kategorie: "sonstiges",
    bezeichnung: "Eigenanteil Schultraeger",
    betragEur: round,
    begruendung: "Vom Antragsteller zugesagte Eigenmittel.",
    eigenanteil: true,
    // Am Nutzerinput verankert → kein Vorschlag, sondern belegt.
    istVorschlag: false,
  };
  hinweise.push(
    `Eigenanteil von ${round.toLocaleString("de-DE")} EUR aus deinen Angaben als separater Posten ergaenzt.`
  );
  return [...foerderPosten, eigenPosten];
}

/**
 * Begründungs-Sprache, die eingesteht, dass ein Betrag geschätzt/angenommen ist
 * (statt aus Nutzerangaben belegt). QA-02: solche Posten enthalten erfundene
 * Beträge, die der Nutzer leicht ungeprüft übernimmt.
 */
const ESTIMATION_HEDGE =
  /gesch[aä]tzt|sch(?:ä|ae)tzung|auf basis (?:üblicher|von)|übliche[rn]? (?:tagess|stundens|honorar|s[aä]tze)|pauschal angenommen|orientiert sich an üblich|angenommene[rn]? (?:tagess|stundens|honorar)/i;

/**
 * Markiert Posten mit eingestandenermaßen geschätztem Betrag durch einen
 * Warn-Hinweis. Ändert KEINE Beträge (sicher, deterministisch) — der Nutzer
 * wird gewarnt, den Betrag vor Einreichung zu prüfen. Exportiert für Tests.
 */
export function flagEstimatedAmounts(posten: Finanzposten[], hinweise: string[]): void {
  for (const p of posten) {
    if (p.begruendung && ESTIMATION_HEDGE.test(p.begruendung)) {
      hinweise.push(
        `Der Betrag für „${p.bezeichnung}" (${p.betragEur.toLocaleString("de-DE")} EUR) ist geschätzt — bitte vor Einreichung belegen oder anpassen.`
      );
    }
  }
}

function isAdmittedEstimate(p: Finanzposten): boolean {
  return p.begruendung != null && ESTIMATION_HEDGE.test(p.begruendung);
}

/**
 * Produktvision 2026-06-10 (Markierungs-Modell statt Löschen): Markiert jeden
 * Posten, dessen Betrag NICHT am Nutzerinput verankert ist, als `istVorschlag`
 * — ein bestätigbarer Assistenten-Vorschlag (z. B. Ausgestaltung einer genannten
 * Globalsumme, fachlich begründete Schätzung). Vorschläge werden BEHALTEN und in
 * der UI markiert, NICHT gelöscht (das war die alte, verworfene Kollaps-Logik).
 *
 * Regel: Ein Posten ist Vorschlag, wenn der Nutzer insgesamt keine Kostenbasis
 * lieferte ODER das LLM den Betrag selbst als Schätzung begründet hat. Posten,
 * deren `istVorschlag` bereits gesetzt ist (z. B. ein am Nutzer-Input verankerter
 * Eigenanteil aus `applyStatedEigenanteil`), bleiben unangetastet. Exportiert für Tests.
 */
export function markVorschlaege(posten: Finanzposten[], hasBasis: boolean): Finanzposten[] {
  return posten.map((p) => {
    if (p.istVorschlag !== undefined) return p;
    const vorschlag = !hasBasis || isAdmittedEstimate(p);
    return { ...p, istVorschlag: vorschlag };
  });
}

export interface FinanzplanUsage {
  model: string;
  usage: Usage;
}

export async function generateFinanzplan(
  programm: Foerderprogramm,
  facts: WizardFacts,
  richtlinie: Richtlinie | null | undefined,
  userAnswers?: string[]
): Promise<{ plan: Finanzplan; usage: FinanzplanUsage }> {
  // Produktvision 2026-06-10: Der Assistent erstellt IMMER einen bezifferten
  // Finanzplan-Vorschlag — auch wenn der Nutzer keine Kostenbasis lieferte
  // (dann aktiver, alle Beträge als Vorschlag markiert). Frühere Versionen haben
  // ohne Kostenbasis nur einen unbezifferten Kostenrahmen erzeugt bzw. den Plan
  // kollabiert (Löschen); das warf die wertvolle Ausgestaltung weg. Jetzt:
  // beziffert vorschlagen + als bestätigbaren Vorschlag MARKIEREN.
  const hasBasis = hasUserKostenbasis(facts, userAnswers);

  const { value, usage } = await generateJson<RawResult>(
    MODEL_PRO,
    FINANZPLAN_SYSTEM,
    buildFinanzplanPrompt(programm, facts, richtlinie, userAnswers)
  );

  const posten = (value.posten ?? [])
    .map(normalize)
    .filter((p): p is Finanzposten => p !== null);

  // Deterministische Eigenanteil-Normalisierung (siehe applyStatedEigenanteil):
  // garantiert, dass eine explizite Nutzer-Eigenmittelangabe als markierter
  // Posten erscheint, unabhaengig davon, ob das LLM das Flag gesetzt hat.
  const hinweise = value.hinweise?.length ? [...value.hinweise] : [];
  const postenMitEigenanteil = applyStatedEigenanteil(posten, facts, hinweise);
  // QA-02: Posten mit eingestandenermaßen geschätztem Betrag warnend markieren.
  flagEstimatedAmounts(postenMitEigenanteil, hinweise);

  // Vorschlags-Markierung: nicht am Nutzerinput verankerte Beträge als
  // bestätigbare Vorschläge kennzeichnen (statt löschen). Die UI zeigt sie als
  // "Vorschlag — bestätigen/anpassen".
  const postenMarkiert = markVorschlaege(postenMitEigenanteil, hasBasis);

  // Prominenter Sammelhinweis, sobald Vorschläge enthalten sind — macht
  // transparent, welche Beträge der Nutzer noch bestätigen sollte.
  const foerderposten = postenMarkiert.filter((p) => !p.eigenanteil);
  const vorschlaege = foerderposten.filter((p) => p.istVorschlag);
  if (vorschlaege.length > 0 && !hinweise.some((h) => h.includes("Vorschläge des Assistenten") || h.includes("Vorschlag des Assistenten"))) {
    const alle = vorschlaege.length === foerderposten.length && foerderposten.length > 0;
    hinweise.unshift(
      alle
        ? "Die Beträge sind Vorschläge des Assistenten auf Basis üblicher Kosten — bitte bestätigen oder an eure tatsächlichen Angebote anpassen."
        : "Einzelne Beträge sind als Vorschläge des Assistenten markiert — bitte bestätigen oder anpassen."
    );
  }

  const plan: Finanzplan = {
    posten: postenMarkiert,
    generiertAm: new Date().toISOString(),
    hinweise: hinweise.length ? hinweise : undefined,
  };

  return { plan, usage: { model: MODEL_PRO, usage } };
}
