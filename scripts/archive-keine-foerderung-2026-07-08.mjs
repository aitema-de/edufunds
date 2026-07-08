// Einmal-Redaktionsskript (2026-07-08): archiviert aktive Programme, die selbst
// dokumentieren, dass es KEINE Antragsmoeglichkeit/Foerderung fuer (Einzel-)Schulen gibt
// (reine Investitions-, Sach- oder Schuelerangebote). Klasse-B-Programme, bei denen die
// Schule ueber ihren Foerderverein/Traeger Geld bekommt, bleiben bewusst AKTIV.
// Konvention wie Redaktionsentscheid 2026-07-07 (mercator-digitalisierung): status='archiviert'
// + Redaktionsnotiz an bemerkung.
import { readFileSync, writeFileSync } from "node:fs";

const PATH = "data/foerderprogramme.json";
const STAMP = "2026-07-08T00:00:00.000Z";

// id -> spezifischer Archivierungsgrund
const GRUENDE = {
  "bne-portal-foerderung":
    "Informationsportal ohne eigene Foerderung (nur Uebersicht ueber Landesprogramme) - keine Antragsmoeglichkeit.",
  "bfn-artenvielfalt":
    "Keine Finanzfoerderung fuer Schulen (nur kostenlose Materialkisten); Verbaendefoerderung nur fuer Verbaende - kein Einzelantrag.",
  "hessen-digitaltruck":
    "Reines kostenloses Bildungsangebot (Workshop-Woche), keine Foerdermittel - keine Antragsmoeglichkeit.",
  "sparkassen-luebeck-nachhilfe":
    "Schueler-Nachhilfeprogramm, keine Foerderung fuer Schulen als Antragsteller - keine Antragsmoeglichkeit.",
  "hamburg-schulbau":
    "Reine staedtische Investitionsmittel, keine externe Foerderung fuer Einzelschulen - keine Antragsmoeglichkeit.",
  "mecklenburg-vorpommern-bildung":
    "Bundes-/Landesinvestitionsprogramm (MV-Plan 2035), keine externen Foerderantraege fuer Einzelschulen - keine Antragsmoeglichkeit.",
  "rag-stiftung-schulen":
    "Stiftung foerdert nur eigene langfristige Initiativen mit Partnern, keine offenen Ausschreibungen/Einzelantraege.",
  "volkswagen-belegschaftsstiftung":
    "Stiftung foerdert eigene Projekte an VW-Standorten, keine direkte Antragsmoeglichkeit fuer Einzelschulen.",
  "deutsche-kinderschutz":
    "Beratung/Fortbildung/Projekte ueber externe Partner, keine direkte Finanzfoerderung fuer Einzelschulen - keine Antragsmoeglichkeit.",
};

const progs = JSON.parse(readFileSync(PATH, "utf8"));
const byId = new Map(progs.map((p) => [p.id, p]));

let changed = 0;
for (const [id, grund] of Object.entries(GRUENDE)) {
  const p = byId.get(id);
  if (!p) throw new Error(`FEHLT im Katalog: ${id}`);
  if (p.status === "archiviert") {
    console.log(`skip (schon archiviert): ${id}`);
    continue;
  }
  if (p.status !== "aktiv") throw new Error(`unerwarteter Status '${p.status}' bei ${id}`);
  const note = `Redaktionsentscheid 2026-07-08: archiviert - ${grund}`;
  p.status = "archiviert";
  p.bemerkung = p.bemerkung ? `${p.bemerkung} | ${note}` : note;
  p.updatedAt = STAMP;
  changed++;
  console.log(`archiviert: ${id}`);
}

writeFileSync(PATH, JSON.stringify(progs, null, 2) + "\n", "utf8");
console.log(`\nFertig: ${changed} Programme archiviert.`);
console.log(`aktiv: ${progs.filter((p) => p.status === "aktiv").length}, archiviert: ${progs.filter((p) => p.status === "archiviert").length}, gesamt: ${progs.length}`);
