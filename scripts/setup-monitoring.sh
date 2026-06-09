#!/bin/bash
# =============================================================================
# EduFunds Monitoring Setup
# =============================================================================
# Einmaliges Setup für Production Monitoring
# =============================================================================

set -e

echo "🚀 Setting up EduFunds Monitoring..."

# Verzeichnisse erstellen
sudo mkdir -p /var/log/edufunds
sudo mkdir -p /var/lib/edufunds
sudo chown -R edufunds:edufunds /var/log/edufunds
sudo chown -R edufunds:edufunds /var/lib/edufunds

# Logrotate Konfiguration
sudo tee /etc/logrotate.d/edufunds > /dev/null <<EOF
/var/log/edufunds/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 edufunds edufunds
}
EOF

# Cron Jobs einrichten
echo "Setting up cron jobs..."

# Alle 5 Minuten: Health Check
(crontab -l 2>/dev/null | grep -v "edufunds.*monitor" || true) | crontab -
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/edufunds/edufunds-app/scripts/monitor.sh check >> /var/log/edufunds/cron.log 2>&1") | crontab -

# Täglich um 9 Uhr: Daily Report
(crontab -l 2>/dev/null; echo "0 9 * * * /home/edufunds/edufunds-app/scripts/monitor.sh report >> /var/log/edufunds/cron.log 2>&1") | crontab -

# Täglich um 2:30 Uhr: Backup
(crontab -l 2>/dev/null; echo "30 2 * * * /home/edufunds/edufunds-app/scripts/backup.sh >> /var/log/edufunds/backup.log 2>&1") | crontab -

echo "✅ Cron jobs installed"

# Test Alert senden
echo "Sending test alert..."
/home/edufunds/edufunds-app/scripts/monitor.sh test-alert || echo "⚠️  Test alert failed (TELEGRAM_BOT_TOKEN may not be set)"

echo ""
echo "✅ Monitoring setup complete!"
echo ""
echo "Installed checks:"
echo "  • Health check every 5 minutes"
echo "  • Daily report at 9:00 AM"
echo "  • Daily backup at 2:30 AM"
echo ""
echo "Logs: /var/log/edufunds/"
echo "State: /var/lib/edufunds/"
