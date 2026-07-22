/**
 * Runtime-Schemas (Zod) fuer die expliziten Zustaende aus
 * `lib/foerder-zustaende.ts`.
 *
 * Warum eigenes Modul: Die Zustaende stehen an ZWEI Orten in den Daten —
 * im Katalog (`data/foerderprogramme.json`, entscheidet ueber den Verkauf) und
 * im Dossier (`data/richtlinien/<id>.json`, speist die Pipeline). Bis hierhin
 * war nur die Dossier-Seite runtime-validiert; die Katalog-Seite, also genau
 * die, die das Verkaufs-Gate liest, war es nicht. Ein Tippfehler in `art`
 * haette dort still gegriffen. Beide Seiten teilen sich jetzt diese Definition:
 *   - Dossier: lib/wizard/richtlinien-validator.ts
 *   - Katalog: __tests__/data/katalog-zustaende.test.ts (laeuft in CI ueber
 *     `npm test`; scripts/validate-data.ts steht in keiner Pipeline)
 *
 * Die TypeScript-Typen daneben helfen hier nicht: Die Daten kommen als JSON
 * ueber `JSON.parse` herein und werden nur behauptet, nicht geprueft.
 */

import { z } from "zod";

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const QuellePflicht = z.string().min(1, "quelle darf nicht leer sein");

/**
 * Frist-Zustand. Verkaufs-kritisch — jede Abweichung hier ist bares Geld,
 * deshalb `strict()`: ein unbekannter Schluessel (Tippfehler beim Migrieren)
 * faellt auf, statt still ignoriert zu werden.
 */
export const FristZustandSchema = z.discriminatedUnion("art", [
  z.object({ art: z.literal("keine"), quelle: QuellePflicht }).strict(),
  z
    .object({
      art: z.literal("stichtag"),
      stichtage: z
        .array(
          z
            .string()
            .regex(ISO_DATE_REGEX, "stichtag muss ISO-Format YYYY-MM-DD haben")
        )
        .min(1, "stichtag benoetigt mindestens einen Termin"),
      jaehrlichWiederkehrend: z.boolean().optional(),
      quelle: QuellePflicht,
    })
    .strict(),
  z
    .object({
      art: z.literal("geschlossen"),
      quelle: QuellePflicht,
      wiedereroeffnungErwartet: z.string().optional(),
    })
    .strict(),
  // Einziger Zustand ohne Quellen-Pflicht: Es gibt nichts zu belegen. Eine
  // Notiz, WAS geprueft wurde, ist trotzdem erwuenscht.
  z.object({ art: z.literal("unbekannt"), quelle: z.string().optional() }).strict(),
]);

export const UmfangZustandSchema = z.discriminatedUnion("art", [
  z.object({ art: z.literal("keine"), quelle: QuellePflicht }).strict(),
  z
    .object({ art: z.literal("zeichen"), wert: z.number().positive(), quelle: QuellePflicht })
    .strict(),
  z
    .object({ art: z.literal("seiten"), wert: z.number().positive(), quelle: QuellePflicht })
    .strict(),
  // Wie beim FristZustand: `unbekannt` darf eine Notiz tragen, was geprueft
  // wurde und wo die Limits liegen (z. B. "im OASE-Portal") — das ist die
  // Vorarbeit fuer die naechste Extraktionsrunde, kein Beleg.
  z.object({ art: z.literal("unbekannt"), quelle: z.string().optional() }).strict(),
]);

export const EinreichungsFormSchema = z
  .object({
    kanaele: z
      .array(z.enum(["online-formular", "online-portal", "email", "post", "unbekannt"]))
      .min(1, "mindestens ein Kanal noetig"),
    adresse: z.string().optional(),
    hinweis: z.string().optional(),
    quelle: z.string().optional(),
  })
  .strict()
  // `quelle` ist Pflicht, sobald ein Kanal BELEGT wird (so dokumentiert in
  // lib/foerder-zustaende.ts). Nur `["unbekannt"]` heisst "nicht erfasst" und
  // braucht keinen Beleg.
  .superRefine((v, ctx) => {
    const nurUnbekannt = v.kanaele.length === 1 && v.kanaele[0] === "unbekannt";
    if (!nurUnbekannt && !v.quelle?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quelle"],
        message: "quelle ist Pflicht, sobald kanaele nicht nur ['unbekannt'] ist",
      });
    }
    if (v.kanaele.includes("unbekannt") && v.kanaele.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kanaele"],
        message: "'unbekannt' ist ein Allein-Zustand und nicht mit belegten Kanaelen kombinierbar",
      });
    }
  });
