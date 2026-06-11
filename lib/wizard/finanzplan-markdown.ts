import type { Finanzplan, Finanzposten } from "./types";

const KATEGORIE_LABEL: Record<Finanzposten["kategorie"], string> = {
  personal: "Personalkosten",
  sachkosten: "Sachkosten",
  investitionen: "Investitionen",
  honorare: "Honorare",
  reisekosten: "Reisekosten",
  overhead: "Overhead",
  sonstiges: "Sonstiges",
};

function formatEur(n: number): string {
  return n.toLocaleString("de-DE") + " EUR";
}

/**
 * Wandelt einen Finanzplan in einen Markdown-Abschnitt (H2 + GFM-Tabelle + Summary).
 * Fuer Copy/Download-Zwecke gedacht, damit Antragstext + Plan in einem Rutsch uebergehen.
 */
export function renderFinanzplanMarkdown(plan: Finanzplan): string {
  const gesamt = plan.posten.reduce((s, p) => s + p.betragEur, 0);
  const foerder = plan.posten.filter((p) => !p.eigenanteil).reduce((s, p) => s + p.betragEur, 0);
  const eigen = gesamt - foerder;

  const lines: string[] = [];
  lines.push("");
  lines.push("## Finanzplan");
  lines.push("");
  if (plan.posten.length === 0) {
    if (plan.unbeziffert && plan.kostenrahmen?.length) {
      lines.push(
        "Es liegen noch keine Kostenangaben vor. Der Finanzplan ist daher noch **unbeziffert** — die folgenden Positionen werden vor Einreichung durch Angebote beziffert:"
      );
      lines.push("");
      for (const k of plan.kostenrahmen) lines.push(`- ${k}`);
      if (plan.hinweise?.length) {
        lines.push("");
        for (const h of plan.hinweise) lines.push(`> ${h}`);
      }
      return lines.join("\n");
    }
    lines.push("_Kein Finanzplan hinterlegt._");
    return lines.join("\n");
  }

  lines.push("| Posten | Kategorie | Typ | Betrag |");
  lines.push("|--------|-----------|-----|-------:|");
  const hatVorschlaege = plan.posten.some((p) => p.istVorschlag);
  for (const p of plan.posten) {
    // Vorschläge des Assistenten sichtbar als bestätigbar markieren (Produktvision):
    // der Nutzer soll erkennen, welche Beträge er noch bestätigen/anpassen muss.
    const marker = p.istVorschlag ? " ⟨Vorschlag⟩" : "";
    const bez = p.begruendung
      ? `${p.bezeichnung}${marker}<br><sub>${p.begruendung}</sub>`
      : `${p.bezeichnung}${marker}`;
    const typ = p.eigenanteil ? "Eigenanteil" : "Förderung";
    lines.push(
      `| ${bez} | ${KATEGORIE_LABEL[p.kategorie]} | ${typ} | ${formatEur(p.betragEur)} |`
    );
  }
  lines.push("");
  lines.push(`**Gesamtvolumen:** ${formatEur(gesamt)}  `);
  lines.push(`**davon Förderung:** ${formatEur(foerder)}  `);
  if (eigen > 0) lines.push(`**Eigenanteil:** ${formatEur(eigen)}  `);
  if (hatVorschlaege) {
    lines.push(
      `_⟨Vorschlag⟩ = vom Assistenten vorgeschlagener Betrag — bitte bestätigen oder anpassen._  `
    );
  }
  if (plan.legitimiertAm) {
    lines.push("");
    lines.push(`_Finanzplan freigegeben am ${new Date(plan.legitimiertAm).toLocaleDateString("de-DE")}._`);
  }
  return lines.join("\n");
}
