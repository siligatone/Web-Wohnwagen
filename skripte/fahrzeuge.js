/* ===================================
   VEHICLES.JS - Fahrzeug-Liste auf index.html
   =================================== */

// ========================================
// GLOBALE VARIABLEN
// ========================================
// Speichert alle geladenen Fahrzeuge für Filterung
let allVehicles = [];

// ========================================
// FILTER-FUNKTIONEN
// ========================================

/**
 * Aktualisiert die Preis-Anzeige im Filter
 * Wird aufgerufen bei Bewegung des Range-Sliders
 */
function updatePriceLabel() {
    const priceSlider = document.getElementById('filterPrice');
    const priceLabel = document.getElementById('priceValue');
    if (priceSlider && priceLabel) {
        priceLabel.textContent = priceSlider.value;
    }
}

/**
 * HAUPTFUNKTION: Wendet alle aktiven Filter auf Fahrzeuge an
 * Wird aufgerufen bei jeder Filteränderung (onchange/oninput)
 * 
 * Filter-Logik:
 * 1. Holt aktuelle Filterwerte aus den Formular-Elementen
 * 2. Durchläuft alle Fahrzeuge und prüft Kriterien
 * 3. Zeigt nur gefilterte Fahrzeuge an
 * 
 * Filter-Kriterien:
 * - searchText: Durchsucht Name und Beschreibung (case-insensitive)
 * - fuel: Kraftstoffart (exakte Übereinstimmung)
 * - beds: Anzahl Betten (exakte Übereinstimmung)
 * - price: Maximaler Preis pro Nacht
 */
function applyFilters() {
    // Filterwerte aus den Input-Elementen holen
    const searchText = document.getElementById('filterSearch')?.value.toLowerCase().trim() || '';
    const fuelFilter = document.getElementById('filterFuel')?.value || '';
    const bedsFilter = document.getElementById('filterBeds')?.value || '';
    const priceFilter = parseInt(document.getElementById('filterPrice')?.value || '200');

    // Fahrzeuge nach allen Kriterien filtern
    const filteredVehicles = allVehicles.filter(vehicle => {
        // Prüfung 0: Freitext-Suche in Name und Beschreibung (case-insensitive)
        const matchesSearch = !searchText || 
            vehicle.name.toLowerCase().includes(searchText) || 
            vehicle.desc.toLowerCase().includes(searchText);
        
        // Prüfung 1: Kraftstoff-Filter (falls ausgewählt)
        const matchesFuel = !fuelFilter || vehicle.fuel === fuelFilter;
        
        // Prüfung 2: Betten-Filter (falls ausgewählt)
        const matchesBeds = !bedsFilter || vehicle.beds === parseInt(bedsFilter);
        
        // Prüfung 3: Preis-Filter (muss immer erfüllt sein)
        const matchesPrice = vehicle.price <= priceFilter;

        // Fahrzeug wird nur angezeigt, wenn ALLE Filter zutreffen
        return matchesSearch && matchesFuel && matchesBeds && matchesPrice;
    });

    // Gefilterte Fahrzeuge anzeigen
    renderVehicles(filteredVehicles);
}

/**
 * Setzt alle Filter auf Standardwerte zurück
 * und zeigt wieder alle Fahrzeuge an
 */
function resetFilters() {
    // Filter-Inputs auf Standardwerte setzen
    const searchFilter = document.getElementById('filterSearch');
    const fuelFilter = document.getElementById('filterFuel');
    const bedsFilter = document.getElementById('filterBeds');
    const priceFilter = document.getElementById('filterPrice');
    
    if (searchFilter) searchFilter.value = '';
    if (fuelFilter) fuelFilter.value = '';
    if (bedsFilter) bedsFilter.value = '';
    if (priceFilter) priceFilter.value = '200';
    
    // Preis-Label aktualisieren
    updatePriceLabel();
    
    // Alle Fahrzeuge wieder anzeigen
    renderVehicles(allVehicles);
}

// ========================================
// FAHRZEUG-ANZEIGE FUNKTIONEN
// ========================================

/**
 * Rendert eine Liste von Fahrzeugen im HTML
 * @param {Array} vehicles - Array von Fahrzeug-Objekten
 */
function renderVehicles(vehicles) {
    const container = document.getElementById('vehicleList');
    if (!container) return;

    // Wenn keine Fahrzeuge gefunden wurden
    if (vehicles.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fa-solid fa-filter-circle-xmark fa-3x text-muted mb-3"></i>
                <p class="text-muted">Keine Fahrzeuge entsprechen Ihren Filterkriterien.</p>
                <button class="btn btn-primary mt-2" onclick="resetFilters()">
                    Filter zurücksetzen
                </button>
            </div>
        `;
        return;
    }

    // Fahrzeug-Karten generieren
    container.innerHTML = vehicles.map(vehicle => {
        // Hole erstes Bild (Fallback auf img Feld)
        const imageUrl = (vehicle.images && vehicle.images.length > 0) ? vehicle.images[0] : vehicle.img;

        return `
        <div class="col-md-6 col-lg-4">
            <div class="card vehicle-card h-100" onclick="goToVehicle('${vehicle.id}')">
                <img src="${imageUrl}" class="card-img-top" alt="${vehicle.name}">
                <div class="card-body">
                    <h5 class="card-title fw-bold">${vehicle.name}</h5>
                    <p class="card-text text-muted small">${vehicle.desc.substring(0, 100)}...</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div>
                            <span class="badge bg-secondary me-1">
                                <i class="fa-solid fa-bed me-1"></i>${vehicle.beds} Betten
                            </span>
                            <span class="badge bg-secondary">
                                <i class="fa-solid fa-gas-pump me-1"></i>${vehicle.fuel}
                            </span>
                        </div>
                        <div class="text-primary fw-bold fs-5">${vehicle.price}€<small class="text-muted fs-6">/Nacht</small></div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

/**
 * HAUPTFUNKTION: Lädt alle Fahrzeuge und zeigt sie an
 * Wird beim Seitenaufruf aufgerufen
 */
async function displayVehicles() {
    const container = document.getElementById('vehicleList');
    if (!container) return;

    try {
        // Fahrzeuge von API/Datenbank laden
        const vehicles = await getAllVehicles();
        
        // In globaler Variable speichern für Filter
        allVehicles = vehicles;

        // Alle Fahrzeuge initial anzeigen
        renderVehicles(allVehicles);
        
    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeuge:', error);
        container.innerHTML = '<div class="col-12 text-center py-5"><div class="alert alert-danger">Fehler beim Laden der Fahrzeuge. Ist der Server gestartet?</div></div>';
    }
}

// Zu Fahrzeug-Detailseite navigieren
function goToVehicle(vehicleId) {
    window.location.href = `seiten/fahrzeug.html?id=${vehicleId}`;
}

// Smooth Scroll zu Fahrzeug-Liste
function scrollToFleet() {
    const fleetSection = document.getElementById('fahrzeuge');
    if (fleetSection) {
        fleetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Bei DOM-Ready Fahrzeuge laden
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', displayVehicles);
} else {
    displayVehicles();
}
