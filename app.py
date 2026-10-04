import os
import sys
import json
import csv
import io
import pandas as pd

from flask import Flask, render_template, request, jsonify, send_file, Response, make_response
from datetime import datetime

from database.db import init_db, get_recent_predictions, get_db_connection
from preprocessing.preprocess import (
    analyze_data_quality,
    build_pm10_features,
    get_pm10_category,
    FEATURE_COLUMNS
)
from services.live_pm10 import (
    fetch_live_pm10,
    fetch_all_ap_stations_pm10,
    fetch_all_india_stations_pm10,
    get_all_ap_stations,
    get_past_24h_pm10_readings,
    STATION_INFO
)
from services.prediction import predict_next_hour_pm10, load_ml_models
from services.anomaly import detect_pm10_anomaly
from services.weather import get_tirupati_weather


# ============================================================
# INITIALIZATION
# ============================================================

init_db()

CSV_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        'data/AP001_PM10_ONLY_DATASET.csv'
    )
)

df_historical = None

if os.path.exists(CSV_PATH):
    try:
        df_historical = build_pm10_features(CSV_PATH)
    except Exception as e:
        print(f"Warning: Could not build feature matrix on startup: {e}")

load_ml_models()


# ============================================================
# FLASK APPLICATION
# IMPORTANT: app must exist at module level for Vercel
# ============================================================

app = Flask(__name__)


# ============================================================
# FRONTEND / REACT VITE
# ============================================================

DIST_FOLDER = os.path.abspath(
    os.path.join(os.path.dirname(__file__), 'frontend/dist')
)

if os.path.exists(DIST_FOLDER):

    app.static_folder = os.path.join(DIST_FOLDER, 'assets')
    app.static_url_path = '/assets'

    @app.after_request
    def add_header(response):
        response.headers['Cache-Control'] = (
            'no-cache, no-store, must-revalidate, max-age=0'
        )
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    @app.route('/')
    def index():
        return send_file(
            os.path.join(DIST_FOLDER, 'index.html')
        )

    @app.route('/<path:path>')
    def catch_all(path):

        # Do not interfere with API routes
        if path.startswith('api/'):
            return jsonify({
                "status": "error",
                "message": "Endpoint not found"
            }), 404

        target = os.path.join(DIST_FOLDER, path)

        if os.path.exists(target):
            return send_file(target)

        # React SPA fallback
        return send_file(
            os.path.join(DIST_FOLDER, 'index.html')
        )


# ============================================================
# REST API ENDPOINTS
# ============================================================

@app.route('/api/current-pm10', methods=['GET'])
def get_current_pm10():

    force = request.args.get(
        'refresh',
        'false'
    ).lower() == 'true'

    station_id = request.args.get(
        'station_id',
        'AP001'
    )

    live_data = fetch_live_pm10(
        station_id=station_id,
        force_refresh=force
    )

    return jsonify({
        "status": "success",
        "data": live_data
    })


@app.route('/api/ap-stations-pm10', methods=['GET'])
def get_ap_stations_pm10():

    force = request.args.get(
        'refresh',
        'false'
    ).lower() == 'true'

    state = request.args.get(
        'state',
        None
    )

    ap_data = fetch_all_india_stations_pm10(
        state_filter=state,
        force_refresh=force
    )

    return jsonify({
        "status": "success",
        "count": len(ap_data),
        "data": ap_data
    })


@app.route('/api/india-stations-pm10', methods=['GET'])
def get_india_stations_pm10():

    force = request.args.get(
        'refresh',
        'false'
    ).lower() == 'true'

    state = request.args.get(
        'state',
        None
    )

    india_data = fetch_all_india_stations_pm10(
        state_filter=state,
        force_refresh=force
    )

    return jsonify({
        "status": "success",
        "count": len(india_data),
        "data": india_data
    })


@app.route('/api/locations', methods=['GET'])
def get_locations():

    return jsonify({
        "status": "success",
        "locations": get_all_ap_stations()
    })


@app.route('/api/weather', methods=['GET'])
def get_weather():

    force = request.args.get(
        'refresh',
        'false'
    ).lower() == 'true'

    weather = get_tirupati_weather(
        force_refresh=force
    )

    return jsonify({
        "status": "success",
        "data": weather
    })


