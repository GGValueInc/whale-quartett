/**
 * game.js – Whale Quartett Game Logic
 * Phase 2: Correct alternation + computer turn flow
 */

// === GAME STATE ===
let gameState = {
    playerHand: [],
    computerHand: [],
    jackpot: [],
    currentTurn: 'player',
    difficulty: 'easy',
    soundEnabled: true,
    selectedCategory: null,
    waitingForComputer: false,
    gameOver: false,
    gameMode: '1p',        // '1p' oder '2p'
    playerNames: ['Du', 'Computer']  // [Spieler 1, Spieler 2]
};

// === SCREEN MANAGEMENT ===
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showStart() {
    showScreen('start-screen');
    hideOverlays();
}

function showDifficulty() {
    showScreen('difficulty-screen');
    // Default: medium
    selectDifficulty('medium');
}

function showRules() {
    document.getElementById('rules-overlay').classList.add('active');
}

function closeRules() {
    document.getElementById('rules-overlay').classList.remove('active');
}

function goToGallery() {
    document.getElementById('gallery-overlay').classList.add('active');
    renderGallery();
}

function closeGallery() {
    document.getElementById('gallery-overlay').classList.remove('active');
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    
    grid.innerHTML = whales.map(card => `
        <div class="gallery-card" style="background: linear-gradient(145deg, #1e3c72, #2a5298); border-radius: 15px; padding: 15px; text-align: center; border: 2px solid rgba(255,255,255,0.2); transition: transform 0.3s;">
            <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 8px;">${card.emoji} ${card.name}</div>
            <div style="font-size: 0.7em; opacity: 0.7; margin-bottom: 10px;">${card.scientific}</div>
            <img src="./whale_images/${card.id}.jpg" alt="${card.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; background: #0d2137;">
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.85em;">
                <div style="display: flex; justify-content: space-between;">
                    <span>⚖️</span>
                    <span>${card.weight} t</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>📏</span>
                    <span>${card.length} m</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>⏳</span>
                    <span>${card.lifespan} J</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>🤿</span>
                    <span>${card.dive} min</span>
                </div>
            </div>
            <div style="margin-top: 8px; font-size: 0.75em; opacity: 0.7; line-height: 1.3;">${card.fact}</div>
        </div>
    `).join('');
}

// === DIFFICULTY SELECT ===
function selectDifficulty(diff) {
    gameState.difficulty = diff;
    document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('selected'));
    const el = document.querySelector(`[data-diff="${diff}"]`);
    if (el) el.classList.add('selected');
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) startBtn.disabled = false;
}

// Default: select medium if nothing chosen
function ensureDifficultySelected() {
    if (!document.querySelector('.diff-card.selected')) {
        selectDifficulty('medium');
    }
}

// === GAME INIT ===
function startGame() {
    gameState.gameMode = '1p';
    gameState.playerNames = ['Du', 'Computer'];
    const hands = dealCards(2);
    gameState.playerHand = hands[0];
    gameState.computerHand = hands[1];
    gameState.jackpot = [];
    gameState.selectedCategory = null;
    gameState.waitingForComputer = false;
    gameState.gameOver = false;
    
    // Random starting player
    gameState.currentTurn = Math.random() < 0.5 ? 'player' : 'computer';
    
    showScreen('game-screen');
    updateUI();
    
    // Update names
    document.getElementById('player-zone-name').textContent = '👤 ' + gameState.playerNames[0];
    document.getElementById('computer-zone-name').textContent = '🤖 ' + gameState.playerNames[1];
    
    // Start ambient sound
    startAmbient();
    
    // Zeige Karten mit Deal-Animation
    if (gameState.currentTurn === 'computer') {
        renderSpielerCard(true, true);
        renderComputerCardBack(true);
        updateTurnIndicator();
        setTimeout(() => computerPlaysTurn(), 1200);
    } else {
        renderSpielerCard(true, true);
        renderComputerCardBack(true);
        updateTurnIndicator();
    }
}

// === UI UPDATES ===
function updateUI() {
    document.getElementById('player-count').textContent = `${gameState.playerHand.length} Karten`;
    document.getElementById('computer-count').textContent = `${gameState.computerHand.length} Karten`;
    
    const p1Name = gameState.playerNames[0];
    const p2Name = gameState.playerNames[1];
    document.getElementById('score-display').textContent = `${p1Name}: ${gameState.playerHand.length} · ${p2Name}: ${gameState.computerHand.length}`;
    
    // Zonennamen aktualisieren (wichtig für 2P-Modus)
    document.getElementById('player-zone-name').textContent = '👤 ' + p1Name;
    const p2Icon = (gameState.gameMode === '2p' || gameState.gameMode === 'online') ? '👤' : '🤖';
    document.getElementById('computer-zone-name').textContent = p2Icon + ' ' + p2Name;
    
    const jackpotCount = gameState.jackpot.length;
    document.getElementById('jackpot-count').textContent = `${jackpotCount} Karten`;
    const jackpotArea = document.getElementById('jackpot-area');
    jackpotArea.classList.toggle('jackpot-pulse', jackpotCount > 0);
}

