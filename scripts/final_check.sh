#!/bin/bash
# Final link verification

echo "FINALE LINK-ÜBERPRÜFUNG"
echo "========================"
echo ""

# Check a representative sample of 30 links
check_url() {
    local name="$1"
    local url="$2"
    local code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 -L "$url" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        echo "✓ $name"
    else
        echo "✗ $name (HTTP $code)"
    fi
}

check_url "telekom-stiftung" "https://www.telekom-stiftung.de"
check_url "bmbf-digitalpakt" "https://www.bmftr.bund.de"
check_url "nabu" "https://www.nabu.de"
check_url "chemie-fonds" "https://www.vci.de/fonds/der-fonds/foerderprogramm/seiten.jsp"
check_url "deutsche-post" "https://www.deutschepost.de"
check_url "bosch-schulpreis" "https://www.deutscher-schulpreis.de"
check_url "playmobil-hobpreis" "https://www.kinderstiftung-playmobil.de/hob-preis"
check_url "ferry-porsche" "https://ferry-porsche-challenge.de"
check_url "klaus-tschira" "https://www.klaus-tschira-stiftung.de/foerderung/naturwissenschaften-mathematik-informatik"
check_url "erasmus-plus" "https://www.erasmus-plus.de"
check_url "stifterverband" "https://www.stifterverband.org"
check_url "kulturstiftung-bund" "https://www.kulturstiftung.de/kultur-macht-schule/"
check_url "kultur-macht-stark" "https://www.buendnisse-fuer-bildung.de"
check_url "siemens-stiftung" "https://www.siemens-stiftung.org"
check_url "ibm-skillsbuild" "https://skillsbuild.org"

echo ""
echo "Stichprobe abgeschlossen."
