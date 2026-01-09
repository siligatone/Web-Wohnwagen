# CamperRent - Wohnmobil-Vermietungsplattform

Moderne Web-Anwendung für Wohnmobil-Vermietung mit JSON-Datenbank-Backend.

## 🗄️ Datenbank

Das Projekt nutzt eine **JSON-Datei als Datenbank** (`db.json`), die über einen JSON-Server verwaltet wird.

### Wichtig: Server muss laufen!

Die Anwendung funktioniert NUR, wenn der JSON-Server läuft. Dieser stellt eine REST API zur Verfügung, über die die Daten gelesen und geschrieben werden.

## 🚀 Installation & Start

### Option A: Python (Empfohlen für Systeme ohne Node.js)

#### 1. Python Dependencies installieren

```bash
pip install -r requirements.txt
```

Dies installiert Flask und flask-cors für den Python-Server.

#### 2. Server starten

```bash
python server.py
```

Der Server läuft dann auf: **http://localhost:3000**

Du siehst diese Ausgabe:
```
==================================================
🚐 CamperRent API Server
==================================================
📂 Database: db.json
🌐 Server: http://localhost:3000
==================================================

Endpoints:
  GET    /users
  GET    /users?email=...
  GET    /users/:id
  POST   /users
  ...
```

---

### Option B: Node.js (Alternative)

#### 1. Dependencies installieren

```bash
npm install
```

Dies installiert `json-server`, der die JSON-Datenbank verwaltet.

#### 2. Server starten

```bash
npm start
```

Der Server läuft dann auf: **http://localhost:3000**

### 3. Frontend öffnen

Öffne `index.html` in deinem Browser (z.B. mit Live Server oder direkt).

**Wichtig:** Der JSON-Server muss laufen, sonst funktioniert die Seite nicht!

## 📂 Projekt-Struktur

```
camperrent/
├── db.json                 ← DATENBANK (wird aktiv beschrieben!)
├── server.py               ← Python Flask Server (Option A)
├── requirements.txt        ← Python Dependencies (Option A)
├── package.json            ← npm Dependencies (Option B)
├── server.js               ← JSON-Server Konfiguration (Option B)
├── index.html              ← Startseite
├── pages/                  ← Unterseiten
│   ├── fahrzeug.html
│   ├── profil.html
│   ├── anbieter.html
│   ├── anmelden.html
│   ├── impressum.html
│   └── datenschutz.html
├── css/                    ← Stylesheets
│   ├── main.css
│   ├── components.css
│   └── pages.css
├── js/                     ← JavaScript-Module
│   ├── api.js             ← API-Funktionen (NEU!)
│   ├── data.js            ← Datenverwaltung
│   ├── shared.js          ← Header, Footer, Navigation
│   ├── auth.js            ← Login, Register
│   ├── vehicles.js        ← Fahrzeug-Liste
│   ├── vehicleDetail.js   ← Fahrzeug-Details
│   ├── calendar.js        ← Kalender-Komponente
│   ├── booking.js         ← Buchungslogik
│   ├── profile.js         ← Kundenprofil
│   └── provider.js        ← Anbieter-Dashboard
└── assets/                 ← Bilder (optional)
```

## 🗄️ Datenbank: db.json

Die Datenbank enthält drei Haupt-Collections:

### Users
```json
{
  "id": "u1",
  "email": "user@example.com",
  "password": "123",
  "role": "customer",  // "customer" oder "provider"
  "name": "Max Mustermann"
}
```

### Vehicles
```json
{
  "id": "v1",
  "provider_id": "p1",
  "name": "Sunny Explorer",
  "price": 90,
  "beds": 4,
  "fuel": "Diesel",
  "desc": "Beschreibung...",
  "details": { ... },
  "features": [...],
  "img": "https://..."
}
```

### Bookings
```json
{
  "id": "b1",
  "vehicle_id": "v1",
  "user_id": "c1",
  "start": "2024-01-15",
  "end": "2024-01-20",
  "nights": 5,
  "totalPrice": 465,
  "createdAt": "2024-01-01T10:00:00.000Z"
}
```

## 🔧 API Endpoints

Der JSON-Server stellt automatisch folgende REST API zur Verfügung:

### Users
- `GET /users` - Alle User
- `GET /users/:id` - User by ID
- `GET /users?email=...` - User by Email
- `POST /users` - Neuen User erstellen
- `PUT /users/:id` - User aktualisieren
- `DELETE /users/:id` - User löschen

### Vehicles
- `GET /vehicles` - Alle Fahrzeuge
- `GET /vehicles/:id` - Fahrzeug by ID
- `GET /vehicles?provider_id=...` - Fahrzeuge eines Anbieters
- `POST /vehicles` - Neues Fahrzeug erstellen
- `PUT /vehicles/:id` - Fahrzeug aktualisieren
- `DELETE /vehicles/:id` - Fahrzeug löschen

### Bookings
- `GET /bookings` - Alle Buchungen
- `GET /bookings/:id` - Buchung by ID
- `GET /bookings?user_id=...` - Buchungen eines Users
- `GET /bookings?vehicle_id=...` - Buchungen eines Fahrzeugs
- `POST /bookings` - Neue Buchung erstellen
- `DELETE /bookings/:id` - Buchung löschen

## 👤 Demo-Accounts

**Kunde:**
- E-Mail: kunde@test.de
- Passwort: 123

**Anbieter:**
- E-Mail: anbieter@test.de
- Passwort: 123

## 🔄 Wie funktioniert die Datenpersistenz?

1. **Server läuft** → `db.json` wird geladen
2. **Neue Buchung erstellt** → POST Request an `/bookings`
3. **JSON-Server schreibt** → Änderung in `db.json` gespeichert
4. **Server neu starten** → Alle Daten bleiben erhalten!

**Vorteil:** Du kannst `db.json` direkt bearbeiten und Daten hinzufügen/ändern!

## ❗ Troubleshooting

### "Fehler beim Laden der Fahrzeuge"
→ Server ist nicht gestartet. Führe `npm start` aus.

### "Cannot find module 'json-server'"
→ Dependencies nicht installiert. Führe `npm install` aus.

### "Port 3000 already in use"
→ Anderer Prozess nutzt Port 3000. Ändere in `package.json` den Port zu `3001`.

### Änderungen in db.json gehen verloren
→ Stelle sicher, dass der Server läuft, wenn du Änderungen machst.

## 📝 Notizen

- **Session-Management:** Aktueller User wird weiterhin in localStorage gespeichert (nur für Session)
- **Daten:** Alle anderen Daten (Fahrzeuge, Buchungen, User) kommen aus `db.json`
- **Entwicklung:** Nutze Browser DevTools → Network Tab um API-Calls zu sehen

## 🛠️ Weiterentwicklung

Du kannst jetzt:
- ✅ Neue Fahrzeuge in `db.json` hinzufügen
- ✅ Demo-User anpassen
- ✅ Buchungen manuell erstellen
- ✅ Datenbank zurücksetzen (einfach `db.json` editieren)
