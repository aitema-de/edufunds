#!/bin/bash
# Scout Daily - Fördermittel-Recherche
# Läuft täglich um 07:00 Uhr

cd /home/edufunds/edufunds-app
/usr/bin/node scripts/scout-daily.js >> logs/scout-cron.log 2>&1
