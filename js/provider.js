// ===================================
// PROVIDER.JS - Anbieter-Dashboard und Fahrzeugverwaltung
// ===================================
// Diese Datei verwaltet das komplette Provider-Dashboard für Wohnmobil-Anbieter.
// Sie zeigt Statistiken (Fahrzeuge, Buchungen, Umsatz), eine Fahrzeug-Tabelle und ermöglicht CRUD-Operationen.
// Provider können Fahrzeuge erstellen, bearbeiten, löschen und deren Buchungen einsehen.
// Umfangreiche Sicherheitsprüfungen stellen sicher dass Provider nur ihre eigenen Daten verwalten können.

// Initialisiert das Provider-Dashboard beim Seiten-Load
// Diese Funktion führt einen Auth-Check durch und lädt dann Statistiken und Fahrzeug-Liste
// Nur Benutzer mit Rolle 'provider' dürfen zugreifen, andere werden weitergeleitet
async function initProviderDashboard() {
    // Auth-Check mit Rollen-Anforderung
    // requireAuth('provider') prüft Login UND Rolle, leitet zum Login weiter falls nicht berechtigt
    if (!requireAuth('provider')) return;

    const currentUser = getCurrentUser();

    // Lade und zeige Statistiken (Anzahl Fahrzeuge, Buchungen, Umsatz, aktive Buchungen)
    await displayProviderStats(currentUser.id);

    // Lade und zeige Fahrzeug-Tabelle mit allen Fahrzeugen des Providers
    await displayProviderVehicles(currentUser.id);
}

