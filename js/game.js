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
    playerNames: ['You', 'Computer']  // [Player 1, Player 2]
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
    document.querySelector(`[data-diff="${diff}"]`).classList.add('selected');
    document.getElementById('start-game-btn').disabled = false;
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
    gameState.playerNames = ['You', 'Computer'];
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
    
    // Show cards with deal animation
    if (gameState.currentTurn === 'computer') {
        renderPlayerCard(true, true);
        renderComputerCardBack(true);
        updateTurnIndicator();
        setTimeout(() => computerPlaysTurn(), 1200);
    } else {
        renderPlayerCard(true, true);
        renderComputerCardBack(true);
        updateTurnIndicator();
    }
}

// === UI UPDATES ===
function updateUI() {
    document.getElementById('player-count').textContent = `${gameState.playerHand.length} cards`;
    document.getElementById('computer-count').textContent = `${gameState.computerHand.length} cards`;
    
    const p1Name = gameState.playerNames[0];
    const p2Name = gameState.playerNames[1];
    document.getElementById('score-display').textContent = `${p1Name}: ${gameState.playerHand.length} · ${p2Name}: ${gameState.computerHand.length}`;
    
    const jackpotCount = gameState.jackpot.length;
    document.getElementById('jackpot-count').textContent = `${jackpotCount} cards`;
    const jackpotArea = document.getElementById('jackpot-area');
    jackpotArea.classList.toggle('jackpot-pulse', jackpotCount > 0);
}

function updateTurnIndicator() {
    const el = document.getElementById('turn-indicator');
    const activeName = gameState.currentTurn === 'player' ? gameState.playerNames[0] : gameState.playerNames[1];
    const otherName = gameState.currentTurn === 'player' ? gameState.playerNames[1] : gameState.playerNames[0];
    
    if (gameState.gameMode === '2p') {
        if (gameState.waitingForComputer) {
            el.innerHTML = `🤫 ${otherName}'s card is being shown...<br><small>Please don't look!</small>`;
        } else {
            el.innerHTML = `🎯 ${activeName} 's turn!<br><small>Choose a category</small>`;
        }
    } else {
        if (gameState.currentTurn === 'player') {
            el.innerHTML = '🎯 Your turn!<br><small>Choose a category</small>';
        } else {
            el.innerHTML = '🤖 Computer's turn...<br><small>Please wait</small>';
        }
    }
}

