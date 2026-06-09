# AGENTEN-REGELN (Verschärft)

## 🚨 Automatische Kill-Bedingungen

Ein Agent wird SOFORT gekillt bei:
1. **Inaktivität >15 Minuten** ohne Fortschritt (keine Tool-Calls)
2. **Kein Output nach 30 Minuten** (weder Ergebnis noch Zwischenbericht)
3. **Selber Fehler 3x wiederholt** (z.B. gleiche Datei nicht lesbar)
4. **Off-Topic** (beschäftigt sich nicht mit der Aufgabe)

## 📝 Pflicht-Reporting (Alle 10 Minuten)

Agent muss schreiben:
```
[STATUS UPDATE]
- Zeit vergangen: X Min
- Fortschritt: Y%
- Aktuell: [Was mache ich gerade?]
- Nächster Schritt: [Was kommt als nächstes?]
- Blocker: [Was hindert mich?]
```

**Wenn kein Update nach 10 Minuten → Main Agent benachrichtigen**

## ✅ Checkliste vor Abschluss

Agent muss prüfen:
- [ ] Erfolgskriterien erreicht?
- [ ] Output-Dateien existieren?
- [ ] Report geschrieben?
- [ ] Zeitlimit eingehalten?

**Nur wenn alles Ja → Fertig melden**

## ❌ Verboten

- Still aufhören ohne Report
- "Ich denke nach" >5 Minuten
- Selbe Aktion >3x wiederholen ohne Erfolg
- Aufgabe ändern ohne Erlaubnis

## 🔥 Eskalation

**Wenn Agent merkt er kommt nicht weiter:**
1. Sofort Main Agent benachrichtigen
2. Dokumentieren: Was wurde versucht?
3. Empfehlung geben: Wie weiter?

**Nie alleine aufgeben!**

---

*Gültig ab: 2026-02-12*