function updateTurnIndicator() {
    const el = document.getElementById('turn-indicator');
    const activeName = gameState.currentTurn === 'player' ? gameState.playerNames[0] : gameState.playerNames[1];
    const otherName = gameState.currentTurn === 'player' ? gameState.playerNames[1] : gameState.playerNames[0];
    
    if (gameState.gameMode === '2p') {
        if (gameState.waitingForComputer) {
            el.innerHTML = `🤫 ${otherName}s Karte wird gezeigt...<br><small>Bitte nicht schauen!</small>`;
        } else {
            el.innerHTML = `🎯 ${activeName} ist dran!<br><small>Wähle eine Kategorie</small>`;
        }
    } else if (gameState.gameMode === 'online') {
        // Online-Modus: echte Namen wie im 2P-Modus
        if (gameState.waitingForComputer) {
            el.innerHTML = `⏳ ${otherName} ist dran...<br><small>Bitte warten</small>`;
        } else {
            el.innerHTML = `🎯 ${activeName} ist dran!<br><small>Wähle eine Kategorie</small>`;
        }
    } else {
        if (gameState.currentTurn === 'player') {
            el.innerHTML = '🎯 Du bist dran!<br><small>Wähle eine Kategorie</small>';
        } else {
            const opponentName = gameState.playerNames[1] || 'Computer';
            el.innerHTML = `⏳ ${opponentName} ist dran...<br><small>Bitte warten</small>`;
        }
    }
}

// === CARD RENDERING ===
function renderSpielerCard(active = true, animate = false) {
    const container = document.getElementById('player-card-container');
    if (gameState.playerHand.length === 0) {
        container.innerHTML = '<div style="opacity:0.5">Keine Karten</div>';
        return;
    }
    
    const card = gameState.playerHand[0];
    const isActive = active && gameState.currentTurn === 'player' && !gameState.waitingForComputer;
    const animClass = animate ? 'card-deal-player' : '';
    
    container.innerHTML = `
        <div class="game-card ${animClass}">
            <div class="card-header">
                <h3>${card.emoji} ${card.name}</h3>
                <div class="scientific">${card.scientific}</div>
            </div>
            <div class="card-image">
                <img src="./whale_images/${card.id}.jpg" alt="${card.name}" onerror="this.style.display='none';this.parentElement.textContent='${card.emoji}'">
            </div>
            <div class="card-stats">
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="weight" onclick="playerSelectCategory('weight')">
                    <span class="stat-label">⚖️ ${categories.weight.label}</span>
                    <span class="stat-value">${card.weight} t</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="length" onclick="playerSelectCategory('length')">
                    <span class="stat-label">📏 ${categories.length.label}</span>
                    <span class="stat-value">${card.length} m</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="lifespan" onclick="playerSelectCategory('lifespan')">
                    <span class="stat-label">⏳ ${categories.lifespan.label}</span>
                    <span class="stat-value">${card.lifespan} J</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="dive" onclick="playerSelectCategory('dive')">
                    <span class="stat-label">🤿 ${categories.dive.label}</span>
                    <span class="stat-value">${card.dive} min</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="speed" onclick="playerSelectCategory('speed')">
                    <span class="stat-label">💨 ${categories.speed.label}</span>
                    <span class="stat-value">${card.speed} km/h</span>
                </div>
            </div>
            <div class="card-footer">${card.fact}</div>
        </div>
    `;
}

function renderComputerCardBack(animate = false) {
    const container = document.getElementById('computer-card-container');
    if (gameState.computerHand.length === 0) {
        container.innerHTML = '<div style="opacity:0.5">Keine Karten</div>';
        return;
    }
    const animClass = animate ? 'card-deal-computer' : '';
    container.innerHTML = `
        <div class="card-back ${animClass}">
            <div class="card-back-emoji">🐋</div>
            <div class="card-back-text">Wal-Quartett</div>
            <div style="font-size: 0.8em; opacity: 0.6; margin-top: 10px;">${gameState.computerHand.length} Karten</div>
        </div>
    `;
}

