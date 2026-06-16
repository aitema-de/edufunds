/**
 * Konvertiert den (Markdown-)Antragstext in ein RTF-Dokument.
 *
 * RTF ist ein offenes Format, das Pages, Word, LibreOffice und Google Docs
 * sowohl OEFFNEN als auch BEARBEITEN koennen — anders als PDF (nur Ansicht)
 * oder das fragile .doc=HTML (laesst sich auf Mac/Pages nicht zuverlaessig
 * oeffnen). Deshalb ist RTF der Default-Download fuer Antraege, die der Nutzer
 * noch anpassen will.
 *
 * Bewusst schlank gehalten: leichte Markdown-Strukturen (Ueberschriften, Listen,
 * **fett**) werden uebernommen, Tabellenzeilen bleiben als lesbarer Text stehen.
 * Voll-Markdown→RTF mit echten Tabellen waere fragil und ist hier nicht noetig.
 */

const RTF_HEADER =
  "{\\rtf1\\ansi\\ansicpg1252\\deff0" +
  "{\\fonttbl{\\f0\\froman Times New Roman;}}" +
  "\\fs24\n"; // \fs24 = 12pt (RTF misst in Half-Points)

/** Escaped Sonderzeichen und kodiert Nicht-ASCII (Umlaute, ß, €, …) als \uN?. */
function escapeRtf(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\") {
      out += "\\\\";
      continue;
    }
    if (ch === "{") {
      out += "\\{";
      continue;
    }
    if (ch === "}") {
      out += "\\}";
      continue;
    }
    const code = s.charCodeAt(i); // 0..65535; Surrogate-Paare werden je Unit kodiert
    if (code < 128) {
      out += ch;
    } else {
      // RTF erwartet einen signed 16-Bit-Wert; > 32767 negativ darstellen.
      const u = code > 32767 ? code - 65536 : code;
      out += `\\u${u}?`;
    }
  }
  return out;
}

/** Inline-Markdown einer Zeile in RTF-Runs umsetzen (**fett**, Rest bereinigt). */
function inlineToRtf(s: string): string {
  // An **…** splitten: ungerade Segmente liegen zwischen den Markern = fett.
  const parts = s.split("**");
  let out = "";
  parts.forEach((part, i) => {
    const cleaned = part.replace(/\*/g, "").replace(/`/g, "");
    const esc = escapeRtf(cleaned);
    out += i % 2 === 1 ? `\\b ${esc}\\b0 ` : esc;
  });
  return out;
}

export function markdownToRtf(markdown: string, title?: string): string {
  const lines = (markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const body: string[] = [];

  if (title && title.trim()) {
    body.push(`\\b\\fs36 ${inlineToRtf(title.trim())}\\b0\\fs24\\par\\par`);
  }

  for (const raw of lines) {
    const line = raw.replace(/\t/g, " ").trimEnd();
    if (line.trim() === "") {
      body.push("\\par");
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) {
      body.push("\\par");
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^###\s+(.*)$/))) {
      body.push(`\\b\\fs26 ${inlineToRtf(m[1])}\\b0\\fs24\\par`);
    } else if ((m = line.match(/^##\s+(.*)$/))) {
      body.push(`\\b\\fs30 ${inlineToRtf(m[1])}\\b0\\fs24\\par`);
    } else if ((m = line.match(/^#\s+(.*)$/))) {
      body.push(`\\b\\fs36 ${inlineToRtf(m[1])}\\b0\\fs24\\par`);
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      body.push(`\\bullet\\tab ${inlineToRtf(m[1])}\\par`);
    } else {
      body.push(`${inlineToRtf(line)}\\par`);
    }
  }

  return RTF_HEADER + body.join("\n") + "}";
}
