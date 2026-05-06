/**
 * Tests fuer components/Wizard/AntragSectionNav.tsx (existiert noch nicht — Plan 02.1-04 baut ihn).
 * Phase 02.1 Plan 01 — Wave-0-Skelette (D-02)
 *
 * Alle it.todo werden in Plan 02.1-04 gruen gemacht.
 * IntersectionObserver-Mock ist global in test/setup.tsx verfuegbar.
 */

describe('AntragSectionNav — D-02', () => {
  it.todo(
    "generiert Slug 'vorhaben-und-anliegen' aus h2-Text 'Vorhaben und Anliegen' — D-02"
    // Plan 02.1-04: unskippt nach Implementierung der slugify-Hilfsfunktion
  );

  it.todo(
    "mapped Umlaute: 'massnahmen-und-foerderung' aus 'Massnahmen und Foerderung' — D-02"
    // Plan 02.1-04: unskippt — slugify muss Umlaute normalisieren (ae/oe/ue/ss -> ASCII)
  );

  it.todo(
    "returns null wenn keine h2-Elemente vorhanden — D-02"
    // Plan 02.1-04: unskippt — Komponente gibt null zurueck wenn keine Abschnitte gefunden
  );

  it.todo(
    "setzt active-Klasse auf den Eintrag mit IntersectionObserver-isIntersecting=true — D-02"
    // Plan 02.1-04: unskippt — IntersectionObserver-Mock aus test/setup.tsx nutzen
  );
});
