/**
 * 86cabdzwk: Per-Programm-Dokumentlabel fuer die Wizard-UI.
 * ---------------------------------------------------------
 * Default ist "Antrag"/"Antragstext". Programme, deren Deliverable kein Antrag
 * ist (DigitalPakt: die Schule erstellt ein Medienkonzept, den foermlichen
 * Antrag stellt der Schultraeger), setzen im Richtlinien-Dossier
 * `dokumentLabel` (+ optional `dokumentLabelGenus`), und die UI beschriftet
 * Generierung, Paywall, Ergebnis und Checkout-Success entsprechend.
 *
 * Pure Utility, client-sicher.
 */

export interface DokumentLabels {
  /** Nominativ, z. B. "Antrag" | "Medienkonzept". */
  dokument: string;
  /** Fliesstext-Label, z. B. "Antragstext" | "Medienkonzept". */
  text: string;
  /** Mit Possessiv im Nominativ/Akkusativ, z. B. "Ihr Antrag" (Nom). */
  ihr: string;
  /** Mit Possessiv im Akkusativ, z. B. "Ihren Antrag" | "Ihr Medienkonzept". */
  ihrAkk: string;
  /** Mit bestimmtem Artikel (Nominativ), z. B. "der Antrag" | "das Medienkonzept". */
  der: string;
  /** Bestimmter Artikel im Akkusativ + Label, z. B. "den Antrag" | "das Medienkonzept". */
  den: string;
  /** Entwurfs-Ueberschrift, z. B. "Antragsentwurf" | "Medienkonzept-Entwurf". */
  entwurf: string;
  /** Dateinamen-Praefix (ASCII-sicher), z. B. "Foerderantrag" | "Medienkonzept". */
  datei: string;
}

export function dokumentLabels(
  label?: string | null,
  genus?: "der" | "die" | "das" | null
): DokumentLabels {
  const dokument = (label ?? "").trim() || "Antrag";
  const isDefault = dokument === "Antrag";
  const g = genus ?? (isDefault ? "der" : "das");
  const ihr = g === "der" ? `Ihr ${dokument}` : g === "die" ? `Ihre ${dokument}` : `Ihr ${dokument}`;
  const ihrAkk =
    g === "der" ? `Ihren ${dokument}` : g === "die" ? `Ihre ${dokument}` : `Ihr ${dokument}`;
  const den = g === "der" ? `den ${dokument}` : g === "die" ? `die ${dokument}` : `das ${dokument}`;
  return {
    dokument,
    text: isDefault ? "Antragstext" : dokument,
    ihr,
    ihrAkk,
    der: `${g} ${dokument}`,
    den,
    entwurf: isDefault ? "Antragsentwurf" : `${dokument}-Entwurf`,
    datei: isDefault
      ? "Foerderantrag"
      : dokument.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^A-Za-z0-9_-]/g, "_"),
  };
}
