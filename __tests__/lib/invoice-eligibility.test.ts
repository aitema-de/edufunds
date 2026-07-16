/**
 * Wer darf auf Rechnung bestellen?
 *
 * Der Rechnungskauf schaltet sofort frei, bevor Geld geflossen ist. Er existiert,
 * WEIL Schulen und Traeger nicht mit Karte zahlen koennen — nicht, damit sich
 * jeder anonym bedienen kann.
 *
 * Die wichtigste Eigenschaft dieser Pruefung ist NICHT, moeglichst viel zu sperren,
 * sondern keinen echten Kunden auszusperren. Deshalb Negativliste (Freemail /
 * Wegwerf) statt Allowlist: deutsche Schuldomains sind zu heterogen fuer eine
 * Positivliste.
 */
import {
  pruefeRechnungsAdresse,
  istInstitutionell,
  istVerein,
  domainOf,
  ablehnungsText,
} from "@/lib/payments/invoice-eligibility";

const ORIG_ENV = process.env;
beforeEach(() => {
  process.env = { ...ORIG_ENV };
  delete process.env.INVOICE_DOMAIN_ALLOWLIST;
  delete process.env.INVOICE_DOMAIN_BLOCKLIST;
});
afterAll(() => {
  process.env = ORIG_ENV;
});

describe("Freemail wird abgewiesen", () => {
  it.each([
    "lehrer@gmail.com",
    "sekretariat@gmx.de",
    "info@web.de",
    "mail@t-online.de",
    "x@outlook.de",
    "y@icloud.com",
    "z@yahoo.de",
    "a@posteo.de",
    "b@protonmail.com",
  ])("%s", (email) => {
    const r = pruefeRechnungsAdresse(email);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.grund).toBe("freemail");
  });

  it("wirkt unabhaengig von Gross-/Kleinschreibung und Leerzeichen", () => {
    expect(pruefeRechnungsAdresse("Lehrer@GMail.COM ").ok).toBe(false);
  });
});

describe("Wegwerfadressen werden abgewiesen", () => {
  it.each(["a@mailinator.com", "b@yopmail.com", "c@trashmail.de", "d@10minutemail.com"])(
    "%s",
    (email) => {
      const r = pruefeRechnungsAdresse(email);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.grund).toBe("wegwerfadresse");
    }
  );
});

describe("Echte Schulen und Traeger kommen durch", () => {
  // Der teuerste Fehler waere, einen echten Kunden auszusperren.
  it.each([
    "sekretariat@gymnasium-musterstadt.de",
    "verwaltung@schulen.koeln.de",
    "info@gs-nord.schule",
    "kontakt@gesamtschule-bochum.de",
    "buero@grundschule-am-see.de",
    "amt@stadt-musterstadt.de",
    "verwaltung@landkreis-harz.de",
    "office@bildungswerk-nord.de",
    // Unauffaellige Traeger-Domain ohne jedes Schul-Merkmal: MUSS trotzdem durch.
    "kontakt@traegerwerk-mueller-gbr.de",
    "info@zweckverband-nord.de",
  ])("%s", (email) => {
    expect(pruefeRechnungsAdresse(email).ok).toBe(true);
  });
});

describe("Vereine werden abgewiesen — Rechnungskauf ist Schulen und Traegern vorbehalten", () => {
  // Entscheidung Kolja 14.07.2026: Foerdervereine gehen ueber den Stripe-Checkout.
  it.each([
    "kasse@foerderverein-schule-x.de",
    "vorstand@förderverein-gymnasium.de",
    "info@schulverein-nord.de",
    "kontakt@freundeskreis-gymnasium.de",
    "kasse@musterschule-ev.de",
    "info@elternverein-koeln.de",
  ])("%s", (email) => {
    const r = pruefeRechnungsAdresse(email);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.grund).toBe("verein");
  });

  it("weist den Verein auf den Kartenweg hin, statt ihn nur abzulehnen", () => {
    const text = ablehnungsText("verein");
    expect(text).toMatch(/Karte/);
    expect(text).toMatch(/§ 4a/);
  });

  it("sperrt eine SCHULE mit aehnlicher Domain nicht versehentlich aus", () => {
    // Der teuerste Fehler waere ein Fehlalarm gegen einen echten Kunden.
    expect(istVerein("sekretariat@gesamtschule-bochum.de")).toBe(false);
    expect(istVerein("verwaltung@schulen.koeln.de")).toBe(false);
    expect(istVerein("amt@landkreis-harz.de")).toBe(false);
    expect(pruefeRechnungsAdresse("sekretariat@gesamtschule-bochum.de").ok).toBe(true);
  });

  it("⚠️ erkennt einen Verein mit NEUTRALER Domain NICHT — das traegt die AGB-Klausel", () => {
    // Grenze der Technik, bewusst festgehalten: kontakt@musterverein-nord.de faellt
    // auf, kontakt@bildungswerk-nord.de nicht. § 4a erlaubt dann das Storno.
    expect(pruefeRechnungsAdresse("kontakt@bildungswerk-nord.de").ok).toBe(true);
  });
});

describe("istInstitutionell — Signal fuer die Admin-Ansicht, kein Tor", () => {
  it("erkennt eindeutige Schul-/Behoerdenmuster", () => {
    expect(istInstitutionell("a@gs-nord.schule")).toBe(true);
    expect(istInstitutionell("a@gymnasium-musterstadt.de")).toBe(true);
    expect(istInstitutionell("a@schulen.koeln.de")).toBe(true);
    expect(istInstitutionell("a@stadt-koeln.de")).toBe(true);
  });

  it("meldet unauffaellige Domains als NICHT institutionell — die duerfen trotzdem bestellen", () => {
    expect(istInstitutionell("kontakt@traegerwerk-mueller-gbr.de")).toBe(false);
    // Entscheidend: kein Tor. Die Bestellung geht durch, taucht im Admin nur als
    // "lohnt einen Blick" auf.
    expect(pruefeRechnungsAdresse("kontakt@traegerwerk-mueller-gbr.de").ok).toBe(true);
  });
});

describe("Env-Overrides", () => {
  it("ALLOWLIST schlaegt die Freemail-Sperre (Einzelfall-Freigabe)", () => {
    // Foerderverein mit web.de-Adresse, telefonisch bekannt.
    process.env.INVOICE_DOMAIN_ALLOWLIST = "web.de, bekannter-verein.org";
    const r = pruefeRechnungsAdresse("kasse@web.de");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.institutionell).toBe(true);
  });

  it("BLOCKLIST sperrt eine zusaetzliche Domain", () => {
    process.env.INVOICE_DOMAIN_BLOCKLIST = "betrueger.de";
    const r = pruefeRechnungsAdresse("x@betrueger.de");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.grund).toBe("freemail");
  });
});

describe("Kaputte Eingaben", () => {
  it.each(["", "keine-mail", "a@", "a@localhost"])("%s -> ungueltig", (email) => {
    const r = pruefeRechnungsAdresse(email);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.grund).toBe("ungueltig");
  });

  it("domainOf liest die Domain hinter dem LETZTEN @", () => {
    expect(domainOf("a@b@schule.de")).toBe("schule.de");
  });
});

describe("Ablehnungstext", () => {
  it("zeigt den Weg, statt nur die Tuer zuzuschlagen", () => {
    const text = ablehnungsText("freemail");
    // Muss den Kartenweg anbieten und den Ausweg fuer Einrichtungen ohne Domain.
    expect(text).toMatch(/Karte/);
    expect(text).toMatch(/schreiben Sie uns/);
  });
});
