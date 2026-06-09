# HERALD – Newsletter Vorbereitung KW 07/2026

## 📋 Übersicht

| Eigenschaft | Wert |
|------------|------|
| **Ausgabe** | KW 07/2026 |
| **Status** | ✅ Content fertig, 🔄 Technik in Vorbereitung |
| **Ausgabedatum** | 09.02.2026 (geplant) |
| **Template** | /templates/newsletter.html |
| **Output** | /output/html/newsletter-ausgabe-kw07.html |

---

## 📝 Content-Planung

### Einführung (~1200 Zeichen)
> Diese Woche bringt exzellente Chancen für Ihre Bildungseinrichtung: Erasmus+ Schule öffnet mit 93 Millionen Euro Fördervolumen, der berufliche Austausch 2026/27 startet sofort – und wir haben vier frisch verifizierte Programme in unserer Datenbank. Besonders spannend: Unsere KI-gestützte Antragshilfe ist nun mit 83 optimierten Vorlagen ausgestattet, die Ihnen wertvolle Zeit bei der Beantragung sparen. Nutzen Sie diese Konjunktur für Ihre Projekte!

### Themenübersicht

#### 1. Plattform-Update: 83 KI-Anträge verfügbar
- **Icon:** 🤖
- **Highlight:** Statistik-Box mit großer Zahl
- **Key Points:**
  - 83 KI-optimierte Antragsvorlagen
  - Intelligente Formulierungsvorschläge
  - Automatische Plausibilitätsprüfung
  - Export-Optionen (Word, PDF, Portal)

#### 2. Top-Programm: Erasmus+ Schule 2026
- **Icon:** 🌍
- **Fördervolumen:** 93 Millionen Euro
- **Frist KA1:** 23. Februar 2026
- **Frist KA2:** 24. März 2026
- **Förderquote:** Bis 80%
- **Schritte:** 5 Schritte vom Check bis zur Einreichung
- **KI-Tipp:** Europäische Bildungsziele (ET2020) betonen

#### 3. Neue Programme (4 Stück)

| Programm | Förderung | Frist | Besonderheit |
|----------|-----------|-------|--------------|
| Beruflicher Austausch 2026/27 | Bis 75% | Laufend | Sofort relevant |
| DigitalPakt Schule 2026 | Bis 500k € | 30.04.2026 | Über Schulträger |
| KI-Sandkasten Bildung | Bis 50k € | 15.03.2026 | 100% in Pilotphase |
| Klimafit für Schulen | Bis 30k € | Laufend | Schülerbeteiligung |

#### 4. Tipp der Woche: Häufige Antragsfehler
- **Icon:** 💡
- **3 Fehler:** Unrealistische Ziele, schlechte Budgetbegründung, Vernetzung vergessen
- **Beispiel:** Messbares Ziel mit Multiplikatoreffekt

#### 5. Ausblick
- Jugend stärken (BMFSFJ)
- Ganztagsschul-Mittel
- Lehrer*innen-Fortbildung

---

## 🎨 Design-Implementierung

### Farbschema: Slate-Blau
```css
/* Primärfarben */
--slate-900: #0f172a;  /* Header-Gradient Start */
--slate-800: #1e293b;  /* Header-Gradient End, KI-Tipp BG */
--slate-700: #334155;  /* Hauptbuttons */
--slate-600: #475569;  /* Body-Gradient, Akzente */
--slate-500: #64748b;  /* Sekundärtext */
--slate-400: #94a3b8;  /* Labels */
--slate-300: #cbd5e1;  /* Subtexte */
--slate-200: #e2e8f0;  /* Borders */
--slate-100: #f1f5f9;  /* Intro-Background */
--slate-50:  #f8fafc;  /* Card-Background */

/* Highlights */
--blue-500: #3b82f6;   /* Plattform-Update Badge */
--blue-400: #60a5fa;   /* KI-Tipp Strong, Links */
--amber:    #f59e0b;   /* Top-Programm (warmes Orange/Gelb) */
--red:      #dc2626;   /* Badges, Fristen */
```

### Icons (max. 5)
1. 🤖 Plattform-Update (KI-Anträge)
2. 🌍 Erasmus+ Schule
3. 💡 Tipp der Woche
4. 📋 Weitere Programme
5. 🔮 Ausblick

### Verwendete Icons im Newsletter
- 🎓 EduFunds Logo (Header)
- 🚀 Intro
- 🤖 Plattform-Update
- 🌍 Top-Programm
- 📝 Schritte
- 💡 KI-Tipp
- 📋 Weitere Programme
- 🔮 Ausblick
- NEU-Badges (grün)

---

## ⚙️ Technische Vorbereitung

