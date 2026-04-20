import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY ?? "";

if (!API_KEY && process.env.NODE_ENV !== "test") {
  console.warn("[wizard/gemini] GEMINI_API_KEY ist leer — KI-Calls schlagen fehl.");
}

const client = new GoogleGenerativeAI(API_KEY);

export const MODEL_FLASH = "gemini-2.0-flash";
export const MODEL_PRO = "gemini-2.5-pro";

export async function generateJson<T>(
  model: string,
  system: string,
  user: string
): Promise<T> {
  const gm = client.getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig: { responseMimeType: "application/json" },
  });
  const res = await gm.generateContent(user);
  const text = res.response.text().trim();
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(
      `Gemini lieferte kein valides JSON (${model}): ${text.slice(0, 300)}`
    );
  }
}

export async function generateText(
  model: string,
  system: string,
  user: string
): Promise<string> {
  const gm = client.getGenerativeModel({ model, systemInstruction: system });
  const res = await gm.generateContent(user);
  return res.response.text().trim();
}
