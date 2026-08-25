// Wal-Quartett 1v1 WebSocket + HTTP Server (improved)
// - single HTTP server used for both APIs and WebSocket (single port)
// - safer room codes, uniqueness check
// - input validation + sanitization
// - fixed card count reporting after round distribution
// - per-round lock to avoid race conditions
// - WeakMap for player -> room mapping (avoids memory leaks)
// - improved deck loading (async) + nicer logs
// - graceful shutdown

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const MAX_PLAYERNAME_LENGTH = 30;
const MAX_MESSAGE_SIZE = 64 * 1024; // 64 KB defensive limit

// Server state
const rooms = new Map(); // roomCode -> { players: [{ws,name,number}], gameState, deck, status, lastActivity }
const playerRooms = new WeakMap(); // ws -> roomCode (WeakMap -> GC friendly)

// Deck
let cardsDeck = [];

// Helpers
function sanitizePlayerName(name = '') {
    if (typeof name !== 'string') return 'Spieler';
    let clean = name.replace(/[\u0000-\u001F\u007F]/g, '').trim();
    if (clean.length === 0) clean = 'Spieler';
    if (clean.length > MAX_PLAYERNAME_LENGTH) clean = clean.slice(0, MAX_PLAYERNAME_LENGTH);
    return clean;
}

function generateRoomCode() {
    // 4 hex chars derived from crypto randomness -> [0-9A-F], loop until unique
    for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
        if (!rooms.has(code)) return code;
    }
    // fallback (very unlikely)
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function createGame(deck) {
    const shuffled = shuffle(deck);
    const mid = Math.floor(shuffled.length / 2);
    return {
        player1Hand: shuffled.slice(0, mid),
        player2Hand: shuffled.slice(mid),
        player1Card: null,
        player2Card: null,
        currentCategory: null,
        activePlayer: 1, // 1 or 2
        round: 1,
        pot: [],
        gameOver: false,
        winner: null,
        roundLocked: false // prevents double processing for the same round
    };
}

function sendToPlayer(ws, message) {
    try {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    } catch (err) {
        console.warn('Failed to send to player:', err && err.message);
    }
}

function broadcast(roomCode, message, excludeWs = null) {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.players.forEach(p => {
        if (p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) {
            sendToPlayer(p.ws, message);
        }
    });
}

function getOpponent(roomCode, ws) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    return room.players.find(p => p.ws !== ws) || null;
}

function nowISO() {
    return new Date().toISOString();
}

function updateActivity(room) {
    room.lastActivity = Date.now();
}

// Message handlers
function handleCreateRoom(ws, msg) {
    const playerName = sanitizePlayerName(msg.playerName || 'Spieler 1');
    const roomCode = generateRoomCode();

    rooms.set(roomCode, {
        players: [{ ws, name: playerName, number: 1 }],
        gameState: null,
        deck: cardsDeck,
        status: 'waiting',
        lastActivity: Date.now()
    });
    playerRooms.set(ws, roomCode);

    sendToPlayer(ws, {
        type: 'roomCreated',
        roomCode,
        playerNumber: 1,
        playerName
    });
    console.log(`[${nowISO()}] Raum ${roomCode} erstellt von ${playerName}`);
}

function handleJoinRoom(ws, msg) {
    const roomCode = typeof msg.roomCode === 'string' ? msg.roomCode.toUpperCase() : '';
    const playerName = sanitizePlayerName(msg.playerName || 'Spieler 2');
    const room = rooms.get(roomCode);

    if (!room) {
        sendToPlayer(ws, { type: 'error', message: 'Raum nicht gefunden' });
        return;
    }
    if (room.players.length >= 2) {
        sendToPlayer(ws, { type: 'error', message: 'Raum ist voll' });
        return;
    }
    if (room.deck.length === 0) {
        sendToPlayer(ws, { type: 'error', message: 'Kein Deck geladen' });
        return;
    }

    room.players.push({ ws, name: playerName, number: 2 });
    playerRooms.set(ws, roomCode);

    // Start game
    room.gameState = createGame(room.deck);
    room.status = 'playing';
    updateActivity(room);

    const gs = room.gameState;
    const p1 = room.players[0];
    const p2 = room.players[1];

    // Send gameStart to both players
    const payload = {
        type: 'gameStart',
        roomCode,
        activePlayer: gs.activePlayer,
        cards: { player1Hand: gs.player1Hand, player2Hand: gs.player2Hand }
    };

    sendToPlayer(p1.ws, { ...payload, playerNumber: 1, playerName: p1.name, opponentName: p2.name });
    sendToPlayer(p2.ws, { ...payload, playerNumber: 2, playerName: p2.name, opponentName: p1.name });

    console.log(`[${nowISO()}] Spiel in Raum ${roomCode} gestartet — ${p1.name} vs ${p2.name}`);
}

