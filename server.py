#!/usr/bin/env python3
# CamperRent REST API Server
# Dieser Server stellt eine REST API für die Verwaltung von Benutzern, Fahrzeugen und Buchungen bereit.
# Die API ermöglicht es dem Frontend, Daten aus der JSON-Datenbank zu lesen und zu schreiben.
# Zusätzlich bietet der Server eine Thumbnail-API, die Bilder von URLs lädt, skaliert und als optimierte JPGs ausliefert.

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
from datetime import datetime
from PIL import Image
import requests
from io import BytesIO
import hashlib

app = Flask(__name__)
CORS(app)

DB_FILE = 'datenbank.json'

# Liest die gesamte Datenbank aus der JSON-Datei ein.
# Falls die Datei nicht existiert, wird eine leere Struktur mit den drei Collections zurückgegeben.
# Die Funktion wird bei jedem API-Request aufgerufen, um immer die aktuellen Daten zu haben.
def read_db():
    if not os.path.exists(DB_FILE):
        return {"users": [], "vehicles": [], "bookings": []}

    with open(DB_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

# Schreibt die komplette Datenbank zurück in die JSON-Datei.
# Die Daten werden formatiert (indent=2) gespeichert, damit sie menschenlesbar sind.
# ensure_ascii=False sorgt dafür, dass deutsche Umlaute korrekt gespeichert werden.
def write_db(data):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ============================================
# USERS ENDPOINTS
# ============================================

# GET: Gibt alle Benutzer zurück, optional gefiltert nach Email-Adresse (für Login)
# POST: Erstellt einen neuen Benutzer (Registrierung)
# Die Email-Filterung wird genutzt um zu prüfen, ob ein Benutzer bereits existiert
@app.route('/users', methods=['GET', 'POST'])
def users():
    db = read_db()

    if request.method == 'GET':
        email = request.args.get('email')
        if email:
            filtered = [u for u in db['users'] if u.get('email') == email]
            return jsonify(filtered)
        return jsonify(db['users'])

    elif request.method == 'POST':
        new_user = request.json
        db['users'].append(new_user)
        write_db(db)
        return jsonify(new_user), 201

# Gibt einen einzelnen Benutzer anhand seiner ID zurück.
# Wird verwendet um Profil-Informationen anzuzeigen.
# Gibt einen 404 Fehler zurück falls der Benutzer nicht gefunden wurde.
@app.route('/users/<user_id>', methods=['GET'])
def get_user(user_id):
    db = read_db()
    user = next((u for u in db['users'] if u['id'] == user_id), None)
    if user:
        return jsonify(user)
    return jsonify({"error": "User not found"}), 404

# ============================================
# VEHICLES ENDPOINTS
# ============================================

# GET: Gibt alle Fahrzeuge zurück, optional gefiltert nach Provider-ID
# POST: Erstellt ein neues Fahrzeug (wird vom Provider-Dashboard genutzt)
# Die Provider-Filterung ermöglicht es Anbietern, nur ihre eigenen Fahrzeuge zu sehen
@app.route('/vehicles', methods=['GET', 'POST'])
def vehicles():
    db = read_db()

    if request.method == 'GET':
        provider_id = request.args.get('provider_id')
        if provider_id:
            filtered = [v for v in db['vehicles'] if v.get('provider_id') == provider_id]
            return jsonify(filtered)
        return jsonify(db['vehicles'])

    elif request.method == 'POST':
        new_vehicle = request.json
        db['vehicles'].append(new_vehicle)
        write_db(db)
        return jsonify(new_vehicle), 201

# GET: Gibt ein spezifisches Fahrzeug zurück (für Detailseite)
# PUT: Aktualisiert ein Fahrzeug komplett (Provider bearbeitet sein Fahrzeug)
# DELETE: Löscht ein Fahrzeug aus der Datenbank (Provider entfernt sein Fahrzeug)
# Die vehicle_id kommt direkt aus der URL (z.B. /vehicles/v1)
@app.route('/vehicles/<vehicle_id>', methods=['GET', 'PUT', 'DELETE'])
def get_vehicle(vehicle_id):
    db = read_db()

    if request.method == 'GET':
        vehicle = next((v for v in db['vehicles'] if v['id'] == vehicle_id), None)
        if vehicle:
            return jsonify(vehicle)
        return jsonify({"error": "Vehicle not found"}), 404

    elif request.method == 'PUT':
        updated_data = request.json
        for i, vehicle in enumerate(db['vehicles']):
            if vehicle['id'] == vehicle_id:
                db['vehicles'][i] = updated_data
                write_db(db)
                return jsonify(updated_data)
        return jsonify({"error": "Vehicle not found"}), 404

    elif request.method == 'DELETE':
        db['vehicles'] = [v for v in db['vehicles'] if v['id'] != vehicle_id]
        write_db(db)
        return '', 204

# ============================================
# BOOKINGS ENDPOINTS
# ============================================

# GET: Gibt alle Buchungen zurück, kann nach user_id oder vehicle_id gefiltert werden
# POST: Erstellt eine neue Buchung
# Die Filterung nach user_id wird für die Profil-Seite genutzt (Meine Buchungen)
# Die Filterung nach vehicle_id wird für den Verfügbarkeits-Check genutzt (Kalender)
@app.route('/bookings', methods=['GET', 'POST'])
def bookings():
    db = read_db()

    if request.method == 'GET':
        user_id = request.args.get('user_id')
        vehicle_id = request.args.get('vehicle_id')

        result = db['bookings']

        if user_id:
            result = [b for b in result if b.get('user_id') == user_id]
        if vehicle_id:
            result = [b for b in result if b.get('vehicle_id') == vehicle_id]

        return jsonify(result)

    elif request.method == 'POST':
        new_booking = request.json

        # Falls keine ID mitgeschickt wurde, generieren wir automatisch eine
        # Wir suchen die nächste freie Nummer (b1, b2, b3, ...) und weisen diese zu
        # So wird sichergestellt, dass jede Buchung eine eindeutige ID hat
        if 'id' not in new_booking:
            existing_ids = [b.get('id', '') for b in db['bookings']]
            counter = 1
            while f'b{counter}' in existing_ids:
                counter += 1
            new_booking['id'] = f'b{counter}'

        db['bookings'].append(new_booking)
        write_db(db)
        return jsonify(new_booking), 201

# GET: Gibt eine einzelne Buchung anhand ihrer ID zurück
# DELETE: Löscht eine Buchung (Stornierung)
# Die Stornierung entfernt die Buchung komplett aus der Datenbank
@app.route('/bookings/<booking_id>', methods=['GET', 'DELETE'])
def get_booking(booking_id):
    db = read_db()

    if request.method == 'GET':
        booking = next((b for b in db['bookings'] if b['id'] == booking_id), None)
        if booking:
            return jsonify(booking)
        return jsonify({"error": "Booking not found"}), 404

    elif request.method == 'DELETE':
        db['bookings'] = [b for b in db['bookings'] if b['id'] != booking_id]
        write_db(db)
        return '', 204

# ============================================
# IMAGE PROCESSING - THUMBNAIL API
# ============================================

CACHE_DIR = 'thumbnail_cache'
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

# Thumbnail-Generator für optimierte Bilddarstellung
# Diese Funktion lädt ein Bild von einer externen URL (z.B. Discord oder Unsplash),
# skaliert es auf die gewünschte Breite und speichert es als optimiertes JPG.
#
# Vorteile:
# - Kleinere Dateigrößen = schnellere Ladezeiten für die Website
# - Automatische Konvertierung von PNG zu JPG
# - Caching verhindert wiederholtes Herunterladen der gleichen Bilder
#
# Query-Parameter:
# - url: Die URL des Originalbilds (erforderlich)
# - width: Gewünschte Breite in Pixeln (optional, Standard: 400, Max: 2000)
@app.route('/api/thumbnail', methods=['GET'])
def generate_thumbnail():
    try:
        image_url = request.args.get('url')
        if not image_url:
            return jsonify({"error": "Missing 'url' parameter"}), 400

        # Breite aus Query-Parameter lesen und validieren
        # Wir erlauben nur Werte zwischen 50 und 2000 Pixel um Missbrauch zu verhindern
        try:
            width = int(request.args.get('width', 400))
            if width < 50 or width > 2000:
                return jsonify({"error": "Width must be between 50 and 2000"}), 400
        except ValueError:
            return jsonify({"error": "Invalid width parameter"}), 400

        # Cache-Key generieren: MD5-Hash aus URL und Breite
        # Dadurch wird jede URL+Breite-Kombination nur einmal verarbeitet
        # Gleiche Anfragen werden direkt aus dem Cache beantwortet
        cache_key = hashlib.md5(f"{image_url}_{width}".encode()).hexdigest()
        cache_path = os.path.join(CACHE_DIR, f"{cache_key}.jpg")

        # Wenn das Thumbnail bereits im Cache existiert, direkt zurückgeben
        # Das spart Zeit und Bandbreite, da das Bild nicht erneut heruntergeladen werden muss
        if os.path.exists(cache_path):
            return send_file(cache_path, mimetype='image/jpeg')

        # Bild von der externen URL herunterladen
        # Timeout von 10 Sekunden verhindert, dass der Server hängt wenn die URL langsam ist
        response = requests.get(image_url, timeout=10)
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch image"}), 404

        img = Image.open(BytesIO(response.content))

        # PNG-Bilder mit Transparenz müssen special behandelt werden
        # JPG unterstützt keine Transparenz, deshalb legen wir einen weißen Hintergrund darunter
        # Das verhindert schwarze Bereiche wo vorher Transparenz war
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Neue Größe berechnen unter Beibehaltung des Seitenverhältnisses
        # Wenn das Originalbild 1200x800 ist und width=400 gewünscht wird,
        # dann wird es auf 400x267 skaliert (gleiches Verhältnis)
        aspect_ratio = img.height / img.width
        new_width = width
        new_height = int(width * aspect_ratio)

        # Bild mit hochwertiger LANCZOS-Filterung skalieren
        # LANCZOS bietet die beste Qualität beim Verkleinern von Bildern
        # Alternative Methoden wie BILINEAR oder NEAREST würden schlechtere Ergebnisse liefern
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Als JPG speichern mit Qualität 85 (guter Kompromiss zwischen Dateigröße und Qualität)
        # optimize=True aktiviert zusätzliche Kompression für kleinere Dateien
        # Das fertige Thumbnail wird im Cache gespeichert und dann an den Client gesendet
        img.save(cache_path, 'JPEG', quality=85, optimize=True)
        return send_file(cache_path, mimetype='image/jpeg')

    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timeout while fetching image"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch image: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Image processing failed: {str(e)}"}), 500

# ============================================
# SERVER INFO
# ============================================

# Gibt Basis-Informationen über die API zurück
# Dieser Endpoint ist nützlich zum Testen ob der Server läuft
# und zeigt alle verfügbaren Endpoints mit Beispielen an
@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "message": "CamperRent API Server",
        "version": "1.0.0",
        "endpoints": {
            "users": "/users",
            "vehicles": "/vehicles",
            "bookings": "/bookings",
            "thumbnail": "/api/thumbnail?url=IMAGE_URL&width=400"
        }
    })

# Server starten
# debug=True sorgt dafür, dass der Server automatisch neustartet wenn Code geändert wird
# Das ist praktisch während der Entwicklung, sollte aber in Produktion deaktiviert werden
if __name__ == '__main__':
    print(f"Server running on http://localhost:3000")
    app.run(host='127.0.0.1', port=3000, debug=True)
