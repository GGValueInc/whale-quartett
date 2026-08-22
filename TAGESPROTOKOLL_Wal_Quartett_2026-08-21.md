
# Daily Log – Wal-Quartett Projekt

**Datum:** 21. August 2026
**Ort:** /home/flo/fileserver/Projekte/

---

## Completed Tasks

### 1. Interactive HTML Whale Quartett (32 Walarten)
- Erstellung einer vollständigen Bildschirmversion mit CSS Grid, Sortierung und Spielmodus
- 32 Walarten mit wissenschaftlichen Namen, Gewicht, Länge, Lebenserwartung, Tauchgang
- Interaktiver Vergleichsmodus (Computer vs. Spieler)

### 2. Image Acquisition (32 echte Fotos)
- Alle Bilder von Wikimedia Commons (freie Lizenzen, nicht-kommerzielle Nutzung)
- Lokale Speicherung in `whale_images/` (keine externen URLs mehr)
- IDs 6 und 25 gegen bessere Ganzkörperfotos ausgetauscht

### 3. Data Verification & Corrections
- Alle 32 Datensätze gegen Wikipedia/Wikidata geprüft
- **Korrigierte Werte:**
  - Seiwal: Gewicht 45→28.5t, Länge 20.0→19.5m, Lebenserwartung 70→74J
  - Brydewal: Lebenserwartung 50→72J, Tauchgang 10→20min
  - Zwergbuckelwal: Länge 14.0→15.0m
  - Langflossen-Grindwal: Gewicht 2.3→5.0t, Lebenserwartung 40→60J

### 4. Neue Facts (~100 Zeichen pro Wal)
- Aussagekräftige, detaillierte Facts für alle 32 Arten
- Separat in `wal_facts.json` gespeichert
- In HTML und Druckvorlage übernommen

### 5. Druckvorlage (Rhommé-Format)
- Exakt 60×90 mm pro Karte (Rhommé-Standard)
- 3×3 Raster = 9 Karten pro A4-Blatt
- 4 Blätter Vorderseiten + 4 Blätter Rückseiten = 8 Blätter gesamt
- Schnittmarken für präzises Schneiden
- Einheitliche Rückseite mit Wal-Quartett-Logo

### 6. PDF-Generierung
- `wal_quartett_druck.pdf` aus statischer HTML erzeugt
- 8 Seiten, A4, druckkompatibel

### 7. Druckertreiber
- Samsung C480 (CW480) in CUPS eingerichtet
- Netzwerkverbindung über DNSSD/IPP
- Treiber: `Samsung C48x Series PS`
- Standarddrucker gesetzt

### 8. Dateien verschoben nach `/home/flo/fileserver/Projekte/`

## Dateien im Projektordner

| Datei | Größe | Zweck |
|-------|-------|-------|
| `wal_quartett.html` | 25 KB | Bildschirmversion (Browser) |
| `wal_quartett_druck_pdf.html` | 54 KB | Statische Druckvorlage |
| `wal_quartett_druck.pdf` | 9,3 MB | Druckfertiges PDF |
| `wal_facts.json` | 5,9 KB | Separater Fact-Speicher |
| `whale_images/` | 32 JPGs | Lokale Bildersammlung |

## Offene Punkte
- AVIF-Bild für ID 6 (Antarktischer Zwergwal) konnte nicht konvertiert werden → aktuelles JPG ist OK
- Oceanwide-Bild (AVIF) liegt vor, aber kein Decoder verfügbar

## Nächste Schritte
- PDF auf Samsung C480 drucken (200–300 g/m² Karton)
- Entlang Schnittmarken schneiden
- Optional: Ecken mit Eckenrunder abrunden

---

*Gesamtarbeitszeit: ca. 3 Stunden*
*Alle Daten gegen Wikipedia geprüft und korrigiert.*
