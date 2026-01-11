// ===================================
// CALENDAR.JS - Interaktive Kalender-Komponente für Fahrzeugbuchungen
// ===================================
// Diese Datei stellt einen visuellen Kalender bereit der verfügbare und gebuchte Tage anzeigt.
// Benutzer können Start- und Enddatum durch Klicken auf Tage im Kalender auswählen.
// Der Kalender zeigt vergangene Tage (grau), gebuchte Tage (rot) und verfügbare Tage (grün) an.
// Die Auswahl wird automatisch mit den Buchungsformular-Feldern synchronisiert.

// Globale Variablen für Kalender-Status
// currentCalendarDate: Der aktuell im Kalender angezeigte Monat
// currentVehicleId: Die ID des Fahrzeugs für das Buchungen angezeigt werden
// selectedStartDate/selectedEndDate: Die vom Benutzer gewählten Buchungsdaten
let currentCalendarDate = new Date();
let currentVehicleId = null;
let selectedStartDate = null;
let selectedEndDate = null;

// Initialisiert den Kalender für ein bestimmtes Fahrzeug
// Diese Funktion sollte beim Laden der Fahrzeug-Detailseite aufgerufen werden
// Parameter: vehicleId - Die ID des Fahrzeugs dessen Buchungen angezeigt werden sollen
// Sie setzt die Fahrzeug-ID und rendert den Kalender erstmalig
async function initCalendar(vehicleId) {
    currentVehicleId = vehicleId;
    await renderCalendar();
}

// Wechselt zum vorherigen oder nächsten Monat
// Diese Funktion wird von den Vor/Zurück-Buttons im Kalender aufgerufen
// Parameter: delta - Anzahl Monate zum Wechseln (-1 für zurück, +1 für vorwärts)
// Nach dem Monatswechsel wird der Kalender neu gerendert
async function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    await renderCalendar();
}

