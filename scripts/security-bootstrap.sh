#!/bin/bash
###############################################################################
# Wal-Quartett Security Bootstrap Script
# Einrichtung aller Sicherheitsmaßnahmen auf einem frischen Ubuntu-Server
# Idempotent: Mehrfaches Ausführen ist ungefährlich
#
# VERWENDUNG:
#   Option 1 (empfohlen): Key als Parameter übergeben
#     sudo bash security-bootstrap.sh /pfad/zu/dein-key.pub
#
#   Option 2: Key bereits manuell installiert
#     sudo bash security-bootstrap.sh
#
#   Option 3: Ohne SSH-Härtung (z.B. für Testumgebungen)
#     SKIP_SSH_HARDEN=1 sudo bash security-bootstrap.sh
###############################################################################

set -euo pipefail

# === KONFIGURATION ===
APP_USER="walquartett"
APP_DIR="/opt/wal-quartett-server"
WEB_DIR="/var/www/wal-quartett"
LOG_FILE="/var/log/wal-quartett.log"
NODE_VERSION="20"
SSH_PORT="22"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}"
}

###############################################################################
# 1. SYSTEM UPDATE
###############################################################################
section1() {
    info "=== Schritt 1: System Update ==="
    apt-get update
    apt-get upgrade -y
    apt-get install -y curl wget git ufw fail2ban logrotate nginx
    log "System-Pakete aktualisiert"
}

