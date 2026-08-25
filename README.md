# 🐋 Wal-Quartett

Ein digitales Quartett-Kartenspiel mit 32 Wal-Arten — spielbar direkt im Browser, ohne Installation!

🔗 **Live spielen:** [https://wal-quartett.valueinc.de](https://wal-quartett.valueinc.de)

---

## 🎮 Spielmodi

| Modus | Beschreibung |
|-------|--------------|
| 🎮 **1 Spieler vs. Computer** | Wähle Schwierigkeit: Einfach, Mittel oder Schwer |
| 👥 **2 Spieler (lokal)** | Zwei Spieler auf einem Gerät |
| 🌐 **Online 1vs1** | Echtzeit-Multiplayer über WebSocket — spiele gegen Freunde weltweit |

### Online 1vs1
1. Gib deinen Namen ein und erstelle einen Raum
2. Dein Gegner gibt den 4-stelligen Code ein und tritt bei
3. Spiel startet sofort mit je 16 Karten
4. Wähle eine Kategorie — der Server vergleicht die Karten in Echtzeit

---

## 🎯 Spielregeln

1. **Ziel:** Sammle alle 32 Karten
2. Jede Runde wählst du eine Kategorie auf deiner obersten Karte:
   - ⚖️ **Gewicht** (Tonnen)
   - 📏 **Länge** (Meter)
   - ⏳ **Lebenserwartung** (Jahre)
   - 🤿 **Tauchzeit** (Minuten)
3. Der höhere Wert gewinnt beide Karten
4. Bei **Unentschieden** gehen die Karten in den Jackpot — der nächste Gewinner bekommt alles!

---

## 🐋 Karten-Daten

| Feld | Beschreibung |
|------|--------------|
| Name | Deutsch + wissenschaftlicher Name |
| Gewicht | in Tonnen |
| Länge | in Metern |
| Lebenserwartung | in Jahren |
| Tauchzeit | in Minuten |
| Fakt | ~100 Zeichen Beschreibung |

---

## 🖥️ Technik

| Komponente | Technologie |
|------------|-------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, WebSocket (`ws`), systemd-Service |
| **Audio** | Web Audio API (synthetische Sounds) |
| **Speicherung** | localStorage für Spielstand |
| **Bilder** | 32 Wal-Fotos von Wikimedia Commons (CC-Lizenzen) |
| **Deployment** | VPS mit Nginx Reverse-Proxy, Cache-Busting |

---

## 🗂️ Projektstruktur

```
whale-quartett/
├── index.html              # Hauptdatei (Spiel + Online-Logik inline)
├── js/
│   ├── game.js             # Spiel-Logik (1P/2P/Online)
│   ├── cards.js            # 32 Wal-Karten mit Fakten
│   └── audio.js            # Sound-Effekte
├── css/
│   └── game.css            # Styling
├── server/
│   └── server.js            # WebSocket-Server (Node.js)
├── whale_facts.json         # Kartendaten (für Server)
├── whale_images/            # 32 Wal-Bilder
├── CHANGELOG.md           # Alle Bugfixes & Änderungen
└── README.md              # Diese Datei
```

---

## 🚀 Self-Hosting

### Frontend (statisch)
```bash
cp -r . /var/www/wal-quartett
```

### Backend (Node.js)
```bash
cd server/
npm install
node server.js        # Port 3000 (WebSocket) + 8080 (HTTP)
```

Oder als systemd-Service:
```bash
cp /etc/systemd/system/wal-quartett-server.service  # siehe Server-Code
systemctl enable --now wal-quartett-server
```

---

## 📜 Changelog

Siehe [CHANGELOG.md](CHANGELOG.md) für alle Versionen und Bugfixes.

---

## 🐛 Bekannte Bugs & Fixes

Alle behobenen Bugs sind in [GitHub Issues](https://github.com/GGValueInc/whale-quartett/issues) dokumentiert:

| Issue | Bug | Fix-Version |
|-------|-----|-------------|
| #1 | Spieler 2 kann keinen Namen eingeben | v2.2 |
| #2 | Spiel hängt nach Kategorie-Auswahl | v2.2 |
| #3 | Karten werden nach erster Runde nicht angezeigt | v2.3 |
| #4 | Karten-Arrays nach roundResult mit null überschrieben | v2.4 |
| #5 | Turn Indicator zeigt "Computer" statt Spieler-Name | v2.5 |

---

## 📝 Lizenz

- **Code:** MIT
- **Wal-Bilder:** Wikimedia Commons (verschiedene CC-Lizenzen)
- **Wal-Fakten:** Eigenrecherche + öffentliche Quellen

---

Made with 🐋 for whale enthusiasts everywhere.
