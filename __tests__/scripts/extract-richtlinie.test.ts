import fs from "fs";
import path from "path";

const SRC_PATH = path.join(__dirname, "..", "..", "scripts", "extract-richtlinie.ts");
const src = fs.readFileSync(SRC_PATH, "utf8");

describe("scripts/extract-richtlinie.ts (FETCH-01 + FETCH-03 Migrations-Konformitaet)", () => {
  describe("Wrapper-Migration (FETCH-01)", () => {
    it("sollte generateJson aus lib/wizard/llm importieren", () => {
      expect(src).toMatch(
        /import\s*\{[^}]*generateJson[^}]*\}\s*from\s+["']\.\.\/lib\/wizard\/llm["']/
      );
    });

    it("sollte MODEL_PIPELINE importieren (NICHT MODEL_INTERVIEW)", () => {
      expect(src).toMatch(/MODEL_PIPELINE/);
    });

    it("sollte NICHT GoogleGenerativeAI importieren", () => {
      expect(src).not.toMatch(/from\s+["']@google\/generative-ai["']/);
    });

    it("sollte KEIN hardcoded gemini-2.5-pro Modell mehr setzen", () => {
      expect(src).not.toMatch(/MODEL\s*=\s*["']gemini-2\.5-pro["']/);
    });

    it("sollte KEINEN process.env.GEMINI_API_KEY-Check mehr enthalten", () => {
      expect(src).not.toMatch(/process\.env\.GEMINI_API_KEY/);
    });
  });

  describe("SYSTEM_PROMPT-Erweiterung (FETCH-03)", () => {
    it("SYSTEM_PROMPT sollte alle 4 neuen Feldnamen enthalten", () => {
      expect(src).toMatch(/bestPractices/);
      expect(src).toMatch(/rejectGruende/);
      expect(src).toMatch(/vorbildFormulierungen/);
      expect(src).toMatch(/fristLogik/);
    });

    it("SYSTEM_PROMPT sollte das Wort JSON enthalten (DeepSeek json_object Pflicht)", () => {
      expect(src).toMatch(/JSON/);
    });

    it("SYSTEM_PROMPT sollte einen Anti-Halluzinations-Block enthalten", () => {
      expect(src).toMatch(
        /Erfinde NICHTS|lieber leere Liste als Erfindung|REGELN GEGEN HALLUZINATION/
      );
    });

    it("SYSTEM_PROMPT sollte ISO-Datum-Format YYYY-MM-DD anweisen", () => {
      expect(src).toMatch(/YYYY-MM-DD/);
    });
  });

  describe("Validator-Pre-Persist (FETCH-03)", () => {
    it("sollte RichtlinieStrictSchema importieren", () => {
      expect(src).toMatch(/RichtlinieStrictSchema/);
    });

    it("sollte validateForeignKeys importieren", () => {
      expect(src).toMatch(/validateForeignKeys/);
    });

    it("sollte safeParse vor Persist aufrufen", () => {
      expect(src).toMatch(/RichtlinieStrictSchema\.safeParse/);
    });
  });
});
