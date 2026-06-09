#!/bin/bash
# Auto-Sync Script für /output/ Verzeichnis
# Wird nach jeder Agenten-Aufgabe ausgeführt

cd /home/edufunds/edufunds-app

# Prüfe ob Änderungen im output/ Verzeichnis
if git diff --quiet output/ 2>/dev/null && git diff --cached --quiet output/ 2>/dev/null; then
    exit 0
fi

# Commit & Push
git add output/
git commit -m "auto: Neue Output-Dateien von Agenten" || true
git push origin main || true
