/**
 * @jest-environment node
 */
/**
 * getClientIP — Spoofing-Schutz.
 *
 * Hintergrund (14.07.2026): Die Funktion nahm den ERSTEN X-Forwarded-For-Eintrag.
 * Unser Traefik laeuft mit `forwardedHeaders.insecure=true`, uebernimmt also einen
 * vom Client mitgeschickten Header und haengt die echte Peer-IP nur an. Damit war
 * jede IP-basierte Grenze wirkungslos: Login-Bruteforce-Schutz (5/15min),
 * KI-Kostenlimit (5/h) und die Missbrauchsbremse beim Rechnungskauf — wer
 * `X-Forwarded-For: <zufall>` schickte, bekam fuer jede erfundene IP ein frisches
 * Budget. Diese Tests halten den Fix fest.
 */
import { getClientIP } from "@/lib/rate-limit";

/** Minimaler Request-Stub — getClientIP liest ausschliesslich Header. */
function req(headers: Record<string, string>) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (n: string) => lower[n.toLowerCase()] ?? null } };
}

describe("getClientIP — X-Forwarded-For-Spoofing", () => {
  it("nimmt NICHT den ersten Eintrag, sondern die echte Peer-IP", () => {
    // Angreifer schickt "1.2.3.4"; Traefik haengt die echte IP an.
    expect(getClientIP(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("liefert fuer zwei gefaelschte Praefixe DIESELBE IP (kein frisches Budget)", () => {
    const a = getClientIP(req({ "x-forwarded-for": "11.11.11.11, 203.0.113.7" }));
    const b = getClientIP(req({ "x-forwarded-for": "22.22.22.22, 203.0.113.7" }));
    expect(a).toBe(b);
    expect(a).toBe("203.0.113.7");
  });

  it("unterscheidet echte Clients weiterhin", () => {
    const a = getClientIP(req({ "x-forwarded-for": "203.0.113.7" }));
    const b = getClientIP(req({ "x-forwarded-for": "198.51.100.42" }));
    expect(a).not.toBe(b);
  });

  it("ueberspringt interne Proxy-IPs am Kettenende (Wartungs-nginx davor)", () => {
    // Coming-Soon: Client → Traefik → nginx → App. nginx haengt 172.x an.
    expect(getClientIP(req({ "x-forwarded-for": "203.0.113.7, 172.18.0.5" }))).toBe("203.0.113.7");
  });

  it("laesst sich nicht durch selbst angehaengte private IPs austricksen", () => {
    // Angreifer haengt private Adressen an, um das Ueberspringen auszunutzen —
    // die letzte OEFFENTLICHE bleibt trotzdem die echte Peer-IP.
    expect(getClientIP(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.7, 10.0.0.1, 192.168.1.1" })))
      .toBe("203.0.113.7");
  });

  it("erkennt alle privaten Bereiche als intern", () => {
    // Nur private Adressen (lokale Entwicklung): letzter Eintrag, nie der erste.
    expect(getClientIP(req({ "x-forwarded-for": "10.0.0.1, 172.20.0.3" }))).toBe("172.20.0.3");
  });

  it("faellt auf X-Real-IP zurueck, wenn kein XFF gesetzt ist", () => {
    expect(getClientIP(req({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("liefert 'unknown', wenn gar nichts gesetzt ist", () => {
    expect(getClientIP(req({}))).toBe("unknown");
  });

  it("kommt mit IPv6 zurecht", () => {
    expect(getClientIP(req({ "x-forwarded-for": "::1, 2001:db8::1" }))).toBe("2001:db8::1");
  });
});
