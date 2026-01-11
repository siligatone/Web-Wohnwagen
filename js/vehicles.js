// ===================================
// VEHICLES.JS - Fahrzeugübersicht mit Filter-Funktionalität auf index.html
// ===================================
// Diese Datei verwaltet die Hauptseite mit der Fahrzeugübersicht.
// Sie lädt alle verfügbaren Fahrzeuge aus der Datenbank und zeigt sie als Karten-Grid an.
// Benutzer können Fahrzeuge nach verschiedenen Kriterien filtern: Freitext-Suche, Kraftstoff,
// Anzahl Betten und maximaler Preis. Die Filter arbeiten kombiniert (UND-Verknüpfung).
// Die Darstellung nutzt Thumbnail-API für optimierte Performance und lazy loading.
// Jede Fahrzeugkarte ist klickbar und führt zur Detailseite des jeweiligen Fahrzeugs.
// Die Datei implementiert auch Smooth-Scrolling zur Fahrzeugliste und Reset-Funktionalität.

// Globale Variable speichert alle geladenen Fahrzeuge
// Diese Variable wird in displayVehicles() initial befüllt
// Filter-Funktionen nutzen diese Variable als Basis und erstellen gefilterte Kopien
// Vorteil: Keine wiederholten API-Calls bei jeder Filteränderung
// Die Variable bleibt während der Session konstant (keine Daten-Aktualisierung ohne Reload)
let allVehicles = [];

// Aktualisiert die Preis-Anzeige neben dem Range-Slider
// Diese Funktion wird vom Range-Input aufgerufen (oninput Event)
// Sie liest den aktuellen Slider-Wert und zeigt ihn im Label an
// Beispiel: Slider auf 150 -> Label zeigt "150€"
// Visuelles Feedback für Benutzer während sie den Slider bewegen
// Ohne diese Funktion würde Benutzer nicht sehen welcher Wert gerade gewählt ist
function updatePriceLabel() {
    // Hole Range-Slider und Label-Element
    const priceSlider = document.getElementById('filterPrice');
    const priceLabel = document.getElementById('priceValue');

    // Aktualisiere Label mit aktuellem Slider-Wert
    // Optional Chaining (?.) verhindert Fehler falls Elemente nicht existieren
    if (priceSlider && priceLabel) {
        priceLabel.textContent = priceSlider.value;
    }
}

