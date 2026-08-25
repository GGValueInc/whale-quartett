// Feedback-System fuer Wal-Quartett
function showFeedbackForm() {
    var name = prompt('Dein Name (optional):', (gameState.playerNames && gameState.playerNames[0]) || '');
    if (name === null) return;
    var text = prompt('Dein Feedback oder Bug-Report:');
    if (!text || text.trim() === '') return;
    
    if (typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'feedback', name: name || 'Anonym', message: text.trim() }));
        alert('Danke fuer dein Feedback!');
    } else {
        alert('Nicht verbunden. Bitte im Spiel Feedback senden.');
    }
}

// Auto-show feedback notification after game ends
function onGameOverHook() {
    setTimeout(function() {
        if (confirm('Spiel vorbei! Moechtest du Feedback geben?')) {
            showFeedbackForm();
        }
    }, 1000);
}
