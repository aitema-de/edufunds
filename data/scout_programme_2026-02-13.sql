-- =============================================================================
-- SCOUT: Neue Förderprogramme (Manuelle Recherche 2026-02-13)
-- Insert-Befehle für die 8 neu identifizierten Programme
-- =============================================================================

-- 1. Robert Bosch Stiftung - Deutscher Schulpreis 2026
INSERT INTO foerderprogramme (
  programm_id, titel, foerdergeber, foerdergeber_typ, beschreibung,
  foerderschwerpunkte, foerderleistung, zielgruppe, bewerbungsfrist,
  bewerbungsfrist_text, foerdersumme_text, website_url, kontakt_telefon,
  status, quelle_recherche, recherche_datum, notizen
) VALUES (
  'scout_2026_001',
  'Deutscher Schulpreis 2026',
  'Robert Bosch Stiftung',
  'Stiftung',
  'Deutschlands renommiertester Schulpreis für innovative Schulkonzepte und qualitativ hochwertigen Unterricht. Prämiert werden Schulen aller Art (allgemeinbildend, beruflich, öffentlich/privat, inkl. deutscher Auslandsschulen).',
  'Unterrichtsqualität; Schulentwicklung; Chancengleichheit; Innovative Ansätze (Mut, Haltung, Ideen); Demokratiebildung',
  'Hauptpreis: 100.000 €; Weitere Preise: je 30.000 €; Alle Bewerber erhalten Jury-Feedback, Austausch und Fortbildungen',
  'Schulen aller Art: allgemeinbildend, beruflich, öffentlich/privat, deutsche Auslandsschulen',
  '2026-01-31',
  '31. Januar 2026',
  'Hauptpreis: 100.000 €; Weitere Preise: je 30.000 €',
  'https://www.deutscher-schulpreis.de',
  '030-220025-273',
  'aktiv',
  'Manuelle Web-Recherche',
  '2026-02-13',
  'Kooperation mit Heidehof Stiftung, ARD, ZEIT Verlagsgruppe. Info-Workshops verfügbar.'
);

-- 2. Stiftung Mercator - Mercator Kolleg 2026/2027
INSERT INTO foerderprogramme (
  programm_id, titel, foerdergeber, foerdergeber_typ, beschreibung,
  foerderschwerpunkte, foerderleistung, zielgruppe, bewerbungsfrist,
  bewerbungsfrist_text, foerdersumme_text, website_url, status,
  quelle_recherche, recherche_datum, notizen
) VALUES (
  'scout_2026_002',
  'Mercator Kolleg 2026/2027',
  'Stiftung Mercator',
  'Stiftung',
  'Jährliche Stipendien für Changemaker mit 1-10 Jahren Berufserfahrung. Fokus: "Europa in der Welt 2030 – Nachhaltige Visionen für eine inklusive und sichere Zukunft".',
  'Internationale Zusammenarbeit; Nachhaltige Entwicklung; Inklusion und Sicherheit; Intersektionales Lernen (Wirtschaft, Verwaltung, NGOs, internationale Organisationen)',
  '20 Stipendien pro Jahr; Monatliches Stipendium (2.200 € Grundbetrag); Mittel für Auslandsaufenthalte, Konferenzen, Sprachkurse; Netzwerk mit über 500 Alumni',
  'Changemaker aller Fachbereiche mit 1-10 Jahren Berufserfahrung',
  '2026-06-15',
  'Öffnung: 15. April 2026; Schluss: 15. Juni 2026',
  '2.200 €/Monat + Zusatzleistungen',
  'https://www.mercator-kolleg.de',
  'aktiv',
  'Manuelle Web-Recherche',
  '2026-02-13',
  'Antragsportal: application.mercator-kolleg.de'
);

-- 3. Volkswagen Stiftung - Momentum
INSERT INTO foerderprogramme (
  programm_id, titel, foerdergeber, foerdergeber_typ, beschreibung,
  foerderschwerpunkte, foerderleistung, zielgruppe, bewerbungsfrist,
  bewerbungsfrist_text, website_url, status, quelle_recherche,
  recherche_datum, notizen
) VALUES (
  'scout_2026_003',
  'Momentum - Förderung für Erstberufene',
  'Volkswagen Stiftung',
  'Stiftung',
  'Förderung für Professor:innen drei bis fünf Jahre nach ihrer ersten Lebenszeitprofessur (Amtsantritt April 2021 bis April 2023). Unterstützung bei inhaltlicher und strategischer Weiterentwicklung.',
  'Wissenschaftsförderung; Karriereentwicklung; Strategische Professurentwicklung',
  'Konzeptförderung zur Weiterentwicklung der Professur; Interessensbekundung → Kurzvideos → ggf. Vollanträge',
  'Professor:innen 3-5 Jahre nach erster Lebenszeitprofessur (Amtsantritt April 2021 - April 2023)',
  '2026-04-14',
  '14. April 2026',
  'https://www.volkswagenstiftung.de',
  'aktiv',
  'Manuelle Web-Recherche',
  '2026-02-13',
  'Auch verfügbar: Forschung über Wissenschaft (Stichtag 23.06.2026), Pioniervorhaben zu gesellschaftlichen Transformationen (Herbst 2026)'
);

