import { parseArgs } from "../../scripts/auto-pflege-step";

describe("auto-pflege-step: CLI-Argumente", () => {
  it("nimmt --max-programs 0 beim Wort", () => {
    // Der Fehler, den dieser Test festhaelt: `parseInt(...) || 5` machte aus der 0 still eine 5.
    // Ein Lauf, der ausdruecklich nichts extrahieren sollte, extrahierte dann fuenf Programme
    // und schrieb Stubs in data/foerderprogramme.json.
    expect(parseArgs(["--max-programs", "0"]).maxPrograms).toBe(0);
  });

  it("faellt bei unsinnigen Werten auf den Standard zurueck", () => {
    expect(parseArgs(["--max-programs", "abc"]).maxPrograms).toBe(5);
    expect(parseArgs(["--max-programs", "-3"]).maxPrograms).toBe(5);
    expect(parseArgs([]).maxPrograms).toBe(5);
  });

  it("liest --quelle und --dry-run", () => {
    const o = parseArgs(["--dry-run", "--quelle", "nbank-niedersachsen"]);
    expect(o.dryRun).toBe(true);
    expect(o.nurQuelle).toBe("nbank-niedersachsen");
  });
});