function renderComputerCardRevealed(highlightCat = null) {
    const container = document.getElementById('computer-card-container');
    if (gameState.computerHand.length === 0) return;
    
    const card = gameState.computerHand[0];
    
    container.innerHTML = `
        <div class="game-card slide-in">
            <div class="card-header">
                <h3>${card.emoji} ${card.name}</h3>
                <div class="scientific">${card.scientific}</div>
            </div>
            <div class="card-image">
                <img src="./whale_images/${card.id}.jpg" alt="${card.name}" onerror="this.style.display='none';this.parentElement.textContent='${card.emoji}'">
            </div>
            <div class="card-stats">
                <div class="stat-row ${highlightCat === 'weight' ? 'selected' : ''}">
                    <span class="stat-label">⚖️ ${categories.weight.label}</span>
                    <span class="stat-value">${card.weight} t</span>
                </div>
                <div class="stat-row ${highlightCat === 'length' ? 'selected' : ''}">
                    <span class="stat-label">📏 ${categories.length.label}</span>
                    <span class="stat-value">${card.length} m</span>
                </div>
                <div class="stat-row ${highlightCat === 'lifespan' ? 'selected' : ''}">
                    <span class="stat-label">⏳ ${categories.lifespan.label}</span>
                    <span class="stat-value">${card.lifespan} J</span>
                </div>
                <div class="stat-row ${highlightCat === 'dive' ? 'selected' : ''}">
                    <span class="stat-label">🤿 ${categories.dive.label}</span>
                    <span class="stat-value">${card.dive} min</span>
                </div>
                <div class="stat-row ${highlightCat === 'speed' ? 'selected' : ''}">
                    <span class="stat-label">💨 ${categories.speed.label}</span>
                    <span class="stat-value">${card.speed} km/h</span>
                </div>
            </div>
            <div class="card-footer">${card.fact}</div>
        </div>
    `;
}

// === PLAYER TURN ===
function playerSelectCategory(category) {
    if (gameState.currentTurn !== 'player' || gameState.waitingForComputer || gameState.gameOver) return;
    if (gameState.playerHand.length === 0 || gameState.computerHand.length === 0) return;
    
    gameState.selectedCategory = category;
    gameState.waitingForComputer = true;
    
    // Sound: category ausgewählt
    soundSelect();
    
    // Visuelle Markierung — nur im eigenen Container
    const playerContainer = document.getElementById('player-card-container');
    if (playerContainer) {
        playerContainer.querySelectorAll('.stat-row').forEach(r => r.classList.remove('selected'));
    }
    const selected = document.querySelector(`#player-card-container [data-cat="${category}"]`);
    if (selected) selected.classList.add('selected');
    
    // Deaktiviere weitere Klicks — nur im eigenen Container
    if (playerContainer) {
        playerContainer.querySelectorAll('.stat-row').forEach(r => r.classList.add('disabled'));
    }
    
    updateTurnIndicator();
    
    // Computer/Spieler 2 card aufdecken
    setTimeout(() => {
        soundFlip();
        if (gameState.gameMode === '2p') {
            renderSpielerCardRevealed(category);
        } else {
            renderComputerCardRevealed(category);
        }
        setTimeout(() => {
            if (gameState.gameMode === '2p') {
                resolveRound2P(category);
            } else {
                resolveRound(category);
            }
        }, 1500);
    }, 600);
}

// === COMPUTER TURN ===
function computerPlaysTurn() {
    if (gameState.gameOver) return;
    
    gameState.waitingForComputer = true;
    updateTurnIndicator();
    
    // Computer chooses category
    setTimeout(() => {
        const category = computerChooseCategory();
        gameState.selectedCategory = category;
        
        // Computer card zeigt chosen category (noch verdeckt / halb aufgedeckt)
        renderComputerCardRevealed(category);
        
        updateTurnIndicator();
        
        // Spieler-Karte zeigt die category hervorgehoben
        setTimeout(() => {
            renderSpielerCard(false); // Spieler ist nicht aktiv, nur Anzeige
            // Markiere die vom Computer chosen category beim Spieler
            const playerRows = document.querySelectorAll('#player-card-container .stat-row');
            playerRows.forEach(row => {
                if (row.dataset.cat === category) {
                    row.classList.add('selected');
                }
                row.classList.add('disabled');
            });
            
            setTimeout(() => {
                resolveRound(category);
            }, 1500);
        }, 1000);
    }, 800);
}

