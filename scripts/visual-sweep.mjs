#!/usr/bin/env node
/**
 * Visueller Sweep: Screenshots aller Seiten in Desktop- und Mobil-Breite,
 * plus deterministische Layout-Pruefungen, die man auf einem Bild NICHT sieht.
 *
 * Warum beides: Ein Screenshot beweist "sieht plausibel aus", aber nicht
 * "scrollt nicht horizontal" oder "kein Element ragt aus dem Viewport". Umgekehrt
 * findet keine Metrik einen kaputten Farbkontrast oder ein verrutschtes Hero.
 * Deshalb: Bilder zum Anschauen UND harte Messwerte zum Vergleichen.
 *
 * Lauf:
 *   SWEEP_BASE=http://127.0.0.1:3199 node scripts/visual-sweep.mjs
 *   SWEEP_BASE=... node scripts/visual-sweep.mjs --out /pfad/zum/ordner
 *
 * Ausgabe: <out>/<viewport>-<seite>.png + <out>/befunde.json
 * Exit-Codes: 0 = keine harten Befunde · 1 = Befund · 2 = Setup-Fehler.
 */

import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = (process.env.SWEEP_BASE || "http://127.0.0.1:3199").replace(/\/$/, "");
const argv = process.argv.slice(2);
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "test-results/visual";

const PROG = "niedersachsen-sport";
const SEITEN = [
  "/",
  "/foerderprogramme",
  `/foerderprogramme/${PROG}`,
  "/preise",
  "/ueber-uns",
  "/kontakt",
  "/registrieren",
  "/archiv",
  "/kontingent",
  "/kontingent/uebersicht",
  "/antrag/start",
  `/antrag/${PROG}`,
  "/antrag/meine",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/avv",
  "/admin/login",
];

/** Seiten, die absichtlich fast nur aus einem Formular bestehen. */
const MINIMALSEITEN = new Set(["/admin/login"]);

/**
 * Seiten, die ohne Anmeldung erwartbar eine 401-Antwort erzeugen: sie fragen eine
 * identitaetsgebundene API ab, der Browser protokolliert den 401 als Konsolenfehler.
 * Das ist korrektes Verhalten. Bewusst KEINE pauschale 401-Ausnahme — auf einer
 * oeffentlichen Seite bliebe ein 401 damit unsichtbar. Gleiche Logik wie in
 * e2e/smoke-all-pages.spec.ts.
 */
const ERWARTETE_401 = new Set(["/antrag/meine", "/kontingent/uebersicht"]);
const IST_ERWARTETER_401 = (seite, text) =>
  ERWARTETE_401.has(seite) && /Failed to load resource.*401|status of 401/i.test(text);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobil", width: 390, height: 844 },
];

/** Chromium aus dem lokalen Playwright-Cache (kein Zusatz-Download). */
function cachedChrome() {
  if (process.env.PW_CHROME) return process.env.PW_CHROME;
  const base = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(base)) return undefined;
  const rev = readdirSync(base)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))[0];
  if (!rev) return undefined;
  const bin = join(base, rev, "chrome-linux", "chrome");
  return existsSync(bin) ? bin : undefined;
}

