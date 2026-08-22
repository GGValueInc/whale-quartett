// cards.js – Whale Quartett Card Data (32 whale species)
// Source: wal_quartett.html (from the fileserver)

const whales = [
    { id: 1, name: "Blauwal", scientific: "Balaenoptera musculus", weight: 190, length: 33.0, lifespan: 90, dive: 15, speed: 30, fact: "Herz so groß wie ein Kleinwagen, Zunge wie ein Elefant: Der Blauwal ist das schwerste Lebewesen, das je existierte.", emoji: "🐋" },
    { id: 2, name: "Finnwal", scientific: "Balaenoptera physalus", weight: 80, length: 27.3, lifespan: 90, dive: 15, speed: 47, fact: "Mit bis zu 47 km/h der schnellste Großwal. Sein Rücken hat eine charakteristische Sichelfinne.", emoji: "🐋" },
    { id: 3, name: "Seiwal", scientific: "Balaenoptera borealis", weight: 28.5, length: 19.5, lifespan: 74, dive: 20, speed: 50, fact: "Frisst täglich bis zu 900 kg Krill und Plankton. Einmal fast ausgerottet durch industriellen Walfang.", emoji: "🐋" },
    { id: 4, name: "Brydewal", scientific: "Balaenoptera brydei", weight: 40, length: 16.5, lifespan: 72, dive: 20, speed: 25, fact: "Dreifache Kiemenfalten auf dem Kopf machen ihn eindeutig identifizierbar. Tropischer Bewohner der warmen Ozeane.", emoji: "🐋" },
    { id: 5, name: "Zwergwal", scientific: "Balaenoptera acutorostrata", weight: 10, length: 10.0, lifespan: 50, dive: 17, speed: 34, fact: "Nur sieben Meter lang, aber neugierig und wendig. Taucht oft vor Walbeobachtungsbooten auf.", emoji: "🐳" },
    { id: 6, name: "Antarktischer Zwergwal", scientific: "Balaenoptera bonaerensis", weight: 11, length: 10.8, lifespan: 50, dive: 15, speed: 32, fact: "Wurde erst 1990 als eigene Art anerkannt. Tarnung mit weißen Flügelflecken im Eismeer.", emoji: "🐳" },
    { id: 7, name: "Omuras Wal", scientific: "Balaenoptera omurai", weight: 33, length: 12.0, lifespan: 60, dive: 18, speed: 22, fact: "Eine der jüngsten Walarten überhaupt: Erst 2003 wissenschaftlich beschrieben. Extrem scheu und selten.", emoji: "🐋" },
    { id: 8, name: "Rice-Wal", scientific: "Balaenoptera ricei", weight: 25, length: 11.5, lifespan: 55, dive: 16, speed: 20, fact: "Lebt ausschließlich im Golf von Mexiko und wurde 2021 als eigene Art bestätigt. Nur etwa 100 Individuen.", emoji: "🐋" },
    { id: 9, name: "Buckelwal", scientific: "Megaptera novaeangliae", weight: 40, length: 18.0, lifespan: 80, dive: 30, speed: 27, fact: "Spektakuläre Sprünge und Stundenlange, komplexe Gesänge, die Hunderte von Kilometern weit hörbar sind.", emoji: "🐋" },
    { id: 10, name: "Grauwal", scientific: "Eschrichtius robustus", weight: 35, length: 15.0, lifespan: 70, dive: 8, speed: 15, fact: "Legt jährlich rund 20.000 Kilometer zurück zwischen kalten Futtergründen und tropischen Geburtsgewässern.", emoji: "🐋" },
    { id: 11, name: "Zwergbuckelwal", scientific: "Megaptera novaeangliae subsp.", weight: 28, length: 15.0, lifespan: 60, dive: 20, speed: 25, fact: "Kleinste Population der Buckelwale im Arabischen Meer. Genetisch isoliert seit über 70.000 Jahren.", emoji: "🐳" },
    { id: 12, name: "Atlantischer Nordkaper", scientific: "Eubalaena glacialis", weight: 70, length: 18.0, lifespan: 70, dive: 20, speed: 10, fact: "Nur noch etwa 350 Exemplare leben an der Ostküste Nordamerikas. Bootskollisionen sind die größte Bedrohung.", emoji: "🐋" },
    { id: 13, name: "Pazifischer Nordkaper", scientific: "Eubalaena japonica", weight: 80, length: 20.0, lifespan: 70, dive: 25, speed: 10, fact: "Schätzungsweise nur 500 Individuen. Die seltenste Walart des Nordpazifiks. Wird von Eisbären gejagt.", emoji: "🐋" },
    { id: 14, name: "Südkaper", scientific: "Eubalaena australis", weight: 80, length: 18.0, lifespan: 80, dive: 20, speed: 10, fact: "Ein Erfolgsmodell des Walsschutzes: Die Population wuchs von 300 auf über 15.000 Tiere.", emoji: "🐋" },
    { id: 15, name: "Grönlandwal", scientific: "Balaena mysticetus", weight: 100, length: 20.0, lifespan: 200, dive: 40, speed: 10, fact: "Kann über 200 Jahre alt werden! Das macht ihn zum langlebigsten Säugetier der Erde.", emoji: "🐋" },
    { id: 16, name: "Schwertwal / Orca", scientific: "Orcinus orca", weight: 9, length: 9.8, lifespan: 80, dive: 17, speed: 56, fact: "Jede Population hat einen eigenen Dialekt. Weibchen führen oft die Herde und werden über 90 Jahre alt.", emoji: "🐬" },
    { id: 17, name: "Kurzflossen-Grindwal", scientific: "Globicephala macrorhynchus", weight: 3.6, length: 7.2, lifespan: 45, dive: 25, speed: 40, fact: "Lebt in festen Matrilinien, die das Leben lang zusammenbleiben. Tragisch bekannt durch Strandungen.", emoji: "🐬" },
    { id: 18, name: "Langflossen-Grindwal", scientific: "Globicephala melas", weight: 5.0, length: 6.5, lifespan: 60, dive: 22, speed: 40, fact: "Europas häufigster Großwal. Sein Gehirn ist doppelt so schwer wie das eines Menschen.", emoji: "🐬" },
    { id: 19, name: "Weißer Beluga", scientific: "Delphinapterus leucas", weight: 1.6, length: 5.5, lifespan: 50, dive: 25, speed: 22, fact: "Kann den Kopf unabhängig drehen und mimt menschliche Stimmen. Im Winter bleibt Eis frei.", emoji: "🐬" },
    { id: 20, name: "Narwal", scientific: "Monodon monoceros", weight: 1.6, length: 5.5, lifespan: 50, dive: 25, speed: 40, fact: "Der Stoßzahn ist ein verlängerter Zahn mit bis zu 10 Millionen Nervenenden. Er dient als Sinnesorgan.", emoji: "🦄" },
    { id: 21, name: "Großer Tümmler", scientific: "Tursiops truncatus", weight: 0.65, length: 4.2, lifespan: 50, dive: 10, speed: 37, fact: "Nutzt Werkzeuge: Trägt Schwämme auf der Schnauze, um sich am Meeresboden zu schützen.", emoji: "🐬" },
    { id: 22, name: "Pseudorca", scientific: "Pseudorca crassidens", weight: 2.2, length: 6.1, lifespan: 55, dive: 18, speed: 55, fact: "Jagt gemeinsam mit Delfinen und Tümmlern. Eine seltene Art, die oft mit Orcas verwechselt wird.", emoji: "🐬" },
    { id: 23, name: "Cuvier-Schnabelwal", scientific: "Ziphius cavirostris", weight: 3.1, length: 7.5, lifespan: 60, dive: 90, speed: 30, fact: "Rekord-Taucher: Hält den Tiefenrekord mit fast 3.000 Metern und über zwei Stunden Tauchgangsdauer.", emoji: "🐋" },
    { id: 24, name: "Nördlicher Bottlenose-Whale", scientific: "Hyperoodon ampullatus", weight: 7.5, length: 10.0, lifespan: 40, dive: 70, speed: 28, fact: "Die markante Melone auf dem Kopf dient der Echolokation. Kuriose Neugier für Menschen und Schiffe.", emoji: "🐋" },
    { id: 25, name: "Perrin-Schnabelwal", scientific: "Mesoplodon perrini", weight: 1.2, length: 4.0, lifespan: 45, dive: 60, speed: 25, fact: "Erst 2002 als eigene Art erkannt. Die kleinste Mesoplodon-Art, kaum größer als ein Delfin.", emoji: "🐳" },
    { id: 26, name: "Blainvilles Schnabelwal", scientific: "Mesoplodon densirostris", weight: 1.1, length: 4.9, lifespan: 50, dive: 55, speed: 25, fact: "Männchen tragen bizarre, kastanienförmige Zähne am Unterkiefer, die aus der Schnauze herausragen.", emoji: "🐳" },
    { id: 27, name: "Pottwal", scientific: "Physeter macrocephalus", weight: 57, length: 20.5, lifespan: 70, dive: 90, speed: 37, fact: "Gehirn wiegt bis zu 9 Kilogramm – das größte der Tierwelt. Er jagt riesige Tintenfische in der Tiefsee.", emoji: "🐋" },
    { id: 28, name: "Zwergpottwal", scientific: "Kogia breviceps", weight: 4.5, length: 3.8, lifespan: 35, dive: 25, speed: 20, fact: "Setzt bei Gefahr eine tintenartige Kotwolke frei als Ablenkungsmanöver. Nur etwa 3,5 Meter lang.", emoji: "🐳" },
    { id: 29, name: "Kleiner Zwergpottwal", scientific: "Kogia sima", weight: 0.45, length: 2.7, lifespan: 30, dive: 20, speed: 18, fact: "Mit 2,7 Metern der kleinste Wal der Welt. Fast identisch mit seinem großen Bruder, aber deutlich winziger.", emoji: "🐳" },
    { id: 30, name: "Andenkajalvogelwal", scientific: "Berardius arnuxii", weight: 8, length: 12.0, lifespan: 50, dive: 80, speed: 28, fact: "Der einzige Schnabelwal der Südhalbkugel. Sein Name stammt von einem französischen Schiffsarzt.", emoji: "🐋" },
    { id: 31, name: "Bairds Schnabelwal", scientific: "Berardius bairdii", weight: 12, length: 12.8, lifespan: 55, dive: 85, speed: 30, fact: "Größter Vertreter der Schnabelwale mit über 12 Metern Länge. Präferiert tiefe Tiefsee-Gräben.", emoji: "🐋" },
    { id: 32, name: "Indopazifischer Buckelwal", scientific: "Indopacetus pacificus", weight: 13, length: 9.8, lifespan: 60, dive: 45, speed: 25, fact: "Extrem seltene Tiefseeart. Erst zwei Mal lebend gesichtet. Gehört zur gleichen Familie wie Ziphius.", emoji: "🐋" }
];

// Category labels for the UI (German, as displayed in-game)
const categories = {
    weight: { label: "Gewicht", unit: "t", icon: "⚖️", iconText: "🪨" },
    length: { label: "Länge", unit: "m", icon: "📏", iconText: "📏" },
    lifespan: { label: "Lebenserwartung", unit: "J", icon: "⏳", iconText: "⏳" },
    dive: { label: "Tauchgang", unit: "min", icon: "🤿", iconText: "🤿" },
    speed: { label: "Geschwindigkeit", unit: "km/h", icon: "💨", iconText: "💨" }
};

// Fisher-Yates Shuffle
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Deal cards
function dealCards(playerCount) {
    const shuffled = shuffle(whales);
    const hands = [];
    for (let i = 0; i < playerCount; i++) {
        hands.push([]);
    }
    shuffled.forEach((card, index) => {
        hands[index % playerCount].push(card);
    });
    return hands;
}
