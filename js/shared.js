// ===================================
// SHARED.JS - Gemeinsame UI-Komponenten und Hilfsfunktionen für alle Seiten
// ===================================
// Diese Datei stellt wiederverwendbare Komponenten bereit die auf allen Seiten der Anwendung
// benötigt werden. Dazu gehören Header mit Navigation, Footer mit Links und Kontaktdaten,
// Cookie-Consent-Banner (DSGVO-konform) und allgemeine Hilfsfunktionen wie Datumsformatierung.
// Die Komponenten werden automatisch beim Seiten-Load initialisiert und passen sich dynamisch
// an den Login-Status des Benutzers an. Die Datei nutzt localStorage für Session-Management
// und Cookie-Consent-Tracking. Alle Pfade werden automatisch angepasst je nachdem ob die Seite
// im Root-Verzeichnis oder im /pages/ Unterordner liegt.

// Initialisiert alle gemeinsamen UI-Komponenten beim Seiten-Load
// Diese Hauptfunktion wird automatisch aufgerufen sobald das DOM vollständig geladen ist
// Sie orchestriert das Rendern aller wiederkehrenden Elemente und prüft Cookie-Consent
// Reihenfolge ist wichtig: Header zuerst (für Navigation), dann Footer, dann Cookie-Banner
// updateNavigation() wird zuletzt aufgerufen um Login-Status zu synchronisieren
// Die Funktion ist idempotent und kann mehrfach aufgerufen werden ohne Probleme
function initShared() {
    renderHeader();
    renderFooter();
    checkCookieConsent();
    updateNavigation();
}

