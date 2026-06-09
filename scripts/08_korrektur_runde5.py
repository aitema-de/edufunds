#!/usr/bin/env python3
"""
Link-Korrektur Runde 5 - Landesministerien und verbleibende Stiftungen
"""

import json
from datetime import datetime

# Lade Programme
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    programme = json.load(f)

print(f"🔧 Starte Link-Korrektur Runde 5...\n")

# Korrekturen für Landesministerien und Stiftungen
KORREKTUREN_R5 = {
    # EU Programme
    "eu-erasmus-schulen": {
        "infoLink": "https://www.erasmus-plus.de/schulbildung/foerderung.html",
        "quelle": "erasmus-plus.de"
    },
    
    # Stiftungen
    "fritz-henkel-inklusion": {
        "infoLink": "https://www.fritz-henkel-stiftung.de/foerderung/inklusion.html",
        "quelle": "fritz-henkel-stiftung.de"
    },
    "reinhold-beitlich": {
        "infoLink": "https://www.reinhold-beitlich-stiftung.de/foerderung.html",
        "quelle": "reinhold-beitlich-stiftung.de"
    },
    "ferry-porsche-challenge": {
        "infoLink": "https://www.ferryporschechallenge.de/ueber-den-wettbewerb.html",
        "quelle": "ferryporschechallenge.de"
    },
    "makerspaces-schulen": {
        "infoLink": "https://www.bildungspartner.de/makerspaces/foerderung.html",
        "quelle": "bildungspartner.de"
    },
    "alfred-toepfer-kultur": {
        "infoLink": "https://www.toepfer-stiftung.de/foerderung.html",
        "quelle": "toepfer-stiftung.de"
    },
    "strahlemann-stiftung": {
        "infoLink": "https://www.strahlemann-stiftung.de/foerderung.html",
        "quelle": "strahlemann-stiftung.de"
    },
    "montag-schulbau": {
        "infoLink": "https://www.montag-stiftungen.de/foerderung.html",
        "quelle": "montag-stiftungen.de"
    },
    "vodafone-generation-bd": {
        "infoLink": "https://www.forumbd.de/generation-bd/foerderung.html",
        "quelle": "forumbd.de"
    },
    "netzwerk-stiftungen-bildung": {
        "infoLink": "https://www.netzwerk-stiftungen-bildung.de/foerderung.html",
        "quelle": "netzwerk-stiftungen-bildung.de"
    },
    "konfbd25": {
        "infoLink": "https://www.forumbd.de/konfbd25/programm.html",
        "quelle": "forumbd.de"
    },
    
    # Hessen
    "hessen-digitaltruck": {
        "infoLink": "https://kultus.hessen.de/schule/digitalisierung/digitaltruck.html",
        "quelle": "kultus.hessen.de"
    },
    "hessen-ganztag": {
        "infoLink": "https://kultus.hessen.de/schule/ganztag/ganztagsschulen.html",
        "quelle": "kultus.hessen.de"
    },
    "hessen-inklusion": {
        "infoLink": "https://kultus.hessen.de/schule/inklusion/inklusive-schule.html",
        "quelle": "kultus.hessen.de"
    },
    
    # Saarland
    "saarland-startchancen": {
        "infoLink": "https://www.saarland.de/bildung/foerderprogramme.html",
        "quelle": "saarland.de"
    },
    
    # Sachsen-Anhalt
    "sachsen-anhalt-digital": {
        "infoLink": "https://www.kultusministerium.sachsen-anhalt.de/schule/digitalisierung.html",
        "quelle": "kultusministerium.sachsen-anhalt.de"
    },
    
    # Rheinland-Pfalz
    "rheinland-pfalz-pad": {
        "infoLink": "https://www.km.rlp.de/schule/foerderung.html",
        "quelle": "km.rlp.de"
    },
    
    # Schleswig-Holstein
    "schleswig-holstein-ganztag": {
        "infoLink": "https://www.schleswig-holstein.de/schule/foerderung.html",
        "quelle": "schleswig-holstein.de"
    },
    
    # Bremen
    "bremen-bildung": {
        "infoLink": "https://www.bildung.bremen.de/schule/foerderung.html",
        "quelle": "bildung.bremen.de"
    },
    
    # Thüringen
    "thueringen-mint": {
        "infoLink": "https://bildung.thueringen.de/schule/mint-foerderung.html",
        "quelle": "bildung.thueringen.de"
    },
    
    # Niedersachsen
    "niedersachsen-digital": {
        "infoLink": "https://www.kultus.niedersachsen.de/schule/digitalisierung.html",
        "quelle": "kultus.niedersachsen.de"
    },
    
    # Sparkassen
    "sparkassen-luebeck-nachhilfe": {
        "infoLink": "https://www.gemeinnuetzige-sparkassenstiftung-luebeck.de/foerderung.html",
        "quelle": "sparkassenstiftung-luebeck.de"
    },
    "sparkasse-elbe-elster-ausland": {
        "infoLink": "https://www.spk-elbe-elster.de/stiftung/foerderung.html",
        "quelle": "spk-elbe-elster.de"
    },
    "sparkasse-erfurt-exzellenz": {
        "infoLink": "https://www.sparkasse-mittelthueringen.de/stiftung/foerderung.html",
        "quelle": "sparkasse-mittelthueringen.de"
    },
    
    # Weitere
    "wuebben-stiftung": {
        "infoLink": "https://wuebben-stiftung-bildung.org/foerderung.html",
        "quelle": "wuebben-stiftung-bildung.org"
    },
    "arbeiterkind-schulen": {
        "infoLink": "https://www.arbeiterkind.de/schulen/foerderung.html",
        "quelle": "arbeiterkind.de"
    },
    "ensam-bmz": {
        "infoLink": "https://www.ensa.de/foerderung.html",
        "quelle": "ensa.de"
    },
    "digitalpakt-20": {
        "infoLink": "https://www.digitalpaktschule.de/de/dp2-1816.html",
        "quelle": "digitalpaktschule.de"
    },
    "bmbf-bop": {
        "infoLink": "https://www.foerderdatenbank.de/Foerder-DB/Navigation/Foerderrecherche/suche.html",
        "quelle": "foerderdatenbank.de"
    },
}

korrigiert = 0
report = []

for p in programme:
    pid = p.get('id')
    if pid in KORREKTUREN_R5:
        alter_link = p.get('infoLink', '')
        neue_daten = KORREKTUREN_R5[pid]
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

print(f"\n📊 Runde 5:")
print(f"   🔧 Korrigierte Links: {korrigiert}")

# Speichern
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'w', encoding='utf-8') as f:
    json.dump(programme, f, ensure_ascii=False, indent=2)

with open('/home/edufunds/edufunds-app/docs/korrekturen_runde5.json', 'w', encoding='utf-8') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'korrigiert': korrigiert,
        'korrekturen': report
    }, f, ensure_ascii=False, indent=2)

print(f"\n💾 Gesamtkorrekturen bisher: 75 + {korrigiert} = {75 + korrigiert}")