function handleSelectCategory(ws, msg) {
    const roomCode = playerRooms.get(ws);
    const room = rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;
    const player = room.players.find(p => p.ws === ws);
    if (!player) return;

    const gs = room.gameState;

    if (gs.roundLocked) {
        sendToPlayer(ws, { type: 'error', message: 'Runde wird bereits verarbeitet' });
        return;
    }

    if (gs.activePlayer !== player.number) {
        sendToPlayer(ws, { type: 'error', message: 'Nicht dein Zug!' });
        return;
    }

    // Basic category validation
    const cat = msg.category;
    if (!cat || typeof cat !== 'string') {
        sendToPlayer(ws, { type: 'error', message: 'Ungültige Kategorie' });
        return;
    }

    // Lock the round to avoid concurrent processing
    gs.roundLocked = true;
    try {
        gs.currentCategory = cat;

        // Both players automatically play top card
        gs.player1Card = gs.player1Hand.shift();
        gs.player2Card = gs.player2Hand.shift();

        // If a player has no card (shouldn't happen), handle as game over
        if (!gs.player1Card || !gs.player2Card) {
            gs.gameOver = true;
            gs.winner = gs.player1Hand.length > 0 ? 1 : 2;
            const winnerName = room.players.find(p => p.number === gs.winner)?.name;
            broadcast(roomCode, { type: 'gameOver', winner: gs.winner, winnerName });
            room.status = 'finished';
            return;
        }

        // Ensure the category exists on the card and is numeric
        const val1 = Number(gs.player1Card[cat]);
        const val2 = Number(gs.player2Card[cat]);

        if (!Number.isFinite(val1) || !Number.isFinite(val2)) {
            // Invalid category chosen — return cards and abort the round
            gs.player1Hand.unshift(gs.player1Card);
            gs.player2Hand.unshift(gs.player2Card);
            gs.player1Card = gs.player2Card = null;
            gs.currentCategory = null;
            gs.roundLocked = false;
            sendToPlayer(ws, { type: 'error', message: 'Kategorie ist für diese Karten ungültig' });
            return;
        }

        // Put cards into pot
        gs.pot.push(gs.player1Card, gs.player2Card);

        let winner;
        if (val1 > val2) winner = 1;
        else if (val2 > val1) winner = 2;
        else winner = 0; // tie

        const winnerName = winner === 0 ? null : room.players.find(p => p.number === winner)?.name;

        // Distribute pot depending on winner
        if (winner === 1) {
            gs.player1Hand.push(...gs.pot);
        } else if (winner === 2) {
            gs.player2Hand.push(...gs.pot);
        } else {
            // tie: return each player's card to their hand (we used shift, so put them back)
            gs.player1Hand.push(gs.player1Card);
            gs.player2Hand.push(gs.player2Card);
        }

        // Clear pot and reset played cards
        gs.pot = [];
        gs.player1Card = null;
        gs.player2Card = null;
        gs.currentCategory = null;

        // Update active player (winner unless tie -> unchanged)
        gs.activePlayer = winner === 0 ? gs.activePlayer : winner;
        gs.round++;

        // Compute sizes AFTER distribution (this fixes incorrect counts previously)
        const player1CardsCount = gs.player1Hand.length;
        const player2CardsCount = gs.player2Hand.length;
        const potSize = gs.pot.length; // should be 0 now

        // Broadcast roundResult
        broadcast(roomCode, {
            type: 'roundResult',
            winner,
            winnerName,
            category: cat,
            player1Value: val1,
            player2Value: val2,
            potSize,
            player1Cards: player1CardsCount,
            player2Cards: player2CardsCount
        });

        // Check game over
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
            return;
        }

        // After short delay, start new round
        setTimeout(() => {
            // make sure game not finished/aborted
            if (!room || room.status !== 'playing') return;
            updateActivity(room);
            broadcast(roomCode, {
                type: 'newRound',
                activePlayer: gs.activePlayer,
                player1Cards: gs.player1Hand.length,
                player2Cards: gs.player2Hand.length,
                cards: {
                    player1Hand: gs.player1Hand,
                    player2Hand: gs.player2Hand
                }
            });
            gs.roundLocked = false;
        }, 1000);
    } catch (err) {
        console.error('Error in selectCategory:', err);
        gs.roundLocked = false;
        sendToPlayer(ws, { type: 'error', message: 'Server error' });
    }
}

