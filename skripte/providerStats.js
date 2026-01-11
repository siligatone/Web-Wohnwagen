// ===================================
// PROVIDERSTATS.JS - Canvas-basierte Statistik-Visualisierung für Provider-Dashboard
// ===================================
// Diese Datei implementiert die visuelle Darstellung von Buchungsstatistiken als Balkendiagramm.
// Sie nutzt die HTML5 Canvas API um ein interaktives Diagramm zu rendern das die Anzahl der Buchungen
// pro Fahrzeug anzeigt. Das Diagramm ist vollständig responsiv, unterstützt Retina-Displays und
// bietet Hover-Interaktivität mit Tooltips. Die Implementierung verzichtet bewusst auf externe
// Chart-Bibliotheken um die Kontrolle über das Rendering und die Performance zu behalten.

// Rendert ein Canvas-Balkendiagramm für Provider-Buchungsstatistiken
// Diese Funktion ist das Herzstück der Statistik-Visualisierung im Provider-Dashboard
// Sie nimmt alle Buchungen und Fahrzeuge entgegen, berechnet die Buchungsanzahl pro Fahrzeug
// und zeichnet ein professionelles Balkendiagramm mit folgenden Features:
// - Intelligente Y-Achsen-Skalierung basierend auf Datenbereich
// - Farbcodierte Balken für jedes Fahrzeug (konsistente Hash-basierte Farbzuordnung)
// - Retina-Display-Support für scharfe Darstellung auf High-DPI Screens
// - Responsive Anpassung an Container-Größe
// - Gridlines und beschriftete Achsen für bessere Lesbarkeit
// - Schatten-Effekte für 3D-Look
// - Automatische Textkürzung bei langen Fahrzeugnamen
// - Rotierte X-Achsen-Labels bei vielen Fahrzeugen (Platzsparend)
// Parameter: bookings - Array mit allen Booking-Objekten des Providers
//            vehicles - Array mit allen Vehicle-Objekten des Providers
// Die Funktion manipuliert das Canvas-Element direkt und gibt nichts zurück
// Falls Canvas-Element nicht vorhanden ist, wird eine Fehlermeldung geloggt
function renderBookingStatsCanvas(bookings, vehicles) {
    // Referenz zum Canvas-Element im DOM holen
    // Das Canvas wird vom provider.html bereitgestellt und hat die ID 'bookingStatsCanvas'
    // Falls Element nicht existiert (falsches Template, ID geändert), abbrechen
    const canvas = document.getElementById('bookingStatsCanvas');
    if (!canvas) {
        console.error('Canvas-Element nicht gefunden');
        return;
    }

    // 2D-Rendering-Kontext initialisieren
    // Dieser Kontext bietet alle Zeichenfunktionen (Linien, Rechtecke, Text, etc.)
    // Canvas API ist low-level aber sehr performant für Custom-Visualisierungen
    const ctx = canvas.getContext('2d');

    // Canvas-Größe für Retina-Displays korrekt setzen
    // Problem: Auf Retina-Displays (devicePixelRatio > 1) erscheinen Canvas-Inhalte verschwommen
    // Lösung: Canvas-Pixel-Größe erhöhen (width/height) und CSS-Größe beibehalten (style.width/height)
    // Dann mit ctx.scale() skalieren damit Koordinaten in logischen Pixeln bleiben
    // Beispiel: Auf 2x Retina wird Canvas 1000x500 Pixel aber erscheint als 500x250 CSS-Pixel
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    // Arbeitsbereich-Dimensionen definieren
    // padding: Abstand vom Canvas-Rand für Achsenbeschriftungen und Titel
    // chartWidth/chartHeight: Tatsächlicher Zeichenbereich ohne Padding
    // Diese Aufteilung ermöglicht saubere Achsen-Beschriftung außerhalb des Diagramms
    const width = rect.width;
    const height = rect.height;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Canvas komplett leeren um altes Rendering zu entfernen
    // Wichtig bei Re-Renders (z.B. nach Datenänderung oder Window-Resize)
    ctx.clearRect(0, 0, width, height);

    // Edge Case: Keine Fahrzeuge vorhanden
    // Zeige hilfreiche Meldung statt leeres Diagramm
    // Dieser Fall tritt bei neuen Providern auf die noch keine Fahrzeuge angelegt haben
    if (vehicles.length === 0) {
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Keine Fahrzeuge vorhanden', width / 2, height / 2);
        return;
    }

    // Buchungen pro Fahrzeug zählen und Datenstruktur für Visualisierung erstellen
    // Für jedes Fahrzeug wird gezählt wie viele Buchungen mit dessen vehicle_id existieren
    // Jedes Fahrzeug bekommt auch eine konsistente Farbe über getVehicleColor() zugewiesen
    // Diese Farbe bleibt gleich auch wenn Daten neu geladen werden (Hash-basiert)
    // Das resultierende Array ist die Datengrundlage für alle Balken im Diagramm
    const vehicleBookingCounts = vehicles.map(vehicle => {
        const count = bookings.filter(b => b.vehicle_id === vehicle.id).length;
        return {
            id: vehicle.id,
            name: vehicle.name,
            count: count,
            color: getVehicleColor(vehicle.id)
        };
    });

    // Intelligente Y-Achsen-Skalierung berechnen
    // Problem: Einfach maxBookings als Maximum zu nehmen führt zu Balken die bis zur Decke reichen
    // Lösung: Abhängig vom Datenbereich verschiedene Strategien anwenden:
    // - Bei 1-5 Buchungen: Keine Puffer (sonst zu viel Leerraum)
    // - Bei 6-10 Buchungen: Auf nächste gerade Zahl aufrunden (schönere Y-Achse)
    // - Bei 10+ Buchungen: 10% Puffer hinzufügen (verhindert dass Balken Decke berühren)
    // Diese Logik sorgt für professionell aussehendes Diagramm bei allen Datenbereichen
    const maxBookings = Math.max(...vehicleBookingCounts.map(v => v.count), 1);
    let yAxisMax;

    if (maxBookings <= 5) {
        yAxisMax = maxBookings;
    } else if (maxBookings <= 10) {
        yAxisMax = Math.ceil(maxBookings / 2) * 2;
    } else {
        yAxisMax = Math.ceil(maxBookings * 1.1);
    }

    // Balkenbreite berechnen basierend auf Anzahl der Fahrzeuge
    // barSpacing: Konstanter Abstand zwischen Balken (20px)
    // totalBarWidth: Verfügbare Breite pro Balken inkl. Spacing
    // barWidth: Tatsächliche Balkenbreite (max 120px um zu breite Balken zu vermeiden)
    // Bei vielen Fahrzeugen werden Balken automatisch schmaler um alle darzustellen
    const barCount = vehicleBookingCounts.length;
    const barSpacing = 20;
    const totalBarWidth = (chartWidth - (barCount - 1) * barSpacing) / barCount;
    const barWidth = Math.min(totalBarWidth, 120);

    // Hellgrauer Hintergrund für besseren Kontrast
    // Macht das Diagramm professioneller und hebt es vom Rest der Seite ab
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // L-förmige Achsen zeichnen (Y-Achse links, X-Achse unten)
    // Diese Achsen bilden das Grundgerüst des Diagramms
    // Farbe #dee2e6 ist ein sanftes Grau das nicht zu dominant wirkt
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y-Achsen-Beschriftung und Gridlines zeichnen
    // Die Labels zeigen die Anzahl der Buchungen (0 bis yAxisMax)
    // Gridlines sind horizontale Hilfslinien die das Ablesen erleichtern
    // Labels werden rechtsbündig positioniert (links der Y-Achse)
    ctx.fillStyle = '#495057';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';

    // Intelligente Step-Berechnung für Y-Achse
    // Anzahl der Gridlines hängt von yAxisMax ab:
    // - Bei 1-5: Jede Zahl einzeln (z.B. 0, 1, 2, 3, 4, 5)
    // - Bei 6-10: 5 Steps (z.B. 0, 2, 4, 6, 8, 10)
    // - Bei 10+: Max 10 Steps (verhindert zu viele Labels)
    // Diese Logik sorgt für lesbare Achsenbeschriftung ohne Überladung
    let ySteps;
    if (yAxisMax <= 5) {
        ySteps = yAxisMax;
    } else if (yAxisMax <= 10) {
        ySteps = 5;
    } else {
        ySteps = Math.min(10, yAxisMax);
    }

    // Zeichne Gridlines und Labels für jeden Y-Achsen-Step
    // Die Y-Position wird proportional zum Wert berechnet
    // Math.round() stellt sicher dass nur ganze Zahlen als Labels erscheinen
    // Gridlines werden in sehr hellem Grau gezeichnet um nicht vom Diagramm abzulenken
    for (let i = 0; i <= ySteps; i++) {
        const value = Math.round((yAxisMax / ySteps) * i);
        const y = height - padding - (chartHeight / yAxisMax) * value;

        // Horizontale Gridline zeichnen
        // Diese Linie hilft dem Betrachter die Balkenhöhe abzulesen
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        // Numerisches Label links der Y-Achse
        // +4 Pixel Y-Offset für vertikale Zentrierung des Texts auf der Gridline
        ctx.fillText(value.toString(), padding - 10, y + 4);
    }

    // Haupttitel über dem Diagramm
    // Erklärt was das Diagramm darstellt
    // Fett und zentriert für maximale Aufmerksamkeit
    ctx.fillStyle = '#212529';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Buchungen pro Fahrzeug', width / 2, 30);

    // Y-Achsen-Titel vertikal links vom Diagramm
    // Canvas hat keine native Unterstützung für vertikalen Text
    // Lösung: Canvas-Koordinatensystem rotieren, Text zeichnen, dann zurück rotieren
    // save() und restore() sorgen dafür dass die Rotation nur für diesen Text gilt
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Anzahl Buchungen', 0, 0);
    ctx.restore();

    // Start-X-Position für Balken berechnen
    // Die Balken sollen horizontal zentriert sein im verfügbaren Chartbereich
    // Berechnung: Verfügbare Breite minus benötigte Breite für alle Balken und Spacings, geteilt durch 2
    const startX = padding + (chartWidth - (barCount * barWidth + (barCount - 1) * barSpacing)) / 2;

    // Balken für jedes Fahrzeug zeichnen
    // Jeder Balken repräsentiert die Anzahl der Buchungen für ein Fahrzeug
    // Die Balkenhöhe ist proportional zur Buchungsanzahl (relativ zu yAxisMax)
    // Balken werden mit Schatten, Rand und Beschriftung gezeichnet
    vehicleBookingCounts.forEach((vehicle, index) => {
        // X-Position dieses Balkens berechnen (abhängig vom Index)
        const x = startX + index * (barWidth + barSpacing);

        // Balkenhöhe proportional zur Buchungsanzahl
        // Je mehr Buchungen, desto höher der Balken (maximal bis yAxisMax)
        const barHeight = (vehicle.count / yAxisMax) * chartHeight;

        // Y-Position ist von unten nach oben (Canvas-Y-Achse geht nach unten)
        const y = height - padding - barHeight;

        // Schatten zeichnen für 3D-Effekt
        // Schatten ist leicht versetzt (+3px rechts, +3px unten) in halbtransparentem Schwarz
        // Dieser Effekt lässt die Balken vom Hintergrund abheben
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(x + 3, y + 3, barWidth, barHeight);

        // Balken selbst in Fahrzeugfarbe zeichnen
        // Die Farbe wurde vorher mit getVehicleColor() basierend auf der Fahrzeug-ID generiert
        // Jedes Fahrzeug hat eine konsistente Farbe die bei jedem Rendering gleich ist
        ctx.fillStyle = vehicle.color;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Dünner dunkler Rand um den Balken
        // Definiert die Balkengrenzen klarer und sieht professioneller aus
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Anzahl der Buchungen über dem Balken anzeigen
        // Nur wenn count > 0 (bei 0 Buchungen wäre der Balken unsichtbar)
        // Fett und zentriert über dem Balken positioniert (-8px Offset für Abstand)
        // Diese Zahl ermöglicht präzises Ablesen ohne Gridlines interpretieren zu müssen
        if (vehicle.count > 0) {
            ctx.fillStyle = '#212529';
            ctx.font = 'bold 14px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(vehicle.count.toString(), x + barWidth / 2, y - 8);
        }

        // Fahrzeugname unter dem Balken anzeigen
        // Problem: Lange Namen würden überlappen oder aus dem Canvas rausgehen
        // Lösung: Namen über 12 Zeichen werden auf 10 Zeichen gekürzt + "..."
        // Beispiel: "Mercedes Sprinter XL Luxus" wird zu "Mercedes S..."
        let displayName = vehicle.name;
        if (displayName.length > 12) {
            displayName = displayName.substring(0, 10) + '...';
        }

        ctx.fillStyle = '#495057';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';

        // Text-Rotation bei vielen Fahrzeugen
        // Problem: Bei 4+ Fahrzeugen überlappen sich horizontale Namen
        // Lösung: Namen um 45° rotieren (spart Platz und ist noch lesbar)
        // Horizontale Namen: Bei 3 oder weniger Fahrzeugen (genug Platz)
        if (barCount > 4) {
            ctx.save();
            ctx.translate(x + barWidth / 2, height - padding + 15);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(displayName, 0, 0);
            ctx.restore();
        } else {
            ctx.fillText(displayName, x + barWidth / 2, height - padding + 20);
        }
    });

    // Hover-Interaktivität aktivieren
    // Diese Funktion registriert Event-Listener für Mausbewegungen über dem Canvas
    // Bei Hover über einem Balken wird ein Tooltip mit vollständigem Fahrzeugnamen angezeigt
    // Die Funktion ist ausgelagert um den Code übersichtlich zu halten
    setupCanvasHover(canvas, vehicleBookingCounts, startX, barWidth, barSpacing, height, padding, chartHeight, yAxisMax);
}

