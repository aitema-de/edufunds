/**
 * Runtime-Validator fuer Richtlinien-Dossiers (Zod).
 *
 * Strikt vs. Legacy:
 *   - RichtlinieStrictSchema: alle 4 neuen Felder REQUIRED. Fuer neu extrahierte
 *     Dossiers ab Phase 3.
 *   - RichtlinieLegacySchema: alle 4 neuen Felder optional. Fuer die 11
 *     bestehenden Dossiers in data/richtlinien/, bis Phase 4 sie migriert.
 *
 * Foreign-Key-Check (validateForeignKeys):
 *   Zod kann Cross-Field-Refines via .refine(), wird aber unleserlich. Daher
 *   separate Funktion. Pflicht-Aufruf in scripts/validate-richtlinien.ts und
 *   in scripts/extract-richtlinie.ts (vor Persist).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Sub-Schemas fuer die 4 neuen Felder (D-01..D-04)
// ---------------------------------------------------------------------------

const BestPracticeSchema = z.object({
  thema: z.string().min(3, "thema muss mindestens 3 Zeichen lang sein"),
  was_funktionierte: z
    .string()
    .min(10, "was_funktionierte muss mindestens 10 Zeichen lang sein"),
  warum: z.string().optional(),
});

const RejectGrundSchema = z.object({
  grund: z.string().min(5, "grund muss mindestens 5 Zeichen lang sein"),
  haeufigkeit: z.enum(["haeufig", "gelegentlich"]).optional(),
  vermeidung: z.string().optional(),
});

const VorbildFormulierungSchema = z.object({
  abschnitt_id: z.string().min(1, "abschnitt_id darf nicht leer sein"),
  formulierung: z
    .string()
    .min(20, "formulierung muss mindestens 20 Zeichen lang sein"),
  kontext: z.string().optional(),
});

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const FristLogikSchema = z.discriminatedUnion("typ", [
  z.object({ typ: z.literal("rolling") }),
  z.object({
    typ: z.literal("fixe_stichtage"),
    stichtage: z
      .array(
        z
          .string()
          .regex(
            ISO_DATE_REGEX,
            "stichtag muss ISO-Format YYYY-MM-DD haben (z. B. 2026-04-10)"
          )
      )
      .min(1, "fixe_stichtage benoetigt mindestens einen Stichtag"),
    jaehrlich_wiederkehrend: z.boolean().optional(),
  }),
]);

// ---------------------------------------------------------------------------
// Bestehende Pflichtfelder — minimaler Mirror der Compile-Time-Interfaces.
// Wir validieren nur die fuer FK + Strict-Mode relevanten Substrukturen
// streng; den Rest behalten wir als z.unknown()/passthrough, damit Phase
// 3 nicht versehentlich die Foerderhoehe-/Kostenpositionen-Modellierung
// duplizieren muss (das gehoert in Phase 4 wenn ueberhaupt).
// ---------------------------------------------------------------------------

const AntragsAbschnittSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pflicht: z.boolean(),
  maxZeichen: z.number().optional(),
  leitfragen: z.array(z.string()).optional(),
  stilhinweis: z.string().optional(),
});

const AntragsstrukturSchema = z
  .object({
    // Phase-04-Lockerung (2026-05-19, Fortsetzung von 8e9aecf): min(1) entfernt.
    // 5 von 11 Bestands-Dossiers (berlin-startchancen, erasmus-schule-2026,
    // ferry-porsche-challenge, ferry-porsche-challenge-2025, klimalab-2026)
    // sind seit Phase 3 als Stub mit leerem abschnitte[]-Array gespeichert.
    // Ihre Antrags-Struktur ist noch nicht extrahiert — das war nie Phase-4-
    // Scope. Strict-Schema akzeptiert jetzt leeres Array, damit die 4 neuen
    // Felder migriert werden koennen, ohne dass eine separate
    // antragsstruktur-Extraktion vorausgehen muss.
    abschnitte: z.array(AntragsAbschnittSchema),
    anlagen: z.array(z.string()).optional(),
    einreichungsweg: z.string(),
    bearbeitungsdauer: z.string().optional(),
  })
  .passthrough();

/**
 * Locker-Variante fuer Legacy-Dossiers: 5 von 11 Bestands-Dossiers haben
 * heute leere `abschnitte: []` oder eine reine `bemerkung`-Antragsstruktur,
 * weil die Quelle bei der Erst-Extraktion zu duenn war. Phase 4 (FETCH-04)
 * migriert diese; bis dahin akzeptiert das Legacy-Schema sie.
 */