-- 4. EIT Higher Education Initiative Call 2025
INSERT INTO foerderprogramme (
  programm_id, titel, foerdergeber, foerdergeber_typ, beschreibung,
  foerderschwerpunkte, foerderleistung, zielgruppe, bewerbungsfrist,
  bewerbungsfrist_text, foerdersumme_max, foerdersumme_text, website_url,
  status, quelle_recherche, recherche_datum, notizen
) VALUES (
  'scout_2026_004',
  'EIT Higher Education Initiative Call 2025',
  'European Institute of Innovation and Technology (EIT)',
  'EU',
  'EU-weiter Call zur Stärkung von Innovation und Entrepreneurship in der Hochschulbildung. Fördert Konsortien europäischer Hochschulen.',
  'Boosting Innovation and Entrepreneurship Capacity in STEM; Strengthening synergies between EIT ecosystem and European Universities alliances',
  'Projektförderung für 24 Monate',
  'Konsortien mit mind. 3 Hochschulen aus versch. Ländern, mind. 1 Unternehmenspartner, mind. 1 Nicht-HEI-Partner (mind. 5 Partner insgesamt)',
  '2026-03-04',
  '4. März 2026, 17:00 CET',
  2000000,
  'Bis zu 2.000.000 € pro Projekt',
  'https://eit-hei.eu/funding-support/funding-opportunities/open-calls/call-for-proposals-2025/',
  'aktiv',
  'Manuelle Web-Recherche',
  '2026-02-13',
  'EU Funding & Tenders Portal für Antragstellung'
);

-- 5. Erasmus+ Alliances for Innovation 2026
INSERT INTO foerderprogramme (
  programm_id, titel, foerdergeber, foerdergeber_typ, beschreibung,
  foerderschwerpunkte, foerderleistung, zielgruppe, bewerbungsfrist_text,
  foerdersumme_text, website_url, status, quelle_recherche, recherche_datum, notizen
) VALUES (
  'scout_2026_005',
  'Erasmus+ Alliances for Innovation 2026',
  'European Commission - Erasmus+',
  'EU',
  'EU-Programm mit 67 Mio. € Budget für Bildungsinnovation durch Partnerschaften zwischen Hochschulen, Berufsbildung und Wirtschaft.',
  'Digitale Kompetenzen; Green und sustainable skills; STEM-Talente; Entrepreneurial Mindsets; Circular Economy; Technology Adoption',
  'Lot 1 (Alliances for Education and Enterprises): 25 Mio. €; Lot 2 (Alliances for Sectoral Cooperation on Skills): 32 Mio. €; Lot 3 (Alliances for STEM Skills Foundries): 10 Mio. €',
  'Hochschulen, VET-Anbieter, Unternehmen, Organisationen in Deutschland und EU',
  'Laufend (Programmjahr 2026)',
  'Gesamtbudget: 67 Mio. € (Lot 1: 25 Mio., Lot 2: 32 Mio., Lot 3: 10 Mio.)',
  'https://erasmus-plus.ec.europa.eu',
  'aktiv',
  'Manuelle Web-Recherche',
  '2026-02-13',
  'National Agency Deutschland: NA für EU-Programme im Bildungsbereich (NA-BIB). Program Guide 2026 verfügbar.'
);

-- 6. Horizon Europe Work Programme 2026-2027
INSERT INTO foerderprogramme (
  programm_id, titel, foerdergeber, foerdergeber_typ, beschreibung,
  foerderschwerpunkte, foerderleistung, zielgruppe, bewerbungsfrist_text,
  foerdersumme_text, website_url, status, quelle_recherche, recherche_datum, notizen
) VALUES (
  'scout_2026_006',
  'Horizon Europe Work Programme 2026-2027',
  'European Commission',
  'EU',
  'Das neue Arbeitsprogramm für 2026-2027 mit 14 Mrd. € Budget. Mehrere Calls relevant für Bildung und Innovation.',
  'Culture, Creativity and Inclusive Society (298,5 Mio. €); Widening Participation (416,5 Mio. €); Reforming European R&I System (52 Mio. €); Research Infrastructures (294,9 Mio. €)',
  'Verschiedene Förderlinien mit unterschiedlichen Budgets',
  'Forschungseinrichtungen, Hochschulen, Unternehmen, Konsortien',
  'Verschiedene Fristen 2026-2027 (z.B. Cluster 4: 4. März 2026)',
  'Gesamtbudget 2026-2027: 14 Mrd. €',
  'https://research-and-innovation.ec.europa.eu/funding/funding-opportunities',
  'aktiv',
  'Manuelle Web-Recherche',
  '2026-02-13',
  'Vereinfachte Antragsverfahren ab 2026. Schwerpunkte: Better research careers, greener and stronger EU.'
);

