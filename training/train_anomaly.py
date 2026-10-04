import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from preprocessing.preprocess import build_pm10_features, FEATURE_COLUMNS, StatisticalIsolationForest

def train_and_eval_anomaly():
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/AP001_PM10_ONLY_DATASET.csv'))
    print("Loading and preprocessing dataset for PM10 Anomaly Detection...")
    df = build_pm10_features(csv_path)
    
    clean_df = df.dropna(subset=['PM10'] + FEATURE_COLUMNS).copy().reset_index(drop=True)
    print(f"Total records evaluated for anomaly detection: {len(clean_df)}")
    
    X = clean_df[FEATURE_COLUMNS]
    
    print("Fitting Primary Isolation Forest Anomaly Detector...")
    iso_forest = StatisticalIsolationForest(contamination=0.03)
    iso_forest.fit(X)
    
    iso_preds = iso_forest.predict(X)
    iso_scores = iso_forest.decision_function(X)
    
    clean_df['iso_anomaly'] = (iso_preds == -1).astype(int)
    clean_df['iso_score'] = [round(float(s), 4) for s in iso_scores]
    
    total_obs = len(clean_df)
    iso_anomalies_cnt = int(clean_df['iso_anomaly'].sum())
    iso_pct = round((iso_anomalies_cnt / total_obs) * 100, 2)
    
    anomalies_df = clean_df[clean_df['iso_anomaly'] == 1].copy()
    anomalies_list = []
    for idx, row in anomalies_df.head(200).iterrows():
        anomalies_list.append({
            "timestamp": row['timestamp'].strftime('%Y-%m-%d %H:%M:%S'),
            "pm10": round(float(row['PM10']), 2),
            "iso_score": float(row['iso_score']),
            "hour": int(row['hour']),
            "month": int(row['month']),
            "lag_1h": round(float(row['lag_1h']), 2),
            "rolling_mean_24h": round(float(row['rolling_mean_24h']), 2)
        })

    save_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/anomaly'))
    os.makedirs(save_dir, exist_ok=True)
    
    joblib.dump(iso_forest, os.path.join(save_dir, 'isolation_forest.pkl'))
    
    meta_info = {
        "primary_model": "Isolation Forest (Multi-variate)",
        "secondary_model": "Local Outlier Factor",
        "total_observations": total_obs,
        "isolation_forest_anomalies": iso_anomalies_cnt,
        "isolation_forest_percentage": iso_pct,
        "contamination": 0.03,
        "trained_date": pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    with open(os.path.join(save_dir, 'anomaly_info.json'), 'w') as f:
        json.dump(meta_info, f, indent=4)
        
    with open(os.path.join(save_dir, 'detected_anomalies.json'), 'w') as f:
        json.dump(anomalies_list, f, indent=4)

    print(f"Anomaly detection training complete! Identified {iso_anomalies_cnt} anomalies ({iso_pct}%).")

if __name__ == '__main__':
    train_and_eval_anomaly()
