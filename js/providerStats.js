// PROVIDERSTATS.JS - Canvas-basierte Statistik-Visualisierung für Provider-Dashboard
// Diese Datei implementiert die visuelle Darstellung von Buchungsstatistiken als Balkendiagramm.
// Sie nutzt die HTML5 Canvas API um ein interaktives Diagramm zu rendern das die Anzahl der Buchungen
// pro Fahrzeug anzeigt. Das Diagramm ist vollständig responsiv, unterstützt Retina-Displays und
// bietet Hover-Interaktivität mit Tooltips. Die Implementierung verzichtet bewusst auf externe
// Chart-Bibliotheken um die Kontrolle über das Rendering und die Performance zu behalten.

// Rendert ein Canvas-Balkendiagramm für Provider-Buchungsstatistiken
// Berechnet Buchungsanzahl pro Fahrzeug und zeichnet professionelles Diagramm mit Gridlines, Achsen und Tooltips
function renderBookingStatsCanvas(bookings, vehicles) {
    const canvas = document.getElementById('bookingStatsCanvas');
    if (!canvas) {
        console.error('Canvas-Element nicht gefunden');
        return;
    }

    const ctx = canvas.getContext('2d');

    // Canvas-Größe für Retina-Displays korrekt setzen
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    // Arbeitsbereich-Dimensionen definieren
    const width = rect.width;
    const height = rect.height;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    // Edge Case: Keine Fahrzeuge vorhanden
    if (vehicles.length === 0) {
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Keine Fahrzeuge vorhanden', width / 2, height / 2);
        return;
    }

    // Buchungen pro Fahrzeug zählen
    const vehicleBookingCounts = vehicles.map(vehicle => {
        const count = bookings.filter(b => b.vehicle_id === vehicle.id).length;
        return {
            id: vehicle.id,
            name: vehicle.name,
            count: count,
            color: getVehicleColor(vehicle.id)
        };
    });

    // Intelligente Y-Achsen-Skalierung
    const maxBookings = Math.max(...vehicleBookingCounts.map(v => v.count), 1);
    let yAxisMax;

    if (maxBookings <= 5) {
        yAxisMax = maxBookings;
    } else if (maxBookings <= 10) {
        yAxisMax = Math.ceil(maxBookings / 2) * 2;
    } else {
        yAxisMax = Math.ceil(maxBookings * 1.1);
    }

    // Balkenbreite berechnen
    const barCount = vehicleBookingCounts.length;
    const barSpacing = 20;
    const totalBarWidth = (chartWidth - (barCount - 1) * barSpacing) / barCount;
    const barWidth = Math.min(totalBarWidth, 120);

    // Hellgrauer Hintergrund
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // L-förmige Achsen zeichnen
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y-Achsen-Beschriftung und Gridlines
    ctx.fillStyle = '#495057';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';

    let ySteps;
    if (yAxisMax <= 5) {
        ySteps = yAxisMax;
    } else if (yAxisMax <= 10) {
        ySteps = 5;
    } else {
        ySteps = Math.min(10, yAxisMax);
    }

    // Zeichne Gridlines und Labels
    for (let i = 0; i <= ySteps; i++) {
        const value = Math.round((yAxisMax / ySteps) * i);
        const y = height - padding - (chartHeight / yAxisMax) * value;

        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        ctx.fillText(value.toString(), padding - 10, y + 4);
    }

    // Haupttitel
    ctx.fillStyle = '#212529';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Buchungen pro Fahrzeug', width / 2, 30);

    // Y-Achsen-Titel vertikal
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Anzahl Buchungen', 0, 0);
    ctx.restore();

    // Start-X-Position für Balken
    const startX = padding + (chartWidth - (barCount * barWidth + (barCount - 1) * barSpacing)) / 2;

    // Balken für jedes Fahrzeug zeichnen
    vehicleBookingCounts.forEach((vehicle, index) => {
        const x = startX + index * (barWidth + barSpacing);
        const barHeight = (vehicle.count / yAxisMax) * chartHeight;
        const y = height - padding - barHeight;

        // Schatten zeichnen
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(x + 3, y + 3, barWidth, barHeight);

        // Balken selbst
        ctx.fillStyle = vehicle.color;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Dünner dunkler Rand
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Anzahl über dem Balken
        if (vehicle.count > 0) {
            ctx.fillStyle = '#212529';
            ctx.font = 'bold 14px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(vehicle.count.toString(), x + barWidth / 2, y - 8);
        }

        // Fahrzeugname unter dem Balken
        let displayName = vehicle.name;
        if (displayName.length > 12) {
            displayName = displayName.substring(0, 10) + '...';
        }

        ctx.fillStyle = '#495057';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';

        // Text-Rotation bei vielen Fahrzeugen
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
    setupCanvasHover(canvas, vehicleBookingCounts, startX, barWidth, barSpacing, height, padding, chartHeight, yAxisMax);
}

// Richtet Hover-Interaktivität für das Canvas-Diagramm ein
// Zeigt Tooltip mit Fahrzeugname und Buchungsanzahl bei Hover über Balken
function setupCanvasHover(canvas, vehicleData, startX, barWidth, barSpacing, height, padding, chartHeight, yAxisMax) {
    const tooltip = document.getElementById('canvasLegend');

    // Event-Listener für Mausbewegungen
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Kollisionserkennung: Ist die Maus über einem Balken?
        let hoveredVehicle = null;

        vehicleData.forEach((vehicle, index) => {
            const barX = startX + index * (barWidth + barSpacing);
            const barHeight = (vehicle.count / yAxisMax) * chartHeight;
            const barY = height - padding - barHeight;

            if (x >= barX && x <= barX + barWidth && y >= barY && y <= height - padding) {
                hoveredVehicle = vehicle;
            }
        });

        // Tooltip-Inhalt aktualisieren
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
    canvas.addEventListener('mouseleave', () => {
        tooltip.innerHTML = '<small class="text-muted">Fahren Sie mit der Maus über die Balken für Details</small>';
        canvas.style.cursor = 'default';
    });
}

// Generiert eine konsistente Farbe für ein Fahrzeug basierend auf seiner ID
// Verwendet String-Hash-Algorithmus um aus ID eine Farbe aus Palette zu wählen
function getVehicleColor(vehicleId) {
    // Vordefinierte Farbpalette mit 8 kräftigen Farben
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
    let hash = 0;
    for (let i = 0; i < vehicleId.length; i++) {
        hash = vehicleId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}

// Resize-Event-Handler für responsive Canvas-Anpassung
// Debouncing: Wartet 250ms nach letztem Resize bevor neu gerendert wird
window.addEventListener('resize', () => {
    clearTimeout(window.canvasResizeTimer);
    window.canvasResizeTimer = setTimeout(() => {
        // Canvas wird automatisch beim nächsten displayProviderStats neu gerendert
    }, 250);
});
