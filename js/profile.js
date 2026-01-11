// ===================================
// PROFILE.JS - Benutzerprofil und Buchungsverwaltung
// ===================================
// Diese Datei verwaltet die Profil-Seite für beide Benutzertypen (Customer und Provider).
// Customers sehen ihre Buchungshistorie mit Status-Anzeige (Aktiv, Bevorstehend, Abgeschlossen).
// Provider sehen einen Link zum Dashboard sowie optional ihre eigenen Buchungen.
// Die Buchungsstornierung mit Gebühren-Berechnung (20% für Kunden, kostenlos für Provider) ist ebenfalls implementiert.

// Initialisiert die Profil-Seite basierend auf dem eingeloggten Benutzer
// Diese Funktion wird beim Seiten-Load aufgerufen und verzweigt je nach Benutzer-Rolle
// Führt Auth-Check durch, zeigt Profil-Informationen und lädt rollenspezifische Inhalte
async function initProfile() {
    // Prüfe ob Benutzer eingeloggt ist
    // requireAuth() leitet zum Login weiter falls nicht eingeloggt
    if (!requireAuth()) return;

    const currentUser = getCurrentUser();

    // Zeige grundlegende Profilinformationen (Name, Email, Rolle)
    displayProfileInfo(currentUser);

    // Unterscheidung zwischen Provider und Customer
    // Provider sehen Dashboard-Link und optional Buchungen
    // Customers sehen nur ihre Buchungshistorie
    if (currentUser.role === 'provider') {
        displayProviderProfile(currentUser.id);
    } else {
        await displayBookingHistory(currentUser.id);
    }
}

// Zeigt grundlegende Profilinformationen in der Header-Card an
// Diese Funktion füllt die Profil-Anzeige mit Name, Email und Rolle des Benutzers
// Parameter: user - Das User-Objekt mit allen Benutzerinformationen
// Die Rolle wird in lesbarem Format angezeigt: 'provider' -> 'Anbieter', 'customer' -> 'Kunde'
function displayProfileInfo(user) {
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileRole').textContent =
        user.role === 'provider' ? 'Anbieter' : 'Kunde';
}

