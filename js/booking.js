/* ===================================
   BOOKING.JS - Buchungslogik
   =================================== */

// ========================================
// ZUSATZANGEBOTE (EXTRAS)
// ========================================

/**
 * Definiert alle verfügbaren Zusatzangebote mit IDs und Namen
 * Diese werden beim Buchen in der Datenbank gespeichert
 */
const EXTRAS_CONFIG = {
    extraBikeRack: 'Fahrradhalter',
    extraFurniture: 'Camping-Möbel',
    extraTent: 'Erweiterungszelt',
    extraAwning: 'Sonnendach',
    extraBedding: 'Bettwäsche-Set',
    extraTowels: 'Handtücher-Set'
};

/**
 * Sammelt alle ausgewählten Zusatzangebote
 * @returns {Array} Array von Objekten mit {id, name, price}
 */
function getSelectedExtras() {
    const selectedExtras = [];
    
    // Durchlaufe alle konfigurierten Extras
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

/**
 * Berechnet die Gesamtsumme aller Extras
 * @returns {number} Summe aller Extra-Preise
 */
function calculateExtrasTotal() {
    const extras = getSelectedExtras();
    return extras.reduce((sum, extra) => sum + extra.price, 0);
}

// ========================================
// PREISBERECHNUNG
// ========================================

/**
 * Berechnet den Gesamtpreis inkl. Extras und zeigt ihn an
 * Wird aufgerufen bei Datumsänderung oder Extra-Auswahl
 */
function calculatePrice() {
    const startInput = document.getElementById('bookStart');
    const endInput = document.getElementById('bookEnd');
    const priceCalcElement = document.getElementById('priceCalculation');

    // Prüfe ob alle benötigten Elemente existieren
    if (!startInput || !endInput || !priceCalcElement) {
        return; // Elemente existieren nicht, beende Funktion
    }

    const startDate = startInput.value;
    const endDate = endInput.value;

    if (!startDate || !endDate || !currentVehicle) {
        priceCalcElement.classList.add('hidden');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Anzahl Nächte berechnen
    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
        priceCalcElement.classList.add('hidden');
        return;
    }

    // Preisberechnung
    const pricePerNight = currentVehicle.price;
    const totalBase = nights * pricePerNight;
    
    // Zusatzangebote berechnen
    const extrasTotal = calculateExtrasTotal();
    const selectedExtras = getSelectedExtras();
    
    const serviceFee = 15;
    const totalPrice = totalBase + extrasTotal + serviceFee;

    // Prüfe ob Anzeigeelemente existieren
    const calcDaysEl = document.getElementById('calcDays');
    const calcPriceEl = document.getElementById('calcPrice');
    const calcTotalBaseEl = document.getElementById('calcTotalBase');
    const calcTotalEl = document.getElementById('calcTotal');
    const extrasInPriceEl = document.getElementById('extrasInPrice');

    if (!calcDaysEl || !calcPriceEl || !calcTotalBaseEl || !calcTotalEl) {
        return; // Anzeigeelemente existieren nicht
    }

    // Basispreis anzeigen
    calcDaysEl.textContent = nights;
    calcPriceEl.textContent = pricePerNight;
    calcTotalBaseEl.textContent = totalBase;
    
    // Extras in der Rechnung anzeigen
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
    
    // Gesamtpreis anzeigen
    calcTotalEl.textContent = totalPrice;
    priceCalcElement.classList.remove('hidden');
}

// Datum-Validierung
async function validateDates() {
    const startInput = document.getElementById('bookStart');
    const endInput = document.getElementById('bookEnd');

    if (!startInput || !endInput) return;

    const startDate = startInput.value;
    const endDate = endInput.value;

    // Setze Minimum auf heute
    const today = new Date().toISOString().split('T')[0];
    startInput.min = today;

    // Wenn Start gewählt, setze End-Minimum
    if (startDate) {
        const minEnd = new Date(startDate);
        minEnd.setDate(minEnd.getDate() + 1);
        endInput.min = minEnd.toISOString().split('T')[0];
    }

    // Prüfe ob Datum verfügbar ist
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

// Buchungsanfrage verarbeiten
async function handleBooking(event) {
    event.preventDefault();

    const currentUser = getCurrentUser();

    // Prüfe Login
    if (!currentUser) {
        const currentPage = `fahrzeug.html?id=${currentVehicle.id}`;
        if (confirm('Sie müssen eingeloggt sein, um zu buchen. Möchten Sie sich jetzt anmelden?')) {
            window.location.href = `anmelden.html?redirect=${encodeURIComponent(currentPage)}`;
        }
        return false;
    }

    const startDate = document.getElementById('bookStart').value;
    const endDate = document.getElementById('bookEnd').value;

    // Validierung
    if (!startDate || !endDate) {
        alert('Bitte wählen Sie Start- und Enddatum.');
        return false;
    }

    try {
        // Prüfe nochmal auf Verfügbarkeit
        const isBooked = await isDateRangeBooked(currentVehicle.id, startDate, endDate);
        if (isBooked) {
            alert('Der gewählte Zeitraum ist leider nicht mehr verfügbar.');
            return false;
        }

        // Berechne Gesamtpreis inkl. Extras
        const start = new Date(startDate);
        const end = new Date(endDate);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const basePrice = nights * currentVehicle.price;
        const extrasTotal = calculateExtrasTotal();
        const totalPrice = basePrice + extrasTotal + 15;
        
        // Sammle ausgewählte Extras
        const selectedExtras = getSelectedExtras();

        // Buchung erstellen mit Extras
        const booking = {
            vehicle_id: currentVehicle.id,
            user_id: currentUser.id,
            start: startDate,
            end: endDate,
            nights: nights,
            totalPrice: totalPrice,
            extras: selectedExtras, // Extras in Buchung speichern
            createdAt: new Date().toISOString()
        };

        await addBooking(booking);

        // Erfolgsmeldung
        showBookingSuccess(booking);
    } catch (error) {
        console.error('Fehler beim Erstellen der Buchung:', error);
        alert('Fehler beim Erstellen der Buchung. Ist der Server gestartet?');
    }

    return false;
}

// Buchungs-Erfolg anzeigen
function showBookingSuccess(booking) {
    let extrasText = '';
    if (booking.extras && booking.extras.length > 0) {
        extrasText = '\n\nGebuchte Extras:\n' + booking.extras.map(e => `• ${e.name} (+${e.price}€)`).join('\n');
    }
    
    alert(`✓ Buchung erfolgreich!\n\nFahrzeug: ${currentVehicle.name}\nZeitraum: ${formatDateDisplay(booking.start)} - ${formatDateDisplay(booking.end)}\nNächte: ${booking.nights}${extrasText}\n\nGesamtpreis: ${booking.totalPrice}€\n\nSie finden Ihre Buchung in Ihrem Profil.`);
    
    location.reload();
}
