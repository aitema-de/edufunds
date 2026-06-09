#!/usr/bin/env python3
"""
Link-Korrektur Runde 2 - Spezialisierte Programme
"""

import json
from datetime import datetime

# Lade Programme
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    programme = json.load(f)

print(f"🔧 Starte Link-Korrektur Runde 2...\n")

# Zusätzliche Korrekturen - spezifischere Links
KORREKTUREN_R2 = {
    # Postcode Lotterie
    "postcode-lotterie": {
        "infoLink": "https://www.postcode-lotterie.de/projekte/foerdergebiete.html",
        "quelle": "postcode-lotterie.de"
    },
    
    # Aktion Mensch
    "aktion-mensch": {
        "infoLink": "https://www.aktion-mensch.de/foerderung/projektfoerderung.html",
        "quelle": "aktion-mensch.de"
    },
    
    # Deutsche Kinder- und Jugendstiftung
    "dkjs-jugend": {
        "infoLink": "https://www.dkjs.de/foerderung/foerderprogramme.html",
        "quelle": "dkjs.de"
    },
    
    # Umweltstiftung
    "dbu-umwelt": {
        "infoLink": "https://www.dbu.de/foerderung/foerderprogramme/",
        "quelle": "dbu.de"
    },
    
    # Wohlfahrtsverbände
    "awo-bildung": {
        "infoLink": "https://www.awo.org/unsere-themen/bildung/",
        "quelle": "awo.org"
    },
    "caritas-inklusion": {
        "infoLink": "https://www.caritas.de/hilfeundberatung/menschenmitbehinderung/",
        "quelle": "caritas.de"
    },
    "diakonie-bildung": {
        "infoLink": "https://www.diakonie.de/themen/bildung-und-teilhabe/",
        "quelle": "diakonie.de"
    },
    
    # Sportverbände
    "dosb-sport": {
        "infoLink": "https://www.dosb.de/foerderung/",
        "quelle": "dosb.de"
    },
    
    # Kulturelle Einrichtungen
    "goethe-kultur": {
        "infoLink": "https://www.goethe.de/de/uun/foerderung.html",
        "quelle": "goethe.de"
    },
    
    # Bundesstiftungen
    "blz-lesen": {
        "infoLink": "https://www.blz.bund.de/DE/Projektfoerderung/Projektfoerderung_node.html",
        "quelle": "blz.bund.de"
    },
    "bks-kultur": {
        "infoLink": "https://www.bundesstiftung-kultur.de/foerderung/",
        "quelle": "bundesstiftung-kultur.de"
    },
    "bva": {
        "infoLink": "https://www.bva.bund.de/DE/Services/Behoerden/Beratung_Foerderung/Beratung_Foerderung_node.html",
        "quelle": "bva.bund.de"
    },
    
    # Körperschaften
    "kultusministerkonferenz": {
        "infoLink": "https://www.kmk.org/themen.html",
        "quelle": "kmk.org"
    },
    
    # Sonstige Stiftungen
    "dkv-engagement": {
        "infoLink": "https://www.dkv-engagement.de/foerderung/",
        "quelle": "dkv-engagement.de"
    },
    "dkhw-menschen": {
        "infoLink": "https://www.dkhw.de/foerderung/foerderprogramme/",
        "quelle": "dkhw.de"
    },
    "stifterverband": {
        "infoLink": "https://www.stifterverband.org/was-wir-tun/foerderung",
        "quelle": "stifterverband.org"
    },
    "volksbanken": {
        "infoLink": "https://www.volksbanken-raiffeisenbanken.de/spenden-und-foerdern.html",
        "quelle": "volksbanken-raiffeisenbanken.de"
    },
    "sparda-bank": {
        "infoLink": "https://www.sparda.de/engagement/foerderung.html",
        "quelle": "sparda.de"
    },
    "glücksspirale": {
        "infoLink": "https://www.gluecksspirale.de/gute-zwecke/",
        "quelle": "gluecksspirale.de"
    },
    "lotto-toto": {
        "infoLink": "https://www.lotto.de/ueber-uns/gluecksspirale/gemeinnuetzigkeit",
        "quelle": "lotto.de"
    },
    
    # Industriestiftungen
    "boehringer-kunst": {
        "infoLink": "https://www.boehringer-ingelheim-stiftung.de/foerderung/",
        "quelle": "boehringer-ingelheim-stiftung.de"
    },
    "merck-familie": {
        "infoLink": "https://www.merck-familie.de/foerderung/",
        "quelle": "merck-familie.de"
    },
    "zeiss-natur": {
        "infoLink": "https://www.zeiss.de/corporate/responsibility/stiftung.html",
        "quelle": "zeiss.de"
    },
}

korrigiert = 0
report = []

for p in programme:
    pid = p.get('id')
    if pid in KORREKTUREN_R2:
        alter_link = p.get('infoLink', '')
        neue_daten = KORREKTUREN_R2[pid]
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

print(f"\n📊 Runde 2:")
print(f"   🔧 Korrigierte Links: {korrigiert}")

# Speichern
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'w', encoding='utf-8') as f:
    json.dump(programme, f, ensure_ascii=False, indent=2)

with open('/home/edufunds/edufunds-app/docs/korrekturen_runde2.json', 'w', encoding='utf-8') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'korrigiert': korrigiert,
        'korrekturen': report
    }, f, ensure_ascii=False, indent=2)

print(f"\n💾 Gespeichert")
