/* ===================================
   AUTH.JS - Login, Register, Session-Management
   =================================== */

// Login-Formular verarbeiten
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;

    try {
        // Finde User in Datenbank
        const user = await getUserByEmail(email);

        if (!user) {
            showError('loginError', 'Diese E-Mail-Adresse ist nicht registriert.');
            return false;
        }

        if (user.password !== password) {
            showError('loginError', 'Falsches Passwort.');
            return false;
        }

        // Login erfolgreich
        setCurrentUser(user);

        // Weiterleitung je nach redirect-Parameter oder Role
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect');

        if (redirectTo) {
            window.location.href = redirectTo;
        } else {
            // Prüfe, ob wir bereits im /pages/ Ordner sind
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

// Registrierung verarbeiten
async function handleRegister(event) {
    event.preventDefault();

    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPass').value;
    const agbChecked = document.getElementById('agbCheck').checked;

    // Validierung
    if (!agbChecked) {
        showError('registerError', 'Bitte akzeptieren Sie die AGB.');
        return false;
    }

    if (password.length < 3) {
        showError('registerError', 'Passwort muss mindestens 3 Zeichen lang sein.');
        return false;
    }

    try {
        // Prüfe, ob E-Mail bereits existiert
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            showError('registerError', 'Diese E-Mail-Adresse ist bereits registriert.');
            return false;
        }

        // Rolle aus Formular auslesen
        const roleCustomer = document.getElementById('roleCustomer');
        const roleProvider = document.getElementById('roleProvider');
        const selectedRole = roleProvider && roleProvider.checked ? 'provider' : 'customer';

        // Neuen User erstellen
        const newUser = {
            id: generateId('u'),
            email: email,
            password: password,
            name: `${firstName} ${lastName}`,
            role: selectedRole
        };

        await addUser(newUser);
        setCurrentUser(newUser);

        // Erfolgsmeldung und Weiterleitung
        alert(`Willkommen, ${newUser.name}! Ihr Konto wurde erfolgreich erstellt.`);

        // Prüfe, ob wir bereits im /pages/ Ordner sind
        const isInPages = window.location.pathname.includes('/pages/');
        const prefix = isInPages ? '' : 'pages/';
        window.location.href = `${prefix}profil.html`;
    } catch (error) {
        console.error('Registrierungs-Fehler:', error);
        showError('registerError', 'Fehler bei der Registrierung. Ist der Server gestartet?');
    }

    return false;
}

// Logout
function logout() {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
        setCurrentUser(null);
        // Prüfe, ob wir im /pages/ Ordner sind
        const isInPages = window.location.pathname.includes('/pages/');
        window.location.href = isInPages ? '../index.html' : 'index.html';
    }
}

// Prüfe, ob User eingeloggt ist
function requireAuth(requiredRole = null) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        // Nicht eingeloggt - redirect zu Login mit Rücksprung-URL
        const currentPage = window.location.pathname.split('/').pop();
        window.location.href = `anmelden.html?redirect=${currentPage}`;
        return false;
    }

    // Prüfe Rolle, falls angegeben
    if (requiredRole && currentUser.role !== requiredRole) {
        alert('Sie haben keine Berechtigung für diese Seite.');
        window.location.href = '../index.html';
        return false;
    }

    return true;
}

// Zeige Fehlermeldung
function showError(elementId, message) {
    let errorDiv = document.getElementById(elementId);

    if (!errorDiv) {
        // Erstelle Error-Div, falls nicht vorhanden
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

    // Automatisch nach 5 Sekunden ausblenden
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Zeige Erfolgsmeldung
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

// Passwort-Sichtbarkeit togglen (optional)
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}
