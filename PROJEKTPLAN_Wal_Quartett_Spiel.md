# Project Plan: Whale Quartett – Digital Card Game

## Date: 21. August 2026
## Target folder: `/home/flo/fileserver/Projekte/`

---

## 1. Game Rules (Recherche-Ergebnis)

### Klassisches Quartett (Höherer-Wert-gewinnt)
1. **Card distribution:** Alle 32 Karten werden gemischt und gleichmäßig an alle Spieler verteilt (bei 2 Spielern = je 16 Karten). Keine Karten dürfen übrig bleiben.
2. **Form stacks:** Jeder Spieler legt seine Karten als verdeckten Stapel vor sich. Nur die oberste Karte ist sichtbar.
3. **Game start:** Der Spieler links neben dem Geber (oder ein zufällig ausgewählter Spieler) beginnt.
4. **Choose category:** Der aktive Spieler wählt eine der 4 Kategorien (Gewicht, Länge, Lebenserwartung, Tauchgang) und nennt den Wert seiner obersten Karte.
5. **Comparison:** Alle anderen Spieler nennen den Wert ihrer obersten Karte in derselben Kategorie.
6. **Winner:** Wer den höchsten Wert hat, gewinnt alle Karten der Runde und legt sie unter seinen Stapel.
7. **Tie:** Bei gleichem Wert werden die Karten in die Mitte gelegt (Jackpot). Der Winner der nächsten Runde bekommt zusätzlich den Jackpot.
8. **Elimination:** Wer keine Karten mehr hat, scheidet aus.
9. **Game end:** Gewonnen hat, wer alle 32 Karten besitzt. Alternativ: Nach festgelegter Zeit gewinnt der Spieler mit den meisten Karten.

### Game modes
| Modus | Beschreibung |
|-------|-------------|
| **Einzelspieler vs. Computer** | 1 Spieler gegen KI |
| **Zwei Spieler (lokal)** | 2 Menschen am gleichen Gerät |
| **Pausen-Modus** | Spielstand wird gespeichert |

---

## 2. Technical Implementation

### Architecture
```
Frontend (HTML/CSS/JS)
├── Spielbrett (Kartenstapel sichtbar)
├── Animationen (Card distribution, Comparison, Jackpot)
├── Soundeffekte (Kartenlegen, Gewinn, Tie)
├── Responsives Design (Desktop + Tablet)
└── Lokaler Speicher (Spielstand speichern)
```

### Tech Stack
| Komponente | Technologie |
|-----------|-------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Animationen | CSS Transitions + Keyframes |
| Soundeffekte | Web Audio API |
| Speicher | localStorage |
| Icons/Emojis | Unicode Emoji (keine externen Fonts) |

---

## 3. Game Features (Features)

### Core Features
- [ ] **Kartenmischen:** Fisher-Yates Shuffle-Algorithmus
- [ ] **Card distribution:** Animierte Verteilung an 2–4 Spieler
- [ ] **Kategorie-Auswahl:** Klick auf den gewünschten Wert der obersten Karte
- [ ] **Auto-Comparison:** Computer zeigt Wert, System ermittelt Winner
- [ ] **Jackpot-System:** Tie-Karten werden in die Mitte gelegt
- [ ] **Stapel-Anzeige:** Anzahl der Karten pro Spieler sichtbar
- [ ] **Game end-Erkennung:** Sieger wird angezeigt

### Extended Features
- [ ] **Schwierigkeitsgrade:** Leicht (Computer wählt zufällig) / Mittel (Computer wählt beste Kategorie) / Schwer (Computer wählt optimale Strategie)
- [ ] **Statistiken:** Gewinnrate, meistgewählte Kategorie, längste Serie
- [ ] **Spielstand speichern:** Unterbrechung und Fortsetzung möglich
- [ ] **Tutorial:** Interaktive Einführung in die Regeln
- [ ] **Dark Mode:** Alternative Farbgebung

### Design Features
- [ ] **Karten-Flip:** 3D-Animation beim Umdrehen
- [ ] **Gewinn-Animation:** Konfetti oder Wellen-Effekt
- [ ] **Jackpot-Pulsieren:** Karten in der Mitte pulsieren
- [ ] **Sound:** Unterwasser-Atmosphäre, Karten-Klick, Gewinn-Jingle

---

## 4. File Structure

```
/home/flo/fileserver/Projekte/
├── wal_quartett.html              # Hauptspiel (digital)
├── wal_quartett_druck_pdf.html    # Print Template (bleibt erhalten)
├── wal_quartett_druck.pdf         # Druck-PDF (bleibt erhalten)
├── wal_facts.json                 # Fact-Datenbank (bleibt erhalten)
├── whale_images/                  # 32 JPGs (bleibt erhalten)
│   ├── 1.jpg ... 32.jpg
├── spiel/                         # NEU: Spiel-Assets
│   ├── index.html                 # Spiel-Startseite
│   ├── css/
│   │   ├── spiel.css              # Spielbrett-Styling
│   │   └── animations.css         # Karten-Animationen
│   ├── js/
│   │   ├── game.js                # Spiellogik
│   │   ├── cards.js               # Karten-Daten (32 Walarten)
│   │   ├── ai.js                  # Computer-Gegner
│   │   ├── audio.js               # Soundeffekte
│   │   └── storage.js             # Spielstand speichern
│   ├── assets/
│   │   ├── sounds/                # Audio-Dateien
│   │   │   ├── flip.mp3
│   │   │   ├── win.mp3
│   │   │   ├── draw.mp3
│   │   │   └── jackpot.mp3
│   │   └── images/
│   │       └── back.png           # Kartenrückseite
│   └── README.md                  # Spielanleitung
└── TAGESPROTOKOLL_Wal_Quartett_2026-08-21.md
```

