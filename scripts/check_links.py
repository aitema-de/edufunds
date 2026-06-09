#!/usr/bin/env python3
import json
import subprocess
import time
from urllib.parse import urlparse

# Load data
with open('data/foerderprogramme.json', 'r') as f:
    data = json.load(f)

results = []
errors = []

print("=" * 80)
print("LINK CHECK - EduFunds Förderprogramme")
print("=" * 80)
print(f"Prüfe {len(data)} Programme...\n")

for i, item in enumerate(data):
    link = item.get('infoLink', '')
    prog_id = item.get('id', '')
    name = item.get('name', '')
    status = item.get('status', '')
    
    if not link:
        errors.append({
            'id': prog_id,
            'name': name,
            'link': 'MISSING',
            'http_status': 'NO LINK',
            'error': 'Kein infoLink vorhanden'
        })
        continue
    
    # Skip non-http links
    if not link.startswith('http'):
        errors.append({
            'id': prog_id,
            'name': name,
            'link': link,
            'http_status': 'SKIP',
            'error': 'Nicht-HTTP Link'
        })
        continue
    
    print(f"[{i+1}/{len(data)}] {prog_id}")
    print(f"      URL: {link[:70]}..." if len(link) > 70 else f"      URL: {link}")
    
    try:
        # Use curl to check link
        result = subprocess.run(
            ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', 
             '--max-time', '15', '-L', '--insecure', link],
            capture_output=True,
            text=True,
            timeout=20
        )
        
        http_code = result.stdout.strip()
        
        # Also check for redirect
        result_redirect = subprocess.run(
            ['curl', '-s', '-o', '/dev/null', '-w', '%{redirect_url}', 
             '--max-time', '10', '-L', '--insecure', link],
            capture_output=True,
            text=True,
            timeout=15
        )
        redirect_url = result_redirect.stdout.strip()
        
        results.append({
            'id': prog_id,
            'name': name,
            'link': link,
            'status': status,
            'http_code': http_code,
            'redirect_url': redirect_url if redirect_url != link else None
        })
        
        code_int = int(http_code) if http_code.isdigit() else 0
        if code_int >= 200 and code_int < 300:
            print(f"      ✓ HTTP {http_code} OK")
        elif code_int >= 300 and code_int < 400:
            print(f"      → HTTP {http_code} Redirect")
        elif code_int >= 400:
            print(f"      ✗ HTTP {http_code} FEHLER!")
            errors.append({
                'id': prog_id,
                'name': name,
                'link': link,
                'http_status': http_code,
                'status': status
            })
        else:
            print(f"      ? HTTP {http_code} UNKLAR")
            
    except subprocess.TimeoutExpired:
        print(f"      ✗ TIMEOUT")
        errors.append({
            'id': prog_id,
            'name': name,
            'link': link,
            'http_status': 'TIMEOUT',
            'status': status
        })
    except Exception as e:
        print(f"      ✗ ERROR: {str(e)[:50]}")
        errors.append({
            'id': prog_id,
            'name': name,
            'link': link,
            'http_status': 'ERROR',
            'error': str(e)[:100],
            'status': status
        })
    
    time.sleep(0.5)  # Be nice to servers

print("\n" + "=" * 80)
print("ZUSAMMENFASSUNG")
print("=" * 80)
print(f"Geprüft: {len(results)}")
print(f"Fehler: {len(errors)}")

if errors:
    print("\n--- DEFEKTE LINKS ---")
    for e in errors:
        print(f"\n[{e['http_status']}] {e['id']}")
        print(f"    Name: {e['name']}")
        print(f"    Link: {e['link']}")
        if 'status' in e:
            print(f"    Programm-Status: {e['status']}")

# Save results
with open('docs/link_check_results.json', 'w') as f:
    json.dump({'results': results, 'errors': errors}, f, indent=2)

print("\n✓ Ergebnisse gespeichert in docs/link_check_results.json")
