// ===================================
// VEHICLEDETAIL.JS - Fahrzeug-Detailseite mit Bildergalerie und technischen Daten
// ===================================
// Diese Datei verwaltet die Anzeige einer einzelnen Fahrzeug-Detailseite.
// Sie lädt Fahrzeugdaten anhand der URL-ID, zeigt diese mit allen Details an
// und implementiert eine intelligente Bildergalerie (einzelnes Bild vs. Multi-Image-Karussell).
// Die Seite zeigt folgende Informationen: Name, Bilder, Beschreibung, Preis, Features,
// technische Daten (Sitzplätze, Kraftstoff, etc.) und Abmessungen (Länge, Gewicht, etc.).
// Ein interaktives Bootstrap-Karussell mit Thumbnails wird verwendet falls mehrere Bilder vorhanden sind.
// Die Datei integriert sich mit calendar.js für den Verfügbarkeitskalender und booking.js für Buchungen.

// Globale Variable für das aktuell angezeigte Fahrzeug
// Diese Variable wird in loadVehicleDetails() gesetzt und von anderen Funktionen verwendet
// Sie ermöglicht Zugriff auf Fahrzeugdaten ohne wiederholte API-Calls
// Wird auch von booking.js benötigt um Buchungen für dieses Fahrzeug zu erstellen
let currentVehicle = null;

// Lädt Fahrzeugdaten aus der Datenbank und initialisiert die Detailseite
// Diese Funktion wird automatisch beim Seiten-Load aufgerufen (siehe DOMContentLoaded unten)
// Sie extrahiert die Fahrzeug-ID aus der URL (z.B. vehicleDetail.html?id=v1)
// und lädt dann alle Fahrzeugdaten vom Backend über die API
// Falls die ID fehlt oder das Fahrzeug nicht existiert wird zur Startseite weitergeleitet
// Die Funktion koordiniert das Rendering aller Komponenten (Info, Bilder, Kalender)
async function loadVehicleDetails() {
    // Extrahiere Vehicle-ID aus URL-Parametern
    // URLSearchParams parst den Query-String (?id=v1&foo=bar)
    // get('id') gibt den Wert des id-Parameters zurück (z.B. 'v1')
    // Diese ID kommt vom Link in der Fahrzeugübersicht (vehicles.js)
    const urlParams = new URLSearchParams(window.location.search);
    const vehicleId = urlParams.get('id');

    // Validierung: ID muss vorhanden sein
    // Falls keine ID in URL: Benutzer hat direkte URL ohne Parameter aufgerufen
    // Weiterleitung zur Startseite da kein Fahrzeug angezeigt werden kann
    if (!vehicleId) {
        window.location.href = '../index.html';
        return;
    }

    // Lade Fahrzeugdaten von der API
    // Dieser Block ist in try-catch um Netzwerkfehler abzufangen
    try {
        // API-Call über data.js Funktion
        // getVehicleById() ruft GET /vehicles/:id auf und gibt Vehicle-Objekt zurück
        currentVehicle = await getVehicleById(vehicleId);

        // Validierung: Fahrzeug muss existieren
        // Falls ID ungültig (z.B. gelöschtes Fahrzeug) gibt API null zurück
        // Zeige Fehlermeldung und leite zur Startseite weiter
        if (!currentVehicle) {
            alert('Fahrzeug nicht gefunden');
            window.location.href = '../index.html';
            return;
        }

        // Erfolgreich geladen: Zeige Fahrzeugdaten an
        // displayVehicleInfo() füllt alle DOM-Elemente mit Fahrzeugdaten
        displayVehicleInfo();

        // Initialisiere Verfügbarkeitskalender für dieses Fahrzeug
        // initCalendar() ist in calendar.js definiert und zeigt gebuchte Tage an
        // Der Kalender lädt automatisch alle Buchungen für diese vehicleId
        initCalendar(vehicleId);
    } catch (error) {
        // Fehlerbehandlung für Netzwerk- oder Server-Fehler
        // Häufigste Ursachen: Server nicht gestartet, falsche URL, CORS-Probleme
        console.error('Fehler beim Laden des Fahrzeugs:', error);
        alert('Fehler beim Laden der Fahrzeugdaten. Ist der Server gestartet?');
        window.location.href = '../index.html';
    }
}

