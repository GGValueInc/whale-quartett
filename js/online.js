/* online.js — Online 1v1 Modul + Chat
 * Aus index.html ausgelagert (Refactor: 520 Zeilen Riesen-Inline-Block).
 * Wird NACH game.js geladen und nutzt dessen Globals (gameState, whales, UI-Funktionen).
 */

    // === ONLINE 1v1 MODE ===
    let ws = null;
    let onlineState = {
        connected: false,
        roomCode: null,
        playerNumber: null,
        opponentName: "Gegenspieler",
        isMyTurn: false,
        playerName: "Spieler",
        avatar: "🐋"  // Default: sonst ist das Feld im createRoom/joinRoom-Frame undefined
    };
    function showOnlineSetup() {
        console.log("showOnlineSetup aufgerufen!");
        showScreen("online-screen");
        document.getElementById("online-create-section").style.display = "block";
        document.getElementById("online-wait-section").style.display = "none";
        var nameInput = document.getElementById("online-player-name");
        if (nameInput) {
            nameInput.value = "";
            nameInput.focus();
        }
    }
    // Deterministischer Shuffle mit Seed (damit beide Spieler dieselben Karten bekommen)
    function seededShuffle(array, seed) {
        var arr = array.slice();
        function mulberry32(a) {
            return function() {
                var t = a += 0x6D2B79F5;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            }
        }
        var rand = mulberry32(seed);
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(rand() * (i + 1));
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }
    function getPlayerName() {
        var nameInput = document.getElementById("online-player-name");
        var name = nameInput ? nameInput.value.trim() : "";
        return name || "Spieler";
    }
    function createOnlineRoom() {
        var name = getPlayerName();
        if (!name || name === "Spieler") {
            alert("Bitte gib deinen Namen ein!");
            document.getElementById("online-player-name").focus();
            return;
        }
        onlineState.playerName = name;
        connectWebSocket("create");
    }
    function joinOnlineRoom() {
        var name = getPlayerName();
        if (!name || name === "Spieler") {
            alert("Bitte gib deinen Namen ein!");
            document.getElementById("online-player-name").focus();
            return;
        }
        var codeInput = document.getElementById("online-room-code");
        var code = codeInput ? codeInput.value.trim().toUpperCase() : "";
        if (!code || code.length < 6) {
            alert("Bitte gib einen 6-stelligen Code ein!");
            return;
        }
        onlineState.playerName = name;
        connectWebSocket("join", code);
    }
    function cancelOnlineRoom() {
        if (ws) { ws.onclose = null; ws.close(); ws = null; }
        if (window._wsReconnectTimer) { clearInterval(window._wsReconnectTimer); window._wsReconnectTimer = null; }
        try { localStorage.removeItem('walq_online'); } catch(e) {}
        showStart();
    }
    // === REMATCH ===
    function requestRematch() {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            alert("Nicht mehr verbunden – bitte neues Spiel erstellen.");
            return;
        }
        ws.send(JSON.stringify({ type: "rematch" }));
    }
    // Overlay-Text aktualisieren ohne Button-Änderung (Rematch-Warteschleife etc.)
    function showGameOverMessageOnly(text) {
        var t = document.getElementById('gameover-text');
        if (t && text) t.textContent = text;
    }
    // Rematch gestartet (Server schickt neues gameStart): Overlay zu, Button zurücksetzen
    function closeGameoverOverlay() {
        document.getElementById('gameover-overlay').classList.remove('active');
        var rbtn = document.getElementById('btn-rematch');
        if (rbtn) rbtn.style.display = 'none';
    }
    function connectWebSocket(mode, roomCode) {
        var wsUrl = window.location.protocol === "https:" 
            ? "wss://" + window.location.host + "/ws"
            : "ws://" + window.location.host + "/ws";
        console.log("Verbinde zu:", wsUrl);
        ws = new WebSocket(wsUrl);
        ws.onopen = function() {
            console.log("WebSocket verbunden");
            if (mode === "create") {
                ws.send(JSON.stringify({ type: "createRoom", playerName: onlineState.playerName, avatar: onlineState.avatar }));
            } else {
                ws.send(JSON.stringify({ type: "joinRoom", roomCode: roomCode, playerName: onlineState.playerName, avatar: onlineState.avatar }));
            }
        };
        ws.onmessage = function(event) {
            try {
                var msg = JSON.parse(event.data);
                console.log("Nachricht:", msg.type, msg);
                handleOnlineMessage(msg);
            } catch (e) {
                console.error("Fehler beim Parsen:", e);
            }
        };
        ws.onerror = function(error) {
            console.error("WebSocket Fehler:", error);
            alert("Verbindungsfehler. Bitte Seite neu laden.");
        };
        ws.onclose = function() {
            console.log("WebSocket geschlossen");
            if (onlineState.connected) {
                onlineState.connected = false;
                // RUHEMODUS-RECONNECT: Nicht sofort aufgeben — der Server hält
                // den Raum 10 min pausiert. Auto-Reconnect mit Backoff (max 3 min).
                tryReconnectLoop();
            }
        };
    }
    // === RUHEMODUS-AUTO-RECONNECT ===
    function tryReconnectLoop() {
        if (window._wsReconnectTimer) return;  // läuft schon
        var attempts = 0;
        var maxWindowMs = 3 * 60 * 1000;  // 3 Minuten aktives Retry-Fenster
        var startedAt = Date.now();
        // Nutzer-Hinweis statt harter Rückkehr ins Menü
        updateTurnIndicator();
        var hintEl = document.getElementById('turn-indicator');
        if (hintEl) hintEl.innerHTML = '📡 Verbindung wird wiederhergestellt...<br><small>Spiel wird fortgesetzt</small>';
        
        window._wsReconnectTimer = setInterval(function() {
            attempts++;
            if (Date.now() - startedAt > maxWindowMs) {
                clearInterval(window._wsReconnectTimer);
                window._wsReconnectTimer = null;
                try { localStorage.removeItem('walq_online'); } catch(e) {}
                alert("Verbindung konnte nicht wiederhergestellt werden.");
                showStart();
                return;
            }
            try { if (ws) { ws.onclose = null; ws.close(); } } catch(e) {}
            var saved = null;
            try { saved = JSON.parse(localStorage.getItem('walq_online') || 'null'); } catch(e) {}
            var code = (saved && saved.roomCode) || onlineState.roomCode;
            var name = (saved && saved.playerName) || onlineState.playerName;
            if (!code) {
                clearInterval(window._wsReconnectTimer);
                window._wsReconnectTimer = null;
                return;
            }
            console.log("Reconnect-Versuch", attempts, "Raum", code);
            onlineState.playerName = name;
            connectWebSocket("join", code);
        }, 5000);
    }
    // Sichtbarkeits-Trigger: Handy aus Ruhemodus -> sofortiger Reconnect-Versuch
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible'
            && gameState.gameMode === 'online'
            && onlineState.roomCode
            && (!ws || ws.readyState !== WebSocket.OPEN)) {
            tryReconnectLoop();
        }
    });
    function handleOnlineMessage(msg) {
        switch (msg.type) {
            case "roomCreated":
                onlineState.roomCode = msg.roomCode;
                onlineState.playerNumber = msg.playerNumber;
                // Raum-Code persistieren — überlebt Seiten-Reload nach Ruhemodus
                try { localStorage.setItem('walq_online', JSON.stringify({ roomCode: msg.roomCode, playerName: onlineState.playerName, t: Date.now() })); } catch(e) {}
                document.getElementById("online-create-section").style.display = "none";
                document.getElementById("online-wait-section").style.display = "block";
                document.getElementById("online-display-code").textContent = msg.roomCode;
                break;
            case "gameStart":
                closeGameoverOverlay();
                onlineState.connected = true;
                onlineState.playerName = msg.playerName || onlineState.playerName;
                onlineState.opponentName = msg.opponentName || "Gegenspieler";
                onlineState.avatar = msg.avatar || onlineState.avatar;
                onlineState.opponentAvatar = msg.opponentAvatar || "🐋";
                onlineState.isMyTurn = (msg.activePlayer === msg.playerNumber);
                onlineState.playerNumber = msg.playerNumber;
                // Session für Ruhemodus-Reconnect persistieren
                try { localStorage.setItem('walq_online', JSON.stringify({ roomCode: onlineState.roomCode || msg.roomCode, playerName: onlineState.playerName, t: Date.now() })); } catch(e) {}
                console.log("Spiel startet!");
                console.log("Ich:", onlineState.playerName, "vs Gegner:", onlineState.opponentName);
                console.log("Ich bin Spieler", onlineState.playerNumber, "— am Zug:", onlineState.isMyTurn);
                var myCards = [], oppCards = [];
                if (msg.cards) {
                    // Server sendet Karten
                    if (msg.playerNumber === 1) {
                        myCards = msg.cards.player1Hand || [];
                        oppCards = msg.cards.player2Hand || [];
                    } else {
                        myCards = msg.cards.player2Hand || [];
                        oppCards = msg.cards.player1Hand || [];
                    }
                } else {
                    // Fallback: Lokale Kartengenerierung (beide Spieler brauchen denselben Seed!)
                    // Wir nutzen den Raum-Code als Seed für reproduzierbaren Shuffle
                    console.warn("Server sendet keine Karten, generiere lokal mit Seed");
                    var seed = msg.roomCode ? msg.roomCode.split("").reduce(function(a,b){return a+b.charCodeAt(0)},0) : 12345;
                    var localDeck = seededShuffle(whales.slice(), seed);
                    var mid = Math.floor(localDeck.length / 2);
                    if (msg.playerNumber === 1) {
                        myCards = localDeck.slice(0, mid);
                        oppCards = localDeck.slice(mid);
                    } else {
                        myCards = localDeck.slice(mid);
                        oppCards = localDeck.slice(0, mid);
                    }
                }
                startOnlineGame(myCards, oppCards);
                showChat();
                clearChat();
                break;
            case "categorySelected":
                if (msg.activePlayer !== onlineState.playerNumber) {
                    console.log("Gegner hat Kategorie gewaehlt:", msg.category);
                }
                break;
            case "roundResult":
                handleOnlineRoundResult(msg);
                // nextRound kommt automatisch vom Server (2s Verzögerung)
                break;
            case "newRound":
                onlineState.isMyTurn = (msg.activePlayer === onlineState.playerNumber);
                gameState.currentTurn = onlineState.isMyTurn ? "player" : "computer";
                gameState.selectedCategory = null;
                gameState.waitingForComputer = false;
                // hideResult entfernt - Bug #15: Overlay soll erst nach Klick schliessen
                
                // Karten aus Server-Nachricht übernehmen (echte Karten-Objekte)
                if (msg.cards) {
                    if (onlineState.playerNumber === 1) {
                        gameState.playerHand = msg.cards.player1Hand || [];
                        gameState.computerHand = msg.cards.player2Hand || [];
                    } else {
                        gameState.playerHand = msg.cards.player2Hand || [];
                        gameState.computerHand = msg.cards.player1Hand || [];
                    }
                }
                updateUI();
                updateTurnIndicator();
                renderSpielerCard(true, true);
                renderComputerCardBack(true);
                break;
            case "gameReconnected":
                // Spieler hat sich wieder verbunden - aktualisiere Spielstand
                onlineState.connected = true;
                onlineState.playerName = msg.playerName || onlineState.playerName;
                onlineState.opponentName = msg.opponentName || "Gegenspieler";
                onlineState.avatar = msg.avatar || onlineState.avatar;
                onlineState.opponentAvatar = msg.opponentAvatar || "🐋";
                onlineState.isMyTurn = (msg.activePlayer === msg.playerNumber);
                onlineState.playerNumber = msg.playerNumber;
                console.log("Wiederverbunden! Spielstand wiederhergestellt.");
                gameState.gameMode = "online";
                gameState.currentTurn = onlineState.isMyTurn ? "player" : "computer";
                gameState.selectedCategory = null;
                gameState.waitingForComputer = false;
                if (window._wsReconnectTimer) { clearInterval(window._wsReconnectTimer); window._wsReconnectTimer = null; }
                // hideResult entfernt - Bug #15: Overlay soll erst nach Klick schliessen
                if (msg.cards) {
                    if (onlineState.playerNumber === 1) {
                        gameState.playerHand = msg.cards.player1Hand || [];
                        gameState.computerHand = msg.cards.player2Hand || [];
                    } else {
                        gameState.playerHand = msg.cards.player2Hand || [];
                        gameState.computerHand = msg.cards.player1Hand || [];
                    }
                }
                updateUI();
                updateTurnIndicator();
                renderSpielerCard(true, true);
                renderComputerCardBack(true);
                showChat();
                hideResult();
                break;
                        case "chat":
                addChatMessage(msg.sender, msg.message, msg.timestamp, msg.avatar);
                break;
            case "opponentReconnected":
                alert(msg.message || "Dein Gegenspieler ist wieder da!");
                break;
            case "gameOver":
                var isWinner = (msg.winner === onlineState.playerNumber);
                showGameOver(isWinner);
                // Rematch-Button nur im Online-Modus zeigen
                var rbtn = document.getElementById('btn-rematch');
                if (rbtn) rbtn.style.display = 'inline-block';
                break;
            case "rematchRequest":
                // Gegner möchte sofort nochmal spielen
                if (confirm((msg.requesterName || "Dein Gegenspieler") + " möchte einen Rematch! Sofort nochmal spielen?")) {
                    ws.send(JSON.stringify({ type: "rematch" }));
                } else {
                    ws.send(JSON.stringify({ type: "rematchDecline" }));
                    showGameOverMessageOnly("Rematch abgelehnt – über \u201eNeues Spiel\u201c zurück zum Start.");
                }
                break;
            case "rematchWaiting":
                var rbtnW = document.getElementById('btn-rematch');
                if (rbtnW) rbtnW.style.display = 'none';
                showGameOverMessageOnly(msg.message || "Warte auf Gegner...");
                break;
            case "rematchCancelled":
                var rbtnC = document.getElementById('btn-rematch');
                if (rbtnC) rbtnC.style.display = 'inline-block';
                showGameOverMessageOnly(msg.message || "Rematch-Anfrage abgelaufen.");
                break;
            case "opponentDisconnected":
                if (msg.canReconnect) {
                    // Gegner im Ruhemodus — Spiel läuft weiter, Server hält Raum pausiert
                    alert("Dein Gegenspieler hat die Verbindung verloren. Warte auf Wiederverbindung...");
                } else {
                    alert("Dein Gegenspieler hat das Spiel verlassen.");
                    try { localStorage.removeItem('walq_online'); } catch(e) {}
                    showStart();
                }
                break;
            case "error":
                alert("Fehler: " + msg.message);
                break;
        }
    }
    function startOnlineGame(myCards, oppCards) {
        console.log("startOnlineGame aufgerufen");
        gameState.gameMode = "online";
        gameState.playerNames = [onlineState.playerName, onlineState.opponentName];
        gameState.playerAvatars = [onlineState.avatar, onlineState.opponentAvatar];
        gameState.playerHand = Array.isArray(myCards) ? myCards.slice() : [];
        gameState.computerHand = Array.isArray(oppCards) ? oppCards.slice() : [];
        gameState.jackpot = [];
        gameState.currentTurn = onlineState.isMyTurn ? "player" : "computer";
        gameState.selectedCategory = null;
        gameState.gameOver = false;
        gameState.waitingForComputer = false;
        showScreen("game-screen");
        updateUI();
        renderSpielerCard(true, true);
        renderComputerCardBack(true);
        updateTurnIndicator();
        console.log("Spiel gestartet!");
    }
    function handleOnlineRoundResult(result) {
        var isWinner = (result.winner === onlineState.playerNumber);
        var isDraw = (result.winner === 0);
        var catName = result.category || '?';
        var catLabel = {
            'length': '📏 Länge',
            'weight': '⚖️ Gewicht',
            'speed': '💨 Geschwindigkeit',
            'dive': '🤿 Tauchgang',
            'depth': '🤿 Tauchgang',
            'lifespan': '⏳ Lebenserwartung'
        }[catName] || catName;
        
        var isPlayer1 = (onlineState.playerNumber === 1);
        var myCard = isPlayer1 ? result.player1Card : result.player2Card;
        var oppCard = isPlayer1 ? result.player2Card : result.player1Card;
        var myVal = myCard && myCard[catName] || '?';
        var oppVal = oppCard && oppCard[catName] || '?';
        var myName = myCard ? myCard.name : '?';
        var oppName = oppCard ? oppCard.name : '?';
        
        if (isDraw) {
            showResult("🤝", "Unentschieden!", catLabel + ": " + myName + " (" + myVal + ") vs " + oppName + " (" + oppVal + ")\n\nDie Karten gehen in den Jackpot.");
        } else if (isWinner) {
            showResult("🏆", "Runde gewonnen!", catLabel + ": " + myName + " (" + myVal + ") vs " + oppName + " (" + oppVal + ")\n\nDu bekommst die Karten!");
        } else {
            showResult("😢", "Runde verloren...", catLabel + ": " + myName + " (" + myVal + ") vs " + oppName + " (" + oppVal + ")\n\n" + onlineState.opponentName + " bekommt die Karten.");
        }
    }
    // Online-Version der Kategorienwahl — wird vom Dispatcher in game.js
    // aufgerufen (kein globales Ueberschreiben von playerSelectCategory mehr).
    function onlinePlayerSelectCategory(category) {
        if (gameState.currentTurn !== "player" || gameState.waitingForComputer || gameState.gameOver) return;
        if (gameState.playerHand.length === 0 || gameState.computerHand.length === 0) return;
        gameState.selectedCategory = category;
        gameState.waitingForComputer = true;
        soundSelect();
        document.querySelectorAll(".stat-row").forEach(function(r) {
            r.classList.remove("selected");
        });
        var selected = document.querySelector('[data-cat="' + category + '"]');
        if (selected) selected.classList.add("selected");
        document.querySelectorAll(".stat-row").forEach(function(r) {
            r.classList.add("disabled");
        });
        updateTurnIndicator();
        // Sende Kategorie an Server
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "selectCategory", category: category }));
        }
        // nextRound: Server steuert die Runden (2s Verzoegerung)
    };
    console.log("Online 1vs1 Modul geladen!");