---

## 5. Implementierungsplan (Roadmap)

### Phase 1: Grundgerüst (Tag 1)
- [ ] `spiel/index.html` erstellen (Spielbrett-Layout)
- [ ] `spiel/js/cards.js` – Karten-Daten aus wal_facts.json importieren
- [ ] `spiel/css/spiel.css` – Grundstyling (Spielertische, Kartenstapel)
- [ ] Kartenmischen und Verteilen implementieren
- [ ] Oberste Karte anzeigen (Spieler + Computer)

### Phase 2: Spiellogik (Tag 1–2)
- [ ] Kategorie-Auswahl durch Klick
- [ ] Wertevergleich zwischen Spieler und Computer
- [ ] Winner ermitteln und Karten übertragen
- [ ] Jackpot bei Tie
- [ ] Game end erkennen (alle Karten bei einem Spieler)

### Phase 3: KI-Gegner (Tag 2)
- [ ] **Leicht:** Computer wählt zufällige Kategorie
- [ ] **Mittel:** Computer wählt Kategorie mit höchstem relativen Vorteil
- [ ] **Schwer:** Computer analysiert verbleibende Karten und wählt optimal

### Phase 4: Animationen & Design (Tag 2–3)
- [ ] Karten-Flip-Animation (3D CSS)
- [ ] Card distribution-Animation
- [ ] Gewinn-Animation (Karten fliegen zum Winner)
- [ ] Jackpot-Pulsieren
- [ ] Responsive Design für Tablet/Desktop

### Phase 5: Audio & Polishing (Tag 3)
- [ ] Soundeffekte integrieren (Web Audio API)
- [ ] Unterwasser-Hintergrundambiente
- [ ] Tutorial-Overlay
- [ ] Statistik-Screen nach Game end
- [ ] Spielstand speichern (localStorage)

### Phase 6: Test & Release (Tag 3)
- [ ] Alle 32 Karten durchspielen
- [ ] Edge Cases testen (Tie, Jackpot-Ketten)
- [ ] Cross-Browser-Test (Firefox, Chrome)
- [ ] Performance-Check
- [ ] Finale Dateien nach `/home/flo/fileserver/Projekte/spiel/` kopieren

---

## 6. Spieler-Erfahrung (UX)

### Spielablauf (Beispiel)
1. **Startbildschirm:** Logo, "Neues Spiel", "Spiel fortsetzen", "Anleitung"
2. **Schwierigkeitsauswahl:** Leicht / Mittel / Schwer
3. **Card distribution:** Animation zeigt, wie 32 Karten gemischt und verteilt werden
4. **Spielbrett:** Links Spieler (16 Karten), rechts Computer (16 Karten), Mitte Jackpot
5. **Spielzug:** Spieler klickt auf eine Kategorie seiner obersten Karte
6. **Comparison:** Computer dreht Karte um, Werte werden angezeigt
7. **Ergebnis:** Winner wird hervorgehoben, Karten fliegen zum Winner
8. **Weiter:** Nächster Spieler ist dran (abwechselnd)
9. **Game end:** Sieger-Screen mit Statistik

### Steuerung
| Aktion | Eingabe |
|--------|---------|
| Choose category | Mausklick auf Wert |
| Spiel pausieren | ESC-Taste |
| Schnell-Modus | Leertaste (überspringt Animationen) |

---

## 7. Offene Fragen (zu klären)

1. **Soll das Spiel offline funktionieren?** → Ja (lokale HTML-Datei, keine Server)
2. **Nur 1-Spieler-Modus oder auch 2 Spieler am selben Gerät?** → Beides
3. **Sollen Sounds optional sein?** → Ja (Toggle im Menü)
4. **Soll es ein Highscore-System geben?** → Ja (localStorage)
5. **Sollen die Karten ausgedruckt werden können?** → Vorhanden als PDF

---

## 8. Ziele

| Ziel | Priorität |
|------|-----------|
| Funktionierendes Spiel (Spieler vs. Computer) | 🔴 Hoch |
| Ansprechende Animationen | 🟡 Mittel |
| Soundeffekte | 🟡 Mittel |
| Spielstand speichern | 🟢 Niedrig |
| 2-Spieler-Modus | 🟢 Niedrig |

---

**Nächster Schritt:** Phase 1 beginnen – Grundgerüst erstellen.

**Zeitschätzung:** 2–3 Tage für vollständiges Spiel.
