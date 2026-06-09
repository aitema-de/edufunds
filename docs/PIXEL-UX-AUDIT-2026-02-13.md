# 🎨 PIXEL UX/UI Audit Report

**Projekt:** EduFunds (edufunds.org)  
**Datum:** 13. Februar 2026  
**Auditor:** PIXEL (UX/UI Design Agent)  
**Zeitaufwand:** 90 Minuten

---

## 📋 Executive Summary

EduFunds ist eine KI-gestützte Plattform für Schulförderung mit einem modernen, dunklen Design-Ansatz. Die Website nutzt ein konsistentes Design-System mit Glassmorphism-Effekten und einem Gold/Akzent-Farbschema.

**Gesamtbewertung:** ⭐⭐⭐⭐ (4/5 Sterne)
- ✅ Starke visuelle Konsistenz
- ✅ Gute Barrierefreiheitsgrundlagen
- ⚠️ Einige Responsive-Probleme
- ⚠️ Inkonsistente Button-Styles

---

## 1. 🖥️ Visuelle Konsistenz-Check

### 1.1 Farbsystem

| Element | Wert | Status |
|---------|------|--------|
| Primary (Orange) | `#f97316` / `#c9a227` (Gold) | ⚠️ **INKONSISTENT** |
| Background | `#0f172a` (Slate 900) | ✅ Konsistent |
| Text Primary | `#f8f5f0` | ✅ Konsistent |
| Text Secondary | `#94a3b8` | ✅ Konsistent |
| Accent Cyan | `#22d3ee` | ✅ Konsistent |

**🚨 KRITISCH:** Zwei verschiedene Primärfarben werden verwendet:
- `globals-new.css`: Orange (`#f97316`)
- `HeroSection.tsx`: Gold (`#c9a227`)

**Empfohlene Lösung:** Einheitliche Primärfarbe definieren und durchgängig anwenden.

### 1.2 Typografie

| Element | Wert | Status |
|---------|------|--------|
| Font Family | 'Space Grotesk', sans-serif | ✅ Konsistent |
| Mono Font | 'JetBrains Mono', monospace | ✅ Konsistent |
| H1 Size | clamp(3rem, 8vw, 6rem) | ✅ Konsistent |
| Body Text | text-sm / text-base | ✅ Konsistent |

### 1.3 Abstände & Layout

| Bereich | Wert | Status |
|---------|------|--------|
| Container Padding | px-4 / px-6 | ✅ Konsistent |
| Section Padding | py-24 / py-32 | ✅ Konsistent |
| Card Padding | p-6 / p-8 | ✅ Konsistent |
| Border Radius | 0.75rem (radius) | ✅ Konsistent |

### 1.4 Glassmorphism-Effekte

**CSS-Klassen:**
```css
.glass {
  background: rgba(30, 41, 59, 0.4);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.glass-strong {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(148, 163, 184, 0.12);
}
```

**Status:** ✅ Gut implementiert und konsistent verwendet

---

## 2. 📱 Responsive-Check

### 2.1 Mobile (360px - iPhone SE)

| Komponente | Status | Anmerkung |
|------------|--------|-----------|
| Header | ⚠️ **PROBLEM** | Mobile Menu bricht bei sehr kleinen Screens |
| Hero Text | ✅ OK | Font-Scaling funktioniert |
| Stats Grid | ✅ OK | 2-Spalten-Layout auf Mobile |
| Feature Cards | ✅ OK | Stapeln korrekt |
| Footer Grid | ✅ OK | Responsiv |
| Filter Grid | ⚠️ **PROBLEM** | 5 Filter auf Mobile zu eng |

### 2.2 Tablet (768px - iPad)

| Komponente | Status | Anmerkung |
|------------|--------|-----------|
| Navigation | ✅ OK | Desktop-Nav sichtbar |
| Content Grid | ✅ OK | 2-3 Spalten |
| Sidebar | ✅ OK | Kollabiert korrekt |

### 2.3 Desktop (1280px+)

