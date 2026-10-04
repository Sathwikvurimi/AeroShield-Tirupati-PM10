import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from preprocessing.preprocess import FEATURE_COLUMNS
from database.db import log_anomaly

ISO_MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/anomaly/isolation_forest.pkl'))
LOF_MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/anomaly/lof_model.pkl'))
ANOMALY_INFO_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/anomaly/anomaly_info.json'))

_ISO_MODEL = None
_LOF_MODEL = None
_ANOMALY_INFO = None

def load_anomaly_models():
    global _ISO_MODEL, _LOF_MODEL, _ANOMALY_INFO
    if os.path.exists(ISO_MODEL_PATH):
        _ISO_MODEL = joblib.load(ISO_MODEL_PATH)
    if os.path.exists(LOF_MODEL_PATH):
        _LOF_MODEL = joblib.load(LOF_MODEL_PATH)
    if os.path.exists(ANOMALY_INFO_PATH):
        with open(ANOMALY_INFO_PATH, 'r') as f:
            _ANOMALY_INFO = json.load(f)

load_anomaly_models()

def detect_pm10_anomaly(feature_dict):
    """
    Evaluates whether the given PM10 observation vector is an anomaly using Isolation Forest.
    """
    global _ISO_MODEL, _LOF_MODEL, _ANOMALY_INFO
    if _ISO_MODEL is None:
        load_anomaly_models()
        
    if _ISO_MODEL is None:
        return {
            "status": "NORMAL",
            "is_anomaly": False,
            "anomaly_score": 0.0,
            "model_used": "IsolationForest (Default)",
            "message": "Model not trained yet."
        }
        
    X_vec = pd.DataFrame([feature_dict])[FEATURE_COLUMNS]
    pred = _ISO_MODEL.predict(X_vec)[0]
    score = _ISO_MODEL.decision_function(X_vec)[0]
    
    is_anomaly = bool(pred == -1)
    status_label = "ANOMALY DETECTED" if is_anomaly else "NORMAL"
    
    pm10_val = feature_dict.get('lag_1h', feature_dict.get('PM10', 0.0))
    ts = feature_dict.get('timestamp', pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    if is_anomaly:
        try:
            log_anomaly(
                timestamp=str(ts),
                pm10_val=float(pm10_val),
                score=round(float(score), 4),
                status=status_label,
                model_used="IsolationForest",
                note="High variance or unusual temporal pattern"
            )
        except Exception:
            pass

    return {
        "status": status_label,
        "is_anomaly": is_anomaly,
        "anomaly_score": round(float(score), 4),
        "confidence": round(float(abs(score)) * 100, 2),
        "model_used": "Isolation Forest",
        "disclaimer": "An anomaly does NOT automatically mean the measurement is wrong. It may represent extreme pollution events, localized weather, sensor maintenance, or data quality issues."
    }