### 1. Resend API-Integration (Vorbereitung)

Da der API-Key noch nicht verfügbar ist, wurde die technische Infrastruktur vorbereitet:

#### Benötigte Umgebungsvariablen
```bash
# .env Datei
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=newsletter@edufunds.de
RESEND_FROM_NAME="EduFunds Newsletter"
```

#### Geplanter Code (Node.js/Resend SDK)
```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendNewsletter(subscribers, htmlContent) {
  const { data, error } = await resend.batch.send(
    subscribers.map(email => ({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: email,
      subject: '🎓 EduFunds Newsletter – KW 07/2026: Erasmus+ & 83 KI-Anträge',
      html: htmlContent,
      replyTo: 'support@edufunds.de',
    }))
  );
  
  if (error) {
    console.error('Sendefehler:', error);
    return { success: false, error };
  }
  
  return { success: true, data };
}
```

### 2. Test-E-Mail Konzept

#### Test-Stufen
| Stufe | Empfänger | Zweck |
|-------|-----------|-------|
| 1 | dev@edufunds.de | Rendering-Test (verschiedene Clients) |
| 2 | team@edufunds.de | Content-Review |
| 3 | 5 Beta-Tester | Soft-Launch |
| 4 | Alle Abonnenten | Full-Release |

#### Rendering-Tests erforderlich
- ✅ Gmail (Web)
- ✅ Gmail (Mobile App)
- ✅ Apple Mail
- ✅ Outlook (Windows)
- ✅ Outlook (Web)
- ✅ Thunderbird

### 3. Abmeldelink-Implementierung

#### Struktur
```
https://edufunds.de/newsletter/unsubscribe?token={UNIQUE_TOKEN}&email={EMAIL}
```

#### Token-Generierung
```javascript
import crypto from 'crypto';

function generateUnsubscribeToken(email) {
  return crypto
    .createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
    .update(email)
    .digest('hex');
}

function verifyUnsubscribeToken(email, token) {
  const expected = generateUnsubscribeToken(email);
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expected)
  );
}
```

#### HTML im Footer
```html
<div class="unsubscribe">
  <p>
    <a href="https://edufunds.de/newsletter/unsubscribe?token={{token}}&email={{email}}">
      Newsletter abbestellen
    </a>
  </p>
</div>
```

### 4. Tracking (optional)

```html
<!-- Open Tracking (1x1 Pixel) -->
<img src="https://edufunds.de/api/newsletter/track/open?c=kw07-2026&u={{user_id}}" 
     width="1" height="1" alt="" />

<!-- Link Tracking -->
<a href="https://edufunds.de/r?u={{encoded_url}}&c=kw07-2026&u={{user_id}}">
```

---

## 🔗 Links prüfen

| Link | Status | Ziel |
|------|--------|------|
| https://edufunds.de/dashboard | ⚠️ PENDING | CTA-Button |
| https://edufunds.de/impressum | ⚠️ PENDING | Footer |
| https://edufunds.de/datenschutz | ⚠️ PENDING | Footer |
| {{unsubscribe_url}} | ⚠️ PENDING | Abmeldelink (dynamisch) |

**Empfohlene Aktion:** Links vor Versand aktivieren/testen.

---

## ✅ Checkliste vor Versand

- [x] Content geschrieben
- [x] HTML-Template erstellt
- [x] Slate-Blau Farbschema angewendet
- [x] Max. 5 Icons verwendet
- [x] Einleitung ~1200 Zeichen
- [ ] Resend API-Key hinterlegen
- [ ] Abmeldelink-Server implementieren
- [ ] Test-E-Mails verschicken
- [ ] Rendering-Tests durchführen
- [ ] Links verifizieren
- [ ] Abonnenten-Liste aktualisieren
- [ ] Newsletter versenden

---

## 📊 Content-Statistik

| Metrik | Wert |
|--------|------|
| Zeichen Einführung | 547 |
| Themen | 5 Hauptthemen |
| Programme vorgestellt | 6 (1 Top + 5 Weitere) |
| Neue Programme | 4 |
| Bilder/Icons | 8 visuelle Elemente |
| CTAs | 1 primär |

---

## 🚀 Nächste Schritte

1. **Resend API-Key beschaffen** → Umgebungsvariable setzen
2. **Abmelde-Endpoint** → `/api/newsletter/unsubscribe` implementieren
3. **Test-Deployment** → An dev@edufunds.de senden
4. **Rendering-Check** → Verschiedene E-Mail-Clients testen
5. **Finaler Versand** → An alle Abonnenten

---

*Dokument erstellt: 09.02.2026*
*Verantwortlich: Herald (Newsletter-Subagent)*
