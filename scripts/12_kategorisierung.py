#!/usr/bin/env python3
"""
DETAILLIERTE QUALITÄTSANALYSE – Kategorisierung aller Programme
Teilt Programme in: VERIFIZIERT, UNVERIFIZIERT, KRITISCH
"""

import json
from datetime import datetime

# Lade Audit-Daten
with open('/home/edufunds/edufunds-app/docs/qualitaetsaudit_raw.json', 'r') as f:
    audit = json.load(f)

# Lade Programme
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    programme = json.load(f)

print("🔍 DETAILLIERTE QUALITÄTSANALYSE")
print("="*70)

# Liste bekannter, echter Programme (mit echten Ausschreibungen)
VERIFIZIERT_ECHT = {
    # Bekannte, echte Programme mit echten Ausschreibungen
    'bmbf-kultur-macht-stark',  # Kultur macht stark ist echt
    'bmbf-digitalpakt-2',  # DigitalPakt ist echt
    'eu-erasmus-schulen',  # Erasmus+ ist echt
    'telekom-mint',  # Telekom Stiftung fördert echt
    'klaus-tschira-mint',  # KTS fördert echt
    'startchancen-programm',  # Startchancen ist echt (2024 gestartet)
    'kultur-macht-stark',  # Bündnisprogramm
    'lesen-macht-stark',
    'sprache-macht-stark',
    'demokratie-leben',  # Demokratie leben! ist echt
}

# Kategorisiere Programme
kategorien = {
    'verifiziert_echt': [],  # Bekannte echte Programme
    'wahrscheinlich_echt': [],  # Plausible echte Programme
    'unverifiziert': [],  # Unsicher - muss geprüft werden
    'kritisch_fiktiv': [],  # Hohe Wahrscheinlichkeit fiktiv
}

programme_dict = {p['id']: p for p in programme}

for problem in audit['alleProbleme']:
    pid = problem['programmId']
    p = programme_dict.get(pid, {})
    
    # Zähle Probleme
    anzahl_probleme = len(problem['issues'])
    hat_fiktive_summe = any(i['typ'] == 'fiktive_foerdersumme' for i in problem['issues'])
    hat_strategie_verdacht = any(i['typ'] in ['verdacht_strategie', 'verdacht_planung'] for i in problem['issues'])
    
    # Kategorisierung
    if pid in VERIFIZIERT_ECHT:
        kategorien['verifiziert_echt'].append({
            'id': pid,
            'name': problem['programmName'],
            'grund': 'Bekanntes echtes Programm',
            'probleme': anzahl_probleme
        })
    elif hat_strategie_verdacht:
        kategorien['kritisch_fiktiv'].append({
            'id': pid,
            'name': problem['programmName'],
            'grund': 'Verdacht auf Strategie/Masterplan statt echtem Programm',
            'probleme': anzahl_probleme
        })
    elif anzahl_probleme >= 3:
        kategorien['kritisch_fiktiv'].append({
            'id': pid,
            'name': problem['programmName'],
            'grund': f'{anzahl_probleme} Qualitätsprobleme',
            'probleme': anzahl_probleme
        })
    elif hat_fiktive_summe:
        kategorien['unverifiziert'].append({
            'id': pid,
            'name': problem['programmName'],
            'grund': 'Fördersumme nicht verifiziert',
            'probleme': anzahl_probleme
        })
    else:
        kategorien['wahrscheinlich_echt'].append({
            'id': pid,
            'name': problem['programmName'],
            'grund': 'Plausibel, aber nicht verifiziert',
            'probleme': anzahl_probleme
        })

# Füge problemfreie Programme hinzu
alle_problem_ids = {p['programmId'] for p in audit['alleProbleme']}
for p in programme:
    if p['id'] not in alle_problem_ids:
        kategorien['verifiziert_echt'].append({
            'id': p['id'],
            'name': p['name'],
            'grund': 'Keine automatischen Qualitätsprobleme erkannt',
            'probleme': 0
        })

# Ausgabe
print("\n📊 KATEGORISIERUNG:")
print("="*70)

total = sum(len(v) for v in kategorien.values())

for kat, eintraege in kategorien.items():
    prozent = len(eintraege) / total * 100 if total > 0 else 0
    status_symbol = {
        'verifiziert_echt': '✅',
        'wahrscheinlich_echt': '⚠️',
        'unverifiziert': '❓',
        'kritisch_fiktiv': '❌'
    }.get(kat, '?')
    
    print(f"\n{status_symbol} {kat.upper().replace('_', ' ')}: {len(eintraege)} Programme ({prozent:.1f}%)")
    
    for e in eintraege[:10]:  # Zeige max 10 pro Kategorie
        print(f"   - {e['name'][:50]}...")
        if e['probleme'] > 0:
            print(f"     ({e['probleme']} Probleme)")
    
    if len(eintraege) > 10:
        print(f"   ... und {len(eintraege) - 10} weitere")

# Speichere Ergebnis
with open('/home/edufunds/edufunds-app/docs/programm_kategorisierung.json', 'w', encoding='utf-8') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'kategorien': {
            k: [{'id': e['id'], 'name': e['name'], 'grund': e['grund']} for e in v]
            for k, v in kategorien.items()
        },
        'statistik': {
            'gesamt': total,
            'verifiziert_echt': len(kategorien['verifiziert_echt']),
            'wahrscheinlich_echt': len(kategorien['wahrscheinlich_echt']),
            'unverifiziert': len(kategorien['unverifiziert']),
            'kritisch_fiktiv': len(kategorien['kritisch_fiktiv'])
        }
    }, f, ensure_ascii=False, indent=2)

print(f"\n💾 Kategorisierung gespeichert")
print("="*70)
print("\n🚨 HANDLUNGSEMPFEHLUNG:")
print(f"   ❌ {len(kategorien['kritisch_fiktiv'])} Programme sollten ENTFERNT werden")
print(f"   ❓ {len(kategorien['unverifiziert'])} Programme müssen VERIFIZIERT werden")
print(f"   ⚠️ {len(kategorien['wahrscheinlich_echt'])} Programme sind PLAUSIBEL")
print(f"   ✅ {len(kategorien['verifiziert_echt'])} Programme sind VERIFIZIERT")
