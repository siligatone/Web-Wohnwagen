// ===================================
// AUTH.JS - Authentifizierung und Session-Management für CamperRent
// ===================================
// Diese Datei verwaltet alle Login-, Registrierungs- und Authentifizierungs-Funktionen.
// Sie prüft Benutzer-Credentials gegen die Datenbank, verwaltet die Session via localStorage,
// und stellt sicher dass geschützte Seiten nur von eingeloggten Benutzern aufgerufen werden können.
// Zusätzlich werden Benutzer je nach Rolle (customer/provider) zur richtigen Seite weitergeleitet.

// Verarbeitet den Login-Vorgang wenn das Login-Formular abgeschickt wird
// Diese Funktion wird vom Login-Formular aufgerufen (onsubmit="return handleLogin(event)")
// Sie validiert Email und Passwort gegen die Datenbank und loggt den Benutzer ein falls korrekt
// Parameter: event - Das Submit-Event des Formulars (wird benötigt um preventDefault() aufzurufen)
// Rückgabe: false um das Standard-Formular-Submit zu verhindern (Seiten-Reload würde Session verlieren)
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;

    try {
        // Suche Benutzer anhand der Email-Adresse in der Datenbank
        // getUserByEmail() nutzt die API um einen User mit dieser Email zu finden
        const user = await getUserByEmail(email);

        // Prüfe ob Email existiert
        // Falls kein User gefunden wurde, existiert diese Email nicht im System
        if (!user) {
            showError('loginError', 'Diese E-Mail-Adresse ist nicht registriert.');
            return false;
        }

        // Prüfe Passwort
        // WICHTIG: In Produktion sollte das Passwort gehasht sein (z.B. mit bcrypt)
        // Hier wird aus Einfachheit Plain-Text verglichen (NICHT SICHER für echte Anwendungen!)
        if (user.password !== password) {
            showError('loginError', 'Falsches Passwort.');
            return false;
        }

        // Login erfolgreich - Speichere User in Session (localStorage)
        // setCurrentUser() speichert den User als JSON im localStorage des Browsers
        setCurrentUser(user);

        // Intelligente Weiterleitung nach erfolgreichem Login
        // 1. Falls ein redirect-Parameter in der URL steht (z.B. ?redirect=fahrzeug-detail.html), dorthin
        // 2. Sonst zur Rolle-spezifischen Seite: provider -> anbieter.html, customer -> profil.html
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect');

        if (redirectTo) {
            window.location.href = redirectTo;
        } else {
            // Prüfe, ob wir bereits im /seiten/ Ordner sind
            const isInPages = window.location.pathname.includes('/seiten/');
            const prefix = isInPages ? '' : 'seiten/';

            if (user.role === 'provider') {
                window.location.href = `${prefix}anbieter.html`;
            } else {
                window.location.href = `${prefix}profil.html`;
            }
        }
    } catch (error) {
        console.error('Login-Fehler:', error);
        showError('loginError', 'Fehler beim Login. Ist der Server gestartet?');
    }

    return false;
}

// Verarbeitet die Registrierung eines neuen Benutzers
// Diese Funktion wird vom Registrierungs-Formular aufgerufen
// Sie validiert die Eingaben, prüft ob die Email bereits existiert, und legt einen neuen User an
// Parameter: event - Das Submit-Event des Formulars
// Rückgabe: false um Standard-Submit zu verhindern
async function handleRegister(event) {
    event.preventDefault();

    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPass').value;
    const agbChecked = document.getElementById('agbCheck').checked;

    // Validierung der Eingaben
    // Prüfe ob die AGB-Checkbox aktiviert ist (rechtlich erforderlich)
    if (!agbChecked) {
        showError('registerError', 'Bitte akzeptieren Sie die AGB.');
        return false;
    }

    // Minimale Passwort-Länge prüfen
    // In Produktion sollte man stärkere Anforderungen haben (Großbuchstaben, Zahlen, Sonderzeichen)
    if (password.length < 3) {
        showError('registerError', 'Passwort muss mindestens 3 Zeichen lang sein.');
        return false;
    }

    try {
        // Prüfe ob die Email bereits registriert ist
        // Emails müssen eindeutig sein, sonst hätten wir mehrere Accounts mit gleicher Email
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            showError('registerError', 'Diese E-Mail-Adresse ist bereits registriert.');
            return false;
        }

        // Lese die gewählte Rolle aus dem Formular
        // Benutzer können wählen: Customer (mietet Fahrzeuge) oder Provider (vermietet Fahrzeuge)
        // Falls Provider-Radio-Button existiert und gecheckt ist, wird role='provider' gesetzt
        const roleCustomer = document.getElementById('roleCustomer');
        const roleProvider = document.getElementById('roleProvider');
        const selectedRole = roleProvider && roleProvider.checked ? 'provider' : 'customer';

        // Erstelle neues User-Objekt mit allen erforderlichen Feldern
        // generateId('u') erstellt eine eindeutige ID mit Präfix 'u' (z.B. u_1705235689_x8k2j9)
        // Der Name wird aus Vor- und Nachname zusammengesetzt
        const newUser = {
            id: generateId('u'),
            email: email,
            password: password,
            name: `${firstName} ${lastName}`,
            role: selectedRole
        };

        // Speichere den neuen User in der Datenbank via API
        // addUser() ruft die POST /users Endpoint auf
        await addUser(newUser);

        // Logge den User automatisch ein nach erfolgreicher Registrierung
        // So muss sich der User nicht nochmal separat einloggen
        setCurrentUser(newUser);

        // Zeige Willkommens-Nachricht
        alert(`Willkommen, ${newUser.name}! Ihr Konto wurde erfolgreich erstellt.`);

        // Leite zur Profil-Seite weiter
        // Auch hier prüfen wir den Pfad um den korrekten Prefix zu verwenden
        const isInPages = window.location.pathname.includes('/pages/');
        const prefix = isInPages ? '' : 'pages/';
        window.location.href = `${prefix}profil.html`;
    } catch (error) {
        console.error('Registrierungs-Fehler:', error);
        showError('registerError', 'Fehler bei der Registrierung. Ist der Server gestartet?');
    }

    return false;
}

