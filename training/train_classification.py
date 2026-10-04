import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, balanced_accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from preprocessing.preprocess import build_pm10_features, FEATURE_COLUMNS, CATEGORY_THRESHOLDS

def train_and_eval_classification():
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/AP001_PM10_ONLY_DATASET.csv'))
    print("Loading and preprocessing dataset for PM10 Classification...")
    df = build_pm10_features(csv_path)
    
    valid_cats = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]
    clean_df = df[df['Category_target'].isin(valid_cats)].copy()
    clean_df = clean_df.dropna(subset=FEATURE_COLUMNS).copy().reset_index(drop=True)
    
    print(f"Total usable records for classification: {len(clean_df)}")
    
    split_idx = int(len(clean_df) * 0.8)
    train_df = clean_df.iloc[:split_idx]
    test_df = clean_df.iloc[split_idx:]
    
    X_train = train_df[FEATURE_COLUMNS]
    y_train_raw = train_df['Category_target']
    
    X_test = test_df[FEATURE_COLUMNS]
    y_test_raw = test_df['Category_target']
    
    label_encoder = LabelEncoder()
    label_encoder.fit(valid_cats)
    
    y_train = label_encoder.transform(y_train_raw)
    y_test = label_encoder.transform(y_test_raw)
    
    models = {
        "Logistic Regression": LogisticRegression(max_iter=300, random_state=42),
        "Decision Tree Classifier": DecisionTreeClassifier(max_depth=8, random_state=42),
        "XGBoost Classifier": XGBClassifier(n_estimators=40, max_depth=5, learning_rate=0.08, random_state=42, n_jobs=-1, eval_metric='mlogloss')
    }
        
    results = []
    best_model_name = None
    best_f1 = -1.0
    best_model_obj = None
    best_y_pred = None
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average='macro', zero_division=0))
        rec = float(recall_score(y_test, y_pred, average='macro', zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average='macro', zero_division=0))
        bal_acc = float(balanced_accuracy_score(y_test, y_pred))
        
        results.append({
            "model": name,
            "accuracy": round(acc * 100, 2),
            "precision": round(prec * 100, 2),
            "recall": round(rec * 100, 2),
            "f1_score": round(f1 * 100, 2),
            "macro_f1": round(f1 * 100, 2),
            "balanced_accuracy": round(bal_acc * 100, 2)
        })
        
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_model_obj = model
            best_y_pred = y_pred

    results = sorted(results, key=lambda x: x['macro_f1'], reverse=True)
    for i, res in enumerate(results):
        res['rank'] = i + 1

    print(f"Best Classification Model: {best_model_name} (Macro F1: {best_f1 * 100:.2f}%)")
    
    cm = confusion_matrix(y_test, best_y_pred, labels=range(len(valid_cats)))
    
    save_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/classification'))
    os.makedirs(save_dir, exist_ok=True)
    
    joblib.dump(best_model_obj, os.path.join(save_dir, 'best_classification_model.pkl'))
    joblib.dump(label_encoder, os.path.join(save_dir, 'label_encoder.pkl'))
    
    meta_info = {
        "best_model_name": best_model_name,
        "primary_metric": "Macro F1",
        "best_macro_f1": round(best_f1 * 100, 2),
        "comparison": results,
        "classes": valid_cats,
        "confusion_matrix": cm.tolist(),
        "trained_date": pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S'),
        "train_samples": len(X_train),
        "test_samples": len(X_test)
    }
    
    with open(os.path.join(save_dir, 'model_info.json'), 'w') as f:
        json.dump(meta_info, f, indent=4)

    print("Classification model trained successfully!")

if __name__ == '__main__':
    train_and_eval_classification()