// Berechnet und zeigt Provider-Statistiken an
// Diese Funktion lädt alle relevanten Daten und berechnet Kennzahlen für das Dashboard
// Parameter: providerId - Die User-ID des Providers
// Die Statistiken werden in die stat-Cards und das Canvas-Diagramm geschrieben
async function displayProviderStats(providerId) {
    // SICHERHEIT: Doppelte Prüfung dass nur der aktuelle Provider seine Statistiken sieht
    // Verhindert URL-Manipulation um Statistiken anderer Provider zu sehen
    const currentUser = getCurrentUser();
    if (currentUser.id !== providerId || currentUser.role !== 'provider') {
        console.error('Keine Berechtigung für diese Statistiken');
        return;
    }

    try {
        // Lade alle Fahrzeuge des Providers und alle Buchungen
        const vehicles = await getVehiclesByProvider(providerId);
        const allBookings = await getAllBookings();

        // Filtere Buchungen nach eigenen Fahrzeugen
        // Nur Buchungen die Fahrzeuge des Providers betreffen sind relevant
        const vehicleIds = vehicles.map(v => v.id);
        const providerBookings = allBookings.filter(b => vehicleIds.includes(b.vehicle_id));

        // Berechne Kern-Statistiken
        const totalVehicles = vehicles.length;
        const totalBookings = providerBookings.length;

        // Gesamtumsatz: Summiere alle totalPrice Werte aller Buchungen
        // reduce() akkumuliert die Preise, startet bei 0
        const totalRevenue = providerBookings.reduce((sum, booking) => {
            return sum + (booking.totalPrice || 0);
        }, 0);

        // Aktive Buchungen: Zähle Buchungen die heute laufen
        // Eine Buchung ist aktiv wenn heute zwischen Start und End liegt
        const today = new Date();
        const activeBookings = providerBookings.filter(b => {
            const start = new Date(b.start);
            const end = new Date(b.end);
            return start <= today && end >= today;
        }).length;

        // Aktualisiere Statistik-Cards im DOM
        document.getElementById('statVehicles').textContent = totalVehicles;
        document.getElementById('statBookings').textContent = totalBookings;
        document.getElementById('statRevenue').textContent = totalRevenue;
        document.getElementById('statActive').textContent = activeBookings;

        // Rendere Canvas-Balkendiagramm falls providerStats.js geladen ist
        // Das Diagramm zeigt Buchungen pro Fahrzeug visuell an
        if (typeof renderBookingStatsCanvas === 'function') {
            renderBookingStatsCanvas(providerBookings, vehicles);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Statistiken:', error);
        // Zeige Fragezeichen bei Fehler statt falscher Zahlen
        document.getElementById('statVehicles').textContent = '?';
        document.getElementById('statBookings').textContent = '?';
        document.getElementById('statRevenue').textContent = '?';
        document.getElementById('statActive').textContent = '?';
    }
}

// Zeigt alle Fahrzeuge des Providers in einer Tabelle an
// Diese Funktion lädt Fahrzeuge und deren Buchungen und rendert eine interaktive Tabelle
// Parameter: providerId - Die User-ID des Providers
// Jede Zeile enthält Fahrzeugdaten, Buchungsanzahl, Status und Action-Buttons
async function displayProviderVehicles(providerId) {
    const tableBody = document.getElementById('providerVehicleTable');

    if (!tableBody) return;

    // SICHERHEIT: Prüfe dass nur der aktuelle Provider seine Fahrzeuge sieht
    const currentUser = getCurrentUser();
    if (currentUser.id !== providerId || currentUser.role !== 'provider') {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    Keine Berechtigung zum Anzeigen dieser Fahrzeuge.
                </td>
            </tr>
        `;
        return;
    }

    try {
        // Lade alle Fahrzeuge des Providers
        const vehicles = await getVehiclesByProvider(providerId);

        // Falls keine Fahrzeuge: zeige leere Nachricht
        if (vehicles.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        Noch keine Fahrzeuge vorhanden
                    </td>
                </tr>
            `;
            return;
        }

        // Lade Buchungen für alle Fahrzeuge parallel für bessere Performance
        // Promise.all() wartet bis alle Requests fertig sind
        const bookingsPromises = vehicles.map(vehicle => getBookingsByVehicle(vehicle.id));
        const allBookingsArrays = await Promise.all(bookingsPromises);

        // Erstelle Map für schnellen Zugriff auf Buchungen pro Fahrzeug
        const bookingsMap = new Map();
        vehicles.forEach((vehicle, index) => {
            bookingsMap.set(vehicle.id, allBookingsArrays[index]);
        });

        // Generiere HTML für jede Tabellenzeile
        tableBody.innerHTML = vehicles.map(vehicle => {
            // Hole Buchungen für dieses Fahrzeug
            const bookings = bookingsMap.get(vehicle.id) || [];

            // Erstelle Tabellenzeile mit Bild, Daten, Status und Action-Buttons
            // Status: Aktiv (hat Buchungen) oder Inaktiv (keine Buchungen)
            return `
                <tr>
                    <td>
                        <img src="${vehicle.img}" width="80" height="50" class="rounded" style="object-fit: cover;" alt="${vehicle.name}">
                    </td>
                    <td>
                        <strong>${vehicle.name}</strong><br>
                        <small class="text-muted">${vehicle.fuel} • ${vehicle.beds} Betten</small>
                    </td>
                    <td class="text-center">${vehicle.price}€</td>
                    <td class="text-center">${bookings.length}</td>
                    <td class="text-center">
                        <span class="badge ${bookings.length > 0 ? 'bg-success' : 'bg-secondary'}">
                            ${bookings.length > 0 ? 'Aktiv' : 'Inaktiv'}
                        </span>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewVehicleBookings('${vehicle.id}')">
                            <i class="fa-solid fa-calendar"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editVehicle('${vehicle.id}')">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteVehicleConfirm('${vehicle.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeuge:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    Fehler beim Laden der Fahrzeuge. Ist der Server gestartet?
                </td>
            </tr>
        `;
    }
}

// Zeigt alle Buchungen für ein bestimmtes Fahrzeug in einem Modal an
// Diese Funktion wird vom Kalender-Button in der Fahrzeug-Tabelle aufgerufen
// Parameter: vehicleId - Die ID des Fahrzeugs dessen Buchungen angezeigt werden sollen
async function viewVehicleBookings(vehicleId) {
    const currentUser = getCurrentUser();

    try {
        // Lade Fahrzeugdaten
        const vehicle = await getVehicleById(vehicleId);

        // SICHERHEIT: Prüfe dass das Fahrzeug dem aktuellen Provider gehört
        // Verhindert dass Provider Buchungen fremder Fahrzeuge einsehen
        if (vehicle.provider_id !== currentUser.id) {
            alert('Sie haben keine Berechtigung, die Buchungen dieses Fahrzeugs zu sehen.');
            return;
        }

        // Lade alle Buchungen für das Fahrzeug
        const bookings = await getBookingsByVehicle(vehicleId);

        // Falls keine Buchungen: zeige Info-Meldung
        if (bookings.length === 0) {
            alert(`Für "${vehicle.name}" gibt es noch keine Buchungen.`);
            return;
        }

        // Zeige Buchungen in Modal
        await showBookingsModal(vehicle, bookings);
    } catch (error) {
        console.error('Fehler beim Laden der Buchungen:', error);
        alert('Fehler beim Laden der Buchungen. Ist der Server gestartet?');
    }
}

// Erstellt und zeigt ein Modal mit allen Buchungen eines Fahrzeugs
// Das Modal zeigt Buchungsstatus, Kundendaten, Zeitraum und Preis
// Parameter: vehicle - Das Vehicle-Objekt, bookings - Array aller Buchungen
async function showBookingsModal(vehicle, bookings) {
    // Lade alle Kundendaten parallel für bessere Performance
    const userPromises = bookings.map(booking => getUserById(booking.user_id));
    const users = await Promise.all(userPromises);

    // Erstelle Map für schnellen Zugriff auf User-Daten
    const userMap = new Map();
    bookings.forEach((booking, index) => {
        userMap.set(booking.user_id, users[index]);
    });

    // Sortiere Buchungen chronologisch nach Startdatum
    bookings.sort((a, b) => new Date(a.start) - new Date(b.start));

    // Generiere HTML für jede Buchung
    const bookingsHTML = bookings.map(booking => {
        const user = userMap.get(booking.user_id);
        const start = new Date(booking.start);
        const end = new Date(booking.end);
        const today = new Date();
        const isUpcoming = start > today;
        const isActive = start <= today && end >= today;
        const isPast = end < today;

        // Bestimme Status-Badge und Stornierungsmöglichkeit
        let statusBadge = '';
        let canCancel = false;

        if (isActive) {
            statusBadge = '<span class="badge bg-success">Aktiv</span>';
            canCancel = true;
        } else if (isUpcoming) {
            statusBadge = '<span class="badge bg-primary">Bevorstehend</span>';
            canCancel = true;
        } else {
            statusBadge = '<span class="badge bg-secondary">Abgeschlossen</span>';
        }

        // Erstelle Buchungs-Card mit allen Details
        // Provider können aktive und zukünftige Buchungen stornieren (z.B. bei Fahrzeugausfall)
        return `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-7">
                            <h6 class="mb-2">${statusBadge}</h6>
                            <p class="mb-1"><i class="fa-solid fa-calendar me-2"></i>${formatDateDisplay(booking.start)} - ${formatDateDisplay(booking.end)}</p>
                            <p class="mb-1"><i class="fa-solid fa-user me-2"></i>Kunde: ${user ? user.name : 'Unbekannt'}</p>
                            <p class="mb-0"><i class="fa-solid fa-moon me-2"></i>${booking.nights || calculateNights(booking.start, booking.end)} Nächte</p>
                        </div>
                        <div class="col-md-5 text-md-end">
                            <div class="fs-5 fw-bold text-primary mb-2">${booking.totalPrice || 'N/A'}€</div>
                            <small class="text-muted d-block mb-2">ID: ${booking.id}</small>
                            ${canCancel ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="cancelProviderBooking('${booking.id}', '${vehicle.name}')">
                                    <i class="fa-solid fa-xmark me-1"></i>Stornieren
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Erstelle Modal-HTML mit Buchungsliste
    const modalHTML = `
        <div class="modal fade" id="bookingsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fa-solid fa-calendar-check me-2"></i>Buchungen für ${vehicle.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${bookingsHTML}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Schließen</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Entferne altes Modal falls vorhanden (verhindert Duplikate)
    const oldModal = document.getElementById('bookingsModal');
    if (oldModal) {
        oldModal.remove();
    }

    // Füge neues Modal zum DOM hinzu und zeige es an
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('bookingsModal'));
    modal.show();
}

// Storniert eine Buchung als Provider (z.B. bei Fahrzeugausfall)
// Provider-Stornierungen sind kostenlos, im Gegensatz zu Kunden-Stornierungen
// Parameter: bookingId - ID der zu stornierenden Buchung, vehicleName - Name des Fahrzeugs für Bestätigung
async function cancelProviderBooking(bookingId, vehicleName) {
    // Bestätigung einholen
    if (!confirm(`Möchten Sie diese Buchung für "${vehicleName}" wirklich stornieren?\n\nDie Stornierung kann nicht rückgängig gemacht werden.`)) {
        return;
    }

    const currentUser = getCurrentUser();

    try {
        // SICHERHEIT: Prüfe dass die Buchung zu einem eigenen Fahrzeug gehört
        // Verhindert dass Provider fremde Buchungen stornieren
        const booking = await getBookingById(bookingId);
        const vehicle = await getVehicleById(booking.vehicle_id);

        if (vehicle.provider_id !== currentUser.id) {
            alert('Sie haben keine Berechtigung, diese Buchung zu stornieren.');
            return;
        }

        // Buchung löschen
        await deleteBooking(bookingId);
        alert('✓ Buchung wurde erfolgreich storniert.');

        // Schließe Modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookingsModal'));
        if (modal) {
            modal.hide();
        }

        // Aktualisiere Dashboard-Daten
        const currentUser = getCurrentUser();
        await displayProviderStats(currentUser.id);
        await displayProviderVehicles(currentUser.id);
    } catch (error) {
        console.error('Fehler beim Stornieren:', error);
        alert('✗ Fehler beim Stornieren der Buchung. Bitte versuchen Sie es erneut.');
    }
}

// Berechnet die Anzahl Nächte zwischen zwei Daten
// Diese Hilfsfunktion wird für die Anzeige verwendet
// Parameter: startDate/endDate - Datum-Strings im Format YYYY-MM-DD
// Rückgabe: Anzahl Nächte (aufgerundet)
function calculateNights(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Öffnet das Bearbeiten-Modal und füllt es mit Fahrzeugdaten
// Diese Funktion lädt ein Fahrzeug und füllt alle Formular-Felder
// Parameter: vehicleId - ID des zu bearbeitenden Fahrzeugs
async function editVehicle(vehicleId) {
    const currentUser = getCurrentUser();

    try {
        // Lade Fahrzeugdaten
        const vehicle = await getVehicleById(vehicleId);

        if (!vehicle) {
            alert('Fahrzeug nicht gefunden.');
            return;
        }

        // SICHERHEIT: Prüfe dass das Fahrzeug dem Provider gehört
        if (vehicle.provider_id !== currentUser.id) {
            alert('Sie haben keine Berechtigung, dieses Fahrzeug zu bearbeiten.');
            return;
        }

        // Fülle Formular mit bestehenden Daten - Grunddaten
        document.getElementById('editVehicleId').value = vehicle.id;
        document.getElementById('editVehicleName').value = vehicle.name;
        document.getElementById('editVehiclePrice').value = vehicle.price;
        document.getElementById('editVehicleBeds').value = vehicle.beds;
        document.getElementById('editVehicleFuel').value = vehicle.fuel;

        // Bilder: Zeige images Array als komma-getrennte Liste
        // Für Rückwärtskompatibilität mit altem img-Feld
        const images = vehicle.images || (vehicle.img ? [vehicle.img] : []);
        document.getElementById('editVehicleImages').value = images.join(', ');

        document.getElementById('editVehicleDesc').value = vehicle.desc;

        // Technische Daten - nur falls vorhanden
        if (vehicle.details && vehicle.details.tech) {
            document.getElementById('editTechSeats').value = vehicle.details.tech.seats || '';
            document.getElementById('editTechConsumption').value = vehicle.details.tech.consumption || '';
            document.getElementById('editTechPower').value = vehicle.details.tech.power || '';
            document.getElementById('editTechLicense').value = vehicle.details.tech.license || '';
            document.getElementById('editTechEmission').value = vehicle.details.tech.emission || '';
            document.getElementById('editTechDrive').value = vehicle.details.tech.drive || '';
        }

        // Abmessungen - nur falls vorhanden
        if (vehicle.details && vehicle.details.dims) {
            document.getElementById('editDimsLen').value = vehicle.details.dims.len || '';
            document.getElementById('editDimsWidth').value = vehicle.details.dims.width || '';
            document.getElementById('editDimsHeight').value = vehicle.details.dims.height || '';
            document.getElementById('editDimsEmptyWeight').value = vehicle.details.dims.empty_weight || '';
            document.getElementById('editDimsTotalWeight').value = vehicle.details.dims.total_weight || '';
            document.getElementById('editDimsTowing').value = vehicle.details.dims.towing || '';
        }

        // Features als komma-getrennte Liste
        if (vehicle.features && Array.isArray(vehicle.features)) {
            document.getElementById('editFeatures').value = vehicle.features.join(', ');
        } else {
            document.getElementById('editFeatures').value = '';
        }

        // Zeige Modal
        const modal = new bootstrap.Modal(document.getElementById('editVehicleModal'));
        modal.show();
    } catch (error) {
        console.error('Fehler beim Laden des Fahrzeugs:', error);
        alert('Fehler beim Laden der Fahrzeugdaten. Ist der Server gestartet?');
    }
}

// Speichert Änderungen an einem Fahrzeug
// Diese Funktion wird vom Bearbeiten-Formular aufgerufen
// Parameter: event - Das Submit-Event des Formulars
// Rückgabe: false um Standard-Submit zu verhindern
async function handleEditVehicle(event) {
    event.preventDefault();

    const vehicleId = document.getElementById('editVehicleId').value;
    const currentUser = getCurrentUser();

    try {
        // Lade aktuelles Fahrzeug für Sicherheitsprüfung
        const currentVehicle = await getVehicleById(vehicleId);

        // SICHERHEIT: Prüfe dass das Fahrzeug dem Provider gehört
        if (currentVehicle.provider_id !== currentUser.id) {
            alert('Sie haben keine Berechtigung, dieses Fahrzeug zu bearbeiten.');
            return false;
        }

        // Parse Features aus komma-getrenntem String zu Array
        // trim() entfernt Leerzeichen, filter() entfernt leere Einträge
        const featuresValue = document.getElementById('editFeatures').value.trim();
        const features = featuresValue ? featuresValue.split(',').map(f => f.trim()).filter(f => f) : [];

        // Parse Images aus komma-getrenntem String zu Array
        const imagesValue = document.getElementById('editVehicleImages').value.trim();
        const images = imagesValue ? imagesValue.split(',').map(url => url.trim()).filter(url => url) : [];

        // Erstelle aktualisiertes Vehicle-Objekt
        // Spread-Operator (...) behält bestehende Felder, neue Werte überschreiben
        const updatedVehicle = {
            ...currentVehicle,
            name: document.getElementById('editVehicleName').value,
            price: parseInt(document.getElementById('editVehiclePrice').value),
            beds: parseInt(document.getElementById('editVehicleBeds').value),
            fuel: document.getElementById('editVehicleFuel').value,
            img: images.length > 0 ? images[0] : (currentVehicle.img || ''),
            images: images.length > 0 ? images : (currentVehicle.images || [currentVehicle.img]),
            desc: document.getElementById('editVehicleDesc').value,
            features: features,
            details: {
                tech: {
                    seats: document.getElementById('editTechSeats').value || '',
                    fuel: document.getElementById('editVehicleFuel').value,
                    consumption: document.getElementById('editTechConsumption').value || '',
                    power: document.getElementById('editTechPower').value || '',
                    license: document.getElementById('editTechLicense').value || '',
                    emission: document.getElementById('editTechEmission').value || '',
                    drive: document.getElementById('editTechDrive').value || ''
                },
                dims: {
                    len: document.getElementById('editDimsLen').value || '',
                    width: document.getElementById('editDimsWidth').value || '',
                    height: document.getElementById('editDimsHeight').value || '',
                    empty_weight: document.getElementById('editDimsEmptyWeight').value || '',
                    total_weight: document.getElementById('editDimsTotalWeight').value || '',
                    towing: document.getElementById('editDimsTowing').value || ''
                }
            }
        };

        // Speichere via API
        await updateVehicle(vehicleId, updatedVehicle);

        alert('Fahrzeug wurde erfolgreich aktualisiert!');

        // Modal schließen
        const modal = bootstrap.Modal.getInstance(document.getElementById('editVehicleModal'));
        modal.hide();

        // Seite neu laden um aktualisierte Daten anzuzeigen
        location.reload();
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Fahrzeugs:', error);
        alert('Fehler beim Aktualisieren des Fahrzeugs. Ist der Server gestartet?');
    }

    return false;
}

// Löscht ein Fahrzeug nach Bestätigung
// Diese Funktion prüft auf bestehende Buchungen und löscht nur wenn keine vorhanden
// Parameter: vehicleId - ID des zu löschenden Fahrzeugs
async function deleteVehicleConfirm(vehicleId) {
    const currentUser = getCurrentUser();

    try {
        const vehicle = await getVehicleById(vehicleId);

        // SICHERHEIT: Prüfe dass das Fahrzeug dem Provider gehört
        if (vehicle.provider_id !== currentUser.id) {
            alert('Sie haben keine Berechtigung, dieses Fahrzeug zu löschen.');
            return;
        }

        // Prüfe auf bestehende Buchungen
        // Fahrzeuge mit Buchungen können nicht gelöscht werden um Datenintegrität zu wahren
        const bookings = await getBookingsByVehicle(vehicleId);

        if (bookings.length > 0) {
            alert(`Das Fahrzeug "${vehicle.name}" kann nicht gelöscht werden, da noch Buchungen existieren.`);
            return;
        }

        // Bestätigung einholen
        if (!confirm(`Möchten Sie "${vehicle.name}" wirklich löschen?`)) {
            return;
        }

        // Fahrzeug löschen
        await deleteVehicle(vehicleId);
        alert('Fahrzeug wurde gelöscht.');

        // Seite neu laden
        location.reload();
    } catch (error) {
        console.error('Fehler beim Löschen des Fahrzeugs:', error);
        alert('Fehler beim Löschen des Fahrzeugs. Ist der Server gestartet?');
    }
}

// Zeigt/Versteckt das Formular zum Hinzufügen neuer Fahrzeuge
// Diese Funktion togglet die CSS-Klasse 'hidden' um das Formular ein-/auszublenden
function toggleAddVehicleForm() {
    const form = document.getElementById('addVehicleForm');
    if (form) {
        form.classList.toggle('hidden');
    }
}

// Erstellt ein neues Fahrzeug in der Datenbank
// Diese Funktion wird vom Hinzufügen-Formular aufgerufen
// Parameter: event - Das Submit-Event des Formulars
// Rückgabe: false um Standard-Submit zu verhindern
async function handleCreateVehicle(event) {
    event.preventDefault();

    const currentUser = getCurrentUser();

    // Parse Features aus komma-getrenntem String zu Array
    const featuresValue = document.getElementById('features').value.trim();
    const features = featuresValue ? featuresValue.split(',').map(f => f.trim()).filter(f => f) : [];

    // Parse Images aus komma-getrenntem String zu Array
    const imagesValue = document.getElementById('vehicleImages').value.trim();
    const images = imagesValue ? imagesValue.split(',').map(url => url.trim()).filter(url => url) : [];

    // Fallback Bild wenn keine Bilder angegeben
    // Unsplash-Wohnmobil-Bild als Standard
    const defaultImage = 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=80';
    const finalImages = images.length > 0 ? images : [defaultImage];

    // Sammle alle Formular-Daten in ein Vehicle-Objekt
    // generateId('v') erstellt eindeutige ID, provider_id wird automatisch gesetzt
    const newVehicle = {
        id: generateId('v'),
        provider_id: currentUser.id,
        name: document.getElementById('vehicleName').value,
        price: parseInt(document.getElementById('vehiclePrice').value),
        beds: parseInt(document.getElementById('vehicleBeds').value),
        fuel: document.getElementById('vehicleFuel').value,
        desc: document.getElementById('vehicleDesc').value,
        img: finalImages[0],
        images: finalImages,
        features: features,
        details: {
            tech: {
                seats: document.getElementById('techSeats').value || '',
                fuel: document.getElementById('vehicleFuel').value,
                consumption: document.getElementById('techConsumption').value || '',
                power: document.getElementById('techPower').value || '',
                license: document.getElementById('techLicense').value || '',
                emission: document.getElementById('techEmission').value || '',
                drive: document.getElementById('techDrive').value || ''
            },
            dims: {
                len: document.getElementById('dimsLen').value || '',
                width: document.getElementById('dimsWidth').value || '',
                height: document.getElementById('dimsHeight').value || '',
                empty_weight: document.getElementById('dimsEmptyWeight').value || '',
                total_weight: document.getElementById('dimsTotalWeight').value || '',
                towing: document.getElementById('dimsTowing').value || ''
            }
        }
    };

    try {
        // Fahrzeug via API hinzufügen
        // addVehicle() prüft automatisch Berechtigung (nur Provider)
        await addVehicle(newVehicle);

        alert(`Fahrzeug "${newVehicle.name}" wurde erfolgreich hinzugefügt!`);

        // Formular zurücksetzen und verstecken
        event.target.reset();
        toggleAddVehicleForm();

        // Seite neu laden um neues Fahrzeug in Tabelle anzuzeigen
        location.reload();
    } catch (error) {
        console.error('Fehler beim Erstellen des Fahrzeugs:', error);
        alert('Fehler beim Erstellen des Fahrzeugs. Ist der Server gestartet?');
    }

    return false;
}

// Automatische Initialisierung beim Seiten-Load
// Prüft ob DOM bereits geladen ist und ruft initProviderDashboard() auf
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProviderDashboard);
} else {
    initProviderDashboard();
}