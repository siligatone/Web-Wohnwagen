// SHARED.JS - Gemeinsame UI-Komponenten und Hilfsfunktionen für alle Seiten
// Diese Datei stellt wiederverwendbare Komponenten bereit die auf allen Seiten der Anwendung
// benötigt werden. Dazu gehören Header mit Navigation, Footer mit Links und Kontaktdaten,
// Cookie-Consent-Banner (DSGVO-konform) und allgemeine Hilfsfunktionen wie Datumsformatierung.
// Die Komponenten werden automatisch beim Seiten-Load initialisiert und passen sich dynamisch
// an den Login-Status des Benutzers an. Die Datei nutzt localStorage für Session-Management
// und Cookie-Consent-Tracking. Alle Pfade werden automatisch angepasst je nachdem ob die Seite
// im Root-Verzeichnis oder im /pages/ Unterordner liegt.

// Initialisiert alle gemeinsamen UI-Komponenten beim Seiten-Load
// Rendert Header, Footer, Cookie-Banner und aktualisiert Navigation
function initShared() {
    renderHeader();
    renderFooter();
    checkCookieConsent();
    updateNavigation();
}

// Rendert den Header mit Navigation und dynamischen Links
// Passt sich an Login-Status, Benutzer-Rolle und Verzeichnis-Struktur an
function renderHeader() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isProvider = currentUser && currentUser.role === 'provider';

    // Pfad-Präfixe für korrekte relative Links (Root vs. /pages/)
    const isInPages = window.location.pathname.includes('/pages/');
    const pathPrefix = isInPages ? '../' : '';
    const pagesPrefix = isInPages ? '' : 'pages/';

    const headerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark sticky-top">
            <div class="container">
                <a class="navbar-brand fw-bold" href="${pathPrefix}index.html">
                    <svg width="30" height="30" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px; vertical-align: middle;">
                        <path d="M 30 20 L 95 20 Q 105 20 105 30 L 105 50 L 30 50 L 30 30 Q 30 20 30 20 Z" fill="#ffffff"/>
                        <rect x="45" y="28" width="12" height="10" rx="2" fill="#000000" opacity="0.3"/>
                        <line x1="30" y1="35" x2="15" y2="50" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
                        <line x1="30" y1="35" x2="15" y2="20" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
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

    let headerElement = document.querySelector('header');
    if (!headerElement) {
        headerElement = document.createElement('header');
        document.body.insertBefore(headerElement, document.body.firstChild);
    }
    headerElement.innerHTML = headerHTML;
}

// Rendert den Footer mit Links, Kontaktdaten und Copyright
// 3-Spalten-Layout mit responsive Stacking auf Mobile
function renderFooter() {
    const isInPages = window.location.pathname.includes('/pages/');
    const pathPrefix = isInPages ? '../' : '';
    const pagesPrefix = isInPages ? '' : 'pages/';

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

    let footerElement = document.querySelector('footer');
    if (!footerElement) {
        footerElement = document.createElement('footer');
        document.body.appendChild(footerElement);
    }
    footerElement.outerHTML = footerHTML;
}

// Prüft Cookie-Consent-Status und zeigt Banner falls noch nicht akzeptiert
// DSGVO-konform mit 1 Sekunde Verzögerung und localStorage-Persistierung
function checkCookieConsent() {
    let cookieBanner = document.getElementById('cookie-banner');

    if (!cookieBanner) {
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
        document.body.insertAdjacentHTML('beforeend', bannerHTML);
        cookieBanner = document.getElementById('cookie-banner');
    }

    if (!localStorage.getItem('interCamp_cookie_consent')) {
        setTimeout(() => {
            cookieBanner.classList.add('show');
        }, 1000);
    }
}

// Speichert Cookie-Zustimmung und blendet Banner aus
function acceptCookies() {
    localStorage.setItem('interCamp_cookie_consent', 'true');
    const banner = document.getElementById('cookie-banner');
    if (banner) {
        banner.classList.remove('show');
    }
}

// Loggt den aktuellen Benutzer aus und leitet zur Startseite weiter
// Zeigt Bestätigungs-Dialog um versehentliches Ausloggen zu verhindern
function logout() {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// Aktualisiert die Navigation basierend auf Login-Status
// Wrapper um renderHeader() für externe Aufrufe
function updateNavigation() {
    renderHeader();
}

// Formatiert ISO-Datum (YYYY-MM-DD) zu deutschem Format (DD.MM.YYYY)
// Verwendet für Buchungsbestätigungen und Datumsanzeigen
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

// Automatische Initialisierung beim Seiten-Load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShared);
} else {
    initShared();
}