// Richtet Hover-Interaktivität für das Canvas-Diagramm ein
// Diese Funktion registriert mousemove und mouseleave Event-Listener auf dem Canvas
// Bei Hover über einem Balken wird das Tooltip-Element (canvasLegend) aktualisiert
// um den vollständigen Fahrzeugnamen und die genaue Buchungsanzahl anzuzeigen
// Parameter: canvas - Das Canvas-DOM-Element
//            vehicleData - Array mit {id, name, count, color} Objekten
//            startX - X-Koordinate des ersten Balkens
//            barWidth - Breite eines einzelnen Balkens
//            barSpacing - Abstand zwischen Balken
//            height - Gesamthöhe des Canvas
//            padding - Padding-Wert für Achsenbereich
//            chartHeight - Höhe des Diagrammbereichs
//            yAxisMax - Maximaler Y-Achsen-Wert für Höhenberechnung
// Die Funktion ermöglicht ein interaktives Erlebnis ohne komplexe Chart-Bibliotheken
function setupCanvasHover(canvas, vehicleData, startX, barWidth, barSpacing, height, padding, chartHeight, yAxisMax) {
    // Referenz zum Tooltip-Element im DOM
    // Dieses Element wird im HTML als 'canvasLegend' definiert und zeigt Hover-Details
    const tooltip = document.getElementById('canvasLegend');

    // Event-Listener für Mausbewegungen über dem Canvas
    // Bei jeder Bewegung wird geprüft ob die Maus über einem Balken ist
    // Falls ja, wird das Tooltip mit Fahrzeugdetails aktualisiert
    canvas.addEventListener('mousemove', (e) => {
        // Mausposition relativ zum Canvas berechnen
        // getBoundingClientRect() gibt Position des Canvas im Viewport zurück
        // Subtrahieren ergibt lokale Koordinaten innerhalb des Canvas
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Kollisionserkennung: Ist die Maus über einem Balken?
        // Durchlaufe alle Fahrzeuge und prüfe ob Maus innerhalb der Balken-Boundingbox ist
        // Die Boundingbox ist definiert durch barX, barY, barWidth und barHeight
        let hoveredVehicle = null;

        vehicleData.forEach((vehicle, index) => {
            // Balken-Position und -Größe berechnen (identisch zum Rendering-Code)
            const barX = startX + index * (barWidth + barSpacing);
            const barHeight = (vehicle.count / yAxisMax) * chartHeight;
            const barY = height - padding - barHeight;

            // Kollisionsprüfung: Ist Maus innerhalb des Rechtecks?
            // x >= barX && x <= barX + barWidth: Horizontal innerhalb
            // y >= barY && y <= height - padding: Vertikal innerhalb (von Balkentop bis X-Achse)
            if (x >= barX && x <= barX + barWidth && y >= barY && y <= height - padding) {
                hoveredVehicle = vehicle;
            }
        });

        // Tooltip-Inhalt aktualisieren basierend auf Hover-Status
        // Falls über Balken: Zeige Fahrzeugname und Buchungsanzahl in Fahrzeugfarbe
        // Falls nicht über Balken: Zeige Hinweistext in Grau
        // Cursor ändert sich zu Pointer um Interaktivität zu signalisieren
        if (hoveredVehicle) {
            tooltip.innerHTML = `
                <strong>${hoveredVehicle.name}</strong>:
                ${hoveredVehicle.count} Buchung${hoveredVehicle.count !== 1 ? 'en' : ''}
            `;
            tooltip.style.color = hoveredVehicle.color;
            canvas.style.cursor = 'pointer';
        } else {
            tooltip.innerHTML = '<small class="text-muted">Fahren Sie mit der Maus über die Balken für Details</small>';
            canvas.style.cursor = 'default';
        }
    });

    // Event-Listener für Verlassen des Canvas
    // Wenn die Maus das Canvas verlässt, wird der Tooltip zurückgesetzt
    // Cursor wird wieder auf default gesetzt
    // Verhindert dass Tooltip nach Verlassen des Canvas "hängen bleibt"
    canvas.addEventListener('mouseleave', () => {
        tooltip.innerHTML = '<small class="text-muted">Fahren Sie mit der Maus über die Balken für Details</small>';
        canvas.style.cursor = 'default';
    });
}