// Rendert den Header mit Navigation und dynamischen Links basierend auf Login-Status
// Diese Funktion generiert die komplette Navigationsleiste inkl. Logo, Menü-Items und Auth-Buttons
// Der Header passt sich automatisch an folgende Faktoren an:
// - Login-Status: Zeigt entweder "Anmelden" Button oder "Profil" + Logout-Buttons
// - Benutzer-Rolle: Erkennt Provider vs. Customer (für zukünftige Role-spezifische Features)
// - Verzeichnis-Struktur: Passt Pfade an je nachdem ob Seite im Root oder /pages/ liegt
// - Responsive: Bootstrap Navbar mit Hamburger-Menü für Mobile
// Das Logo ist ein inline SVG (Wohnwagen-Icon) das ohne externe Dateien funktioniert
// Die Funktion erstellt das header-Element falls nicht vorhanden oder aktualisiert bestehendes
function renderHeader() {
    // Lade aktuellen Benutzer aus localStorage
    // Diese Information wird verwendet um Login-Status und Rolle zu bestimmen
    // Falls nicht eingeloggt ist currentUser null
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isProvider = currentUser && currentUser.role === 'provider';

    // Pfad-Präfix-Logik für korrekte relative Links
    // Problem: Seiten liegen teils im Root (index.html) teils in /pages/ (profil.html)
    // Lösung: Prüfe aktuellen Pfad und setze Präfixe entsprechend
    // Beispiele:
    // - Von index.html (Root): pathPrefix='' pagesPrefix='pages/'
    // - Von pages/profil.html: pathPrefix='../' pagesPrefix=''
    // So funktionieren Links zu index.html und zu Unterseiten von überall
    const isInPages = window.location.pathname.includes('/pages/');
    const pathPrefix = isInPages ? '../' : '';
    const pagesPrefix = isInPages ? '' : 'pages/';

    // Header-HTML als Template-String generieren
    // Bootstrap 5 Navbar: navbar-dark für dunklen Style, sticky-top für fixierte Position beim Scrollen
    // SVG-Logo: Minimalistisches Wohnwagen-Icon in weiß (passt zum dunklen Navbar)
    // - Wohnwagen-Körper als abgerundetes Rechteck (path mit Quadratic Bezier Curves)
    // - Kleines Fenster mit Transparenz für Realismus
    // - Deichsel (Anhänger-Verbindung) mit zwei Linien in V-Form
    // - Großes Rad mit innerem Kreis für 3D-Effekt
    // Navigation: Dynamisch generiert basierend auf currentUser
    // - Eingeloggt: "Mein Profil" Button + Logout Icon-Button (Rot für Warnung)
    // - Nicht eingeloggt: "Anmelden" Button (Outline-Style)
    const headerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark sticky-top">
            <div class="container">
                <a class="navbar-brand fw-bold" href="${pathPrefix}index.html">
                    <svg width="30" height="30" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px; vertical-align: middle;">
                        <!-- Minimalistischer Wohnwagen - nur weiß -->

                        <!-- Wohnwagen Körper -->
                        <path d="M 30 20 L 95 20 Q 105 20 105 30 L 105 50 L 30 50 L 30 30 Q 30 20 30 20 Z" fill="#ffffff"/>

                        <!-- Kleines Fenster -->
                        <rect x="45" y="28" width="12" height="10" rx="2" fill="#000000" opacity="0.3"/>

                        <!-- Deichsel (Anhänger-Teil) -->
                        <line x1="30" y1="35" x2="15" y2="50" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
                        <line x1="30" y1="35" x2="15" y2="20" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>

                        <!-- Großes Rad -->
                        <circle cx="75" cy="58" r="12" fill="#ffffff"/>
                        <circle cx="75" cy="58" r="6" fill="#000000" opacity="0.3"/>
                    </svg>
                    InterCamp
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navContent">
                    <ul class="navbar-nav ms-auto align-items-center">
                        <li class="nav-item">
                            <a class="nav-link" href="${pathPrefix}index.html">Home</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="${pathPrefix}index.html#fahrzeuge">Fahrzeuge</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="${pagesPrefix}impressum.html">Impressum</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="${pagesPrefix}datenschutz.html">Datenschutz</a>
                        </li>
                        ${currentUser ? `
                            <li class="nav-item ms-2">
                                <a class="nav-link btn btn-outline-light border-0 px-3" href="${pagesPrefix}profil.html">
                                    <i class="fa-regular fa-user me-1"></i> Mein Profil
                                </a>
                            </li>
                            <li class="nav-item ms-1">
                                <a class="nav-link btn btn-danger px-3" href="#" onclick="logout(); return false;">
                                    <i class="fa-solid fa-sign-out-alt"></i>
                                </a>
                            </li>
                        ` : `
                            <li class="nav-item ms-2">
                                <a class="nav-link btn btn-outline-light border-0 px-3" href="${pagesPrefix}anmelden.html">
                                    <i class="fa-regular fa-user me-1"></i> Anmelden
                                </a>
                            </li>
                        `}
                    </ul>
                </div>
            </div>
        </nav>
    `;

    // Header-Element im DOM finden oder erstellen falls nicht vorhanden
    // Suche zuerst nach existierendem <header> Tag
    // Falls nicht gefunden: Erstelle neues <header> Element und füge es am Anfang von body ein
    // Vorteil dieser Logik: Funktioniert sowohl mit manuell definierten als auch ohne header-Tags
    let headerElement = document.querySelector('header');
    if (!headerElement) {
        headerElement = document.createElement('header');
        document.body.insertBefore(headerElement, document.body.firstChild);
    }

    // Setze generierten HTML-Code in das Header-Element
    // innerHTML ersetzt kompletten Inhalt (alte Navigation wird überschrieben)
    headerElement.innerHTML = headerHTML;
}

// Rendert den Footer mit Links, Kontaktdaten und Copyright-Information
// Diese Funktion generiert den Footer der auf allen Seiten identisch erscheint
// Der Footer ist in 3 Spalten aufgeteilt (responsive: stapeln sich auf Mobile):
// - Spalte 1: Über InterCamp (Firmen-Tagline)
// - Spalte 2: Wichtige Links (Impressum, Datenschutz, Startseite)
// - Spalte 3: Kontaktdaten (Email, Telefon mit Icons)
// Der Footer passt Pfade automatisch an je nach Verzeichnis-Kontext (Root vs. /pages/)
// Bootstrap Grid Layout sorgt für responsive Darstellung
function renderFooter() {
    // Pfad-Präfix-Logik (identisch zum Header)
    // Siehe renderHeader() für detaillierte Erklärung
    const isInPages = window.location.pathname.includes('/pages/');
    const pathPrefix = isInPages ? '../' : '';
    const pagesPrefix = isInPages ? '' : 'pages/';

    // Footer-HTML als Template-String generieren
    // Bootstrap Footer mit dunklem Hintergrund (siehe CSS)
    // py-5: Padding oben/unten für Luftigkeit
    // gy-4: Vertikaler Gap zwischen Rows (wichtig für Mobile)
    // text-white-50: Halbtransparente weiße Texte für dezenten Look
    // border-top: Visuelle Trennung der Copyright-Zeile
    const footerHTML = `
        <footer class="py-5">
            <div class="container">
                <div class="row gy-4">
                    <div class="col-md-4">
                        <h5 class="fw-bold text-white mb-3">InterCamp</h5>
                        <p class="small">Wir machen Camping einfach. Entdecken Sie die Welt mit unseren geprüften Wohnmobilen.</p>
                    </div>
                    <div class="col-md-4">
                        <h5 class="fw-bold text-white mb-3">Links</h5>
                        <ul class="list-unstyled">
                            <li><a href="${pagesPrefix}impressum.html">Impressum</a></li>
                            <li><a href="${pagesPrefix}datenschutz.html">Datenschutz</a></li>
                            <li><a href="${pathPrefix}index.html">Startseite</a></li>
                        </ul>
                    </div>
                    <div class="col-md-4">
                        <h5 class="fw-bold text-white mb-3">Kontakt</h5>
                        <ul class="list-unstyled text-light small">
                            <li><i class="fa-solid fa-envelope me-2"></i>info@intercamp.de</li>
                            <li><i class="fa-solid fa-phone me-2"></i>+49 123 456789</li>
                        </ul>
                    </div>
                </div>
                <div class="border-top border-secondary mt-4 pt-3 text-center small text-white-50">
                    &copy; 2026 InterCamp Demo.
                </div>
            </div>
        </footer>
    `;

    // Footer-Element im DOM finden oder erstellen
    // Ähnliche Logik wie bei Header, aber Footer wird ans Ende von body angehängt
    let footerElement = document.querySelector('footer');
    if (!footerElement) {
        footerElement = document.createElement('footer');
        document.body.appendChild(footerElement);
    }

    // Verwende outerHTML statt innerHTML um das komplette footer-Element zu ersetzen
    // Grund: Footer-CSS-Klassen sind im generierten HTML definiert, nicht im ursprünglichen Tag
    footerElement.outerHTML = footerHTML;
}

// Prüft Cookie-Consent-Status und zeigt Banner falls noch nicht akzeptiert
// Diese Funktion implementiert DSGVO-konforme Cookie-Benachrichtigung
// Der Banner erscheint automatisch 1 Sekunde nach Seiten-Load falls noch nicht akzeptiert
// Der Consent-Status wird in localStorage gespeichert (Key: interCamp_cookie_consent)
// Banner ist fixed am unteren Bildschirmrand und hat CSS-Animation beim Erscheinen
// Beide Buttons ("Ablehnen" und "Alle Akzeptieren") führen aktuell zur selben Aktion
// da die App nur essentielle Cookies (localStorage für Session) nutzt
function checkCookieConsent() {
    // Prüfe ob Cookie-Banner bereits im DOM existiert
    // Falls ja, keine Duplikate erstellen
    let cookieBanner = document.getElementById('cookie-banner');

    // Banner erstellen falls noch nicht vorhanden
    // Dies passiert beim ersten Seiten-Load oder wenn Banner-HTML fehlt
    if (!cookieBanner) {
        // Cookie-Banner HTML mit Bootstrap-Styling
        // Container mit Flex-Layout für responsive Anordnung:
        // - Desktop: Text links, Buttons rechts (flex-row)
        // - Mobile: Text oben, Buttons unten (flex-column)
        // Emoji 🍪 für visuellen Appeal und DSGVO-Compliance-Hinweis
        const bannerHTML = `
            <div id="cookie-banner">
                <div class="container d-flex flex-column flex-md-row justify-content-between align-items-center">
                    <div class="mb-3 mb-md-0">
                        <h5 class="fw-bold">Wir nutzen Cookies 🍪</h5>
                        <p class="mb-0 small text-white-50">Wir verwenden Cookies, um Ihnen das beste Erlebnis zu bieten. Durch die Nutzung der Seite stimmen Sie dem zu.</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-light btn-sm" onclick="acceptCookies()">Ablehnen</button>
                        <button class="btn btn-success btn-sm" onclick="acceptCookies()">Alle Akzeptieren</button>
                    </div>
                </div>
            </div>
        `;

        // Banner-HTML ans Ende von body anfügen
        // insertAdjacentHTML('beforeend') fügt HTML vor dem schließenden </body> Tag ein
        // Vorteil: Kein Re-Rendering des gesamten body
        document.body.insertAdjacentHTML('beforeend', bannerHTML);
        cookieBanner = document.getElementById('cookie-banner');
    }

    // Banner anzeigen falls noch nicht akzeptiert
    // localStorage-Key 'interCamp_cookie_consent' speichert Zustimmung persistent
    // 1 Sekunde Verzögerung für sanfte User Experience (Seite kann erst laden)
    // CSS-Klasse 'show' triggert Slide-Up-Animation (siehe style.css)
    if (!localStorage.getItem('interCamp_cookie_consent')) {
        setTimeout(() => {
            cookieBanner.classList.add('show');
        }, 1000);
    }
}

// Speichert Cookie-Zustimmung und blendet Banner aus
// Diese Funktion wird von beiden Buttons im Cookie-Banner aufgerufen
// Aktuell: Beide Buttons (Ablehnen/Akzeptieren) führen zur gleichen Aktion
// Grund: Die App nutzt nur essentielle localStorage-Daten für Session-Management
// In einer erweiterten Version könnte hier zwischen verschiedenen Cookie-Kategorien unterschieden werden
// Die Funktion speichert 'true' in localStorage und entfernt die 'show' CSS-Klasse
// Die 'show'-Klasse-Entfernung triggert Slide-Down-Animation (CSS Transition)
function acceptCookies() {
    // Speichere Consent in localStorage
    // Wert 'true' signalisiert dass Benutzer Cookies akzeptiert hat
    // Dieser Wert persistiert über Browser-Neustarts
    localStorage.setItem('interCamp_cookie_consent', 'true');

    // Banner ausblenden mit CSS-Transition
    // Entfernen der 'show' Klasse triggert die Slide-Down-Animation
    const banner = document.getElementById('cookie-banner');
    if (banner) {
        banner.classList.remove('show');
    }
}

// Loggt den aktuellen Benutzer aus und leitet zur Startseite weiter
// Diese Funktion wird vom Logout-Button in der Navigation aufgerufen
// Sie zeigt einen Bestätigungs-Dialog um versehentliches Ausloggen zu verhindern
// Bei Bestätigung wird die Session gelöscht (localStorage.removeItem) und zur Startseite geleitet
// Der Logout-Button im Header ruft diese Funktion mit onclick="logout(); return false;"
// return false verhindert dass der Link navigiert (href="#")
function logout() {
    // Sicherheitsabfrage um versehentliches Ausloggen zu verhindern
    // confirm() zeigt nativen Browser-Dialog mit OK/Abbrechen
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
        // Entferne currentUser aus localStorage
        // Dies beendet die Session und der Benutzer ist ausgeloggt
        localStorage.removeItem('currentUser');

        // Leite zur Startseite weiter
        // Nach Logout sollte Benutzer auf einer öffentlichen Seite landen
        // index.html ist sicher da sie keinen Login erfordert
        window.location.href = 'index.html';
    }
}

// Aktualisiert die Navigation basierend auf aktuellem Login-Status
// Diese Funktion ist ein Wrapper um renderHeader()
// Sie kann von anderen Scripts aufgerufen werden um Navigation zu refreshen
// Beispiel-Use-Case: Nach Login/Logout Navigation aktualisieren ohne Page-Reload
// Aktuell: Ruft einfach renderHeader() auf welches Login-Status automatisch berücksichtigt
// In Zukunft könnte hier auch Role-basierte Navigation implementiert werden
function updateNavigation() {
    // Wird beim Rendern des Headers automatisch berücksichtigt
    // renderHeader() liest currentUser aus localStorage und passt Navigation an
    renderHeader();
}

// Formatiert ein ISO-Datum (YYYY-MM-DD) zu deutschem Format (DD.MM.YYYY)
// Diese Hilfsfunktion wird in verschiedenen Komponenten verwendet
// um Daten benutzerfreundlich anzuzeigen (Buchungsbestätigungen, Profil, etc.)
// Parameter: dateStr - Datum im ISO-Format "2024-03-15"
// Rückgabe: String im deutschen Format "15.03.2024"
// Die Funktion nutzt Date-Objekt zum Parsen und padStart() für führende Nullen
// Beispiele: "2024-03-05" wird zu "05.03.2024", "2024-12-31" wird zu "31.12.2024"
function formatDateDisplay(dateStr) {
    // Parse ISO-String zu Date-Objekt
    // new Date() versteht ISO-Format automatisch
    const date = new Date(dateStr);

    // Extrahiere Tag, Monat und Jahr
    // getDate() gibt Tag des Monats (1-31)
    // getMonth() gibt Monat (0-11, daher +1)
    // getFullYear() gibt 4-stelliges Jahr
    // padStart(2, '0') fügt führende Null hinzu falls einstellig (z.B. "5" wird zu "05")
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    // Returniere formatiertes Datum im deutschen Standard DD.MM.YYYY
    return `${day}.${month}.${year}`;
}

// Automatische Initialisierung beim Seiten-Load
// Diese Logik stellt sicher dass initShared() genau einmal aufgerufen wird sobald DOM bereit ist
// Zwei Fälle werden abgedeckt:
// Fall 1: Script lädt während HTML noch parst (readyState === 'loading')
//         -> Registriere Event-Listener für DOMContentLoaded
// Fall 2: Script lädt nachdem DOM bereits fertig ist (async/defer Attribute)
//         -> Rufe initShared() sofort auf
// Diese Technik garantiert dass DOM-Manipulation erst stattfindet wenn alle Elemente verfügbar sind
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShared);
} else {
    initShared();
}