// Zeigt alle Fahrzeuginformationen in der UI an
// Diese Funktion füllt alle DOM-Elemente mit Daten aus dem currentVehicle-Objekt
// Sie rendert: Header mit Namen, Bildergalerie, Beschreibung, Preis, Features,
// technische Daten (Tabelle) und Abmessungen (Tabelle)
// Die Funktion nutzt Template-Literals und Array-Methoden für effizientes Rendering
// Technische Daten und Abmessungen werden aus currentVehicle.details extrahiert
function displayVehicleInfo() {
    // Header: Fahrzeugname anzeigen
    // Dieses h1-Element ist prominent am oberen Seitenrand platziert
    document.getElementById('vehicleName').textContent = currentVehicle.name;

    // Bildergalerie rendern (einzelnes Bild oder Multi-Image-Karussell)
    // Diese Funktion ist ausgelagert da die Logik komplex ist (siehe displayVehicleImages())
    displayVehicleImages();

    // Beschreibung anzeigen
    // Textuelle Beschreibung des Fahrzeugs (z.B. "Geräumiger Camper für 4 Personen...")
    document.getElementById('vehicleDesc').textContent = currentVehicle.desc;

    // Preis anzeigen (in mehreren Stellen)
    // Hauptpreis-Element auf der Seite
    document.getElementById('vehiclePrice').textContent = currentVehicle.price;

    // Preis auch in Preisberechnung aktualisieren (falls Element vorhanden)
    // Das calcPrice-Element ist Teil des Buchungsformulars
    // Es zeigt den Preis pro Nacht für die Berechnung des Gesamtpreises
    const calcPriceEl = document.getElementById('calcPrice');
    if (calcPriceEl) {
        calcPriceEl.textContent = currentVehicle.price;
    }

    // Features als Badge-Liste anzeigen
    // Features ist ein Array wie ['WiFi', 'Klimaanlage', 'Küche']
    // Jedes Feature wird als grüner Badge mit Checkmark-Icon gerendert
    // map() erstellt für jedes Feature einen HTML-String, join('') konkateniert zu einem String
    const featuresContainer = document.getElementById('vehicleFeatures');
    featuresContainer.innerHTML = currentVehicle.features.map(feature =>
        `<span class="feature-badge"><i class="fa-solid fa-check me-1"></i>${feature}</span>`
    ).join('');

    // Technische Daten als Tabelle anzeigen
    // currentVehicle.details.tech ist ein Objekt wie {seats: '4', fuel: 'Diesel', ...}
    // Object.entries() wandelt in Array von [key, value] Paaren um
    // labels-Objekt mapped technische Keys auf deutsche Beschriftungen
    // Resultat ist eine zweispaltige Tabelle mit Bezeichnung und Wert
    const techTable = document.getElementById('techDataTable');
    const tech = currentVehicle.details.tech;
    techTable.innerHTML = Object.entries(tech).map(([key, value]) => {
        // Deutsche Labels für technische Daten-Keys
        // Falls Key nicht im labels-Objekt, wird der Key selbst verwendet (Fallback)
        const labels = {
            seats: 'Sitzplätze',
            fuel: 'Kraftstoff',
            consumption: 'Verbrauch',
            power: 'Leistung',
            license: 'Führerschein',
            emission: 'Emission',
            drive: 'Antrieb'
        };
        return `<tr><th>${labels[key] || key}</th><td>${value}</td></tr>`;
    }).join('');

    // Abmessungen als Tabelle anzeigen
    // Ähnliche Logik wie technische Daten, aber für Dimensionen und Gewichte
    // currentVehicle.details.dims enthält Länge, Breite, Höhe, Gewichte, etc.
    // Diese Informationen sind wichtig für Transport-Planung und Stellplatz-Wahl
    const dimsTable = document.getElementById('dimsDataTable');
    const dims = currentVehicle.details.dims;
    dimsTable.innerHTML = Object.entries(dims).map(([key, value]) => {
        // Deutsche Labels für Abmessungs-Keys
        // zGG = zulässiges Gesamtgewicht (wichtig für Führerschein-Klassen)
        const labels = {
            len: 'Länge',
            width: 'Breite',
            height: 'Höhe',
            empty_weight: 'Leergewicht',
            total_weight: 'zGG',
            towing: 'Anhängelast'
        };
        return `<tr><th>${labels[key] || key}</th><td>${value}</td></tr>`;
    }).join('');
}

