# Changelog

Alle wichtigen Änderungen am Wal-Quartett Projekt.

## [v2.5] - 2026-08-25

### Fixed
- **Bug: Turn Indicator zeigt "Computer" statt Spieler-Name**
  - Problem: `updateTurnIndicator()` zeigte im 1-Spieler-Modus hart "Computer's turn..." statt dem tatsächlichen Spielernamen
  - Fix: `gameState.playerNames[1]` wird jetzt verwendet mit Fallback auf "Computer"
  - Datei: `js/game.js` Zeile 175

## [v2.4] - 2026-08-25

### Fixed
- **Bug: Card Rendering nach Rundenende (Frontend)**
  - Problem: Nach `roundResult` wurden Karten-Arrays mit `new Array(N).fill(null)` überschrieben. Für 2 Sekunden (bis `newRound`) waren alle Karten `null` und `renderSpielerCard()` würde crash-en
  - Fix: Null-Arrays entfernt, `updateUI()` entfernt aus `handleOnlineRoundResult()`. Karten bleiben sichtbar bis `newRound` echte Karten-Objekte liefert
  - Datei: `index.html` Inline-Online-Modul

## [v2.3] - 2026-08-25

### Fixed
- **Bug: Card Rendering nach Rundenende (Server)**
  - Problem: `newRound`-Nachricht vom Server enthielt nur `player1Cards: 16` (Anzahl) statt echte Karten-Objekte. Frontend erzeugte `new Array(16).fill(null)` → leere Karten-Anzeige
  - Fix: Server `selectCategory` sendet jetzt `cards: { player1Hand, player2Hand }` in `newRound`
  - Datei: `server/server.js`

## [v2.2] - 2026-08-24

### Fixed
- **Bug 1: Spieler 2 kann keinen Namen eingeben**
  - Problem: Name-Eingabe war optional, Spieler 2 wurde immer "Spieler 2" genannt
  - Fix: Name-Eingabe vor Raum-Erstellen/Beitreten jetzt zwingend erforderlich
  - Datei: `index.html`

- **Bug 2: Spiel hängt nach Kategorie-Auswahl**
  - Problem: Frontend erwartete `playCard`-Nachricht, Server wartete auf `selectCategory` → Deadlock
  - Fix: Server vergleicht Karten sofort in `selectCategory`. `roundResult` wird synchron gesendet. `newRound` automatisch nach 2 Sekunden. Kein `playCard` mehr nötig
  - Datei: `server/server.js`, `index.html`

- **Bug 3: Spieler 2 als "Computer" angezeigt**
  - Problem: `p2Icon` zeigte immer 🤖 statt 👤
  - Fix: `p2Icon` prüft `gameMode === 'online'`
  - Datei: `js/game.js`

## [v2.1] - 2026-08-24

### Fixed
- **Bug: Server und Frontend synchronisieren Karten nicht**
  - Problem: `gameStart` sendete nur `cardCount` statt Karten-Objekte
  - Fix: Server sendet jetzt `cards: { player1Hand, player2Hand }` in `gameStart`
  - Datei: `server/server.js`

## [v2.0] - 2026-08-24

### Added
- Online 1vs1 Multiplayer-Modus
- WebSocket-Server für Echtzeit-Spiel
- Raum-Erstellen und Code-Eingabe
- Deterministischer Shuffle mit Seed (beide Spieler sehen gleiche Karten)
- 32 Wal-Arten mit Whale-Fakten
