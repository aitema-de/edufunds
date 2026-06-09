#!/usr/bin/env python3
"""
Link-Korrektur Runde 3 - Umfassende Korrektur verbleibender Links
"""

import json
from datetime import datetime
from urllib.parse import urlparse

# Lade Programme
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    programme = json.load(f)

print(f"🔧 Starte Link-Korrektur Runde 3 (Umfassend)...\n")

# Umfassende Korrekturen
KORREKTUREN_R3 = {
    # Stiftungen
    "mercator-digitalisierung": {
        "infoLink": "https://www.stiftung-mercator.de/de/projekte/bildung-und-wissenschaft/",
        "quelle": "stiftung-mercator.de"
    },
    "mercator-integration": {
        "infoLink": "https://www.stiftung-mercator.de/de/projekte/bildung-und-wissenschaft/",
        "quelle": "stiftung-mercator.de"
    },
    "mercator-schulen-im-team": {
        "infoLink": "https://www.stiftung-mercator.de/de/projekte/schulen-im-team/",
        "quelle": "stiftung-mercator.de"
    },
    "bmw-stiftung-demokratie": {
        "infoLink": "https://www.bmw-stiftung.de/foerderung/",
        "quelle": "bmw-stiftung.de"
    },
    "bmw-nachhaltigkeit": {
        "infoLink": "https://www.bmw-stiftung.de/foerderung/",
        "quelle": "bmw-stiftung.de"
    },
    "heinrich-boell-bildung": {
        "infoLink": "https://www.boell.de/de/foerderung",
        "quelle": "boell.de"
    },
    "stifterverband-bildung": {
        "infoLink": "https://www.stifterverband.org/was-wir-tun/foerderung",
        "quelle": "stifterverband.org"
    },
    "zeiss-stiftung-mint": {
        "infoLink": "https://www.carl-zeiss-stiftung.de/foerderung/",
        "quelle": "carl-zeiss-stiftung.de"
    },
    "zeiss-wissenschaft": {
        "infoLink": "https://www.carl-zeiss-stiftung.de/foerderung/",
        "quelle": "carl-zeiss-stiftung.de"
    },
    
    # Verbände
    "nabu-schulen": {
        "infoLink": "https://www.nabu.de/umwelt-und-bildung/schulen/",
        "quelle": "nabu.de"
    },
    "bfn-artenvielfalt": {
        "infoLink": "https://www.bfn.de/foerderung.html",
        "quelle": "bfn.de"
    },
    "dosb-schulsport": {
        "infoLink": "https://www.dosb.de/foerderung/schul-sport/",
        "quelle": "dosb.de"
    },
    "aok-gesundheit": {
        "infoLink": "https://www.aok.de/pk/gesundheit/gesundheit-in-der-schule/",
        "quelle": "aok.de"
    },
    "wissenschaft-im-dialog": {
        "infoLink": "https://www.wissenschaft-im-dialog.de/foerderung/",
        "quelle": "wissenschaft-im-dialog.de"
    },
    "chemie-fonds": {
        "infoLink": "https://www.fondsderchemischenindustrie.de/foerderung/schulen/",
        "quelle": "fondsderchemischenindustrie.de"
    },
    "vw-stiftung": {
        "infoLink": "https://www.volkswagenstiftung.de/de/foerderung",
        "quelle": "volkswagenstiftung.de"
    },
    "telekom-stiftung": {
        "infoLink": "https://www.telekom-stiftung.de/themen/digitale-bildung",
        "quelle": "telekom-stiftung.de"
    },
    
    # DKJS
    "dkjs-sport": {
        "infoLink": "https://www.dkjs.de/foerderung/sport-und-bewegung.html",
        "quelle": "dkjs.de"
    },
    "dkjs-inklusion": {
        "infoLink": "https://www.dkjs.de/foerderung/inklusion.html",
        "quelle": "dkjs.de"
    },
    
    # Kinderschutz
    "deutsche-kinderschutz": {
        "infoLink": "https://www.kinderschutzbund.de/foerderung/",
        "quelle": "kinderschutzbund.de"
    },
    
    # Berlin
    "berlin-schulbau": {
        "infoLink": "https://www.berlin.de/sen/bildung/schulbau/",
        "quelle": "berlin.de"
    },
    
    # Demokratie leben!
    "bmfsfj-demokratie": {
        "infoLink": "https://www.demokratie-leben.de/programm/foerderung/",
        "quelle": "demokratie-leben.de"
    },
    
    # EU Horizon
    "eu-horizon": {
        "infoLink": "https://www.horizon-europe.de/de/foerderung",
        "quelle": "horizon-europe.de"
    },
    
    # Siemens
    "siemens-partnerschulen": {
        "infoLink": "https://www.siemens-stiftung.org/de/projekte/bildung/",
        "quelle": "siemens-stiftung.org"
    },
    
    # Aktuelle Ausschreibungen 2026
    "mint-digitale-schule-2026": {
        "infoLink": "https://mintzukunftschaffen.de/foerderung/",
        "quelle": "mintzukunftschaffen.de"
    },
    "telekom-junior-ingenieur-2026": {
        "infoLink": "https://www.telekom-stiftung.de/projekte/junior-ingenieur-akademie",
        "quelle": "telekom-stiftung.de"
    },
    "erasmus-schulentwicklung-2026": {
        "infoLink": "https://erasmusplus.schule/de/foerderung.html",
        "quelle": "erasmusplus.schule"
    },
    "bayern-kulturfonds-2026": {
        "infoLink": "https://www.km.bayern.de/kunst-und-kultur/foerderung/",
        "quelle": "km.bayern.de"
    },
}

korrigiert = 0
report = []

for p in programme:
    pid = p.get('id')
    if pid in KORREKTUREN_R3:
        alter_link = p.get('infoLink', '')
        neue_daten = KORREKTUREN_R3[pid]
        neuer_link = neue_daten['infoLink']
        
        if alter_link != neuer_link:
            report.append({
                'programmId': pid,
                'programmName': p.get('name'),
                'alterLink': alter_link,
                'neuerLink': neuer_link,
                'korrekturGrund': 'Startseite statt Programmseite',
                'quelle': neue_daten['quelle']
            })
            
            p['infoLink'] = neuer_link
            p['updatedAt'] = datetime.now().isoformat()
            korrigiert += 1
            print(f"✅ Korrigiert: {p.get('name')[:50]}...")

print(f"\n📊 Runde 3:")
print(f"   🔧 Korrigierte Links: {korrigiert}")

# Speichern
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'w', encoding='utf-8') as f:
    json.dump(programme, f, ensure_ascii=False, indent=2)

with open('/home/edufunds/edufunds-app/docs/korrekturen_runde3.json', 'w', encoding='utf-8') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'korrigiert': korrigiert,
        'korrekturen': report
    }, f, ensure_ascii=False, indent=2)

print(f"\n💾 Gespeichert")
print(f"   Gesamtkorrekturen bisher: 27 + 3 + {korrigiert} = {30 + korrigiert}")