// Rendert den kompletten Kalender mit allen Tagen und Status-Markierungen
// Diese Funktion ist das Herzstück der Kalender-Komponente
// Sie lädt Buchungen vom Server, generiert HTML für alle Tage und markiert sie entsprechend
// Status-Typen: past (vergangen), booked (gebucht), selected (ausgewählt), normal (verfügbar)
async function renderCalendar() {
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const monthYearDisplay = document.getElementById('calMonthYear');
    const daysContainer = document.getElementById('calDays');
    const prevBtn = document.getElementById('calPrevBtn');

    // Prüfe ob Kalender-Elemente existieren
    // Falls nicht, ist diese Seite kein Kalender-Page
    if (!monthYearDisplay || !daysContainer) return;

    try {
        // Zeige aktuellen Monat und Jahr in der Überschrift
        // Beispiel: "März 2024"
        monthYearDisplay.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;

        // Deaktiviere "Vorheriger Monat" Button falls aktueller oder vergangener Monat
        // Verhindert dass Benutzer zu vergangenen Monaten navigieren (keine Buchungen in Vergangenheit)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);

        if (prevBtn) {
            prevBtn.disabled = firstOfMonth <= new Date(today.getFullYear(), today.getMonth(), 1);
        }

        // Berechne Monatsdaten
        // firstDay: Erster Tag des Monats, lastDay: Letzter Tag des Monats
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Berechne ersten Wochentag des Monats (Montag als erster Tag)
        // JavaScript's getDay() gibt 0=Sonntag, 1=Montag, ... zurück
        // Wir konvertieren zu 0=Montag, 1=Dienstag, ..., 6=Sonntag
        let firstWeekday = firstDay.getDay();
        firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;

        // Lade alle Buchungen für dieses Fahrzeug vom Server
        // Diese werden verwendet um gebuchte Tage rot zu markieren
        const bookings = currentVehicleId ? await getBookingsByVehicle(currentVehicleId) : [];

        let html = '';

        // Füge leere Zellen am Anfang hinzu für Wochentag-Ausrichtung
        // Beispiel: Falls Monat am Mittwoch startet, füge 2 leere Zellen hinzu (Mo, Di)
        for (let i = 0; i < firstWeekday; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Generiere HTML für jeden Tag des Monats
        // Jeder Tag bekommt CSS-Klassen und Click-Handler basierend auf seinem Status
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const currentDate = new Date(year, month, day);
            const dateStr = formatDate(currentDate);

            let classes = 'calendar-day';
            let clickHandler = `onclick="selectDate('${dateStr}')"`;

            // Vergangene Tage: grau markieren und nicht klickbar
            // Buchungen können nur für zukünftige Daten gemacht werden
            if (currentDate < today) {
                classes += ' past';
                clickHandler = '';
            }
            // Gebuchte Tage: rot markieren und nicht klickbar
            // isDateBooked() prüft ob der Tag in einer bestehenden Buchung liegt
            else if (isDateBooked(dateStr, bookings)) {
                classes += ' booked';
                clickHandler = '';
            }
            // Ausgewählte Tage: grün markieren (Teil der aktuellen Benutzer-Auswahl)
            // isDateSelected() prüft ob der Tag zwischen Start und End liegt
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

// Prüft ob ein bestimmtes Datum bereits gebucht ist
// Diese Funktion durchsucht alle Buchungen und prüft ob das Datum in einem Buchungszeitraum liegt
// Parameter: dateStr - Das zu prüfende Datum im Format YYYY-MM-DD, bookings - Array aller Buchungen
// Rückgabe: true falls das Datum gebucht ist, false falls verfügbar
// Ein Datum ist gebucht wenn es zwischen (inklusive) Start und End einer Buchung liegt
function isDateBooked(dateStr, bookings) {
    const checkDate = new Date(dateStr);

    return bookings.some(booking => {
        const start = new Date(booking.start);
        const end = new Date(booking.end);
        return checkDate >= start && checkDate <= end;
    });
}

// Prüft ob ein Datum Teil der aktuellen Benutzer-Auswahl ist
// Diese Funktion wird verwendet um ausgewählte Tage grün zu markieren
// Parameter: dateStr - Das zu prüfende Datum im Format YYYY-MM-DD
// Rückgabe: true falls das Datum ausgewählt ist, false sonst
// Falls nur Start gewählt: nur dieser Tag ist ausgewählt
// Falls Start und End gewählt: alle Tage dazwischen (inklusive) sind ausgewählt
function isDateSelected(dateStr) {
    if (!selectedStartDate) return false;

    const checkDate = new Date(dateStr);
    const start = new Date(selectedStartDate);

    // Nur Startdatum ausgewählt
    if (!selectedEndDate) {
        return checkDate.getTime() === start.getTime();
    }

    // Start und End ausgewählt: prüfe ob Datum im Bereich liegt
    const end = new Date(selectedEndDate);
    return checkDate >= start && checkDate <= end;
}

// Verarbeitet die Auswahl eines Datums durch den Benutzer
// Diese Funktion implementiert die Zwei-Klick-Logik: erster Klick = Start, zweiter Klick = End
// Parameter: dateStr - Das angeklickte Datum im Format YYYY-MM-DD
// Die Funktion aktualisiert auch die Formular-Felder und triggert die Preisberechnung
async function selectDate(dateStr) {
    // Erster Klick: Setze Startdatum
    if (!selectedStartDate) {
        selectedStartDate = dateStr;
        selectedEndDate = null;
    }
    // Zweiter Klick: Setze Enddatum
    else if (!selectedEndDate) {
        const start = new Date(selectedStartDate);
        const end = new Date(dateStr);

        // Falls Enddatum vor Startdatum liegt, interpretiere Klick als neues Startdatum
        // Beispiel: Benutzer wählt 15., dann 10. -> Start wird zu 10., End bleibt leer
        if (end < start) {
            selectedStartDate = dateStr;
            selectedEndDate = null;
        } else {
            selectedEndDate = dateStr;

            // Synchronisiere Auswahl mit Buchungsformular-Feldern
            // Die Input-Felder werden mit den gewählten Daten gefüllt
            const startInput = document.getElementById('bookStart');
            const endInput = document.getElementById('bookEnd');
            if (startInput) startInput.value = selectedStartDate;
            if (endInput) endInput.value = selectedEndDate;

            // Trigger Preisberechnung falls Funktion verfügbar
            // calculatePrice() ist in booking.js definiert und berechnet Gesamtpreis
            if (typeof calculatePrice === 'function') {
                calculatePrice();
            }
        }
    }
    // Dritter Klick: Starte Auswahl neu
    // Falls bereits Start und End gewählt sind, beginne mit neuer Auswahl
    else {
        selectedStartDate = dateStr;
        selectedEndDate = null;
    }

    // Render Kalender neu um Auswahl visuell zu zeigen
    await renderCalendar();
}

// Formatiert ein Date-Objekt zu YYYY-MM-DD String
// Dieses Format wird für Datenbank-Speicherung und Input-Felder verwendet
// Parameter: date - JavaScript Date-Objekt
// Rückgabe: String im Format "2024-03-15"
// padStart(2, '0') fügt führende Nullen hinzu (z.B. "3" wird zu "03")
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Formatiert einen YYYY-MM-DD String zu deutschem Format DD.MM.YYYY
// Diese Funktion wird für benutzerfreundliche Datumsanzeige verwendet
// Parameter: dateStr - Datum im Format "2024-03-15"
// Rückgabe: String im Format "15.03.2024"
// Wird in Buchungsbestätigungen und Anzeigen verwendet
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}