// Wendet alle aktiven Filter auf die Fahrzeugliste an
// Diese Funktion ist das Herzstück der Filter-Logik
// Sie wird bei jeder Filteränderung aufgerufen (onchange/oninput Events)
// Die Funktion implementiert UND-Verknüpfung: Fahrzeug muss ALLE Filter erfüllen
// Filter-Kriterien:
// 1. Freitext-Suche: Durchsucht Name und Beschreibung (case-insensitive)
// 2. Kraftstoff: Dropdown-Auswahl (Benzin, Diesel, Elektro) - exakte Übereinstimmung
// 3. Betten: Dropdown-Auswahl (2, 4, 6) - exakte Übereinstimmung
// 4. Preis: Range-Slider (0-200€) - Fahrzeugpreis muss kleiner/gleich sein
// Leere Filter (nicht ausgewählt) werden ignoriert und zeigen alle Optionen
// Das Ergebnis wird sofort in der UI angezeigt über renderVehicles()
function applyFilters() {
    // Filterwerte aus den Input-Elementen extrahieren
    // Optional Chaining (?.) und Nullish Coalescing (||) für sichere Wert-Extraktion
    // toLowerCase().trim() bei Suche für case-insensitive Matching ohne Leerzeichen
    const searchText = document.getElementById('filterSearch')?.value.toLowerCase().trim() || '';
    const fuelFilter = document.getElementById('filterFuel')?.value || '';
    const bedsFilter = document.getElementById('filterBeds')?.value || '';
    const priceFilter = parseInt(document.getElementById('filterPrice')?.value || '200');

    // Fahrzeuge nach allen Kriterien filtern
    // Array.filter() durchläuft alle Fahrzeuge und behält nur die die alle Bedingungen erfüllen
    // Die return-Bedingung ist eine UND-Verknüpfung aller Filter-Checks
    const filteredVehicles = allVehicles.filter(vehicle => {
        // Filter 1: Freitext-Suche in Name und Beschreibung
        // Logik: Falls searchText leer -> true (kein Filter aktiv)
        // Falls nicht leer: Prüfe ob searchText in Name ODER Beschreibung vorkommt
        // toLowerCase() macht die Suche case-insensitive ("Mercedes" findet "mercedes")
        // includes() prüft Substring-Match (nicht exakt, sondern Teilstring)
        const matchesSearch = !searchText ||
            vehicle.name.toLowerCase().includes(searchText) ||
            vehicle.desc.toLowerCase().includes(searchText);

        // Filter 2: Kraftstoff-Auswahl
        // Logik: Falls fuelFilter leer (nichts ausgewählt) -> true
        // Falls ausgewählt: Exakte Übereinstimmung mit vehicle.fuel
        // vehicle.fuel ist String wie "Diesel", "Benzin", "Elektro"
        const matchesFuel = !fuelFilter || vehicle.fuel === fuelFilter;

        // Filter 3: Betten-Auswahl
        // Logik: Falls bedsFilter leer -> true
        // Falls ausgewählt: Exakte Übereinstimmung mit vehicle.beds (als Zahl)
        // parseInt() konvertiert String aus Dropdown zu Number für Vergleich
        const matchesBeds = !bedsFilter || vehicle.beds === parseInt(bedsFilter);

        // Filter 4: Preis-Filter (Range-Slider)
        // Logik: Fahrzeugpreis muss kleiner oder gleich dem gewählten Maximum sein
        // Dieser Filter ist immer aktiv (Slider hat immer einen Wert)
        // vehicle.price ist bereits Number in der Datenbank
        const matchesPrice = vehicle.price <= priceFilter;

        // Kombiniere alle Filter mit UND-Verknüpfung
        // Fahrzeug wird nur in Ergebnisliste aufgenommen wenn ALLE Bedingungen true sind
        // Beispiel: Suche="Mercedes" UND Fuel="Diesel" UND Beds="4" UND Price<=150
        return matchesSearch && matchesFuel && matchesBeds && matchesPrice;
    });

    // Gefilterte Fahrzeuge in UI anzeigen
    // renderVehicles() erstellt HTML für jedes gefilterte Fahrzeug
    renderVehicles(filteredVehicles);
}

// Setzt alle Filter auf Standardwerte zurück und zeigt alle Fahrzeuge
// Diese Funktion wird vom "Filter zurücksetzen" Button aufgerufen
// Sie restauriert den initialen Zustand ohne Seiten-Reload
// Vorteil: Schnelles Zurücksetzen ohne Daten neu laden zu müssen
// Nach Reset wird die komplette allVehicles-Liste wieder angezeigt
function resetFilters() {
    // Hole alle Filter-Input-Elemente
    const searchFilter = document.getElementById('filterSearch');
    const fuelFilter = document.getElementById('filterFuel');
    const bedsFilter = document.getElementById('filterBeds');
    const priceFilter = document.getElementById('filterPrice');

    // Setze jeden Filter auf Standardwert
    // Textfeld: Leerer String
    // Dropdowns: Leerer String (entspricht "Alle" Option mit value="")
    // Range-Slider: Maximum 200€
    if (searchFilter) searchFilter.value = '';
    if (fuelFilter) fuelFilter.value = '';
    if (bedsFilter) bedsFilter.value = '';
    if (priceFilter) priceFilter.value = '200';

    // Preis-Label aktualisieren auf neuen Wert (200€)
    updatePriceLabel();

    // Alle Fahrzeuge wieder anzeigen (keine Filter aktiv)
    // Übergibt komplette allVehicles-Liste an renderVehicles()
    renderVehicles(allVehicles);
}

