#!/usr/bin/env python3
import json
import requests
import time
from urllib.parse import urljoin, urlparse
import sys

# Lade JSON-Datei
with open('/home/edufunds/edufunds-app/data/foerderprogramme.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

results = {
    'working': [],
    'broken': [],
    'errors': []
}

def check_url(program):
    url = program.get('infoLink', '')
    if not url:
        results['errors'].append({
            'id': program['id'],
            'name': program['name'],
            'error': 'Kein Link vorhanden'
        })
        return
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        # Allow redirects, timeout after 15 seconds
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True, stream=True)
        
        # Close the connection without downloading full content
        response.close()
        
        status = response.status_code
        
        if status == 200:
            results['working'].append({
                'id': program['id'],
                'name': program['name'],
                'url': url,
                'status': status,
                'final_url': response.url
            })
        elif status in [301, 302, 307, 308]:
            # Redirects werden als funktionierend betrachtet
            results['working'].append({
                'id': program['id'],
                'name': program['name'],
                'url': url,
                'status': status,
                'final_url': response.url
            })
        elif status == 404:
            results['broken'].append({
                'id': program['id'],
                'name': program['name'],
                'url': url,
                'status': status
            })
        elif status >= 500:
            results['broken'].append({
                'id': program['id'],
                'name': program['name'],
                'url': url,
                'status': status
            })
        else:
            results['working'].append({
                'id': program['id'],
                'name': program['name'],
                'url': url,
                'status': status,
                'final_url': response.url
            })
            
    except requests.exceptions.Timeout:
        results['broken'].append({
            'id': program['id'],
            'name': program['name'],
            'url': url,
            'error': 'Timeout (>15s)'
        })
    except requests.exceptions.ConnectionError as e:
        results['broken'].append({
            'id': program['id'],
            'name': program['name'],
            'url': url,
            'error': f'Connection Error: {str(e)[:50]}'
        })
    except requests.exceptions.RequestException as e:
        results['broken'].append({
            'id': program['id'],
            'name': program['name'],
            'url': url,
            'error': str(e)[:50]
        })
    except Exception as e:
        results['errors'].append({
            'id': program['id'],
            'name': program['name'],
            'url': url,
            'error': str(e)[:50]
        })

# Haupt-Validierung
print(f"Prüfe {len(data)} Links...\n")

for i, program in enumerate(data, 1):
    name_short = program['name'][:50].ljust(52)
    print(f"[{i:3d}/{len(data)}] {name_short}", end='', flush=True)
    
    check_url(program)
    
    # Status anzeigen
    last_working = results['working'][-1] if results['working'] and results['working'][-1]['id'] == program['id'] else None
    last_broken = results['broken'][-1] if results['broken'] and results['broken'][-1]['id'] == program['id'] else None
    
    if last_working:
        print(f" → HTTP {last_working['status']} ✓")
    elif last_broken:
        if 'status' in last_broken:
            print(f" → HTTP {last_broken['status']} ✗")
        else:
            print(f" → FEHLER: {last_broken.get('error', 'Unknown')[:30]}")
    else:
        print(" → UNBEKANNT")
    
    # Rate limiting - 500ms Pause
    if i < len(data):
        time.sleep(0.5)

# Zusammenfassung
print("\n" + "="*60)
print("ERGEBNIS")
print("="*60)
print(f"✓ Funktionierende Links: {len(results['working'])}")
print(f"✗ Defekte Links: {len(results['broken'])}")
print(f"⚠ Andere Fehler: {len(results['errors'])}")
print(f"  Gesamt: {len(data)}")

# Defekte Links anzeigen
if results['broken']:
    print("\n" + "="*60)
    print("DEFEKTE LINKS")
    print("="*60)
    for idx, item in enumerate(results['broken'], 1):
        print(f"\n{idx}. {item['name']} ({item['id']})")
        print(f"   URL: {item['url']}")
        if 'status' in item:
            print(f"   Status: HTTP {item['status']}")
        if 'error' in item:
            print(f"   Fehler: {item['error']}")

# Speichere Ergebnisse
with open('/home/edufunds/edufunds-app/data/link-check-results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

if results['broken']:
    with open('/home/edufunds/edufunds-app/data/broken-links.json', 'w', encoding='utf-8') as f:
        json.dump(results['broken'], f, indent=2, ensure_ascii=False)
    print("\n✓ Defekte Links gespeichert in: broken-links.json")

print("\n✓ Ergebnisse gespeichert in: link-check-results.json")

# Berechne Erfolgsquote
success_rate = (len(results['working']) / len(data)) * 100
print(f"\nErfolgsquote: {success_rate:.1f}%")
