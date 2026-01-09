/* ===================================
   VEHICLES.JS - Fahrzeug-Liste auf index.html
   =================================== */

// Alle Fahrzeuge auf der Startseite anzeigen
async function displayVehicles() {
    const container = document.getElementById('vehicleList');
    if (!container) return;

    try {
        const vehicles = await getAllVehicles();

        if (vehicles.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">Keine Fahrzeuge verfügbar.</p></div>';
            return;
        }

        container.innerHTML = vehicles.map(vehicle => `
            <div class="col-md-6 col-lg-4">
                <div class="card vehicle-card h-100" onclick="goToVehicle('${vehicle.id}')">
                    <img src="${vehicle.img}" class="card-img-top" alt="${vehicle.name}">
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
        `).join('');
    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeuge:', error);
        container.innerHTML = '<div class="col-12 text-center py-5"><div class="alert alert-danger">Fehler beim Laden der Fahrzeuge. Ist der Server gestartet?</div></div>';
    }
}

// Zu Fahrzeug-Detailseite navigieren
function goToVehicle(vehicleId) {
    window.location.href = `pages/fahrzeug.html?id=${vehicleId}`;
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