const AntragsstrukturLegacySchema = z
  .object({
    abschnitte: z.array(AntragsAbschnittSchema).optional(),
    anlagen: z.array(z.string()).optional(),
    einreichungsweg: z.string().optional(),
    bearbeitungsdauer: z.string().optional(),
  })
  .passthrough();

// Basis-Felder, die fuer beide Modi gelten — Pflicht im Datenmodell, aber
// inhaltlich locker validiert (Phase 4 kann verschaerfen).
const BaseRichtlinieShape = {
  version: z.string().min(1),
  quellen: z.array(z.string()),
  foerderhoehe: z.unknown(), // Phase 4 verschaerft falls noetig
  kostenpositionen: z.array(z.unknown()),
  eigenmittel: z.unknown(),
  kumulierung: z.unknown(),
  antragsstruktur: AntragsstrukturSchema,
  notizen: z.array(z.string()).optional(),
  veraltet: z.boolean().optional(),
};

// ---------------------------------------------------------------------------
// Strict-Schema: alle 4 neuen Felder REQUIRED (Feld-Existenz strikt)
// ---------------------------------------------------------------------------
//
// Phase-04-Lockerung (2026-05-19): Die drei array-Felder (bestPractices,
// rejectGruende, vorbildFormulierungen) verlangen NICHT mehr min(1).
// Begruendung: Konflikt mit dem Anti-Halluzinations-Prompt in
// scripts/migrate-legacy-dossier.ts ("lieber leere Liste als Erfindung").
// Bei Programmen, die in ihrer Richtlinie keine Reject-Gruende oder
// Vorbild-Formulierungen explizit nennen, ist ein leeres Array die korrekte
// (faktentreue) Antwort, nicht eine erfundene Mindest-Aussage. Das Schema
// erzwingt weiterhin Feld-Existenz (statt optional) — nur die min(1)-Pflicht
// faellt. fristLogik bleibt strikt (Discriminated Union erzwingt einen Wert).
export const RichtlinieStrictSchema = z
  .object({
    ...BaseRichtlinieShape,
    bestPractices: z.array(BestPracticeSchema),
    rejectGruende: z.array(RejectGrundSchema),
    vorbildFormulierungen: z.array(VorbildFormulierungSchema),
    fristLogik: FristLogikSchema,
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Legacy-Schema: alle 4 neuen Felder OPTIONAL
// ---------------------------------------------------------------------------

export const RichtlinieLegacySchema = z
  .object({
    ...BaseRichtlinieShape,
    // Override: Legacy-Dossiers duerfen leere/reine bemerkung-Antragsstruktur
    // mitbringen (5 von 11 Bestands-Dossiers, vor FETCH-04 Migration).
    antragsstruktur: AntragsstrukturLegacySchema,
    bestPractices: z.array(BestPracticeSchema).optional(),
    rejectGruende: z.array(RejectGrundSchema).optional(),
    vorbildFormulierungen: z.array(VorbildFormulierungSchema).optional(),
    fristLogik: FristLogikSchema.optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Foreign-Key-Check fuer vorbildFormulierungen[].abschnitt_id
// ---------------------------------------------------------------------------

export interface FkIssue {
  programmId: string;
  abschnitt_id: string;
  reason: string;
}

export interface FkCheckable {
  antragsstruktur: { abschnitte?: Array<{ id: string }> };
  vorbildFormulierungen?: Array<{ abschnitt_id: string }>;
}

/**
 * Prueft, dass jedes vorbildFormulierungen[].abschnitt_id auf eine
 * existierende antragsstruktur.abschnitte[].id zeigt. Gibt eine flache
 * Issues-Liste zurueck (leer = OK).
 *
 * Defensiv gegen Legacy-Dossiers, die `antragsstruktur.abschnitte`
 * undefined oder leer haben (5 von 11 Bestands-Dossiers vor FETCH-04).
 * Wenn keine Abschnitte vorliegen aber Vorbild-Formulierungen vorhanden
 * sind, wird jede Vorbild-Formulierung als FK-Verletzung gemeldet.
 */
export function validateForeignKeys(
  parsed: FkCheckable,
  programmId: string
): FkIssue[] {
  const issues: FkIssue[] = [];
  const abschnitte = parsed.antragsstruktur?.abschnitte ?? [];
  const validIds = new Set(abschnitte.map((a) => a.id));
  for (const v of parsed.vorbildFormulierungen ?? []) {
    if (!validIds.has(v.abschnitt_id)) {
      const valid = Array.from(validIds).join(", ");
      issues.push({
        programmId,
        abschnitt_id: v.abschnitt_id,
        reason: `FK-Verletzung: abschnitt_id '${v.abschnitt_id}' nicht in antragsstruktur.abschnitte[].id [${valid}]`,
      });
    }
  }
  return issues;
}
