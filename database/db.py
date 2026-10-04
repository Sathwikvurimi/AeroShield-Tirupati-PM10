import sqlite3
import os
from datetime import datetime

if os.environ.get('VERCEL') or os.environ.get('SERVERLESS'):
    DB_PATH = '/tmp/aeroshield.db'
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), 'aeroshield.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Table 1: Live Readings Cache
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS live_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station_name TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            pm10_value REAL NOT NULL,
            timestamp TEXT NOT NULL,
            category TEXT,
            api_status TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table 2: Prediction History
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prediction_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            current_pm10 REAL,
            predicted_pm10 REAL NOT NULL,
            actual_pm10 REAL,
            expected_change REAL,
            change_percentage REAL,
            category TEXT NOT NULL,
            anomaly_status TEXT NOT NULL,
            model_version TEXT,
            prediction_type TEXT DEFAULT 'LIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table 3: Anomalies Log
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS anomalies_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            pm10_value REAL NOT NULL,
            anomaly_score REAL NOT NULL,
            status TEXT NOT NULL,
            model_used TEXT NOT NULL,
            context_note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table 4: Model Versions & Metadata
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS model_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_type TEXT NOT NULL,
            model_name TEXT NOT NULL,
            trained_at TEXT NOT NULL,
            dataset_size INTEGER,
            primary_metric_name TEXT,
            primary_metric_val REAL,
            file_path TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()

def log_prediction(timestamp, current_pm10, predicted_pm10, expected_change, change_pct, category, anomaly_status, model_version="1.0.0", pred_type="LIVE"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO prediction_history (timestamp, current_pm10, predicted_pm10, expected_change, change_percentage, category, anomaly_status, model_version, prediction_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (timestamp, current_pm10, predicted_pm10, expected_change, change_pct, category, anomaly_status, model_version, pred_type))
    conn.commit()
    conn.close()

def log_live_reading(station_name, lat, lon, pm10_val, timestamp, category, api_status="ONLINE"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO live_readings (station_name, latitude, longitude, pm10_value, timestamp, category, api_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (station_name, lat, lon, pm10_val, timestamp, category, api_status))
    conn.commit()
    conn.close()

def log_anomaly(timestamp, pm10_val, score, status, model_used="IsolationForest", note=""):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO anomalies_log (timestamp, pm10_value, anomaly_score, status, model_used, context_note)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (timestamp, pm10_val, score, status, model_used, note))
    conn.commit()
    conn.close()

def get_recent_predictions(limit=50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM prediction_history ORDER BY id DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_latest_live_reading():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM live_readings ORDER BY id DESC LIMIT 1')
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully!")
