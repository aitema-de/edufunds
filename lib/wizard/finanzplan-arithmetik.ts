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

/**
 * Worauf bezieht sich der Prozentsatz — und ist er überhaupt einer?
 *
 * Die Frage entscheidet über die richtige Zahl, nicht über eine Nuance:
 *  - "7 % der anerkannten Ausgaben"  → alle ÜBRIGEN Posten (Aufschlag).
 *  - "20 % der Gesamtkosten"         → Die Grundlage schliesst den Posten
 *    SELBST ein. Dann ist er nicht 20 % der übrigen, sondern
 *    übrige × 20/(100−20) = übrige × 0,25.
 *  - "7 % der Personalkosten"        → nur die Posten dieser Kategorie.
 *
 * 🚫 UND: Nicht jede Prozentzahl in einer Bezeichnung ist eine
 * Bemessungsgrundlage. Die Probe auf den 75 Baseline-Anträgen (20.08.2026) hat
 * zwei Fälle gefunden, in denen die naive Lesart einen RICHTIGEN Betrag
 * zerstört hätte:
 *   - "Teilzeit-Klimaschutzbeauftragte (50%)" — das ist ein STELLENANTEIL.
 *     Die naive Rechnung hätte 12.000 EUR auf 3.000 EUR gekürzt.
 *   - "Projektmanagement (20 % der Pauschale)" — Bezug ist "die Pauschale",
 *     eine Grösse, die der Code nicht kennt. Die naive Rechnung hätte
 *     80.000 EUR auf 64.000 EUR gekürzt.
 * Solange das nur eine Warnung war, kostete der Fehlalarm Vertrauen; seit die
 * Pipeline still korrigiert (korrigiereProzentPosten), kostet er Geld im
 * Antrag. Deshalb gilt:
 *   - Ist eine Bezugsgrösse GENANNT, muss sie erkannt sein — sonst null.
 *   - Ist KEINE genannt ("Verwaltungspauschale (7 %)"), wird die übliche
 *     Aufschlag-Lesart nur bei einem Pauschalen-/Overhead-Posten unterstellt.
 * Im Zweifel schweigt die Prüfung: Ein übersehener Rechenfehler ist ein
 * Hinweis weniger — ein falsch "korrigierter" Betrag ist ein falscher Antrag.
 */
export type ProzentBezugsArt = "uebrige" | "gesamt" | "kategorie";

export interface ProzentBezug {
  satz: number;
  art: ProzentBezugsArt;
  kategorie?: Finanzposten["kategorie"];
  /** Menschenlesbare Bezeichnung der Grundlage, für Meldungen. */
  label: string;
}

const KATEGORIE_STICHWORT: Array<[RegExp, Finanzposten["kategorie"], string]> = [
  [/personal(kosten|ausgaben)\b/i, "personal", "die Personalkosten"],
  [/honorar(e|kosten|ausgaben)\b/i, "honorare", "die Honorare"],
  [/sach(kosten|mittel|ausgaben)\b/i, "sachkosten", "die Sachkosten"],
  [/investitions(kosten|ausgaben)\b|\binvestitionen\b/i, "investitionen", "die Investitionen"],
  [/(reise|fahrt)kosten\b/i, "reisekosten", "die Reisekosten"],
];

/** Bezugsgrössen, die den Posten selbst einschliessen. */
const GESAMT_RE =
  /gesamt(kosten|volumen|summe|ausgaben|budget)|projekt(kosten|volumen|budget)|f(ö|oe)rder(summe|h(ö|oe)he|volumen)|zuwendung/i;

/** Bezugsgrössen, auf die aufgeschlagen wird (Posten selbst NICHT enthalten). */
const AUSGABEN_RE =
  /(anerkannte|zuwendungsf(ä|ae)hige|f(ö|oe)rderf(ä|ae)hige|direkte|(ü|ue)brige)n?\s+(ausgaben|kosten)|^[\s.,;:)-]*(der|des)?\s*(ausgaben|kosten)\b/i;

/** Posten, bei denen eine nackte Prozentangabe üblicherweise ein Aufschlag ist. */
const PAUSCHALEN_POSTEN_RE =
  /pauschale|overhead|gemeinkosten|verwaltungskosten|verwaltungsaufwand|verwaltungsgemeinkosten/i;

