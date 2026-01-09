#!/usr/bin/env python3
"""
CamperRent REST API Server
Python Flask alternative to json-server
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DB_FILE = 'db.json'

def read_db():
    """Read database from db.json file"""
    if not os.path.exists(DB_FILE):
        return {"users": [], "vehicles": [], "bookings": []}

    with open(DB_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_db(data):
    """Write database to db.json file"""
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ============================================
# USERS ENDPOINTS
# ============================================

@app.route('/users', methods=['GET', 'POST'])
def users():
    db = read_db()

    if request.method == 'GET':
        # Query parameter filtering
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

@app.route('/vehicles', methods=['GET', 'POST'])
def vehicles():
    db = read_db()

    if request.method == 'GET':
        # Query parameter filtering
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

@app.route('/bookings', methods=['GET', 'POST'])
def bookings():
    db = read_db()

    if request.method == 'GET':
        # Query parameter filtering
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
        # Generate ID if not provided
        if 'id' not in new_booking:
            # Simple ID generation
            existing_ids = [b.get('id', '') for b in db['bookings']]
            counter = 1
            while f'b{counter}' in existing_ids:
                counter += 1
            new_booking['id'] = f'b{counter}'

        db['bookings'].append(new_booking)
        write_db(db)
        return jsonify(new_booking), 201

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
# SERVER INFO
# ============================================

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "message": "CamperRent API Server",
        "version": "1.0.0",
        "endpoints": {
            "users": "/users",
            "vehicles": "/vehicles",
            "bookings": "/bookings"
        }
    })

if __name__ == '__main__':
    print("=" * 50)
    print("CamperRent API Server")
    print("=" * 50)
    print(f"Database: {DB_FILE}")
    print(f"Server: http://localhost:3000")
    print("=" * 50)
    print("\nEndpoints:")
    print("  GET    /users")
    print("  GET    /users?email=...")
    print("  GET    /users/:id")
    print("  POST   /users")
    print("")
    print("  GET    /vehicles")
    print("  GET    /vehicles?provider_id=...")
    print("  GET    /vehicles/:id")
    print("  POST   /vehicles")
    print("  PUT    /vehicles/:id")
    print("  DELETE /vehicles/:id")
    print("")
    print("  GET    /bookings")
    print("  GET    /bookings?user_id=...")
    print("  GET    /bookings?vehicle_id=...")
    print("  GET    /bookings/:id")
    print("  POST   /bookings")
    print("  DELETE /bookings/:id")
    print("=" * 50)
    print("\nServer laeuft! Druecke CTRL+C zum Beenden.\n")

    app.run(host='127.0.0.1', port=3000, debug=True)
