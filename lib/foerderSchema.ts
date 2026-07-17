// EduFunds Förderdatenbank - Schema

import type {
  FristZustand,
  UmfangZustand,
  EinreichungsForm,
} from "@/lib/foerder-zustaende";

/**
 * Die Status-Werte, die der Katalog tatsächlich führt.
 * Stand 17.07.2026: aktiv=157, archiviert=32, review_needed=0.
 *
 * EINE Quelle der Wahrheit — `lib/programm-status.ts` (Verkaufs-Gate) und
 * `scripts/validate-data.ts` leiten von hier ab. Vorher stand die Liste dreimal
 * im Code, in drei widersprüchlichen Fassungen: Dieser Typ und der Validator
 * kannten `archiviert` NICHT (obwohl 32 Programme ihn tragen), führten dafür
 * `auslaufend`/`pausiert`/`beendet`, die der Katalog nie setzt — und das Gate
 * behandelte `pausiert` nicht als Ausschluss. Ein pausiertes Programm wäre also
 * weiter verkauft worden.
 *
 * Wer hier einen Wert ergänzt, muss in `lib/programm-status.ts` entscheiden, ob
 * er anbietbar ist. Default dort ist fail-closed: nicht anbietbar.
 */
export const PROGRAMM_STATUS = ["aktiv", "archiviert", "review_needed"] as const;

export type ProgrammStatus = (typeof PROGRAMM_STATUS)[number];

export type Foerderprogramm = {
  id: string;                    // UUID
  name: string;                  // Programmname
  foerdergeber: string;          // z.B. "BKM", "DAAD", "Stiftung XY"
  foerdergeberTyp: 'bund' | 'land' | 'eu' | 'stiftung' | 'sonstige';
  
  // Zielgruppe
  schulformen: ('grundschule' | 'hauptschule' | 'realschule' | 'gymnasium' | 'gesamtschule' | 'iss' | 'iss-mit-go' | 'foerderschule' | 'berufsschule')[];
  bundeslaender: string[];       // z.B. ["DE-BY", "DE-BE"] oder ["alle"]
  
  // Förderdetails
  foerdersummeMin?: number;      // in EUR
  foerdersummeMax?: number;      // in EUR
  foerdersummeText?: string;     // z.B. "bis zu 80% der zuwendungsfähigen Kosten"
  foerderquote?: string;         // z.B. "80%", "max. 50.000€"
  
  // Themen/Bereiche
  kategorien: string[];          // z.B. ["digitalisierung", "kunst", "sport", "sanierung"]
  
  // Bewerbung
  bewerbungsfristStart?: string; // ISO Date
  bewerbungsfristEnde?: string;  // ISO Date
  bewerbungsfristText?: string;  // z.B. "laufend", "quartalsweise" (Freitext, kein Code liest ihn)
  bewerbungsart: 'online' | 'schriftlich' | 'beides';

  /**
   * Maschinenlesbarer Frist-Zustand (loest bewerbungsfristEnde/-Text als
   * Verkaufs-Wahrheit ab). Trennt "belegt rollend" von "nicht erfasst".
   * Fehlt das Feld, faellt das Gate auf bewerbungsfristEnde zurueck — diese
   * Programme sind noch nicht migriert (getrackt in
   * __tests__/data/katalog-fristen.test.ts). Fail-closed: art="unbekannt" =>
   * nicht verkaeuflich. Entscheidung in lib/programm-status.ts.
   */
  fristZustand?: FristZustand;
  /** Maschinenlesbarer Umfang (Laengenbegrenzung des Antrags). Nicht verkaufs-kritisch. */
  umfangZustand?: UmfangZustand;
  /** Strukturierte Einreichungsform (loest Freitext ab). Nicht verkaufs-kritisch. */
  einreichungsForm?: EinreichungsForm;
  
  // Kontakt & Links
  antragsLink?: string;          // URL zum Antrag
  infoLink: string;              // URL zur Programmbeschreibung
  kontaktEmail?: string;
  kontaktTelefon?: string;
  
  // Beschreibung
  kurzbeschreibung: string;      // 1-2 Sätze (max 300 Zeichen)
  beschreibung?: string;         // Volltext
  
  // Status — Werte s. PROGRAMM_STATUS oben.
  status: ProgrammStatus;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;       // Wann wurde das Programm zuletzt geprüft?
  
  // Zusätzliche Felder (aus Daten)
  bemerkung?: string;            // Interne Notizen/Archiv-Info
  quelleUrl?: string;            // Alternative URL-Quelle
  verifiziertAm?: string;        // Verifizierungsdatum
  verifiziertVon?: string;       // Wer hat verifiziert
  reviewNotiz?: string;          // Review-Notizen
  verificationWarning?: string;  // Verifizierungs-Warnung
  
  // Quelle
  quelle: string;                // z.B. "bkm.bund.de", "km.bayern.de"
  
  // KI-Unterstützung
  kiAntragGeeignet: boolean;     // Eignet sich für KI-Antragsassistent?
  kiHinweise?: string;           // Tipps für den Antrag
}

// Beispieleintrag:
const beispiel: Foerderprogramm = {
  id: "bkm-digital-2024",
  name: "Kultur Digital",
  foerdergeber: "Bundesministerium für Kultur und Medien (BKM)",
  foerdergeberTyp: "bund",
  schulformen: ["grundschule", "hauptschule", "realschule", "gymnasium", "gesamtschule"],
  bundeslaender: ["alle"],
  foerdersummeMin: 10000,
  foerdersummeMax: 100000,
  foerdersummeText: "bis zu 80% der zuwendungsfähigen Kosten",
  kategorien: ["digitalisierung", "kultur", "medienkompetenz"],
  bewerbungsfristStart: "2025-01-15",
  bewerbungsfristEnde: "2025-03-31",
  bewerbungsfristText: "15.01. - 31.03.2025",
  bewerbungsart: "online",
  antragsLink: "https://...",
  infoLink: "https://www.bkm.de/...",
  kontaktEmail: "digital@bkm.de",
  kurzbeschreibung: "Förderung für Digitalisierungsprojekte in kulturellen Bildungseinrichtungen.",
  status: "aktiv",
  createdAt: "2025-02-04T00:00:00Z",
  updatedAt: "2025-02-04T00:00:00Z",
  lastVerifiedAt: "2025-02-04T00:00:00Z",
  quelle: "bkm.bund.de",
  kiAntragGeeignet: true,
  kiHinweise: "Projektbeschreibung sollte digitale Zielgruppenansprache betonen."
};
