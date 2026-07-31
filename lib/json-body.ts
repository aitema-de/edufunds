import { NextResponse } from "next/server";

/**
 * Sicheres Lesen eines JSON-Request-Bodys.
 *
 * WARUM
 * -----
 * `await req.json()` wirft bei leerem oder kaputtem Body. In 11 API-Routen lag
 * dieser Aufruf als erste Zeile in einem try-Block, dessen catch pauschal 500
 * antwortete. Ergebnis (Selbst-Pentest 30.07.2026): ein leerer POST auf
 * /api/contact, /api/match, /api/wizard/start und acht weitere Routen erzeugte
 * einen Serverfehler. Das ist keine Luecke, mit der man einbricht, aber es ist
 * die falsche Antwort auf einen Client-Fehler: 500 heisst "wir sind kaputt",
 * korrekt ist 400 "deine Anfrage war unvollstaendig". Ausserdem verschwinden
 * echte 500er im Rauschen, wenn jeder Scanner-Request einen produziert.
 *
 * VERWENDUNG
 * ----------
 *   const gelesen = await readJsonBody<{ sessionToken?: string }>(req);
 *   if (!gelesen.ok) return gelesen.response;
 *   const { sessionToken } = gelesen.body;
 *
 * Die Funktion prueft NUR, ob ueberhaupt gueltiges JSON ankam. Feld- und
 * Typpruefung bleibt Sache der Route — die Routen behandeln `{}` bereits korrekt.
 */
export type JsonBodyErgebnis<T> = { ok: true; body: T } | { ok: false; response: NextResponse };

export async function readJsonBody<T>(req: Request): Promise<JsonBodyErgebnis<T>> {
  let roh: string;
  try {
    roh = await req.text();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Anfrage-Inhalt konnte nicht gelesen werden." }, { status: 400 }),
    };
  }

  if (!roh || !roh.trim()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Leerer Anfrage-Inhalt — JSON-Body erwartet." }, { status: 400 }),
    };
  }

  try {
    return { ok: true, body: JSON.parse(roh) as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Ungueltiges JSON im Anfrage-Inhalt." }, { status: 400 }),
    };
  }
}
