// VEHICLES.JS - Fahrzeugübersicht mit Filter-Funktionalität
// Diese Datei verwaltet die Hauptseite mit der Fahrzeugübersicht.
// Sie lädt alle verfügbaren Fahrzeuge aus der Datenbank und zeigt sie als Karten-Grid an.
// Benutzer können Fahrzeuge nach verschiedenen Kriterien filtern: Freitext-Suche, Kraftstoff,
// Anzahl Betten und maximaler Preis. Die Filter arbeiten kombiniert (UND-Verknüpfung).
// Die Darstellung nutzt Thumbnail-API für optimierte Performance und lazy loading.
// Jede Fahrzeugkarte ist klickbar und führt zur Detailseite des jeweiligen Fahrzeugs.

// Globale Variable speichert alle geladenen Fahrzeuge
let allVehicles = [];

// Aktualisiert die Preis-Anzeige neben dem Range-Slider
// Zeigt den aktuellen Slider-Wert im Label an
function updatePriceLabel() {
    const priceSlider = document.getElementById('filterPrice');
    const priceLabel = document.getElementById('priceValue');

    if (priceSlider && priceLabel) {
        priceLabel.textContent = priceSlider.value;
    }
}

// Wendet alle aktiven Filter auf die Fahrzeugliste an
// UND-Verknüpfung: Fahrzeug muss alle Filter erfüllen
function applyFilters() {
    const searchTerm = document.getElementById('filterSearch')?.value.toLowerCase() || '';
    const fuelFilter = document.getElementById('filterFuel')?.value || '';
    const bedsFilter = document.getElementById('filterBeds')?.value || '';
    const maxPrice = parseInt(document.getElementById('filterPrice')?.value) || 999;

    const filtered = allVehicles.filter(vehicle => {
        const matchesSearch = !searchTerm ||
            vehicle.name.toLowerCase().includes(searchTerm) ||
            vehicle.desc.toLowerCase().includes(searchTerm);

        const matchesFuel = !fuelFilter || vehicle.fuel === fuelFilter;

        const matchesBeds = !bedsFilter || vehicle.beds === parseInt(bedsFilter);

        const matchesPrice = vehicle.price <= maxPrice;

        return matchesSearch && matchesFuel && matchesBeds && matchesPrice;
    });

    renderVehicles(filtered);
}

// Setzt alle Filter auf Standardwerte zurück
// Zeigt wieder alle Fahrzeuge an
function resetFilters() {
    const searchInput = document.getElementById('filterSearch');
    const fuelSelect = document.getElementById('filterFuel');
    const bedsSelect = document.getElementById('filterBeds');
    const priceSlider = document.getElementById('filterPrice');

    if (searchInput) searchInput.value = '';
    if (fuelSelect) fuelSelect.value = '';
    if (bedsSelect) bedsSelect.value = '';
    if (priceSlider) {
        priceSlider.value = 200;
        updatePriceLabel();
    }

    renderVehicles(allVehicles);
}

// Rendert die Fahrzeuge als Karten-Grid im DOM
// Erstellt Bootstrap Cards mit Bild, Infos und Preis
function renderVehicles(vehicles) {
    const container = document.getElementById('vehicleList');
    if (!container) return;

    if (vehicles.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fa-solid fa-info-circle me-2"></i>
                    Keine Fahrzeuge gefunden. Versuchen Sie andere Filter.
                </div>
            </div>
        `;
        return;
    }

    const cardsHTML = vehicles.map(vehicle => {
        const imageUrl = vehicle.images && vehicle.images.length > 0
            ? vehicle.images[0]
            : (vehicle.img || 'https://via.placeholder.com/400x250?text=Kein+Bild');

        const thumbnailUrl = `http://localhost:3000/thumbnail?url=${encodeURIComponent(imageUrl)}&width=400&height=250`;
        const fallbackUrl = imageUrl;

        return `
            <div class="col-lg-4 col-md-6">
                <div class="vehicle-card" onclick="goToVehicle('${vehicle.id}')">
                    <div class="vehicle-image">
                        <img src="${thumbnailUrl}"
                             alt="${vehicle.name}"
                             onerror="this.onerror=null; this.src='${fallbackUrl}';"
                             loading="lazy">
                        ${vehicle.images && vehicle.images.length > 1 ? `
                            <div class="image-count-badge">
                                <i class="fa-solid fa-images"></i> ${vehicle.images.length}
                            </div>
                        ` : ''}
                    </div>
                    <div class="vehicle-info">
                        <h5 class="vehicle-name">${vehicle.name}</h5>
                        <div class="vehicle-features">
                            <span><i class="fa-solid fa-bed"></i> ${vehicle.beds} Betten</span>
                            <span><i class="fa-solid fa-gas-pump"></i> ${vehicle.fuel}</span>
                        </div>
                        <div class="vehicle-price">
                            <strong>${vehicle.price}€</strong> / Nacht
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsHTML;
}

// Lädt alle Fahrzeuge aus der Datenbank und zeigt sie an
// Wird automatisch beim Seiten-Load aufgerufen
async function displayVehicles() {
    try {
        allVehicles = await getAllVehicles();

        if (allVehicles.length === 0) {
            const container = document.getElementById('vehicleList');
            if (container) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-warning text-center">
                            <i class="fa-solid fa-exclamation-triangle me-2"></i>
                            Keine Fahrzeuge verfügbar.
                        </div>
                    </div>
                `;
            }
            return;
        }

        renderVehicles(allVehicles);
    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeuge:', error);
        const container = document.getElementById('vehicleList');
        if (container) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger text-center">
                        <i class="fa-solid fa-exclamation-circle me-2"></i>
                        Fehler beim Laden der Fahrzeuge. Ist der Server gestartet?
                    </div>
                </div>
            `;
        }
    }
}

// Navigiert zur Detailseite eines Fahrzeugs
function goToVehicle(vehicleId) {
    window.location.href = `pages/fahrzeug.html?id=${vehicleId}`;
}

// Scrollt sanft zur Fahrzeugliste
// Wird vom Hero-Button aufgerufen
function scrollToFleet() {
    const section = document.getElementById('fahrzeuge');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Automatische Initialisierung beim Seiten-Load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', displayVehicles);
} else {
    displayVehicles();
}
