"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Core Web Vitals Metriken
type WebVitalsMetric = {
  id: string;
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  entries: PerformanceEntry[];
};

// Web Vitals berichten
function reportWebVitals(metric: WebVitalsMetric) {
  // Zu Google Analytics senden
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", metric.name, {
      event_category: "Web Vitals",
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Zu Konsole loggen in Development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    });
  }

  // An eigenen Server senden (optional)
  if (process.env.NODE_ENV === "production") {
    // Batch-Upload für Analytics
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      page: window.location.pathname,
      timestamp: Date.now(),
    });

    // navigator.sendBeacon für zuverlässiges Senden
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/vitals", body);
    }
  }
}

// Performance Observer Setup
function observePerformance() {
  if (typeof window === "undefined") return;

  // Largest Contentful Paint (LCP)
  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        const metric: WebVitalsMetric = {
          id: lastEntry.id,
          name: "LCP",
          value: lastEntry.startTime,
          rating: lastEntry.startTime <= 2500 ? "good" : lastEntry.startTime <= 4000 ? "needs-improvement" : "poor",
          delta: 0,
          entries: entries,
        };
        
        reportWebVitals(metric);
      });
      
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (e) {
      console.error("LCP Observer failed:", e);
    }

    // First Input Delay (FID) - deprecated, jetzt INP
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry: any) => {
          const metric: WebVitalsMetric = {
            id: entry.id || "fid",
            name: "FID",
            value: entry.processingStart - entry.startTime,
            rating: entry.processingStart - entry.startTime <= 100 ? "good" : 
                    entry.processingStart - entry.startTime <= 300 ? "needs-improvement" : "poor",
            delta: 0,
            entries: [entry],
          };
          
          reportWebVitals(metric);
        });
      });
      
      fidObserver.observe({ entryTypes: ["first-input"] });
    } catch (e) {
      console.error("FID Observer failed:", e);
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      let clsEntries: PerformanceEntry[] = [];
      
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        });
        
        const metric: WebVitalsMetric = {
          id: "cls",
          name: "CLS",
          value: clsValue,
          rating: clsValue <= 0.1 ? "good" : clsValue <= 0.25 ? "needs-improvement" : "poor",
          delta: 0,
          entries: clsEntries,
        };
        
        reportWebVitals(metric);
      });
      
      clsObserver.observe({ entryTypes: ["layout-shift"] });
    } catch (e) {
      console.error("CLS Observer failed:", e);
    }
  }

  // Time to First Byte (TTFB)
  if ("performance" in window) {
    const navEntry = performance.getEntriesByType("navigation")[0] as any;
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.startTime;
      
      const metric: WebVitalsMetric = {
        id: "ttfb",
        name: "TTFB",
        value: ttfb,
        rating: ttfb <= 600 ? "good" : ttfb <= 1000 ? "needs-improvement" : "poor",
        delta: 0,
        entries: [navEntry],
      };
      
      reportWebVitals(metric);
    }
  }
}

// Component
export function WebVitals() {
  const pathname = usePathname();

  useEffect(() => {
    // Nur in Production oder bei explizitem Debug
    if (process.env.NODE_ENV === "production" || localStorage.getItem("debug-vitals")) {
      observePerformance();
    }
  }, [pathname]);

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
      
      const lcp = lcpEntries.length > 0 
        ? lcpEntries[lcpEntries.length - 1].startTime 
        : null;
      
      const ttfb = navEntry 
        ? navEntry.responseStart - navEntry.startTime 
        : null;

      resolve({
        lcp,
        fid: null, // Wird async gemessen
        cls: null, // Wird über Zeit akkumuliert
        ttfb,
      });
    }, 100);
  });
}
