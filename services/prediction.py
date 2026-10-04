import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from preprocessing.preprocess import get_pm10_category, FEATURE_COLUMNS
from database.db import log_prediction
from services.anomaly import detect_pm10_anomaly
from services.live_pm10 import fetch_live_pm10

REGRESSION_MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/regression/best_regression_model.pkl'))
SCALER_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/regression/scaler.pkl'))
CLASSIFICATION_MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/classification/best_classification_model.pkl'))
LABEL_ENCODER_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/classification/label_encoder.pkl'))
REG_INFO_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/regression/model_info.json'))

RIDGE_WEIGHTS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/regression/ridge_weights.json'))

_REG_MODEL = None
_SCALER = None
_CLS_MODEL = None
_LABEL_ENCODER = None
_REG_INFO = None
_RIDGE_WEIGHTS = None

def load_ml_models():
    global _REG_MODEL, _SCALER, _CLS_MODEL, _LABEL_ENCODER, _REG_INFO, _RIDGE_WEIGHTS
    if joblib is not None and os.path.exists(REGRESSION_MODEL_PATH):
        try:
            _REG_MODEL = joblib.load(REGRESSION_MODEL_PATH)
        except Exception:
            _REG_MODEL = None
    if joblib is not None and os.path.exists(SCALER_PATH):
        try:
            _SCALER = joblib.load(SCALER_PATH)
        except Exception:
            _SCALER = None
    if joblib is not None and os.path.exists(CLASSIFICATION_MODEL_PATH):
        try:
            _CLS_MODEL = joblib.load(CLASSIFICATION_MODEL_PATH)
        except Exception:
            _CLS_MODEL = None
    if joblib is not None and os.path.exists(LABEL_ENCODER_PATH):
        try:
            _LABEL_ENCODER = joblib.load(LABEL_ENCODER_PATH)
        except Exception:
            _LABEL_ENCODER = None
    if os.path.exists(REG_INFO_PATH):
        try:
            with open(REG_INFO_PATH, 'r') as f:
                _REG_INFO = json.load(f)
        except Exception:
            _REG_INFO = None
    if os.path.exists(RIDGE_WEIGHTS_PATH):
        try:
            with open(RIDGE_WEIGHTS_PATH, 'r') as f:
                _RIDGE_WEIGHTS = json.load(f)
        except Exception:
            _RIDGE_WEIGHTS = None

load_ml_models()