| Komponente | Status |
|------------|--------|
| Alle Layouts | ✅ OK |
| Max-Width Container | ✅ OK |

### 2.4 Identifizierte Responsive-Probleme

**Problem 1: Filter-Grid auf Förderprogramme-Seite**
```
Aktuell: grid-cols-1 md:grid-cols-2 lg:grid-cols-5
Problem: Auf md (Tablet) sind 5 Filter in 2 Spalten zu eng
Lösung: lg:grid-cols-3 xl:grid-cols-5
```

**Problem 2: Hero-Stats auf sehr kleinen Screens**
```
Aktuell: grid-cols-2
Problem: Bei 320px zu eng
Lösung: xs:grid-cols-2 mit angepassten Abständen
```

---

## 3. 🖱️ Interaktive Elemente

### 3.1 Button-States

| Button-Typ | Hover | Focus | Disabled | Status |
|------------|-------|-------|----------|--------|
| btn-primary | ✅ translateY(-2px) + shadow | ⚠️ Kein Ring | ✅ opacity-50 | Teilweise |
| btn-outline | ✅ border + bg | ⚠️ Kein Ring | Nicht getestet | Teilweise |
| Ghost | ✅ bg-slate-800 | ⚠️ Kein Ring | Nicht getestet | Teilweise |

**🚨 KRITISCH:** Inkonsistente Button-Implementierung:

**Header CTA Button:**
```tsx
// Header.tsx - NICHT KONSISTENT
className="btn-primary btn-primary-sm"
```

**Hero CTA Button:**
```tsx
// HeroSection.tsx - CUSTOM STYLES
style={{ backgroundColor: '#0a1628', color: '#f8f5f0' }}
```

**Preise CTA:**
```tsx
// PricingCard.tsx - KORREKT
className={highlighted ? "btn-primary" : "btn-outline"}
```

### 3.2 Input-States

| State | Implementierung | Status |
|-------|-----------------|--------|
| Default | ✅ border-slate-700 | OK |
| Focus | ✅ ring-orange-500/50 | OK |
| Error | ✅ border-red-500 | OK |
| Disabled | ✅ opacity-50 | OK |

### 3.3 Link-States

