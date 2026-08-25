#!/bin/bash
###############################################################################
# Wal-Quartett: Wöchentliche Sicherheitsupdates
# Läuft jeden Sonntag um 03:00 Uhr (außerhalb Spielzeiten)
###############################################################################

LOGFILE="/var/log/wal-quartett-security-updates.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== Security Update ${TIMESTAMP} ===" >> ${LOGFILE}

# Nur Security-Updates
export DEBIAN_FRONTEND=noninteractive
apt-get update >> ${LOGFILE} 2>&1

# Verfügbare Security-Updates anzeigen
apt-get --just-print upgrade 2>&1 | grep -i security >> ${LOGFILE} || echo "Keine Security-Updates verfügbar" >> ${LOGFILE}

# Security-Updates installieren
apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" upgrade >> ${LOGFILE} 2>&1

# Aufräumen
apt-get -y autoremove >> ${LOGFILE} 2>&1
apt-get -y autoclean >> ${LOGFILE} 2>&1

echo "=== Update abgeschlossen ===" >> ${LOGFILE}
echo "" >> ${LOGFILE}

# Neustart falls nötig
if [ -f /var/run/reboot-required ]; then
    echo "[WARNUNG] Server-Neustart erforderlich nach Update" >> ${LOGFILE}
fi
