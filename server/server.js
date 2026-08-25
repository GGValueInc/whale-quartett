// Wal-Quartett 1v1 WebSocket + HTTP Server (v3.1 with Usage Tracker)
// - single HTTP server for WS + APIs (port 3000)
// - safer room codes, uniqueness check
// - input validation + sanitization
// - fixed card count reporting after round distribution
// - per-round lock to avoid race conditions
// - WeakMap for player -> room mapping
// - improved deck loading + nicer logs
// - graceful shutdown
// - USAGE TRACKER: /stats endpoint for real-time insights

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const MAX_PLAYERNAME_LENGTH = 30;
const MAX_MESSAGE_SIZE = 64 * 1024; // 64 KB defensive limit
const MAX_FEEDBACK_LENGTH = 2000;
const FEEDBACK_RETENTION_DAYS = 7;
const FEEDBACK_FILE = path.join(__dirname, 'feedback', 'messages.json');

// === SERVER STATE ===
const rooms = new Map(); // roomCode -> { players: [...], gameState, deck, status, lastActivity, startedAt }
const playerRooms = new WeakMap(); // ws -> roomCode (GC friendly)

// === USAGE TRACKER ===
const STATS_FILE = path.join(__dirname, 'stats.json');

function loadStatsFromDisk() {
    try {
        if (fs.existsSync(STATS_FILE)) {
            const raw = fs.readFileSync(STATS_FILE, 'utf8');
            const data = JSON.parse(raw);
            console.log(`[STATS] Loaded: createRoom=${data.createRoom}, roundsPlayed=${data.roundsPlayed}, gameStart=${data.gameStart}`);
            return {
                createRoom: data.createRoom || 0,
                joinRoom: data.joinRoom || 0,
                gameStart: data.gameStart || 0,
                roundsPlayed: data.roundsPlayed || 0,
                gameEnd: data.gameEnd || 0,
                disconnects: data.disconnects || 0,
                errors: data.errors || 0,
                peakConcurrentRooms: data.peakConcurrentRooms || 0,
                peakConcurrentPlayers: data.peakConcurrentPlayers || 0,
                sessions: Array.isArray(data.sessions) ? data.sessions.slice(0, 50) : []
            };
        }
    } catch (e) { console.error('Stats load error:', e); }
    return {
        createRoom: 0, joinRoom: 0, gameStart: 0, roundsPlayed: 0,
        gameEnd: 0, disconnects: 0, errors: 0,
        peakConcurrentRooms: 0, peakConcurrentPlayers: 0, sessions: []
    };
}

function saveStatsToDisk() {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify({
            createRoom: stats.createRoom,
            joinRoom: stats.joinRoom,
            gameStart: stats.gameStart,
            roundsPlayed: stats.roundsPlayed,
            gameEnd: stats.gameEnd,
            disconnects: stats.disconnects,
            errors: stats.errors,
            peakConcurrentRooms: stats.peakConcurrentRooms,
            peakConcurrentPlayers: stats.peakConcurrentPlayers,
            sessions: stats.sessions.slice(0, 50)
        }, null, 2));
    } catch (e) { console.error('Stats save error:', e); }
}

const stats = loadStatsFromDisk();

function trackEvent(event, data = {}) {
    if (typeof stats[event] === 'number') {
        stats[event]++;
    }
    if (event === 'gameEnd') {
        stats.sessions.unshift(data);
        if (stats.sessions.length > 50) stats.sessions.pop();
    }
    // Update peaks
    const currentRooms = rooms.size;
    const currentPlayers = Array.from(rooms.values()).reduce((sum, r) => sum + r.players.length, 0);
    if (currentRooms > stats.peakConcurrentRooms) stats.peakConcurrentRooms = currentRooms;
    if (currentPlayers > stats.peakConcurrentPlayers) stats.peakConcurrentPlayers = currentPlayers;
    // Persist to disk
    saveStatsToDisk();
}

function trackError(reason) {
    stats.errors++;
    console.warn(`[STATS] Error tracked: ${reason}`);
    saveStatsToDisk();
}