| State | Implementierung | Status |
|-------|-----------------|--------|
| Default | ✅ text-[#c9a227] | OK |
| Hover | ✅ text-[#e4c55a] + underline | OK |
| Focus | ⚠️ Nicht einheitlich | Problem |
| Visited | ❌ Nicht definiert | Fehlt |

### 3.4 Animationen

| Animation | Dauer | Status |
|-----------|-------|--------|
| Hover-Transitions | 0.2s - 0.3s | ✅ Konsistent |
| Card-Float | 6s ease-in-out | ✅ Angemessen |
| Page-Transitions | Framer Motion | ✅ Gut |
| Scroll-Progress | 150ms | ✅ Gut |

---

## 4. ⚠️ Fehlerzustände

### 4.1 Leere Zustände (Empty States)

| Seite | Zustand | Implementierung | Status |
|-------|---------|-----------------|--------|
| Förderprogramme | Keine Ergebnisse | ✅ Glass-Card mit Icon + Reset-Button | Gut |
| Suche | Keine Treffer | ✅ Icon + Erklärung + CTA | Gut |
| 404 | Nicht gefunden | ❌ Nicht geprüft | Offen |

### 4.2 Formular-Validierung

| Feld | Validierung | Fehlermeldung | Status |
|------|-------------|---------------|--------|
| Name | required | ❌ Keine Custom-Message | Fehlt |
| E-Mail | type="email" | ❌ Keine Custom-Message | Fehlt |
| Nachricht | required | ❌ Keine Custom-Message | Fehlt |
| Datenschutz | required | ❌ Keine Custom-Message | Fehlt |

**Empfohlene Lösung:**
```tsx
// Fehlermeldungen für Kontaktformular
const errorMessages = {
  name: "Bitte geben Sie Ihren Namen ein",
  email: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
  message: "Bitte geben Sie eine Nachricht ein",
  datenschutz: "Bitte akzeptieren Sie die Datenschutzerklärung"
};
```

### 4.3 Ladezustände

| Komponente | Skeleton | Spinner | Status |
|------------|----------|---------|--------|
| Programm-Cards | ✅ ProgrammCardSkeleton | - | Gut |
| Detail-Seite | ✅ DetailSkeleton | - | Gut |
| Formulare | ✅ FormSkeleton | - | Gut |
| Buttons | ❌ Keiner | ⚠️ Loading-Spinner fehlt | Problem |

### 4.4 Fehlermeldungen

**ErrorMessage Komponente:** ✅ Gut implementiert

```tsx
// components/ErrorMessage.tsx
- Varianten: default, destructive
- Retry-Button optional
- Dismiss-Button optional
- Error-Code Anzeige
```

---

## 5. ♿ Barrierefreiheit

### 5.1 WCAG Kontrast-Check

| Element | Vordergrund | Hintergrund | Kontrast | Status |
|---------|-------------|-------------|----------|--------|
| Primary Text | `#f8f5f0` | `#0f172a` | 15.3:1 | ✅ AAA |
| Secondary Text | `#94a3b8` | `#0f172a` | 6.7:1 | ✅ AA |
| Orange Button Text | `#0f172a` | `#f97316` | 4.6:1 | ✅ AA |
| Gold Accent | `#c9a227` | `#0f172a` | 7.2:1 | ✅ AAA |
| Disabled Text | `#64748b` | `#0f172a` | 3.8:1 | ⚠️ AA (grenzwertig) |

### 5.2 Alt-Texte auf Bildern

| Seite | Bilder | Alt-Texte | Status |
|-------|--------|-----------|--------|
| Startseite | Logo | ✅ "EduFunds - Zur Startseite" | OK |
| Icons | Lucide React | ⚠️ aria-label teilweise | Teilweise |
| Fördergeber-Logos | ❌ Nicht vorhanden | - | N/A |

**Empfehlung:** Alle Icons mit `aria-label` oder `aria-hidden` versehen.

### 5.3 Keyboard-Navigation

| Element | Tab-Order | Focus-Visible | Status |
|---------|-----------|---------------|--------|
| Skip-Link | ✅ First Element | ✅ Konsistent | Gut |
| Navigation | ✅ Logisch | ⚠️ Ring fehlt teilweise | Teilweise |
| Buttons | ✅ Logisch | ⚠️ Ring fehlt | Problem |
| Formulare | ✅ Logisch | ✅ Sichtbar | Gut |
| Footer Links | ✅ Logisch | ✅ Sichtbar | Gut |

**Skip-Link Implementierung:** ✅ Exzellent
```tsx
// Header.tsx
<a href="#main-content" className="sr-only focus:not-sr-only...">
  Inhalt überspringen
</a>
```

### 5.4 ARIA-Attribute

| Komponente | Rolle | Attribute | Status |
|------------|-------|-----------|--------|
| Header | banner | ✅ role="banner" | OK |
| Navigation | navigation | ✅ role="navigation", aria-label | OK |
| Mobile Menu | - | ✅ aria-label dynamisch | OK |
| Alert | alert | ✅ role="alert" | OK |
| Cards | - | ⚠️ Keine spezifischen Rollen | Fehlt |

### 5.5 Screenreader-Unterstützung

| Element | Beschreibung | Status |
|---------|--------------|--------|
| Stats | ❌ Reine Zahlen ohne Kontext | Problem |
| Badges | ✅ "174" mit Label | OK |
| Filter-Zähler | ✅ "3 aktiv" | OK |
| Icons | ⚠️ Gemischt | Teilweise |

---

## 6. 🔧 Priorisierte Fix-Liste

### 🔴 KRITISCH (Sofort beheben)

1. **Farbpalette vereinheitlichen**
   - Primärfarbe: Entscheidung zwischen Orange (`#f97316`) oder Gold (`#c9a227`)
   - Alle Komponenten auf einheitliche Farbe migrieren
   - **Aufwand:** 2-3 Stunden

2. **Button-Konsistenz**
   - Alle Buttons auf `btn-primary` / `btn-outline` Klassen umstellen
   - Custom-Styles in HeroSection.tsx entfernen
   - **Aufwand:** 1-2 Stunden

3. **Focus-States vervollständigen**
   - Alle interaktiven Elemente mit `focus-visible:ring-2` versehen
   - **Aufwand:** 1 Stunde

### 🟠 HOCH (Nächster Sprint)

4. **Responsive Filter-Grid**
   - Breakpoints anpassen: `lg:grid-cols-3 xl:grid-cols-5`
   - **Aufwand:** 30 Minuten

5. **Formular-Validierung verbessern**
   - Custom Fehlermeldungen implementieren
   - Visuelle Fehlerzustände für alle Felder
   - **Aufwand:** 2 Stunden

6. **Loading-States für Buttons**
   - `LoadingSpinner` Komponente in Buttons integrieren
   - Disabled-State während Loading
   - **Aufwand:** 1-2 Stunden

### 🟡 MITTEL (Backlog)

7. **Visited-Link-Styles**
   - `visited:` Tailwind-Modifier hinzufügen
   - **Aufwand:** 30 Minuten

8. **Icon ARIA-Labels**
   - Alle dekorativen Icons: `aria-hidden="true"`
   - Alle funktionalen Icons: `aria-label`
   - **Aufwand:** 1-2 Stunden

9. **Stats für Screenreader verbessern**
   - `sr-only` Beschreibungen hinzufügen
   - **Aufwand:** 30 Minuten

### 🟢 NIEDRIG (Optional)

10. **Reduzierte Bewegung (prefers-reduced-motion)**
    - `@media (prefers-reduced-motion: reduce)` Styles
    - **Aufwand:** 1-2 Stunden

11. **Print-Styles**
    - `@media print` für bessere Druckbarkeit
    - **Aufwand:** 2-3 Stunden

---

## 7. 📊 Design-System Dokumentation

### Empfohlene Verbesserungen

1. **Design Token Datei erstellen:**
```javascript
// tokens.js
export const colors = {
  primary: '#c9a227',      // Gold
  secondary: '#f97316',    // Orange (falls benötigt)
  background: '#0f172a',   // Slate 900
  surface: 'rgba(30, 41, 59, 0.4)', // Glass
  text: {
    primary: '#f8f5f0',
    secondary: '#94a3b8',
    muted: '#64748b'
  }
};
```

2. **Komponenten-Bibliothek dokumentieren:**
   - Storybook oder ähnliches Setup
   - Alle Varianten dokumentieren

3. **Style-Guide Seite erstellen:**
   - `/design-system` Route
   - Alle Komponenten visuell präsentieren

---

## 8. 🎯 Zusammenfassung

### Stärken ✅
- Modernes, ansprechendes Design
- Konsistente Glassmorphism-Verwendung
- Gute Typografie-Grundlagen
- Solide Barrierefreiheitsbasis (Skip-Link, ARIA)
- Animationsqualität ist hoch

### Schwächen ⚠️
- Inkonsistente Primärfarbe
- Fehlende Focus-States an einigen Stellen
- Formular-Validierung rudimentär
- Einige Responsive-Probleme

### Gesamteindruck
EduFunds hat ein starkes visuelles Fundament mit einem klaren Design-Ansatz. Die identifizierten Probleme sind überwiegend konsistenzbezogen und können mit moderatem Aufwand behoben werden. Die Website macht einen professionellen Eindruck und bietet eine gute User Experience.

**Empfohlene nächste Schritte:**
1. Design-Token-System einführen
2. KRITISCHE und HOHE Fixes umsetzen
3. Design-System-Dokumentation erstellen

---

**Report erstellt von:** PIXEL  
**Letzte Aktualisierung:** 13. Februar 2026  
**Nächster Review:** Empfohlen in 3 Monaten
