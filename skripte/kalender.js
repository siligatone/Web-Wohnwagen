/* ===================================
   CALENDAR.JS - Kalender-Komponente
   =================================== */

let currentCalendarDate = new Date();
let currentVehicleId = null;
let selectedStartDate = null;
let selectedEndDate = null;

// Kalender initialisieren
async function initCalendar(vehicleId) {
    currentVehicleId = vehicleId;
    await renderCalendar();
}

// Monat wechseln
async function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    await renderCalendar();
}

// Kalender rendern
async function renderCalendar() {
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const monthYearDisplay = document.getElementById('calMonthYear');
    const daysContainer = document.getElementById('calDays');
    const prevBtn = document.getElementById('calPrevBtn');

    if (!monthYearDisplay || !daysContainer) return;

    try {
        // Monat/Jahr anzeigen
        monthYearDisplay.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;

        // Disable prev button wenn aktueller oder vergangener Monat
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);

        if (prevBtn) {
            prevBtn.disabled = firstOfMonth <= new Date(today.getFullYear(), today.getMonth(), 1);
        }

        // Tage generieren
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Erste Woche - Montag als erster Tag
        let firstWeekday = firstDay.getDay();
        firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1; // Sonntag = 6

        // Gebuchte Tage für dieses Fahrzeug holen
        const bookings = currentVehicleId ? await getBookingsByVehicle(currentVehicleId) : [];

        let html = '';

        // Leere Zellen am Anfang
        for (let i = 0; i < firstWeekday; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Tage des Monats
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const currentDate = new Date(year, month, day);
            const dateStr = formatDate(currentDate);

            let classes = 'calendar-day';
            let clickHandler = `onclick="selectDate('${dateStr}')"`;

            // Vergangene Tage
            if (currentDate < today) {
                classes += ' past';
                clickHandler = '';
            }
            // Gebuchte Tage
            else if (isDateBooked(dateStr, bookings)) {
                classes += ' booked';
                clickHandler = '';
            }
            // Ausgewählte Tage
            else if (isDateSelected(dateStr)) {
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

// Prüfe ob Datum gebucht ist
function isDateBooked(dateStr, bookings) {
    const checkDate = new Date(dateStr);

    return bookings.some(booking => {
        const start = new Date(booking.start);
        const end = new Date(booking.end);
        return checkDate >= start && checkDate <= end;
    });
}

// Prüfe ob Datum ausgewählt ist
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

// Datum auswählen
async function selectDate(dateStr) {
    if (!selectedStartDate) {
        // Erstes Datum ausgewählt
        selectedStartDate = dateStr;
        selectedEndDate = null;
    } else if (!selectedEndDate) {
        // Zweites Datum ausgewählt
        const start = new Date(selectedStartDate);
        const end = new Date(dateStr);

        if (end < start) {
            // Falls End vor Start liegt, tausche
            selectedStartDate = dateStr;
            selectedEndDate = null;
        } else {
            selectedEndDate = dateStr;

            // Aktualisiere Formular-Felder
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
        // Neustart der Auswahl
        selectedStartDate = dateStr;
        selectedEndDate = null;
    }

    await renderCalendar();
}

// Formatiere Datum zu YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Datum formatieren für Anzeige (DD.MM.YYYY)
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}