// === CHAT ===
// Chat beim neuen Spiel leeren
function clearChat() {
    var container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '';
}

function selectAvatar(emoji) {
    onlineState.avatar = emoji;
    document.querySelectorAll('.avatar-btn').forEach(function(btn) {
        if (btn.getAttribute('data-avatar') === emoji) {
            btn.style.border = '3px solid #4dabf7';
            btn.style.background = 'rgba(77,171,247,0.2)';
            btn.classList.add('selected');
        } else {
            btn.style.border = '2px solid rgba(255,255,255,0.3)';
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.classList.remove('selected');
        }
    });
}

function toggleChat() {
    var panel = document.getElementById('chat-panel');
    var wrapper = document.getElementById('chat-float-wrapper');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        wrapper.style.display = 'none';
        hideChatBadge();
    } else {
        panel.style.display = 'none';
        wrapper.style.display = 'flex';
    }
}

function sendChatMessage() {
    var input = document.getElementById('chat-input');
    var msg = input.value.trim();
    if (!msg) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'chat', message: msg }));
        input.value = '';
    }
}

function addChatMessage(sender, message, timestamp) {
    var container = document.getElementById('chat-messages');
    var isMe = sender === onlineState.playerName;
    var time = timestamp ? new Date(timestamp).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) : '';
    var html = '<div class="chat-message">' +
        '<span class="sender ' + (isMe ? 'me' : '') + '">' + escapeHtml(sender) + '</span>' +
        (time ? '<span class="time">' + time + '</span>' : '') +
        ': ' + escapeHtml(message) +
        '</div>';
    container.innerHTML += html;
    container.scrollTop = container.scrollHeight;
    // Badge anzeigen wenn Chat geschlossen und Nachricht nicht von mir
    if (!isMe) showChatBadge();
}

function showChatBadge() {
    var panel = document.getElementById('chat-panel');
    if (panel.style.display === 'none') {
        document.getElementById('chat-badge').style.display = 'block';
    }
}

function hideChatBadge() {
    document.getElementById('chat-badge').style.display = 'none';
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showChat() {
    var panel = document.getElementById('chat-panel');
    var wrapper = document.getElementById('chat-float-wrapper');
    if (gameState.gameMode === 'online') {
        panel.style.display = 'flex';
        wrapper.style.display = 'none';
        hideChatBadge();
    } else {
        panel.style.display = 'none';
        wrapper.style.display = 'none';
    }
}