###############################################################################
# 2. SSH KEY EINRICHTEN (MUSS vor SSH-Härtung passieren!)
###############################################################################
section2() {
    info "=== Schritt 2: SSH Key einrichten ==="
    
    SSH_KEY_ARG=""
    
    # Prüfe ob ein SSH Key als Parameter übergeben wurde
    if [ $# -ge 1 ] && [ -f "$1" ]; then
        SSH_KEY_ARG="$1"
        info "SSH Key als Parameter: $1"
    fi
    
    # Prüfe ob ~/.ssh/authorized_keys bereits existiert
    if [ -s "/root/.ssh/authorized_keys" ]; then
        info "SSH authorized_keys existiert bereits"
        if [ -n "${SSH_KEY_ARG}" ]; then
            warn "Key wird trotzdem hinzugefügt (idempotent)"
        else
            return 0
        fi
    elif [ -z "${SSH_KEY_ARG}" ]; then
        warn "KEIN SSH KEY gefunden!"
        echo ""
        echo "═══════════════════════════════════════════════════════════════"
        echo "  ACHTUNG: SSH Key fehlt!"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
        echo "Ohne SSH Key wirst du nach der SSH-Härtung AUSGESPERTRT!"
        echo ""
        echo "Optionen:"
        echo ""
        echo "  1. Key als Parameter übergeben (EMPFOHLEN):"
        echo "     sudo bash security-bootstrap.sh /pfad/zu/dein-key.pub"
        echo ""
        echo "  2. Key manuell einfügen, DANN Script starten:"
        echo "     mkdir -p /root/.ssh"
        echo "     echo 'ssh-ed25519 AAAAC3...' > /root/.ssh/authorized_keys"
        echo "     sudo bash security-bootstrap.sh"
        echo ""
        echo "  3. Script OHNE SSH-Härtung ausführen:"
        echo "     SKIP_SSH_HARDEN=1 sudo bash security-bootstrap.sh"
        echo ""
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
        
        read -p "Trotzdem fortfahren? (j/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Jj]$ ]]; then
            error "Abgebrochen. Bitte SSH Key einrichten."
            exit 1
        fi
        warn "Fortfahren ohne Key - DU WIRST AUSGESPERT!"
        warn "Nach dem Script kannst du dich nur noch mit Passwort anmelden (falls aktiviert)"
        sleep 3
        return 0
    fi
    
    # Key einrichten falls als Parameter übergeben
    if [ -n "${SSH_KEY_ARG}" ]; then
        mkdir -p /root/.ssh
        chmod 700 /root/.ssh
        cat "${SSH_KEY_ARG}" >> /root/.ssh/authorized_keys
        chmod 600 /root/.ssh/authorized_keys
        log "SSH Key aus ${SSH_KEY_ARG} installiert"
    fi
}

###############################################################################
# 3. SSH HÄRTEN
###############################################################################
section3() {
    # Überspringe wenn SKIP_SSH_HARDEN gesetzt
    if [ "${SKIP_SSH_HARDEN:-}" = "1" ]; then
        warn "SSH-Härtung übersprungen (SKIP_SSH_HARDEN=1)"
        return 0
    fi
    
    info "=== Schritt 3: SSH Härten ==="
    
    # Prüfe OB ein Key existiert - sonst warnen
    if [ ! -s "/root/.ssh/authorized_keys" ]; then
        warn "KEIN SSH Key gefunden!"
        warn "Du wirst nach der Härtung ausgesperrt!"
        warn "Warte 5 Sekunden... (Strg+C zum Abbrechen)"
        sleep 5
    fi
    
    SSH_CONFIG="/etc/ssh/sshd_config"
    
    # Backup erstellen
    cp ${SSH_CONFIG} ${SSH_CONFIG}.backup.$(date +%Y%m%d) 2>/dev/null || true
    
    # Sichere Einstellungen
    sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' ${SSH_CONFIG}
    sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' ${SSH_CONFIG}
    sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' ${SSH_CONFIG}
    sed -i 's/^#*PermitEmptyPasswords.*/PermitEmptyPasswords no/' ${SSH_CONFIG}
    sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' ${SSH_CONFIG}
    sed -i 's/^#*ClientAliveInterval.*/ClientAliveInterval 300/' ${SSH_CONFIG}
    sed -i 's/^#*ClientAliveCountMax.*/ClientAliveCountMax 2/' ${SSH_CONFIG}
    
    # Prüfe ob Zeilen existieren, falls nicht: hinzufügen
    grep -q "^PermitRootLogin" ${SSH_CONFIG} || echo "PermitRootLogin prohibit-password" >> ${SSH_CONFIG}
    grep -q "^PasswordAuthentication" ${SSH_CONFIG} || echo "PasswordAuthentication no" >> ${SSH_CONFIG}
    grep -q "^PubkeyAuthentication" ${SSH_CONFIG} || echo "PubkeyAuthentication yes" >> ${SSH_CONFIG}
    grep -q "^PermitEmptyPasswords" ${SSH_CONFIG} || echo "PermitEmptyPasswords no" >> ${SSH_CONFIG}
    grep -q "^MaxAuthTries" ${SSH_CONFIG} || echo "MaxAuthTries 3" >> ${SSH_CONFIG}
    grep -q "^ClientAliveInterval" ${SSH_CONFIG} || echo "ClientAliveInterval 300" >> ${SSH_CONFIG}
    grep -q "^ClientAliveCountMax" ${SSH_CONFIG} || echo "ClientAliveCountMax 2" >> ${SSH_CONFIG}
    
    systemctl restart ssh || systemctl restart sshd
    log "SSH gehärtet: Kein Root-Passwort, nur Key-Auth, max 3 Versuche"
}

###############################################################################
# 4. FIREWALL (UFW)
###############################################################################
section4() {
    info "=== Schritt 4: Firewall (UFW) ==="
    
    # UFW zurücksetzen falls schon aktiv
    ufw --force reset 2>/dev/null || true
    
    # Defaults
    ufw default deny incoming
    ufw default allow outgoing
    
    # Erlaube notwendige Ports
    ufw allow ${SSH_PORT}/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    
    # Port 3000 explizit BLOCKIEREN (nur lokal über Nginx erreichbar)
    ufw deny 3000/tcp comment 'Node.js direkt gesperrt'
    
    ufw --force enable
    log "Firewall aktiviert: SSH(22), HTTP(80), HTTPS(443) erlaubt. Port 3000 blockiert."
}

###############################################################################
# 5. FAIL2BAN
###############################################################################
section5() {
    info "=== Schritt 5: Fail2ban ==="
    
    # SSH Jail (läuft sofort)
    cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = %(journal_match)s
maxretry = 3
findtime = 300
bantime = 3600

[sshd-ddos]
enabled = true
port = ssh
filter = sshd-ddos
logpath = %(journal_match)s
maxretry = 2
findtime = 60
bantime = 3600
EOF

    # Wal-Quartett Filter (bereitgestellt, aber optional)
    cat > /etc/fail2ban/filter.d/wal-quartett.conf << 'EOF'
[Definition]
failregex = ^.*\[SECURITY\].*Rate limit exceeded for <HOST>.*$
            ^.*\[SECURITY\].*Max connections reached.*$
ignoreregex =
EOF

    # Wal-Quartett Jail
    cat > /etc/fail2ban/jail.d/wal-quartett.conf << 'EOF'
[wal-quartett]
enabled = true
filter = wal-quartett
logpath = /var/log/wal-quartett.log
maxretry = 10
findtime = 60
bantime = 3600
EOF

    systemctl restart fail2ban || true
    log "Fail2ban konfiguriert: SSH Brute-Force + Wal-Quartett Rate-Limit"
}

###############################################################################
# 6. UNNÖTIGE SERVICES DEAKTIVIEREN
###############################################################################
section6() {
    info "=== Schritt 6: Unnötige Services deaktivieren ==="
    
    SERVICES="docker fwupd snapd"
    for svc in ${SERVICES}; do
        systemctl stop ${svc} 2>/dev/null || true
        systemctl disable ${svc} 2>/dev/null || true
        info "Service ${svc} gestoppt"
    done
    
    log "Unnötige Services deaktiviert"
}

###############################################################################
# 7. SWAP AKTIVIEREN
###############################################################################
section7() {
    info "=== Schritt 7: Swap ==="
    
    if ! swapon --show | grep -q "/swapfile"; then
        fallocate -l 1G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        log "1 GB Swap aktiviert"
    else
        info "Swap existiert bereits"
    fi
    
    # Swappiness optimieren
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    log "Swappiness auf 10 gesetzt (Swap nur als Notfall)"
}

###############################################################################
# 8. LOG-ROTATION
###############################################################################
section8() {
    info "=== Schritt 8: Log-Rotation ==="
    
    cat > /etc/logrotate.d/wal-quartett << 'EOF'
/var/log/wal-quartett.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 644 walquartett walquartett
    copytruncate
}
EOF

    log "Log-Rotation für Wal-Quartett eingerichtet (14 Tage)"
}

