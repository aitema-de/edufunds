/**
 * P2 (Feedback 24.06.): provenanz() liefert pro ergänztem Vorschlag das nutzerfreundliche
 * "Warum" (Lookup per zitat, generischer Detektor-Default neutral-positiv umformuliert).
 */
import { provenanz } from "@/components/Wizard/TextVorschlaegeEditor";

describe("provenanz", () => {
  it("gibt null ohne Begründungen oder bei Lookup-Miss", () => {
    expect(provenanz(undefined, "x")).toBeNull();
    expect(provenanz([], "x")).toBeNull();
    expect(provenanz([{ zitat: "y", warum: "z" }], "x")).toBeNull();
  });

  it("gibt die konkrete Begründung zurück, wenn vorhanden", () => {
    const b = [{ zitat: "Partizipation stärkt …", warum: "Fördergeber achten auf Partizipation" }];
    expect(provenanz(b, "Partizipation stärkt …")).toBe("Fördergeber achten auf Partizipation");
  });

  it("formuliert den generischen Detektor-Default neutral-positiv um", () => {
    const b = [{ zitat: "x", warum: "nicht durch Nutzerangaben gedeckt" }];
    expect(provenanz(b, "x")).toBe("fachliche Ergänzung des Assistenten, nicht aus Ihren Angaben");
  });

  it("behandelt leere Begründung als kein Hinweis", () => {
    expect(provenanz([{ zitat: "x", warum: "  " }], "x")).toBeNull();
  });
});