// Loggt den aktuellen Benutzer aus
// Diese Funktion löscht die Session und leitet zur Startseite weiter
// Sie sollte von einem Logout-Button aufgerufen werden (onclick="logout()")
// Eine Bestätigungs-Meldung verhindert versehentliches Ausloggen
function logout() {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
        // Lösche User aus localStorage (Session beenden)
        setCurrentUser(null);
        // Prüfe, ob wir im /seiten/ Ordner sind
        const isInPages = window.location.pathname.includes('/seiten/');
        window.location.href = isInPages ? '../startseite.html' : 'startseite.html';
    }
}

// Prüft ob ein Benutzer eingeloggt ist und optional ob er die richtige Rolle hat
// Diese Funktion sollte am Anfang jeder geschützten Seite aufgerufen werden
// Sie stellt sicher dass nur authentifizierte Benutzer Zugriff haben
// Parameter: requiredRole - Optional, z.B. 'provider' oder 'customer' (null = nur Login-Check)
// Rückgabe: true falls berechtigt, false falls nicht (bei false wird automatisch weitergeleitet)
// Beispiel-Verwendung: requireAuth('provider') am Anfang von anbieter.html
function requireAuth(requiredRole = null) {
    const currentUser = getCurrentUser();

    // Prüfe ob überhaupt jemand eingeloggt ist
    // Falls nicht, leite zum Login weiter und merke dir die aktuelle Seite
    // Der redirect-Parameter ermöglicht es, nach dem Login zurück zur gewünschten Seite zu kommen
    if (!currentUser) {
        const currentPage = window.location.pathname.split('/').pop();
        window.location.href = `anmelden.html?redirect=${currentPage}`;
        return false;
    }

    // Prüfe die Rolle falls eine spezifische Rolle erforderlich ist
    // Beispiel: Provider-Dashboard sollte nur für User mit role='provider' zugänglich sein
    // Falls die Rolle nicht passt, zeige Fehlermeldung und leite zur Startseite
    if (requiredRole && currentUser.role !== requiredRole) {
        alert('Sie haben keine Berechtigung für diese Seite.');
        window.location.href = '../index.html';
        return false;
    }

    return true;
}

// Zeigt eine Fehlermeldung in einem Alert-Div an
// Diese Funktion erstellt dynamisch ein Bootstrap-Alert-Div falls es nicht existiert
// Parameter: elementId - Die ID des Error-Divs (z.B. 'loginError'), message - Der Fehlertext
// Die Nachricht wird nach 5 Sekunden automatisch ausgeblendet
function showError(elementId, message) {
    let errorDiv = document.getElementById(elementId);

    // Falls kein Error-Div existiert, erstelle ein neues
    // Das Div bekommt Bootstrap-Klassen für rote Fehler-Darstellung (alert alert-danger)
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = elementId;
        errorDiv.className = 'alert alert-danger mt-3';
        const form = document.querySelector('form');
        if (form) {
            form.appendChild(errorDiv);
        }
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Blende die Nachricht nach 5 Sekunden automatisch aus
    // So bleibt die Seite sauber und alte Fehler verschwinden von selbst
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Zeigt eine Erfolgsmeldung in einem Alert-Div an
// Funktioniert analog zu showError(), aber mit grünem Bootstrap-Style (alert-success)
// Parameter: elementId - Die ID des Success-Divs, message - Der Erfolgstext
// Wird verwendet für Bestätigungen wie "Profil erfolgreich aktualisiert"
function showSuccess(elementId, message) {
    let successDiv = document.getElementById(elementId);

    // Falls kein Success-Div existiert, erstelle ein neues mit grünem Style
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = elementId;
        successDiv.className = 'alert alert-success mt-3';
        const form = document.querySelector('form');
        if (form) {
            form.appendChild(successDiv);
        }
    }

    successDiv.textContent = message;
    successDiv.style.display = 'block';

    // Automatisches Ausblenden nach 5 Sekunden
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

// Schaltet die Sichtbarkeit eines Passwort-Feldes um
// Diese optionale Funktion ermöglicht es Benutzern, ihr eingegebenes Passwort zu sehen
// Parameter: inputId - Die ID des Password-Input-Feldes (z.B. 'loginPass')
// Verwendung: <button onclick="togglePasswordVisibility('loginPass')">👁️</button>
// Der Input-Type wechselt zwischen 'password' (versteckt) und 'text' (sichtbar)
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}