// === AI: CATEGORY CHOICE (Phase 3 – Unterschiedliche Schwierigkeiten) ===
function computerChooseCategory() {
    const card = gameState.computerHand[0];
    const cats = ['weight', 'length', 'lifespan', 'dive', 'speed'];
    
    switch (gameState.difficulty) {
        case 'easy':
            // Einfach: 70% Zufall, 30% bester Wert (damit nicht komplett dumm)
            if (Math.random() < 0.7) {
                return cats[Math.floor(Math.random() * cats.length)];
            }
            // Sonst beste category
            return findBestCategory(card);
            
        case 'medium': {
            // Medium: 60% best category, 40% random
            if (Math.random() < 0.6) {
                return findBestCategory(card);
            }
            return cats[Math.floor(Math.random() * cats.length)];
        }
            
        case 'hard':
            // Schwer: Immer beste category + Analyse der verbleibenden cards
            return findBestCategory(card);
            
        default:
            return cats[Math.floor(Math.random() * cats.length)];
    }
}

function findBestCategory(card) {
    const cats = ['weight', 'length', 'lifespan', 'dive', 'speed'];
    if (!card || !Array.isArray(whales) || whales.length === 0) return cats[0];

    const maxValues = {
        weight: Math.max(...whales.map(w => w.weight || 0)),
        length: Math.max(...whales.map(w => w.length || 0)),
        lifespan: Math.max(...whales.map(w => w.lifespan || 0)),
        dive: Math.max(...whales.map(w => w.dive || 0)),
        speed: Math.max(...whales.map(w => w.speed || 0))
    };

    let bestCat = cats[0];
    let bestRatio = 0;
    for (const cat of cats) {
        const cardValue = card[cat] || 0;
        const maxValue = maxValues[cat] || 1;
        const ratio = cardValue / maxValue;
        if (ratio > bestRatio) {
            bestRatio = ratio;
            bestCat = cat;
        }
    }
    return bestCat;
}

// === ROUND RESOLUTION (Phase 4 – mit Animationen) ===
function resolveRound(category) {
    const playerCard = gameState.playerHand[0];
    const computerCard = gameState.computerHand[0];
    const playerValue = playerCard[category];
    const computerValue = computerCard[category];
    
    // category-Label
    const catLabels = {
        weight: `⚖️ ${categories.weight.label}`,
        length: `📏 ${categories.length.label}`,
        lifespan: `⏳ ${categories.lifespan.label}`,
        dive: `🤿 ${categories.dive.label}`,
        speed: `💨 ${categories.speed.label}`
    };
    const catLabel = catLabels[category] || category;
    const catUnit = category === 'weight' ? 't' : category === 'length' ? 'm' : category === 'lifespan' ? 'J' : category === 'dive' ? 'min' : 'km/h';
    
    let winner;
    let resultEmoji, resultTitle, resultText;
    
    // Animation auf cards anwenden
    const playerCardEl = document.querySelector('#player-card-container .game-card');
    const computerCardEl = document.querySelector('#computer-card-container .game-card, #computer-card-container .card-back');
    
    // Wer hat die Round gewonnen?
    if (playerValue > computerValue) {
        winner = 'player';
        resultEmoji = '🏆';
        resultTitle = 'Runde gewonnen!';
        resultText = `${catLabel}: Dein ${playerCard.name} (${playerValue} ${catUnit}) schlägt ${computerCard.name} (${computerValue} ${catUnit}).`;
        // Win-Animation auf Spieler-Karte
        if (playerCardEl) playerCardEl.classList.add('win-animation');
        if (computerCardEl) computerCardEl.classList.add('lose-animation');
        // Sound
        soundWin();
    } else if (computerValue > playerValue) {
        winner = 'computer';
        resultEmoji = '🤖';
        resultTitle = 'Computer gewinnt!';
        resultText = `${catLabel}: ${computerCard.name} (${computerValue} ${catUnit}) schlägt deinen ${playerCard.name} (${playerValue} ${catUnit}).`;
        // Win-Animation auf Computer card
        if (computerCardEl) computerCardEl.classList.add('win-animation');
        if (playerCardEl) playerCardEl.classList.add('lose-animation');
        // Sound
        soundLose();
    } else {
        winner = 'draw';
        resultEmoji = '🤝';
        resultTitle = 'Gleichstand!';
        resultText = `${catLabel}: Beide haben ${playerValue} ${catUnit}. Die Karten gehen in den Jackpot.`;
        // Draw-Animation auf beide cards
        if (playerCardEl) playerCardEl.classList.add('draw-animation');
        if (computerCardEl) computerCardEl.classList.add('draw-animation');
        // Sound
        soundDraw();
    }
    
    // Jackpot-Pulsieren
    if (winner === 'draw') {
        document.getElementById('jackpot-area').classList.add('jackpot-pulse');
        soundJackpot();
    }
    
    // cards aus den Händen entfernen
    const playerTop = gameState.playerHand.shift();
    const computerTop = gameState.computerHand.shift();
    
    if (winner === 'player') {
        // Spieler bekommt beide cards + Jackpot
        gameState.playerHand.push(playerTop, computerTop, ...gameState.jackpot);
        gameState.jackpot = [];
        // Spieler hat gewonnen -> Spieler ist wieder dran
        gameState.currentTurn = 'player';
    } else if (winner === 'computer') {
        // Computer bekommt beide cards + Jackpot
        gameState.computerHand.push(computerTop, playerTop, ...gameState.jackpot);
        gameState.jackpot = [];
        // Computer hat gewonnen -> Computer's turn again
        gameState.currentTurn = 'computer';
    } else {
        // Gleichstand -> Jackpot
        gameState.jackpot.push(playerTop, computerTop);
        // Wer die category gewählt hat, bleibt dran
    }
    
    updateUI();
    
    // Check game end
    if (gameState.playerHand.length === 0 || gameState.computerHand.length === 0) {
        gameState.gameOver = true;
        setTimeout(() => showGameOver(), 1000);
        return;
    }
    
    // Ergebnis nach kurzer Verzögerung anzeigen (damit Animationen laufen)
    setTimeout(() => {
        showResult(resultEmoji, resultTitle, resultText);
    }, winner === 'draw' ? 600 : 800);
}

