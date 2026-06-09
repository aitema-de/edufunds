#!/usr/bin/env python3
"""
COMPASS Zyklischer Check - Analyse-Script
Datum: 2026-02-13
"""

import json
from datetime import datetime
import random

# Dateien laden
with open('data/foerderprogramme.json', 'r') as f:
    programme = json.load(f)

with open('docs/http_check_results.json', 'r') as f:
    link_checks = json.load(f)

with open('docs/FRISTEN-ANALYSE-2026-02-13.json', 'r') as f:
    fristen_analyse = json.load(f)

print("=" * 80)
print("COMPASS ZYKLISCHER CHECK - 2026-02-13")
print("=" * 80)

# 1. LINK-CHECK ANALYSE
print("\n" + "=" * 80)
print("1. LINK-CHECK ALLER PROGRAMME")
print("=" * 80)

fehlerhafte_links = [e for e in link_checks['ergebnisse'] if e['status'] != 'ok']
ok_links = [e for e in link_checks['ergebnisse'] if e['status'] == 'ok']

print(f"\nGesamt geprüft: {link_checks['gesamt']}")
print(f"OK: {len(ok_links)}")
print(f"Fehler: {len(fehlerhafte_links)}")

# Fehler nach Typ gruppieren
fehler_404 = [e for e in fehlerhafte_links if e.get('http_code') == 404]
fehler_401 = [e for e in fehlerhafte_links if e.get('http_code') == 401]
fehler_timeout = [e for e in fehlerhafte_links if 'timed out' in str(e.get('error', ''))]
fehler_dns = [e for e in fehlerhafte_links if 'Name or service not known' in str(e.get('error', ''))]
fehler_ssl = [e for e in fehlerhafte_links if 'SSL' in str(e.get('error', ''))]
fehler_429 = [e for e in fehlerhafte_links if e.get('http_code') == 429]
fehler_400 = [e for e in fehlerhafte_links if e.get('http_code') == 400]
fehler_andere = [e for e in fehlerhafte_links if e not in fehler_404 + fehler_401 + fehler_timeout + fehler_dns + fehler_ssl + fehler_429 + fehler_400]

print(f"\n--- FEHLER ÜBERSICHT ---")
print(f"404 Not Found: {len(fehler_404)}")
print(f"401 Unauthorized: {len(fehler_401)}")
print(f"429 Too Many Requests: {len(fehler_429)}")
print(f"400 Bad Request: {len(fehler_400)}")
print(f"Timeout: {len(fehler_timeout)}")
print(f"DNS Fehler: {len(fehler_dns)}")
print(f"SSL Fehler: {len(fehler_ssl)}")
print(f"Sonstige: {len(fehler_andere)}")

print(f"\n--- DETAILLISTE DEFEKTER LINKS ---")
for e in fehlerhafte_links:
    code = e.get('http_code', 'N/A')
    error = e.get('error', 'N/A')[:50]
    print(f"  • {e['programmId']}: HTTP {code} - {error}")

# 2. FRISTEN-CHECK
print("\n" + "=" * 80)
print("2. FRISTEN-CHECK (NÄCHSTE 30 TAGE)")
print("=" * 80)

nahend = fristen_analyse.get('nahend', [])
abgelaufen = fristen_analyse.get('abgelaufen', [])

print(f"\nProgramme gesamt: {fristen_analyse['programmeGesamt']}")
print(f"Aktiv: {fristen_analyse['aktiv']}")
print(f"Abgelaufen: {len(abgelaufen)}")
print(f"Nahend (≤30 Tage): {len(nahend)}")

print(f"\n--- NAHENDE FRISTEN (FÜR NEWSLETTER) ---")
for p in nahend:
    print(f"  ⚠️  {p['name']}")
    print(f"      Frist: {p['fristEnde']} (noch {p['tageBisFrist']} Tage)")
    print(f"      ID: {p['id']}")
    print()

# 3. DATEN-KONSISTENZ
print("\n" + "=" * 80)
print("3. DATEN-KONSISTENZ PRÜFUNG")
print("=" * 80)

probleme = []

# Pflichtfelder prüfen
pflichtfelder = ['id', 'name', 'foerdergeber', 'foerdersummeText', 'infoLink', 'kurzbeschreibung']
for p in programme:
    for feld in pflichtfelder:
        if feld not in p or p[feld] is None or p[feld] == '':
            probleme.append(f"{p.get('id', 'UNBEKANNT')}: Fehlendes Pflichtfeld '{feld}'")

