# Changelog

Alle wichtigen Änderungen am Wal-Quartett Projekt.

## [v5.5.0] - 2026-09-03

### Added
- **Rematch: Online-1v1 sofort nochmal spielen (Issue #20)**
  - Neu: „🔁 Rematch"-Button im Spielende-Overlay (nur Online-Modus, golden, über „Neues Spiel")
  - Gleiche Lobby: frisch gemischtes Deck, gleicher Raum-Code, keine Neueingabe von Name/Code
  - Flow: Anfrage → Gegner bekommt Bestätigungs-Dialog → Zustimmung startet neues Spiel für beide (Overlay schließt automatisch)
  - Ablehnung/Timeout (30 s) → „rematchCancelled" mit Hinweistext, Button kommt zurück
  - Server: neuer WS-Type `rematch` (handleRematch/startRematchGame), Decline-Flow, Guards (nur nach Spielende, Doppel-Anfragen ignoriert); `finished`-Rooms werden jetzt nach 3 min aufgeräumt (bisher nie — Leak)
  - Server-Datei liegt auf VPS/Stage (`/opt/wal-quartett-server/server.js`), nicht im Repo; E2E-Test 15/15 auf Stage bestanden

## [v5.4.0] - 2026-09-03

### Added
- **Unterstützen-Funktion (Ko-fi + PayPal)**
  - Neu: `unterstuetzen.html` — Support-Seite im Spiel-Design mit Ko-fi-Widget („Let's share a coffee", ID M6V626AC0T), PayPal-Pool-Link, Fallback-Button bei CDN-Block und QR-Code auf die Support-Seite
  - Neu: „💛 Unterstützen"-Button auf dem Start-Screen + Overlay (`support-overlay`, gleiche Bauweise wie Spielanleitung) → leitet auf die Support-Seite
  - Neu: `showSupport()`/`closeSupport()` in `js/game.js`, Cache-Buster game.js v57→v58
  - Rechtstext: „Freiwillige Zuwendung, keine Spendenbescheinigung, nicht absetzbar" (Privatperson, keine Gegenleistung — Ko-fi-Content-Guidelines § 3.8/3.9 konform)
  - QR-Code: `images/qr-support.png` → `https://wal-quartett.valueinc.de/unterstuetzen.html`

## [v5.3.2] - 2026-09-02 (Server, nicht im Repo)

### Fixed
- **Bug: Kartenzahl von Spieler 1 und 2 nach Reconnect vertauscht (Online-1vs1)**
  - Problem: Nach gleichzeitigem Disconnect beider Spieler (z.B. beide Handys im Ruhemodus) bekam der zuerst reconnectende Spieler den Slot des anderen — Hände, Kartenanzahl und Namen waren von Spieler 1 ↔ Spieler 2 getauscht
  - Ursache: Server ordnete Reconnects per `room.players.find(p => p.disconnected)` der Ankunftsreihenfolge zu, nicht der Spieler-Identität
  - Fix: Slot-Zuordnung jetzt per Spielername (+IP als Disambiguierung), Fallback auf altes Verhalten nur wenn Name nicht eindeutig
  - Datei: `/opt/wal-quartett-server/server.js` (VPS, Backup: `server.js.v391.backup.swapfix`)
  - Verifiziert: Simulation gegen echten Server-Code (Bug vorher reproduziert, nach Fix behoben) + Live-E2E-Test über wss://wal-quartett.valueinc.de/ws

## [v5.3.3] - 2026-09-02

### Fixed
- **Bug: Kategorie „Tauchgang" wurde im Online-Ergebnis-Overlay als „Tauchtiefe" angezeigt**
  - Problem: Online-1vs1 nutzte eine eigene, veraltete Kategorie-Map im Overlay — `dive` wurde „🌊 Tauchtiefe" gelabelt statt „🤿 Tauchgang" (wie auf den Karten)
  - Fix: Overlay-Labels an cards.js angeglichen (Tauchgang, Icons ⚖️/⏳ statt ⚖/❤)
  - Datei: `index.html` (Inline-Online-Modul)

### Changed
- **Raum-Code-UX an Server angeglichen (Server generiert 6-stellige Codes)**
  - README „4-stellig" → „6-stellig"
  - Eingabe-Placeholder „z.B. A7B3" → „z.B. A7B3C9"
  - Client-Validierung: Code muss jetzt 6 Zeichen lang sein (Server akzeptiert auch weiterhin beliebige Länge ≥1 — keine Breaking Change für laufende Räume)
  - Cache-Buster v56 → v57

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
