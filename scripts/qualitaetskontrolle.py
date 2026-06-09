#!/usr/bin/env python3
"""
Qualitätskontrolle für Förderprogramme
Prüft alle 184 Programme nach definierten Kriterien
"""

import json
import requests
from urllib.parse import urlparse
from datetime import datetime
import time

# Lade Programme
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r') as f:
    programmes = json.load(f)

print(f"Geladene Programme: {len(programmes)}")

# Statistik
stats = {
    "total": len(programmes),
    "ok": 0,
    "korrektur": 0,
    "entfernen": 0,
    "unklar": 0,
    "fehler": []
}

# Phase 1: Stichproben (20 Programme aus verschiedenen Kategorien)
stichprobe_ids = [
    "bmbf-digital", "telekom-mint", "eu-erasmus-schulen", "bayern-digital",
    "berlin-schulbau", "nrw-digital", "tschira-stiftung", "siemens-energie",
    "bmbf-kultur-macht-stark", "bmbf-digitalpakt-2", "volkswagen-klima",
    "mercator-digitalisierung", "bmw-stiftung-demokratie", "bosch-schulpreis",
    "dkjs-sport", "aok-gesundheit", "l-bank-startchancen", "schott-nachhaltigkeit",
    "bmi-sicherheit", "chemie-fonds"
]

print("\n" + "="*80)
print("PHASE 1: STICHPROBEN (20 Programme)")
print("="*80)

