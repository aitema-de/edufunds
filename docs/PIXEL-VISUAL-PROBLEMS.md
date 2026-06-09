# 🖼️ PIXEL UX Audit - Visuelle Probleme Referenz

**Datum:** 13. Februar 2026

---

## Probleme mit Screenshot-Referenzen

Da Browser-Automation nicht verfügbar war, wurden die folgenden visuellen Probleme durch Code-Analyse identifiziert:

---

## 🔴 KRITISCHE Probleme

### Problem 1: Inkonsistente Primärfarben

**Beschreibung:**
Die Website verwendet zwei verschiedene Primärfarben:
- **Orange** (`#f97316`): In globals-new.css, Button-Komponenten
- **Gold** (`#c9a227`): In HeroSection, FeaturesSection, PricingCard

**Ort:**
- `/components/HeroSection.tsx` - Zeile 78-80: Gold für Akzente
- `/components/ui/button.tsx` - Zeile 14: Orange für Buttons
- `/components/PricingCard.tsx` - Zeile 42: Gold für Highlight

**Visuelle Auswirkung:**
Buttons auf der Startseite haben unterschiedliche Farben je nach Section:
- Hero: Dunkelblau (`#0a1628`) mit weißem Text
- Features: Gold-Akzente
- Footer: Orange Primary Buttons

**Empfohlene Lösung:**
```tsx
// Einheitliche Farbpalette
colors: {
  primary: '#c9a227',      // Gold als Hauptfarbe
  primaryHover: '#e4c55a', // Hellgold für Hover
  secondary: '#f97316',    // Orange nur für CTAs
}
```

---

### Problem 2: Inkonsistente Button-Styles

**Beschreibung:**
Drei verschiedene Button-Implementierungen:

**Variante A: btn-primary Klasse (globals-new.css)**
```css
.btn-primary {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: #0f172a;
}
```

**Variante B: Custom Hero Button**
```tsx
style={{ 
  backgroundColor: '#0a1628',
  color: '#f8f5f0',
}}
```

**Variante C: Tailwind-Button-Komponente**
```tsx
const variants = {
  default: "bg-orange-500 text-white hover:bg-orange-600",
  outline: "border border-slate-600 bg-transparent",
}
```

**Visuelle Auswirkung:**
Benutzer sehen auf verschiedenen Seiten unterschiedlich gestaltete Primary-Buttons, was Verwirrung stiftet.

---

## 🟠 HOHE Probleme

### Problem 3: Filter-Grid Responsive-Bruch

**Beschreibung:**
Auf Tablets (768px - 1024px) sind 5 Filter-Elemente in 2 Spalten zu eng.

**Ort:**
`/app/foerderprogramme/page.tsx` - Zeile ~290

