/* ===================================
   SHARED.JS - Header, Footer, Cookie-Banner
   =================================== */

// Initialisiere Shared-Komponenten
function initShared() {
    renderHeader();
    renderFooter();
    checkCookieConsent();
    updateNavigation();
}

// Header/Navigation rendern
function renderHeader() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isProvider = currentUser && currentUser.role === 'provider';

    // Prüfe, ob wir im /seiten/ Ordner sind
    const isInPages = window.location.pathname.includes('/seiten/');
    const pathPrefix = isInPages ? '../' : '';
    const pagesPrefix = isInPages ? '' : 'seiten/';

    const headerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark sticky-top">
            <div class="container">
                <a class="navbar-brand fw-bold" href="${pathPrefix}startseite.html">
                    <i class="fa-solid fa-route me-2"></i>CamperRent
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navContent">
                    <ul class="navbar-nav ms-auto align-items-center">
                        <li class="nav-item">
                            <a class="nav-link" href="${pathPrefix}startseite.html">Home</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="${pathPrefix}startseite.html#fahrzeuge">Fahrzeuge</a>
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

    // Header-Element finden oder erstellen
    let headerElement = document.querySelector('header');
    if (!headerElement) {
        headerElement = document.createElement('header');
        document.body.insertBefore(headerElement, document.body.firstChild);
    }
    headerElement.innerHTML = headerHTML;
}

// Footer rendern
function renderFooter() {
    // Prüfe, ob wir im /seiten/ Ordner sind
    const isInPages = window.location.pathname.includes('/seiten/');
    const pathPrefix = isInPages ? '../' : '';
    const pagesPrefix = isInPages ? '' : 'seiten/';

    const footerHTML = `
        <footer class="py-5">
            <div class="container">
                <div class="row gy-4">
                    <div class="col-md-4">
                        <h5 class="fw-bold text-white mb-3">CamperRent</h5>
                        <p class="small">Wir machen Camping einfach. Entdecken Sie die Welt mit unseren geprüften Wohnmobilen.</p>
                    </div>
                    <div class="col-md-4">
                        <h5 class="fw-bold text-white mb-3">Links</h5>
                        <ul class="list-unstyled">
                            <li><a href="${pagesPrefix}impressum.html">Impressum</a></li>
                            <li><a href="${pagesPrefix}datenschutz.html">Datenschutz</a></li>
                            <li><a href="${pathPrefix}startseite.html">Startseite</a></li>
                        </ul>
                    </div>
                    <div class="col-md-4">
                        <h5 class="fw-bold text-white mb-3">Kontakt</h5>
                        <ul class="list-unstyled text-light small">
                            <li><i class="fa-solid fa-envelope me-2"></i>info@camperrent.de</li>
                            <li><i class="fa-solid fa-phone me-2"></i>+49 123 456789</li>
                        </ul>
                    </div>
                </div>
                <div class="border-top border-secondary mt-4 pt-3 text-center small text-white-50">
                    &copy; 2026 CamperRent Demo.
                </div>
            </div>
        </footer>
    `;

    // Footer-Element finden oder erstellen
    let footerElement = document.querySelector('footer');
    if (!footerElement) {
        footerElement = document.createElement('footer');
        document.body.appendChild(footerElement);
    }
    footerElement.outerHTML = footerHTML;
}

// Cookie-Banner rendern und prüfen
function checkCookieConsent() {
    // Prüfe, ob Cookie-Banner bereits existiert
    let cookieBanner = document.getElementById('cookie-banner');

    if (!cookieBanner) {
        // Cookie-Banner erstellen
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

    // Zeige Banner, wenn noch nicht akzeptiert
    if (!localStorage.getItem('camperRent_cookie_consent')) {
        setTimeout(() => {
            cookieBanner.classList.add('show');
        }, 1000);
    }
}

// Cookie akzeptieren
function acceptCookies() {
    localStorage.setItem('camperRent_cookie_consent', 'true');
    const banner = document.getElementById('cookie-banner');
    if (banner) {
        banner.classList.remove('show');
    }
}

// Logout-Funktion
function logout() {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'startseite.html';
    }
}

// Navigation je nach Login-Status aktualisieren
function updateNavigation() {
    // Wird beim Rendern des Headers automatisch berücksichtigt
    renderHeader();
}

// Datum formatieren für Anzeige (DD.MM.YYYY)
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

// Bei DOM-Ready initialisieren
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShared);
} else {
    initShared();
}