// Zeigt das Provider-spezifische Profil mit Dashboard-Link
// Provider sehen primär einen Button zum Anbieter-Dashboard
// Falls der Provider auch selbst Buchungen hat, werden diese zusätzlich angezeigt
// Parameter: providerId - Die User-ID des Providers
async function displayProviderProfile(providerId) {
    const dashboardButtonContainer = document.getElementById('providerDashboardButton');
    const bookingContainer = document.getElementById('bookingHistoryContainer');

    if (!dashboardButtonContainer) return;

    // Zeige Dashboard-Button prominent an
    // Dieser Button leitet zum Provider-Dashboard (anbieter.html) wo Fahrzeuge verwaltet werden
    dashboardButtonContainer.innerHTML = `
        <div class="text-center">
            <a href="anbieter.html" class="btn btn-primary btn-lg">
                <i class="fa-solid fa-dashboard me-2"></i>Zum Dashboard
            </a>
        </div>
    `;

    // Prüfe ob Provider auch Buchungen als Kunde gemacht hat
    // Manche Provider buchen auch Fahrzeuge bei anderen Providern
    try {
        const bookings = await getBookingsByUser(providerId);

        if (bookings.length > 0) {
            // Provider hat Buchungen: zeige Buchungshistorie zusätzlich an
            await displayBookingHistory(providerId);
        } else {
            // Provider hat keine Buchungen: zeige leere Nachricht
            if (bookingContainer) {
                bookingContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-calendar-xmark"></i>
                        <h3>Keine Buchungen vorhanden</h3>
                        <p>Sie haben noch keine Wohnmobile gebucht.</p>
                        <a href="../index.html" class="btn btn-primary mt-3">Fahrzeuge entdecken</a>
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

// Zeigt die Buchungshistorie des Benutzers an
// Diese Funktion lädt alle Buchungen, rendert sie als Cards und zeigt Status-Badges an
// Buchungen werden chronologisch sortiert (neueste zuerst) und nach Status kategorisiert
// Parameter: userId - Die User-ID des Benutzers, append - Falls true wird an bestehende Liste angehängt
async function displayBookingHistory(userId, append = false) {
    const container = document.getElementById('bookingHistoryContainer');

    if (!container) return;

    // SICHERHEIT: Prüfe dass der angemeldete Benutzer seine eigenen Buchungen sieht
    // Verhindert dass User-IDs in der URL manipuliert werden um fremde Buchungen zu sehen
    const currentUser = getCurrentUser();
    if (currentUser.id !== userId) {
        container.innerHTML = `
            <div class="alert alert-danger">
                Keine Berechtigung zum Anzeigen dieser Buchungen.
            </div>
        `;
        return;
    }

    try {
        // Lade alle Buchungen des Benutzers vom Server
        const bookings = await getBookingsByUser(userId);

        // Falls keine Buchungen: zeige leere Nachricht mit Call-to-Action
        if (bookings.length === 0) {
            if (!append) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-calendar-xmark"></i>
                        <h3>Keine Buchungen vorhanden</h3>
                        <p>Sie haben noch keine Wohnmobile gebucht.</p>
                        <a href="../index.html" class="btn btn-primary mt-3">Fahrzeuge entdecken</a>
                    </div>
                `;
            }
            return;
        }

        // Sortiere Buchungen nach Startdatum (neueste zuerst)
        // Damit sieht der Benutzer aktuelle und zukünftige Buchungen zuerst
        bookings.sort((a, b) => new Date(b.start) - new Date(a.start));

        // Lade alle Fahrzeug-Informationen parallel für bessere Performance
        // Promise.all() wartet bis alle Requests fertig sind
        const vehiclePromises = bookings.map(booking => getVehicleById(booking.vehicle_id));
        const vehicles = await Promise.all(vehiclePromises);

        // Erstelle Map für schnellen Zugriff auf Fahrzeug-Daten
        // Map ist effizienter als Array.find() bei vielen Buchungen
        const vehicleMap = new Map();
        vehicles.forEach((vehicle, index) => {
            if (vehicle) {
                vehicleMap.set(bookings[index].vehicle_id, vehicle);
            }
        });

        // Generiere HTML für jede Buchung
        const bookingsHTML = bookings.map(booking => {
            const vehicle = vehicleMap.get(booking.vehicle_id);
            if (!vehicle) return '';

            // Berechne Status der Buchung basierend auf Daten
            const start = new Date(booking.start);
            const end = new Date(booking.end);
            const today = new Date();
            const isUpcoming = start > today;       // Buchung liegt in der Zukunft
            const isActive = start <= today && end >= today;  // Buchung läuft aktuell
            const isPast = end < today;             // Buchung ist vorbei

            // Wähle Status-Badge und Border-Farbe basierend auf Status
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

            // Formatiere Extras für Anzeige falls vorhanden
            // Extras werden als kommaseparierte Liste angezeigt
            let extrasHTML = '';
            if (booking.extras && booking.extras.length > 0) {
                extrasHTML = `
                    <p class="mb-1">
                        <i class="fa-solid fa-plus-circle me-2"></i>
                        <strong>Extras:</strong> ${booking.extras.map(e => e.name).join(', ')}
                    </p>
                `;
            }

            // Erstelle Buchungs-Card mit allen Informationen
            // Stornieren-Button nur für aktive und zukünftige Buchungen
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
                            ${extrasHTML}
                            <p class="mb-0 text-muted small">
                                Buchung-ID: ${booking.id}
                            </p>
                        </div>
                        <div class="col-md-3 text-md-end">
                            <div class="fs-4 fw-bold text-primary">${booking.totalPrice || 'N/A'}€</div>
                            <button class="btn btn-sm btn-outline-primary mt-2" onclick="viewBookingDetails('${booking.id}', '${vehicle.id}')">
                                <i class="fa-solid fa-info-circle me-1"></i>Details ansehen
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

        // Füge HTML zum Container hinzu oder ersetze bestehenden Inhalt
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

// Berechnet die Anzahl Nächte zwischen zwei Daten
// Diese Hilfsfunktion wird verwendet falls nights nicht in der Buchung gespeichert ist
// Parameter: startDate/endDate - Datum-Strings im Format YYYY-MM-DD
// Rückgabe: Anzahl Nächte (aufgerundet bei Teilnächten)
function calculateNights(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Zeigt detaillierte Buchungsinformationen in einem Modal an
// Dieses Modal zeigt eine vollständige Preisaufstellung mit allen Kostenpositionen
// Parameter: bookingId - ID der Buchung, vehicleId - ID des Fahrzeugs
// Das Modal wird dynamisch erstellt und via Bootstrap angezeigt
async function viewBookingDetails(bookingId, vehicleId) {
    try {
        // Lade Buchungs- und Fahrzeugdaten
        const booking = await getBookingById(bookingId);
        const vehicle = await getVehicleById(vehicleId);
        if (!booking || !vehicle) {
            alert('Fehler beim Laden der Details');
            return;
        }

        // Berechne Status für Stornierungsmöglichkeit
        const start = new Date(booking.start);
        const end = new Date(booking.end);
        const today = new Date();
        const isUpcoming = start > today;
        const isActive = start <= today && end >= today;
        const canCancel = isUpcoming || isActive;  // Nur aktive/zukünftige Buchungen stornierbar

        // Status-Badge bestimmen
        let statusBadge = '';
        if (isActive) {
            statusBadge = '<span class="badge bg-success">Aktiv</span>';
        } else if (isUpcoming) {
            statusBadge = '<span class="badge bg-primary">Bevorstehend</span>';
        } else {
            statusBadge = '<span class="badge bg-secondary">Abgeschlossen</span>';
        }

        // Extras-Liste und Gesamtpreis berechnen
        let extrasHTML = '';
        let extrasTotal = 0;
        if (booking.extras && booking.extras.length > 0) {
            extrasTotal = booking.extras.reduce((sum, extra) => sum + (extra.price || 0), 0);
            extrasHTML = `<h6 class="mt-3 mb-2">Gebuchte Extras:</h6><ul class="list-unstyled">${booking.extras.map(e => `<li class="mb-1"><i class="fa-solid fa-check text-success me-2"></i>${e.name} - ${e.price}€</li>`).join('')}</ul>`;
        }

        // Preisaufstellung berechnen
        const nights = booking.nights || calculateNights(booking.start, booking.end);
        const basePrice = nights * vehicle.price;
        const serviceFee = 15;
        const totalPrice = booking.totalPrice || (basePrice + extrasTotal + serviceFee);

        // Erstelle Modal HTML mit vollständiger Buchungsübersicht
        // Zeigt Check-in/out, Nächte, Extras, detaillierte Preisaufstellung
        const modalHTML = `
            <div class="modal fade" id="bookingDetailsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="fa-solid fa-file-invoice me-2"></i>${vehicle.name} ${statusBadge}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h6 class="mb-3">Buchungsinformationen:</h6>
                            <div class="row mb-2">
                                <div class="col-6"><i class="fa-solid fa-calendar-day me-2 text-primary"></i><strong>Check-in:</strong></div>
                                <div class="col-6">${formatDateDisplay(booking.start)}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><i class="fa-solid fa-calendar-check me-2 text-primary"></i><strong>Check-out:</strong></div>
                                <div class="col-6">${formatDateDisplay(booking.end)}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><i class="fa-solid fa-moon me-2 text-primary"></i><strong>Anzahl Nächte:</strong></div>
                                <div class="col-6">${nights}</div>
                            </div>
                            ${extrasHTML}
                            <hr>
                            <h6 class="mb-3">Preisübersicht:</h6>
                            <div class="row mb-2">
                                <div class="col-8">Grundpreis (${nights} × ${vehicle.price}€)</div>
                                <div class="col-4 text-end">${basePrice}€</div>
                            </div>
                            ${extrasTotal > 0 ? `<div class="row mb-2"><div class="col-8">Extras</div><div class="col-4 text-end">${extrasTotal}€</div></div>` : ''}
                            <div class="row mb-2">
                                <div class="col-8">Verwaltungsgebühr</div>
                                <div class="col-4 text-end">${serviceFee}€</div>
                            </div>
                            <hr>
                            <div class="row">
                                <div class="col-8"><strong>Gesamtpreis:</strong></div>
                                <div class="col-4 text-end"><strong class="fs-5 text-primary">${totalPrice}€</strong></div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            ${canCancel ? `<button type="button" class="btn btn-danger" onclick="cancelBookingFromModal('${booking.id}')"><i class="fa-solid fa-xmark me-1"></i>Buchung stornieren</button>` : ''}
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Schließen</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Entferne altes Modal falls vorhanden (verhindert Duplikate)
        const oldModal = document.getElementById('bookingDetailsModal');
        if (oldModal) oldModal.remove();

        // Füge neues Modal zum DOM hinzu und zeige es an
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        new bootstrap.Modal(document.getElementById('bookingDetailsModal')).show();
    } catch (error) {
        console.error('Fehler beim Laden der Buchungsdetails:', error);
        alert('Fehler beim Laden der Details. Bitte versuchen Sie es erneut.');
    }
}

// Storniert eine Buchung aus dem Details-Modal heraus
// Diese Wrapper-Funktion schließt das Modal und ruft dann die Hauptstornierungsfunktion auf
// Parameter: bookingId - ID der zu stornierenden Buchung
async function cancelBookingFromModal(bookingId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailsModal'));
    if (modal) modal.hide();
    await cancelBooking(bookingId);
}

// Legacy-Funktion: Navigation zur Fahrzeug-Detailseite
// Wird nicht mehr aktiv verwendet, bleibt für Kompatibilität erhalten
// Parameter: vehicleId - ID des Fahrzeugs
function viewVehicle(vehicleId) {
    window.location.href = `fahrzeug.html?id=${vehicleId}`;
}

// Storniert eine Buchung mit Gebühren-Berechnung
// Diese Funktion implementiert die Geschäftslogik für Buchungsstornierungen
// Provider stornieren kostenlos, Kunden zahlen 20% des Basispreises als Stornierungsgebühr
// Parameter: bookingId - ID der zu stornierenden Buchung
async function cancelBooking(bookingId) {
    const currentUser = getCurrentUser();

    try {
        // Lade Buchungsdetails für Berechtigungsprüfung und Gebühren-Berechnung
        const booking = await getBookingById(bookingId);
        if (!booking) {
            alert('Buchung konnte nicht gefunden werden.');
            return;
        }

        // SICHERHEIT: Prüfe ob die Buchung dem aktuellen Benutzer gehört
        // Verhindert dass Benutzer fremde Buchungen stornieren
        if (booking.user_id !== currentUser.id) {
            alert('Sie haben keine Berechtigung, diese Buchung zu stornieren.');
            return;
        }

        // Unterscheide zwischen Provider und Customer für Gebühren-Berechnung
        const isProvider = currentUser.role === 'provider';

        let cancellationFee = 0;
        let confirmMessage = '';

        if (isProvider) {
            // Provider stornieren kostenlos
            // Anbieter haben mehr Flexibilität da sie ihre eigenen Buchungen verwalten
            confirmMessage = 'Möchten Sie diese Buchung wirklich stornieren?\n\nDie Stornierung kann nicht rückgängig gemacht werden.';
        } else {
            // Kunden zahlen Stornierungsgebühr
            // Berechne 20% des Basispreises (ohne Extras und Verwaltungskosten)
            const serviceFee = 15;

            // Berechne Extra-Kosten
            let extrasTotal = 0;
            if (booking.extras && booking.extras.length > 0) {
                extrasTotal = booking.extras.reduce((sum, extra) => sum + (extra.price || 0), 0);
            }

            // Basispreis = Gesamtpreis minus Extras minus Verwaltungsgebühr
            // Stornierungsgebühr wird nur vom Basispreis berechnet
            const basePrice = booking.totalPrice - extrasTotal - serviceFee;

            // Stornierungsgebühr: 20% des Basispreises, aufgerundet
            cancellationFee = Math.round(basePrice * 0.20);

            confirmMessage = `STORNIERUNGSKOSTEN\n\nBitte beachten Sie: Bei der Stornierung dieser Buchung fallen folgende Kosten an:\n\nStornierungsgebühr: ${cancellationFee}€ \n\nMöchten Sie die Buchung trotzdem stornieren?`;
        }

        // Bestätigung einholen
        if (!confirm(confirmMessage)) {
            return;
        }

        // Buchung aus Datenbank löschen
        await deleteBooking(bookingId);

        // Erfolgsmeldung mit Gebühren-Information
        if (isProvider) {
            alert('✓ Buchung wurde erfolgreich storniert.');
        } else {
            alert(`✓ Buchung wurde storniert.\n\nEs wurden Stornierungskosten in Höhe von ${cancellationFee}€ berechnet.`);
        }

        // Seite neu laden um aktualisierte Buchungsliste zu zeigen
        location.reload();
    } catch (error) {
        console.error('Fehler beim Stornieren:', error);
        alert('✗ Fehler beim Stornieren der Buchung. Bitte versuchen Sie es erneut.');
    }
}

// Automatische Initialisierung beim Seiten-Load
// Prüft ob DOM bereits geladen ist und ruft initProfile() auf
// document.readyState prüft den Lade-Status der Seite
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfile);
} else {
    initProfile();
}