**Aktueller Code:**
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
```

**Visuelles Problem:**
- Bei 768px-1024px: Filter-Dropdowns haben sehr geringe Breite
- Text wird abgeschnitten
- Schlechte Bedienbarkeit

**Empfohlene Lösung:**
```tsx
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
```

---

### Problem 4: Fehlende Focus-States

**Beschreibung:**
Viele interaktive Elemente haben keine sichtbaren Focus-States für Keyboard-Navigation.

**Betroffene Elemente:**
- Footer Links: Nur Text-Farbwechsel
- Social Media Icons: Kein Focus-Ring
- Stat-Cards: Keine Focus-Indikation
- Newsletter-Formular: Fehlende Focus-Styles

**Ort:**
- `/components/Footer.tsx` - Social Links (Zeile ~135)
- `/components/HeroSection.tsx` - Stat-Cards (Zeile ~155)

**Empfohlene Lösung:**
```tsx
// Für alle interaktiven Elemente
className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
```

---

## 🟡 MITTLERE Probleme

### Problem 5: Mobile Menu Icon-Abstand

**Beschreibung:**
Das Mobile Menu Button hat auf sehr kleinen Screens (< 360px) unzureichenden Abstand zum Logo.

**Ort:**
`/components/Header.tsx` - Mobile Menu Button

**Visuelles Problem:**
- Button ist zu nah am Logo
- Schlechte Touch-Target-Größe

**Empfohlene Lösung:**
```tsx
// Minimale Touch-Target-Größe von 44x44px sicherstellen
className="lg:hidden p-3 min-w-[44px] min-h-[44px] ..."
```

---

### Problem 6: Feature Card Text-Kontrast

**Beschreibung:**
Die Benefits-Section in FeaturesSection hat geringen Kontrast zwischen Icon und Hintergrund.

**Ort:**
`/components/FeaturesSection.tsx` - Benefits Grid

**Aktueller Code:**
```tsx
style={{ 
  backgroundColor: 'rgba(26, 77, 77, 0.3)',
  border: '1px solid rgba(26, 77, 77, 0.4)',
}}
// Icon Farbe: '#1a4d4d'
```

**Visuelles Problem:**
- Dunkelgrünes Icon auf dunklem Hintergrund
- Schlechte Lesbarkeit
- Kontrast unter 3:1

**Empfohlene Lösung:**
```tsx
// Helleres Icon oder hellerer Hintergrund
style={{ color: '#2dd4bf' }} // Helleres Türkis
```

---

### Problem 7: Pagination auf Mobile

**Beschreibung:**
Die Pagination auf der Förderprogramme-Seite bricht auf kleinen Screens um.

**Ort:**
`/app/foerderprogramme/page.tsx` - Pagination (Zeile ~340)

**Visuelles Problem:**
- Seitenzahlen werden zu eng
- "Zurück" und "Weiter" Buttons nehmen zu viel Platz
- Umbruch bei > 5 Seiten

**Empfohlene Lösung:**
```tsx
// Auf Mobile nur Vor/Zurück anzeigen
{isMobile ? (
  <div className="flex gap-2">
    <button>Zurück</button>
    <span>Seite {currentPage} von {totalPages}</span>
    <button>Weiter</button>
  </div>
) : (
  <FullPagination />
)}
```

---

## 🟢 NIEDRIGE Probleme

### Problem 8: Abweichende Schriftgrößen

**Beschreibung:**
Verschiedene Schriftgrößen für ähnliche Elemente:

| Element | HeroSection | FeaturesSection | Footer |
|---------|-------------|-----------------|--------|
| Section Label | text-xs | text-xs | text-sm |
| Card Title | text-xl | text-xl | text-lg |
| Body Text | text-sm | text-sm | text-base |

**Empfohlene Lösung:**
Einheitliche `SectionHeader`-Komponente verwenden.

---

### Problem 9: Inconsistent Border-Radii

**Beschreibung:**
Verschiedene Border-Radius-Werte:
- `rounded-lg` (0.5rem) - Buttons
- `rounded-xl` (0.75rem) - Cards
- `rounded-2xl` (1rem) - Glass-Cards
- `rounded-3xl` (1.5rem) - Newsletter

**Empfohlene Lösung:**
System auf 3 Werte reduzieren:
- `rounded-lg` - Kleine Elemente (Buttons, Inputs)
- `rounded-xl` - Cards
- `rounded-2xl` - Feature-Sections

---

## 📋 Screenshot-Wunschliste

Für einen vollständigen visuellen Audit wären folgende Screenshots erforderlich:

### Desktop (1920x1080)
- [ ] Startseite - Hero-Bereich
- [ ] Startseite - Features-Section
- [ ] Förderprogramme - Mit aktiven Filtern
- [ ] Förderprogramme - Leerer Zustand
- [ ] Preise - Alle 4 Pricing Cards
- [ ] Über uns - Team-Bereich
- [ ] Kontakt - Formular mit Fehlern
- [ ] Footer - Newsletter

### Tablet (768x1024)
- [ ] Navigation - Dropdown geöffnet
- [ ] Förderprogramme - Filter-Grid
- [ ] Preise - Responsive Cards

### Mobile (375x667)
- [ ] Mobile Menu - Geöffnet
- [ ] Förderprogramme - Filter
- [ ] Startseite - Hero-Stats
- [ ] Kontakt - Formular

### Interaktive Zustände
- [ ] Button Hover-States
- [ ] Focus-Ringe (Tab-Navigation)
- [ ] Formular-Validierungsfehler
- [ ] Loading-Spinner
- [ ] Skeleton-States

---

## 🔧 Quick-Fix Checklist

### Sofort umsetzbar (< 30 Minuten)

- [ ] Filter-Grid Breakpoints anpassen
- [ ] Feature Card Icon-Farbe heller machen
- [ ] Mobile Menu Button-Größe erhöhen
- [ ] Footer Social Icons Focus-States hinzufügen

### Kurzfristig (< 2 Stunden)

- [ ] Button-Komponenten vereinheitlichen
- [ ] Formular-Fehlermeldungen implementieren
- [ ] Pagination Mobile-Optimierung
- [ ] Focus-States vervollständigen

### Mittelfristig (< 1 Tag)

- [ ] Farbpalette dokumentieren und vereinheitlichen
- [ ] Design-Token-System einführen
- [ ] Alle Screenshots für Dokumentation erstellen

---

**Hinweis:** Diese Datei dient als Referenz für visuelle Probleme, die durch Code-Analyse identifiziert wurden. Für einen vollständigen visuellen Audit werden Browser-basierte Screenshots empfohlen.
