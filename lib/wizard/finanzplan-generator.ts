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
 * H-V-2 (Pilot 19.06., SCHWER): Deterministischer Förderquoten-Check. Schreibt die
 * Richtlinie eine maximale Förderquote bzw. einen Pflicht-Eigenanteil vor (z. B. DKHW:
 * max 80 % Förderung / mind. 20 % Eigenanteil), darf die Förderung diesen Anteil an den
 * GESAMTKOSTEN (= Förderung + Eigenanteil) nicht überschreiten. Im Pilot setzte die KI
 * eine 100-%-Förderung (6.000 € Förderung bei 6.000 € Gesamtkosten) trotz 20-%-Pflicht-
 * Eigenanteil → der Antrag hätte die Förderquote der Stiftung formal verletzt.
 * Rein arithmetisch (kein LLM). Legt bei Verstoß einen konkreten, bezifferten Hinweis ab
 * (inkl. fehlendem Mindest-Eigenanteil). Exportiert für Tests.
 */
export function checkFoerderquote(
  foerderposten: Finanzposten[],
  eigenposten: Finanzposten[],
  richtlinie: Richtlinie | null | undefined,
  hinweise: string[]
): void {
  if (!richtlinie) return;
  const maxProzent = richtlinie.foerderhoehe?.maxProzentGesamtkosten;
  const minEigen = richtlinie.eigenmittel?.mindestProzent;
  // Zulässige Förder-Höchstquote bestimmen: explizite maxProzent ODER aus dem
  // Pflicht-Eigenanteil abgeleitet (100 - mindestProzent).
  let allowedMax: number | undefined;
  if (typeof maxProzent === "number" && maxProzent > 0) {
    allowedMax = maxProzent;
  } else if (richtlinie.eigenmittel?.pflicht && typeof minEigen === "number" && minEigen > 0) {
    allowedMax = 100 - minEigen;
  }
  if (allowedMax == null || allowedMax >= 100) return;

  const foerderung = Math.round(foerderposten.reduce((s, p) => s + p.betragEur, 0));
  const eigen = Math.round(eigenposten.reduce((s, p) => s + p.betragEur, 0));
  const gesamt = foerderung + eigen;
  if (gesamt <= 0 || foerderung <= 0) return;

  const quote = (foerderung / gesamt) * 100;
  if (quote <= allowedMax + 1) return; // 1 Prozentpunkt Toleranz gegen Rundung

  // Erforderlicher Mindest-Eigenanteil, damit foerderung = allowedMax % der Gesamtkosten:
  // eigen' = foerderung * (100 - allowedMax) / allowedMax.
  const requiredEigen = Math.round((foerderung * (100 - allowedMax)) / allowedMax);
  const fehlend = Math.max(0, requiredEigen - eigen);
  const f = (n: number) => n.toLocaleString("de-DE");
  hinweise.push(
    `Die Förderung (${f(foerderung)} EUR) entspricht ${Math.round(quote)} % der Gesamtkosten — dieses Programm fördert höchstens ${allowedMax} %. ` +
      `Es fehlt ein Eigenanteil von mind. ${f(fehlend)} EUR (Gesamtkosten dann ${f(foerderung + requiredEigen)} EUR). ` +
      `Ergänzen Sie einen Eigenanteil-Posten oder senken Sie die beantragte Förderung, sonst verletzt der Antrag die Förderquote.`
  );
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
 * H-GS-2b (Pilot 19.06.): Deterministischer Deckungs-Check. Der Pilot-Antrag
 * beantragte 4.000 EUR, der KI-Finanzplan summierte aber nur 1.166 EUR an
 * Förderposten — eine Lücke, die der KI-Prüfer zwar erkannte, aber nur vage als
 * „Inkonsistenz" meldete. Hier vergleichen wir die SUMME der Förderposten
 * (ohne Eigenanteil) mit der vom Nutzer beantragten Summe (facts.budget.beantragt_eur)
 * und legen bei relevanter Abweichung einen konkreten, bezifferten Hinweis ab.
 * Rein arithmetisch (kein LLM) → keine Halluzination, kein Eval-Risiko.
 * Schwellen: relative Abweichung > 10 % UND absolute Lücke >= 100 EUR (gegen Rausch).
 * Exportiert für Tests.
 */
export function checkBeantragtDeckung(
  foerderposten: Finanzposten[],
  facts: WizardFacts,
  hinweise: string[]
): void {
  const beantragt = facts?.budget?.beantragt_eur;
  if (typeof beantragt !== "number" || !Number.isFinite(beantragt) || beantragt <= 0) return;
  if (foerderposten.length === 0) return;

  const summe = Math.round(foerderposten.reduce((s, p) => s + p.betragEur, 0));
  const diff = summe - beantragt;
  const absLuecke = Math.abs(diff);
  if (absLuecke < 100 || absLuecke / beantragt <= 0.1) return;

  const sumStr = summe.toLocaleString("de-DE");
  const beantragtStr = beantragt.toLocaleString("de-DE");
  const lueckeStr = absLuecke.toLocaleString("de-DE");
  if (diff < 0) {
    hinweise.push(
      `Der Finanzplan summiert die Förderposten auf ${sumStr} EUR, beantragt wurden aber ${beantragtStr} EUR. ` +
        `Es fehlen ${lueckeStr} EUR an hinterlegten Posten — ergänzen Sie die fehlenden Kosten oder passen Sie die beantragte Summe an, damit Antrag und Finanzplan übereinstimmen.`
    );
  } else {
    hinweise.push(
      `Der Finanzplan summiert die Förderposten auf ${sumStr} EUR und übersteigt damit die beantragten ${beantragtStr} EUR um ${lueckeStr} EUR. ` +
        `Bitte die beantragte Summe oder die Posten angleichen.`
    );
  }
}

/**
 * Parst einen vom Nutzer in Freitext genannten Euro-Betrag (deutsche Schreibweise:
 * "10.000" = 10000, "1.234,50" = 1234.5). Punkte/Leerzeichen sind Tausender-Trenner,
 * Komma ist Dezimaltrenner. Gibt null bei nicht-parsebarem/nicht-positivem Wert.
 * Exportiert für Tests.
 */
export function parseGermanAmount(raw: string): number | null {
  let s = raw.trim();
  let decimal = "";
  const commaIdx = s.lastIndexOf(",");
  if (commaIdx !== -1) {
    decimal = s.slice(commaIdx + 1).replace(/\D/g, "");
    s = s.slice(0, commaIdx);
  }
  const intPart = s.replace(/\D/g, "");
  if (!intPart) return null;
  const n = Number(intPart) + (decimal ? Number("0." + decimal) : 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Global-Variante von MONEY_RE: erfasst die Zahl mit Euro-Markierung in beide Richtungen. */
const MONEY_AMOUNT_RE = /(?:€|eur|euro)\s*(\d[\d.\s]*\d|\d)|(\d[\d.\s]*\d|\d)\s*(?:€|eur\b|euro)/gi;

/**
 * Extrahiert alle vom Nutzer in den Roh-Antworten genannten Euro-Beträge. Reine
 * Mengen ("200 Kinder", "20 Tablets") ohne Euro-Markierung zählen NICHT (wie MONEY_RE).
 * Exportiert für Tests.
 */
export function extractStatedAmounts(userAnswers?: string[]): number[] {
  const out: number[] = [];
  if (!userAnswers) return out;
  for (const a of userAnswers) {
    if (typeof a !== "string") continue;
    for (const m of a.matchAll(MONEY_AMOUNT_RE)) {
      const raw = m[1] ?? m[2];
      if (!raw) continue;
      const v = parseGermanAmount(raw);
      if (v != null) out.push(Math.round(v));
    }
  }
  return out;
}

/**
 * P1-B (Pilot-Feedback 24.06.): Kostenplan-Transparenz. Die Testerin nannte einen
 * Betrag, den der Generator "offenbar halbiert" hat — ohne Erklärung. Die bestehenden
 * Checks greifen nur bei strukturiertem `facts.budget.beantragt_eur` (checkBeantragtDeckung)
 * bzw. vorhandener Richtlinie (checkFoerderquote). Ein frei im Text genannter Betrag, den
 * das LLM in Förderung + Eigenanteil aufteilt oder anpasst, blieb still. Dieser Check
 * vergleicht den größten genannten Betrag mit der Plan-Summe und legt bei materieller
 * Abweichung einen erklärenden Hinweis ab. Rein arithmetisch (kein LLM, kein Eval-Risiko).
 * Komplementär zu checkBeantragtDeckung (deferiert, wenn ein strukturiertes Budget existiert).
 * Exportiert für Tests.
 */
export function checkStatedAmountAdjusted(
  foerderposten: Finanzposten[],
  eigenposten: Finanzposten[],
  facts: WizardFacts,
  userAnswers: string[] | undefined,
  hinweise: string[]
): void {
  const stated = extractStatedAmounts(userAnswers);
  if (stated.length === 0) return;
  const statedMax = Math.max(...stated);
  if (statedMax < 100) return;

  const foerderung = Math.round(foerderposten.reduce((s, p) => s + p.betragEur, 0));
  const eigen = Math.round(eigenposten.reduce((s, p) => s + p.betragEur, 0));
  const gesamt = foerderung + eigen;
  if (foerderung <= 0) return;

  const f = (n: number) => n.toLocaleString("de-DE");
  const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1, b);

  const statedEigenSet =
    typeof facts?.budget?.eigenmittel_eur === "number" && facts.budget.eigenmittel_eur > 0;

  // Fall A — Aufteilung: genannter Betrag ≈ Gesamtkosten, aber als Förderung + Eigenanteil
  // gesplittet (= die "Halbierung", die die Testerin sah). Nur wenn der Eigenanteil NICHT
  // schon vom Nutzer selbst genannt wurde (sonst war die Aufteilung gewollt).
  if (
    !statedEigenSet &&
    eigen > 0 &&
    rel(gesamt, statedMax) <= 0.1 &&
    statedMax - foerderung >= 100 &&
    rel(foerderung, statedMax) > 0.1
  ) {
    hinweise.push(
      `Deinen genannten Betrag von ${f(statedMax)} EUR hat der Assistent als Gesamtkosten verstanden und in ${f(foerderung)} EUR Förderung + ${f(eigen)} EUR Eigenanteil aufgeteilt. ` +
        `Falls du ${f(statedMax)} EUR als reine Fördersumme gemeint hast, passe den Finanzplan an.`
    );
    return;
  }

  // Fall B — Abweichung ohne strukturiertes Budget: dann ist checkBeantragtDeckung NICHT
  // zuständig (es liest facts.budget.beantragt_eur). Erklärt eine still angepasste Summe.
  const hasStructuredBeantragt =
    typeof facts?.budget?.beantragt_eur === "number" &&
    Number.isFinite(facts.budget.beantragt_eur) &&
    (facts.budget.beantragt_eur as number) > 0;
  if (hasStructuredBeantragt) return;

  const diff = gesamt - statedMax;
  if (Math.abs(diff) >= 100 && rel(gesamt, statedMax) > 0.1) {
    hinweise.push(
      diff < 0
        ? `Du hast ${f(statedMax)} EUR genannt — der Finanzplan kommt aktuell auf ${f(gesamt)} EUR (also ${f(Math.abs(diff))} EUR weniger). ` +
            `Falls die Anpassung nicht beabsichtigt ist, ergänze die fehlenden Posten oder passe die Beträge an.`
        : `Du hast ${f(statedMax)} EUR genannt — der Finanzplan kommt aktuell auf ${f(gesamt)} EUR (also ${f(diff)} EUR mehr). ` +
            `Bitte prüfe, ob die höhere Summe beabsichtigt ist.`
    );
  }
}

/**
 * P1-A Backstop (Pilot-Feedback 24.06.): Deterministischer Ausschluss-Leck-Check. Hat der
 * Nutzer ein Element ausdrücklich ausgeschlossen (`facts.ausgeschlossen`, befüllt vom
 * Facts-Extractor) und taucht es trotzdem als Finanzposten auf, wird ein Hinweis gesetzt.
 * Die Prompt-Prävention (FINANZPLAN_SYSTEM/SECTION) verhindert es vorab; dieser Check ist
 * das sichtbare Sicherheitsnetz, falls das LLM doch durchrutscht. Konservativ: Treffer nur
 * bei Voll-Phrase ODER signifikantem Leitwort (≥6 Zeichen) → keine Single-Common-Word-FPs.
 * Rein deterministisch, nicht-destruktiv (nur Hinweis). Exportiert für Tests.
 */
export function checkAusschlussLeak(
  posten: Finanzposten[],
  facts: WizardFacts,
  hinweise: string[]
): void {
  const ausg = facts?.ausgeschlossen;
  if (!Array.isArray(ausg) || ausg.length === 0) return;
  for (const raw of ausg) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const phrase = raw.trim();
    const norm = phrase.toLowerCase();
    const longest = norm
      .split(/[^a-zäöüß]+/i)
      .filter((w) => w.length >= 6)
      .sort((a, b) => b.length - a.length)[0];
    const hit = posten.find((p) => {
      const hay = `${p.bezeichnung} ${p.begruendung ?? ""}`.toLowerCase();
      return hay.includes(norm) || (longest ? hay.includes(longest) : false);
    });
    if (hit) {
      hinweise.push(
        `Der Posten „${hit.bezeichnung}" betrifft „${phrase}" — das hast du ausgeschlossen. Bitte entfernen oder prüfen, ob es doch gewollt ist.`
      );
    }
  }
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

/**
 * Freigabe = Sammelbestätigung (Produktvision 2026-06-10): Mit der Legitimierung
 * des Finanzplans bestätigt der Nutzer alle verbliebenen Vorschlags-Beträge. Diese
 * Funktion entfernt daher die `istVorschlag`-Markierung von allen Posten — sonst
 * trägt ein bereits freigegebener Plan weiterhin „⟨Vorschlag⟩ — bitte bestätigen"-
 * Badges (Widerspruch: freigegeben UND noch zu bestätigen). Analog zu „Edit =
 * auto-confirm" im FinanzplanEditor. Exportiert für Tests.
 */
export function confirmAllVorschlaege(posten: Finanzposten[]): Finanzposten[] {
  return posten.map((p) => (p.istVorschlag ? { ...p, istVorschlag: false } : p));
}

export interface FinanzplanUsage {
  model: string;
  usage: Usage;
}

function sumUsage(a: Usage, b: Usage): Usage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    candidatesTokens: a.candidatesTokens + b.candidatesTokens,
  };
}

