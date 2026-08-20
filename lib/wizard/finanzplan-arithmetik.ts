/**
 * Deterministische Rechenprüfung für den Finanzplan.
 *
 * WARUM ES DIESE DATEI GIBT (Tester-Feedback #008, 19.08.2026):
 * Ein Tester fand in seinem fertigen Antrag drei Widersprüche, die das Tool
 * selbst hätte finden müssen — alle drei sind reine Rechen- bzw. Abgleichfehler:
 *
 *   1. Die Posten summierten auf 43.140 EUR, ein Hinweis im selben Plan nannte
 *      40.000 EUR als beantragte Summe.
 *   2. Die Verwaltungspauschale stand mit 2.940 EUR im Plan. 7 % der Ausgaben
 *      (40.200 EUR) sind 2.814 EUR. Die 2.940 entsprechen 7 % von 42.000 — eine
 *      Bezugsgröße, die im Plan nirgends existiert.
 *   3. 15.000 EUR für Möbel, obwohl die Richtlinie dauerhafte Ausstattung
 *      ausschliesst — im selben Plan sogar schriftlich vermerkt.
 *
 * Warum das vorher niemand fand: Der CONSISTENCY-Prompt verbietet dem LLM
 * ausdrücklich, Gesamtsummen selbst zu rechnen ("der wird separat deterministisch
 * berechnet") — eine richtige Entscheidung, weil Sprachmodelle unzuverlässig
 * rechnen. Nur gab es die separate deterministische Berechnung nicht:
 * `finanzplan-validator.ts` prüft Höchstsummen, Quoten und Kategorien, liest die
 * `hinweise` aber gar nicht und rechnet keine Prozent-Posten nach. Die
 * Verantwortung war delegiert und von niemandem übernommen.
 *
 * Diese Datei schliesst genau diese Lücke — bewusst OHNE LLM: Summen, Prozente
 * und Textabgleiche sind das, was Software zuverlässig kann und ein Sprachmodell
 * nicht.
 */
import type { Finanzplan, Finanzposten } from "./types";
import type { Richtlinie } from "./richtlinien-schema";
import type { Warnung } from "./finanzplan-validator";

/** Toleranz in Euro, unterhalb derer eine Abweichung als Rundung gilt. */
const RUNDUNGS_TOLERANZ_EUR = 1;

/**
 * Beträge in deutschem Format aus Text ziehen: "43.140 €", "40.000 EUR",
 * "2.814,50 Euro". Gibt Betrag und die Fundstelle zurück.
 */
export function findeBetraege(text: string): Array<{ betrag: number; stelle: string }> {
  const treffer: Array<{ betrag: number; stelle: string }> = [];
  const re = /(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\s*(?:€|EUR|Euro)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const ganz = Number(m[1].replace(/\./g, ""));
    const nach = m[2] ? Number(`0.${m[2]}`) : 0;
    if (!Number.isFinite(ganz)) continue;
    const von = Math.max(0, m.index - 45);
    treffer.push({
      betrag: ganz + nach,
      stelle: text.slice(von, Math.min(text.length, m.index + m[0].length + 25)).replace(/\s+/g, " ").trim(),
    });
  }
  return treffer;
}

/**
 * Erkennt einen Posten, dessen Betrag ein PROZENTSATZ einer Bezugsgröße sein
 * soll — typisch die Verwaltungspauschale ("7 % der anerkannten Ausgaben").
 * Liest den Prozentsatz aus der Bezeichnung des Postens.
 */
export function lesProzentsatz(bezeichnung: string): number | null {
  const m = bezeichnung.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*%/);
  if (!m) return null;
  const wert = Number(m[1].replace(",", "."));
  return Number.isFinite(wert) && wert > 0 && wert < 100 ? wert : null;
}

/** Summe aller Posten, die NICHT der übergebene Posten sind (= Bemessungsgrundlage). */
function summeOhne(posten: Finanzposten[], id: string): number {
  return posten.filter((p) => p.id !== id).reduce((s, p) => s + p.betragEur, 0);
}

/**
 * Prüft die Rechenlogik eines Finanzplans.
 *
 * Zwei Schweregrade, bewusst getrennt:
 *  - `error` NUR für den Prozent-Posten: arithmetisch eindeutig UND vom Nutzer
 *    behebbar (ein Autofix-Klick, s. finanzplan-autofix.ts). Ein `error` sperrt
 *    die Freigabe — das darf nur, was auch einen Ausweg hat.
 *  - `warning` für den Summen-Widerspruch: ebenso eindeutig, aber die Quelle
 *    (`hinweise`, Antragstext) ist im Editor NICHT bearbeitbar. Als `error`
 *    wäre es eine Sackgasse.
 *  - `warning` für den SELBSTWIDERSPRUCH bei der Förderfähigkeit: Er wird über
 *    Wortgleichheit erkannt, und "Leihmöbel für die Projektlaufzeit" wäre
 *    zulässig. Ein zu Unrecht gesperrter Posten kostet den Nutzer mehr als ein
 *    Hinweis, den er prüfen und wegklicken kann.
 */