@app.route('/api/past-24h-pm10', methods=['GET'])
def get_past_24h_pm10_endpoint():

    station_id = request.args.get(
        'station_id',
        'AP001'
    )

    data = get_past_24h_pm10_readings(
        station_id=station_id
    )

    return jsonify({
        "status": "success",
        "station_id": station_id,
        "count": len(data),
        "data": data
    })


@app.route('/api/historical-pm10', methods=['GET'])
def get_historical_pm10():

    past_24h = request.args.get(
        'past_24h',
        'false'
    ).lower() == 'true'

    mode = request.args.get(
        'mode',
        ''
    )

    if past_24h or mode == 'past24h':

        data = get_past_24h_pm10_readings()

        return jsonify({
            "status": "success",
            "total_records": len(data),
            "returned_records": len(data),
            "data": data
        })

    if not os.path.exists(CSV_PATH):

        return jsonify({
            "status": "error",
            "message": "Dataset CSV not found"
        }), 404

    start_date = request.args.get(
        'start_date'
    )

    end_date = request.args.get(
        'end_date'
    )

    limit = request.args.get(
        'limit',
        default=500,
        type=int
    )

    df_raw = pd.read_csv(CSV_PATH)

    df_raw['timestamp'] = pd.to_datetime(
        df_raw['From Date'],
        errors='coerce'
    )

    df_raw['PM10'] = pd.to_numeric(
        df_raw['PM10 (ug/m3)'],
        errors='coerce'
    )

    df_raw = (
        df_raw
        .dropna(subset=['timestamp'])
        .sort_values('timestamp')
        .reset_index(drop=True)
    )

    if start_date:
        df_raw = df_raw[
            df_raw['timestamp'] >= pd.to_datetime(start_date)
        ]

    if end_date:
        df_raw = df_raw[
            df_raw['timestamp'] <= pd.to_datetime(end_date)
        ]

    df_sample = (
        df_raw.iloc[-limit:]
        if len(df_raw) > limit
        else df_raw
    )

    records = []

    for _, row in df_sample.iterrows():

        val = (
            None
            if pd.isna(row['PM10'])
            else round(float(row['PM10']), 2)
        )

        cat, color = get_pm10_category(val)

        records.append({
            "timestamp": row['timestamp'].strftime(
                '%Y-%m-%d %H:%M:%S'
            ),
            "pm10": val,
            "category": cat,
            "category_color": color
        })

    return jsonify({
        "status": "success",
        "total_records": len(df_raw),
        "returned_records": len(records),
        "data": records
    })


@app.route('/api/data-quality', methods=['GET'])
def get_data_quality_endpoint():

    if not os.path.exists(CSV_PATH):

        return jsonify({
            "status": "error",
            "message": "Dataset CSV not found"
        }), 404

    df_raw = pd.read_csv(CSV_PATH)

    dq_summary = analyze_data_quality(
        df_raw
    )

    return jsonify({
        "status": "success",
        "data": dq_summary
    })


