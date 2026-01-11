// DATA.JS - Zentrale Datenverwaltungsschicht
// Diese Datei ist die Abstraktionsschicht zwischen der Anwendungs-Logik und der API.
// Sie bietet einfache Funktionen für CRUD-Operationen (Create, Read, Update, Delete) auf Users, Vehicles und Bookings.
// Zusätzlich implementiert sie wichtige Sicherheitsprüfungen um sicherzustellen dass nur berechtigte Benutzer Daten ändern können.
// Die Session-Verwaltung (eingeloggter Benutzer) erfolgt via localStorage im Browser.

// localStorage-Keys für Session und Cookie-Consent
const STORAGE_KEYS = {
    currentUser: 'currentUser',
    cookieConsent: 'interCamp_cookie_consent'
};

// User Functions

// Ruft alle Benutzer aus der Datenbank ab
async function getAllUsers() {
    return await fetchAllUsers();
}

// Ruft einen Benutzer anhand der ID ab
async function getUserById(userId) {
    return await fetchUserById(userId);
}

// Sucht einen Benutzer anhand der Email-Adresse
async function getUserByEmail(email) {
    return await fetchUserByEmail(email);
}

// Erstellt einen neuen Benutzer
// Generiert automatisch eine ID falls nicht vorhanden
async function addUser(user) {
    if (!user.id) {
        user.id = generateUniqueId('u');
    }
    return await createUser(user);
}

// Aktualisiert einen existierenden Benutzer
// Merged Updates mit bestehenden Daten
async function updateUserData(userId, updates) {
    const user = await getUserById(userId);
    const updatedUser = { ...user, ...updates };
    return await updateUser(userId, updatedUser);
}

// Vehicle Functions

// Ruft alle Fahrzeuge ab
async function getAllVehicles() {
    return await fetchAllVehicles();
}

// Ruft ein Fahrzeug anhand der ID ab
async function getVehicleById(vehicleId) {
    return await fetchVehicleById(vehicleId);
}

// Ruft alle Fahrzeuge eines Anbieters ab
async function getVehiclesByProvider(providerId) {
    return await fetchVehiclesByProvider(providerId);
}

// Erstellt ein neues Fahrzeug
// Sicherheitsprüfung: Nur Provider dürfen Fahrzeuge hinzufügen
async function addVehicle(vehicle) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'provider') {
        throw new Error('Nur Anbieter können Fahrzeuge hinzufügen');
    }

    vehicle.provider_id = currentUser.id;

    if (!vehicle.id) {
        vehicle.id = generateUniqueId('v');
    }
    return await createVehicle(vehicle);
}

// Aktualisiert ein existierendes Fahrzeug
// Sicherheitsprüfung: Provider können nur eigene Fahrzeuge bearbeiten
async function updateVehicleData(vehicleId, updates) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'provider') {
        throw new Error('Keine Berechtigung zum Bearbeiten von Fahrzeugen');
    }

    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) {
        throw new Error('Fahrzeug nicht gefunden');
    }

    if (vehicle.provider_id !== currentUser.id) {
        throw new Error('Sie können nur Ihre eigenen Fahrzeuge bearbeiten');
    }

    const updatedVehicle = { ...vehicle, ...updates };
    return await updateVehicle(vehicleId, updatedVehicle);
}

// Löscht ein Fahrzeug
// Sicherheitsprüfung: Provider können nur eigene Fahrzeuge löschen
async function deleteVehicleData(vehicleId) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'provider') {
        throw new Error('Keine Berechtigung zum Löschen von Fahrzeugen');
    }

    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) {
        throw new Error('Fahrzeug nicht gefunden');
    }

    if (vehicle.provider_id !== currentUser.id) {
        throw new Error('Sie können nur Ihre eigenen Fahrzeuge löschen');
    }

    return await deleteVehicle(vehicleId);
}

// Booking Functions

// Ruft alle Buchungen ab
async function getAllBookings() {
    return await fetchAllBookings();
}

// Ruft eine Buchung anhand der ID ab
async function getBookingById(bookingId) {
    return await fetchBookingById(bookingId);
}

// Ruft alle Buchungen eines Benutzers ab
async function getBookingsByUser(userId) {
    return await fetchBookingsByUser(userId);
}

// Ruft alle Buchungen für ein Fahrzeug ab
async function getBookingsByVehicle(vehicleId) {
    return await fetchBookingsByVehicle(vehicleId);
}

// Erstellt eine neue Buchung
// Sicherheitsprüfung: Benutzer können nur für sich selbst buchen
async function addBooking(booking) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('Sie müssen eingeloggt sein, um eine Buchung zu erstellen');
    }

    if (booking.user_id !== currentUser.id) {
        throw new Error('Sie können nur Buchungen für sich selbst erstellen');
    }

    if (!booking.id) {
        booking.id = generateUniqueId('b');
    }
    return await createBooking(booking);
}

// Löscht eine Buchung (Stornierung)
// Sicherheitsprüfung: Benutzer können nur eigene Buchungen löschen, Provider auch für ihre Fahrzeuge
async function deleteBookingData(bookingId) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('Nicht eingeloggt');
    }

    const booking = await getBookingById(bookingId);
    if (!booking) {
        throw new Error('Buchung nicht gefunden');
    }

    if (currentUser.role === 'provider') {
        const vehicle = await getVehicleById(booking.vehicle_id);
        if (vehicle.provider_id !== currentUser.id) {
            throw new Error('Keine Berechtigung zum Löschen dieser Buchung');
        }
    } else {
        if (booking.user_id !== currentUser.id) {
            throw new Error('Keine Berechtigung zum Löschen dieser Buchung');
        }
    }

    return await deleteBooking(bookingId);
}

// Session Management

// Ruft den aktuell eingeloggten Benutzer aus localStorage ab
// Gibt User-Objekt zurück oder null falls nicht eingeloggt
function getCurrentUser() {
    const userStr = localStorage.getItem(STORAGE_KEYS.currentUser);
    return userStr ? JSON.parse(userStr) : null;
}

// Setzt den aktuell eingeloggten Benutzer im localStorage
// Übergebe null zum Ausloggen
function setCurrentUser(user) {
    if (user) {
        localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    } else {
        localStorage.removeItem(STORAGE_KEYS.currentUser);
    }
}

// Helper Functions

// Prüft ob ein Datumsbereich bereits gebucht ist
// Gibt true zurück falls gebucht, false falls verfügbar
async function isDateRangeBooked(vehicleId, startDate, endDate) {
    return await isDateRangeBookedAPI(vehicleId, startDate, endDate);
}

// Generiert eine eindeutige ID mit optionalem Präfix
// Format: prefix_timestamp_randomstring
function generateId(prefix = 'id') {
    return generateUniqueId(prefix);
}

// Server-Verbindung

// Prüft beim Seiten-Load ob der Backend-Server erreichbar ist
// Loggt hilfreiche Meldungen in die Browser-Console
async function checkServerConnection() {
    try {
        await fetch('http://localhost:3000/users');
        console.log('✅ Verbindung zum JSON-Server erfolgreich');
        return true;
    } catch (error) {
        console.error('❌ JSON-Server nicht erreichbar!');
        console.error('Starte den Server mit: npm start');
        return false;
    }
}

// Automatische Server-Verbindungsprüfung beim Seiten-Load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkServerConnection);
} else {
    checkServerConnection();
}
