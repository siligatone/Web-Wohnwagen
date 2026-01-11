// Diese Datei stellt alle API-Funktionen bereit, die das Frontend benötigt um mit dem Backend zu kommunizieren.
// Sie enthält generische HTTP-Methoden (GET, POST, PUT, DELETE) und spezialisierte Funktionen für Users, Vehicles und Bookings.
// Alle Funktionen sind asynchron (async/await) um moderne, nicht-blockierende API-Calls zu ermöglichen.

// Basis-URL für alle API-Anfragen
const API_BASE_URL = 'http://localhost:3000';

// GET-Request an einen beliebigen Endpoint
// Ruft Daten vom Server ab
async function apiGet(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API GET Error:', error);
        throw error;
    }
}

// POST-Request um neue Ressourcen zu erstellen
// Sendet Daten als JSON an den Server
async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API POST Error:', error);
        throw error;
    }
}

// PUT-Request um existierende Ressourcen zu aktualisieren
// Ersetzt die gesamte Ressource mit neuen Daten
async function apiPut(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API PUT Error:', error);
        throw error;
    }
}

// DELETE-Request um Ressourcen zu löschen
// Entfernt Datensätze permanent vom Server
async function apiDelete(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error('API DELETE Error:', error);
        throw error;
    }
}

// User API - Benutzerverwaltung

// Ruft alle Benutzer ab
async function fetchAllUsers() {
    return await apiGet('/users');
}

// Ruft einen Benutzer anhand der ID ab
async function fetchUserById(userId) {
    return await apiGet(`/users/${userId}`);
}

// Sucht einen Benutzer anhand der Email-Adresse
// Gibt ersten Treffer zurück oder null
async function fetchUserByEmail(email) {
    const users = await apiGet(`/users?email=${email}`);
    return users.length > 0 ? users[0] : null;
}

// Erstellt einen neuen Benutzer
// Gibt das User-Objekt mit generierter ID zurück
async function createUser(userData) {
    return await apiPost('/users', userData);
}

// Aktualisiert einen existierenden Benutzer
async function updateUser(userId, userData) {
    return await apiPut(`/users/${userId}`, userData);
}

// Löscht einen Benutzer
async function deleteUser(userId) {
    return await apiDelete(`/users/${userId}`);
}

// Vehicle API - Fahrzeugverwaltung

// Ruft alle Fahrzeuge ab
async function fetchAllVehicles() {
    return await apiGet('/vehicles');
}

// Ruft ein Fahrzeug anhand der ID ab
async function fetchVehicleById(vehicleId) {
    return await apiGet(`/vehicles/${vehicleId}`);
}

// Ruft alle Fahrzeuge eines Anbieters ab
// Filtert nach provider_id
async function fetchVehiclesByProvider(providerId) {
    return await apiGet(`/vehicles?provider_id=${providerId}`);
}

// Erstellt ein neues Fahrzeug
async function createVehicle(vehicleData) {
    return await apiPost('/vehicles', vehicleData);
}

// Aktualisiert ein existierendes Fahrzeug
async function updateVehicle(vehicleId, vehicleData) {
    return await apiPut(`/vehicles/${vehicleId}`, vehicleData);
}

// Löscht ein Fahrzeug
async function deleteVehicle(vehicleId) {
    return await apiDelete(`/vehicles/${vehicleId}`);
}

// Booking API - Buchungsverwaltung

// Ruft alle Buchungen ab
async function fetchAllBookings() {
    return await apiGet('/bookings');
}

// Ruft eine Buchung anhand der ID ab
async function fetchBookingById(bookingId) {
    return await apiGet(`/bookings/${bookingId}`);
}

// Ruft alle Buchungen eines Benutzers ab
// Filtert nach user_id
async function fetchBookingsByUser(userId) {
    return await apiGet(`/bookings?user_id=${userId}`);
}

// Ruft alle Buchungen für ein Fahrzeug ab
// Filtert nach vehicle_id
async function fetchBookingsByVehicle(vehicleId) {
    return await apiGet(`/bookings?vehicle_id=${vehicleId}`);
}

// Erstellt eine neue Buchung
async function createBooking(bookingData) {
    return await apiPost('/bookings', bookingData);
}

// Aktualisiert eine existierende Buchung
async function updateBooking(bookingId, bookingData) {
    return await apiPut(`/bookings/${bookingId}`, bookingData);
}

// Löscht eine Buchung (Stornierung)
async function deleteBooking(bookingId) {
    return await apiDelete(`/bookings/${bookingId}`);
}

// Helper-Funktionen

// Generiert eine eindeutige ID mit Prefix, Timestamp und Zufallsstring
// Format: prefix_timestamp_randomstring
function generateUniqueId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Prüft ob ein Datumsbereich für ein Fahrzeug bereits gebucht ist
// Gibt true zurück bei Überlappung, false wenn verfügbar
async function isDateRangeBookedAPI(vehicleId, startDate, endDate) {
    const bookings = await fetchBookingsByVehicle(vehicleId);
    const start = new Date(startDate);
    const end = new Date(endDate);

    return bookings.some(booking => {
        const bStart = new Date(booking.start);
        const bEnd = new Date(booking.end);
        return (start <= bEnd && end >= bStart);
    });
}