export function lesProzentBezug(
  bezeichnung: string,
  kategorie?: Finanzposten["kategorie"]
): ProzentBezug | null {
  const satz = lesProzentsatz(bezeichnung);
  if (satz === null) return null;

  const treffer = bezeichnung.match(/\d{1,2}(?:[.,]\d{1,2})?\s*%/);
  const nachDemSatz = treffer ? bezeichnung.slice((treffer.index ?? 0) + treffer[0].length) : "";

  for (const [re, kat, label] of KATEGORIE_STICHWORT) {
    if (re.test(nachDemSatz)) return { satz, art: "kategorie", kategorie: kat, label };
  }
  if (GESAMT_RE.test(nachDemSatz)) return { satz, art: "gesamt", label: "die Gesamtkosten" };
  if (AUSGABEN_RE.test(nachDemSatz)) return { satz, art: "uebrige", label: "alle übrigen Posten" };

  // Steht nach dem Prozentzeichen noch ein Wort, ist eine Bezugsgrösse genannt,
  // die wir nicht kennen ("20 % der Pauschale") → nicht prüfbar.
  if (/[A-Za-zÄÖÜäöüß]{3,}/.test(nachDemSatz)) return null;

  // Gar kein Bezug genannt: Die Aufschlag-Lesart gilt nur, wenn der Posten sie
  // trägt — sonst ist die Zahl womöglich ein Stellenanteil.
  const istPauschale = kategorie === "overhead" || PAUSCHALEN_POSTEN_RE.test(bezeichnung);
  if (!istPauschale) return null;
  return { satz, art: "uebrige", label: "alle übrigen Posten" };
}


export interface ProzentAbweichung {
  posten: Finanzposten;
  bezug: ProzentBezug;
  /** Die Bezugsgrösse in EUR, wie sie im Plan tatsächlich dasteht. */
  grundlage: number;
  /** Der rechnerisch richtige Betrag. */
  soll: number;
}

/**
 * Die EINE Stelle, an der Prozent-Posten nachgerechnet werden. Prüfung
 * (pruefeArithmetik), Pipeline-Korrektur (korrigiereProzentPosten) und der
 * Autofix-Knopf im Editor lesen alle hier — sonst korrigiert die eine Stelle
 * etwas, das die andere gleich wieder anmahnt.
 *
 * Eigenanteil-Posten bleiben bewusst aussen vor. Ihr Prozentsatz bezieht sich
 * auf die Richtlinien-Quote, die `validateFinanzplan` und `checkFoerderquote`
 * ohnehin prüfen — und der Autofix legt Eigenanteil-Posten mit einer
 * Bezeichnung wie "Eigenanteil Schulträger (Aufstockung auf 20 %)" an, deren
 * Betrag ein Fehlbetrag ist und gerade NICHT 20 % der übrigen Posten. Ohne
 * diese Ausnahme meldet die Prüfung den eigenen Autofix als Rechenfehler.
 */
export function findeProzentAbweichungen(posten: Finanzposten[]): ProzentAbweichung[] {
  const out: ProzentAbweichung[] = [];
  for (const p of posten ?? []) {
    if (p.eigenanteil) continue;
    const bezug = lesProzentBezug(p.bezeichnung ?? "", p.kategorie);
    if (!bezug) continue;

    const andere =
      bezug.art === "kategorie"
        ? posten.filter((x) => x.id !== p.id && x.kategorie === bezug.kategorie)
        : posten.filter((x) => x.id !== p.id);
    const grundlage = andere.reduce((s, x) => s + x.betragEur, 0);
    // Grundlage nicht im Plan vorhanden (z. B. "% der Personalkosten" ohne
    // Personalposten) → nicht prüfbar. Lieber schweigen als raten.
    if (grundlage <= 0) continue;

    const soll =
      bezug.art === "gesamt"
        ? Math.round((grundlage * bezug.satz) / (100 - bezug.satz))
        : Math.round((grundlage * bezug.satz) / 100);
    if (Math.abs(p.betragEur - soll) <= RUNDUNGS_TOLERANZ_EUR) continue;
    out.push({ posten: p, bezug, grundlage, soll });
  }
  return out;
}

