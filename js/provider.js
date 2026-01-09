/* ===================================
   PROVIDER.JS - Anbieter-Dashboard
   =================================== */

// Provider-Dashboard initialisieren
async function initProviderDashboard() {
    // Auth-Check - nur Provider dürfen zugreifen
    if (!requireAuth('provider')) return;

    const currentUser = getCurrentUser();

    // Statistiken anzeigen
    await displayProviderStats(currentUser.id);

    // Fahrzeug-Liste anzeigen
    await displayProviderVehicles(currentUser.id);
}

// Statistiken anzeigen
async function displayProviderStats(providerId) {
    try {
        const vehicles = await getVehiclesByProvider(providerId);
        const allBookings = await getAllBookings();

        // Filtern nach eigenen Fahrzeugen
        const vehicleIds = vehicles.map(v => v.id);
        const providerBookings = allBookings.filter(b => vehicleIds.includes(b.vehicle_id));

        // Berechne Statistiken
        const totalVehicles = vehicles.length;
        const totalBookings = providerBookings.length;

        // Gesamtumsatz
        const totalRevenue = providerBookings.reduce((sum, booking) => {
            return sum + (booking.totalPrice || 0);
        }, 0);

        // Aktive Buchungen
        const today = new Date();
        const activeBookings = providerBookings.filter(b => {
            const start = new Date(b.start);
            const end = new Date(b.end);
            return start <= today && end >= today;
        }).length;

        // Anzeigen
        document.getElementById('statVehicles').textContent = totalVehicles;
        document.getElementById('statBookings').textContent = totalBookings;
        document.getElementById('statRevenue').textContent = totalRevenue;
        document.getElementById('statActive').textContent = activeBookings;
    } catch (error) {
        console.error('Fehler beim Laden der Statistiken:', error);
        document.getElementById('statVehicles').textContent = '?';
        document.getElementById('statBookings').textContent = '?';
        document.getElementById('statRevenue').textContent = '?';
        document.getElementById('statActive').textContent = '?';
    }
}

