// Feedback-System fuer Wal-Quartett
// Funktioniert sowohl via WebSocket (im Spiel) als auch via HTTP POST (Startseite)

function showFeedbackForm() {
    var name = prompt('Dein Name (optional):', (typeof gameState !== 'undefined' && gameState.playerNames && gameState.playerNames[0]) || '');
    if (name === null) return;
    var text = prompt('Dein Feedback oder Bug-Report:');
    if (!text || text.trim() === '') return;
    
    // Client-seitige Prompt Injection Erkennung
    var injectionPatterns = [
        /ignore previous instructions/i,
        /system prompt/i,
        /you are now/i,
        /override/i,
        /bypass/i,
        /forget everything/i,
        /act as/i,
        /pretend to be/i,
        /exec\s*\(/i,
        /eval\s*\(/i,
        /system\s*\(/i,
        /child_process/i,
        /run this/i,
        /execute this/i,
        /jailbreak/i,
        /DAN MODE/i,
        /DEVELOPER MODE/i,
        /```/,
        /\[SYSTEM\]/,
        /\[ADMIN\]/
    ];
    
    for (var i = 0; i < injectionPatterns.length; i++) {
        if (injectionPatterns[i].test(text)) {
            alert('Deine Nachricht enthaelt potenziell unsichere Inhalte und wurde nicht gesendet.');
            return;
        }
    }
    
    // Maximale Laenge
    if (text.length > 2000) {
        alert('Nachricht zu lang (maximal 2000 Zeichen).');
        return;
    }
    
    var payload = JSON.stringify({ name: name || 'Anonym', message: text.trim() });
    
    // Versuche zuerst WebSocket (falls im Spiel)
    if (typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'feedback', name: name || 'Anonym', message: text.trim() }));
        alert('Danke fuer dein Feedback!');
        return;
    }
    
    // Fallback: HTTP POST (funktioniert von ueberall)
    fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.ok) {
            alert('Danke fuer dein Feedback!');
        } else {
            alert('Fehler: ' + (data.error || 'Unbekannter Fehler'));
        }
    })
    .catch(function(err) {
        alert('Fehler beim Senden: ' + err.message);
    });
}

// Auto-show feedback notification after game ends
function onGameOverHook() {
    setTimeout(function() {
        if (confirm('Spiel vorbei! Moechtest du Feedback geben?')) {
            showFeedbackForm();
        }
    }, 1000);
}