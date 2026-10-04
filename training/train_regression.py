import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.tree import DecisionTreeRegressor
from xgboost import XGBRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from preprocessing.preprocess import build_pm10_features, FEATURE_COLUMNS

def calculate_mape(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    non_zero = y_true > 1e-5
    if not np.any(non_zero):
        return 0.0
    return float(np.mean(np.abs((y_true[non_zero] - y_pred[non_zero]) / y_true[non_zero])) * 100)

def train_and_eval_regression():
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/AP001_PM10_ONLY_DATASET.csv'))
    print("Loading and preprocessing dataset for PM10 Regression...")
    df = build_pm10_features(csv_path)
    
    clean_df = df.dropna(subset=FEATURE_COLUMNS + ['PM10_target']).copy().reset_index(drop=True)
    print(f"Total usable records for regression: {len(clean_df)}")
    
    # Chronological Split (80% Train, 20% Test)
    split_idx = int(len(clean_df) * 0.8)
    train_df = clean_df.iloc[:split_idx]
    test_df = clean_df.iloc[split_idx:]
    
    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df['PM10_target']
    
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df['PM10_target']
    test_timestamps = test_df['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S').tolist()
    
    # Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Candidate regression models
    models = {
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(alpha=1.0),
        "Decision Tree Regressor": DecisionTreeRegressor(max_depth=8, random_state=42),
        "XGBoost Regressor": XGBRegressor(n_estimators=50, max_depth=6, learning_rate=0.08, random_state=42, n_jobs=-1)
    }
        
    results = []
    best_model_name = None
    best_rmse = float('inf')
    best_model_obj = None
    best_y_pred = None
    
    for name, model in models.items():
        print(f"Training {name}...")
        if name in ["Linear Regression", "Ridge Regression"]:
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            
        y_pred = np.clip(y_pred, 0, None)
        
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(root_mean_squared_error(y_test, y_pred))
        r2 = float(r2_score(y_test, y_pred))
        mape = float(calculate_mape(y_test, y_pred))
        
        results.append({
            "model": name,
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "r2": round(r2, 4),
            "mape": round(mape, 2)
        })
        
        if rmse < best_rmse:
            best_rmse = rmse
            best_model_name = name
            best_model_obj = model
            best_y_pred = y_pred

    results = sorted(results, key=lambda x: x['rmse'])
    for i, res in enumerate(results):
        res['rank'] = i + 1
        
    print(f"\nBest Regression Model: {best_model_name} (RMSE: {best_rmse:.3f}, R2: {results[0]['r2']})")
    
    save_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/regression'))
    os.makedirs(save_dir, exist_ok=True)
    
    joblib.dump(best_model_obj, os.path.join(save_dir, 'best_regression_model.pkl'))
    joblib.dump(scaler, os.path.join(save_dir, 'scaler.pkl'))
    
    feature_importances = {}
    if hasattr(best_model_obj, 'feature_importances_'):
        importances = best_model_obj.feature_importances_
        for col, imp in sorted(zip(FEATURE_COLUMNS, importances), key=lambda x: x[1], reverse=True):
            feature_importances[col] = round(float(imp), 4)
    elif hasattr(best_model_obj, 'coef_'):
        coefs = np.abs(best_model_obj.coef_)
        total = np.sum(coefs) if np.sum(coefs) > 0 else 1.0
        for col, imp in sorted(zip(FEATURE_COLUMNS, coefs / total), key=lambda x: x[1], reverse=True):
            feature_importances[col] = round(float(imp), 4)

    meta_info = {
        "best_model_name": best_model_name,
        "primary_metric": "RMSE",
        "best_rmse": round(best_rmse, 3),
        "comparison": results,
        "feature_importances": feature_importances,
        "feature_columns": FEATURE_COLUMNS,
        "trained_date": pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S'),
        "train_samples": len(X_train),
        "test_samples": len(X_test)
    }
    
    with open(os.path.join(save_dir, 'model_info.json'), 'w') as f:
        json.dump(meta_info, f, indent=4)
        
    val_data = {
        "timestamps": test_timestamps[-200:],
        "actual": [round(float(v), 2) for v in y_test.iloc[-200:].tolist()],
        "predicted": [round(float(v), 2) for v in best_y_pred[-200:]]
    }
    with open(os.path.join(save_dir, 'test_backtest.json'), 'w') as f:
        json.dump(val_data, f, indent=4)

    print("Regression model training complete!")

if __name__ == '__main__':
    train_and_eval_regression()
