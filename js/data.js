/* ===================================
   DATA.JS - Datenverwaltung mit JSON-Server API
   =================================== */

// Session-Management (bleibt in localStorage)
const STORAGE_KEYS = {
    currentUser: 'currentUser',
    cookieConsent: 'interCamp_cookie_consent'
};

// === USER FUNCTIONS (API-basiert) ===

async function getAllUsers() {
    return await fetchAllUsers();
}

async function getUserById(userId) {
    return await fetchUserById(userId);
}

async function getUserByEmail(email) {
    return await fetchUserByEmail(email);
}

async function addUser(user) {
    // Generiere ID wenn nicht vorhanden
    if (!user.id) {
        user.id = generateUniqueId('u');
    }
    return await createUser(user);
}

async function updateUserData(userId, updates) {
    const user = await getUserById(userId);
    const updatedUser = { ...user, ...updates };
    return await updateUser(userId, updatedUser);
}

// === VEHICLE FUNCTIONS (API-basiert) ===

async function getAllVehicles() {
    return await fetchAllVehicles();
}

async function getVehicleById(vehicleId) {
    return await fetchVehicleById(vehicleId);
}

async function getVehiclesByProvider(providerId) {
    return await fetchVehiclesByProvider(providerId);
}

async function addVehicle(vehicle) {
    // SICHERHEIT: Nur Provider dürfen Fahrzeuge hinzufügen
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'provider') {
        throw new Error('Nur Anbieter können Fahrzeuge hinzufügen');
    }

    // SICHERHEIT: Stelle sicher, dass das Fahrzeug dem aktuellen Provider zugewiesen wird
    vehicle.provider_id = currentUser.id;

    if (!vehicle.id) {
        vehicle.id = generateUniqueId('v');
    }
    return await createVehicle(vehicle);
}

async function updateVehicleData(vehicleId, updates) {
    // SICHERHEIT: Nur Provider dürfen Fahrzeuge bearbeiten
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'provider') {
        throw new Error('Keine Berechtigung zum Bearbeiten von Fahrzeugen');
    }

    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) {
        throw new Error('Fahrzeug nicht gefunden');
    }

    // Prüfe ob das Fahrzeug dem Provider gehört
    if (vehicle.provider_id !== currentUser.id) {
        throw new Error('Sie können nur Ihre eigenen Fahrzeuge bearbeiten');
    }

    const updatedVehicle = { ...vehicle, ...updates };
    return await updateVehicle(vehicleId, updatedVehicle);
}

async function deleteVehicleData(vehicleId) {
    // SICHERHEIT: Nur Provider dürfen Fahrzeuge löschen
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'provider') {
        throw new Error('Keine Berechtigung zum Löschen von Fahrzeugen');
    }

    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) {
        throw new Error('Fahrzeug nicht gefunden');
    }

    // Prüfe ob das Fahrzeug dem Provider gehört
    if (vehicle.provider_id !== currentUser.id) {
        throw new Error('Sie können nur Ihre eigenen Fahrzeuge löschen');
    }

    return await deleteVehicle(vehicleId);
}

// === BOOKING FUNCTIONS (API-basiert) ===

async function getAllBookings() {
    return await fetchAllBookings();
}

async function getBookingById(bookingId) {
    return await fetchBookingById(bookingId);
}

async function getBookingsByUser(userId) {
    return await fetchBookingsByUser(userId);
}

async function getBookingsByVehicle(vehicleId) {
    return await fetchBookingsByVehicle(vehicleId);
}

async function addBooking(booking) {
    // SICHERHEIT: Prüfe dass Nutzer eingeloggt ist
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('Sie müssen eingeloggt sein, um eine Buchung zu erstellen');
    }

    // SICHERHEIT: Stelle sicher, dass die Buchung für den aktuellen Nutzer erstellt wird
    if (booking.user_id !== currentUser.id) {
        throw new Error('Sie können nur Buchungen für sich selbst erstellen');
    }

    if (!booking.id) {
        booking.id = generateUniqueId('b');
    }
    return await createBooking(booking);
}

async function deleteBookingData(bookingId) {
    // SICHERHEIT: Prüfe Berechtigung vor dem Löschen
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('Nicht eingeloggt');
    }

    const booking = await getBookingById(bookingId);
    if (!booking) {
        throw new Error('Buchung nicht gefunden');
    }

    // Prüfe ob Nutzer die Buchung erstellt hat ODER ob es ein Provider ist, der das Fahrzeug besitzt
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

// === CURRENT USER (localStorage Session) ===

function getCurrentUser() {
    const userStr = localStorage.getItem(STORAGE_KEYS.currentUser);
    return userStr ? JSON.parse(userStr) : null;
}

function setCurrentUser(user) {
    if (user) {
        localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    } else {
        localStorage.removeItem(STORAGE_KEYS.currentUser);
    }
}

// === HELPER FUNCTIONS ===

async function isDateRangeBooked(vehicleId, startDate, endDate) {
    return await isDateRangeBookedAPI(vehicleId, startDate, endDate);
}

function generateId(prefix = 'id') {
    return generateUniqueId(prefix);
}

// === INITIALISIERUNG ===

// Prüfe ob Server erreichbar ist
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

// Bei Seiten-Load Server-Verbindung prüfen
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkServerConnection);
} else {
    checkServerConnection();
}
