/**
 * audio.js – Whale Quartett Sound Effects (Web Audio API)
 * Generates all sounds synthetically – no external audio files needed.
 */

let audioCtx = null;
let ambientGain = null;
let ambientPlaying = false;
let ambientLFOGain = null;
let ambientSource = null;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

// === HELPER FUNCTIONS ===
function playTone(freq, duration, type = 'sine', volume = 0.3, delay = 0) {
    if (!audioCtx || !gameState.soundEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
}

function playNoise(duration, volume = 0.1) {
    if (!audioCtx || !gameState.soundEnabled) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    noise.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start();
}

// === SOUND EFFECTS ===

/** Card flip / reveal */
function soundFlip() {
    initAudio();
    playNoise(0.08, 0.08);
    playTone(800, 0.1, 'triangle', 0.05);
}

/** Category selected */
function soundSelect() {
    initAudio();
    playTone(523, 0.12, 'sine', 0.15);
}

/** Round won */
function soundWin() {
    initAudio();
    playTone(523, 0.15, 'sine', 0.2);  // C5
    playTone(659, 0.15, 'sine', 0.2, 0.08);  // E5
    playTone(784, 0.25, 'sine', 0.2, 0.16);  // G5
}

/** Round lost */
function soundLose() {
    initAudio();
    playTone(300, 0.25, 'sine', 0.2);
    playTone(250, 0.35, 'sine', 0.15, 0.1);
}

/** Tie */
function soundDraw() {
    initAudio();
    playTone(440, 0.3, 'sine', 0.15);
    playTone(440, 0.3, 'sine', 0.15, 0.15);
}

/** Jackpot cards to center */
function soundJackpot() {
    initAudio();
    playTone(600, 0.1, 'sine', 0.1);
    playTone(700, 0.1, 'sine', 0.1, 0.08);
    playTone(800, 0.2, 'sine', 0.15, 0.16);
}

/** Game won (fanfare) */
function soundVictory() {
    initAudio();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
        playTone(freq, 0.3, 'triangle', 0.2, i * 0.12);
    });
}

/** Game lost */
function soundDefeat() {
    initAudio();
    playTone(400, 0.3, 'sine', 0.15);
    playTone(350, 0.3, 'sine', 0.12, 0.2);
    playTone(300, 0.5, 'sine', 0.1, 0.4);
}

// === WAVE SOUND AMBIENT ===
function startAmbient() {
    if (!audioCtx) initAudio();
    if (ambientPlaying || !gameState.soundEnabled) return;
    
    // 1. Brown noise for ocean sound
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
    }
    
    ambientSource = audioCtx.createBufferSource();
    ambientSource.buffer = buffer;
    ambientSource.loop = true;
    
    // 2. Low-pass filter for muffled underwater feel
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    
    // 3. LFO for wave fluctuations
    // Creates slow volume waves like water rolling ashore
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;  // ~6.7 Sekunden pro Welle
    
    ambientLFOGain = audioCtx.createGain();
    ambientLFOGain.gain.value = 0.04;  // Wave amplitude
    
    lfo.connect(ambientLFOGain);
    
    // 4. Haupt-Gain: Base volume + Wellen-Schwankung
    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0.03;  // Base volume (quiet)
    
    // LFO modulates gain (wave effect)
    ambientLFOGain.connect(ambientGain.gain);
    
    // Chain: Noise -> Filter -> Gain (with LFO modulation) -> Output
    ambientSource.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);
    
    ambientSource.start();
    lfo.start();
    ambientPlaying = true;
}

function stopAmbient() {
    if (ambientSource) {
        try { ambientSource.stop(); } catch(e) {}
        ambientSource = null;
    }
    ambientPlaying = false;
}

function setAmbientVolume(vol) {
    if (ambientGain) ambientGain.gain.value = vol;
}

// === TOGGLE SOUND (overrides the old function) ===
function toggleSoundUI() {
    gameState.soundEnabled = !gameState.soundEnabled;
    const btn = event.target;
    btn.textContent = gameState.soundEnabled ? '🔊' : '🔇';
    if (gameState.soundEnabled) {
        startAmbient();
    } else {
        stopAmbient();
    }
}
