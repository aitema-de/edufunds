/**
 * Targeted-Fill-Migration eines einzelnen Legacy-Dossiers auf das
 * Phase-3-Strict-Schema (FETCH-04 / D-07).
 *
 * Nutzung:
 *   npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts <programmId>
 *
 * Vorgehen:
 *   1. data/richtlinien/<id>.json laden (Bestands-Dossier)
 *   2. quellen[] aus dem Dossier fetchen (gleicher UA wie extract-richtlinie.ts)
 *   3. LLM-Aufruf mit Bestands-Daten als Anti-Halluzinations-Kontext
 *      und Anweisung: NUR bestPractices, rejectGruende, vorbildFormulierungen,
 *      fristLogik als JSON zurueckgeben
 *   4. Merge: Bestands-Felder bleiben byte-identisch, vier neue Felder werden
 *      hinzugefuegt, version wird auf today (YYYY-MM-DD) gebumpt
 *   5. Strict-Validator (RichtlinieStrictSchema + validateForeignKeys) als
 *      Pre-Persist-Gate. Bei Verletzung: exit 1, KEIN writeFile.
 *   6. data/richtlinien/<id>.json zurueckschreiben.
 *
 * KEINE Schleife ueber mehrere Dossiers — Sample-First-Pattern (D-09) verlangt
 * dass Plan 04-03 jedes Dossier in einem eigenen Commit migriert.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { generateJson, MODEL_PIPELINE } from "../lib/wizard/llm";
import {
  RichtlinieStrictSchema,
  validateForeignKeys,
} from "../lib/wizard/richtlinien-validator";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");
const MAX_TEXT_CHARS_PER_SOURCE = 60_000;

// ---------------------------------------------------------------------------
// HTTP-Fetch + Strip (1:1 aus extract-richtlinie.ts:101-132 dupliziert).
// Bewusste Duplikation: Plan 04 macht den Refaktor in scripts/auto-pflege-step.ts;
// Plan 02 ist entkoppelt davon, damit keine zirkulaere Abhaengigkeit entsteht.
// ---------------------------------------------------------------------------

async function fetchOrRead(src: string): Promise<{ url: string; text: string }> {
  if (/^https?:\/\//.test(src)) {
    // Viele Bundesseiten blocken nicht-Browser-UA mit HTTP 403.
    // Mit einem realistischen Browser-UA funktionieren sie.
    const res = await fetch(src, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von ${src}`);
    const ct = res.headers.get("content-type") ?? "";
    const body = await res.text();
    const text = ct.includes("html") ? stripHtml(body) : body;
    return { url: src, text };
  }
  const text = await fs.readFile(src, "utf8");
  return { url: `file://${path.resolve(src)}`, text };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Targeted-Fill System-Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Du erweiterst ein bestehendes Foerderrichtlinien-Dossier um VIER neue Felder. Alle BESTEHENDEN Felder bleiben unveraendert — du widersprichst NICHT, ueberschreibst NICHT, ergaenzt NICHTS ausserhalb der vier Zielfelder.

Sprache: deutsch. Identifier-Konvention: ASCII in JSON-Schluesseln, Umlaute (ae/oe/ue/ss) in Werten erlaubt.

ZIELFELDER (alle vier MUESSEN geliefert werden, leeres Array ist erlaubt wenn die Quelle nichts hergibt):

{
  "bestPractices": [
    { "thema": "...", "was_funktionierte": "...", "warum"?: "..." }
  ],
  "rejectGruende": [
    { "grund": "...", "haeufigkeit"?: "haeufig" | "gelegentlich", "vermeidung"?: "..." }
  ],
  "vorbildFormulierungen": [
    { "abschnitt_id": "id-aus-antragsstruktur.abschnitte", "formulierung": "...", "kontext"?: "..." }
  ],
  "fristLogik": { "typ": "rolling" } | { "typ": "fixe_stichtage", "stichtage": ["YYYY-MM-DD", ...], "jaehrlich_wiederkehrend"?: true|false }
}

KONTEXT-DATEN sind unangreifbar:
- Das Bestands-Dossier kommt im User-Prompt unter "BESTAND". NICHT widersprechen, NICHT ueberschreiben, NICHT in dein Output uebernehmen.
- Die Volltexte unter "VOLLTEXT" sind die einzige zulaessige Quelle fuer Werte in den vier Zielfeldern.

REGELN GEGEN HALLUZINATION (kritisch — befolge sie strikt):
- Wenn die Richtlinie keine Best-Practices, Reject-Gruende oder Vorbild-Formulierungen explizit nennt: leeres Array. Erfinde NICHTS.
- bestPractices und vorbildFormulierungen MUESSEN aus dem gelieferten Volltext belegbar sein, NICHT aus Allgemeinwissen ueber Foerderverfahren.
- vorbildFormulierungen[].abschnitt_id MUSS exakt einer id aus dem BESTAND-Block antragsstruktur.abschnitte[].id entsprechen. Validator prueft das hart.
- thema mindestens 3 Zeichen, was_funktionierte mindestens 10, grund mindestens 5, formulierung mindestens 20 — sonst lass den Eintrag weg.
- stichtage IMMER im Format YYYY-MM-DD. Wenn Richtlinie "10. April 2026" nennt, schreibe "2026-04-10".
- Maximal 5 Eintraege pro bestPractices/rejectGruende/vorbildFormulierungen.
- Wenn die Quelle eine Frist erwaehnt aber kein konkretes Datum (z. B. "jedes Jahr im Sommer"): fristLogik.typ = "rolling".
- Wenn unsicher: lieber leere Liste als Erfindung.

Nur valides JSON ausgeben, keine Markdown-Fences, keine Erklaerung davor/danach.`;

// ---------------------------------------------------------------------------
// Kern-Migration
// ---------------------------------------------------------------------------

async function migrate(programmId: string): Promise<void> {
  // Schritt 1: Bestands-Dossier laden
  const dossierpfad = path.join(OUT_DIR, `${programmId}.json`);
  let existing: Richtlinie;
  try {
    existing = JSON.parse(await fs.readFile(dossierpfad, "utf8")) as Richtlinie;
  } catch (err) {
    console.error(`Dossier nicht gefunden: ${dossierpfad}`);
    console.error(`  (${(err as Error).message})`);
    process.exit(2);
  }

  // Schritt 2: Idempotenz-Pruefung — bereits vollstaendig migrierte Dossiers ueberspringen
  const bereitsmigriert =
    existing.bestPractices &&
    existing.bestPractices.length > 0 &&
    existing.rejectGruende &&
    existing.rejectGruende.length > 0 &&
    existing.vorbildFormulierungen &&
    existing.vorbildFormulierungen.length > 0 &&
    existing.fristLogik;
  if (bereitsmigriert) {
    console.log(`Bereits migriert, skip. (${programmId} hat alle 4 Phase-3-Felder)`);
    return;
  }

  // Schritt 3: Quellen pruefen
  if (!Array.isArray(existing.quellen) || existing.quellen.length === 0) {
    console.error(
      `Programm hat keine quellen[] im Bestands-Dossier — manuell ergaenzen vor Migration.`
    );
    console.error(`  Dossier-Pfad: ${dossierpfad}`);
    process.exit(4);
  }

  // Schritt 4: Quellen fetchen
  console.log(`==> Lade Quellen fuer ${programmId} (${existing.quellen.length})`);
  const texte: string[] = [];
  for (const q of existing.quellen) {
    console.log(`    - ${q}`);
    try {
      const { url, text } = await fetchOrRead(q);
      texte.push(`### Quelle: ${url}\n\n${text.slice(0, MAX_TEXT_CHARS_PER_SOURCE)}`);
    } catch (err) {
      console.warn(`    WARNUNG: Quelle nicht ladbar (${(err as Error).message})`);
      console.warn(`    Fahre mit leerem Volltext fuer diese Quelle fort.`);
      texte.push(`### Quelle: ${q}\n\n[Nicht ladbar: ${(err as Error).message}]`);
    }
  }

  // Schritt 5: User-Prompt bauen
  const userPrompt = `PROGRAMM-ID: ${programmId}
HEUTE: ${new Date().toISOString().slice(0, 10)}

BESTAND (Anti-Halluzinations-Anker — NICHT widersprechen, NICHT ueberschreiben):
${JSON.stringify(existing, null, 2)}

VOLLTEXT der Quellen (ggf. gekuerzt):
${texte.join("\n\n---\n\n")}

Liefere die vier Zielfelder als JSON-Objekt zurueck.`;

  // Schritt 6: LLM-Aufruf
  // Pick<Richtlinie, ...> sorgt dafuer, dass der Spread in Schritt 7 type-safe ist.
  type TargetedFill = Pick<
    Richtlinie,
    "bestPractices" | "rejectGruende" | "vorbildFormulierungen" | "fristLogik"
  >;
  let fill: TargetedFill;
  let llmUsage = { promptTokens: 0, candidatesTokens: 0 };
  console.log("==> LLM-Targeted-Fill laeuft (Provider: lib/wizard/llm.ts)");
  try {
    const llmResult = await generateJson<TargetedFill>(
      MODEL_PIPELINE,
      SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 4000 }
    );
    fill = llmResult.value;
    llmUsage = llmResult.usage;
  } catch (err) {
    console.error(`LLM-Aufruf fehlgeschlagen: ${(err as Error).message}`);
    process.exit(3);
  }

  // Schritt 7: Merge — Bestands-Felder bleiben byte-identisch, nur die 4 neuen Felder werden gesetzt
  const merged: Richtlinie = {
    ...existing,
    ...fill,
    version: new Date().toISOString().slice(0, 10),
  };

  // Schritt 8: Strict-Validator + FK-Check als Pre-Persist-Gate
  const strictParse = RichtlinieStrictSchema.safeParse(merged);
  if (!strictParse.success) {
    console.error(`==> Strict-Schema-Validierung fehlgeschlagen fuer ${programmId}:`);
    for (const issue of strictParse.error.issues) {
      console.error(`    ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  const fkIssues = validateForeignKeys(merged as never, programmId);
  if (fkIssues.length > 0) {
    console.error(`==> FK-Verletzungen fuer ${programmId}:`);
    for (const issue of fkIssues) {
      console.error(`    ${issue.abschnitt_id}: ${issue.reason}`);
    }
    process.exit(1);
  }

  // Schritt 9: Zurueckschreiben
  await fs.writeFile(
    path.join(OUT_DIR, `${programmId}.json`),
    JSON.stringify(merged, null, 2) + "\n"
  );
  console.log(`==> Migriert: data/richtlinien/${programmId}.json`);
  console.log(`    Tokens: ${llmUsage.promptTokens} in + ${llmUsage.candidatesTokens} out`);
  console.log(
    `    Felder: bestPractices=${(merged.bestPractices ?? []).length}, rejectGruende=${(merged.rejectGruende ?? []).length}, vorbildFormulierungen=${(merged.vorbildFormulierungen ?? []).length}, fristLogik=${merged.fristLogik?.typ}`
  );
  console.log(`\nBITTE REVIEW: Dossier mit Originalrichtlinie abgleichen bevor commit.\n`);
}

// ---------------------------------------------------------------------------
// CLI-Entry
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const [programmId] = args;
  if (!programmId) {
    console.error("Nutzung: npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts <programmId>");
    console.error("Beispiel: npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts bmbf-digitalpakt-2");
    process.exit(2);
  }
  await migrate(programmId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
