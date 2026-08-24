// Wal-Quartett 1v1 WebSocket Server
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

// Spielzustände
const rooms = new Map(); // roomCode -> { players: [], gameState: {}, deck: [] }
const playerRooms = new Map(); // ws -> roomCode

// Kartendeck (wird später aus JSON geladen)
let cardsDeck = [];

// Generiere zufälligen 4-stelligen Code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Shuffle Array (Fisher-Yates)
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Erstelle ein neues Spiel
function createGame(deck) {
    const shuffled = shuffle(deck);
    const mid = Math.floor(shuffled.length / 2);
    return {
        player1Hand: shuffled.slice(0, mid),
        player2Hand: shuffled.slice(mid),
        player1Card: null,
        player2Card: null,
        currentCategory: null,
        activePlayer: 1, // 1 oder 2
        round: 1,
        pot: [],
        gameOver: false,
        winner: null
    };
}

// Broadcaste an alle Spieler im Raum
function broadcast(roomCode, message, excludeWs = null) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    room.players.forEach(player => {
        if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    });
}

// Sende an einen bestimmten Spieler
function sendToPlayer(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// Finde Gegner
function getOpponent(roomCode, ws) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    return room.players.find(p => p.ws !== ws);
}

wss.on('connection', (ws) => {
    console.log('Neuer Spieler verbunden');
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            console.log('Nachricht:', msg.type, msg.roomCode || '');
            
            switch (msg.type) {
                case 'createRoom': {
                    const roomCode = generateRoomCode();
                    const playerName = msg.playerName || 'Spieler 1';
                    
                    rooms.set(roomCode, {
                        players: [{ ws, name: playerName, number: 1 }],
                        gameState: null,
                        deck: cardsDeck,
                        status: 'waiting'
                    });
                    playerRooms.set(ws, roomCode);
                    
                    sendToPlayer(ws, {
                        type: 'roomCreated',
                        roomCode,
                        playerNumber: 1,
                        playerName
                    });
                    console.log(`Raum ${roomCode} erstellt von ${playerName}`);
                    break;
                }
                
                case 'joinRoom': {
                    const roomCode = msg.roomCode?.toUpperCase();
                    const playerName = msg.playerName || 'Spieler 2';
                    const room = rooms.get(roomCode);
                    
                    if (!room) {
                        sendToPlayer(ws, { type: 'error', message: 'Raum nicht gefunden' });
                        return;
                    }
                    
                    if (room.players.length >= 2) {
                        sendToPlayer(ws, { type: 'error', message: 'Raum ist voll' });
                        return;
                    }
                    
                    room.players.push({ ws, name: playerName, number: 2 });
                    playerRooms.set(ws, roomCode);
                    
                    // Spiel starten
                    room.gameState = createGame(room.deck);
                    room.status = 'playing';
                    
                    // Beide Spieler benachrichtigen MIT Karten
                    const gs = room.gameState;
                    const p1 = room.players[0];
                    const p2 = room.players[1];
                    
                    // Spieler 1 bekommt gameStart
                    sendToPlayer(p1.ws, {
                        type: 'gameStart',
                        roomCode,
                        playerNumber: 1,
                        playerName: p1.name,
                        opponentName: p2.name,
                        activePlayer: gs.activePlayer,
                        cards: {
                            player1Hand: gs.player1Hand,
                            player2Hand: gs.player2Hand
                        }
                    });
                    
                    // Spieler 2 bekommt gameStart
                    sendToPlayer(p2.ws, {
                        type: 'gameStart',
                        roomCode,
                        playerNumber: 2,
                        playerName: p2.name,
                        opponentName: p1.name,
                        activePlayer: gs.activePlayer,
                        cards: {
                            player1Hand: gs.player1Hand,
                            player2Hand: gs.player2Hand
                        }
                    });
                    
                    console.log(`Spiel in Raum ${roomCode} gestartet`);
                    console.log(`Spieler 1: ${p1.name} (${gs.player1Hand.length} Karten)`);
                    console.log(`Spieler 2: ${p2.name} (${gs.player2Hand.length} Karten)`);
                    break;
                }
                
                case 'selectCategory': {
                    const roomCode = playerRooms.get(ws);
                    const room = rooms.get(roomCode);
                    if (!room || room.status !== 'playing') return;
                    
                    const player = room.players.find(p => p.ws === ws);
                    if (room.gameState.activePlayer !== player.number) {
                        sendToPlayer(ws, { type: 'error', message: 'Nicht dein Zug!' });
                        return;
                    }
                    
                    const gs = room.gameState;
                    gs.currentCategory = msg.category;
                    
                    // Beide Spieler die gewählte Kategorie senden
                    broadcast(roomCode, {
                        type: 'categorySelected',
                        category: msg.category,
                        activePlayer: player.number,
                        activePlayerName: player.name
                    });
                    
                    // SOFORT Karten vergleichen (beide Spieler spielen automatisch ihre Top-Karte)
                    gs.player1Card = gs.player1Hand.shift();
                    gs.player2Card = gs.player2Hand.shift();
                    
                    // Ergebnis berechnen
                    const cat = gs.currentCategory;
                    const val1 = gs.player1Card[cat];
                    const val2 = gs.player2Card[cat];
                    
                    let winner;
                    if (val1 > val2) winner = 1;
                    else if (val2 > val1) winner = 2;
                    else winner = 0; // Unentschieden
                    
                    // Karten in Pott
                    gs.pot.push(gs.player1Card, gs.player2Card);
                    
                    const winnerName = winner === 0 ? null : 
                        room.players.find(p => p.number === winner)?.name;
                    
                    // SOFORT Ergebnis senden
                    broadcast(roomCode, {
                        type: 'roundResult',
                        winner,
                        winnerName,
                        player1Card: gs.player1Card,
                        player2Card: gs.player2Card,
                        category: cat,
                        player1Value: val1,
                        player2Value: val2,
                        potSize: gs.pot.length,
                        player1Cards: gs.player1Hand.length + (winner === 1 ? gs.pot.length : (winner === 0 ? 1 : 0)),
                        player2Cards: gs.player2Hand.length + (winner === 2 ? gs.pot.length : (winner === 0 ? 1 : 0))
                    });
                    
                    // Karten verteilen
                    if (winner === 1) {
                        gs.player1Hand.push(...gs.pot);
                    } else if (winner === 2) {
                        gs.player2Hand.push(...gs.pot);
                    } else {
                        // Unentschieden: jeder bekommt seine Karte zurück
                        gs.player1Hand.push(gs.player1Card);
                        gs.player2Hand.push(gs.player2Card);
                    }
                    
                    gs.pot = [];
                    gs.player1Card = null;
                    gs.player2Card = null;
                    gs.currentCategory = null;
                    gs.activePlayer = winner === 0 ? gs.activePlayer : winner;
                    gs.round++;
                    
                    // Prüfe Spielende
                    if (gs.player1Hand.length === 0 || gs.player2Hand.length === 0) {
                        gs.gameOver = true;
                        gs.winner = gs.player1Hand.length > 0 ? 1 : 2;
                        const gameWinnerName = room.players.find(p => p.number === gs.winner)?.name;
                        
                        broadcast(roomCode, {
                            type: 'gameOver',
                            winner: gs.winner,
                            winnerName: gameWinnerName
                        });
                        
                        room.status = 'finished';
                    } else {
                        // Nach 2 Sekunden automatisch neue Runde starten
                        setTimeout(() => {
                            broadcast(roomCode, {
                                type: 'newRound',
                                activePlayer: gs.activePlayer,
                                player1Cards: gs.player1Hand.length,
                                player2Cards: gs.player2Hand.length
                            });
                        }, 2000);
                    }
                    
                    break;
                }
                
                // playCard removed - handled in selectCategory
                
                case 'nextRound': {
                    const roomCode = playerRooms.get(ws);
                    const room = rooms.get(roomCode);
                    if (!room || room.status !== 'playing') return;
                    
                    const gs = room.gameState;
                    
                    broadcast(roomCode, {
                        type: 'newRound',
                        activePlayer: gs.activePlayer,
                        player1Cards: gs.player1Hand.length,
                        player2Cards: gs.player2Hand.length
                    });
                    break;
                }
                
                case 'disconnect':
                case 'leaveRoom': {
                    handleDisconnect(ws);
                    break;
                }
            }
        } catch (err) {
            console.error('Fehler beim Verarbeiten:', err);
            sendToPlayer(ws, { type: 'error', message: 'Ungültige Nachricht' });
        }
    });
    
    ws.on('close', () => {
        handleDisconnect(ws);
    });
    
    ws.on('error', (err) => {
        console.error('WebSocket Fehler:', err);
        handleDisconnect(ws);
    });
});

