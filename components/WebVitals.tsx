"use client";

import { useEffect } from "react";

// Core Web Vitals Metriken
type WebVitalsMetric = {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
};

/**
 * Web Vitals berichten — ausschließlich an den eigenen Endpunkt (/api/vitals).
 * Kein Drittanbieter-Tracking: EduFunds setzt bewusst keine Analyse-Dienste ein
 * (siehe /avv und Datenschutzerklärung), damit ohne Einwilligung auch nichts
 * an Dritte abfließt und kein Consent-Banner nötig wird.
 *
 * ⚠️ Lehre aus dem Vitals-Sturm (22.07.2026, Prod): Die Vorgängerfassung hat
 * (a) pro Route-Wechsel NEUE PerformanceObserver angelegt, ohne die alten zu
 * trennen, und (b) pro Layout-Shift-Ereignis SOFORT einen Beacon geschickt.
 * Ergebnis: >2.500 POSTs auf /api/vitals in 29 Minuten aus EINEM Browser —
 * das Rate-Limit der IP war dauerhaft ausgeschöpft und blockierte auch
 * funktionale API-Routen (/api/match → „KI überlastet").
 *
 * Deshalb jetzt das Standard-Muster der web-vitals-Bibliothek:
 * - Observer werden GENAU EINMAL pro Seitenladevorgang registriert
 *   (Modul-Guard), nicht pro Client-Navigation.
 * - Metriken werden nur GESAMMELT (letzter Stand pro Metrik) und erst beim
 *   Verlassen/Verstecken der Seite als je EIN Beacon pro Metrik gesendet.
 * - Harte Obergrenze an Beacons pro Seitenladevorgang als letzte Sicherung.
 */

const metricBuffer = new Map<string, WebVitalsMetric>();
let observersStarted = false;
let flushListenersInstalled = false;
let beaconsSent = 0;
const MAX_BEACONS_PER_PAGELOAD = 20;

function bufferMetric(metric: WebVitalsMetric) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
    });
  }
  // Nur letzten Stand behalten — CLS/LCP aktualisieren sich mehrfach,
  // gesendet wird erst beim Flush.
  metricBuffer.set(metric.name, metric);
}

function flushMetrics() {
  if (process.env.NODE_ENV !== "production") {
    metricBuffer.clear();
    return;
  }
  if (!navigator.sendBeacon) return;

  metricBuffer.forEach((metric) => {
    if (beaconsSent >= MAX_BEACONS_PER_PAGELOAD) return;
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      page: window.location.pathname,
      timestamp: Date.now(),
    });
    navigator.sendBeacon("/api/vitals", body);
    beaconsSent++;
  });
  metricBuffer.clear();
}

function installFlushListeners() {
  if (flushListenersInstalled) return;
  flushListenersInstalled = true;

  // visibilitychange→hidden deckt Tab-Wechsel/Minimieren ab, pagehide das
  // Schließen/Navigieren — zusammen das zuverlässigste Sende-Fenster.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushMetrics();
  });
  window.addEventListener("pagehide", flushMetrics);
}

// Performance Observer Setup — einmal pro Seitenladevorgang.
function observePerformance() {
  if (typeof window === "undefined") return;
  if (observersStarted) return;
  observersStarted = true;

  installFlushListeners();

  if ("PerformanceObserver" in window) {
    // Largest Contentful Paint (LCP) — letzter Kandidat zählt.
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (!lastEntry) return;
        bufferMetric({
          name: "LCP",
          value: lastEntry.startTime,
          rating:
            lastEntry.startTime <= 2500
              ? "good"
              : lastEntry.startTime <= 4000
                ? "needs-improvement"
                : "poor",
        });
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (e) {
      console.error("LCP Observer failed:", e);
    }

    // First Input Delay (FID) — nur der erste Input zählt, danach trennen.
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entry = list.getEntries()[0] as any;
        if (!entry) return;
        const value = entry.processingStart - entry.startTime;
        bufferMetric({
          name: "FID",
          value,
          rating: value <= 100 ? "good" : value <= 300 ? "needs-improvement" : "poor",
        });
        fidObserver.disconnect();
      });
      fidObserver.observe({ entryTypes: ["first-input"] });
    } catch (e) {
      console.error("FID Observer failed:", e);
    }

    // Cumulative Layout Shift (CLS) — akkumulieren, NICHT pro Shift senden.
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) clsValue += entry.value;
        });
        bufferMetric({
          name: "CLS",
          value: clsValue,
          rating: clsValue <= 0.1 ? "good" : clsValue <= 0.25 ? "needs-improvement" : "poor",
        });
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });
    } catch (e) {
      console.error("CLS Observer failed:", e);
    }
  }

  // Time to First Byte (TTFB) — einmalig aus dem Navigation-Timing.
  if ("performance" in window) {
    const navEntry = performance.getEntriesByType("navigation")[0] as any;
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.startTime;
      bufferMetric({
        name: "TTFB",
        value: ttfb,
        rating: ttfb <= 600 ? "good" : ttfb <= 1000 ? "needs-improvement" : "poor",
      });
    }
  }
}

// Component
export function WebVitals() {
  useEffect(() => {
    // Nur in Production oder bei explizitem Debug
    if (process.env.NODE_ENV === "production" || localStorage.getItem("debug-vitals")) {
      observePerformance();
    }
  }, []);

  return null;
}

// Hilfsfunktion für manuelle Vitals-Checks
export function getWebVitalsSummary(): Promise<{
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
}> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ lcp: null, fid: null, cls: null, ttfb: null });
      return;
    }

    // Warte auf alle Metriken
    setTimeout(() => {
      const navEntry = performance.getEntriesByType("navigation")[0] as any;
      const lcpEntries = performance.getEntriesByType("largest-contentful-paint") as any[];

      const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null;

      const ttfb = navEntry ? navEntry.responseStart - navEntry.startTime : null;

      resolve({
        lcp,
        fid: null, // Wird async gemessen
        cls: null, // Wird über Zeit akkumuliert
        ttfb,
      });
    }, 100);
  });
}
