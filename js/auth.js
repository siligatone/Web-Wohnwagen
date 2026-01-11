// AUTH.JS - Authentifizierung und Session-Management
// Diese Datei verwaltet alle Login-, Registrierungs- und Authentifizierungs-Funktionen.
// Sie prüft Benutzer-Credentials gegen die Datenbank, verwaltet die Session via localStorage,
// und stellt sicher dass geschützte Seiten nur von eingeloggten Benutzern aufgerufen werden können.
// Zusätzlich werden Benutzer je nach Rolle (customer/provider) zur richtigen Seite weitergeleitet.

// Verarbeitet den Login-Vorgang
// Validiert Email und Passwort gegen die Datenbank
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;

    try {
        const user = await getUserByEmail(email);

        if (!user) {
            showError('loginError', 'Diese E-Mail-Adresse ist nicht registriert.');
            return false;
        }

        if (user.password !== password) {
            showError('loginError', 'Falsches Passwort.');
            return false;
        }

        setCurrentUser(user);

        // Intelligente Weiterleitung: redirect-Parameter oder Rolle-spezifische Seite
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect');

        if (redirectTo) {
            window.location.href = redirectTo;
        } else {
            const isInPages = window.location.pathname.includes('/pages/');
            const prefix = isInPages ? '' : 'pages/';

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
// Validiert Eingaben, prüft Email-Verfügbarkeit und legt neuen User an
async function handleRegister(event) {
    event.preventDefault();

    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPass').value;
    const agbChecked = document.getElementById('agbCheck').checked;

    if (!agbChecked) {
        showError('registerError', 'Bitte akzeptieren Sie die AGB.');
        return false;
    }

    if (password.length < 3) {
        showError('registerError', 'Passwort muss mindestens 3 Zeichen lang sein.');
        return false;
    }

    try {
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            showError('registerError', 'Diese E-Mail-Adresse ist bereits registriert.');
            return false;
        }

        const roleCustomer = document.getElementById('roleCustomer');
        const roleProvider = document.getElementById('roleProvider');
        const selectedRole = roleProvider && roleProvider.checked ? 'provider' : 'customer';

        const newUser = {
            id: generateId('u'),
            email: email,
            password: password,
            name: `${firstName} ${lastName}`,
            role: selectedRole
        };

        await addUser(newUser);
        setCurrentUser(newUser);

        alert(`Willkommen, ${newUser.name}! Ihr Konto wurde erfolgreich erstellt.`);

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
// Zeigt Bestätigungsdialog und leitet zur Startseite weiter
function logout() {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
        setCurrentUser(null);
        const isInPages = window.location.pathname.includes('/pages/');
        window.location.href = isInPages ? '../index.html' : 'index.html';
    }
}

// Prüft ob ein Benutzer eingeloggt ist und optional ob er die richtige Rolle hat
// Leitet zu Login weiter falls nicht authentifiziert
function requireAuth(requiredRole = null) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        const currentPage = window.location.pathname.split('/').pop();
        window.location.href = `anmelden.html?redirect=${currentPage}`;
        return false;
    }

    if (requiredRole && currentUser.role !== requiredRole) {
        alert('Sie haben keine Berechtigung für diese Seite.');
        window.location.href = '../index.html';
        return false;
    }

    return true;
}

// Zeigt eine Fehlermeldung in einem Bootstrap Alert-Div an
// Erstellt das Div dynamisch falls nicht vorhanden, blendet nach 5 Sekunden aus
function showError(elementId, message) {
    let errorDiv = document.getElementById(elementId);

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

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Zeigt eine Erfolgsmeldung in einem Bootstrap Alert-Div an
// Analog zu showError() aber mit grünem Success-Style
function showSuccess(elementId, message) {
    let successDiv = document.getElementById(elementId);

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

    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

// Schaltet die Sichtbarkeit eines Passwort-Feldes um
// Wechselt Input-Type zwischen 'password' und 'text'
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}