// === CARD RENDERING ===
function renderPlayerCard(active = true, animate = false) {
    const container = document.getElementById('player-card-container');
    if (gameState.playerHand.length === 0) {
        container.innerHTML = '<div style="opacity:0.5">Keine cards</div>';
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
                    <span class="stat-label">⚖️ Weight</span>
                    <span class="stat-value">${card.weight} t</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="length" onclick="playerSelectCategory('length')">
                    <span class="stat-label">📏 Length</span>
                    <span class="stat-value">${card.length} m</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="lifespan" onclick="playerSelectCategory('lifespan')">
                    <span class="stat-label">⏳ Lifespan</span>
                    <span class="stat-value">${card.lifespan} J</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="dive" onclick="playerSelectCategory('dive')">
                    <span class="stat-label">🤿 Dive</span>
                    <span class="stat-value">${card.dive} min</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="speed" onclick="playerSelectCategory('speed')">
                    <span class="stat-label">💨 Speed</span>
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
        container.innerHTML = '<div style="opacity:0.5">Keine cards</div>';
        return;
    }
    const animClass = animate ? 'card-deal-computer' : '';
    container.innerHTML = `
        <div class="card-back ${animClass}">
            <div class="card-back-emoji">🐋</div>
            <div class="card-back-text">Wal-Quartett</div>
            <div style="font-size: 0.8em; opacity: 0.6; margin-top: 10px;">${gameState.computerHand.length} cards</div>
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
                    <span class="stat-label">⚖️ Weight</span>
                    <span class="stat-value">${card.weight} t</span>
                </div>
                <div class="stat-row ${highlightCat === 'length' ? 'selected' : ''}">
                    <span class="stat-label">📏 Length</span>
                    <span class="stat-value">${card.length} m</span>
                </div>
                <div class="stat-row ${highlightCat === 'lifespan' ? 'selected' : ''}">
                    <span class="stat-label">⏳ Lifespan</span>
                    <span class="stat-value">${card.lifespan} J</span>
                </div>
                <div class="stat-row ${highlightCat === 'dive' ? 'selected' : ''}">
                    <span class="stat-label">🤿 Dive</span>
                    <span class="stat-value">${card.dive} min</span>
                </div>
                <div class="stat-row ${highlightCat === 'speed' ? 'selected' : ''}">
                    <span class="stat-label">💨 Speed</span>
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
    
    // Visuelle Markierung
    document.querySelectorAll('.stat-row').forEach(r => r.classList.remove('selected'));
    const selected = document.querySelector(`[data-cat="${category}"]`);
    if (selected) selected.classList.add('selected');
    
    // Deaktiviere weitere Klicks
    document.querySelectorAll('.stat-row').forEach(r => r.classList.add('disabled'));
    
    updateTurnIndicator();
    
    // Computer card aufdecken
    setTimeout(() => {
        soundFlip();
        renderComputerCardRevealed(category);
        setTimeout(() => {
            resolveRound(category);
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
        
        // Player-Karte zeigt die category hervorgehoben
        setTimeout(() => {
            renderPlayerCard(false); // Player ist nicht aktiv, nur Anzeige
            // Markiere die vom Computer chosen category beim Player
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
    const maxValues = {
        weight: Math.max(...whales.map(w => w.weight)),
        length: Math.max(...whales.map(w => w.length)),
        lifespan: Math.max(...whales.map(w => w.lifespan)),
        dive: Math.max(...whales.map(w => w.dive)),
        speed: Math.max(...whales.map(w => w.speed))
    };
    
    let bestCat = cats[0];
    let bestRatio = 0;
    for (const cat of cats) {
        const ratio = card[cat] / maxValues[cat];
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
        weight: '⚖️ Weight',
        length: '📏 Length',
        lifespan: '⏳ Lifespan',
        dive: '🤿 Dive',
        speed: '💨 Speed'
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
        resultTitle = 'Round won!';
        resultText = `${catLabel}: Dein ${playerCard.name} (${playerValue} ${catUnit}) schlägt ${computerCard.name} (${computerValue} ${catUnit}).`;
        // Win-Animation auf Player-Karte
        if (playerCardEl) playerCardEl.classList.add('win-animation');
        if (computerCardEl) computerCardEl.classList.add('lose-animation');
        // Sound
        soundWin();
    } else if (computerValue > playerValue) {
        winner = 'computer';
        resultEmoji = '🤖';
        resultTitle = 'Computer wins!';
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
        resultText = `${catLabel}: Beide haben ${playerValue} ${catUnit}. Die cards gehen in den Jackpot.`;
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
        // Player bekommt beide cards + Jackpot
        gameState.playerHand.push(playerTop, computerTop, ...gameState.jackpot);
        gameState.jackpot = [];
        // Player hat gewonnen -> Player ist wieder dran
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
    document.getElementById('result-emoji').textContent = emoji;
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-text').textContent = text;
    document.getElementById('result-overlay').classList.add('active');
}

function hideResult() {
    document.getElementById('result-overlay').classList.remove('active');
}

function showGameOver() {
    const playerWon = gameState.playerHand.length > gameState.computerHand.length;
    const emoji = playerWon ? '🎉' : '😢';
    const title = playerWon ? 'You won!' : 'Computer wins!';
    const text = playerWon 
        ? `Glückwunsch! You hast alle ${gameState.playerHand.length} cards gesammelt.`
        : `The computer collected all ${gameState.computerHand.length} cards gesammelt. Nochmal versuchen?`;
    
    document.getElementById('gameover-emoji').textContent = emoji;
    document.getElementById('gameover-title').textContent = title;
    document.getElementById('gameover-text').textContent = text;
    document.getElementById('gameover-overlay').classList.add('active');
    
    // Sound + Confetti wenn Player gewinnt
    if (playerWon) {
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
    
    // Animation-Klassen entfernen
    document.querySelectorAll('.game-card, .card-back').forEach(el => {
        el.classList.remove('win-animation', 'lose-animation', 'draw-animation', 'card-deal-player', 'card-deal-computer');
    });
    
    updateUI();
    
    if (gameState.gameMode === '2p') {
        // 2-Player: Verdecke die Karte des nicht aktiven Players
        hideInactivePlayerCard();
        revealActivePlayerCard();
        updateTurnIndicator();
        return;
    }
    
    if (gameState.currentTurn === 'computer' && !gameState.gameOver) {
        // Computer ist dran -> Computer spielt
        renderPlayerCard();
        renderComputerCardBack();
        updateTurnIndicator();
        setTimeout(() => computerPlaysTurn(), 400);
    } else if (gameState.currentTurn === 'player' && !gameState.gameOver) {
        // Player ist dran
        renderPlayerCard();
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
    if (confirm('Quit game and return to menu?')) {
        stopAmbient();
        showStart();
    }
}

// === KEYBOARD SHORTCUTS ===
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeOverlay = document.querySelector('.result-overlay.active');
        if (activeOverlay) {
            if (activeOverlay.id === 'result-overlay') nextRound();
            else if (activeOverlay.id === 'rules-overlay') closeRules();
        } else if (document.getElementById('game-screen').classList.contains('active')) {
            quitGame();
        }
    }
    if (e.key === ' ' || e.key === 'Enter') {
        const activeOverlay = document.querySelector('.result-overlay.active');
        if (activeOverlay && activeOverlay.id === 'result-overlay') {
            e.preventDefault();
            nextRound();
        }
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
        document.getElementById('p2-name-1').value || 'Player 1',
        document.getElementById('p2-name-2').value || 'Player 2'
    ];
    
    const hands = dealCards(2);
    gameState.playerHand = hands[0];
    gameState.computerHand = hands[1];  // Player 2
    gameState.jackpot = [];
    gameState.selectedCategory = null;
    gameState.waitingForComputer = false;
    gameState.gameOver = false;
    gameState.currentTurn = 'player';  // Player 1 beginnt
    
    showScreen('game-screen');
    updateUI();
    
    // Update names
    document.getElementById('player-zone-name').textContent = '👤 ' + gameState.playerNames[0];
    document.getElementById('computer-zone-name').textContent = '👤 ' + gameState.playerNames[1];
    
    // Start ambient sound
    startAmbient();
    
    renderPlayerCard(true, true);
    renderComputerCardBack(true);
    updateTurnIndicator();
    
    // In 2P-Modus: Verdecke die Karte des nicht aktiven Players
    hideInactivePlayerCard();
}

// Verdecke die Karte des Players, der nicht dran ist
function hideInactivePlayerCard() {
    if (gameState.gameMode !== '2p') return;
    
    if (gameState.currentTurn === 'player') {
        // Player 2 verdecken
        const compContainer = document.getElementById('computer-card-container');
        compContainer.innerHTML = `
            <div class="card-back">
                <div class="card-back-emoji">🐋</div>
                <div class="card-back-text">${gameState.playerNames[1]}</div>
                <div style="font-size: 0.8em; opacity: 0.6; margin-top: 10px;">${gameState.computerHand.length} cards</div>
            </div>
        `;
    } else {
        // Player 1 verdecken
        const playerContainer = document.getElementById('player-card-container');
        playerContainer.innerHTML = `
            <div class="card-back">
                <div class="card-back-emoji">🐋</div>
                <div class="card-back-text">${gameState.playerNames[0]}</div>
                <div style="font-size: 0.8em; opacity: 0.6; margin-top: 10px;">${gameState.playerHand.length} cards</div>
            </div>
        `;
    }
}

// 2-Player: Zeige die Karte des aktiven Players
function revealActivePlayerCard() {
    if (gameState.gameMode !== '2p') return;
    
    if (gameState.currentTurn === 'player') {
        renderPlayerCard(true, true);
    } else {
        // Player 2 Karte anzeigen (im Computer-Container)
        renderPlayer2Card(true, true);
    }
}

// Rendert Player 2 Karte (im rechten Container)
function renderPlayer2Card(active = true, animate = false) {
    const container = document.getElementById('computer-card-container');
    if (gameState.computerHand.length === 0) {
        container.innerHTML = '<div style="opacity:0.5">Keine cards</div>';
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
                    <span class="stat-label">⚖️ Weight</span>
                    <span class="stat-value">${card.weight} t</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="length" onclick="player2SelectCategory('length')">
                    <span class="stat-label">📏 Length</span>
                    <span class="stat-value">${card.length} m</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="lifespan" onclick="player2SelectCategory('lifespan')">
                    <span class="stat-label">⏳ Lifespan</span>
                    <span class="stat-value">${card.lifespan} J</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="dive" onclick="player2SelectCategory('dive')">
                    <span class="stat-label">🤿 Dive</span>
                    <span class="stat-value">${card.dive} min</span>
                </div>
                <div class="stat-row ${isActive ? '' : 'disabled'}" data-cat="speed" onclick="player2SelectCategory('speed')">
                    <span class="stat-label">💨 Speed</span>
                    <span class="stat-value">${card.speed} km/h</span>
                </div>
            </div>
            <div class="card-footer">${card.fact}</div>
        </div>
    `;
}

