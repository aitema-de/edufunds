// EduFunds Förderdatenbank - Schema

export type Foerderprogramm = {
  id: string;                    // UUID
  name: string;                  // Programmname
  foerdergeber: string;          // z.B. "BKM", "DAAD", "Stiftung XY"
  foerdergeberTyp: 'bund' | 'land' | 'eu' | 'stiftung' | 'sonstige';
  
  // Zielgruppe
  schulformen: ('grundschule' | 'hauptschule' | 'realschule' | 'gymnasium' | 'gesamtschule' | 'foerderschule' | 'berufsschule')[];
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
  bewerbungsfristText?: string;  // z.B. "laufend", "quartalsweise"
  bewerbungsart: 'online' | 'schriftlich' | 'beides';
  
  // Kontakt & Links
  antragsLink?: string;          // URL zum Antrag
  infoLink: string;              // URL zur Programmbeschreibung
  kontaktEmail?: string;
  kontaktTelefon?: string;
  
  // Beschreibung
  kurzbeschreibung: string;      // 1-2 Sätze (max 300 Zeichen)
  beschreibung?: string;         // Volltext
  
  // Status
  status: 'aktiv' | 'auslaufend' | 'pausiert' | 'beendet' | 'abgelaufen';
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