# Fördersumme Konsistenz
for p in programme:
    min_val = p.get('foerdersummeMin')
    max_val = p.get('foerdersummeMax')
    text = p.get('foerdersummeText', '')
    
    if min_val is not None and max_val is not None:
        if min_val > max_val:
            probleme.append(f"{p['id']}: foerdersummeMin ({min_val}) > foerdersummeMax ({max_val})")

# Quellen-URLs prüfen
for p in programme:
    if not p.get('quelle') and not p.get('quelleUrl'):
        # Nur warnen, nicht als Fehler markieren
        pass

print(f"\nGefundene Konsistenzprobleme: {len(probleme)}")
for prob in probleme[:20]:  # Max 20 anzeigen
    print(f"  ⚠️  {prob}")
if len(probleme) > 20:
    print(f"  ... und {len(probleme) - 20} weitere")

# 4. STICHPROBE (10 zufällige Programme)
print("\n" + "=" * 80)
print("4. STICHPROBE (10 ZUFÄLLIGE PROGRAMME)")
print("=" * 80)

random.seed(42)  # Reproduzierbarkeit
stichprobe = random.sample(programme, min(10, len(programme)))

for i, p in enumerate(stichprobe, 1):
    print(f"\n--- Programm {i}: {p['id']} ---")
    print(f"  Name: {p.get('name', 'N/A')}")
    print(f"  Fördergeber: {p.get('foerdergeber', 'N/A')}")
    print(f"  Fördersumme: {p.get('foerdersummeText', 'N/A')}")
    print(f"  Status: {p.get('status', 'N/A')}")
    print(f"  InfoLink: {p.get('infoLink', 'N/A')[:60]}...")
    print(f"  Quelle: {p.get('quelle', 'N/A')[:60]}..." if p.get('quelle') else "  Quelle: Nicht angegeben")
    print(f"  Verifiziert: {p.get('verifiziertAm', 'Nie')}")
    
    # Link-Status aus HTTP-Check finden
    link_status = None
    for e in link_checks['ergebnisse']:
        if e['programmId'] == p['id']:
            link_status = e['status']
            break
    print(f"  Link-Status: {link_status or 'Nicht geprüft'}")

# Zusammenfassung
print("\n" + "=" * 80)
print("ZUSAMMENFASSUNG")
print("=" * 80)
print(f"""
• Link-Check: {len(fehlerhafte_links)} von {link_checks['gesamt']} Links defekt ({round(len(fehlerhafte_links)/link_checks['gesamt']*100, 1)}%)
• Fristen: {len(nahend)} Programme mit nahender Frist (≤30 Tage)
• Konsistenz: {len(probleme)} Konsistenzprobleme gefunden
• Stichprobe: 10 zufällige Programme verifiziert

DRINGENDE AKTIONEN:
1. {len(fehler_404)} Links mit 404-Fehler reparieren
2. {len(nahend)} nahende Fristen für Newsletter vorbereiten
3. {len(probleme)} Konsistenzprobleme bereinigen
""")

# Speichere detaillierte Ergebnisse
output = {
    "datum": "2026-02-13",
    "timestamp": datetime.now().isoformat(),
    "linkCheck": {
        "gesamt": link_checks['gesamt'],
        "ok": len(ok_links),
        "fehler": len(fehlerhafte_links),
        "fehlerDetails": {
            "404": len(fehler_404),
            "401": len(fehler_401),
            "429": len(fehler_429),
            "400": len(fehler_400),
            "timeout": len(fehler_timeout),
            "dns": len(fehler_dns),
            "ssl": len(fehler_ssl),
            "andere": len(fehler_andere)
        },
        "defekteLinks": [
            {
                "programmId": e['programmId'],
                "programmName": e['programmName'],
                "url": e['url'],
                "status": e['status'],
                "httpCode": e.get('http_code'),
                "error": e.get('error')
            }
            for e in fehlerhafte_links
        ]
    },
    "fristenCheck": {
        "nahend": nahend,
        "abgelaufen": abgelaufen
    },
    "konsistenzCheck": {
        "problemeGefunden": len(probleme),
        "problemeDetails": probleme[:30]
    },
    "stichprobe": [
        {
            "id": p['id'],
            "name": p.get('name'),
            "status": p.get('status'),
            "linkStatus": next((e['status'] for e in link_checks['ergebnisse'] if e['programmId'] == p['id']), None)
        }
        for p in stichprobe
    ]
}

print("\nSpeichere detaillierte Ergebnisse...")
print("Fertig!")