-- 7. KfW ERP-Förderkredit Digitalisierung & Innovation
INSERT INTO foerderprogramme (
  programm_id, titel, foerdergeber, foerdergeber_typ, beschreibung,
  foerderschwerpunkte, foerderleistung, zielgruppe, bewerbungsfrist_text,
  foerdersumme_text, website_url, status, quelle_recherche, recherche_datum, notizen
) VALUES (
  'scout_2026_007',
  'KfW ERP-Förderkredit Digitalisierung (511/512) & Innovation (513/514)',
  'KfW Bankengruppe',
  'Bund',
  'Neues dreistufiges Fördermodell seit 1. Juli 2025 für Digitalisierungs- und Innovationsprojekte in Unternehmen.',
  'Hard- und Software-Investitionen; Beratung und Implementierung; Cloud-Migration; Breitbandnetze; KI-Technologien; Produkt- und Prozessinnovationen',
  'Stufe 1 (Basisförderung): Bis 7,5 Mio. € Kredit; Stufe 2 (LevelUp): Bis 25 Mio. € + 3% Zuschuss (max. 200.000 €); Stufe 3 (HighEnd): Bis 25 Mio. € + 5% Zuschuss (max. 200.000 €)',
  'Einzelunternehmen, Freiberufler, KMU mit Jahresgruppenumsatz bis 500 Mio. €, Sitz in Deutschland',
  'Laufend',
  'Stufe 1: 7,5 Mio. €; Stufe 2-3: 25 Mio. € mit Zuschuss bis 200.000 €',
  'https://www.kfw.de/inlandsfoerderung/Unternehmen/Innovation-und-Digitalisierung/',
  'aktiv',
  'Manuelle Web-Recherche',
  '2026-02-13',
  'Digitalisierungscheck verpflichtend für Stufe 1 (kostenlos unter kfw.de/digitalisierungs-check). Kein Mindestkreditbetrag. Beantragung über Hausbank.'
);

-- 8. NRW.BANK.Moderne Schule & DIGIGREEN
INSERT INTO foerderprogramme (
  programm_id, titel, foerdergeber, foerdergeber_typ, beschreibung,
  foerderschwerpunkte, foerderleistung, zielgruppe, bewerbungsfrist_text,
  foerdersumme_text, website_url, status, quelle_recherche, recherche_datum, notizen
) VALUES (
  'scout_2026_008',
  'NRW.BANK.Moderne Schule & DIGIGREEN',
  'NRW.BANK',
  'Land',
  'Umfassende Förderung für Bildungsinfrastruktur und digitale Projekte in NRW.',
  'Modernisierung und Neubau von Schulen und Kitas; Digitale Infrastruktur; Projekte zu Digitalisierung und Klimaschutz',
  'NRW.BANK.Moderne Schule: 362 Mio. € (erste 9 Monate 2025); DIGIGREEN: Top-10-Ideen je 700 €, 3 Gewinner zusätzlich 1.000 €; DigitalPakt NRW: Bis zu 90% Förderung',
  'Schulen, Kitas, Schulklassen (Jahrgänge 5-12 bei DIGIGREEN)',
  'Laufend (DIGIGREEN: Bewerbungen bis voraussichtlich Ende 2024 möglich gewesen)',
  'Moderne Schule: 362 Mio. € (2025); DIGIGREEN: Bis 1.700 € pro Team; DigitalPakt: Bis 90%',
  'https://www.nrwbank.de',
  'aktiv',
  'Manuelle Web-Recherche',
  '2026-02-13',
  'Auch verfügbar: NRW.BANK.Invest Zukunft (zinsvergünstigte Darlehen für Digitalisierung und Nachhaltigkeit)'
);

-- =============================================================================
-- Zusammenfassung der eingefügten Datensätze
-- =============================================================================
-- 1. scout_2026_001 - Deutscher Schulpreis 2026 (Robert Bosch Stiftung)
-- 2. scout_2026_002 - Mercator Kolleg 2026/2027 (Stiftung Mercator)
-- 3. scout_2026_003 - Momentum (VW Stiftung)
-- 4. scout_2026_004 - EIT Higher Education Initiative (EU)
-- 5. scout_2026_005 - Erasmus+ Alliances for Innovation 2026 (EU)
-- 6. scout_2026_006 - Horizon Europe Work Programme 2026-2027 (EU)
-- 7. scout_2026_007 - KfW ERP Digitalisierung/Innovation (KfW)
-- 8. scout_2026_008 - NRW.BANK.Moderne Schule (NRW.BANK)
-- =============================================================================
