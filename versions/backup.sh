#!/bin/bash
# versions/backup.sh – Erstellt ein Backup vor Änderungen

VERSION_DIR="$(dirname "$0")"
SOURCE_DIR="$(dirname "$VERSION_DIR")/spiel"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$VERSION_DIR/v$TIMESTAMP"

echo "Erstelle Backup: v$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
cp -r "$SOURCE_DIR"/* "$BACKUP_DIR/"

# README aktualisieren
sed -i "s/| v1.4.0/| v1.5.0 | $(date +%Y-%m-%d) | Phase 5 | ... |\n| v1.4.0/" "$VERSION_DIR/README.md" 2>/dev/null || true

echo "Backup erstellt in: $BACKUP_DIR"
echo "Zum Rollback: cp -r $BACKUP_DIR/* $SOURCE_DIR/"
