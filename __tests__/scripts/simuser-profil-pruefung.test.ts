/**
 * Profil-Treue des simulierten Nutzers (Befund 03.08.2026).
 *
 * Der Messaufbau war fuer jede Interviewer-Verbesserung blind, die auf
 * Kostenangaben zielt: 11 von 25 Profilen fuehrten ein "Weiss nicht, wie hoch das
 * Budget ist", obwohl der zugehoerige Korpus Geld mit KEINEM Wort erwaehnt. Der
 * simulierte Nutzer verweigerte damit eine Auskunft, die er nie verweigert hatte —
 * und keine noch so gute Frage konnte sie zutage foerdern.
 *
 * Ursache war eine Mindestquote fuer `nichtWissen`: hatte ein Interview weniger
 * echte Nichtwissens-Aeusserungen als gefordert, musste das Modell welche erfinden.
 * Dieselbe Klasse wie "Zwangswahl-Schema erzeugt Fakten".
 */
import { pruefeProfil } from "@/scripts/eval-simuser";

const korpusEintrag = (fragenUndAntworten: Array<[string, string]>) =>
  ({
    id: "pv-test",
    category: "vag",
    schulProfil: { name: "Testschule" },
    userAnswers: fragenUndAntworten.flatMap(([frage, antwort]) => [
      { role: "ai", kind: "question", content: frage },
      { role: "user", content: antwort },
    ]),
  }) as never;

const profil = (nichtWissen: string[], hintergrund: string[] = []) =>
  ({
    id: "pv-test",
    programmId: "p",
    kategorie: "vag",
    schule: {},
    rolle: "Schulleiterin",
    stil: "knapp",
    belegt: [],
    hintergrund,
    nichtWissen,
  }) as never;

describe("pruefeProfil — erfundenes Nichtwissen", () => {
  it("flaggt eine Verweigerung zu einem Thema, das der Korpus nie berührt", () => {
    // Genau der Befund: das Interview spricht nur ueber Medienkonzepte, das Profil
    // behauptet trotzdem, die Person kenne die Foerdersumme nicht.
    const e = korpusEintrag([
      ["Wie ist euer Medienkonzept im Schulprogramm verankert?", "Da steht eigentlich nichts Konkretes."],
    ]);
    const pr = pruefeProfil(
      profil(["Weiß nicht, wie hoch das Budget für das Vorhaben wäre."]),
      e
    );
    expect(pr.unbelegteNichtwissen).toHaveLength(1);
    expect(pr.unbelegteNichtwissen[0]).toMatch(/Budget/);
  });

  it("lässt eine Verweigerung stehen, die der Korpus belegt", () => {
    // pv-002 im echten Korpus: die Frage nach dem Budget wurde gestellt und mit
    // "Budget weiss ich nicht" beantwortet — das gehoert ins Profil.
    const e = korpusEintrag([
      ["Welches Budget haben Sie im Kopf?", "Budget weiß ich nicht, irgendwas was reicht."],
    ]);
    const pr = pruefeProfil(profil(["Weiß nicht, wie hoch das Budget wäre."]), e);
    expect(pr.unbelegteNichtwissen).toHaveLength(0);
  });

  it("meldet weiterhin Widersprüche zwischen Hintergrund und Nichtwissen", () => {
    // Regressionsschutz: der Widerspruchs-Check ist die aeltere, HARTE Sicherung und
    // darf durch die neue Gegenrichtung nicht stumpf werden.
    const e = korpusEintrag([
      ["Welches Budget haben Sie für die Theaterarbeit im Kopf?", "Budget weiß ich nicht."],
    ]);
    const pr = pruefeProfil(
      profil(
        ["Weiß nicht, welches Budget die Theaterarbeit braucht."],
        ["Das Budget für die Theaterarbeit beträgt rund fünftausend."]
      ),
      e
    );
    expect(pr.widersprueche.length).toBeGreaterThan(0);
  });

  it("kennt keine Mindestzahl mehr — ein kurzes Nichtwissen ist keine Verletzung", () => {
    const e = korpusEintrag([["Gibt es ein Konzept?", "Nein, gibt es nicht."]]);
    const pr = pruefeProfil(profil([]), e);
    expect(pr.budgetVerletzung).toBeNull();
  });
});