function handleNextRound(ws) {
    const roomCode = playerRooms.get(ws);
    const room = rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;
    const gs = room.gameState;

    broadcast(roomCode, {
        type: 'newRound',
        activePlayer: gs.activePlayer,
        player1Cards: gs.player1Hand.length,
        player2Cards: gs.player2Hand.length,
        cards: {
            player1Hand: gs.player1Hand,
            player2Hand: gs.player2Hand
        }
    });
}

// Disconnect handling
function handleDisconnect(ws) {
    const roomCode = playerRooms.get(ws);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (room) {
        room.players = room.players.filter(p => p.ws !== ws);

        if (room.players.length === 0) {
            rooms.delete(roomCode);
            console.log(`[${nowISO()}] Raum ${roomCode} gelöscht (leer)`);
        } else {
            broadcast(roomCode, {
                type: 'opponentDisconnected',
                message: 'Gegner hat das Spiel verlassen'
            });
            room.status = 'aborted';
            room.lastActivity = Date.now();
        }
    }

    playerRooms.delete(ws); // WeakMap delete is optional but okay
}

// WebSocket + HTTP setup (single server)
const httpServer = http.createServer((req, res) => {
    // Basic CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/deck' && req.method === 'GET') {
        if (!cardsDeck || cardsDeck.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Kein Deck geladen' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ cards: cardsDeck }));
        return;
    }

    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            rooms: rooms.size,
            deckLoaded: cardsDeck.length > 0,
            timestamp: nowISO()
        }));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

const wss = new WebSocket.Server({ server: httpServer, maxPayload: MAX_MESSAGE_SIZE });

wss.on('connection', (ws, req) => {
    console.log(`[${nowISO()}] Neuer Spieler verbunden (${req.socket.remoteAddress || 'unknown'})`);

    ws.on('message', (data) => {
        // Defensive: ignore too large messages (maxPayload also enforces)
        if (!data) return;
        if (typeof data === 'string' && data.length > MAX_MESSAGE_SIZE) {
            sendToPlayer(ws, { type: 'error', message: 'Nachricht zu groß' });
            return;
        }

        let msg;
        try {
            msg = JSON.parse(data);
        } catch (err) {
            sendToPlayer(ws, { type: 'error', message: 'Ungültiges JSON' });
            return;
        }

        if (!msg || typeof msg.type !== 'string') {
            sendToPlayer(ws, { type: 'error', message: 'Ungültige Nachricht' });
            return;
        }

        // Route messages
        switch (msg.type) {
            case 'createRoom':
                handleCreateRoom(ws, msg);
                break;
            case 'joinRoom':
                handleJoinRoom(ws, msg);
                break;
            case 'selectCategory':
                handleSelectCategory(ws, msg);
                break;
            case 'nextRound':
                handleNextRound(ws);
                break;
            case 'leaveRoom':
            case 'disconnect':
                handleDisconnect(ws);
                break;
            default:
                sendToPlayer(ws, { type: 'error', message: 'Unbekannter Nachrichtentyp' });
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });

    ws.on('error', (err) => {
        console.error('WebSocket Fehler:', err && err.message);
        handleDisconnect(ws);
    });
});

// Deck loading
async function loadDeck() {
    try {
        const deckPath = path.join(__dirname, 'whale_facts.json');
        if (fs.existsSync(deckPath)) {
            const raw = await fs.promises.readFile(deckPath, 'utf8');
            const data = JSON.parse(raw);
            cardsDeck = Array.isArray(data.cards) ? data.cards : (Array.isArray(data) ? data : (data.cards || []));
            console.log(`[${nowISO()}] ${cardsDeck.length} Wal-Karten geladen aus ${deckPath}`);
        } else {
            console.log(`[${nowISO()}] Keine whale_facts.json gefunden — warte auf Client-Upload`);
        }
    } catch (err) {
        console.error('Fehler beim Laden des Decks:', err);
    }
}

loadDeck();

// Periodic cleanup of old/aborted rooms (optional)
setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
        if (room.status === 'aborted' && now - (room.lastActivity || 0) > 1000 * 60 * 5) {
            rooms.delete(code);
            console.log(`[${nowISO()}] Aborted room ${code} cleaned up`);
        }
    }
}, 60 * 1000);

// Graceful shutdown
function shutdown() {
    console.log('Shutting down server...');
    wss.clients.forEach(client => {
        try { client.close(1001, 'Server shutting down'); } catch (e) {}
    });
    httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

httpServer.listen(PORT, () => {
    console.log(`Wal-Quartett Server läuft auf Port ${PORT}`);
});