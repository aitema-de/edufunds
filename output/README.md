# DATENÜBERGABE-KONZEPT

## 📁 Standard-Verzeichnisstruktur

```
/output/
├── html/          # HTML-Vorschauen
├── pdf/           # PDF-Berichte
├── word/          # Word-Dokumente (.docx)
└── reports/       # Rohdaten (JSON, MD)
```

## 🔄 Workflow für Datei-Übergabe

### 1. Agent erstellt Inhalt
Agent speichert in `/output/reports/` als Markdown/JSON

### 2. Konvertierung
Automatische Konvertierung:
- Markdown → HTML (für Vorschau)
- Markdown → PDF (für Berichte)
- HTML → Word (wenn nötig)

### 3. Übergabe an Kolja
**Option A:** Direkt im Chat
- HTML: Als Code-Block (übersichtlich)
- PDF: Download-Link zu GitHub
- Word: Download-Link zu GitHub

**Option B:** Verzeichnis
- Alle Dateien in `/output/[typ]/`
- GitHub-Link zum Verzeichnis
- Oder: curl-Befehle zum Download

## 📋 Konkrete Beispiele

### Newsletter
```
/output/
├── html/newsletter-vorschau.html
├── pdf/newsletter-vorschau.pdf
└── reports/newsletter-content.json
```

### Pen-Test-Bericht
```
/output/
├── html/pen-test-report.html
├── pdf/pen-test-report.pdf
├── word/pen-test-report.docx
└── reports/pen-test-rohdaten.md
```

## 🛠️ Tools für Konvertierung

- **Markdown → PDF:** `pandoc` oder `md-to-pdf`
- **Markdown → HTML:** `marked` oder `pandoc`
- **HTML → Word:** `pandoc` (am zuverlässigsten)

## 📎 Datei-Upload im Chat

Wenn möglich:
- PDFs direkt anhängen
- HTML als formatierter Text
- Word-Links zu GitHub Raw

## 🔗 GitHub-Links

Beispiel:
```
https://github.com/Aitema-gmbh/edufunds/blob/main/output/pdf/newsletter.pdf
https://raw.githubusercontent.com/Aitema-gmbh/edufunds/main/output/pdf/newsletter.pdf
```

---

*Standard ab sofort gültig*