// Rendert intelligente Bildergalerie: Einzelbild oder Multi-Image-Karussell
// Diese Funktion implementiert adaptive Bildanzeige basierend auf Anzahl der Bilder:
// - Keine Bilder: Zeige "Keine Bilder verfügbar" Meldung
// - 1 Bild: Zeige einfaches <img> Element (kein Karussell-Overhead)
// - Mehrere Bilder: Zeige Bootstrap Carousel mit Navigation und Thumbnail-Preview
// Das Karussell hat folgende Features: Vor/Zurück-Buttons, Bildnummern-Zähler,
// klickbare Thumbnails unten, automatische Synchronisation zwischen Hauptbild und Thumbnails
// Rückwärtskompatibilität: Falls nur altes 'img' Feld vorhanden, wird dieses verwendet
function displayVehicleImages() {
    // Container-Element für Bildergalerie
    const container = document.getElementById('vehicleImageContainer');

    // Hole images Array mit Fallback-Logik
    // Neue Fahrzeuge haben 'images' Array, alte nur 'img' String-Feld
    // Diese Logik garantiert Rückwärtskompatibilität mit alten Datenbankeinträgen
    let images = currentVehicle.images || [];

    // Fallback: Wenn kein images Array vorhanden, nutze altes img Feld
    // Dies passiert bei Fahrzeugen die vor dem Multi-Image-Update angelegt wurden
    if (!images || images.length === 0) {
        if (currentVehicle.img) {
            // Konvertiere einzelnes img zu Array mit einem Element
            images = [currentVehicle.img];
        } else {
            // Kein Bild vorhanden: Zeige Platzhalter-Meldung
            container.innerHTML = '<p class="text-muted">Keine Bilder verfügbar</p>';
            return;
        }
    }

    // Fall 1: Nur ein Bild vorhanden
    // Zeige einfaches <img> Element ohne Karussell-Komponenten
    // CSS-Klasse 'vehicle-single-image' sorgt für responsive Darstellung
    // Vorteil: Kein JavaScript-Overhead für unnötige Karussell-Funktionalität
    if (images.length === 1) {
        container.innerHTML = `
            <img src="${images[0]}"
                 class="vehicle-single-image"
                 alt="${currentVehicle.name}">
        `;
        return;
    }

    // Fall 2: Mehrere Bilder vorhanden - Bootstrap Carousel erstellen
    // ID für Bootstrap Carousel (wird für data-bs-target Referenzen benötigt)
    const carouselId = 'vehicleCarousel';

    // Carousel Items: Haupt-Slides mit vollformatigen Bildern
    // Jedes Bild wird als carousel-item gerendert
    // Das erste Bild bekommt 'active' Klasse um initial sichtbar zu sein
    // index + 1 in alt-Text für bessere Accessibility (Screen-Reader)
    const carouselItems = images.map((imgUrl, index) => `
        <div class="carousel-item ${index === 0 ? 'active' : ''}">
            <img src="${imgUrl}" alt="${currentVehicle.name} - Bild ${index + 1}">
        </div>
    `).join('');

    // Thumbnails: Klickbare Vorschau-Bilder unter dem Hauptbild
    // Jeder Thumbnail ist ein kleines Vorschaubild mit onclick-Handler
    // data-index Attribut speichert Index für goToSlide() Funktion
    // Erster Thumbnail ist initial aktiv (hervorgehoben)
    const thumbnails = images.map((imgUrl, index) => `
        <div class="carousel-thumbnail ${index === 0 ? 'active' : ''}"
             onclick="goToSlide(${index})"
             data-index="${index}">
            <img src="${imgUrl}" alt="Vorschau ${index + 1}">
        </div>
    `).join('');

    // Vollständiges Karussell HTML generieren
    // Bootstrap Carousel mit zusätzlichen Custom-Features:
    // - Bild-Zähler oben rechts (z.B. "2 / 5")
    // - Prev/Next Buttons für Navigation
    // - Thumbnails unter dem Hauptbild
    // data-bs-ride="false" deaktiviert Auto-Play (Bilder wechseln nur bei User-Interaktion)
    container.innerHTML = `
        <div id="${carouselId}" class="carousel slide vehicle-carousel" data-bs-ride="false">
            <!-- Bild-Zähler -->
            <div class="carousel-image-counter">
                <span id="currentImageIndex">1</span> / ${images.length}
            </div>

            <!-- Carousel Inner -->
            <div class="carousel-inner">
                ${carouselItems}
            </div>

            <!-- Navigation Controls -->
            ${images.length > 1 ? `
                <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Vorheriges</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Nächstes</span>
                </button>
            ` : ''}
        </div>

        <!-- Thumbnail Preview -->
        ${images.length > 1 ? `
            <div class="carousel-thumbnails">
                ${thumbnails}
            </div>
        ` : ''}
    `;

    // JavaScript-Logik für Karussell-Interaktivität (nur bei mehreren Bildern)
    // Diese Logik bindet Bootstrap Carousel ein und fügt Custom-Features hinzu
    if (images.length > 1) {
        // Hole Carousel DOM-Element
        const carouselElement = document.getElementById(carouselId);
        if (!carouselElement) {
            console.error('Carousel element not found');
            return;
        }

        // Initialisiere Bootstrap Carousel mit Custom-Options
        // interval: false = Kein automatisches Durchlaufen der Bilder
        // wrap: true = Nach letztem Bild wieder zum ersten springen (Endlos-Loop)
        const bsCarousel = new bootstrap.Carousel(carouselElement, {
            interval: false,
            wrap: true
        });

        // Event-Listener für Slide-Wechsel
        // 'slid.bs.carousel' wird gefeuert NACHDEM Slide-Animation abgeschlossen ist
        // event.to enthält den Index des neuen aktiven Slides (0-basiert)
        // Dieser Listener aktualisiert Zähler und Thumbnail-Hervorhebung
        carouselElement.addEventListener('slid.bs.carousel', function(event) {
            const currentIndex = event.to;

            // Aktualisiere Bildnummern-Zähler
            // Zeigt "3 / 5" für drittes von fünf Bildern
            // +1 weil Index 0-basiert ist aber Anzeige 1-basiert sein soll
            const counterElement = document.getElementById('currentImageIndex');
            if (counterElement) {
                counterElement.textContent = currentIndex + 1;
            }

            // Aktualisiere aktive Thumbnail-Hervorhebung
            // Entferne 'active' Klasse von allen Thumbnails
            // Füge 'active' nur zum Thumbnail des aktuellen Bildes hinzu
            // Dies synchronisiert Thumbnail-Hervorhebung mit Hauptbild
            document.querySelectorAll('.carousel-thumbnail').forEach((thumb, idx) => {
                thumb.classList.toggle('active', idx === currentIndex);
            });
        });

        // Speichere Carousel-Instanz global für goToSlide() Zugriff
        // goToSlide() wird von Thumbnail-Clicks aufgerufen und braucht Zugriff auf Carousel
        // window-Scope ermöglicht Zugriff von onclick-Attributen im HTML
        window.vehicleCarouselInstance = bsCarousel;
    }
}

