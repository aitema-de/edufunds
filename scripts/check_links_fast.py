#!/usr/bin/env python3
import json
import subprocess
import concurrent.futures
import time

def check_link(item):
    """Check a single link and return result"""
    link = item.get('infoLink', '')
    prog_id = item.get('id', '')
    name = item.get('name', '')
    status = item.get('status', '')
    
    if not link or not link.startswith('http'):
        return {
            'id': prog_id,
            'name': name,
            'link': link or 'MISSING',
            'program_status': status,
            'http_code': 'INVALID',
            'ok': False
        }
    
    try:
        result = subprocess.run(
            ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', 
             '--max-time', '12', '-L', '--insecure', link],
            capture_output=True,
            text=True,
            timeout=15
        )
        http_code = result.stdout.strip()
        code_int = int(http_code) if http_code.isdigit() else 0
        
        return {
            'id': prog_id,
            'name': name,
            'link': link,
            'program_status': status,
            'http_code': http_code,
            'ok': 200 <= code_int < 400
        }
    except Exception as e:
        return {
            'id': prog_id,
            'name': name,
            'link': link,
            'program_status': status,
            'http_code': 'ERROR',
            'error': str(e)[:50],
            'ok': False
        }

# Load data
with open('data/foerderprogramme.json', 'r') as f:
    data = json.load(f)

print(f"Prüfe {len(data)} Links...")
print("=" * 80)

results = []
broken = []

# Process sequentially to be nice to servers
for i, item in enumerate(data):
    result = check_link(item)
    results.append(result)
    
    status_icon = "✓" if result['ok'] else "✗"
    print(f"[{i+1:3d}/{len(data)}] {status_icon} {result['id'][:40]:<40} HTTP {result['http_code']}")
    
    if not result['ok']:
        broken.append(result)
    
    time.sleep(0.3)  # Rate limiting

# Summary
print("\n" + "=" * 80)
print("ZUSAMMENFASSUNG")
print("=" * 80)
print(f"Geprüft: {len(results)}")
print(f"OK: {sum(1 for r in results if r['ok'])}")
print(f"Defekt: {len(broken)}")

if broken:
    print("\n--- DEFEKTE LINKS ---")
    for b in broken:
        print(f"\n[{b['http_code']}] {b['id']}")
        print(f"    Name: {b['name']}")
        print(f"    Link: {b['link']}")
        print(f"    Programm-Status: {b['program_status']}")

# Save results
output = {
    'checked_at': time.strftime('%Y-%m-%d %H:%M:%S'),
    'total': len(results),
    'ok': sum(1 for r in results if r['ok']),
    'broken': len(broken),
    'all_results': results,
    'broken_links': broken
}

with open('docs/link_check_complete.json', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\n✓ Ergebnisse gespeichert in docs/link_check_complete.json")
