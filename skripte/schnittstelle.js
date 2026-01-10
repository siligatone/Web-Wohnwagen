/* ===================================
   API.JS - Zentrale API-Funktionen für JSON-Server
   =================================== */

// API Base URL
const API_BASE_URL = 'http://localhost:3000';

// === GENERIC API FUNCTIONS ===

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

// === USER API ===

async function fetchAllUsers() {
    return await apiGet('/users');
}

async function fetchUserById(userId) {
    return await apiGet(`/users/${userId}`);
}

async function fetchUserByEmail(email) {
    const users = await apiGet(`/users?email=${email}`);
    return users.length > 0 ? users[0] : null;
}

async function createUser(userData) {
    return await apiPost('/users', userData);
}

async function updateUser(userId, userData) {
    return await apiPut(`/users/${userId}`, userData);
}

async function deleteUser(userId) {
    return await apiDelete(`/users/${userId}`);
}

// === VEHICLE API ===

async function fetchAllVehicles() {
    return await apiGet('/vehicles');
}

async function fetchVehicleById(vehicleId) {
    return await apiGet(`/vehicles/${vehicleId}`);
}

async function fetchVehiclesByProvider(providerId) {
    return await apiGet(`/vehicles?provider_id=${providerId}`);
}

async function createVehicle(vehicleData) {
    return await apiPost('/vehicles', vehicleData);
}

async function updateVehicle(vehicleId, vehicleData) {
    return await apiPut(`/vehicles/${vehicleId}`, vehicleData);
}

async function deleteVehicle(vehicleId) {
    return await apiDelete(`/vehicles/${vehicleId}`);
}

// === BOOKING API ===

async function fetchAllBookings() {
    return await apiGet('/bookings');
}

async function fetchBookingById(bookingId) {
    return await apiGet(`/bookings/${bookingId}`);
}

async function fetchBookingsByUser(userId) {
    return await apiGet(`/bookings?user_id=${userId}`);
}

async function fetchBookingsByVehicle(vehicleId) {
    return await apiGet(`/bookings?vehicle_id=${vehicleId}`);
}

async function createBooking(bookingData) {
    return await apiPost('/bookings', bookingData);
}

async function updateBooking(bookingId, bookingData) {
    return await apiPut(`/bookings/${bookingId}`, bookingData);
}

async function deleteBooking(bookingId) {
    return await apiDelete(`/bookings/${bookingId}`);
}

// === HELPER FUNCTIONS ===

// Generiere eindeutige ID (Fallback falls Server keine generiert)
function generateUniqueId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Prüfe ob Datum bereits gebucht ist
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