// Springt zu einem bestimmten Slide im Karussell (von Thumbnail geklickt)
// Diese Funktion wird aufgerufen wenn Benutzer auf einen Thumbnail klickt
// Sie nutzt die Bootstrap Carousel API um direkt zum gewünschten Bild zu springen
// Parameter: index - 0-basierter Index des Ziel-Slides (0 = erstes Bild, 1 = zweites, etc.)
// Die Funktion prüft ob Carousel-Instanz existiert (Sicherheit gegen Race-Conditions)
function goToSlide(index) {
    // Prüfe ob Carousel-Instanz verfügbar ist
    // Diese wurde in displayVehicleImages() als window.vehicleCarouselInstance gespeichert
    if (window.vehicleCarouselInstance) {
        // Bootstrap Carousel to() Methode: Springt zu Slide mit gegebenem Index
        // Triggert automatisch Slide-Animation und 'slid.bs.carousel' Event
        // Das Event aktualisiert dann Zähler und Thumbnail-Hervorhebung
        window.vehicleCarouselInstance.to(index);
    }
}

// Automatische Initialisierung beim Seiten-Load
// Diese Logik garantiert dass loadVehicleDetails() genau einmal aufgerufen wird
// sobald das DOM vollständig geladen ist
// Zwei Fälle werden abgedeckt:
// Fall 1: Script lädt während HTML noch parst (readyState === 'loading')
//         -> Warte auf DOMContentLoaded Event
// Fall 2: Script lädt nachdem DOM bereits fertig ist (async/defer Attribute)
//         -> Rufe loadVehicleDetails() sofort auf
// Diese Technik ist Standard für DOM-abhängigen Code
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadVehicleDetails);
} else {
    loadVehicleDetails();
}
