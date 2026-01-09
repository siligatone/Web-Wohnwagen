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
    document.getElementById('vehicleImage').src = currentVehicle.img;
    document.getElementById('vehicleImage').alt = currentVehicle.name;

    // Beschreibung
    document.getElementById('vehicleDesc').textContent = currentVehicle.desc;

    // Preis
    document.getElementById('vehiclePrice').textContent = currentVehicle.price;
    document.getElementById('pricePerNight').textContent = currentVehicle.price;

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

// Bei DOM-Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadVehicleDetails);
} else {
    loadVehicleDetails();
}
