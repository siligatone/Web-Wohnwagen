/* ===================================
   VEHICLEDETAIL.JS - Fahrzeug-Detailseite
   =================================== */

let currentVehicle = null;

// Fahrzeug-Details laden und anzeigen
async function loadVehicleDetails() {
    // Hole Vehicle ID aus URL
    const urlParams = new URLSearchParams(window.location.search);
    const vehicleId = urlParams.get('id');

    if (!vehicleId) {
        window.location.href = '../index.html';
        return;
    }

    try {
        // Lade Fahrzeug aus Datenbank
        currentVehicle = await getVehicleById(vehicleId);

        if (!currentVehicle) {
            alert('Fahrzeug nicht gefunden');
            window.location.href = '../index.html';
            return;
        }

        // Anzeigen
        displayVehicleInfo();
        initCalendar(vehicleId);
    } catch (error) {
        console.error('Fehler beim Laden des Fahrzeugs:', error);
        alert('Fehler beim Laden der Fahrzeugdaten. Ist der Server gestartet?');
        window.location.href = '../index.html';
    }
}

// Fahrzeug-Informationen anzeigen
function displayVehicleInfo() {
    // Header
    document.getElementById('vehicleName').textContent = currentVehicle.name;

    // Bildergalerie anzeigen
    displayVehicleImages();

    // Beschreibung
    document.getElementById('vehicleDesc').textContent = currentVehicle.desc;

    // Preis
    document.getElementById('vehiclePrice').textContent = currentVehicle.price;
    // Preis-Element in Preisberechnung (falls vorhanden)
    const calcPriceEl = document.getElementById('calcPrice');
    if (calcPriceEl) {
        calcPriceEl.textContent = currentVehicle.price;
    }

    // Features
    const featuresContainer = document.getElementById('vehicleFeatures');
    featuresContainer.innerHTML = currentVehicle.features.map(feature =>
        `<span class="feature-badge"><i class="fa-solid fa-check me-1"></i>${feature}</span>`
    ).join('');

    // Technische Daten
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

    // Abmessungen
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

// Bildergalerie anzeigen (einzelnes Bild oder Karussell)
function displayVehicleImages() {
    const container = document.getElementById('vehicleImageContainer');

    // Hole images Array (Fallback auf img Feld für Rückwärtskompatibilität)
    let images = currentVehicle.images || [];

    // Fallback: Wenn kein images Array, nutze img Feld
    if (!images || images.length === 0) {
        if (currentVehicle.img) {
            images = [currentVehicle.img];
        } else {
            container.innerHTML = '<p class="text-muted">Keine Bilder verfügbar</p>';
            return;
        }
    }

    // Wenn nur 1 Bild: Zeige einfaches Bild
    if (images.length === 1) {
        container.innerHTML = `
            <img src="${images[0]}"
                 class="vehicle-single-image"
                 alt="${currentVehicle.name}">
        `;
        return;
    }

    // Mehrere Bilder: Bootstrap Karussell erstellen
    const carouselId = 'vehicleCarousel';

    // Carousel Items
    const carouselItems = images.map((imgUrl, index) => `
        <div class="carousel-item ${index === 0 ? 'active' : ''}">
            <img src="${imgUrl}" alt="${currentVehicle.name} - Bild ${index + 1}">
        </div>
    `).join('');

    // Thumbnails
    const thumbnails = images.map((imgUrl, index) => `
        <div class="carousel-thumbnail ${index === 0 ? 'active' : ''}"
             onclick="goToSlide(${index})"
             data-index="${index}">
            <img src="${imgUrl}" alt="Vorschau ${index + 1}">
        </div>
    `).join('');

    // Vollständiges Karussell HTML
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

    // Event Listener für Slide-Wechsel
    if (images.length > 1) {
        const carouselElement = document.getElementById(carouselId);
        if (!carouselElement) {
            console.error('Carousel element not found');
            return;
        }

        const bsCarousel = new bootstrap.Carousel(carouselElement, {
            interval: false, // Kein automatisches Wechseln
            wrap: true
        });

        // Update Zähler und aktive Thumbnail bei Slide-Wechsel
        carouselElement.addEventListener('slid.bs.carousel', function(event) {
            const currentIndex = event.to;
            const counterElement = document.getElementById('currentImageIndex');
            if (counterElement) {
                counterElement.textContent = currentIndex + 1;
            }

            // Update aktive Thumbnail
            document.querySelectorAll('.carousel-thumbnail').forEach((thumb, idx) => {
                thumb.classList.toggle('active', idx === currentIndex);
            });
        });

        // Speichere Carousel-Instanz global für goToSlide()
        window.vehicleCarouselInstance = bsCarousel;
    }
}

// Zu bestimmtem Slide springen (von Thumbnail)
function goToSlide(index) {
    if (window.vehicleCarouselInstance) {
        window.vehicleCarouselInstance.to(index);
    }
}

// Bei DOM-Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadVehicleDetails);
} else {
    loadVehicleDetails();
}
