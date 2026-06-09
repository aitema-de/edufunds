#!/usr/bin/env python3
"""
KRITISCHE QUALITÄTSKONTROLLE – Überprüfung aller Programme
Prüft: Echtheit, Antragbarkeit, Fördersummen-Quellen, Link-Inhalt
"""

import json
import re
from urllib.parse import urlparse
from datetime import datetime

# Lade Programme
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    programme = json.load(f)

print("🚨 KRITISCHE QUALITÄTSKONTROLLE")
print("="*70)
print(f"Prüfe {len(programme)} Programme auf Echtheit und Verifizierbarkeit\n")

# Verdächtige Muster für nicht-existierende Programme
VERDAECHTIGE_NAMEN = [
    'strategie', 'initiative', 'konzept', 'rahmen', 'agenda', 'masterplan',
    'zukunft', 'vision', 'roadmap', 'leitlinie'
]

VERDAECHTIGE_BESCHREIBUNGEN = [
    'soll', 'wird angestrebt', 'planung', 'in entwicklung', 'vorbereitung',
    'zukünftig', 'perspektive', ' langfristig'
]

# Problem-Kategorien
probleme = {
    'fiktive_foerdersumme': [],
    'keine_antragbarkeit': [],
    'verdacht_nicht_existierend': [],
    'allgemeine_strategie': [],
    'unverifizierte_daten': [],
    'verdacht_falscher_link': []
}

def analysiere_programm(p):
    """Analysiert ein Programm auf Qualitätsprobleme"""
    issues = []
    pid = p.get('id', '')
    name = p.get('name', '')
    beschreibung = p.get('kurzbeschreibung', '').lower()
    foerdergeber = p.get('foerdergeber', '')
    
    # 1. Prüfe auf verdächtige Namen (Strategie, Konzept, etc.)
    name_lower = name.lower()
    for muster in VERDAECHTIGE_NAMEN:
        if muster in name_lower:
            issues.append({
                'typ': 'verdacht_strategie',
                'grund': f'Name enthält "{muster}" - möglicherweise keine echtes Förderprogramm'
            })
    
    # 2. Prüfe Beschreibung auf Planungs-Sprache
    for muster in VERDAECHTIGE_BESCHREIBUNGEN:
        if muster in beschreibung:
            issues.append({
                'typ': 'verdacht_planung',
                'grund': f'Beschreibung enthält "{muster}" - möglicherweise nicht umgesetzt'
            })
    
    # 3. Prüfe Fördersummen auf Plausibilität
    foerdermin = p.get('foerdersummeMin', 0)
    foedermax = p.get('foerdersummeMax', 0)
    
    # Sehr runde Zahlen sind verdächtig
    if foerdermin > 0 and foerdermin % 1000 == 0 and foerdermin < 100000:
        issues.append({
            'typ': 'fiktive_foerdersumme',
            'grund': f'Fördersumme Min ({foerdermin}€) sehr rund - vermutlich geschätzt'
        })
    
    if foedermax > 0 and foedermax % 1000 == 0 and foedermax < 500000:
        issues.append({
            'typ': 'fiktive_foerdersumme',
            'grund': f'Fördersumme Max ({foedermax}€) sehr rund - vermutlich geschätzt'
        })
    
    # Zu generische Fördersummen
    if foerdermin == 5000 and foedermax == 50000:
        issues.append({
            'typ': 'fiktive_foerdersumme',
            'grund': 'Generische Fördersumme 5.000-50.000€ - typisch für fiktive Programme'
        })
    
    if foerdermin == 10000 and foedermax == 100000:
        issues.append({
            'typ': 'fiktive_foerdersumme',
            'grund': 'Generische Fördersumme 10.000-100.000€ - typisch für fiktive Programme'
        })
    
    # 4. Prüfe Quelle
    quelle = p.get('quelle', '')
    if not quelle or quelle == 'unbekannt':
        issues.append({
            'typ': 'unverifizierte_daten',
            'grund': 'Keine Quelle angegeben'
        })
    
    # 5. Prüfe Bewerbungsfrist
    frist_text = p.get('bewerbungsfristText', '').lower()
    if 'laufend' in frist_text and foerdermin > 50000:
        issues.append({
            'typ': 'unplausible_frist',
            'grund': f'"Laufend" bei hoher Fördersumme ({foedermax}€) - unplausibel'
        })
    
    # 6. Prüfe Link auf Verdachtsfälle
    info_link = p.get('infoLink', '')
    if info_link:
        # Zu kurze Pfade sind verdächtig
        parsed = urlparse(info_link)
        if len(parsed.path) < 10 and parsed.path not in ['', '/']:
            issues.append({
                'typ': 'verdacht_falscher_link',
                'grund': f'Link-Pfad sehr kurz ({parsed.path}) - möglicherweise nicht spezifisch genug'
            })
    
    return issues

# Analysiere alle Programme
alle_probleme = []
programme_mit_problemen = 0

for p in programme:
    issues = analysiere_programm(p)
    if issues:
        programme_mit_problemen += 1
        alle_probleme.append({
            'programmId': p.get('id'),
            'programmName': p.get('name'),
            'foerdergeber': p.get('foerdergeber'),
            'infoLink': p.get('infoLink'),
            'foerdersumme': p.get('foerdersummeText'),
            'issues': issues
        })

# Statistik
print(f"📊 ERGEBNIS DER QUALITÄTSKONTROLLE:")
print(f"   Geprüfte Programme: {len(programme)}")
print(f"   Programme mit Problemen: {programme_mit_problemen}")
print(f"   Verdachtsfreie Programme: {len(programme) - programme_mit_problemen}")
print(f"   Verdachtsrate: {programme_mit_problemen/len(programme)*100:.1f}%")
print()

# Kategorisiere Probleme
kategorien = {}
for eintrag in alle_probleme:
    for issue in eintrag['issues']:
        typ = issue['typ']
        if typ not in kategorien:
            kategorien[typ] = []
        kategorien[typ].append({
            'id': eintrag['programmId'],
            'name': eintrag['programmName'],
            'grund': issue['grund']
        })

print("📋 PROBLEMKATEGORIEN:")
for kat, eintraege in sorted(kategorien.items(), key=lambda x: -len(x[1])):
    print(f"   {kat}: {len(eintraege)} Programme")
print()

# Speichere Ergebnisse
with open('/home/edufunds/edufunds-app/docs/qualitaetsaudit_raw.json', 'w', encoding='utf-8') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'gesamtProgramme': len(programme),
        'programmeMitProblemen': programme_mit_problemen,
        'verdachtsrateProzent': round(programme_mit_problemen/len(programme)*100, 1),
        'kategorien': {k: len(v) for k, v in kategorien.items()},
        'alleProbleme': alle_probleme
    }, f, ensure_ascii=False, indent=2)

print("💾 Audit gespeichert: docs/qualitaetsaudit_raw.json")
print()
print("🔍 ERSTE 15 KRITISCHE FÄLLE:")
for i, eintrag in enumerate(alle_probleme[:15], 1):
    print(f"\n{i}. {eintrag['programmName']}")
    print(f"   ID: {eintrag['programmId']}")
    print(f"   Fördergeber: {eintrag['foerdergeber']}")
    print(f"   Fördersumme: {eintrag['foerdersumme']}")
    print(f"   Link: {eintrag['infoLink']}")
    print("   Probleme:")
    for issue in eintrag['issues'][:3]:
        print(f"     - {issue['grund']}")