// === FEEDBACK SYSTEM ===
function loadFeedback() {
    try {
        if (fs.existsSync(FEEDBACK_FILE)) {
            const raw = fs.readFileSync(FEEDBACK_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) { console.error('Feedback load error:', e); }
    return [];
}

function saveFeedback(messages) {
    try {
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(messages, null, 2));
    } catch (e) { console.error('Feedback save error:', e); }
}

function cleanOldFeedback() {
    const msgs = loadFeedback();
    const cutoff = Date.now() - (FEEDBACK_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const filtered = msgs.filter(m => m.timestamp > cutoff);
    if (filtered.length < msgs.length) {
        saveFeedback(filtered);
        console.log(`[${nowISO()}] Feedback cleanup: removed ${msgs.length - filtered.length} old messages`);
    }
}

// Clean every hour
setInterval(cleanOldFeedback, 60 * 60 * 1000);

function handleFeedback(ws, msg) {
    const name = sanitizePlayerName(msg.name || 'Anonym');
    const text = (msg.message || '').toString().trim();
    if (!text || text.length === 0) {
        sendToPlayer(ws, { type: 'error', message: 'Bitte gib eine Nachricht ein' });
        return;
    }
    if (text.length > MAX_FEEDBACK_LENGTH) {
        sendToPlayer(ws, { type: 'error', message: 'Nachricht zu lang (max ' + MAX_FEEDBACK_LENGTH + ' Zeichen)' });
        return;
    }

    const messages = loadFeedback();
    messages.unshift({
        id: crypto.randomBytes(8).toString('hex'),
        name,
        text,
        timestamp: Date.now(),
        dateISO: nowISO(),
        reviewed: false
    });
    saveFeedback(messages);
    sendToPlayer(ws, { type: 'feedbackReceived', message: 'Danke fuer dein Feedback!' });
    console.log(`[${nowISO()}] Feedback von ${name}`);
}

// === DECK ===
let cardsDeck = [];

// === HELPERS ===
function sanitizePlayerName(name = '') {
    if (typeof name !== 'string') return 'Spieler';
    let clean = name.replace(/[\u0000-\u001F\u007F]/g, '').trim();
    if (clean.length === 0) clean = 'Spieler';
    if (clean.length > MAX_PLAYERNAME_LENGTH) clean = clean.slice(0, MAX_PLAYERNAME_LENGTH);
    return clean;
}

function generateRoomCode() {
    for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
        if (!rooms.has(code)) return code;
    }
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
        roundLocked: false
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

// === MESSAGE HANDLERS ===
function handleCreateRoom(ws, msg) {
    const playerName = sanitizePlayerName(msg.playerName || 'Spieler 1');
    const roomCode = generateRoomCode();

    rooms.set(roomCode, {
        players: [{ ws, name: playerName, number: 1 }],
        gameState: null,
        deck: cardsDeck,
        status: 'waiting',
        lastActivity: Date.now(),
        startedAt: null
    });
    playerRooms.set(ws, roomCode);

    trackEvent('createRoom', { roomCode, playerName });

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
        trackError('joinRoom_notFound');
        return;
    }
    // === RECONNECT: Check if this is a reconnect to a paused game ===
    if (room.status === 'paused' || room.status === 'playing') {
        const disconnectedPlayer = room.players.find(p => p.disconnected);
        if (disconnectedPlayer) {
            // Reconnect!
            disconnectedPlayer.ws = ws;
            disconnectedPlayer.disconnected = false;
            disconnectedPlayer.name = playerName;
            playerRooms.set(ws, roomCode);
            room.status = 'playing';
            updateActivity(room);

            const gs = room.gameState;
            const opponent = room.players.find(p => p.ws !== ws);

            // Send gameState to reconnected player
            sendToPlayer(ws, {
                type: 'gameReconnected',
                roomCode,
                playerNumber: disconnectedPlayer.number,
                playerName: disconnectedPlayer.name,
                opponentName: opponent ? opponent.name : 'Gegner',
                activePlayer: gs.activePlayer,
                cards: {
                    player1Hand: gs.player1Hand,
                    player2Hand: gs.player2Hand
                },
                round: gs.round,
                potSize: gs.pot.length
            });

            // Notify opponent
            if (opponent && opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
                sendToPlayer(opponent.ws, {
                    type: 'opponentReconnected',
                    message: `${disconnectedPlayer.name} ist wieder da!`,
                    opponentName: disconnectedPlayer.name
                });
            }

            console.log(`[${nowISO()}] Spieler ${playerName} hat Raum ${roomCode} wieder verbunden`);
            return;
        }
    }

    // === NEW JOIN: Normal join flow ===
    if (room.players.length >= 2 && !room.players.some(p => p.disconnected)) {
        sendToPlayer(ws, { type: 'error', message: 'Raum ist voll' });
        trackError('joinRoom_full');
        return;
    }
    if (room.deck.length === 0) {
        sendToPlayer(ws, { type: 'error', message: 'Kein Deck geladen' });
        trackError('joinRoom_noDeck');
        return;
    }

    room.players.push({ ws, name: playerName, number: 2 });
    playerRooms.set(ws, roomCode);

    // Start game
    room.gameState = createGame(room.deck);
    room.status = 'playing';
    room.startedAt = Date.now();
    updateActivity(room);

    trackEvent('joinRoom', { roomCode, playerName });
    trackEvent('gameStart', { roomCode, p1: room.players[0].name, p2: room.players[1].name });

    const gs = room.gameState;
    const p1 = room.players[0];
    const p2 = room.players[1];

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
        trackError('selectCategory_locked');
        return;
    }

    if (gs.activePlayer !== player.number) {
        sendToPlayer(ws, { type: 'error', message: 'Nicht dein Zug!' });
        trackError('selectCategory_wrongTurn');
        return;
    }

    const cat = msg.category;
    if (!cat || typeof cat !== 'string') {
        sendToPlayer(ws, { type: 'error', message: 'Ungültige Kategorie' });
        trackError('selectCategory_invalid');
        return;
    }

    gs.roundLocked = true;
    try {
        gs.currentCategory = cat;

        gs.player1Card = gs.player1Hand.shift();
        gs.player2Card = gs.player2Hand.shift();

        if (!gs.player1Card || !gs.player2Card) {
            gs.gameOver = true;
            gs.winner = gs.player1Hand.length > 0 ? 1 : 2;
            const winnerName = room.players.find(p => p.number === gs.winner)?.name;
            broadcast(roomCode, { type: 'gameOver', winner: gs.winner, winnerName });
            room.status = 'finished';
            trackEvent('gameEnd', { roomCode, rounds: gs.round, finished: true, winner: gs.winner, winnerName, when: nowISO(), durationSec: room.startedAt ? Math.round((Date.now() - room.startedAt) / 1000) : 0 });
            return;
        }

        const val1 = Number(gs.player1Card[cat]);
        const val2 = Number(gs.player2Card[cat]);

        if (!Number.isFinite(val1) || !Number.isFinite(val2)) {
            gs.player1Hand.unshift(gs.player1Card);
            gs.player2Hand.unshift(gs.player2Card);
            gs.player1Card = gs.player2Card = null;
            gs.currentCategory = null;
            gs.roundLocked = false;
            sendToPlayer(ws, { type: 'error', message: 'Kategorie ist für diese Karten ungültig' });
            trackError('selectCategory_invalidCategory');
            return;
        }

        gs.pot.push(gs.player1Card, gs.player2Card);

        let winner;
        if (val1 > val2) winner = 1;
        else if (val2 > val1) winner = 2;
        else winner = 0; // tie

        const winnerName = winner === 0 ? null : room.players.find(p => p.number === winner)?.name;

        if (winner === 1) {
            gs.player1Hand.push(...gs.pot);
        } else if (winner === 2) {
            gs.player2Hand.push(...gs.pot);
        } // tie: keep cards in pot

        // Reset played cards (pot stays for tie rounds)
        gs.player1Card = null;
        gs.player2Card = null;
        gs.currentCategory = null;
        if (winner !== 0) {
            gs.pot = [];
        }

        gs.activePlayer = winner === 0 ? gs.activePlayer : winner;
        gs.round++;
        trackEvent('roundsPlayed');

        const player1CardsCount = gs.player1Hand.length;
        const player2CardsCount = gs.player2Hand.length;
        const potSize = gs.pot.length;

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
            trackEvent('gameEnd', { roomCode, rounds: gs.round, finished: true, winner: gs.winner, winnerName: gameWinnerName, when: nowISO(), durationSec: room.startedAt ? Math.round((Date.now() - room.startedAt) / 1000) : 0 });
            return;
        }

        setTimeout(() => {
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
        trackError('selectCategory_exception');
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

function handleDisconnect(ws) {
    const roomCode = playerRooms.get(ws);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (room) {
        const wasPlaying = room.status === 'playing';
        const player = room.players.find(p => p.ws === ws);
        
        if (player) {
            player.disconnected = true;
            player.ws = null;
            console.log('[RECONNECT] Spieler ' + player.name + ' (' + player.number + ') in Raum ' + roomCode + ' getrennt');
        }

        if (wasPlaying) {
            room.status = 'paused';
            room.lastActivity = Date.now();
            const opponent = room.players.find(p => p.ws && p.ws.readyState === WebSocket.OPEN);
            if (opponent) {
                sendToPlayer(opponent.ws, {
                    type: 'opponentDisconnected',
                    message: 'Gegner hat die Verbindung verloren. Warte auf Wiederverbindung...',
                    canReconnect: true
                });
            }
            trackEvent('disconnect');
        }
    }

    playerRooms.delete(ws);
}

// === HTTP + WS SERVER ===
const httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // === API: Get deck ===
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

    // === API: Health check ===
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

    // === API: Usage Stats (TRACKER) ===
    // === API: Submit feedback ===
    if (req.url === '/api/feedback' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const name = sanitizePlayerName(data.name || 'Anonym');
                const text = (data.message || '').toString().trim();
                if (!text) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Leere Nachricht' }));
                    return;
                }
                if (text.length > MAX_FEEDBACK_LENGTH) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Nachricht zu lang' }));
                    return;
                }
                const messages = loadFeedback();
                messages.unshift({
                    id: crypto.randomBytes(8).toString('hex'),
                    name,
                    text,
                    timestamp: Date.now(),
                    dateISO: nowISO(),
                    reviewed: false
                });
                saveFeedback(messages);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, message: 'Danke fuer dein Feedback!' }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ungueltiges JSON' }));
            }
        });
        return;
    }

    // === API: Review feedback ===
    if (req.url.startsWith('/api/review') && req.method === 'GET') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (token !== 'freewillyandsearchfortheothers') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        const messages = loadFeedback();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(messages));
        return;
    }

    // === API: Mark feedback as reviewed ===
    if (req.url.startsWith('/api/review') && req.method === 'POST') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (token !== 'freewillyandsearchfortheothers') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const id = data.id;
                const messages = loadFeedback();
                const m = messages.find(m => m.id === id);
                if (m) { m.reviewed = true; saveFeedback(messages); }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(400);
                res.end('Bad request');
            }
        });
        return;
    }

    if (req.url === '/stats' && req.method === 'GET') {
        const roomList = Array.from(rooms.values());
        const activePlayers = roomList.reduce((sum, r) => sum + r.players.length, 0);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            _note: 'Wal-Quartett Usage Tracker',
            serverTime: nowISO(),
            uptime: process.uptime(),
            activeRooms: rooms.size,
            activePlayers,
            roomsWaiting: roomList.filter(r => r.status === 'waiting').length,
            roomsPlaying: roomList.filter(r => r.status === 'playing').length,
            roomsFinished: roomList.filter(r => r.status === 'finished').length,
            roomsAborted: roomList.filter(r => r.status === 'aborted').length,
            totalCreateRoom: stats.createRoom,
            totalJoinRoom: stats.joinRoom,
            totalGameStart: stats.gameStart,
            totalRoundsPlayed: stats.roundsPlayed,
            totalGameEnd: stats.gameEnd,
            totalDisconnects: stats.disconnects,
            totalErrors: stats.errors,
            peakConcurrentRooms: stats.peakConcurrentRooms,
            peakConcurrentPlayers: stats.peakConcurrentPlayers,
            recentSessions: stats.sessions.slice(0, 10)
        }, null, 2));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