// Rendert eine Liste von Fahrzeugen als Bootstrap Card Grid
// Diese Funktion generiert HTML für Fahrzeugkarten und fügt sie ins DOM ein
// Jede Karte zeigt: Bild, Name, Beschreibung (gekürzt), Badges (Betten/Kraftstoff), Preis
// Die Karten sind klickbar und führen zur Detailseite des Fahrzeugs
// Parameter: vehicles - Array von Vehicle-Objekten die angezeigt werden sollen
// Die Funktion behandelt auch Edge-Cases: leere Liste zeigt "Keine Ergebnisse" Meldung
// Layout: Bootstrap Grid mit col-md-6 (2 Spalten auf Medium) und col-lg-4 (3 Spalten auf Large)
function renderVehicles(vehicles) {
    // Hole Container-Element für Fahrzeugkarten
    const container = document.getElementById('vehicleList');
    if (!container) return;

    // Edge Case: Keine Fahrzeuge gefunden (Filter zu restriktiv)
    // Zeige benutzerfreundliche Meldung mit Icon und Reset-Button
    // Filter-Icon (fa-filter-circle-xmark) signalisiert dass Filter Grund sind
    if (vehicles.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fa-solid fa-filter-circle-xmark fa-3x text-muted mb-3"></i>
                <p class="text-muted">Keine Fahrzeuge entsprechen Ihren Filterkriterien.</p>
                <button class="btn btn-primary mt-2" onclick="resetFilters()">
                    Filter zurücksetzen
                </button>
            </div>
        `;
        return;
    }

    // Generiere HTML für jedes Fahrzeug als Bootstrap Card
    // Array.map() erstellt für jedes Vehicle einen HTML-String
    // join('') konkateniert alle Strings zu einem einzigen HTML-Block
    container.innerHTML = vehicles.map(vehicle => {
        // Bildquelle ermitteln mit Fallback-Logik
        // Neue Fahrzeuge: Nutze erstes Bild aus images Array
        // Alte Fahrzeuge: Fallback auf img Feld (Rückwärtskompatibilität)
        // Diese Logik garantiert dass immer ein Bild angezeigt wird
        const originalImageUrl = (vehicle.images && vehicle.images.length > 0) ? vehicle.images[0] : vehicle.img;

        // Nutze Thumbnail-API für optimierte Bildgröße
        // Server generiert automatisch 400px breite Thumbnails
        // Vorteil: Schnelleres Laden, weniger Bandbreite, bessere Performance
        // encodeURIComponent() escapet URL für sichere Query-Parameter-Übergabe
        // Falls Thumbnail-API fehlschlägt zeigt Browser automatisch Original-URL
        const imageUrl = `http://localhost:3000/api/thumbnail?url=${encodeURIComponent(originalImageUrl)}&width=400`;
        const sanitizedOriginalUrl = originalImageUrl.replace(/"/g, '&quot;');

        // Bootstrap Card HTML für ein Fahrzeug
        // card-img-top: Bild oben in Card (Standard-Bootstrap-Layout)
        // h-100: Card nimmt volle Höhe der Grid-Row (gleichmäßige Kartenhöhen)
        // onclick: Ganze Karte ist klickbar und führt zu Detailseite
        // loading="lazy": Browser-native Lazy-Loading für Performance
        // desc.substring(0, 100): Beschreibung auf 100 Zeichen kürzen + "..."
        // Badges: Icons mit Text für Betten und Kraftstoff (kompakte Info)
        // Preis: Groß und prominent in Primärfarbe, "/Nacht" kleiner und grau
        return `
        <div class="col-md-6 col-lg-4">
            <div class="card vehicle-card h-100" onclick="goToVehicle('${vehicle.id}')">
                <img src="${imageUrl}" data-original="${sanitizedOriginalUrl}" class="card-img-top" alt="${vehicle.name}" loading="lazy" onerror="this.onerror=null; if (this.dataset.original) this.src=this.dataset.original;">
                <div class="card-body">
                    <h5 class="card-title fw-bold">${vehicle.name}</h5>
                    <p class="card-text text-muted small">${vehicle.desc.substring(0, 100)}...</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div>
                            <span class="badge bg-secondary me-1">
                                <i class="fa-solid fa-bed me-1"></i>${vehicle.beds} Betten
                            </span>
                            <span class="badge bg-secondary">
                                <i class="fa-solid fa-gas-pump me-1"></i>${vehicle.fuel}
                            </span>
                        </div>
                        <div class="text-primary fw-bold fs-5">${vehicle.price}€<small class="text-muted fs-6">/Nacht</small></div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Lädt alle Fahrzeuge von der API und zeigt sie initial an
// Diese Funktion wird automatisch beim Seiten-Load aufgerufen (siehe DOMContentLoaded unten)
// Sie ist der Einstiegspunkt für die Fahrzeugübersicht
// Ablauf: API-Call -> Daten in allVehicles speichern -> renderVehicles() aufrufen
// Bei Fehler (Server nicht gestartet, Netzwerkproblem) wird Fehler-Alert angezeigt
// Die Funktion ist async da sie auf API-Response warten muss
async function displayVehicles() {
    // Hole Container-Element
    const container = document.getElementById('vehicleList');
    if (!container) return;

    // Lade Fahrzeuge von API mit Fehlerbehandlung
    try {
        // API-Call über data.js Funktion
        // getAllVehicles() ruft GET /vehicles auf und gibt Array zurück
        const vehicles = await getAllVehicles();

        // Speichere Fahrzeuge global für Filter-Funktionen
        // Diese Variable bleibt während der Session konstant
        // Filter arbeiten auf dieser Basis ohne erneute API-Calls
        allVehicles = vehicles;

        // Zeige alle Fahrzeuge initial an (ohne Filter)
        // renderVehicles() generiert HTML für alle geladenen Fahrzeuge
        renderVehicles(allVehicles);

    } catch (error) {
        // Fehlerbehandlung für API-/Netzwerk-Fehler
        // Häufigste Ursache: Server nicht gestartet (npm start vergessen)
        // Zeige benutzerfreundliche Fehlermeldung mit Hinweis
        console.error('Fehler beim Laden der Fahrzeuge:', error);
        container.innerHTML = '<div class="col-12 text-center py-5"><div class="alert alert-danger">Fehler beim Laden der Fahrzeuge. Ist der Server gestartet?</div></div>';
    }
}

// Navigiert zur Detailseite eines bestimmten Fahrzeugs
// Diese Funktion wird vom onclick-Handler der Fahrzeugkarten aufgerufen
// Sie konstruiert die URL mit Fahrzeug-ID als Query-Parameter
// Parameter: vehicleId - Die eindeutige ID des Fahrzeugs (z.B. 'v1')
// Ziel-URL-Format: pages/fahrzeug.html?id=v1
// Die Detailseite (vehicleDetail.js) extrahiert dann die ID und lädt Daten
function goToVehicle(vehicleId) {
    window.location.href = `pages/fahrzeug.html?id=${vehicleId}`;
}

// Scrollt sanft zur Fahrzeugliste
// Diese Funktion wird vom "Zur Flotte" Button im Hero-Bereich aufgerufen
// Smooth-Scrolling bietet bessere User Experience als abrupter Sprung
// scrollIntoView() ist native Browser-API mit Animations-Support
// behavior: 'smooth' aktiviert animiertes Scrollen (kein abrupter Sprung)
// block: 'start' positioniert Section am oberen Viewport-Rand
function scrollToFleet() {
    // Hole Fahrzeugliste-Section mit ID 'fahrzeuge'
    const fleetSection = document.getElementById('fahrzeuge');

    // Scrolle sanft zu Section falls vorhanden
    // Falls Element nicht existiert passiert nichts (kein Fehler)
    if (fleetSection) {
        fleetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Automatische Initialisierung beim Seiten-Load
// Diese Logik garantiert dass displayVehicles() genau einmal aufgerufen wird
// sobald das DOM vollständig geladen ist
// Zwei Fälle werden abgedeckt:
// Fall 1: Script lädt während HTML noch parst (readyState === 'loading')
//         -> Registriere Event-Listener für DOMContentLoaded
// Fall 2: Script lädt nachdem DOM bereits fertig ist (async/defer Attribute)
//         -> Rufe displayVehicles() sofort auf
// Diese Technik ist Standard für DOM-abhängigen Code und verhindert Timing-Probleme
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', displayVehicles);
} else {
    displayVehicles();
}