export function pruefeArithmetik(
  plan: Finanzplan,
  richtlinie: Richtlinie | null | undefined,
  /** Der Antragstext, falls die Summen auch dort abgeglichen werden sollen. */
  antragstext?: string
): Warnung[] {
  const warnungen: Warnung[] = [];
  const posten = plan.posten ?? [];
  if (posten.length === 0) return warnungen;

  const gesamt = posten.reduce((s, p) => s + p.betragEur, 0);

  // -------------------------------------------------------------------------
  // 1. Prozent-Posten nachrechnen (Verwaltungspauschale & Co.)
  // -------------------------------------------------------------------------
  for (const p of posten) {
    const satz = lesProzentsatz(p.bezeichnung ?? "");
    if (satz === null) continue;

    const grundlage = summeOhne(posten, p.id);
    const soll = Math.round((grundlage * satz) / 100);
    const abweichung = Math.abs(p.betragEur - soll);
    if (abweichung <= RUNDUNGS_TOLERANZ_EUR) continue;

    // Was WÄRE die Bezugsgröße, die den angesetzten Betrag erklärt? Diese Zahl
    // macht den Fehler nachvollziehbar, statt nur "stimmt nicht" zu sagen.
    const impliziert = satz > 0 ? Math.round((p.betragEur * 100) / satz) : 0;
    warnungen.push({
      level: "error",
      message:
        `Posten "${p.bezeichnung}": ${satz} % von ${grundlage.toLocaleString("de-DE")} EUR ` +
        `ergibt ${soll.toLocaleString("de-DE")} EUR, angesetzt sind aber ` +
        `${p.betragEur.toLocaleString("de-DE")} EUR (Differenz ` +
        `${(p.betragEur - soll).toLocaleString("de-DE")} EUR). ` +
        `Der angesetzte Betrag entspräche ${satz} % von ${impliziert.toLocaleString("de-DE")} EUR — ` +
        `diese Bezugsgröße kommt im Finanzplan nicht vor.`,
      kategorie: p.kategorie,
      postenId: p.id,
    });
  }

  // -------------------------------------------------------------------------
  // 2. Genannte Gesamt-/Fördersummen gegen die Postensumme
  //
  // Die `hinweise` des Plans wurden bisher von KEINER Prüfung gelesen — genau
  // dort stand beim Tester "Die Förderhöhe von 40.000 EUR entspricht der
  // beantragten Summe", während die Posten auf 43.140 EUR summierten.
  // -------------------------------------------------------------------------
  const quellen: Array<{ label: string; text: string }> = [
    ...(plan.hinweise ?? []).map((h, i) => ({ label: `Hinweis ${i + 1}`, text: h })),
  ];
  if (antragstext) quellen.push({ label: "Antragstext", text: antragstext });

  const SUMMEN_KONTEXT =
    /(gesamt|gesamtvolumen|gesamtkosten|gesamtsumme|fördersumme|foerdersumme|förderhöhe|foerderhoehe|beantragt|projektvolumen|zuwendung)/i;

  const gemeldet = new Set<number>();
  for (const q of quellen) {
    for (const { betrag, stelle } of findeBetraege(q.text)) {
      if (!SUMMEN_KONTEXT.test(stelle)) continue; // nur Beträge, die sich als Summe ausgeben
      if (Math.abs(betrag - gesamt) <= RUNDUNGS_TOLERANZ_EUR) continue; // stimmt
      if (posten.some((p) => Math.abs(p.betragEur - betrag) <= RUNDUNGS_TOLERANZ_EUR)) continue; // ist ein Einzelposten
      if (gemeldet.has(betrag)) continue;
      gemeldet.add(betrag);

      warnungen.push({
        // BEWUSST "warning", nicht "error" — obwohl der Widerspruch eindeutig ist.
        //
        // Ein `error` sperrt die Freigabe des Finanzplans (okFuerFreigabe, s.
        // finanzplan-validator.ts und app/api/wizard/finanzplan/legitimize).
        // Sperren darf man nur, was der Nutzer auch beheben KANN: Im
        // FinanzplanEditor sind ausschliesslich die POSTEN editierbar, die
        // `hinweise` und der Antragstext nicht. Ein `error` auf einem Hinweis
        // wäre eine Sackgasse — dieselbe Bauart wie der 409-Fehler vom
        // 13.08.2026, bei dem ein Zustand niemanden mehr herausliess.
        //
        // Sichtbar bleibt der Befund trotzdem, und die Prozent-Korrektur (die
        // der Nutzer per Autofix-Klick lösen kann) bleibt ein `error`.
        level: "warning",
        message:
          `${q.label} nennt ${betrag.toLocaleString("de-DE")} EUR als Gesamt-/Fördersumme, ` +
          `die Posten summieren aber auf ${gesamt.toLocaleString("de-DE")} EUR ` +
          `(Differenz ${(gesamt - betrag).toLocaleString("de-DE")} EUR). Fundstelle: „${stelle}“`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 3. Selbstwiderspruch: Der Plan nennt einen Ausschluss und verstösst dagegen
  //
  // Der Validator prüft `kostenpositionen[].foerderfaehig` je KATEGORIE. Das LLM
  // kann dem ausweichen, indem es den Posten anders einsortiert — beim Tester
  // standen 15.000 EUR Möbel unter "sachkosten", obwohl die Richtlinie dauerhafte
  // Ausstattung ausschliesst.
  //
  // Der belastbare Nachweis steckt im Plan selbst: Hinweis 5 lautete wörtlich
  // "Investitionen in dauerhafte Ausstattung (z. B. Möbel) sind in dieser
  // Richtlinie nicht förderfähig — daher als Sachkosten … angesetzt." Der Plan
  // benennt die Regel, nennt den Gegenstand und beschreibt den Ausweg.
  //
  // Warum NICHT über Stichwörter aus der Richtlinie: Ein erster Versuch zog
  // Substantive aus den Ausschluss-Bedingungen. Ergebnis war ein Falsch-Positiv
  // auf "Kulturpädagogische Fachkräfte", weil der PROGRAMMNAME ("Kultur macht
  // stark") in der Regel steht. Fremdvokabular erzeugt Rauschen; die
  // Selbstaussage des Plans nicht.
  // -------------------------------------------------------------------------
  for (const [i, hinweis] of (plan.hinweise ?? []).entries()) {
    if (!/nicht\s+(förder|foerder)(fähig|faehig|bar)/i.test(hinweis)) continue;

    // Gegenstände einsammeln: die Klammer-Beispiele ("z. B. Möbel") und die
    // Substantive VOR der Ausschluss-Formel.
    const gegenstaende = new Set<string>();
    for (const m of hinweis.matchAll(/z\.?\s?B\.?\s+([^)]+?)[)]/gi)) {
      for (const teil of m[1].split(/,|\bund\b|\boder\b/)) {
        const w = teil.trim().toLowerCase();
        if (w.length >= 4 && !STOPP_WOERTER.has(w)) gegenstaende.add(w);
      }
    }
    const vorDerFormel = hinweis.split(/nicht\s+(?:förder|foerder)/i)[0];
    for (const w of vorDerFormel.match(/\b[A-ZÄÖÜ][a-zäöüß]{4,}\b/g) ?? []) {
      const norm = w.toLowerCase();
      if (!STOPP_WOERTER.has(norm)) gegenstaende.add(norm);
    }
    if (gegenstaende.size === 0) continue;

    for (const p of posten) {
      const bez = (p.bezeichnung ?? "").toLowerCase();
      for (const wort of gegenstaende) {
        if (!bez.includes(wort)) continue;
        // Leihe/Miete ist in vielen Richtlinien der zulässige Ausweg — dann ist
        // der Posten legitim und die Warnung wäre falsch-positiv. Der Hinweis
        // beim Tester nannte "Leih- ODER Kaufoption": Das Wort allein im HINWEIS
        // genügt also nicht, es muss am POSTEN stehen.
        if (/\b(leih|miet|leasing|ausleihe)/i.test(bez)) break;
        warnungen.push({
          level: "warning",
          message:
            `Hinweis ${i + 1} im Finanzplan sagt, dass „${wort}“ nicht förderfähig ist — ` +
            `gleichzeitig steht „${p.bezeichnung}“ mit ` +
            `${p.betragEur.toLocaleString("de-DE")} EUR im Plan (Kategorie "${p.kategorie}", ` +
            `von der Kategorie-Prüfung deshalb nicht erfasst). ` +
            `Entweder der Posten entfällt, oder er wird als Leihe/Miete für die Projektlaufzeit ` +
            `ausgewiesen. Wörtlich: „${hinweis.trim()}“`,
          kategorie: p.kategorie,
          postenId: p.id,
        });
        break;
      }
    }
  }

  return warnungen;
}

/**
 * Wörter, die in Ausschluss-Regeln vorkommen, aber nichts über den Gegenstand
 * aussagen. Ohne diese Liste würde z. B. "Projekte" jeden Posten treffen.
 */
const STOPP_WOERTER = new Set([
  "anschaffungen",
  "anschaffung",
  "ausgaben",
  "kosten",
  "projekte",
  "projekt",
  "projektlaufzeit",
  "vorhaben",
  "massnahmen",
  "maßnahmen",
  "mittel",
  "foerderung",
  "förderung",
  "richtlinie",
  "antrag",
  "posten",
  "summe",
  "traeger",
  "träger",
  "schule",
  "schulen",
  "verein",
  "vereine",
  "personen",
  "einzelpersonen",
  "eigenleistungen",
  "investitionen",
]);
