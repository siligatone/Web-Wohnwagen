/* ===================================
   PROFILE.JS - Kundenprofil & Buchungshistorie
   =================================== */

// Profil-Seite initialisieren
async function initProfile() {
    // Auth-Check
    if (!requireAuth()) return;

    const currentUser = getCurrentUser();

    // Profilinformationen anzeigen
    displayProfileInfo(currentUser);

    // Anbieter oder Kunde?
    if (currentUser.role === 'provider') {
        // Anbieter: Zeige Dashboard-Link
        displayProviderProfile(currentUser.id);
    } else {
        // Kunde: Zeige Buchungshistorie
        await displayBookingHistory(currentUser.id);
    }
}

// Profilinformationen anzeigen
function displayProfileInfo(user) {
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileRole').textContent =
        user.role === 'provider' ? 'Anbieter' : 'Kunde';
}

// Anbieter-Profil anzeigen
async function displayProviderProfile(providerId) {
    const dashboardButtonContainer = document.getElementById('providerDashboardButton');
    const bookingContainer = document.getElementById('bookingHistoryContainer');

    if (!dashboardButtonContainer) return;

    // Dashboard-Button immer anzeigen
    dashboardButtonContainer.innerHTML = `
        <div class="text-center">
            <a href="anbieter.html" class="btn btn-primary btn-lg">
                <i class="fa-solid fa-dashboard me-2"></i>Zum Dashboard
            </a>
        </div>
    `;

    // Buchungen anzeigen (wenn vorhanden)
    try {
        const bookings = await getBookingsByUser(providerId);

        if (bookings.length > 0) {
            await displayBookingHistory(providerId);
        } else {
            // Keine Buchungen - leere Nachricht im Booking-Container
            if (bookingContainer) {
                bookingContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-calendar-xmark"></i>
                        <h3>Keine Buchungen vorhanden</h3>
                        <p>Sie haben noch keine Wohnmobile gebucht.</p>
                        <a href="../startseite.html" class="btn btn-primary mt-3">Fahrzeuge entdecken</a>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Fehler beim Laden der Anbieter-Daten:', error);
        if (bookingContainer) {
            bookingContainer.innerHTML = `
                <div class="alert alert-danger">
                    Fehler beim Laden der Buchungen. Ist der Server gestartet?
                </div>
            `;
        }
    }
}

// Buchungshistorie anzeigen
async function displayBookingHistory(userId, append = false) {
    const container = document.getElementById('bookingHistoryContainer');

    if (!container) return;

    try {
        const bookings = await getBookingsByUser(userId);

        if (bookings.length === 0) {
            if (!append) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-calendar-xmark"></i>
                        <h3>Keine Buchungen vorhanden</h3>
                        <p>Sie haben noch keine Wohnmobile gebucht.</p>
                        <a href="../startseite.html" class="btn btn-primary mt-3">Fahrzeuge entdecken</a>
                    </div>
                `;
            }
            return;
        }

        // Sortiere nach Datum (neueste zuerst)
        bookings.sort((a, b) => new Date(b.start) - new Date(a.start));

        // Lade alle Fahrzeuge parallel
        const vehiclePromises = bookings.map(booking => getVehicleById(booking.vehicle_id));
        const vehicles = await Promise.all(vehiclePromises);

        // Erstelle Map für schnellen Zugriff
        const vehicleMap = new Map();
        vehicles.forEach((vehicle, index) => {
            if (vehicle) {
                vehicleMap.set(bookings[index].vehicle_id, vehicle);
            }
        });

        const bookingsHTML = bookings.map(booking => {
            const vehicle = vehicleMap.get(booking.vehicle_id);
            if (!vehicle) return '';

            const start = new Date(booking.start);
            const end = new Date(booking.end);
            const today = new Date();
            const isUpcoming = start > today;
            const isActive = start <= today && end >= today;
            const isPast = end < today;

            let statusBadge = '';
            let statusClass = '';

            if (isActive) {
                statusBadge = '<span class="badge bg-success">Aktiv</span>';
                statusClass = 'border-success';
            } else if (isUpcoming) {
                statusBadge = '<span class="badge bg-primary">Bevorstehend</span>';
                statusClass = 'border-primary';
            } else {
                statusBadge = '<span class="badge bg-secondary">Abgeschlossen</span>';
                statusClass = 'border-secondary';
            }

            return `
                <div class="booking-history-card ${statusClass}">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <img src="${vehicle.img}" class="img-fluid rounded" alt="${vehicle.name}">
                        </div>
                        <div class="col-md-6">
                            <h5 class="mb-2">${vehicle.name} ${statusBadge}</h5>
                            <p class="mb-1">
                                <i class="fa-solid fa-calendar me-2"></i>
                                <strong>Zeitraum:</strong> ${formatDateDisplay(booking.start)} - ${formatDateDisplay(booking.end)}
                            </p>
                            <p class="mb-1">
                                <i class="fa-solid fa-moon me-2"></i>
                                <strong>Nächte:</strong> ${booking.nights || calculateNights(booking.start, booking.end)}
                            </p>
                            <p class="mb-0 text-muted small">
                                Buchung-ID: ${booking.id}
                            </p>
                        </div>
                        <div class="col-md-3 text-md-end">
                            <div class="fs-4 fw-bold text-primary">${booking.totalPrice || 'N/A'}€</div>
                            <button class="btn btn-sm btn-outline-primary mt-2" onclick="viewVehicle('${vehicle.id}')">
                                Details ansehen
                            </button>
                            ${(isUpcoming || isActive) ? `
                                <button class="btn btn-sm btn-outline-danger mt-2" onclick="cancelBooking('${booking.id}')">
                                    <i class="fa-solid fa-xmark me-1"></i>Stornieren
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (append) {
            container.insertAdjacentHTML('beforeend', bookingsHTML);
        } else {
            container.innerHTML = bookingsHTML;
        }
    } catch (error) {
        console.error('Fehler beim Laden der Buchungshistorie:', error);
        if (!append) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    Fehler beim Laden der Buchungen. Ist der Server gestartet?
                </div>
            `;
        }
    }
}

// Berechne Anzahl der Nächte
function calculateNights(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Zu Fahrzeug-Seite navigieren
function viewVehicle(vehicleId) {
    window.location.href = `fahrzeug.html?id=${vehicleId}`;
}

// Buchung stornieren
async function cancelBooking(bookingId) {
    const currentUser = getCurrentUser();
    
    try {
        // Lade Buchungsdetails
        const booking = await getBookingById(bookingId);
        if (!booking) {
            alert('Buchung konnte nicht gefunden werden.');
            return;
        }

        // Prüfe ob Nutzer Anbieter ist
        const isProvider = currentUser.role === 'provider';
        
        let cancellationFee = 0;
        let confirmMessage = '';
        
        if (isProvider) {
            // Anbieter storniert kostenlos
            confirmMessage = 'Möchten Sie diese Buchung wirklich stornieren?\n\nDie Stornierung kann nicht rückgängig gemacht werden.';
        } else {
            // Kunde zahlt Stornierungsgebühr
            // Berechne Stornierungskosten: 20% des Basispreises (ohne Extras und Verwaltungskosten)
            const serviceFee = 15; // Verwaltungskosten
            
            // Berechne Extra-Kosten
            let extrasTotal = 0;
            if (booking.extras && booking.extras.length > 0) {
                extrasTotal = booking.extras.reduce((sum, extra) => sum + (extra.price || 0), 0);
            }
            
            // Basispreis = Gesamtpreis - Extras - Verwaltungskosten
            const basePrice = booking.totalPrice - extrasTotal - serviceFee;
            
            // Stornierungsgebühr: 20% des Basispreises
            cancellationFee = Math.round(basePrice * 0.20);
            
            confirmMessage = `STORNIERUNGSKOSTEN\n\nBitte beachten Sie: Bei der Stornierung dieser Buchung fallen folgende Kosten an:\n\nStornierungsgebühr: ${cancellationFee}€ \n\nMöchten Sie die Buchung trotzdem stornieren?`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }

        // Buchung löschen
        await deleteBooking(bookingId);
        
        if (isProvider) {
            alert('✓ Buchung wurde erfolgreich storniert.');
        } else {
            alert(`✓ Buchung wurde storniert.\n\nEs wurden Stornierungskosten in Höhe von ${cancellationFee}€ berechnet.`);
        }

        // Seite neu laden
        location.reload();
    } catch (error) {
        console.error('Fehler beim Stornieren:', error);
        alert('✗ Fehler beim Stornieren der Buchung. Bitte versuchen Sie es erneut.');
    }
}

// Bei DOM-Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfile);
} else {
    initProfile();
}
