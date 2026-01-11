// ===================================
// API.JS - Zentrale API-Kommunikation für CamperRent Frontend
// ===================================
// Diese Datei stellt alle API-Funktionen bereit, die das Frontend benötigt um mit dem Backend zu kommunizieren.
// Sie enthält generische HTTP-Methoden (GET, POST, PUT, DELETE) und spezialisierte Funktionen für Users, Vehicles und Bookings.
// Alle Funktionen sind asynchron (async/await) um moderne, nicht-blockierende API-Calls zu ermöglichen.

// Basis-URL für alle API-Anfragen
// Diese Konstante wird in allen Fetch-Calls verwendet und ermöglicht einfaches Umschalten zwischen Entwicklung und Produktion.
// In Produktion würde hier z.B. 'https://api.camperrent.de' stehen
const API_BASE_URL = 'http://localhost:3000';

// ===================================
// GENERISCHE HTTP-FUNKTIONEN
// ===================================

// GET-Request an einen beliebigen Endpoint
// Wird verwendet um Daten vom Server abzurufen (Read-Operationen)
// Parameter: endpoint - Der API-Pfad (z.B. '/users' oder '/vehicles/v1')
// Rückgabe: Die JSON-Antwort vom Server als JavaScript-Objekt
// Wirft einen Fehler falls der Request fehlschlägt (z.B. 404, 500)
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
// Wird verwendet um neue Datensätze anzulegen (Create-Operationen)
// Parameter: endpoint - Der API-Pfad, data - JavaScript-Objekt mit den zu sendenden Daten
// Der Content-Type wird auf 'application/json' gesetzt und die Daten werden als JSON-String serialisiert
// Rückgabe: Die Server-Antwort mit der neu erstellten Ressource (inkl. generierter ID)
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
// Wird verwendet um komplette Datensätze zu ersetzen (Update-Operationen)
// Parameter: endpoint - Der API-Pfad mit ID (z.B. '/vehicles/v1'), data - Die aktualisierten Daten
// PUT ersetzt die gesamte Ressource, im Gegensatz zu PATCH das nur einzelne Felder ändert
// Rückgabe: Die aktualisierte Ressource vom Server
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
// Wird verwendet um Datensätze permanent zu entfernen (Delete-Operationen)
// Parameter: endpoint - Der API-Pfad mit ID der zu löschenden Ressource
// Rückgabe: true falls erfolgreich, wirft Fehler falls nicht
// Der Server antwortet typischerweise mit Status 204 (No Content) bei erfolgreicher Löschung
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

// ===================================
// USER API - Benutzerverwaltung
// ===================================

// Ruft alle Benutzer aus der Datenbank ab
// Wird verwendet für Admin-Übersichten oder zum Durchsuchen aller Benutzer
// Rückgabe: Array mit allen User-Objekten
async function fetchAllUsers() {
    return await apiGet('/users');
}

// Ruft einen spezifischen Benutzer anhand seiner ID ab
// Wird verwendet um Profil-Informationen für einen bekannten Benutzer zu laden
// Parameter: userId - Die eindeutige ID des Benutzers (z.B. 'u1')
// Rückgabe: User-Objekt oder null falls nicht gefunden
async function fetchUserById(userId) {
    return await apiGet(`/users/${userId}`);
}

// Sucht einen Benutzer anhand seiner Email-Adresse
// Wird für den Login-Prozess verwendet um zu prüfen ob ein Benutzer existiert
// Parameter: email - Die Email-Adresse des gesuchten Benutzers
// Rückgabe: User-Objekt falls gefunden, null falls keine Übereinstimmung
// Die API gibt ein Array zurück, wir nehmen das erste Element (Emails sollten eindeutig sein)
async function fetchUserByEmail(email) {
    const users = await apiGet(`/users?email=${email}`);
    return users.length > 0 ? users[0] : null;
}

// Erstellt einen neuen Benutzer in der Datenbank
// Wird bei der Registrierung verwendet um einen neuen Account anzulegen
// Parameter: userData - Objekt mit allen Benutzer-Informationen (name, email, password, role, etc.)
// Rückgabe: Das neu erstellte User-Objekt inklusive der vom Server generierten ID
async function createUser(userData) {
    return await apiPost('/users', userData);
}

