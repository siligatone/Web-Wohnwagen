/* ===================================
   DATA.JS - Datenverwaltung mit JSON-Server API
   =================================== */

// Session-Management (bleibt in localStorage)
const STORAGE_KEYS = {
    currentUser: 'currentUser',
    cookieConsent: 'camperRent_cookie_consent'
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
    if (!vehicle.id) {
        vehicle.id = generateUniqueId('v');
    }
    return await createVehicle(vehicle);
}

async function updateVehicleData(vehicleId, updates) {
    const vehicle = await getVehicleById(vehicleId);
    const updatedVehicle = { ...vehicle, ...updates };
    return await updateVehicle(vehicleId, updatedVehicle);
}

async function deleteVehicleData(vehicleId) {
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
    if (!booking.id) {
        booking.id = generateUniqueId('b');
    }
    return await createBooking(booking);
}

async function deleteBookingData(bookingId) {
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