// === RESULT / GAME OVER DISPLAY ===
function showResult(emoji, title, text) {
    if (window._resultTimeout) clearTimeout(window._resultTimeout);
    window._resultTimeout = setTimeout(function() { hideResult(); }, 2000);
    document.getElementById('result-emoji').textContent = emoji;
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-text').textContent = text;
    document.getElementById('result-overlay').classList.add('active');
}

function hideResult() {
    document.getElementById('result-overlay').classList.remove('active');
}

function showGameOver(playerWon) {
    // Online-Modus: playerWon wird vom Server übergeben
    if (gameState.gameMode === 'online') {
        const emoji = playerWon ? '🎉' : '😢';
        const title = playerWon ? 'Du hast gewonnen!' : 'Gegenspieler gewinnt!';
        const text = playerWon
            ? 'Glückwunsch! Du hast das Spiel gewonnen!'
            : onlineState.opponentName + ' hat das Spiel gewonnen. Nochmal versuchen?';
        
        document.getElementById('gameover-emoji').textContent = emoji;
        document.getElementById('gameover-title').textContent = title;
        document.getElementById('gameover-text').textContent = text;
        document.getElementById('gameover-overlay').classList.add('active');
        
        if (playerWon) {
            soundVictory();
            spawnConfetti();
        } else {
            soundDefeat();
        }
        return;
    }
    
    // Lokale Modi (1P, 2P)
    const won = typeof playerWon === 'boolean' ? playerWon : (gameState.playerHand.length > gameState.computerHand.length);
    const emoji = won ? '🎉' : '😢';
    const title = won ? 'Du hast gewonnen!' : (gameState.gameMode === '2p' ? gameState.playerNames[1] + ' gewinnt!' : 'Computer gewinnt!');
    const text = won
        ? `Glückwunsch! Du hast alle ${gameState.playerHand.length} cards gesammelt.`
        : (gameState.gameMode === '2p' ? gameState.playerNames[1] : 'Der Computer') + ` hat alle ${gameState.computerHand.length} cards gesammelt. Nochmal versuchen?`;
    
    document.getElementById('gameover-emoji').textContent = emoji;
    document.getElementById('gameover-title').textContent = title;
    document.getElementById('gameover-text').textContent = text;
    document.getElementById('gameover-overlay').classList.add('active');
    
    if (won) {
        soundVictory();
        spawnConfetti();
    } else {
        soundDefeat();
    }
}

function nextRound() {
    hideResult();
    gameState.waitingForComputer = false;
    gameState.selectedCategory = null;
    
    // Im Online-Modus: Server steuert alles, nur Overlay schliessen
    if (gameState.gameMode === 'online') {
        return;
    }
    
    // Animation-Klassen entfernen
    document.querySelectorAll('.game-card, .card-back').forEach(el => {
        el.classList.remove('win-animation', 'lose-animation', 'draw-animation', 'card-deal-player', 'card-deal-computer');
    });
    
    updateUI();
    
    if (gameState.gameMode === '2p') {
        // 2-Spieler: Verdecke die Karte des nicht aktiven Spielers
        hideInactiveSpielerCard();
        revealActiveSpielerCard();
        updateTurnIndicator();
        return;
    }
    
    if (gameState.currentTurn === 'computer' && !gameState.gameOver) {
        // Computer ist dran -> Computer spielt
        renderSpielerCard();
        renderComputerCardBack();
        updateTurnIndicator();
        setTimeout(() => computerPlaysTurn(), 400);
    } else if (gameState.currentTurn === 'player' && !gameState.gameOver) {
        // Spieler ist dran
        renderSpielerCard();
        renderComputerCardBack();
        updateTurnIndicator();
    }
}