// Aktualisiert einen existierenden Benutzer
// Wird verwendet wenn Benutzer ihr Profil bearbeiten (z.B. Name, Adresse ändern)
// Parameter: userId - ID des zu aktualisierenden Benutzers, userData - Die neuen Daten
// Rückgabe: Das aktualisierte User-Objekt
async function updateUser(userId, userData) {
    return await apiPut(`/users/${userId}`, userData);
}

// Löscht einen Benutzer aus der Datenbank
// Wird verwendet wenn ein Account gelöscht werden soll (z.B. Konto schließen)
// Parameter: userId - ID des zu löschenden Benutzers
// Rückgabe: true falls erfolgreich
// ACHTUNG: In einer Produktionsumgebung sollte man Buchungen des Benutzers beachten
async function deleteUser(userId) {
    return await apiDelete(`/users/${userId}`);
}

// ===================================
// VEHICLE API - Fahrzeugverwaltung
// ===================================

// Ruft alle Fahrzeuge aus der Datenbank ab
// Wird für die Hauptseite verwendet um alle verfügbaren Wohnmobile anzuzeigen
// Rückgabe: Array mit allen Vehicle-Objekten
async function fetchAllVehicles() {
    return await apiGet('/vehicles');
}

// Ruft ein spezifisches Fahrzeug anhand seiner ID ab
// Wird für die Detailseite eines Fahrzeugs verwendet
// Parameter: vehicleId - Die eindeutige ID des Fahrzeugs (z.B. 'v1')
// Rückgabe: Vehicle-Objekt mit allen Details (name, price, img, features, etc.)
async function fetchVehicleById(vehicleId) {
    return await apiGet(`/vehicles/${vehicleId}`);
}

// Ruft alle Fahrzeuge eines bestimmten Anbieters ab
// Wird im Provider-Dashboard verwendet um nur die eigenen Fahrzeuge anzuzeigen
// Parameter: providerId - Die User-ID des Anbieters
// Rückgabe: Array mit allen Fahrzeugen des Anbieters (gefiltert nach provider_id)
async function fetchVehiclesByProvider(providerId) {
    return await apiGet(`/vehicles?provider_id=${providerId}`);
}

// Erstellt ein neues Fahrzeug in der Datenbank
// Wird vom Provider verwendet um ein neues Wohnmobil anzubieten
// Parameter: vehicleData - Objekt mit allen Fahrzeug-Informationen (name, price, category, etc.)
// Rückgabe: Das neu erstellte Vehicle-Objekt inklusive ID
async function createVehicle(vehicleData) {
    return await apiPost('/vehicles', vehicleData);
}

// Aktualisiert ein existierendes Fahrzeug
// Wird verwendet wenn Provider ihre Fahrzeuge bearbeiten (z.B. Preis ändern, Features hinzufügen)
// Parameter: vehicleId - ID des zu aktualisierenden Fahrzeugs, vehicleData - Die neuen Daten
// Rückgabe: Das aktualisierte Vehicle-Objekt
async function updateVehicle(vehicleId, vehicleData) {
    return await apiPut(`/vehicles/${vehicleId}`, vehicleData);
}

// Löscht ein Fahrzeug aus der Datenbank
// Wird verwendet wenn ein Provider ein Fahrzeug aus dem Angebot entfernt
// Parameter: vehicleId - ID des zu löschenden Fahrzeugs
// Rückgabe: true falls erfolgreich
// HINWEIS: Bestehende Buchungen für dieses Fahrzeug sollten vorher geprüft werden
async function deleteVehicle(vehicleId) {
    return await apiDelete(`/vehicles/${vehicleId}`);
}

// ===================================
// BOOKING API - Buchungsverwaltung
// ===================================

// Ruft alle Buchungen aus der Datenbank ab
// Wird für Admin-Übersichten oder globale Statistiken verwendet
// Rückgabe: Array mit allen Booking-Objekten
async function fetchAllBookings() {
    return await apiGet('/bookings');
}