const befunde = [];
function befund(schwere, seite, viewport, text, details) {
  befunde.push({ schwere, seite, viewport, text, details: details ?? null });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: cachedChrome(), headless: true });

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      locale: "de-DE",
    });
    const page = await ctx.newPage();

    const konsolenfehler = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (/favicon|Download the React DevTools|web-vitals/i.test(t)) return;
      konsolenfehler.push(t);
    });
    page.on("pageerror", (e) => konsolenfehler.push(`pageerror: ${e.message}`));

    for (const seite of SEITEN) {
      konsolenfehler.length = 0;
      let res;
      try {
        res = await page.goto(BASE + seite, { waitUntil: "networkidle", timeout: 30_000 });
      } catch (e) {
        befund("hoch", seite, vp.name, `Seite nicht ladbar: ${e.message.slice(0, 120)}`);
        continue;
      }
      if (!res || res.status() >= 500) {
        befund("hoch", seite, vp.name, `HTTP ${res?.status() ?? "kein Status"}`);
        continue;
      }

      const dateiname = `${vp.name}-${seite === "/" ? "start" : seite.replace(/\//g, "_").replace(/^_/, "")}.png`;
      await page.screenshot({ path: join(OUT, dateiname), fullPage: false });

      // --- Messungen, die kein Bild zeigt ---------------------------------
      const mess = await page.evaluate(() => {
        const de = document.documentElement;
        const ueberbreit = [];
        // Elemente, die rechts aus dem Viewport ragen (Ursache fuer Querscrollen).
        for (const el of Array.from(document.body.querySelectorAll("*")).slice(0, 4000)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > window.innerWidth + 2) {
            const stil = getComputedStyle(el);
            if (stil.position === "fixed" || stil.overflowX === "auto" || stil.overflowX === "scroll") continue;
            ueberbreit.push({
              tag: el.tagName.toLowerCase(),
              klasse: String(el.className ?? "").slice(0, 80),
              right: Math.round(r.right),
            });
            if (ueberbreit.length >= 5) break;
          }
        }
        // Sichtbarer Text mit Nullhoehe/-breite (abgeschnittene Ueberschriften).
        const leereUeberschriften = Array.from(document.querySelectorAll("h1,h2,h3"))
          .filter((h) => (h.textContent ?? "").trim().length > 0 && h.getBoundingClientRect().height === 0)
          .map((h) => (h.textContent ?? "").trim().slice(0, 60));
        return {
          scrollBreite: de.scrollWidth,
          viewportBreite: window.innerWidth,
          h1Zahl: document.querySelectorAll("h1").length,
          titel: document.title,
          ueberbreit,
          leereUeberschriften,
          textLaenge: (document.body.innerText ?? "").trim().length,
        };
      });

      // Querscrollen ist auf Mobil der klassische Layoutfehler.
      if (mess.scrollBreite > mess.viewportBreite + 2) {
        befund("mittel", seite, vp.name, `Querscrollen: scrollWidth ${mess.scrollBreite} > Viewport ${mess.viewportBreite}`, mess.ueberbreit);
      }
      if (mess.h1Zahl === 0) befund("niedrig", seite, vp.name, "keine H1 auf der Seite");
      if (mess.h1Zahl > 1) befund("niedrig", seite, vp.name, `${mess.h1Zahl} H1-Elemente (SEO/A11y: genau eine erwartet)`);
      if (!mess.titel || mess.titel.trim().length < 5) befund("niedrig", seite, vp.name, `Seitentitel fehlt oder zu kurz: "${mess.titel}"`);
      // Schwelle nach Seitentyp: Ein Anmeldeformular ist von Natur aus wortkarg
      // ("E-Mail", "Passwort", "Anmelden") — 200 Zeichen zu verlangen erzeugt dort
      // einen Fehlalarm. Inhaltsseiten muessen dagegen substanziell gefuellt sein.
      const mindestText = MINIMALSEITEN.has(seite) ? 30 : 200;
      if (mess.textLaenge < mindestText)
        befund("hoch", seite, vp.name, `fast kein sichtbarer Text (${mess.textLaenge} Zeichen) — leere Seite?`);
      if (mess.leereUeberschriften.length)
        befund("mittel", seite, vp.name, "Ueberschrift mit Text aber Hoehe 0", mess.leereUeberschriften);
      const echteFehler = konsolenfehler.filter((t) => !IST_ERWARTETER_401(seite, t));
      if (echteFehler.length)
        befund("mittel", seite, vp.name, `${echteFehler.length} Konsolenfehler`, echteFehler.slice(0, 3));

      console.log(
        `${vp.name.padEnd(7)} ${seite.padEnd(32)} HTTP ${res.status()}  scroll ${mess.scrollBreite}/${mess.viewportBreite}  h1=${mess.h1Zahl}  text=${mess.textLaenge}`
      );
    }
    await ctx.close();
  }
  await browser.close();

  writeFileSync(join(OUT, "befunde.json"), JSON.stringify({ base: BASE, befunde }, null, 2));
  const hart = befunde.filter((b) => b.schwere === "hoch" || b.schwere === "mittel");
  console.log(`\nVisueller Sweep: ${SEITEN.length} Seiten x ${VIEWPORTS.length} Breiten · ${befunde.length} Befund(e)`);
  for (const b of befunde) console.log(`  [${b.schwere}] ${b.viewport} ${b.seite} — ${b.text}`);
  console.log(`Bilder: ${OUT}`);
  process.exit(hart.length ? 1 : 0);
}

main().catch((e) => {
  console.error("visual-sweep Abbruch:", e);
  process.exit(2);
});