function hideOverlays() {
    document.getElementById('result-overlay').classList.remove('active');
    document.getElementById('gameover-overlay').classList.remove('active');
    document.getElementById('rules-overlay').classList.remove('active');
}

// === QUIT ===
function quitGame() {
    if (confirm('Spiel beenden und zum Menü zurückkehren?')) {
        stopAmbient();
        showStart();
    }
}

// === KEYBOARD SHORTCUTS ===
document.addEventListener('keydown', (e) => {
    const resultOverlay = document.getElementById('result-overlay');
    const rulesOverlay = document.getElementById('rules-overlay');
    const gameScreen = document.getElementById('game-screen');

    if (e.key === 'Escape') {
        if (resultOverlay && resultOverlay.classList.contains('active')) {
            nextRound();
        } else if (rulesOverlay && rulesOverlay.classList.contains('active')) {
            closeRules();
        } else if (gameScreen && gameScreen.classList.contains('active')) {
            quitGame();
        }
    }

    if ((e.key === 'Enter' || e.code === 'Space' || e.key === ' ') && resultOverlay && resultOverlay.classList.contains('active')) {
        e.preventDefault();
        nextRound();
    }
});

// === CONFETTI ===
function spawnConfetti() {
    for (let i = 1; i <= 8; i++) {
        const piece = document.createElement('div');
        piece.className = `confetti-piece confetti-${i}`;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 3000);
    }
}

// === 2 SPIELER MODUS ===
function showPlayer2Setup() {
    showScreen('player2-screen');
}

function startGame2P() {
    gameState.gameMode = '2p';
    gameState.playerNames = [
        document.getElementById('p2-name-1').value || 'Spieler 1',
        document.getElementById('p2-name-2').value || 'Spieler 2'
    ];
    
    const hands = dealCards(2);
    gameState.playerHand = hands[0];
    gameState.computerHand = hands[1];  // Spieler 2
    gameState.jackpot = [];
    gameState.selectedCategory = null;
    gameState.waitingForComputer = false;
    gameState.gameOver = false;
    gameState.currentTurn = 'player';  // Spieler 1 beginnt
    
    showScreen('game-screen');
    updateUI();
    
    // Update names
    document.getElementById('player-zone-name').textContent = '👤 ' + gameState.playerNames[0];
    document.getElementById('computer-zone-name').textContent = '👤 ' + gameState.playerNames[1];
    
    // Start ambient sound
    startAmbient();
    
    renderSpielerCard(true, true);
    renderComputerCardBack(true);
    updateTurnIndicator();
    
    // In 2P-Modus: Verdecke die Karte des nicht aktiven Spielers
    hideInactiveSpielerCard();
}

// Verdecke die Karte des Spielers, der nicht dran ist
function hideInactiveSpielerCard() {
    if (gameState.gameMode !== '2p') return;
    
    if (gameState.currentTurn === 'player') {
        // Spieler 2 verdecken
        const compContainer = document.getElementById('computer-card-container');
        compContainer.innerHTML = `
            <div class="card-back">
                <div class="card-back-emoji">🐋</div>
                <div class="card-back-text">${gameState.playerNames[1]}</div>
                <div style="font-size: 0.8em; opacity: 0.6; margin-top: 10px;">${gameState.computerHand.length} Karten</div>
            </div>
        `;
    } else {
        // Spieler 1 verdecken
        const playerContainer = document.getElementById('player-card-container');
        playerContainer.innerHTML = `
            <div class="card-back">
                <div class="card-back-emoji">🐋</div>
                <div class="card-back-text">${gameState.playerNames[0]}</div>
                <div style="font-size: 0.8em; opacity: 0.6; margin-top: 10px;">${gameState.playerHand.length} Karten</div>
            </div>
        `;
    }
}

// 2-Spieler: Zeige die Karte des aktiven Spielers
function revealActiveSpielerCard() {
    if (gameState.gameMode !== '2p') return;
    
    if (gameState.currentTurn === 'player') {
        renderSpielerCard(true, true);
    } else {
        // Spieler 2 Karte anzeigen (im Computer-Container)
        renderSpieler2Card(true, true);
    }
}