###############################################################################
# 9. APP-USER ERSTELLEN
###############################################################################
section9() {
    info "=== Schritt 9: App-User erstellen ==="
    
    if ! id "${APP_USER}" &>/dev/null; then
        useradd -r -s /bin/false -d ${APP_DIR} ${APP_USER}
        log "User '${APP_USER}' erstellt"
    else
        info "User '${APP_USER}' existiert bereits"
    fi
}

###############################################################################
# 10. SYSTEMD SERVICE
###############################################################################
section10() {
    info "=== Schritt 10: Systemd Service ==="
    
    cat > /etc/systemd/system/wal-quartett-server.service << EOF
[Unit]
Description=Wal-Quartett 1v1 WebSocket Server
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Restart=always
RestartSec=5
StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}

# SECURITY: Restrict capabilities
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${APP_DIR} /var/log

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    log "Systemd Service mit Sandbox konfiguriert"
}

###############################################################################
# 11. VERZEICHNISSE + RECHTE
###############################################################################
section11() {
    info "=== Schritt 11: Verzeichnisse und Rechte ==="
    
    mkdir -p ${APP_DIR}
    mkdir -p ${WEB_DIR}
    mkdir -p /var/log
    mkdir -p /var/backups/wal-quartett
    
    chown -R ${APP_USER}:${APP_USER} ${APP_DIR}
    chown -R ${APP_USER}:${APP_USER} ${WEB_DIR}
    chmod 750 ${APP_DIR}
    
    touch ${LOG_FILE}
    chown ${APP_USER}:${APP_USER} ${LOG_FILE}
    
    log "Verzeichnisse und Rechte gesetzt"
}

