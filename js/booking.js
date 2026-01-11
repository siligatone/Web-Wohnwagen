// BOOKING.JS - Buchungslogik für Fahrzeugreservierungen
// Diese Datei verwaltet den kompletten Buchungsprozess für Fahrzeuge.
// Sie kümmert sich um Zusatzangebote (Extras), Preisberechnungen, Datumsprüfungen und das Erstellen von Buchungen.
// Die Preisberechnung erfolgt dynamisch basierend auf Anzahl Nächte, Fahrzeugpreis, Extras und Servicegebühr.

// Konfiguration aller verfügbaren Zusatzangebote
// Mapping zwischen Checkbox-IDs und lesbaren Namen
const EXTRAS_CONFIG = {
    extraBikeRack: 'Fahrradhalter',
    extraFurniture: 'Camping-Möbel',
    extraTent: 'Erweiterungszelt',
    extraAwning: 'Sonnendach',
    extraBedding: 'Bettwäsche-Set',
    extraTowels: 'Handtücher-Set'
};

// Sammelt alle vom Benutzer ausgewählten Zusatzangebote
// Rückgabe: Array von Objekten mit {id, name, price} für jedes Extra
function getSelectedExtras() {
    const selectedExtras = [];

    for (const [id, name] of Object.entries(EXTRAS_CONFIG)) {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            selectedExtras.push({
                id: id,
                name: name,
                price: parseInt(checkbox.dataset.price) || 0
            });
        }
    }

    return selectedExtras;
}

// Berechnet die Gesamtsumme aller ausgewählten Extras
// Rückgabe: Gesamtpreis aller Extras in Euro
function calculateExtrasTotal() {
    const extras = getSelectedExtras();
    return extras.reduce((sum, extra) => sum + extra.price, 0);
}

// Berechnet den Gesamtpreis der Buchung und zeigt ihn dynamisch an
// Wird aufgerufen bei jeder Datumsänderung oder Extra-Auswahl
function calculatePrice() {
    const startInput = document.getElementById('bookStart');
    const endInput = document.getElementById('bookEnd');
    const priceCalcElement = document.getElementById('priceCalculation');

    if (!startInput || !endInput || !priceCalcElement) {
        return;
    }

    const startDate = startInput.value;
    const endDate = endInput.value;

    if (!startDate || !endDate || !currentVehicle) {
        priceCalcElement.classList.add('hidden');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Berechne Anzahl Nächte
    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
        priceCalcElement.classList.add('hidden');
        return;
    }

    // Basispreis: Nächte × Preis pro Nacht
    const pricePerNight = currentVehicle.price;
    const totalBase = nights * pricePerNight;

    const extrasTotal = calculateExtrasTotal();
    const selectedExtras = getSelectedExtras();

    const serviceFee = 15;
    const totalPrice = totalBase + extrasTotal + serviceFee;

    const calcDaysEl = document.getElementById('calcDays');
    const calcPriceEl = document.getElementById('calcPrice');
    const calcTotalBaseEl = document.getElementById('calcTotalBase');
    const calcTotalEl = document.getElementById('calcTotal');
    const extrasInPriceEl = document.getElementById('extrasInPrice');

    if (!calcDaysEl || !calcPriceEl || !calcTotalBaseEl || !calcTotalEl) {
        return;
    }

    // Zeige Basispreis-Berechnung
    calcDaysEl.textContent = nights;
    calcPriceEl.textContent = pricePerNight;
    calcTotalBaseEl.textContent = totalBase;

    // Zeige ausgewählte Extras in der Preisaufstellung
    if (extrasInPriceEl && selectedExtras.length > 0) {
        extrasInPriceEl.innerHTML = selectedExtras.map(extra => `
            <div class="d-flex justify-content-between mb-1 text-muted">
                <span>${extra.name}</span>
                <span>+${extra.price} €</span>
            </div>
        `).join('');
    } else if (extrasInPriceEl) {
        extrasInPriceEl.innerHTML = '';
    }

    calcTotalEl.textContent = totalPrice;
    priceCalcElement.classList.remove('hidden');
}

