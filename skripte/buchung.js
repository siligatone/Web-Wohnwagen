// ===================================
// BOOKING.JS - Buchungslogik für Fahrzeugreservierungen
// ===================================
// Diese Datei verwaltet den kompletten Buchungsprozess für Fahrzeuge.
// Sie kümmert sich um Zusatzangebote (Extras), Preisberechnungen, Datumsprüfungen und das Erstellen von Buchungen.
// Die Preisberechnung erfolgt dynamisch basierend auf Anzahl Nächte, Fahrzeugpreis, Extras und Servicegebühr.

// ===================================
// ZUSATZANGEBOTE (EXTRAS)
// ===================================

// Konfiguration aller verfügbaren Zusatzangebote
// Diese Konstante definiert die Mapping zwischen Checkbox-IDs und lesbaren Namen
// Die IDs entsprechen den HTML-Element-IDs der Checkboxen im Buchungsformular
// Die Namen werden in der Buchungsbestätigung und Rechnung angezeigt
// Neue Extras können einfach hinzugefügt werden ohne den restlichen Code zu ändern
const EXTRAS_CONFIG = {
    extraBikeRack: 'Fahrradhalter',
    extraFurniture: 'Camping-Möbel',
    extraTent: 'Erweiterungszelt',
    extraAwning: 'Sonnendach',
    extraBedding: 'Bettwäsche-Set',
    extraTowels: 'Handtücher-Set'
};

