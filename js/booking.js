/* ===================================
   BOOKING.JS - Buchungslogik
   =================================== */

// Preisberechnung
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
    const serviceFee = 15;
    const totalPrice = totalBase + serviceFee;

    // Prüfe ob Anzeigeelemente existieren
    const calcDaysEl = document.getElementById('calcDays');
    const calcPriceEl = document.getElementById('calcPrice');
    const calcTotalBaseEl = document.getElementById('calcTotalBase');
    const calcTotalEl = document.getElementById('calcTotal');

    if (!calcDaysEl || !calcPriceEl || !calcTotalBaseEl || !calcTotalEl) {
        return; // Anzeigeelemente existieren nicht
    }

    // Anzeigen
    calcDaysEl.textContent = nights;
    calcPriceEl.textContent = pricePerNight;
    calcTotalBaseEl.textContent = totalBase;
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

        // Berechne Gesamtpreis
        const start = new Date(startDate);
        const end = new Date(endDate);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const totalPrice = (nights * currentVehicle.price) + 15;

        // Buchung erstellen
        const booking = {
            vehicle_id: currentVehicle.id,
            user_id: currentUser.id,
            start: startDate,
            end: endDate,
            nights: nights,
            totalPrice: totalPrice,
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
    const message = `
        <div class="alert alert-success alert-custom">
            <h4 class="alert-heading"><i class="fa-solid fa-check-circle me-2"></i>Buchung erfolgreich!</h4>
            <p><strong>${currentVehicle.name}</strong></p>
            <p>Zeitraum: ${formatDateDisplay(booking.start)} - ${formatDateDisplay(booking.end)}</p>
            <p>Gesamtpreis: ${booking.totalPrice}€</p>
            <hr>
            <p class="mb-0">Sie finden Ihre Buchung in Ihrem <a href="profil.html" class="alert-link">Profil</a>.</p>
        </div>
    `;

    // Zeige Modal oder ersetze Formular
    const bookingForm = document.querySelector('form');
    if (bookingForm) {
        bookingForm.innerHTML = message;
    }

    // Scroll nach oben
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