@app.route('/api/prediction', methods=['GET', 'POST'])
def api_prediction():

    station_id = request.args.get(
        'station_id',
        'AP001'
    )

    forecast_hours = request.args.get(
        'forecast_hours',
        1,
        type=int
    )

    if request.method == 'POST':

        req_json = request.get_json(
            silent=True
        ) or {}

        station_id = req_json.get(
            'station_id',
            station_id
        )

        current_val = float(
            req_json.get(
                'current_pm10',
                72.0
            )
        )

        input_dt = req_json.get(
            'datetime',
            None
        )

        lags = req_json.get(
            'lags',
            None
        )

        pred_type = req_json.get(
            'prediction_type',
            'SIMULATED'
        )

        forecast_hours = int(
            req_json.get(
                'forecast_hours',
                forecast_hours
            )
        )

    else:

        live_data = fetch_live_pm10(
            station_id=station_id
        )

        current_val = (
            live_data['pm10']
            if live_data
            else 72.0
        )

        input_dt = datetime.now()

        lags = None

        pred_type = 'LIVE'

    try:

        res = predict_next_hour_pm10(
            current_pm10=current_val,
            recent_pm10_lags=lags,
            input_datetime=input_dt,
            pred_type=pred_type,
            station_id=station_id,
            forecast_hours=forecast_hours
        )

        return jsonify({
            "status": "success",
            "data": res
        })

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/model-performance', methods=['GET'])
def get_model_performance():

    reg_info_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            'models/regression/model_info.json'
        )
    )

    cls_info_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            'models/classification/model_info.json'
        )
    )

    backtest_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            'models/regression/test_backtest.json'
        )
    )

    reg_data = {}

    if os.path.exists(reg_info_path):

        with open(reg_info_path, 'r') as f:
            reg_data = json.load(f)

    cls_data = {}

    if os.path.exists(cls_info_path):

        with open(cls_info_path, 'r') as f:
            cls_data = json.load(f)

    backtest_data = {}

    if os.path.exists(backtest_path):

        with open(backtest_path, 'r') as f:
            backtest_data = json.load(f)

    return jsonify({
        "status": "success",
        "regression": reg_data,
        "classification": cls_data,
        "backtest": backtest_data
    })


@app.route('/api/anomalies', methods=['GET'])
def get_anomalies_endpoint():

    anomaly_info_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            'models/anomaly/anomaly_info.json'
        )
    )

    detected_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            'models/anomaly/detected_anomalies.json'
        )
    )

    info = {}

    if os.path.exists(anomaly_info_path):

        with open(anomaly_info_path, 'r') as f:
            info = json.load(f)

    detected = []

    if os.path.exists(detected_path):

        with open(detected_path, 'r') as f:
            detected = json.load(f)

    return jsonify({
        "status": "success",
        "info": info,
        "detected_anomalies": detected
    })


@app.route('/api/prediction-history', methods=['GET'])
def get_prediction_history_api():

    limit = request.args.get(
        'limit',
        default=50,
        type=int
    )

    history = get_recent_predictions(
        limit=limit
    )

    return jsonify({
        "status": "success",
        "count": len(history),
        "data": history
    })


# ============================================================
# CSV EXPORT ENDPOINTS
# ============================================================

@app.route('/api/export/historical', methods=['GET'])
def export_historical():

    if not os.path.exists(CSV_PATH):

        return jsonify({
            "status": "error",
            "message": "Dataset not found"
        }), 404

    df_raw = pd.read_csv(
        CSV_PATH
    )

    output = io.StringIO()

    df_raw.to_csv(
        output,
        index=False
    )

    output.seek(0)

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-disposition":
            "attachment; filename=Tirupati_AP001_PM10_Historical_Data.csv"
        }
    )


@app.route('/api/export/predictions', methods=['GET'])
def export_predictions():

    history = get_recent_predictions(
        limit=500
    )

    output = io.StringIO()

    if history:

        fieldnames = list(
            history[0].keys()
        )

        writer = csv.DictWriter(
            output,
            fieldnames=fieldnames
        )

        writer.writeheader()

        for row in history:
            writer.writerow(row)

    output.seek(0)

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-disposition":
            "attachment; filename=AeroShield_Prediction_History.csv"
        }
    )


@app.route('/api/export/anomalies', methods=['GET'])
def export_anomalies():

    detected_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            'models/anomaly/detected_anomalies.json'
        )
    )

    detected = []

    if os.path.exists(detected_path):

        with open(detected_path, 'r') as f:
            detected = json.load(f)

    output = io.StringIO()

    if detected:

        writer = csv.DictWriter(
            output,
            fieldnames=list(
                detected[0].keys()
            )
        )

        writer.writeheader()

        for row in detected:
            writer.writerow(row)

    output.seek(0)

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-disposition":
            "attachment; filename=AeroShield_PM10_Anomalies.csv"
        }
    )


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == '__main__':

    port = int(
        os.environ.get(
            'PORT',
            5000
        )
    )

    print(
        f"Launching AeroShield PM10 Analysis Server "
        f"on http://127.0.0.1:{port}"
    )

    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    )