const wss = new WebSocket.Server({ server: httpServer, maxPayload: MAX_MESSAGE_SIZE });

wss.on('connection', (ws, req) => {
    console.log(`[${nowISO()}] Neuer Spieler verbunden (${req.socket.remoteAddress || 'unknown'})`);

    ws.on('message', (data) => {
        if (!data) return;
        if (typeof data === 'string' && data.length > MAX_MESSAGE_SIZE) {
            sendToPlayer(ws, { type: 'error', message: 'Nachricht zu groß' });
            trackError('message_tooLarge');
            return;
        }

        let msg;
        try {
            msg = JSON.parse(data);
        } catch (err) {
            sendToPlayer(ws, { type: 'error', message: 'Ungültiges JSON' });
            trackError('message_invalidJson');
            return;
        }

        if (!msg || typeof msg.type !== 'string') {
            sendToPlayer(ws, { type: 'error', message: 'Ungültige Nachricht' });
            trackError('message_invalid');
            return;
        }

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
            case 'reconnect':
                handleJoinRoom(ws, msg); // Reconnect uses same logic as join
                break;
            case 'feedback':
                handleFeedback(ws, msg);
                break;
            default:
                sendToPlayer(ws, { type: 'error', message: 'Unbekannter Nachrichtentyp' });
                trackError('message_unknownType');
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });

    ws.on('error', (err) => {
        console.error('WebSocket Fehler:', err && err.message);
        trackError('websocket_error');
        handleDisconnect(ws);
    });
});