/** Höchstzahl der Korrektur-Runden (mehrere Prozent-Posten hängen voneinander ab). */
const MAX_KORREKTUR_RUNDEN = 5;

export interface ProzentKorrektur {
  postenId: string;
  bezeichnung: string;
  satz: number;
  grundlage: number;
  alt: number;
  neu: number;
  label: string;
}

/**
 * Rechnet Prozent-Posten in der Pipeline still richtig — Paket 4 aus
 * Tester-Feedback #008.
 *
 * Bis 20.08.2026 gab es dafür nur einen Autofix-Knopf im Editor. Der Wunsch
 * des Testers war ausdrücklich, den Fehler gar nicht erst zu sehen: Die
 * Bezeichnung nennt den Satz ("7 % der anerkannten Ausgaben"), die übrigen
 * Posten stehen im selben Plan — der richtige Betrag ist damit vollständig
 * bestimmt, es gibt nichts zu raten und nichts zu erfinden. Genau das ist der
 * Unterschied zur Herleitung grosser Posten, wo die fehlende Grösse NUR der
 * Antragsteller kennt (siehe finanzplan-herleitung.ts).
 *
 * Mehrere Prozent-Posten beziehen sich aufeinander; deshalb wird bis zur
 * Stabilität iteriert. Konvergiert es nicht (Sonderfall zweier sich
 * gegenseitig aufschaukelnder Sätze), bleibt der letzte Stand stehen und
 * `pruefeArithmetik` meldet die Restabweichung wie bisher.
 */
export function korrigiereProzentPosten(posten: Finanzposten[]): {
  posten: Finanzposten[];
  korrekturen: ProzentKorrektur[];
} {
  const urspruenglich = new Map((posten ?? []).map((p) => [p.id, p.betragEur]));
  let aktuell = posten ?? [];
  const gesehen = new Map<string, ProzentKorrektur>();

  for (let runde = 0; runde < MAX_KORREKTUR_RUNDEN; runde++) {
    const abweichungen = findeProzentAbweichungen(aktuell);
    if (abweichungen.length === 0) break;
    for (const a of abweichungen) {
      aktuell = aktuell.map((x) => (x.id === a.posten.id ? { ...x, betragEur: a.soll } : x));
      gesehen.set(a.posten.id, {
        postenId: a.posten.id,
        bezeichnung: a.posten.bezeichnung,
        satz: a.bezug.satz,
        grundlage: a.grundlage,
        alt: urspruenglich.get(a.posten.id) ?? a.posten.betragEur,
        neu: a.soll,
        label: a.bezug.label,
      });
    }
  }

  // Korrekturen, die sich über die Runden zur Nulländerung aufgehoben haben,
  // sind keine — sonst behauptet der Hinweis eine Änderung, die nicht stattfand.
  const korrekturen = [...gesehen.values()]
    .map((k) => ({ ...k, neu: aktuell.find((p) => p.id === k.postenId)?.betragEur ?? k.neu }))
    .filter((k) => k.alt !== k.neu);
  return { posten: aktuell, korrekturen };
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
  for (const a of findeProzentAbweichungen(posten)) {
    const { posten: p, bezug, grundlage, soll } = a;
    // Was WÄRE die Bezugsgröße, die den angesetzten Betrag erklärt? Diese Zahl
    // macht den Fehler nachvollziehbar, statt nur "stimmt nicht" zu sagen.
    const impliziert =
      bezug.art === "gesamt"
        ? Math.round((p.betragEur * (100 - bezug.satz)) / bezug.satz)
        : Math.round((p.betragEur * 100) / bezug.satz);
    warnungen.push({
      level: "error",
      message:
        `Posten "${p.bezeichnung}": ${bezug.satz} % von ${grundlage.toLocaleString("de-DE")} EUR ` +
        `(${bezug.label}) ergibt ${soll.toLocaleString("de-DE")} EUR, angesetzt sind aber ` +
        `${p.betragEur.toLocaleString("de-DE")} EUR (Differenz ` +
        `${(p.betragEur - soll).toLocaleString("de-DE")} EUR). ` +
        `Der angesetzte Betrag entspräche ${bezug.satz} % von ${impliziert.toLocaleString("de-DE")} EUR — ` +
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
