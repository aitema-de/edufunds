#!/usr/bin/env python3
"""
KRITISCHE BEREINIGUNG – Entfernt fiktive Programme, markiert unverifizierte
"""

import json
from datetime import datetime

# Lade Daten
with open('/home/edufunds/edufunds-app/docs/programm_kategorisierung.json', 'r') as f:
    kat = json.load(f)

with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    programme = json.load(f)

print("🚨 KRITISCHE BEREINIGUNG")
print("="*70)

# IDs der zu entfernenden Programme
zu_entfernen = {e['id'] for e in kat['kategorien']['kritisch_fiktiv']}

# IDs der zu markierenden Programme
zu_markieren = {e['id'] for e in kat['kategorien']['unverifiziert']}

print(f"Zu entfernende Programme (fiktiv): {len(zu_entfernen)}")
print(f"Zu markierende Programme (unverifiziert): {len(zu_markieren)}")
print()

# Bereinige Liste
bereinigte_programme = []
entfernte_programme = []
markierte_programme = []

for p in programme:
    pid = p['id']
    
    if pid in zu_entfernen:
        # Programm wird entfernt
        entfernte_programme.append({
            'id': pid,
            'name': p['name'],
            'grund': 'Fiktives/nicht verifizierbares Programm'
        })
        print(f"❌ ENTFERNT: {p['name'][:50]}...")
        
    elif pid in zu_markieren:
        # Programm wird markiert als unverifiziert
        p['status'] = 'unverifiziert'
        p['verificationWarning'] = 'Dieses Programm hat nicht verifizierte Fördersummen. Bitte prüfen Sie die Daten vor einer Antragstellung.'
        p['updatedAt'] = datetime.now().isoformat()
        markierte_programme.append({
            'id': pid,
            'name': p['name'],
            'status': 'unverifiziert'
        })
        bereinigte_programme.append(p)
        print(f"❓ MARKIERT: {p['name'][:50]}...")
        
    else:
        # Programm bleibt unverändert
        bereinigte_programme.append(p)

print()
print("="*70)
print("📊 BEREINIGUNG ABGESCHLOSSEN:")
print(f"   ❌ Entfernt: {len(entfernte_programme)} Programme")
print(f"   ❓ Markiert: {len(markierte_programme)} Programme")
print(f"   ✅ Behalten: {len(bereinigte_programme) - len(markierte_programme)} Programme")
print(f"   📊 Neu gesamt: {len(bereinigte_programme)} Programme")

# Speichere bereinigte Liste
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'w', encoding='utf-8') as f:
    json.dump(bereinigte_programme, f, ensure_ascii=False, indent=2)

# Erstelle Report
report = {
    'timestamp': datetime.now().isoformat(),
    'vorherAnzahl': len(programme),
    'nachherAnzahl': len(bereinigte_programme),
    'entfernt': {
        'anzahl': len(entfernte_programme),
        'programme': entfernte_programme
    },
    'markiert': {
        'anzahl': len(markierte_programme),
        'programme': markierte_programme
    }
}

with open('/home/edufunds/edufunds-app/docs/bereinigung_report.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

# Markdown Report
md_report = f"""# Kritische Bereinigung – Entfernung fiktiver Programme

**Durchgeführt:** {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Zusammenfassung

| Metrik | Anzahl |
|--------|--------|
| Programme vorher | {len(programme)} |
| Programme nachher | {len(bereinigte_programme)} |
| Entfernt (fiktiv) | {len(entfernte_programme)} |
| Markiert (unverifiziert) | {len(markierte_programme)} |

## Entfernte Programme (Fiktiv/Nicht verifizierbar)

"""

for e in entfernte_programme:
    md_report += f"- ❌ **{e['name']}** (`{e['id']}`)\n"
    md_report += f"  - Grund: {e['grund']}\n\n"

md_report += f"""
## Markierte Programme (Unverifizierte Fördersummen)

{len(markierte_programme)} Programme wurden als 'unverifiziert' markiert und enthalten einen Warnhinweis.

"""

md_report += """
## Konsequenzen

### Für Nutzer:
- Nur noch verifizierte Programme werden ohne Warnung angezeigt
- Unverifizierte Programme haben einen deutlichen Warnhinweis
- Fiktive Programme wurden vollständig entfernt

### Für die Zukunft:
- Jedes neue Programm MUSS mit Quelle dokumentiert werden
- Fördersummen dürfen nicht mehr geschätzt werden
- Programme ohne echte Ausschreibung werden abgelehnt

---

**WICHTIG:** Diese Bereinigung war notwendig, um die Integrität der Plattform zu wahren.
"""

with open('/home/edufunds/edufunds-app/docs/BEREINIGUNG_REPORT.md', 'w', encoding='utf-8') as f:
    f.write(md_report)

print()
print("💾 Dateien gespeichert:")
print("   - data/foerderprogramme.json (bereinigt)")
print("   - docs/bereinigung_report.json")
print("   - docs/BEREINIGUNG_REPORT.md")
print("="*70)