// === DECK LOADING ===
async function loadDeck() {
    try {
        const deckPath = path.join(__dirname, 'whale_facts.json');
        if (fs.existsSync(deckPath)) {
            const raw = await fs.promises.readFile(deckPath, 'utf8');
            const data = JSON.parse(raw);
            cardsDeck = Array.isArray(data.cards) ? data.cards : (Array.isArray(data) ? data : (data.cards || []));
            console.log(`[${nowISO()}] ${cardsDeck.length} Wal-Karten geladen aus ${deckPath}`);
        } else {
            console.log(`[${nowISO()}] Keine whale_facts.json gefunden`);
        }
    } catch (err) {
        console.error('Fehler beim Laden des Decks:', err);
        trackError('deck_loadError');
    }
}

loadDeck();

// === PERIODIC CLEANUP ===
setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
        // Clean up aborted rooms after 5 minutes
        if (room.status === 'aborted' && now - (room.lastActivity || 0) > 1000 * 60 * 5) {
            rooms.delete(code);
            console.log(`[${nowISO()}] Aborted room ${code} cleaned up`);
        }
        // Clean up paused rooms after 10 minutes (allow reconnect)
        if (room.status === 'paused' && now - (room.lastActivity || 0) > 1000 * 60 * 10) {
            const duration = room.startedAt ? Math.round((Date.now() - room.startedAt) / 1000) : 0;
            trackEvent('gameEnd', {
                roomCode: code,
                durationSec: duration,
                rounds: room.gameState ? room.gameState.round : 0,
                finished: false,
                when: nowISO()
            });
            rooms.delete(code);
            console.log(`[${nowISO()}] Paused room ${code} cleaned up (no reconnect)`);
        }
    }
}, 60 * 1000);

// === GRACEFUL SHUTDOWN ===
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
    console.log(`Wal-Quartett Server (mit Tracker) läuft auf Port ${PORT}`);
});