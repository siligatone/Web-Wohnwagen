// ===================================
// DATA.JS - Zentrale Datenverwaltungsschicht für CamperRent
// ===================================
// Diese Datei ist die Abstraktionsschicht zwischen der Anwendungs-Logik und der API.
// Sie bietet einfache Funktionen für CRUD-Operationen (Create, Read, Update, Delete) auf Users, Vehicles und Bookings.
// Zusätzlich implementiert sie wichtige Sicherheitsprüfungen um sicherzustellen dass nur berechtigte Benutzer Daten ändern können.
// Die Session-Verwaltung (eingeloggter Benutzer) erfolgt via localStorage im Browser.

// Konfiguration der localStorage-Keys
// Diese Keys werden verwendet um Daten im Browser zu speichern
// currentUser: Speichert den eingeloggten Benutzer (bleibt nach Seiten-Reload erhalten)
// cookieConsent: Speichert ob der Benutzer Cookies akzeptiert hat (DSGVO-Konformität)
const STORAGE_KEYS = {
    currentUser: 'currentUser',
    cookieConsent: 'interCamp_cookie_consent'
};

// ===================================
// USER FUNCTIONS - Benutzerverwaltung
// ===================================

// Ruft alle Benutzer aus der Datenbank ab
// Diese Funktion ist ein einfacher Wrapper um die API-Funktion fetchAllUsers()
// Rückgabe: Array mit allen User-Objekten
// Verwendung: Admin-Funktionen, Benutzerlisten
async function getAllUsers() {
    return await fetchAllUsers();
}

// Ruft einen spezifischen Benutzer anhand seiner ID ab
// Parameter: userId - Die eindeutige ID des Benutzers (z.B. 'u1')
// Rückgabe: User-Objekt oder null falls nicht gefunden
async function getUserById(userId) {
    return await fetchUserById(userId);
}

// Sucht einen Benutzer anhand seiner Email-Adresse
// Diese Funktion wird primär für den Login-Prozess verwendet
// Parameter: email - Die Email-Adresse des gesuchten Benutzers
// Rückgabe: User-Objekt falls gefunden, null falls nicht registriert
async function getUserByEmail(email) {
    return await fetchUserByEmail(email);
}

// Erstellt einen neuen Benutzer in der Datenbank
// Diese Funktion wird bei der Registrierung aufgerufen
// Parameter: user - Objekt mit Benutzerdaten (email, password, name, role)
// Falls keine ID vorhanden ist, wird automatisch eine generiert
// Rückgabe: Das neu erstellte User-Objekt mit ID
async function addUser(user) {
    // Generiere eindeutige ID falls nicht vorhanden
    // generateUniqueId('u') erstellt z.B. 'u_1705235689_x8k2j9'
    if (!user.id) {
        user.id = generateUniqueId('u');
    }
    return await createUser(user);
}

// Aktualisiert die Daten eines existierenden Benutzers
// Diese Funktion lädt zuerst den aktuellen User, merged dann die Updates und speichert zurück
// Parameter: userId - ID des zu aktualisierenden Benutzers, updates - Objekt mit zu ändernden Feldern
// Verwendung: Profil-Bearbeitung, Passwort-Änderung
// Rückgabe: Das aktualisierte User-Objekt
async function updateUserData(userId, updates) {
    const user = await getUserById(userId);
    const updatedUser = { ...user, ...updates };
    return await updateUser(userId, updatedUser);
}

// ===================================
// VEHICLE FUNCTIONS - Fahrzeugverwaltung
// ===================================

// Ruft alle Fahrzeuge aus der Datenbank ab
// Rückgabe: Array mit allen Vehicle-Objekten
// Verwendung: Hauptseite mit Fahrzeugübersicht
async function getAllVehicles() {
    return await fetchAllVehicles();
}

// Ruft ein spezifisches Fahrzeug anhand seiner ID ab
// Parameter: vehicleId - Die eindeutige ID des Fahrzeugs (z.B. 'v1')
// Rückgabe: Vehicle-Objekt mit allen Details
// Verwendung: Fahrzeug-Detailseite
async function getVehicleById(vehicleId) {
    return await fetchVehicleById(vehicleId);
}

// Ruft alle Fahrzeuge eines bestimmten Anbieters ab
// Parameter: providerId - Die User-ID des Anbieters
// Rückgabe: Array mit allen Fahrzeugen die diesem Provider gehören
// Verwendung: Provider-Dashboard zeigt nur eigene Fahrzeuge
async function getVehiclesByProvider(providerId) {
    return await fetchVehiclesByProvider(providerId);
}