// Sammelt alle vom Benutzer ausgewählten Zusatzangebote
// Diese Funktion durchläuft alle konfigurierten Extras und prüft welche Checkboxen aktiviert sind
// Rückgabe: Array von Objekten mit {id, name, price} für jedes ausgewählte Extra
// Beispiel: [{id: 'extraBikeRack', name: 'Fahrradhalter', price: 25}, {...}]
// Der Preis wird aus dem data-price Attribut der Checkbox gelesen
function getSelectedExtras() {
    const selectedExtras = [];

    // Durchlaufe alle konfigurierten Extras aus EXTRAS_CONFIG
    // Object.entries() wandelt das Objekt in ein Array von [key, value] Paaren um
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
// Diese Funktion wird für die Preisberechnung verwendet
// Rückgabe: Gesamtpreis aller Extras in Euro (z.B. 50 für Fahrradhalter + Bettwäsche)
// reduce() summiert alle Extra-Preise: startet bei 0, addiert jeden extra.price
function calculateExtrasTotal() {
    const extras = getSelectedExtras();
    return extras.reduce((sum, extra) => sum + extra.price, 0);
}

// ===================================
// PREISBERECHNUNG
// ===================================

// Berechnet den Gesamtpreis der Buchung und zeigt ihn dynamisch an
// Diese Funktion wird aufgerufen bei jeder Datumsänderung oder Extra-Auswahl
// Sie berechnet: Basispreis (Nächte × Preis/Nacht) + Extras + Servicegebühr (15€)
// Das Ergebnis wird im Preisberechnungs-Div angezeigt
function calculatePrice() {
    const startInput = document.getElementById('bookStart');
    const endInput = document.getElementById('bookEnd');
    const priceCalcElement = document.getElementById('priceCalculation');

    // Prüfe ob alle benötigten HTML-Elemente existieren
    // Falls nicht (z.B. auf einer anderen Seite), beende Funktion ohne Fehler
    if (!startInput || !endInput || !priceCalcElement) {
        return;
    }

    const startDate = startInput.value;
    const endDate = endInput.value;

    // Verstecke Preisberechnung falls Daten fehlen
    // currentVehicle ist eine globale Variable die das aktuell angezeigte Fahrzeug enthält
    if (!startDate || !endDate || !currentVehicle) {
        priceCalcElement.classList.add('hidden');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Berechne Anzahl Nächte zwischen Start- und Enddatum
    // diffTime ist die Differenz in Millisekunden
    // Durch (1000 * 60 * 60 * 24) teilen um Tage zu bekommen
    // Math.ceil() rundet auf um auch Teilnächte als volle Nacht zu berechnen
    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Validierung: Enddatum muss nach Startdatum liegen
    if (nights <= 0) {
        priceCalcElement.classList.add('hidden');
        return;
    }

    // Basispreis berechnen: Anzahl Nächte multipliziert mit Preis pro Nacht
    const pricePerNight = currentVehicle.price;
    const totalBase = nights * pricePerNight;

    // Zusatzangebote zur Berechnung hinzufügen
    const extrasTotal = calculateExtrasTotal();
    const selectedExtras = getSelectedExtras();

    // Servicegebühr ist fix 15€ pro Buchung
    // Diese deckt Verwaltungskosten, Versicherung, Reinigung etc.
    const serviceFee = 15;
    const totalPrice = totalBase + extrasTotal + serviceFee;

    // Prüfe ob alle Anzeigeelemente im DOM existieren
    const calcDaysEl = document.getElementById('calcDays');
    const calcPriceEl = document.getElementById('calcPrice');
    const calcTotalBaseEl = document.getElementById('calcTotalBase');
    const calcTotalEl = document.getElementById('calcTotal');
    const extrasInPriceEl = document.getElementById('extrasInPrice');

    if (!calcDaysEl || !calcPriceEl || !calcTotalBaseEl || !calcTotalEl) {
        return;
    }

    // Zeige die Basispreis-Berechnung an
    // Format: "X Nächte × Y€ = Z€"
    calcDaysEl.textContent = nights;
    calcPriceEl.textContent = pricePerNight;
    calcTotalBaseEl.textContent = totalBase;

    // Zeige ausgewählte Extras in der Preisaufstellung an
    // Jedes Extra wird als separate Zeile mit Name und Preis angezeigt
    // Falls keine Extras gewählt sind, wird der Bereich geleert
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

    // Zeige den finalen Gesamtpreis an und mache die Preisberechnung sichtbar
    calcTotalEl.textContent = totalPrice;
    priceCalcElement.classList.remove('hidden');
}

// Validiert die gewählten Buchungsdaten
// Diese Funktion prüft ob die Daten gültig sind und ob das Fahrzeug verfügbar ist
// Sie setzt auch Mindest-Daten für die Input-Felder (heute für Start, Start+1 für Ende)
// Rückgabe: true falls Daten valide und Fahrzeug verfügbar, false falls nicht
async function validateDates() {
    const startInput = document.getElementById('bookStart');
    const endInput = document.getElementById('bookEnd');

    if (!startInput || !endInput) return;

    const startDate = startInput.value;
    const endDate = endInput.value;

    // Setze Minimum-Datum auf heute
    // Verhindert dass Benutzer vergangene Daten wählen können
    // toISOString().split('T')[0] konvertiert zu YYYY-MM-DD Format
    const today = new Date().toISOString().split('T')[0];
    startInput.min = today;

    // Wenn Startdatum gewählt wurde, setze Enddatum-Minimum auf Start + 1 Tag
    // Verhindert dass Enddatum vor Startdatum liegt (mindestens 1 Nacht)
    if (startDate) {
        const minEnd = new Date(startDate);
        minEnd.setDate(minEnd.getDate() + 1);
        endInput.min = minEnd.toISOString().split('T')[0];
    }

    // Prüfe Verfügbarkeit des Fahrzeugs für den gewählten Zeitraum
    // isDateRangeBooked() prüft ob es bereits Buchungen gibt die sich überlappen
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

    // Aktualisiere Preisberechnung mit den neuen Daten
    calculatePrice();
    return true;
}

// Verarbeitet das Absenden des Buchungsformulars
// Diese Funktion wird aufgerufen wenn der Benutzer auf "Jetzt buchen" klickt
// Sie prüft Login-Status, validiert Daten, erstellt die Buchung und zeigt Bestätigung
// Parameter: event - Das Submit-Event des Formulars
// Rückgabe: false um Standard-Formular-Submit zu verhindern
async function handleBooking(event) {
    event.preventDefault();

    const currentUser = getCurrentUser();

    // Prüfe ob Benutzer eingeloggt ist
    // Nur eingeloggte Benutzer können buchen
    // Falls nicht eingeloggt, biete Weiterleitung zur Login-Seite an
    // Die aktuelle Fahrzeug-Seite wird als redirect-Parameter mitgegeben
    if (!currentUser) {
        const currentPage = `fahrzeug.html?id=${currentVehicle.id}`;
        if (confirm('Sie müssen eingeloggt sein, um zu buchen. Möchten Sie sich jetzt anmelden?')) {
            window.location.href = `anmelden.html?redirect=${encodeURIComponent(currentPage)}`;
        }
        return false;
    }

    const startDate = document.getElementById('bookStart').value;
    const endDate = document.getElementById('bookEnd').value;

    // Grundlegende Validierung der Eingaben
    if (!startDate || !endDate) {
        alert('Bitte wählen Sie Start- und Enddatum.');
        return false;
    }

    try {
        // Finale Verfügbarkeits-Prüfung vor dem Buchen
        // Nötig da sich Verfügbarkeit ändern könnte während der Benutzer das Formular ausfüllt
        const isBooked = await isDateRangeBooked(currentVehicle.id, startDate, endDate);
        if (isBooked) {
            alert('Der gewählte Zeitraum ist leider nicht mehr verfügbar.');
            return false;
        }

        // Berechne alle Buchungsdetails
        // Anzahl Nächte wird aus Datumsdifferenz berechnet
        const start = new Date(startDate);
        const end = new Date(endDate);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const basePrice = nights * currentVehicle.price;
        const extrasTotal = calculateExtrasTotal();
        const totalPrice = basePrice + extrasTotal + 15;

        // Sammle alle ausgewählten Extras für die Buchung
        const selectedExtras = getSelectedExtras();

        // Erstelle Buchungs-Objekt mit allen relevanten Informationen
        // Dieses Objekt wird in der Datenbank gespeichert
        // extras wird als Array mitgespeichert um später anzuzeigen was gebucht wurde
        // createdAt speichert Zeitstempel der Buchung für Sortierung und Tracking
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

        // Speichere Buchung in der Datenbank via API
        // addBooking() ruft POST /bookings auf
        await addBooking(booking);

        // Zeige Erfolgsmeldung mit allen Buchungsdetails
        showBookingSuccess(booking);
    } catch (error) {
        console.error('Fehler beim Erstellen der Buchung:', error);
        alert('Fehler beim Erstellen der Buchung. Ist der Server gestartet?');
    }

    return false;
}

// Zeigt eine Erfolgsmeldung nach erfolgreicher Buchung
// Diese Funktion erstellt eine formatierte Bestätigung mit allen Buchungsdetails
// Parameter: booking - Das Buchungs-Objekt mit allen Informationen
// Nach der Bestätigung wird die Seite neu geladen um den Buchungsbutton zu deaktivieren
function showBookingSuccess(booking) {
    // Erstelle Text-Liste der gebuchten Extras
    // Falls Extras vorhanden sind, zeige sie als Bullet-Liste mit Preisen
    let extrasText = '';
    if (booking.extras && booking.extras.length > 0) {
        extrasText = '\n\nGebuchte Extras:\n' + booking.extras.map(e => `• ${e.name} (+${e.price}€)`).join('\n');
    }

    // Zeige detaillierte Buchungsbestätigung
    // Enthält Fahrzeugname, Zeitraum, Anzahl Nächte, Extras und Gesamtpreis
    // formatDateDisplay() konvertiert YYYY-MM-DD zu deutschem Format (TT.MM.YYYY)
    alert(`✓ Buchung erfolgreich!\n\nFahrzeug: ${currentVehicle.name}\nZeitraum: ${formatDateDisplay(booking.start)} - ${formatDateDisplay(booking.end)}\nNächte: ${booking.nights}${extrasText}\n\nGesamtpreis: ${booking.totalPrice}€\n\nSie finden Ihre Buchung in Ihrem Profil.`);

    // Lade Seite neu um Buchungsformular zu aktualisieren
    // Das Fahrzeug ist nun für diesen Zeitraum gebucht
    location.reload();
}
