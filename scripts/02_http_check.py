#!/usr/bin/env python3
"""
HTTP-Validierung aller Links
Prüft Erreichbarkeit (Status 200) und ob Seite existiert
"""

import json
import urllib.request
import ssl
from urllib.error import HTTPError, URLError
from datetime import datetime
import socket

# SSL-Kontext, der Zertifikate ignoriert (für Testzwecke)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

def check_url(url, timeout=15):
    """Prüft URL und gibt Status zurück"""
    if not url:
        return {'status': 'kein_link', 'http_code': None, 'error': None}
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=timeout, context=ssl_context) as response:
            return {
                'status': 'ok',
                'http_code': response.getcode(),
                'error': None,
                'final_url': response.geturl()
            }
    except HTTPError as e:
        return {
            'status': 'http_error',
            'http_code': e.code,
            'error': str(e),
            'final_url': None
        }
    except URLError as e:
        return {
            'status': 'url_error',
            'http_code': None,
            'error': str(e.reason),
            'final_url': None
        }
    except socket.timeout:
        return {
            'status': 'timeout',
            'http_code': None,
            'error': 'Timeout',
            'final_url': None
        }
    except Exception as e:
        return {
            'status': 'error',
            'http_code': None,
            'error': str(e),
            'final_url': None
        }

# Lade Programme
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    programme = json.load(f)

print("🌐 Starte HTTP-Validierung...\n")

ergebnisse = []
ok_count = 0
error_count = 0

for i, p in enumerate(programme, 1):
    pid = p.get('id', 'unbekannt')
    name = p.get('name', 'unbekannt')[:45]
    info_link = p.get('infoLink', '')
    
    print(f"[{i}/{len(programme)}] Prüfe: {name}...", end=' ')
    
    # Prüfe infoLink
    if info_link:
        result = check_url(info_link)
        ergebnisse.append({
            'programmId': pid,
            'programmName': p.get('name'),
            'linkType': 'infoLink',
            'url': info_link,
            **result
        })
        
        if result['status'] == 'ok':
            print(f"✅ HTTP {result['http_code']}")
            ok_count += 1
        else:
            print(f"❌ {result['status']} ({result['error'][:30] if result['error'] else 'N/A'}...)")
            error_count += 1
    else:
        print("⚠️ Kein Link")

# Statistik
print(f"\n📊 HTTP-Validierung abgeschlossen:")
print(f"   ✅ Erreichbar (HTTP 200): {ok_count}")
print(f"   ❌ Fehler/Timeout: {error_count}")
print(f"   📊 Erreichbarkeitsrate: {(ok_count/(ok_count+error_count)*100):.1f}%")

# Speichere Ergebnisse
with open('/home/edufunds/edufunds-app/docs/http_check_results.json', 'w', encoding='utf-8') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'gesamt': len(ergebnisse),
        'ok': ok_count,
        'fehler': error_count,
        'ergebnisse': ergebnisse
    }, f, ensure_ascii=False, indent=2)

print("\n💾 Ergebnisse gespeichert: docs/http_check_results.json")