function handleDisconnect(ws) {
    const roomCode = playerRooms.get(ws);
    if (!roomCode) return;
    
    const room = rooms.get(roomCode);
    if (room) {
        room.players = room.players.filter(p => p.ws !== ws);
        
        if (room.players.length === 0) {
            // Raum leer → löschen
            rooms.delete(roomCode);
            console.log(`Raum ${roomCode} gelöscht (leer)`);
        } else {
            // Gegner benachrichtigen
            broadcast(roomCode, {
                type: 'opponentDisconnected',
                message: 'Gegner hat das Spiel verlassen'
            });
            room.status = 'aborted';
        }
    }
    
    playerRooms.delete(ws);
}

// Lade Kartendeck
async function loadDeck() {
    try {
        // Versuche lokal whale_facts.json zu laden
        const fs = require('fs');
        const path = require('path');
        
        const deckPath = path.join(__dirname, 'whale_facts.json');
        if (fs.existsSync(deckPath)) {
            const data = JSON.parse(fs.readFileSync(deckPath, 'utf8'));
            cardsDeck = data.cards || data;
            console.log(`${cardsDeck.length} Wal-Karten geladen`);
        } else {
            console.log('Keine whale_facts.json gefunden, warte auf Client-Upload');
        }
    } catch (err) {
        console.error('Fehler beim Laden des Decks:', err);
    }
}

loadDeck();

console.log(`Wal-Quartett 1v1 Server läuft auf Port ${PORT}`);

// API-Endpoint für Kartendeck (damit Clients es laden können)
const http = require('http');
const fs = require('fs');

const httpServer = http.createServer((req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/deck' && req.method === 'GET') {
        if (cardsDeck.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Kein Deck geladen' }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cardsDeck));
        return;
    }
    
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, deckLoaded: cardsDeck.length > 0 }));
        return;
    }
    
    res.writeHead(404);
    res.end('Not Found');
});

httpServer.listen(8080, () => {
    console.log('HTTP API läuft auf Port 8080');
});
