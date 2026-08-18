/**
 * Antragsart-Erkennung (Architektur-Umbau 03.08.2026).
 *
 * Die beiden Gegenbeispiele sind gemessen (gepaarter WIZ-05-Lauf, identische
 * Snapshots und Judges) und stehen deshalb als Tests hier — sie belegen, warum
 * WEDER das Namenssignal ALLEIN noch das Struktursignal ALLEIN genuegt.
 */
import { bestimmeAntragsart, hatFinanzAbschnitt } from "@/lib/wizard/antragsart";
import type { Foerderprogramm } from "@/lib/foerderSchema";

const prog = (name: string, kurzbeschreibung = ""): Foerderprogramm =>
  ({ id: "x", name, kurzbeschreibung, foerdergeberTyp: "stiftung" }) as unknown as Foerderprogramm;

const struktur = (...namen: string[]) =>
  ({ antragsstruktur: { abschnitte: namen.map((n, i) => ({ id: `a${i}`, name: n })) } }) as never;

describe("hatFinanzAbschnitt", () => {
  it("erkennt Finanzabschnitte in verschiedenen Schreibweisen", () => {
    expect(hatFinanzAbschnitt(struktur("Bedarf", "Ausstattungs- und Finanzplan"))).toBe(true);
    expect(hatFinanzAbschnitt(struktur("Bedarf", "Finanzierungs- und Kostenplan"))).toBe(true);
    expect(hatFinanzAbschnitt(struktur("Bedarf", "Finanzierung und Mengengerüst"))).toBe(true);
  });

  it("meldet false, wenn die Struktur bekannt ist und keinen Finanzteil hat", () => {
    expect(hatFinanzAbschnitt(struktur("Qualitätsbereich 1", "Qualitätsbereich 2"))).toBe(false);
  });

  it("meldet null bei unbekannter oder leerer Struktur — kein Beleg, keine Aussage", () => {
    expect(hatFinanzAbschnitt(null)).toBeNull();
    expect(hatFinanzAbschnitt(struktur())).toBeNull();
  });
});

describe("bestimmeAntragsart", () => {
  it("erkennt den Deutschen Schulpreis als Preis-Bewerbung", () => {
    // Belegt: gemini 4,18 ohne Finanzplan → 2,40 mit (pv-004).
    const u = bestimmeAntragsart(
      prog("Deutscher Schulpreis"),
      struktur("Qualitätsbereich 1: Leistung", "Qualitätsbereich 2: Umgang mit Vielfalt")
    );
    expect(u.art).toBe("preis");
    expect(u.brauchtFinanzplan).toBe(false);
  });

  it("GEGENBEISPIEL Erasmus+: keine Finanzabschnitte, aber KEIN Preis", () => {
    // Erasmus+ hat ebenfalls keinen Finanzabschnitt in der Struktur — profitiert
    // aber vom Finanzplan (pv-005: 4,06 → 4,15). Das Struktursignal allein haette
    // ihn faelschlich unterdrueckt; das fehlende Namenssignal rettet ihn.
    const u = bestimmeAntragsart(
      prog("Erasmus+ Schulbildung 2026"),
      struktur("Hintergrund", "Ziele", "Aktivitäten", "Qualitätsstandards")
    );
    expect(u.art).toBe("projektfoerderung");
    expect(u.brauchtFinanzplan).toBe(true);
  });

  it("GEGENBEISPIEL Kostenpositionen: sind KEIN verlässliches Budget-Signal", () => {
    // Der Bosch-Dossier fuehrt EINE Kostenposition "sonstiges", deren Bemerkung
    // lautet "keine Einzelposten-Pruefung". Eine Regel "kostenpositionen vorhanden
    // ⇒ Budget erwartet" liest genau dieses Dossier verkehrt herum.
    const richtlinie = {
      kostenpositionen: [{ kategorie: "sonstiges", foerderfaehig: true }],
      antragsstruktur: { abschnitte: [{ id: "q1", name: "Qualitätsbereich 1" }] },
    } as never;
    expect(bestimmeAntragsart(prog("Deutscher Schulpreis"), richtlinie).art).toBe("preis");
  });

  it("Preisname mit Finanzabschnitt bleibt Projektförderung", () => {
    const u = bestimmeAntragsart(
      prog("Innovations-Wettbewerb Schule"),
      struktur("Vorhaben", "Kostenplan")
    );
    expect(u.brauchtFinanzplan).toBe(true);
    expect(u.grund).toMatch(/Finanzabschnitt/);
  });

  it("Pflicht-Eigenanteil sticht jedes Preis-Signal", () => {
    const richtlinie = {
      eigenmittel: { pflicht: true },
      antragsstruktur: { abschnitte: [{ id: "q", name: "Qualität" }] },
    } as never;
    const u = bestimmeAntragsart(prog("MINTSPACE-Schulpreis"), richtlinie);
    expect(u.brauchtFinanzplan).toBe(true);
    expect(u.grund).toMatch(/Eigenanteil/);
  });

  it("ohne Struktur wird NICHT unterdrückt — Risiko-Asymmetrie", () => {
    // Ein fehlender Finanzplan macht den Antrag unvollstaendig; ein ueberfluessiger
    // kostet nur Punkte. Ohne Beleg bleibt es deshalb bei Projektfoerderung.
    const u = bestimmeAntragsart(prog("Känguru der Mathematik (Wettbewerb)"), null);
    expect(u.art).toBe("projektfoerderung");
    expect(u.grund).toMatch(/keine Antragsstruktur/);
  });

  it("ohne Preis-Signal bleibt es bei Projektförderung", () => {
    expect(bestimmeAntragsart(prog("DigitalPakt Schule 2.0"), null).brauchtFinanzplan).toBe(true);
  });
});