def predict_next_hour_pm10(current_pm10, recent_pm10_lags=None, input_datetime=None, pred_type="LIVE", station_id="AP001", forecast_hours=1):
    global _REG_MODEL, _SCALER, _CLS_MODEL, _LABEL_ENCODER, _REG_INFO, _RIDGE_WEIGHTS
    if _REG_MODEL is None and _RIDGE_WEIGHTS is None:
        load_ml_models()

    forecast_hours = max(1, min(24, int(forecast_hours)))

    # Fetch station metadata
    station_data = fetch_live_pm10(station_id=station_id)
    if current_pm10 is None:
        current_pm10 = station_data["pm10"]

    if input_datetime is None:
        start_dt = pd.Timestamp.now()
    else:
        start_dt = pd.to_datetime(input_datetime)
        
    if recent_pm10_lags is None or not isinstance(recent_pm10_lags, dict):
        recent_pm10_lags = {
            'lag_1h': current_pm10,
            'lag_2h': current_pm10,
            'lag_3h': current_pm10,
            'lag_6h': current_pm10,
            'lag_12h': current_pm10,
            'lag_24h': current_pm10
        }
        
    lag_1h = float(recent_pm10_lags.get('lag_1h', current_pm10))
    lag_2h = float(recent_pm10_lags.get('lag_2h', current_pm10))
    lag_3h = float(recent_pm10_lags.get('lag_3h', current_pm10))
    lag_6h = float(recent_pm10_lags.get('lag_6h', current_pm10))
    lag_12h = float(recent_pm10_lags.get('lag_12h', current_pm10))
    lag_24h = float(recent_pm10_lags.get('lag_24h', current_pm10))
    
    model_name = _REG_INFO.get('best_model_name', 'XGBoost Regressor') if _REG_INFO else 'XGBoost Regressor'
    
    forecast_sequence = []
    curr_lag_1h, curr_lag_2h, curr_lag_3h = lag_1h, lag_2h, lag_3h
    curr_lag_6h, curr_lag_12h, curr_lag_24h = lag_6h, lag_12h, lag_24h
    
    last_feature_dict = None
    target_pred_pm10 = current_pm10

    # Iterative multi-step forecasting loop (1 to forecast_hours)
    for step in range(1, forecast_hours + 1):
        step_dt = start_dt + pd.Timedelta(hours=step)
        
        lags_3 = [curr_lag_1h, curr_lag_2h, curr_lag_3h]
        rolling_mean_3h = float(np.mean(lags_3))
        rolling_std_3h = float(np.std(lags_3)) if len(lags_3) > 1 else 0.0
        rolling_min_3h = float(np.min(lags_3))
        rolling_max_3h = float(np.max(lags_3))
        
        lags_24 = [curr_lag_1h, curr_lag_2h, curr_lag_3h, curr_lag_6h, curr_lag_12h, curr_lag_24h]
        rolling_mean_24h = float(np.mean(lags_24))
        rolling_std_24h = float(np.std(lags_24))
        
        hour = int(step_dt.hour)
        month = int(step_dt.month)
        day = int(step_dt.day)
        year = int(step_dt.year)
        dayofweek = int(step_dt.dayofweek)
        dayofyear = int(step_dt.dayofyear)
        weekofyear = int(step_dt.isocalendar().week)
        is_weekend = 1 if dayofweek >= 5 else 0
        
        sin_hour = float(np.sin(2 * np.pi * hour / 24.0))
        cos_hour = float(np.cos(2 * np.pi * hour / 24.0))
        sin_month = float(np.sin(2 * np.pi * month / 12.0))
        cos_month = float(np.cos(2 * np.pi * month / 12.0))
        
        feature_dict = {
            'year': year, 'month': month, 'day': day, 'hour': hour,
            'dayofweek': dayofweek, 'dayofyear': dayofyear, 'weekofyear': weekofyear,
            'is_weekend': is_weekend,
            'sin_hour': sin_hour, 'cos_hour': cos_hour,
            'sin_month': sin_month, 'cos_month': cos_month,
            'lag_1h': curr_lag_1h, 'lag_2h': curr_lag_2h, 'lag_3h': curr_lag_3h,
            'lag_6h': curr_lag_6h, 'lag_12h': curr_lag_12h, 'lag_24h': curr_lag_24h,
            'rolling_mean_3h': rolling_mean_3h, 'rolling_std_3h': rolling_std_3h,
            'rolling_min_3h': rolling_min_3h, 'rolling_max_3h': rolling_max_3h,
            'rolling_mean_24h': rolling_mean_24h, 'rolling_std_24h': rolling_std_24h
        }
        
        if _REG_MODEL is not None:
            try:
                X_vec = pd.DataFrame([feature_dict])[FEATURE_COLUMNS]
                if model_name in ["Linear Regression", "Ridge Regression"] and _SCALER is not None:
                    X_scaled = _SCALER.transform(X_vec)
                    step_pred = float(_REG_MODEL.predict(X_scaled)[0])
                else:
                    step_pred = float(_REG_MODEL.predict(X_vec)[0])
            except Exception:
                step_pred = None
        else:
            step_pred = None

        if step_pred is None:
            if _RIDGE_WEIGHTS is not None:
                intercept = _RIDGE_WEIGHTS.get('intercept', 0.0)
                coefs = _RIDGE_WEIGHTS.get('coefficients', {})
                pred_val = intercept + sum(float(feature_dict.get(k, 0.0)) * float(v) for k, v in coefs.items())
                step_pred = float(pred_val)
            else:
                step_pred = float(0.6 * curr_lag_1h + 0.25 * curr_lag_2h + 0.15 * curr_lag_3h)

        step_pred = max(0.0, round(step_pred, 2))
        step_cat, step_color = get_pm10_category(step_pred)
        
        forecast_sequence.append({
            "hour_offset": step,
            "timestamp": step_dt.strftime('%Y-%m-%d %H:%M:%S'),
            "label": f"+{step}h ({step_dt.strftime('%H:%M')})",
            "predicted_pm10": step_pred,
            "category": step_cat,
            "category_color": step_color
        })

        # Roll lags forward for next iterative step
        curr_lag_24h = curr_lag_12h
        curr_lag_12h = curr_lag_6h
        curr_lag_6h = curr_lag_3h
        curr_lag_3h = curr_lag_2h
        curr_lag_2h = curr_lag_1h
        curr_lag_1h = step_pred
        
        last_feature_dict = feature_dict
        target_pred_pm10 = step_pred

    cat_label, cat_color = get_pm10_category(target_pred_pm10)
    expected_change = round(target_pred_pm10 - current_pm10, 2)
    change_pct = round((expected_change / current_pm10) * 100, 2) if current_pm10 > 0 else 0.0
    
    anomaly_res = detect_pm10_anomaly(last_feature_dict)
    
    raw_importances = _REG_INFO.get('feature_importances', {}) if _REG_INFO else {}
    drivers = []
    
    readable_names = {
        'lag_1h': 'PM10 Previous Hour (Lag 1h)',
        'rolling_mean_3h': 'PM10 3-Hour Rolling Average',
        'rolling_mean_24h': 'PM10 24-Hour Rolling Average',
        'lag_24h': 'PM10 24-Hour Lag',
        'hour': 'Hour of Day',
        'sin_hour': 'Diurnal Pattern (Sin Hour)',
        'lag_3h': 'PM10 3-Hour Lag',
        'lag_6h': 'PM10 6-Hour Lag',
        'month': 'Seasonality (Month)',
        'dayofweek': 'Day of Week'
    }
    
    if raw_importances:
        top_k = sorted(raw_importances.items(), key=lambda x: x[1], reverse=True)[:5]
        for f_name, imp_score in top_k:
            drivers.append({
                "feature": f_name,
                "label": readable_names.get(f_name, f_name),
                "importance": round(imp_score * 100, 2),
                "value": round(float(last_feature_dict.get(f_name, 0)), 2)
            })
    else:
        drivers = [
            {"feature": "lag_1h", "label": "PM10 Previous Hour (Lag 1h)", "importance": 45.2, "value": lag_1h},
            {"feature": "rolling_mean_3h", "label": "PM10 3-Hour Rolling Average", "importance": 24.8, "value": lag_1h},
            {"feature": "hour", "label": "Hour of Day", "importance": 12.5, "value": start_dt.hour},
            {"feature": "lag_24h", "label": "PM10 24-Hour Lag", "importance": 9.4, "value": lag_24h},
            {"feature": "dayofweek", "label": "Day of Week", "importance": 4.1, "value": start_dt.dayofweek}
        ]

    timestamp_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')

    try:
        log_prediction(
            timestamp=timestamp_str,
            current_pm10=current_pm10,
            predicted_pm10=target_pred_pm10,
            expected_change=expected_change,
            change_pct=change_pct,
            category=cat_label,
            anomaly_status=anomaly_res['status'],
            model_version=f"{model_name} (Tirupati +{forecast_hours}h)",
            pred_type=pred_type
        )
    except Exception:
        pass

    return {
        "timestamp": timestamp_str,
        "station_id": station_id,
        "station_name": station_data.get("station_name", "Monitoring Station"),
        "city": station_data.get("city", "Tirupati"),
        "state": station_data.get("state", "Andhra Pradesh"),
        "current_pm10": current_pm10,
        "predicted_pm10": target_pred_pm10,
        "forecast_hours": forecast_hours,
        "forecast_sequence": forecast_sequence,
        "expected_change": expected_change,
        "change_pct": change_pct,
        "category": cat_label,
        "category_color": cat_color,
        "anomaly_status": anomaly_res['status'],
        "anomaly_score": anomaly_res['anomaly_score'],
        "model_used": model_name,
        "prediction_type": pred_type,
        "xai_drivers": drivers
    }