// Ruft eine spezifische Buchung anhand ihrer ID ab
// Wird für Buchungsdetails oder Bestätigungsseiten verwendet
// Parameter: bookingId - Die eindeutige ID der Buchung (z.B. 'b1')
// Rückgabe: Booking-Objekt mit allen Details
async function fetchBookingById(bookingId) {
    return await apiGet(`/bookings/${bookingId}`);
}

// Ruft alle Buchungen eines bestimmten Benutzers ab
// Wird für die "Meine Buchungen" Seite im Benutzerprofil verwendet
// Parameter: userId - Die User-ID des Benutzers
// Rückgabe: Array mit allen Buchungen des Benutzers (gefiltert nach user_id)
async function fetchBookingsByUser(userId) {
    return await apiGet(`/bookings?user_id=${userId}`);
}

// Ruft alle Buchungen für ein bestimmtes Fahrzeug ab
// Wird für den Verfügbarkeitskalender und die Überlappungsprüfung verwendet
// Parameter: vehicleId - Die Vehicle-ID des Fahrzeugs
// Rückgabe: Array mit allen Buchungen für dieses Fahrzeug (gefiltert nach vehicle_id)
// Diese Funktion ist essentiell um zu verhindern, dass ein Fahrzeug doppelt gebucht wird
async function fetchBookingsByVehicle(vehicleId) {
    return await apiGet(`/bookings?vehicle_id=${vehicleId}`);
}

// Erstellt eine neue Buchung in der Datenbank
// Wird verwendet wenn ein Benutzer ein Fahrzeug bucht
// Parameter: bookingData - Objekt mit allen Buchungsdaten (user_id, vehicle_id, start, end, price)
// Rückgabe: Das neu erstellte Booking-Objekt inklusive der vom Server generierten ID
// Der Server generiert automatisch eine ID falls keine mitgeschickt wird (b1, b2, b3, ...)
async function createBooking(bookingData) {
    return await apiPost('/bookings', bookingData);
}

// Aktualisiert eine existierende Buchung
// Wird verwendet wenn Buchungsdetails geändert werden (z.B. Datum verlängern)
// Parameter: bookingId - ID der zu aktualisierenden Buchung, bookingData - Die neuen Daten
// Rückgabe: Das aktualisierte Booking-Objekt
async function updateBooking(bookingId, bookingData) {
    return await apiPut(`/bookings/${bookingId}`, bookingData);
}

// Löscht eine Buchung aus der Datenbank (Stornierung)
// Wird verwendet wenn ein Benutzer eine Buchung storniert
// Parameter: bookingId - ID der zu stornierenden Buchung
// Rückgabe: true falls erfolgreich
// Diese Aktion sollte irreversibel sein und eventuell eine Bestätigung erfordern
async function deleteBooking(bookingId) {
    return await apiDelete(`/bookings/${bookingId}`);
}

// ===================================
// HELPER-FUNKTIONEN
// ===================================

// Generiert eine eindeutige ID für neue Datensätze
// Diese Funktion dient als Fallback falls der Server keine ID generiert
// Parameter: prefix - Optionaler Präfix für die ID (Standard: 'id')
// Rückgabe: Ein eindeutiger String im Format 'prefix_timestamp_randomstring'
// Beispiel: 'v_1705235689123_k4j2n9x8q' für ein Fahrzeug
// Die Kombination aus Zeitstempel und Zufallsstring macht Kollisionen nahezu unmöglich
function generateUniqueId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Prüft ob ein Datumsbereich bereits gebucht ist
// Diese Funktion ist kritisch um Doppelbuchungen zu verhindern
// Parameter: vehicleId - ID des zu prüfenden Fahrzeugs, startDate/endDate - Die gewünschten Buchungsdaten
// Rückgabe: true falls der Zeitraum bereits gebucht ist, false falls verfügbar
// Die Funktion lädt alle Buchungen des Fahrzeugs und prüft jede auf Überlappung
// Überlappung liegt vor wenn: neuer_Start <= bestehende_End UND neuer_End >= bestehende_Start
// Beispiel: Bestehende Buchung 10.-15., neue Buchung 12.-17. -> Überlappung!
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