###############################################################################
# 12. BACKUP SCRIPT
###############################################################################
section12() {
    info "=== Schritt 12: Backup Script ==="
    
    cat > /usr/local/bin/wal-quartett-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/wal-quartett"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/wal-quartett_${TIMESTAMP}.tar.gz"

mkdir -p ${BACKUP_DIR}

# Backup erstellen
tar -czf ${BACKUP_FILE} \
    /opt/wal-quartett-server/ \
    /var/www/wal-quartett/ \
    /etc/nginx/sites-enabled/wal-quartett \
    /etc/systemd/system/wal-quartett-server.service \
    2>/dev/null

# Alte Backups löschen (nur letzte 7 Tage behalten)
find ${BACKUP_DIR} -name "wal-quartett_*.tar.gz" -mtime +7 -delete

echo "Backup erstellt: ${BACKUP_FILE}"
EOF

    chmod +x /usr/local/bin/wal-quartett-backup.sh
    
    # Cron-Job für tägliche Backups (außerhalb 00:00-06:00 MESZ)
    (crontab -l 2>/dev/null | grep -v "wal-quartett-backup"; echo "0 7 * * * /usr/local/bin/wal-quartett-backup.sh >> /var/log/wal-quartett-backup.log 2>&1") | crontab -
    
    log "Tägliche Backups um 07:00 Uhr eingerichtet"
}

###############################################################################
# 13. AUTOMATISCHE UPDATES
###############################################################################
section13() {
    info "=== Schritt 13: Automatische Updates ==="
    
    apt-get install -y unattended-upgrades
    
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};

Unattended-Upgrade::Package-Blacklist {
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::InstallOnShutdown "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::SyslogEnable "true";
Unattended-Upgrade::Verbose "false";
EOF

    cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

    log "Automatische Sicherheits-Updates aktiviert"
}

###############################################################################
# 14. ZUSAMMENFASSUNG
###############################################################################
section14() {
    info "=== ZUSAMMENFASSUNG ==="
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  WAL-QUARTETT SECURITY BOOTSTRAP ABGESCHLOSSEN"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "✅ System Update"
    echo "✅ SSH Key eingerichtet"
    echo "✅ SSH gehärtet (Key-Auth, kein Passwort)"
    echo "✅ Firewall: SSH(22), HTTP(80), HTTPS(443) erlaubt"
    echo "✅ Fail2ban: SSH Brute-Force + Wal-Quartett Rate-Limit"
    echo "✅ Unnötige Services deaktiviert"
    echo "✅ Swap: 1 GB aktiviert"
    echo "✅ Log-Rotation: 14 Tage"
    echo "✅ App-User: ${APP_USER}"
    echo "✅ Systemd: Sandbox"
    echo "✅ Backups: Täglich 07:00"
    echo "✅ Auto-Updates: Sicherheitspatches"
    echo ""
    echo "📝 Nächste Schritte:"
    echo "   1. Node.js installieren"
    echo "   2. Server-Code nach ${APP_DIR} kopieren"
    echo "   3. SSL-Zertifikat einrichten"
    echo "   4. systemctl start wal-quartett-server"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

###############################################################################
# HAUPTPROGRAMM
###############################################################################
main() {
    if [ "$EUID" -ne 0 ]; then
        error "Dieses Script muss als root ausgeführt werden"
        exit 1
    fi
    
    echo "═══════════════════════════════════════════════════════════════"
    echo "  WAL-QUARTETT SECURITY BOOTSTRAP"
    echo "  Start: $(date)"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    section1
    section2 "$@"
    section3
    section4
    section5
    section6
    section7
    section8
    section9
    section10
    section11
    section12
    section13
    section14
    
    log "Bootstrap abgeschlossen!"
}

main "$@"