// Rendert Spieler 2 Karte (im rechten Container)
function renderSpieler2Card(active = true, animate = false) {
    const container = document.getElementById('computer-card-container');
    if (gameState.computerHand.length === 0) {
        container.innerHTML = '<div style="opacity:0.5">Keine Karten</div>';
        return;
    }
    
    const card = gameState.computerHand[0];
    const isActive = active && gameState.currentTurn === 'computer' && !gameState.waitingForComputer;
    const animClass = animate ? 'card-deal-computer' : '';
    
    container.innerHTML = `
        <div class="game-card ${animClass}">
            <div class="card-header">
                <h3>${card.emoji} ${card.name}</h3>
                <div class="scientific">${card.scientific}</div>
            </div>
            <div class="card-image">
                <img src="./whale_images/${card.id}.jpg" alt="${card.name}" onerror="this.style.display='none';this.parentElement.textContent='${card.emoji}'">
            </div>
            <div class="card-stats">
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="weight" onclick="player2SelectCategory('weight')">
                    <span class="stat-label">⚖️ ${categories.weight.label}</span>
                    <span class="stat-value">${card.weight} t</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="length" onclick="player2SelectCategory('length')">
                    <span class="stat-label">📏 ${categories.length.label}</span>
                    <span class="stat-value">${card.length} m</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="lifespan" onclick="player2SelectCategory('lifespan')">
                    <span class="stat-label">⏳ ${categories.lifespan.label}</span>
                    <span class="stat-value">${card.lifespan} J</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="dive" onclick="player2SelectCategory('dive')">
                    <span class="stat-label">🤿 ${categories.dive.label}</span>
                    <span class="stat-value">${card.dive} min</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="speed" onclick="player2SelectCategory('speed')">
                    <span class="stat-label">💨 ${categories.speed.label}</span>
                    <span class="stat-value">${card.speed} km/h</span>
                </div>
            </div>
            <div class="card-footer">${card.fact}</div>
        </div>
    `;
}

// Spieler 2 wählt category
function player2SelectCategory(category) {
    if (gameState.gameMode !== '2p') return;
    if (gameState.currentTurn !== 'computer' || gameState.waitingForComputer || gameState.gameOver) return;
    if (gameState.computerHand.length === 0 || gameState.playerHand.length === 0) return;
    
    gameState.selectedCategory = category;
    gameState.waitingForComputer = true;
    
    soundSelect();
    
    document.querySelectorAll('#computer-card-container .stat-row').forEach(r => r.classList.remove('selected'));
    const selected = document.querySelector(`#computer-card-container [data-cat="${category}"]`);
    if (selected) selected.classList.add('selected');
    
    document.querySelectorAll('#computer-card-container .stat-row').forEach(r => r.classList.add('disabled'));
    
    updateTurnIndicator();
    
    // Spieler 1 Karte aufdecken
    setTimeout(() => {
        soundFlip();
        renderSpielerCardRevealed(category);
        setTimeout(() => {
            resolveRound2P(category);
        }, 1500);
    }, 600);
}

// Spieler 1 Karte aufgedeckt anzeigen (im linken Container)
function renderSpielerCardRevealed(highlightCat = null) {
    const container = document.getElementById('player-card-container');
    if (gameState.playerHand.length === 0) return;
    
    const card = gameState.playerHand[0];
    
    container.innerHTML = `
        <div class="game-card slide-in">
            <div class="card-header">
                <h3>${card.emoji} ${card.name}</h3>
                <div class="scientific">${card.scientific}</div>
            </div>
            <div class="card-image">
                <img src="./whale_images/${card.id}.jpg" alt="${card.name}" onerror="this.style.display='none';this.parentElement.textContent='${card.emoji}'">
            </div>
            <div class="card-stats">
                <div class="stat-row ${highlightCat === 'weight' ? 'selected' : ''}">
                    <span class="stat-label">⚖️ ${categories.weight.label}</span>
                    <span class="stat-value">${card.weight} t</span>
                </div>
                <div class="stat-row ${highlightCat === 'length' ? 'selected' : ''}">
                    <span class="stat-label">📏 ${categories.length.label}</span>
                    <span class="stat-value">${card.length} m</span>
                </div>
                <div class="stat-row ${highlightCat === 'lifespan' ? 'selected' : ''}">
                    <span class="stat-label">⏳ ${categories.lifespan.label}</span>
                    <span class="stat-value">${card.lifespan} J</span>
                </div>
                <div class="stat-row ${highlightCat === 'dive' ? 'selected' : ''}">
                    <span class="stat-label">🤿 ${categories.dive.label}</span>
                    <span class="stat-value">${card.dive} min</span>
                </div>
                <div class="stat-row ${highlightCat === 'speed' ? 'selected' : ''}">
                    <span class="stat-label">💨 ${categories.speed.label}</span>
                    <span class="stat-value">${card.speed} km/h</span>
                </div>
            </div>
            <div class="card-footer">${card.fact}</div>
        </div>
    `;
}

