import fs from "fs";
import path from "path";

const SRC_PATH = path.join(__dirname, "..", "..", "scripts", "scan-new-programs.ts");
const src = fs.readFileSync(SRC_PATH, "utf8");

describe("scripts/scan-new-programs.ts (FETCH-01 Migrations-Konformitaet)", () => {
  it("sollte generateJson aus lib/wizard/llm importieren", () => {
    expect(src).toMatch(
      /import\s*\{[^}]*generateJson[^}]*\}\s*from\s+["']\.\.\/lib\/wizard\/llm["']/
    );
  });

  it("sollte MODEL_INTERVIEW importieren und referenzieren", () => {
    expect(src).toMatch(/MODEL_INTERVIEW/);
  });

  it("sollte NICHT MODEL_PIPELINE referenzieren (Pitfall 6)", () => {
    expect(src).not.toMatch(/MODEL_PIPELINE/);
  });

  it("sollte NICHT GoogleGenerativeAI importieren", () => {
    expect(src).not.toMatch(/from\s+["']@google\/generative-ai["']/);
  });

  it("sollte KEIN hardcoded gemini-2.0-flash Modell mehr setzen", () => {
    expect(src).not.toMatch(/MODEL\s*=\s*["']gemini-2\.0-flash["']/);
  });

  it("sollte KEINEN process.env.GEMINI_API_KEY-Check mehr enthalten", () => {
    expect(src).not.toMatch(/process\.env\.GEMINI_API_KEY/);
  });

  it("scanSource-Signatur sollte gemini-Parameter NICHT mehr haben", () => {
    expect(src).not.toMatch(/scanSource\s*\([^)]*GoogleGenerativeAI/);
  });
});