// Generiert eine konsistente Farbe für ein Fahrzeug basierend auf seiner ID
// Diese Funktion verwendet einen einfachen String-Hash-Algorithmus um aus der Fahrzeug-ID
// eine Zahl zu generieren, und wählt dann eine Farbe aus einem vordefinierten Farbpalette
// Vorteil: Jedes Fahrzeug hat immer dieselbe Farbe, auch nach Reload oder Datenänderung
// Die Farben sind bewusst gewählt um gute Lesbarkeit und Unterscheidbarkeit zu garantieren
// Parameter: vehicleId - Die eindeutige ID des Fahrzeugs (z.B. 'v_1705235689_x8k2j9')
// Rückgabe: Hex-Farbcode als String (z.B. '#0d6efd')
// Die Funktion ist deterministisch: Gleiche ID = gleiche Farbe
function getVehicleColor(vehicleId) {
    // Vordefinierte Farbpalette mit 8 kräftigen, gut unterscheidbaren Farben
    // Diese Farben folgen Bootstrap 5 Farbschema und sind barrierefrei
    // Bei mehr als 8 Fahrzeugen wiederholen sich die Farben (Modulo)
    const colors = [
        '#0d6efd', // Blau (Bootstrap Primary)
        '#198754', // Grün (Bootstrap Success)
        '#ffc107', // Gelb (Bootstrap Warning)
        '#dc3545', // Rot (Bootstrap Danger)
        '#6f42c1', // Lila (Bootstrap Purple)
        '#fd7e14', // Orange (Bootstrap Orange)
        '#20c997', // Türkis (Bootstrap Teal)
        '#d63384'  // Pink (Bootstrap Pink)
    ];

    // Einfacher String-Hash-Algorithmus
    // Durchläuft alle Zeichen der ID und generiert eine Zahl
    // charCodeAt(i) gibt den Unicode-Wert des Zeichens zurück
    // ((hash << 5) - hash) ist eine schnelle Multiplikation mit 31
    // Dieser Algorithmus ist nicht kryptografisch sicher, aber ausreichend für Farbzuordnung
    let hash = 0;
    for (let i = 0; i < vehicleId.length; i++) {
        hash = vehicleId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Wähle Farbe aus Palette basierend auf Hash
    // Math.abs() macht den Hash positiv (für negative Zahlen)
    // Modulo colors.length gibt einen Index zwischen 0 und 7 zurück
    // Resultat: Konsistente Farbzuordnung für jede ID
    return colors[Math.abs(hash) % colors.length];
}

// Resize-Event-Handler für responsive Canvas-Anpassung
// Problem: Wenn Browser-Fenster vergrößert/verkleinert wird, bleibt Canvas in alter Größe
// Lösung: Bei Window-Resize das Diagramm neu rendern in neuer Größe
// Debouncing: Resize-Events werden sehr häufig gefeuert (bei jedem Pixel Änderung)
// Um Performance zu sparen, warten wir 250ms nach dem letzten Resize bevor wir neu rendern
// Dies verhindert hunderte unnötige Renderings während des Resizings
window.addEventListener('resize', () => {
    // Lösche vorherigen Timer falls vorhanden (Debouncing)
    // Wenn Benutzer noch am Resizen ist, wird der Timer zurückgesetzt
    clearTimeout(window.canvasResizeTimer);

    // Starte neuen 250ms Timer
    // Nur wenn 250ms lang kein weiteres Resize-Event kommt, läuft diese Funktion
    // Hinweis: Das eigentliche Re-Rendering passiert automatisch beim nächsten displayProviderStats()
    // Diese Funktion hier dient nur als Placeholder/Reminder dass Resize behandelt wird
    // Das tatsächliche Neuzeichnen wird vom Provider-Dashboard gesteuert
    window.canvasResizeTimer = setTimeout(() => {
        // Canvas wird automatisch beim nächsten displayProviderStats neu gerendert
        // Explizites Neuzeichnen hier würde Daten neu laden müssen (nicht optimal)
        // Besser: Provider-Dashboard ruft renderBookingStatsCanvas() bei Bedarf auf
    }, 250);
});