// 2-Spieler Rundenauflösung
function resolveRound2P(category) {
    const p1Card = gameState.playerHand[0];
    const p2Card = gameState.computerHand[0];
    const p1Value = p1Card[category];
    const p2Value = p2Card[category];
    
    const catLabels = { weight: `⚖️ ${categories.weight.label}`, length: `📏 ${categories.length.label}`, lifespan: `⏳ ${categories.lifespan.label}`, dive: `🤿 ${categories.dive.label}`, speed: `💨 ${categories.speed.label}` };
    const catLabel = catLabels[category];
    const catUnit = category === 'weight' ? 't' : category === 'length' ? 'm' : category === 'lifespan' ? 'J' : category === 'dive' ? 'min' : 'km/h';
    
    let winner;
    let resultEmoji, resultTitle, resultText;
    
    const p1CardEl = document.querySelector('#player-card-container .game-card');
    const p2CardEl = document.querySelector('#computer-card-container .game-card');
    
    if (p1Value > p2Value) {
        winner = 'player';
        resultEmoji = '🏆';
        resultTitle = `${gameState.playerNames[0]} gewinnt!`;
        resultText = `${catLabel}: ${gameState.playerNames[0]}s ${p1Card.name} (${p1Value} ${catUnit}) schlägt ${p2Card.name} (${p2Value} ${catUnit}).`;
        if (p1CardEl) p1CardEl.classList.add('win-animation');
        if (p2CardEl) p2CardEl.classList.add('lose-animation');
        soundWin();
    } else if (p2Value > p1Value) {
        winner = 'computer';
        resultEmoji = '🏆';
        resultTitle = `${gameState.playerNames[1]} gewinnt!`;
        resultText = `${catLabel}: ${gameState.playerNames[1]}s ${p2Card.name} (${p2Value} ${catUnit}) schlägt ${p1Card.name} (${p1Value} ${catUnit}).`;
        if (p2CardEl) p2CardEl.classList.add('win-animation');
        if (p1CardEl) p1CardEl.classList.add('lose-animation');
        soundWin();
    } else {
        winner = 'draw';
        resultEmoji = '🤝';
        resultTitle = 'Gleichstand!';
        resultText = `${catLabel}: Beide haben ${p1Value} ${catUnit}. Die Karten gehen in den Jackpot.`;
        if (p1CardEl) p1CardEl.classList.add('draw-animation');
        if (p2CardEl) p2CardEl.classList.add('draw-animation');
        soundDraw();
    }
    
    if (winner === 'draw') {
        document.getElementById('jackpot-area').classList.add('jackpot-pulse');
        soundJackpot();
    }
    
    const p1Top = gameState.playerHand.shift();
    const p2Top = gameState.computerHand.shift();
    
    if (winner === 'player') {
        gameState.playerHand.push(p1Top, p2Top, ...gameState.jackpot);
        gameState.jackpot = [];
        gameState.currentTurn = 'player';
    } else if (winner === 'computer') {
        gameState.computerHand.push(p2Top, p1Top, ...gameState.jackpot);
        gameState.jackpot = [];
        gameState.currentTurn = 'computer';
    } else {
        gameState.jackpot.push(p1Top, p2Top);
    }
    
    updateUI();
    
    if (gameState.playerHand.length === 0 || gameState.computerHand.length === 0) {
        gameState.gameOver = true;
        setTimeout(() => showGameOver2P(), 1000);
        return;
    }
    
    setTimeout(() => {
        showResult(resultEmoji, resultTitle, resultText);
    }, winner === 'draw' ? 600 : 800);
}

function showGameOver2P() {
    const p1Won = gameState.playerHand.length > gameState.computerHand.length;
    const winnerName = p1Won ? gameState.playerNames[0] : gameState.playerNames[1];
    const emoji = '🎉';
    const title = `${winnerName} gewinnt!`;
    const text = `${winnerName} hat alle Karten gesammelt!`;
    
    document.getElementById('gameover-emoji').textContent = emoji;
    document.getElementById('gameover-title').textContent = title;
    document.getElementById('gameover-text').textContent = text;
    document.getElementById('gameover-overlay').classList.add('active');
    
    soundVictory();
    spawnConfetti();
}

// === INIT ===
console.log('🐋 Wal-Quartett Spiel geladen. Klicke auf "Neues Spiel" um zu beginnen.');
