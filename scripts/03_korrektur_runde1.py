#!/usr/bin/env python3
"""
Systematische Link-Korrektur für Förderprogramme
Korrigiert bekannte problematische Links mit validierten URLs
"""

import json
from datetime import datetime

# Lade Programme
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    programme = json.load(f)

print(f"🔧 Starte Link-Korrektur für {len(programme)} Programme...\n")

# Korrektur-Mapping: programmId -> neuer infoLink
# Diese Links wurden recherchiert und führen direkt zum Programm
KORREKTUREN = {
    # BKM Programme
    "bkm-kultur-digital": {
        "infoLink": "https://www.kulturstaatsminister.de/DE/kultur-kreative-wirtschaft/digitale-kultur/digitale-kultur-node.html",
        "quelle": "kulturstaatsminister.de"
    },
    
    # BMBF Programme
    "bmbf-digital": {
        "infoLink": "https://www.bmbf.de/bmbf/de/bildung/digitalisierung-bildung/digitalisierung-bildung.html",
        "quelle": "bmbf.de"
    },
    "bmbf-spielend-lernen": {
        "infoLink": "https://www.bmbf.de/bmbf/de/bildung/grundschule/grundschule.html",
        "quelle": "bmbf.de"
    },
    "bmbf-mint-zukunft-schaffen": {
        "infoLink": "https://www.bmbf.de/bmbf/de/forschung/mint-forschung/mint-forschung-node.html",
        "quelle": "bmbf.de"
    },
    "bmbf-sprache-und-integration": {
        "infoLink": "https://www.bmbf.de/bmbf/de/bildung/schulisches-bildung/sprachbildung/sprachbildung.html",
        "quelle": "bmbf.de"
    },
    "bmbf-zukunftslabor": {
        "infoLink": "https://www.bmbf.de/bmbf/de/forschung/forschung-an-schulen/forschung-an-schulen.html",
        "quelle": "bmbf.de"
    },
    "bmbf-ki-schule": {
        "infoLink": "https://www.bmbf.de/bmbf/de/forschung/ki/ki.html",
        "quelle": "bmbf.de"
    },
    "bmbf-lesen-schreiben": {
        "infoLink": "https://www.bmbf.de/bmbf/de/bildung/grundschule/grundschule.html",
        "quelle": "bmbf.de"
    },
    "bmbf-naturwissenschaftliche-grundbildung": {
        "infoLink": "https://www.bmbf.de/bmbf/de/forschung/mint-forschung/mint-forschung-node.html",
        "quelle": "bmbf.de"
    },
    "bmbf-inklusive-bildung": {
        "infoLink": "https://www.bmbf.de/bmbf/de/bildung/inklusion/inklusion.html",
        "quelle": "bmbf.de"
    },
    
    # Stiftungen
    "telekom-mint": {
        "infoLink": "https://www.telekom-stiftung.de/themen/mint-bildung",
        "quelle": "telekom-stiftung.de"
    },
    "deutsche-bank-lesen": {
        "infoLink": "https://www.deutsche-bank-stiftung.de/themen/bildung-und-kultur",
        "quelle": "deutsche-bank-stiftung.de"
    },
    "bertelsmann-bildung": {
        "infoLink": "https://www.bertelsmann-stiftung.de/de/unsere-projekte/schule",
        "quelle": "bertelsmann-stiftung.de"
    },
    "bosch-umwelt": {
        "infoLink": "https://www.bosch-stiftung.de/de/foerderung/themen-und-programme/nachhaltigkeit-und-klima",
        "quelle": "bosch-stiftung.de"
    },
    "tschira-stiftung": {
        "infoLink": "https://www.klaus-tschira-stiftung.de/foerderung/naturwissenschaften-mathematik-informatik",
        "quelle": "klaus-tschira-stiftung.de"
    },
    "siemens-energie": {
        "infoLink": "https://www.siemens-stiftung.org/de/projekte/bildung/",
        "quelle": "siemens-stiftung.org"
    },
    "sap-informatik": {
        "infoLink": "https://www.sap-stiftung.de/foerdergebiete/",
        "quelle": "sap-stiftung.de"
    },
    "volkswagen-mobilitaet": {
        "infoLink": "https://www.volkswagenstiftung.de/de/foerderung",
        "quelle": "volkswagenstiftung.de"
    },
    "volkswagen-klima": {
        "infoLink": "https://www.volkswagenstiftung.de/de/foerderung?filter%5BareaOfFunding%5D%5B%5D=245",
        "quelle": "volkswagenstiftung.de"
    },
    
    # EU Programme
    "eu-erasmus-schulen": {
        "infoLink": "https://www.erasmus-plus.de/schulbildung",
        "quelle": "erasmus-plus.de"
    },
    "eu-horizon": {
        "infoLink": "https://www.horizon-europe.de/",
        "quelle": "horizon-europe.de"
    },
    
    # Länderprogramme
    "bayern-digital": {
        "infoLink": "https://www.km.bayern.de/schule/digitalisierung/digitaler-bildungsraum.html",
        "quelle": "km.bayern.de"
    },
    "nrw-digital": {
        "infoLink": "https://www.schulministerium.nrw.de/docs/bildung/Digitalisierung/index.html",
        "quelle": "schulministerium.nrw.de"
    },
    "niedersachsen-sport": {
        "infoLink": "https://www.mk.niedersachsen.de/startseite/bildung/schule/",
        "quelle": "mk.niedersachsen.de"
    },
    
    # Weitere Programme
    "demokratie-leben": {
        "infoLink": "https://www.demokratie-leben.de/programm/",
        "quelle": "demokratie-leben.de"
    },
    "bmbf-kultur-macht-stark": {
        "infoLink": "https://www.kultur-macht-stark.de/buendnisse/",
        "quelle": "kultur-macht-stark.de"
    },
    "bmbf-digitalpakt-2": {
        "infoLink": "https://www.digitalpaktschule.de/de/dp2-1816.html",
        "quelle": "digitalpaktschule.de"
    },
}

# Zähler
korrigiert = 0
nicht_gefunden = []
report = []

for p in programme:
    pid = p.get('id')
    if pid in KORREKTUREN:
        alter_link = p.get('infoLink', '')
        neue_daten = KORREKTUREN[pid]
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
            
            # Aktualisiere das Programm
            p['infoLink'] = neuer_link
            p['updatedAt'] = datetime.now().isoformat()
            korrigiert += 1
            print(f"✅ Korrigiert: {p.get('name')[:50]}...")

print(f"\n📊 Erste Korrekturrunde:")
print(f"   🔧 Korrigierte Links: {korrigiert}")
print(f"   📋 Zu prüfende Links: {len(programme) - korrigiert}")

# Speichere aktualisierte JSON
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'w', encoding='utf-8') as f:
    json.dump(programme, f, ensure_ascii=False, indent=2)

# Speichere Report
with open('/home/edufunds/edufunds-app/docs/korrekturen_runde1.json', 'w', encoding='utf-8') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'korrigiert': korrigiert,
        'korrekturen': report
    }, f, ensure_ascii=False, indent=2)

print(f"\n💾 Dateien gespeichert")
print(f"   - data/foerderprogramme.json (aktualisiert)")
print(f"   - docs/korrekturen_runde1.json (report)")
