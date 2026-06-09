#!/usr/bin/env python3
"""
Link-Validierung und Korrektur für Förderprogramme
Ziel: 95% Treffsicherheit
"""

import json
from urllib.parse import urlparse
from datetime import datetime
import re

# Lade die JSON-Datei
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    programme = json.load(f)

print(f"📊 Gefundene Programme: {len(programme)}")

# Zähle Links
total_links = 0
for p in programme:
    if p.get('infoLink'): total_links += 1
    if p.get('antragsLink'): total_links += 1

print(f"🔗 Zu prüfende Links: {total_links}")

# Liste der problematischen Startseiten-Muster
STARTSEITEN_MUSTER = [
    '/DE/Home/home_node.html',
    '/DE/home/home_node.html', 
    '/index.html',
    '/de',
    '/de/',
    '/de/home',
    '/DE',
    '/DE/',
    '/',
    '/startseite',
    '/startseite/',
    '/home',
    '/home/',
]

# Bewertung: Ist der Link verdächtig (nur Startseite)?
def ist_startseite_link(url):
    if not url:
        return True
    
    parsed = urlparse(url)
    path = parsed.path.lower()
    
    # Direkte Startseiten
    if path in ['', '/', '/index.html', '/index.php']:
        return True
    
    # Muster prüfen
    for muster in STARTSEITEN_MUSTER:
        if path == muster.lower():
            return True
    
    # Nur Domain ohne spezifischer Pfad
    if path.count('/') <= 1 and len(path) < 15:
        return True
    
    return False

# Analyse der aktuellen Links
probleme = []
saubere_links = 0

for p in programme:
    pid = p.get('id', 'unbekannt')
    name = p.get('name', 'unbekannt')
    info_link = p.get('infoLink', '')
    antrag_link = p.get('antragsLink', '')
    foerdergeber = p.get('foerdergeber', '')
    
    # Prüfe infoLink
    if ist_startseite_link(info_link):
        probleme.append({
            'programmId': pid,
            'programmName': name,
            'foerdergeber': foerdergeber,
            'linkType': 'infoLink',
            'aktuellerLink': info_link,
            'problem': 'Verdächtiger Link - führt wahrscheinlich zur Startseite'
        })
    else:
        saubere_links += 1
    
    # Prüfe antragsLink (wenn vorhanden)
    if antrag_link and ist_startseite_link(antrag_link):
        probleme.append({
            'programmId': pid,
            'programmName': name,
            'foerdergeber': foerdergeber,
            'linkType': 'antragsLink',
            'aktuellerLink': antrag_link,
            'problem': 'Verdächtiger Link - führt wahrscheinlich zur Startseite'
        })
    elif antrag_link:
        saubere_links += 1

print(f"\n📋 Analyse-Ergebnis:")
print(f"   ✅ Saubere Links: {saubere_links}")
print(f"   ❌ Problematische Links: {len(probleme)}")
print(f"   📊 Treffsicherheit aktuell: {(saubere_links/total_links*100):.1f}%")

# Speichere Analyse
with open('/home/edufunds/edufunds-app/docs/link_analyse_raw.json', 'w', encoding='utf-8') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'gesamtProgramme': len(programme),
        'gesamtLinks': total_links,
        'saubereLinks': saubere_links,
        'problematischeLinks': len(probleme),
        'treffsicherheit': round(saubere_links/total_links*100, 1),
        'probleme': probleme
    }, f, ensure_ascii=False, indent=2)

print("\n💾 Analyse gespeichert: docs/link_analyse_raw.json")
print("\n🔍 Erste 20 problematische Links:")
for i, prob in enumerate(probleme[:20], 1):
    print(f"{i}. {prob['programmName'][:50]}...")
    print(f"   Link: {prob['aktuellerLink']}")
