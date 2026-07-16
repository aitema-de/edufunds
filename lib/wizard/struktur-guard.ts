/**
 * Struktur-Guard (Pilot-Befund "Textumfang", 15.07.2026)
 * ======================================================
 * Ein Pilot-Tester erhielt fuer die Heinz-Nixdorf-Stiftung einen Antragsentwurf mit
 * nur ~2 sichtbaren Abschnitten, obwohl das Dossier 5 Pflichtabschnitte definiert.
 *
 * Ursache: Der ausgelieferte `finalText` ist eine freie LLM-Neufassung (REVISION-Stufe)
 * des Entwurfs. Das produktiv erzwungene EU-Modell (mistral-small) kann bei duennem
 * Nutzer-Input Abschnitte verschmelzen oder streichen, sodass der sichtbare Text auf
 * wenige Abschnitte kollabiert — waehrend das Zwischenprodukt `sections[]` (das kein
 * Eval und keine UI je zeigt) weiterhin alle Abschnitte enthaelt.
 *
 * Dieser Guard ist rein deterministisch (kein LLM): Er vergleicht die im `finalText`
 * vorhandenen H2-Ueberschriften mit den vorgesehenen Abschnitten (`outline.abschnitte`)
 * und setzt fehlende Abschnitte aus `sections[]` an ihrer vorgesehenen Position wieder ein.
 * Bereits vorhandene (revidierte) Abschnitte bleiben unveraendert — der Guard kann die
 * Struktur nie verschlechtern, nur fehlende Teile ergaenzen.
 *
 * Platzierung in der Pipeline: direkt NACH der Revision und VOR dem Halluzinations-/
 * Fakt-Verifikations-Gate, damit re-injizierter Abschnittstext dieselben
 * Ehrlichkeitspruefungen (Marker, Fakt-Check) durchlaeuft wie regulaerer Text.
 */

export interface StrukturOutline {
  titel: string;
  abschnitte: Array<{ name: string; fokus: string }>;
}

export interface StrukturGuardResult {
  text: string;
  /** Namen der Abschnitte, die deterministisch wieder eingesetzt wurden (leer = keine Aenderung). */
  reinjected: string[];
}

/** Normalisiert eine Ueberschrift fuer den toleranten Vergleich ("Ziele & Wirkung" ~ "ziele und wirkung"). */
function normHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " und ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Diakritika
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** true, wenn zwei Ueberschriften denselben Abschnitt meinen (Gleichheit oder Substring in beide Richtungen). */
function headingsMatch(a: string, b: string): boolean {
  const na = normHeading(a);
  const nb = normHeading(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

interface ParsedBlock {
  heading: string;
  /** Vollstaendiger Block inkl. "## Ueberschrift"-Zeile und Inhalt. */
  raw: string;
}

interface ParsedDoc {
  h1: string | null;
  preamble: string;
  blocks: ParsedBlock[];
}

/** Zerlegt einen Markdown-Antragstext in H1-Titel, optionale Praeambel und H2-Bloecke. */
function parseDoc(text: string): ParsedDoc {
  const lines = text.split("\n");
  let h1: string | null = null;
  const blocks: ParsedBlock[] = [];
  const preambleLines: string[] = [];
  let cur: { heading: string; lines: string[] } | null = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    const h1m = line.match(/^#\s+(.+?)\s*$/); // matcht NICHT "## " (kein Whitespace nach erstem #)
    if (h2) {
      if (cur) blocks.push({ heading: cur.heading, raw: cur.lines.join("\n").trim() });
      cur = { heading: h2[1].trim(), lines: [line] };
    } else if (h1m && cur === null && h1 === null) {
      h1 = h1m[1].trim();
    } else if (cur) {
      cur.lines.push(line);
    } else {
      preambleLines.push(line);
    }
  }
  if (cur) blocks.push({ heading: cur.heading, raw: cur.lines.join("\n").trim() });
  return { h1, preamble: preambleLines.join("\n").trim(), blocks };
}

/**
 * Stellt sicher, dass jeder vorgesehene Abschnitt im finalText vertreten ist. Fehlende
 * Abschnitte werden aus `sections[]` an ihrer vorgesehenen Position wieder eingesetzt.
 * No-Op (Original unveraendert), wenn nichts fehlt, weniger als 2 Abschnitte vorgesehen
 * sind oder fuer die fehlenden Abschnitte kein generierter Text vorliegt.
 */
export function ensureSectionsPresent(
  finalText: string,
  outline: StrukturOutline | undefined,
  sections: Array<{ name: string; text: string }> | undefined
): StrukturGuardResult {
  const text = finalText ?? "";
  const intended = outline?.abschnitte ?? [];
  if (intended.length < 2 || !sections || sections.length === 0) {
    return { text, reinjected: [] };
  }

  const sectionText = new Map<string, string>();
  for (const s of sections) {
    if (s && typeof s.name === "string") sectionText.set(s.name, s.text ?? "");
  }

  const { h1, preamble, blocks } = parseDoc(text);

  // Welche vorgesehenen Abschnitte sind durch KEINEN Block vertreten?
  const missing = intended.filter(
    (a) => !blocks.some((b) => headingsMatch(b.heading, a.name))
  );
  // Nur solche wieder einsetzen, fuer die wir generierten Text haben.
  const reinjectable = missing.filter((a) => (sectionText.get(a.name) ?? "").trim().length > 0);
  if (reinjectable.length === 0) {
    return { text, reinjected: [] };
  }

  // Neu zusammensetzen: vorgesehene Reihenfolge, vorhandene (revidierte) Bloecke
  // unveraendert uebernehmen, fehlende aus sections[] einsetzen.
  const used = new Set<number>();
  const parts: string[] = [];
  const title = h1 ?? outline?.titel;
  if (title) parts.push(`# ${title}`);
  if (preamble) parts.push(preamble);

  for (const a of intended) {
    const idx = blocks.findIndex((b, i) => !used.has(i) && headingsMatch(b.heading, a.name));
    if (idx >= 0) {
      used.add(idx);
      parts.push(blocks[idx].raw);
    } else {
      const st = (sectionText.get(a.name) ?? "").trim();
      if (st) parts.push(`## ${a.name}\n\n${st}`);
    }
  }
  // Nicht zugeordnete Bloecke anhaengen, damit kein Inhalt verloren geht.
  blocks.forEach((b, i) => {
    if (!used.has(i)) parts.push(b.raw);
  });

  return { text: parts.join("\n\n"), reinjected: reinjectable.map((a) => a.name) };
}
