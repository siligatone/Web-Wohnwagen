// CALENDAR.JS - Interaktive Kalender-Komponente für Fahrzeugbuchungen
// Diese Datei stellt einen visuellen Kalender bereit der verfügbare und gebuchte Tage anzeigt.
// Benutzer können Start- und Enddatum durch Klicken auf Tage im Kalender auswählen.
// Der Kalender zeigt vergangene Tage (grau), gebuchte Tage (rot) und verfügbare Tage (grün) an.
// Die Auswahl wird automatisch mit den Buchungsformular-Feldern synchronisiert.

// Globale Variablen für Kalender-Status
let currentCalendarDate = new Date();
let currentVehicleId = null;
let selectedStartDate = null;
let selectedEndDate = null;

// Initialisiert den Kalender für ein bestimmtes Fahrzeug
// Setzt die Fahrzeug-ID und rendert den Kalender
async function initCalendar(vehicleId) {
    currentVehicleId = vehicleId;
    await renderCalendar();
}

// Wechselt zum vorherigen oder nächsten Monat
// Parameter delta: -1 für zurück, +1 für vorwärts
async function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    await renderCalendar();
}

// Rendert den kompletten Kalender mit allen Tagen und Status-Markierungen
// Lädt Buchungen vom Server und markiert Tage entsprechend (vergangen, gebucht, ausgewählt, verfügbar)
async function renderCalendar() {
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const monthYearDisplay = document.getElementById('calMonthYear');
    const daysContainer = document.getElementById('calDays');
    const prevBtn = document.getElementById('calPrevBtn');

    if (!monthYearDisplay || !daysContainer) return;

    try {
        monthYearDisplay.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;

        // Deaktiviere "Vorheriger Monat" Button für aktuelle oder vergangene Monate
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);

        if (prevBtn) {
            prevBtn.disabled = firstOfMonth <= new Date(today.getFullYear(), today.getMonth(), 1);
        }

        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Berechne ersten Wochentag (Montag als erster Tag)
        let firstWeekday = firstDay.getDay();
        firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;

        const bookings = currentVehicleId ? await getBookingsByVehicle(currentVehicleId) : [];

        let html = '';

        // Leere Zellen für Wochentag-Ausrichtung
        for (let i = 0; i < firstWeekday; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Generiere HTML für jeden Tag
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const currentDate = new Date(year, month, day);
            const dateStr = formatDate(currentDate);

            let classes = 'calendar-day';
            let clickHandler = `onclick="selectDate('${dateStr}')"`;

            if (currentDate < today) {
                classes += ' past';
                clickHandler = '';
            } else if (isDateBooked(dateStr, bookings)) {
                classes += ' booked';
                clickHandler = '';
            } else if (isDateSelected(dateStr)) {
                classes += ' selected';
            }

            html += `<div class="${classes}" ${clickHandler}>${day}</div>`;
        }

        daysContainer.innerHTML = html;
    } catch (error) {
        console.error('Fehler beim Rendern des Kalenders:', error);
        daysContainer.innerHTML = '<div class="alert alert-danger">Fehler beim Laden der Buchungen.</div>';
    }
}

// Prüft ob ein Datum bereits gebucht ist
// Durchsucht alle Buchungen und prüft Überschneidungen
function isDateBooked(dateStr, bookings) {
    const checkDate = new Date(dateStr);

    return bookings.some(booking => {
        const start = new Date(booking.start);
        const end = new Date(booking.end);
        return checkDate >= start && checkDate <= end;
    });
}

// Prüft ob ein Datum Teil der aktuellen Benutzer-Auswahl ist
// Wird verwendet um ausgewählte Tage grün zu markieren
function isDateSelected(dateStr) {
    if (!selectedStartDate) return false;

    const checkDate = new Date(dateStr);
    const start = new Date(selectedStartDate);

    if (!selectedEndDate) {
        return checkDate.getTime() === start.getTime();
    }

    const end = new Date(selectedEndDate);
    return checkDate >= start && checkDate <= end;
}

// Verarbeitet die Auswahl eines Datums durch den Benutzer
// Zwei-Klick-Logik: erster Klick = Start, zweiter Klick = End
async function selectDate(dateStr) {
    if (!selectedStartDate) {
        selectedStartDate = dateStr;
        selectedEndDate = null;
    } else if (!selectedEndDate) {
        const start = new Date(selectedStartDate);
        const end = new Date(dateStr);

        if (end < start) {
            selectedStartDate = dateStr;
            selectedEndDate = null;
        } else {
            selectedEndDate = dateStr;

            // Synchronisiere mit Buchungsformular
            const startInput = document.getElementById('bookStart');
            const endInput = document.getElementById('bookEnd');
            if (startInput) startInput.value = selectedStartDate;
            if (endInput) endInput.value = selectedEndDate;

            // Trigger Preisberechnung
            if (typeof calculatePrice === 'function') {
                calculatePrice();
            }
        }
    } else {
        selectedStartDate = dateStr;
        selectedEndDate = null;
    }

    await renderCalendar();
}

// Formatiert Date-Objekt zu YYYY-MM-DD String
// Für Datenbank-Speicherung und Input-Felder
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Formatiert YYYY-MM-DD String zu deutschem Format DD.MM.YYYY
// Für benutzerfreundliche Datumsanzeige
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}