/**
 * Letzter Sicherheitsanker (Probe 09.06., Fall 6): Wenn das LLM trotz
 * Wiederholung keinen einzigen verwertbaren Posten liefert, darf der Finanzplan
 * NICHT still leer ausgeliefert werden (voller Antragstext, aber 0 Posten). Statt
 * eines leeren Plans wird ein ehrlicher, UNBEZIFFERTER Kostenrahmen erzeugt — aus
 * den vom Nutzer genannten Hauptposten bzw. Projektaktivitaeten, sonst ein
 * generischer Hinweis. So ist der Plan immer entweder bezifferte Vorschlaege ODER
 * ein ehrlicher Kostenrahmen, nie leer. Exportiert fuer Tests.
 */
export function buildUnbezifferterFallback(
  facts: WizardFacts,
  llmHinweise?: string[]
): Finanzplan {
  const rahmen: string[] = [];
  const hauptposten = facts?.budget?.hauptposten;
  if (Array.isArray(hauptposten)) {
    for (const h of hauptposten) if (typeof h === "string" && h.trim()) rahmen.push(h.trim());
  }
  if (rahmen.length === 0) {
    const akt = facts?.projekt?.aktivitaeten;
    if (Array.isArray(akt)) {
      for (const a of akt) if (typeof a === "string" && a.trim()) rahmen.push(`Kosten für: ${a.trim()}`);
    }
  }
  if (rahmen.length === 0) {
    rahmen.push("Projektkosten werden vor Einreichung anhand konkreter Angebote beziffert.");
  }
  const hinweise = [
    "Es konnte kein bezifferter Finanzplan erzeugt werden. Die folgenden Positionen sind als Kostenrahmen zu verstehen und vor Einreichung mit konkreten Beträgen zu hinterlegen.",
    ...(llmHinweise?.length ? llmHinweise : []),
  ];
  return {
    posten: [],
    unbeziffert: true,
    kostenrahmen: rahmen,
    generiertAm: new Date().toISOString(),
    hinweise,
  };
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
  const prompt = buildFinanzplanPrompt(programm, facts, richtlinie, userAnswers);

  let { value, usage } = await generateJson<RawResult>(MODEL_PRO, FINANZPLAN_SYSTEM, prompt);

  let posten = (value.posten ?? [])
    .map(normalize)
    .filter((p): p is Finanzposten => p !== null);

  // Fall 6 (Probe 09.06.): Ein leeres Posten-Array ist meist ein transienter
  // Generierungs-Ausfall (der Retry-Layer in llm.ts faengt nur Fehler/Leer-Text,
  // ein valides {posten:[]} ist inhaltlich leer, kein Fehler). Genau EIN gezielter
  // Wiederholungs-Versuch, bevor wir auf den Kostenrahmen-Anker zurueckfallen.
  if (posten.length === 0) {
    const retry = await generateJson<RawResult>(MODEL_PRO, FINANZPLAN_SYSTEM, prompt);
    usage = sumUsage(usage, retry.usage);
    const retryPosten = (retry.value.posten ?? [])
      .map(normalize)
      .filter((p): p is Finanzposten => p !== null);
    if (retryPosten.length > 0) {
      value = retry.value;
      posten = retryPosten;
    }
  }

  // Immer noch leer → ehrlicher unbezifferter Kostenrahmen statt stillem Leerplan.
  if (posten.length === 0) {
    return {
      plan: buildUnbezifferterFallback(facts, value.hinweise),
      usage: { model: MODEL_PRO, usage },
    };
  }

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
  const eigenposten = postenMarkiert.filter((p) => p.eigenanteil);
  // H-GS-2b: Deckungs-Check Förderposten-Summe × beantragte Summe (deterministisch).
  checkBeantragtDeckung(foerderposten, facts, hinweise);
  // H-V-2: Förderquoten-Check gegen die Richtlinie (max Förderquote / Pflicht-Eigenanteil).
  checkFoerderquote(foerderposten, eigenposten, richtlinie, hinweise);
  // P1-B (Feedback 24.06.): Transparenz, wenn ein frei genannter Betrag aufgeteilt/angepasst wurde.
  checkStatedAmountAdjusted(foerderposten, eigenposten, facts, userAnswers, hinweise);
  // P1-A Backstop (Feedback 24.06.): warnt, falls ein ausgeschlossenes Element als Posten durchrutscht.
  checkAusschlussLeak(postenMarkiert, facts, hinweise);
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
