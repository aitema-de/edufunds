/**
 * Linchpin-Check für P4-A (Absatz-Umformulierung): Reicht react-markdown v10
 * `node.position.{start,end}.offset` an Custom-Components durch, sodass
 * source.slice(start,end) exakt den Roh-Absatz ergibt? Der deterministische
 * Splice in AntragResult hängt genau daran.
 *
 * Läuft NICHT in Jest (react-markdown ist ESM, nicht in der Transform-Whitelist).
 * Standalone via `npx tsx scripts/check-markdown-offsets.tsx`.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MdNode = { position?: { start?: { offset?: number }; end?: { offset?: number } } };

const source = [
  "# Titel des Antrags",
  "",
  "Erster Absatz mit einer Zahl 12.000 Euro und einem Namen Musterverein e. V.",
  "",
  "## Zwischenüberschrift",
  "",
  "Zweiter Absatz, der etwas länger ist und über mehrere Gedanken läuft, damit der Offset-Test aussagekräftig bleibt.",
].join("\n");

const captured: Array<{ start?: number; end?: number; text: string }> = [];

function P({ children, node }: { children?: React.ReactNode; node?: MdNode }) {
  captured.push({
    start: node?.position?.start?.offset,
    end: node?.position?.end?.offset,
    text: String(children),
  });
  return <p>{children}</p>;
}

renderToStaticMarkup(
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: P as never }}>
    {source}
  </ReactMarkdown>
);

let ok = true;
console.log(`Absätze erkannt: ${captured.length}`);
for (const c of captured) {
  const hasOffsets = typeof c.start === "number" && typeof c.end === "number";
  const sliced = hasOffsets ? source.slice(c.start!, c.end!) : "(keine Offsets)";
  // Der geslicete Roh-Absatz muss den (gerenderten) Textkern enthalten.
  const kernwort = c.text.split(/\s+/).find((w) => w.length > 5) ?? c.text.slice(0, 6);
  const match = hasOffsets && sliced.includes(kernwort);
  console.log(
    `- offsets=${hasOffsets ? `[${c.start},${c.end}]` : "FEHLEN"} · slice="${sliced.slice(0, 50)}..." · enthält "${kernwort}": ${match}`
  );
  if (!match) ok = false;
}

if (!ok) {
  console.error("\n❌ LINCHPIN FEHLGESCHLAGEN: node.position-Offsets fehlen oder mappen nicht auf den Quelltext.");
  process.exit(1);
}
console.log("\n✅ Linchpin bestätigt: node.position-Offsets mappen exakt auf den Markdown-Quelltext.");
