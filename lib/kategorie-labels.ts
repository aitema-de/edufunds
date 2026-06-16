// Anzeige-Labels fuer Kategorie-Slugs.
//
// Die Slugs in data/foerderprogramme.json sind ASCII-kodiert (z.B. "ki",
// "mint", "kuenste", "politische-bildung"). Die frueher genutzte naive
// Grossschreibung (`slug.charAt(0).toUpperCase() + slug.slice(1)`) erzeugte
// daraus "Ki", "Mint", "Kuenste" und "Politische bildung" — Akronyme wurden
// klein, Umlaute fehlten, und bei Mehrwort-Begriffen blieb nur das erste Wort
// gross. Dieses Woerterbuch korrigiert genau diese drei Faelle; alles andere
// deckt der Fallback ab.

const KATEGORIE_LABELS: Record<string, string> = {
  // Akronyme (komplett gross)
  "3d-druck": "3D-Druck",
  ki: "KI",
  mint: "MINT",
  bne: "BNE",
  oer: "OER",
  sdg: "SDG",
  vr: "VR",

  // Mehrwort-Begriffe (jedes Wort gross)
  "bildende-kunst": "Bildende Kunst",
  "digitale-bildung": "Digitale Bildung",
  "globales-lernen": "Globales Lernen",
  "internationale-begegnung": "Internationale Begegnung",
  "kinder-jugend": "Kinder & Jugend",
  "kulturelle-bildung": "Kulturelle Bildung",
  "laendlicher-raum": "Ländlicher Raum",
  "peer-learning": "Peer-Learning",
  "politische-bildung": "Politische Bildung",
  "service-learning": "Service-Learning",

  // Umlaut-Wiederherstellung (Slug ist ASCII, Anzeige mit Umlaut)
  ernaehrung: "Ernährung",
  extremismuspraevention: "Extremismusprävention",
  foerderung: "Förderung",
  fruehfoerderung: "Frühförderung",
  gewaltpraevention: "Gewaltprävention",
  heterogenitaet: "Heterogenität",
  internationalitaet: "Internationalität",
  kreativitaet: "Kreativität",
  kuenste: "Künste",
  lernrueckstand: "Lernrückstand",
  mobilitaet: "Mobilität",
  oekologie: "Ökologie",
  persoenlichkeitsentwicklung: "Persönlichkeitsentwicklung",
  praevention: "Prävention",
  qualitaet: "Qualität",
  raetsel: "Rätsel",
  schuelerfirma: "Schülerfirma",
  tuerkei: "Türkei",
  ueberblick: "Überblick",
  uebergang: "Übergang",
  ueberoertlich: "Überörtlich",
  voelkerverstaendigung: "Völkerverständigung",
};

/**
 * Wandelt einen Kategorie-Slug in ein anzeigbares Label.
 * Bekannte Sonderfaelle (Akronyme, Mehrwort, Umlaute) kommen aus dem
 * Woerterbuch; alles andere wird wortweise grossgeschrieben.
 */
export function formatKategorie(slug: string): string {
  if (!slug) return "";
  const key = slug.toLowerCase().trim();
  if (KATEGORIE_LABELS[key]) return KATEGORIE_LABELS[key];
  return key
    .split("-")
    .map((wort) => (wort ? wort.charAt(0).toUpperCase() + wort.slice(1) : wort))
    .join(" ");
}