# Teste Link-Erreichbarkeit (nur für Stichprobe, um Zeit zu sparen)
def check_link(url, program_name):
    """Prüft einen Link auf Erreichbarkeit"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        
        # Prüfe auf Weiterleitung zu anderer Domain
        final_domain = urlparse(response.url).netloc
        original_domain = urlparse(url).netloc
        
        redirect_issue = final_domain != original_domain
        
        return {
            "status_code": response.status_code,
            "ok": response.status_code == 200,
            "redirect": redirect_issue,
            "final_url": response.url,
            "error": None
        }
    except Exception as e:
        return {
            "status_code": 0,
            "ok": False,
            "redirect": False,
            "final_url": url,
            "error": str(e)
        }

# Finde Programme in der Stichprobe
stichproben_programme = []
for prog in programmes:
    if prog['id'] in stichprobe_ids:
        stichproben_programme.append(prog)

print(f"\nGefundene Stichproben-Programme: {len(stichproben_programme)}")

# Prüfe jede Stichprobe
for i, prog in enumerate(stichproben_programme, 1):
    print(f"\n--- {i}/20: {prog['name']} ({prog['foerdergeberTyp']}) ---")
    
    fehler = []
    warnungen = []
    
    # 1. ECHTHEIT prüfen
    print("  [1] ECHTHEIT:")
    
    # Status ist unverifiziert?
    if prog.get('status') == 'unverifiziert':
        print(f"    ⚠️  Status: unverifiziert")
        warnungen.append("Status unverifiziert")
    else:
        print(f"    ✅ Status: {prog.get('status', 'nicht gesetzt')}")
    
    # VerificationWarning vorhanden?
    if prog.get('verificationWarning'):
        print(f"    ⚠️  VerificationWarning vorhanden")
        warnungen.append("VerificationWarning")
    
    # 2. ANTRAGBARKEIT prüfen
    print("  [2] ANTRAGBARKEIT:")
    
    # Bewerbungsart vorhanden?
    if not prog.get('bewerbungsart'):
        print(f"    🔴 Bewerbungsart fehlt")
        fehler.append("Bewerbungsart fehlt")
    else:
        print(f"    ✅ Bewerbungsart: {prog['bewerbungsart']}")
    
    # Frist vorhanden?
    if not prog.get('bewerbungsfristText'):
        print(f"    🔴 BewerbungsfristText fehlt")
        fehler.append("BewerbungsfristText fehlt")
    else:
        print(f"    ✅ Frist: {prog['bewerbungsfristText']}")
    
    # 3. FÖRDERSUMMEN prüfen
    print("  [3] FÖRDERSUMMEN:")
    
    if prog.get('foerdersummeMin') and prog.get('foerdersummeMax'):
        print(f"    ℹ️  Summen: {prog['foerdersummeMin']}€ - {prog['foerdersummeMax']}€")
        if prog.get('verificationWarning'):
            print(f"    ⚠️  Nicht verifiziert!")
            warnungen.append("Fördersummen nicht verifiziert")
    else:
        print(f"    🔴 Fördersummen fehlen")
        fehler.append("Fördersummen fehlen")
    
    # 4. LINK-QUALITÄT prüfen
    print("  [4] LINK-QUALITÄT:")
    
    if prog.get('infoLink'):
        link_check = check_link(prog['infoLink'], prog['name'])
        
        if link_check['ok']:
            print(f"    ✅ HTTP 200 - Link erreichbar")
        else:
            print(f"    🔴 HTTP {link_check['status_code']} - Link NICHT erreichbar")
            fehler.append(f"Link nicht erreichbar: {link_check.get('error', 'HTTP ' + str(link_check['status_code']))}")
        
        if link_check['redirect']:
            print(f"    ⚠️  Weiterleitung zu: {link_check['final_url']}")
            warnungen.append(f"Weiterleitung zu anderer Domain: {link_check['final_url']}")
    else:
        print(f"    🔴 infoLink fehlt")
        fehler.append("infoLink fehlt")
    
    # 5. VOLLSTÄNDIGKEIT prüfen
    print("  [5] VOLLSTÄNDIGKEIT:")
    
    pflichtfelder = ['name', 'foerdergeber', 'schulformen', 'bundeslaender', 'kurzbeschreibung']
    for feld in pflichtfelder:
        if not prog.get(feld):
            print(f"    🔴 Pflichtfeld '{feld}' fehlt")
            fehler.append(f"Pflichtfeld fehlt: {feld}")
    
    if not any(f.startswith("Pflichtfeld") for f in fehler):
        print(f"    ✅ Alle Pflichtfelder vorhanden")
    
    # Bewertung
    print("\n  BEWERTUNG:")
    if len(fehler) == 0 and len(warnungen) == 0:
        print(f"    ✅ 100% OK")
        stats['ok'] += 1
    elif len(fehler) > 0:
        print(f"    🔴 ENTFERNEN ({len(fehler)} Fehler)")
        stats['entfernen'] += 1
        stats['fehler'].append({
            "id": prog['id'],
            "name": prog['name'],
            "fehler": fehler,
            "typ": "grob"
        })
    else:
        print(f"    ⚠️  KORREKTUR ({len(warnungen)} Warnungen)")
        stats['korrektur'] += 1
        stats['fehler'].append({
            "id": prog['id'],
            "name": prog['name'],
            "fehler": warnungen,
            "typ": "klein"
        })
    
    # Kurze Pause zwischen Requests
    time.sleep(0.5)

print("\n" + "="*80)
print("STICHPROBE ZUSAMMENFASSUNG")
print("="*80)
print(f"Geprüft: {len(stichproben_programme)} Programme")
print(f"✅ OK: {stats['ok']}")
print(f"⚠️  Korrektur nötig: {stats['korrektur']}")
print(f"🔴 Entfernen: {stats['entfernen']}")

# Schätze Fehlerrate für alle Programme
fehlerrate = (stats['korrektur'] + stats['entfernen']) / len(stichproben_programme) * 100
print(f"\nGeschätzte Fehlerrate: {fehlerrate:.1f}%")

# Phase 2: Alle Programme prüfen (ohne Link-Check, nur Datenqualität)
print("\n" + "="*80)
print("PHASE 2: VOLLSTÄNDIGE PRÜFUNG ALLER PROGRAMME")
print("="*80)

# Zurücksetzen für vollständige Statistik
stats = {
    "total": len(programmes),
    "ok": 0,
    "korrektur": 0,
    "entfernen": 0,
    "unklar": 0,
    "fehler": [],
    "unverifiziert": 0,
    "verification_warning": 0
}

# Kategorisierung
kategorien = {
    "bund": [],
    "land": [],
    "stiftung": [],
    "eu": [],
    "sonstige": []
}

for prog in programmes:
    fehler = []
    warnungen = []
    
    # Kategorisierung nach Typ
    typ = prog.get('foerdergeberTyp', 'unbekannt')
    if typ in kategorien:
        kategorien[typ].append(prog['id'])
    
    # Unverifizierte Programme zählen
    if prog.get('status') == 'unverifiziert':
        stats['unverifiziert'] += 1
    
    if prog.get('verificationWarning'):
        stats['verification_warning'] += 1
    
    # Kritische Fehler prüfen
    
    # Fehler: Kein infoLink
    if not prog.get('infoLink'):
        fehler.append("infoLink fehlt")
    
    # Fehler: Keine Fördersummen
    if not prog.get('foerdersummeMin') or not prog.get('foerdersummeMax'):
        fehler.append("Fördersummen fehlen")
    
    # Fehler: Keine Bewerbungsart
    if not prog.get('bewerbungsart'):
        fehler.append("Bewerbungsart fehlt")
    
    # Fehler: Keine Frist
    if not prog.get('bewerbungsfristText'):
        fehler.append("Bewerbungsfrist fehlt")
    
    # Fehler: Kein Fördergeber
    if not prog.get('foerdergeber'):
        fehler.append("Fördergeber fehlt")
    
    # Fehler: Keine Schulformen
    if not prog.get('schulformen') or len(prog.get('schulformen', [])) == 0:
        fehler.append("Schulformen fehlen")
    
    # Fehler: Keine Bundesländer
    if not prog.get('bundeslaender') or len(prog.get('bundeslaender', [])) == 0:
        fehler.append("Bundesländer fehlen")
    
    # Warnung: Unverifizierte Fördersummen
    if prog.get('verificationWarning') and prog.get('foerdersummeMin'):
        warnungen.append("Fördersummen nicht verifiziert")
    
    # Bewertung
    if len(fehler) == 0 and len(warnungen) == 0:
        stats['ok'] += 1
    elif len(fehler) > 0:
        stats['entfernen'] += 1
        stats['fehler'].append({
            "id": prog['id'],
            "name": prog['name'],
            "foerdergeber": prog.get('foerdergeber', 'unbekannt'),
            "fehler": fehler,
            "typ": "grob",
            "link": prog.get('infoLink', 'keiner')
        })
    else:
        stats['korrektur'] += 1
        stats['fehler'].append({
            "id": prog['id'],
            "name": prog['name'],
            "foerdergeber": prog.get('foerdergeber', 'unbekannt'),
            "fehler": warnungen,
            "typ": "klein",
            "link": prog.get('infoLink', 'keiner')
        })

print(f"\nKategorien-Verteilung:")
for typ, items in kategorien.items():
    print(f"  {typ}: {len(items)} Programme")

print(f"\nUnverifizierte Programme: {stats['unverifiziert']}/{stats['total']} ({stats['unverifiziert']/stats['total']*100:.1f}%)")
print(f"Programme mit VerificationWarning: {stats['verification_warning']}/{stats['total']} ({stats['verification_warning']/stats['total']*100:.1f}%)")

print(f"\nBewertungsergebnis:")
print(f"  ✅ OK: {stats['ok']} ({stats['ok']/stats['total']*100:.1f}%)")
print(f"  ⚠️  Korrektur nötig: {stats['korrektur']} ({stats['korrektur']/stats['total']*100:.1f}%)")
print(f"  🔴 Entfernen: {stats['entfernen']} ({stats['entfernen']/stats['total']*100:.1f}%)")

# Top 10 kritische Fehler
print("\n" + "="*80)
print("TOP 20 KRITISCHE FEHLER (Entfernen)")
print("="*80)

grobe_fehler = [f for f in stats['fehler'] if f['typ'] == 'grob'][:20]
for i, f in enumerate(grobe_fehler, 1):
    print(f"\n{i}. {f['name']}")
    print(f"   ID: {f['id']}")
    print(f"   Fördergeber: {f['foerdergeber']}")
    print(f"   Fehler: {', '.join(f['fehler'])}")
    print(f"   Link: {f['link'][:80]}..." if len(f['link']) > 80 else f"   Link: {f['link']}")

# Programme mit Warnungen
print("\n" + "="*80)
print("TOP 20 WARNUNGEN (Korrektur nötig)")
print("="*80)

kleine_fehler = [f for f in stats['fehler'] if f['typ'] == 'klein'][:20]
for i, f in enumerate(kleine_fehler, 1):
    print(f"\n{i}. {f['name']}")
    print(f"   ID: {f['id']}")
    print(f"   Fördergeber: {f['foerdergeber']}")
    print(f"   Warnungen: {', '.join(f['fehler'])}")

# Speichere detaillierten Report
report = {
    "timestamp": datetime.now().isoformat(),
    "total_programme": stats['total'],
    "zusammenfassung": {
        "ok": stats['ok'],
        "korrektur": stats['korrektur'],
        "entfernen": stats['entfernen'],
        "unverifiziert": stats['unverifiziert'],
        "mit_warning": stats['verification_warning']
    },
    "fehlerrate_prozent": round((stats['korrektur'] + stats['entfernen']) / stats['total'] * 100, 1),
    "kategorien": {k: len(v) for k, v in kategorien.items()},
    "fehlerliste": stats['fehler']
}

with open('/home/edufunds/edufunds-app/docs/qc_report_detailed.json', 'w') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print("\n" + "="*80)
print("REPORT GESPEICHERT: /home/edufunds/edufunds-app/docs/qc_report_detailed.json")
print("="*80)