// Fahrzeug-Liste anzeigen
async function displayProviderVehicles(providerId) {
    const tableBody = document.getElementById('providerVehicleTable');

    if (!tableBody) return;

    try {
        const vehicles = await getVehiclesByProvider(providerId);

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

        // Lade alle Buchungen parallel
        const bookingsPromises = vehicles.map(vehicle => getBookingsByVehicle(vehicle.id));
        const allBookingsArrays = await Promise.all(bookingsPromises);

        // Erstelle Map für schnellen Zugriff
        const bookingsMap = new Map();
        vehicles.forEach((vehicle, index) => {
            bookingsMap.set(vehicle.id, allBookingsArrays[index]);
        });

        tableBody.innerHTML = vehicles.map(vehicle => {
            // Zähle Buchungen für dieses Fahrzeug
            const bookings = bookingsMap.get(vehicle.id) || [];

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

// Fahrzeug-Buchungen anzeigen
async function viewVehicleBookings(vehicleId) {
    try {
        const vehicle = await getVehicleById(vehicleId);
        const bookings = await getBookingsByVehicle(vehicleId);

        if (bookings.length === 0) {
            alert(`Für "${vehicle.name}" gibt es noch keine Buchungen.`);
            return;
        }

        let message = `Buchungen für "${vehicle.name}":\n\n`;

        // Lade alle User-Daten parallel
        const userPromises = bookings.map(booking => getUserById(booking.user_id));
        const users = await Promise.all(userPromises);

        // Erstelle Map für schnellen Zugriff
        const userMap = new Map();
        bookings.forEach((booking, index) => {
            userMap.set(booking.user_id, users[index]);
        });

        for (const booking of bookings) {
            const user = userMap.get(booking.user_id);
            message += `• ${formatDateDisplay(booking.start)} - ${formatDateDisplay(booking.end)}\n`;
            message += `  Kunde: ${user ? user.name : 'Unbekannt'}\n`;
            message += `  Preis: ${booking.totalPrice || 'N/A'}€\n\n`;
        }

        alert(message);
    } catch (error) {
        console.error('Fehler beim Laden der Buchungen:', error);
        alert('Fehler beim Laden der Buchungen. Ist der Server gestartet?');
    }
}

// Fahrzeug bearbeiten
async function editVehicle(vehicleId) {
    try {
        // Lade Fahrzeugdaten
        const vehicle = await getVehicleById(vehicleId);

        if (!vehicle) {
            alert('Fahrzeug nicht gefunden.');
            return;
        }

        // Fülle Formular mit bestehenden Daten - Grunddaten
        document.getElementById('editVehicleId').value = vehicle.id;
        document.getElementById('editVehicleName').value = vehicle.name;
        document.getElementById('editVehiclePrice').value = vehicle.price;
        document.getElementById('editVehicleBeds').value = vehicle.beds;
        document.getElementById('editVehicleFuel').value = vehicle.fuel;
        document.getElementById('editVehicleImage').value = vehicle.img || '';
        document.getElementById('editVehicleDesc').value = vehicle.desc;

        // Technische Daten
        if (vehicle.details && vehicle.details.tech) {
            document.getElementById('editTechSeats').value = vehicle.details.tech.seats || '';
            document.getElementById('editTechConsumption').value = vehicle.details.tech.consumption || '';
            document.getElementById('editTechPower').value = vehicle.details.tech.power || '';
            document.getElementById('editTechLicense').value = vehicle.details.tech.license || '';
            document.getElementById('editTechEmission').value = vehicle.details.tech.emission || '';
            document.getElementById('editTechDrive').value = vehicle.details.tech.drive || '';
        }

        // Abmessungen
        if (vehicle.details && vehicle.details.dims) {
            document.getElementById('editDimsLen').value = vehicle.details.dims.len || '';
            document.getElementById('editDimsWidth').value = vehicle.details.dims.width || '';
            document.getElementById('editDimsHeight').value = vehicle.details.dims.height || '';
            document.getElementById('editDimsEmptyWeight').value = vehicle.details.dims.empty_weight || '';
            document.getElementById('editDimsTotalWeight').value = vehicle.details.dims.total_weight || '';
            document.getElementById('editDimsTowing').value = vehicle.details.dims.towing || '';
        }

        // Features
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

// Fahrzeug-Änderungen speichern
async function handleEditVehicle(event) {
    event.preventDefault();

    const vehicleId = document.getElementById('editVehicleId').value;

    try {
        // Lade aktuelles Fahrzeug
        const currentVehicle = await getVehicleById(vehicleId);

        // Parse Features (komma-getrennt)
        const featuresValue = document.getElementById('editFeatures').value.trim();
        const features = featuresValue ? featuresValue.split(',').map(f => f.trim()).filter(f => f) : [];

        // Update alle bearbeitbaren Felder
        const updatedVehicle = {
            ...currentVehicle,
            name: document.getElementById('editVehicleName').value,
            price: parseInt(document.getElementById('editVehiclePrice').value),
            beds: parseInt(document.getElementById('editVehicleBeds').value),
            fuel: document.getElementById('editVehicleFuel').value,
            img: document.getElementById('editVehicleImage').value || currentVehicle.img,
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

        // Speichern
        await updateVehicle(vehicleId, updatedVehicle);

        alert('Fahrzeug wurde erfolgreich aktualisiert!');

        // Modal schließen
        const modal = bootstrap.Modal.getInstance(document.getElementById('editVehicleModal'));
        modal.hide();

        // Neu laden
        location.reload();
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Fahrzeugs:', error);
        alert('Fehler beim Aktualisieren des Fahrzeugs. Ist der Server gestartet?');
    }

    return false;
}

// Fahrzeug löschen
async function deleteVehicleConfirm(vehicleId) {
    try {
        const vehicle = await getVehicleById(vehicleId);
        const bookings = await getBookingsByVehicle(vehicleId);

        if (bookings.length > 0) {
            alert(`Das Fahrzeug "${vehicle.name}" kann nicht gelöscht werden, da noch Buchungen existieren.`);
            return;
        }

        if (!confirm(`Möchten Sie "${vehicle.name}" wirklich löschen?`)) {
            return;
        }

        await deleteVehicle(vehicleId);
        alert('Fahrzeug wurde gelöscht.');

        // Neu laden
        location.reload();
    } catch (error) {
        console.error('Fehler beim Löschen des Fahrzeugs:', error);
        alert('Fehler beim Löschen des Fahrzeugs. Ist der Server gestartet?');
    }
}

// Neues Fahrzeug hinzufügen (Toggle Form)
function toggleAddVehicleForm() {
    const form = document.getElementById('addVehicleForm');
    if (form) {
        form.classList.toggle('hidden');
    }
}

// Neues Fahrzeug erstellen
async function handleCreateVehicle(event) {
    event.preventDefault();

    const currentUser = getCurrentUser();

    // Parse Features (komma-getrennt)
    const featuresValue = document.getElementById('features').value.trim();
    const features = featuresValue ? featuresValue.split(',').map(f => f.trim()).filter(f => f) : [];

    // Formular-Daten sammeln
    const newVehicle = {
        id: generateId('v'),
        provider_id: currentUser.id,
        name: document.getElementById('vehicleName').value,
        price: parseInt(document.getElementById('vehiclePrice').value),
        beds: parseInt(document.getElementById('vehicleBeds').value),
        fuel: document.getElementById('vehicleFuel').value,
        desc: document.getElementById('vehicleDesc').value,
        img: document.getElementById('vehicleImage').value || 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=80',
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
        // Fahrzeug hinzufügen
        await addVehicle(newVehicle);

        alert(`Fahrzeug "${newVehicle.name}" wurde erfolgreich hinzugefügt!`);

        // Form zurücksetzen und verstecken
        event.target.reset();
        toggleAddVehicleForm();

        // Neu laden
        location.reload();
    } catch (error) {
        console.error('Fehler beim Erstellen des Fahrzeugs:', error);
        alert('Fehler beim Erstellen des Fahrzeugs. Ist der Server gestartet?');
    }

    return false;
}

// Bei DOM-Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProviderDashboard);
} else {
    initProviderDashboard();
}