// Validiert die gewählten Buchungsdaten
// Prüft Gültigkeit und Verfügbarkeit des Fahrzeugs
async function validateDates() {
    const startInput = document.getElementById('bookStart');
    const endInput = document.getElementById('bookEnd');

    if (!startInput || !endInput) return;

    const startDate = startInput.value;
    const endDate = endInput.value;

    // Setze Minimum-Datum auf heute
    const today = new Date().toISOString().split('T')[0];
    startInput.min = today;

    // Enddatum-Minimum auf Start + 1 Tag
    if (startDate) {
        const minEnd = new Date(startDate);
        minEnd.setDate(minEnd.getDate() + 1);
        endInput.min = minEnd.toISOString().split('T')[0];
    }

    // Prüfe Verfügbarkeit
    if (startDate && endDate) {
        try {
            const isBooked = await isDateRangeBooked(currentVehicle.id, startDate, endDate);
            if (isBooked) {
                alert('Der gewählte Zeitraum ist leider nicht verfügbar. Bitte wählen Sie andere Daten.');
                endInput.value = '';
                return false;
            }
        } catch (error) {
            console.error('Fehler bei der Datumsprüfung:', error);
            alert('Fehler beim Prüfen der Verfügbarkeit. Ist der Server gestartet?');
            return false;
        }
    }

    calculatePrice();
    return true;
}

// Verarbeitet das Absenden des Buchungsformulars
// Prüft Login-Status, validiert Daten, erstellt die Buchung und zeigt Bestätigung
async function handleBooking(event) {
    event.preventDefault();

    const currentUser = getCurrentUser();

    if (!currentUser) {
        const currentPage = `fahrzeug.html?id=${currentVehicle.id}`;
        if (confirm('Sie müssen eingeloggt sein, um zu buchen. Möchten Sie sich jetzt anmelden?')) {
            window.location.href = `anmelden.html?redirect=${encodeURIComponent(currentPage)}`;
        }
        return false;
    }

    const startDate = document.getElementById('bookStart').value;
    const endDate = document.getElementById('bookEnd').value;

    if (!startDate || !endDate) {
        alert('Bitte wählen Sie Start- und Enddatum.');
        return false;
    }

    try {
        // Finale Verfügbarkeits-Prüfung
        const isBooked = await isDateRangeBooked(currentVehicle.id, startDate, endDate);
        if (isBooked) {
            alert('Der gewählte Zeitraum ist leider nicht mehr verfügbar.');
            return false;
        }

        // Berechne Buchungsdetails
        const start = new Date(startDate);
        const end = new Date(endDate);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const basePrice = nights * currentVehicle.price;
        const extrasTotal = calculateExtrasTotal();
        const totalPrice = basePrice + extrasTotal + 15;

        const selectedExtras = getSelectedExtras();

        // Erstelle Buchungs-Objekt
        const booking = {
            vehicle_id: currentVehicle.id,
            user_id: currentUser.id,
            start: startDate,
            end: endDate,
            nights: nights,
            totalPrice: totalPrice,
            extras: selectedExtras,
            createdAt: new Date().toISOString()
        };

        await addBooking(booking);
        showBookingSuccess(booking);
    } catch (error) {
        console.error('Fehler beim Erstellen der Buchung:', error);
        alert('Fehler beim Erstellen der Buchung. Ist der Server gestartet?');
    }

    return false;
}

// Zeigt eine Erfolgsmeldung nach erfolgreicher Buchung
// Erstellt formatierte Bestätigung mit allen Buchungsdetails
function showBookingSuccess(booking) {
    let extrasText = '';
    if (booking.extras && booking.extras.length > 0) {
        extrasText = '\n\nGebuchte Extras:\n' + booking.extras.map(e => `• ${e.name} (+${e.price}€)`).join('\n');
    }

    alert(`✓ Buchung erfolgreich!\n\nFahrzeug: ${currentVehicle.name}\nZeitraum: ${formatDateDisplay(booking.start)} - ${formatDateDisplay(booking.end)}\nNächte: ${booking.nights}${extrasText}\n\nGesamtpreis: ${booking.totalPrice}€\n\nSie finden Ihre Buchung in Ihrem Profil.`);

    location.reload();
}
