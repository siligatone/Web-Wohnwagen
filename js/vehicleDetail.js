// VEHICLEDETAIL.JS - Fahrzeug-Detailseite mit Bildergalerie und technischen Daten
// Diese Datei verwaltet die Anzeige einer einzelnen Fahrzeug-Detailseite.
// Sie lädt Fahrzeugdaten anhand der URL-ID, zeigt diese mit allen Details an
// und implementiert eine intelligente Bildergalerie (einzelnes Bild vs. Multi-Image-Karussell).
// Die Seite zeigt folgende Informationen: Name, Bilder, Beschreibung, Preis, Features,
// technische Daten (Sitzplätze, Kraftstoff, etc.) und Abmessungen (Länge, Gewicht, etc.).
// Ein interaktives Bootstrap-Karussell mit Thumbnails wird verwendet falls mehrere Bilder vorhanden sind.
// Die Datei integriert sich mit calendar.js für den Verfügbarkeitskalender und booking.js für Buchungen.

// Globale Variable für das aktuell angezeigte Fahrzeug
let currentVehicle = null;

// Lädt Fahrzeugdaten aus der Datenbank und initialisiert die Detailseite
// Extrahiert die Fahrzeug-ID aus der URL und rendert alle Komponenten
async function loadVehicleDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const vehicleId = urlParams.get('id');

    if (!vehicleId) {
        window.location.href = '../index.html';
        return;
    }

    try {
        currentVehicle = await getVehicleById(vehicleId);

        if (!currentVehicle) {
            alert('Fahrzeug nicht gefunden');
            window.location.href = '../index.html';
            return;
        }

        displayVehicleInfo();
        initCalendar(vehicleId);
    } catch (error) {
        console.error('Fehler beim Laden des Fahrzeugs:', error);
        alert('Fehler beim Laden der Fahrzeugdaten. Ist der Server gestartet?');
        window.location.href = '../index.html';
    }
}

// Zeigt alle Fahrzeuginformationen in der UI an
// Rendert Header, Bildergalerie, Beschreibung, Preis, Features und technische Daten
function displayVehicleInfo() {
    document.getElementById('vehicleName').textContent = currentVehicle.name;
    displayVehicleImages();
    document.getElementById('vehicleDesc').textContent = currentVehicle.desc;
    document.getElementById('vehiclePrice').textContent = currentVehicle.price;

    const calcPriceEl = document.getElementById('calcPrice');
    if (calcPriceEl) {
        calcPriceEl.textContent = currentVehicle.price;
    }

    // Features als Badge-Liste
    const featuresContainer = document.getElementById('vehicleFeatures');
    featuresContainer.innerHTML = currentVehicle.features.map(feature =>
        `<span class="feature-badge"><i class="fa-solid fa-check me-1"></i>${feature}</span>`
    ).join('');

    // Technische Daten als Tabelle
    const techTable = document.getElementById('techDataTable');
    const tech = currentVehicle.details.tech;
    techTable.innerHTML = Object.entries(tech).map(([key, value]) => {
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

    // Abmessungen als Tabelle
    const dimsTable = document.getElementById('dimsDataTable');
    const dims = currentVehicle.details.dims;
    dimsTable.innerHTML = Object.entries(dims).map(([key, value]) => {
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
// Zeigt einfaches Bild bei einem Foto, Bootstrap Carousel mit Thumbnails bei mehreren
function displayVehicleImages() {
    const container = document.getElementById('vehicleImageContainer');
    let images = currentVehicle.images || [];

    if (!images || images.length === 0) {
        if (currentVehicle.img) {
            images = [currentVehicle.img];
        } else {
            container.innerHTML = '<p class="text-muted">Keine Bilder verfügbar</p>';
            return;
        }
    }

    // Fall 1: Nur ein Bild
    if (images.length === 1) {
        container.innerHTML = `
            <img src="${images[0]}"
                 class="vehicle-single-image"
                 alt="${currentVehicle.name}">
        `;
        return;
    }

    // Fall 2: Mehrere Bilder - Bootstrap Carousel
    const carouselId = 'vehicleCarousel';

    const carouselItems = images.map((imgUrl, index) => `
        <div class="carousel-item ${index === 0 ? 'active' : ''}">
            <img src="${imgUrl}" alt="${currentVehicle.name} - Bild ${index + 1}">
        </div>
    `).join('');

    const thumbnails = images.map((imgUrl, index) => `
        <div class="carousel-thumbnail ${index === 0 ? 'active' : ''}"
             onclick="goToSlide(${index})"
             data-index="${index}">
            <img src="${imgUrl}" alt="Vorschau ${index + 1}">
        </div>
    `).join('');

    container.innerHTML = `
        <div id="${carouselId}" class="carousel slide vehicle-carousel" data-bs-ride="false">
            <div class="carousel-image-counter">
                <span id="currentImageIndex">1</span> / ${images.length}
            </div>

            <div class="carousel-inner">
                ${carouselItems}
            </div>

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

        ${images.length > 1 ? `
            <div class="carousel-thumbnails">
                ${thumbnails}
            </div>
        ` : ''}
    `;

    // Carousel-Interaktivität initialisieren
    if (images.length > 1) {
        const carouselElement = document.getElementById(carouselId);
        if (!carouselElement) {
            console.error('Carousel element not found');
            return;
        }

        const bsCarousel = new bootstrap.Carousel(carouselElement, {
            interval: false,
            wrap: true
        });

        // Event-Listener für Slide-Wechsel
        // Aktualisiert Zähler und Thumbnail-Hervorhebung
        carouselElement.addEventListener('slid.bs.carousel', function(event) {
            const currentIndex = event.to;

            const counterElement = document.getElementById('currentImageIndex');
            if (counterElement) {
                counterElement.textContent = currentIndex + 1;
            }

            document.querySelectorAll('.carousel-thumbnail').forEach((thumb, idx) => {
                thumb.classList.toggle('active', idx === currentIndex);
            });
        });

        window.vehicleCarouselInstance = bsCarousel;
    }
}

// Springt zu einem bestimmten Slide im Karussell
// Wird von Thumbnail-Clicks aufgerufen
function goToSlide(index) {
    if (window.vehicleCarouselInstance) {
        window.vehicleCarouselInstance.to(index);
    }
}

// Automatische Initialisierung beim Seiten-Load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadVehicleDetails);
} else {
    loadVehicleDetails();
}