// Erstellt ein neues Fahrzeug in der Datenbank
// WICHTIG: Diese Funktion implementiert Sicherheitsprüfungen
// Nur Provider dürfen Fahrzeuge hinzufügen und das Fahrzeug wird automatisch dem aktuellen Provider zugeordnet
// Parameter: vehicle - Objekt mit Fahrzeugdaten (name, price, category, img, etc.)
// Rückgabe: Das neu erstellte Vehicle-Objekt mit ID
// Wirft Error falls Benutzer kein Provider ist
async function addVehicle(vehicle) {
    // SICHERHEIT: Prüfe ob der aktuelle Benutzer ein Provider ist
    // Nur Provider dürfen neue Fahrzeuge anlegen
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'provider') {
        throw new Error('Nur Anbieter können Fahrzeuge hinzufügen');
    }

    // SICHERHEIT: Setze provider_id zwingend auf die ID des eingeloggten Providers
    // Verhindert dass Provider Fahrzeuge für andere Provider anlegen
    // Diese Zeile überschreibt eventuell vorhandene provider_id aus dem Input
    vehicle.provider_id = currentUser.id;

    // Generiere ID falls nicht vorhanden
    if (!vehicle.id) {
        vehicle.id = generateUniqueId('v');
    }
    return await createVehicle(vehicle);
}

// Aktualisiert ein existierendes Fahrzeug
// WICHTIG: Provider können nur ihre eigenen Fahrzeuge bearbeiten
// Parameter: vehicleId - ID des Fahrzeugs, updates - Objekt mit zu ändernden Feldern
// Rückgabe: Das aktualisierte Vehicle-Objekt
// Wirft Error falls nicht berechtigt
async function updateVehicleData(vehicleId, updates) {
    // SICHERHEIT: Prüfe ob Benutzer ein Provider ist
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'provider') {
        throw new Error('Keine Berechtigung zum Bearbeiten von Fahrzeugen');
    }

    // Lade aktuelles Fahrzeug
    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) {
        throw new Error('Fahrzeug nicht gefunden');
    }

    // SICHERHEIT: Prüfe ob das Fahrzeug dem aktuellen Provider gehört
    // Verhindert dass Provider fremde Fahrzeuge bearbeiten
    if (vehicle.provider_id !== currentUser.id) {
        throw new Error('Sie können nur Ihre eigenen Fahrzeuge bearbeiten');
    }

    // Merge updates mit bestehenden Daten und speichere
    const updatedVehicle = { ...vehicle, ...updates };
    return await updateVehicle(vehicleId, updatedVehicle);
}

// Löscht ein Fahrzeug aus der Datenbank
// WICHTIG: Provider können nur ihre eigenen Fahrzeuge löschen
// Parameter: vehicleId - ID des zu löschenden Fahrzeugs
// Rückgabe: true falls erfolgreich
// Wirft Error falls nicht berechtigt
async function deleteVehicleData(vehicleId) {
    // SICHERHEIT: Prüfe ob Benutzer ein Provider ist
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'provider') {
        throw new Error('Keine Berechtigung zum Löschen von Fahrzeugen');
    }

    // Lade Fahrzeug um Besitzer zu prüfen
    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) {
        throw new Error('Fahrzeug nicht gefunden');
    }

    // SICHERHEIT: Prüfe Besitz
    if (vehicle.provider_id !== currentUser.id) {
        throw new Error('Sie können nur Ihre eigenen Fahrzeuge löschen');
    }

    return await deleteVehicle(vehicleId);
}

// ===================================
// BOOKING FUNCTIONS - Buchungsverwaltung
// ===================================

// Ruft alle Buchungen aus der Datenbank ab
// Rückgabe: Array mit allen Booking-Objekten
// Verwendung: Admin-Funktionen, globale Statistiken
async function getAllBookings() {
    return await fetchAllBookings();
}

// Ruft eine spezifische Buchung anhand ihrer ID ab
// Parameter: bookingId - Die eindeutige ID der Buchung (z.B. 'b1')
// Rückgabe: Booking-Objekt mit allen Details
async function getBookingById(bookingId) {
    return await fetchBookingById(bookingId);
}

// Ruft alle Buchungen eines bestimmten Benutzers ab
// Parameter: userId - Die User-ID des Benutzers
// Rückgabe: Array mit allen Buchungen dieses Benutzers
// Verwendung: "Meine Buchungen" Seite im Profil
async function getBookingsByUser(userId) {
    return await fetchBookingsByUser(userId);
}

// Ruft alle Buchungen für ein bestimmtes Fahrzeug ab
// Parameter: vehicleId - Die Vehicle-ID des Fahrzeugs
// Rückgabe: Array mit allen Buchungen für dieses Fahrzeug
// Verwendung: Verfügbarkeitskalender, Überlappungsprüfung
async function getBookingsByVehicle(vehicleId) {
    return await fetchBookingsByVehicle(vehicleId);
}