// Player 2 wählt category
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
    
    // Player 1 Karte aufdecken
    setTimeout(() => {
        soundFlip();
        renderPlayerCardRevealed(category);
        setTimeout(() => {
            resolveRound2P(category);
        }, 1500);
    }, 600);
}

// Player 1 Karte aufgedeckt anzeigen (im linken Container)
function renderPlayerCardRevealed(highlightCat = null) {
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
                    <span class="stat-label">⚖️ Weight</span>
                    <span class="stat-value">${card.weight} t</span>
                </div>
                <div class="stat-row ${highlightCat === 'length' ? 'selected' : ''}">
                    <span class="stat-label">📏 Length</span>
                    <span class="stat-value">${card.length} m</span>
                </div>
                <div class="stat-row ${highlightCat === 'lifespan' ? 'selected' : ''}">
                    <span class="stat-label">⏳ Lifespan</span>
                    <span class="stat-value">${card.lifespan} J</span>
                </div>
                <div class="stat-row ${highlightCat === 'dive' ? 'selected' : ''}">
                    <span class="stat-label">🤿 Dive</span>
                    <span class="stat-value">${card.dive} min</span>
                </div>
                <div class="stat-row ${highlightCat === 'speed' ? 'selected' : ''}">
                    <span class="stat-label">💨 Speed</span>
                    <span class="stat-value">${card.speed} km/h</span>
                </div>
            </div>
            <div class="card-footer">${card.fact}</div>
        </div>
    `;
}

// 2-Player roundsauflösung
function resolveRound2P(category) {
    const p1Card = gameState.playerHand[0];
    const p2Card = gameState.computerHand[0];
    const p1Value = p1Card[category];
    const p2Value = p2Card[category];
    
    const catLabels = { weight: '⚖️ Weight', length: '📏 Length', lifespan: '⏳ Lifespan', dive: '🤿 Dive' };
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
        resultText = `${catLabel}: Beide haben ${p1Value} ${catUnit}. Die cards gehen in den Jackpot.`;
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
    const text = `${winnerName} hat alle cards gesammelt!`;
    
    document.getElementById('gameover-emoji').textContent = emoji;
    document.getElementById('gameover-title').textContent = title;
    document.getElementById('gameover-text').textContent = text;
    document.getElementById('gameover-overlay').classList.add('active');
    
    soundVictory();
    spawnConfetti();
}

// === INIT ===
console.log('🐋 Wal-Quartett Spiel geladen. Klicke auf "New Game" um zu beginnen.');
