#!/usr/bin/env python3
"""
Link-Korrektur Runde 4 - Finale Korrekturen
"""

import json
from datetime import datetime

# Lade Programme
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    programme = json.load(f)

print(f"🔧 Starte Link-Korrektur Runde 4...\n")

# Finale Korrekturen
KORREKTUREN_R4 = {
    # BMBF
    "bmbf-ganztag-bildungskommunen": {
        "infoLink": "https://www.bmbf.de/bmbf/de/bildung/ganztagsschule/ganztagsschule.html",
        "quelle": "bmbf.de"
    },
    
    # Baden-Württemberg
    "bw-mikro-makro-mint": {
        "infoLink": "https://www.jugend-forscht-bw.de/mikro-makro-mint/",
        "quelle": "jugend-forscht-bw.de"
    },
    "hopp-foundation-schulpreis": {
        "infoLink": "https://www.jugend-forscht-bw.de/hopp-foundation-schulpreis/",
        "quelle": "jugend-forscht-bw.de"
    },
    "bw-sommerschulen-2026": {
        "infoLink": "https://jugendbegleiter.de/foerderung/sommerschulen/",
        "quelle": "jugendbegleiter.de"
    },
    
    # Schleswig-Holstein
    "sh-ganztagsfoerderung-2026": {
        "infoLink": "https://www.staedteverband-sh.de/gaft.html",
        "quelle": "staedteverband-sh.de"
    },
    
    # Thüringen
    "th-mint-digital": {
        "infoLink": "https://bildung.thueringen.de/schule/medien/mint-foerderung",
        "quelle": "bildung.thueringen.de"
    },
    
    # Bayern MINT
    "bayern-mint-netzwerk": {
        "infoLink": "https://www.km.bayern.de/lernen/inhalte/mint/mint-netzwerk.html",
        "quelle": "km.bayern.de"
    },
    "bayern-mint-freundliche-schulen": {
        "infoLink": "https://www.km.bayern.de/lernen/inhalte/mint/mint-freundliche-schulen.html",
        "quelle": "km.bayern.de"
    },
    "bayern-mint21": {
        "infoLink": "https://www.km.bayern.de/lernen/inhalte/mint/mint21.html",
        "quelle": "km.bayern.de"
    },
    
    # Ferry Porsche Stiftung
    "z-lab-bruchsal": {
        "infoLink": "https://ferry-porsche-stiftung.de/projekte/z-lab/",
        "quelle": "ferry-porsche-stiftung.de"
    },
    "sprungbrett-bildung-karlsruhe": {
        "infoLink": "https://ferry-porsche-stiftung.de/projekte/sprungbrett-bildung/",
        "quelle": "ferry-porsche-stiftung.de"
    },
    
    # Sachsen
    "sachsen-klimaschulen-2026": {
        "infoLink": "https://www.medienservice.sachsen.de/foerderung/klimaschulen.html",
        "quelle": "medienservice.sachsen.de"
    },
    
    # Weitere
    "klimalab-2026": {
        "infoLink": "https://foerdermittel-wissenswert.de/programm/klimalab/",
        "quelle": "foerdermittel-wissenswert.de"
    },
    "fritz-henkel-inklusion-2026": {
        "infoLink": "https://www.fritz-henkel-stiftung.de/foerderung/inklusion.html",
        "quelle": "fritz-henkel-stiftung.de"
    },
    
    # Playmobil
    "playmobil-hobpreis": {
        "infoLink": "https://www.foerdermittelbuero.de/foerderung/hob-preis/",
        "quelle": "foerdermittelbuero.de"
    },
    
    # NRW
    "nrw-digital": {
        "infoLink": "https://www.schulministerium.nrw.de/docs/bildung/Digitalisierung/schulen-digital.html",
        "quelle": "schulministerium.nrw.de"
    },
    
    # Niedersachsen
    "niedersachsen-sport": {
        "infoLink": "https://www.mk.niedersachsen.de/startseite/bildung/schule/sportfoerderung.html",
        "quelle": "mk.niedersachsen.de"
    },
}

korrigiert = 0
report = []

for p in programme:
    pid = p.get('id')
    if pid in KORREKTUREN_R4:
        alter_link = p.get('infoLink', '')
        neue_daten = KORREKTUREN_R4[pid]
        neuer_link = neue_daten['infoLink']
        
        if alter_link != neuer_link:
            report.append({
                'programmId': pid,
                'programmName': p.get('name'),
                'alterLink': alter_link,
                'neuerLink': neuer_link,
                'korrekturGrund': 'Startseite statt spezifischer Programmseite',
                'quelle': neue_daten['quelle']
            })
            
            p['infoLink'] = neuer_link
            p['updatedAt'] = datetime.now().isoformat()
            korrigiert += 1
            print(f"✅ Korrigiert: {p.get('name')[:50]}...")

print(f"\n📊 Runde 4:")
print(f"   🔧 Korrigierte Links: {korrigiert}")

# Speichern
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'w', encoding='utf-8') as f:
    json.dump(programme, f, ensure_ascii=False, indent=2)

with open('/home/edufunds/edufunds-app/docs/korrekturen_runde4.json', 'w', encoding='utf-8') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'korrigiert': korrigiert,
        'korrekturen': report
    }, f, ensure_ascii=False, indent=2)

print(f"\n💾 Gespeichert")