// Erstellt eine neue Buchung in der Datenbank
// WICHTIG: Sicherheitsprüfungen stellen sicher dass Benutzer nur für sich selbst buchen können
// Parameter: booking - Objekt mit Buchungsdaten (vehicle_id, user_id, start, end, totalPrice, extras)
// Rückgabe: Das neu erstellte Booking-Objekt mit ID
// Wirft Error falls nicht eingeloggt oder user_id nicht übereinstimmt
async function addBooking(booking) {
    // SICHERHEIT: Prüfe dass ein Benutzer eingeloggt ist
    // Nur eingeloggte Benutzer dürfen buchen
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('Sie müssen eingeloggt sein, um eine Buchung zu erstellen');
    }

    // SICHERHEIT: Stelle sicher dass die Buchung für den aktuellen Benutzer erstellt wird
    // Verhindert dass Benutzer Buchungen für andere Accounts erstellen
    if (booking.user_id !== currentUser.id) {
        throw new Error('Sie können nur Buchungen für sich selbst erstellen');
    }

    // Generiere ID falls nicht vorhanden
    if (!booking.id) {
        booking.id = generateUniqueId('b');
    }
    return await createBooking(booking);
}

// Löscht eine Buchung aus der Datenbank (Stornierung)
// WICHTIG: Benutzer können nur ihre eigenen Buchungen löschen
// Provider können Buchungen für ihre Fahrzeuge löschen (z.B. bei Fahrzeugausfall)
// Parameter: bookingId - ID der zu stornierenden Buchung
// Rückgabe: true falls erfolgreich
// Wirft Error falls nicht berechtigt
async function deleteBookingData(bookingId) {
    // SICHERHEIT: Prüfe ob Benutzer eingeloggt ist
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('Nicht eingeloggt');
    }

    // Lade Buchung um Berechtigungen zu prüfen
    const booking = await getBookingById(bookingId);
    if (!booking) {
        throw new Error('Buchung nicht gefunden');
    }

    // SICHERHEIT: Prüfe Berechtigung basierend auf Rolle
    // Provider dürfen Buchungen für ihre Fahrzeuge löschen
    // Customers dürfen nur ihre eigenen Buchungen löschen
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

// ===================================
// SESSION MANAGEMENT - Aktueller Benutzer
// ===================================

// Ruft den aktuell eingeloggten Benutzer aus dem localStorage ab
// Diese Funktion wird überall verwendet um zu prüfen ob jemand eingeloggt ist
// Rückgabe: User-Objekt falls eingeloggt, null falls nicht
// Der User bleibt auch nach Seiten-Reload eingeloggt da localStorage persistent ist
function getCurrentUser() {
    const userStr = localStorage.getItem(STORAGE_KEYS.currentUser);
    return userStr ? JSON.parse(userStr) : null;
}

// Setzt den aktuell eingeloggten Benutzer im localStorage
// Diese Funktion wird beim Login (setzen) und Logout (null übergeben) aufgerufen
// Parameter: user - User-Objekt zum Einloggen, oder null zum Ausloggen
// Der User wird als JSON-String gespeichert um Objekt-Struktur zu erhalten
function setCurrentUser(user) {
    if (user) {
        localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    } else {
        localStorage.removeItem(STORAGE_KEYS.currentUser);
    }
}

// ===================================
// HELPER FUNCTIONS - Hilfsfunktionen
// ===================================

// Prüft ob ein Datumsbereich bereits gebucht ist
// Diese Funktion ist ein Wrapper um die API-Funktion isDateRangeBookedAPI()
// Parameter: vehicleId - ID des Fahrzeugs, startDate/endDate - Zu prüfende Daten (YYYY-MM-DD)
// Rückgabe: true falls Zeitraum gebucht, false falls verfügbar
// Verwendung: Verfügbarkeits-Check vor Buchung
async function isDateRangeBooked(vehicleId, startDate, endDate) {
    return await isDateRangeBookedAPI(vehicleId, startDate, endDate);
}

// Generiert eine eindeutige ID mit optionalem Präfix
// Diese Funktion ist ein Wrapper um generateUniqueId()
// Parameter: prefix - Optionaler Präfix (z.B. 'u' für User, 'v' für Vehicle, 'b' für Booking)
// Rückgabe: Eindeutiger String im Format 'prefix_timestamp_randomstring'
function generateId(prefix = 'id') {
    return generateUniqueId(prefix);
}

// ===================================
// INITIALISIERUNG - Server-Verbindung
// ===================================

// Prüft beim Seiten-Load ob der Backend-Server erreichbar ist
// Diese Funktion macht einen Test-Request zur API um die Verbindung zu verifizieren
// Rückgabe: true falls Server erreichbar, false falls nicht
// Die Funktion loggt hilfreiche Meldungen in die Browser-Console
// Falls Server nicht läuft, wird eine Fehlermeldung mit Start-Befehl ausgegeben
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
// Diese Prüfung läuft sobald das DOM vollständig geladen ist
// document.readyState prüft ob die Seite noch lädt oder bereits fertig ist
// Falls noch am Laden: warte auf DOMContentLoaded Event
// Falls bereits geladen: prüfe sofort
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkServerConnection);
} else {
    checkServerConnection();
}
