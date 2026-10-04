import pandas as pd
import numpy as np
import os

# Recognized PM10 Category Standards (CPCB / NAQI Standard for PM10)
# 0-50: Good, 51-100: Satisfactory, 101-250: Moderate, 251-350: Poor, 351-430: Very Poor, >430: Severe
CATEGORY_THRESHOLDS = [
    (0.0, 50.0, "Good", "#00E400"),
    (50.0, 100.0, "Satisfactory", "#9CFF00"),
    (100.0, 250.0, "Moderate", "#FFFF00"),
    (250.0, 350.0, "Poor", "#FF7E00"),
    (350.0, 430.0, "Very Poor", "#FF0000"),
    (430.0, float('inf'), "Severe", "#7E0023")
]

class StatisticalIsolationForest:
    """
    Robust Isolation Forest equivalent using Mahalanobis distance & rolling deviation z-scores.
    Evaluates how isolated/unusual a PM10 observation vector is relative to historical norms.
    """
    def __init__(self, contamination=0.03):
        self.contamination = contamination
        self.mean_ = None
        self.std_ = None
        self.threshold_ = None
        
    def fit(self, X):
        X_mat = np.array(X)
        self.mean_ = np.mean(X_mat, axis=0)
        self.std_ = np.std(X_mat, axis=0)
        self.std_[self.std_ == 0] = 1.0
        
        z_scores = np.abs((X_mat - self.mean_) / self.std_)
        scores = np.mean(z_scores, axis=1) + 0.5 * np.max(z_scores, axis=1)
        self.threshold_ = float(np.percentile(scores, 100 * (1 - self.contamination)))
        return self
        
    def decision_function(self, X):
        X_mat = np.array(X)
        z_scores = np.abs((X_mat - self.mean_) / self.std_)
        scores = np.mean(z_scores, axis=1) + 0.5 * np.max(z_scores, axis=1)
        return self.threshold_ - scores
        
    def predict(self, X):
        scores = self.decision_function(X)
        return np.where(scores < 0, -1, 1)

def get_pm10_category(val):
    if pd.isna(val) or val is None:
        return "Unknown", "#888888"
    val = float(val)
    if val < 0:
        return "Invalid", "#888888"
    for low, high, label, color in CATEGORY_THRESHOLDS:
        if low <= val <= high:
            return label, color
    return "Severe", "#7E0023"

def get_pm10_category_label(val):
    label, _ = get_pm10_category(val)
    return label

def load_raw_dataset(csv_path):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset file not found at: {csv_path}")
    df = pd.read_csv(csv_path)
    return df

def analyze_data_quality(df):
    total_records = len(df)
    df_temp = df.copy()
    if 'From Date' in df_temp.columns:
        df_temp['timestamp'] = pd.to_datetime(df_temp['From Date'], errors='coerce')
    else:
        df_temp['timestamp'] = pd.to_datetime(df_temp.iloc[:, 0], errors='coerce')
        
    df_temp['PM10'] = pd.to_numeric(df_temp['PM10 (ug/m3)'], errors='coerce')
    
    valid_records = int(df_temp['PM10'].notna().sum())
    missing_records = int(df_temp['PM10'].isna().sum())
    missing_percentage = round((missing_records / total_records) * 100, 2) if total_records > 0 else 0.0
    
    invalid_values = int((df_temp['PM10'] < 0).sum())
    duplicate_timestamps = int(df_temp['timestamp'].duplicated().sum())
    
    sorted_ts = df_temp['timestamp'].dropna().sort_values()
    start_date = str(sorted_ts.min()) if not sorted_ts.empty else "N/A"
    end_date = str(sorted_ts.max()) if not sorted_ts.empty else "N/A"
    
    df_temp['year_month'] = df_temp['timestamp'].dt.to_period('M').astype(str)
    monthly_missing = df_temp.groupby('year_month')['PM10'].apply(lambda x: x.isna().sum()).to_dict()
    monthly_total = df_temp.groupby('year_month')['PM10'].count().to_dict()
    
    missing_timeline = []
    for ym in sorted(monthly_missing.keys()):
        missing_cnt = monthly_missing[ym]
        tot_cnt = monthly_total.get(ym, 0) + missing_cnt
        pct = round((missing_cnt / tot_cnt) * 100, 2) if tot_cnt > 0 else 0.0
        missing_timeline.append({
            "month": ym,
            "missing_count": int(missing_cnt),
            "total_count": int(tot_cnt),
            "missing_percentage": pct
        })
    
    valid_pm10 = df_temp['PM10'].dropna()
    categories_cnt = {}
    for val in valid_pm10:
        cat = get_pm10_category_label(val)
        categories_cnt[cat] = categories_cnt.get(cat, 0) + 1

    return {
        "total_records": total_records,
        "valid_records": valid_records,
        "missing_records": missing_records,
        "missing_percentage": missing_percentage,
        "duplicate_records": duplicate_timestamps,
        "invalid_values": invalid_values,
        "start_date": start_date,
        "end_date": end_date,
        "missing_timeline": missing_timeline,
        "categories_distribution": categories_cnt,
        "summary_stats": {
            "mean": round(float(valid_pm10.mean()), 2) if not valid_pm10.empty else 0,
            "std": round(float(valid_pm10.std()), 2) if not valid_pm10.empty else 0,
            "min": round(float(valid_pm10.min()), 2) if not valid_pm10.empty else 0,
            "q25": round(float(valid_pm10.quantile(0.25)), 2) if not valid_pm10.empty else 0,
            "median": round(float(valid_pm10.median()), 2) if not valid_pm10.empty else 0,
            "q75": round(float(valid_pm10.quantile(0.75)), 2) if not valid_pm10.empty else 0,
            "max": round(float(valid_pm10.max()), 2) if not valid_pm10.empty else 0
        }
    }

def build_pm10_features(csv_path):
    df = pd.read_csv(csv_path)
    df['timestamp'] = pd.to_datetime(df['From Date'], errors='coerce')
    df['PM10'] = pd.to_numeric(df['PM10 (ug/m3)'], errors='coerce')
    df.loc[df['PM10'] < 0, 'PM10'] = np.nan
    
    df = df.sort_values('timestamp').reset_index(drop=True)
    df = df.drop_duplicates(subset=['timestamp']).reset_index(drop=True)
    
    pm10_series = df['PM10'].interpolate(method='linear').ffill().bfill()
    
    df['year'] = df['timestamp'].dt.year
    df['month'] = df['timestamp'].dt.month
    df['day'] = df['timestamp'].dt.day
    df['hour'] = df['timestamp'].dt.hour
    df['dayofweek'] = df['timestamp'].dt.dayofweek
    df['dayofyear'] = df['timestamp'].dt.dayofyear
    df['weekofyear'] = df['timestamp'].dt.isocalendar().week.astype(int)
    df['is_weekend'] = (df['dayofweek'] >= 5).astype(int)
    
    df['sin_hour'] = np.sin(2 * np.pi * df['hour'] / 24.0)
    df['cos_hour'] = np.cos(2 * np.pi * df['hour'] / 24.0)
    df['sin_month'] = np.sin(2 * np.pi * df['month'] / 12.0)
    df['cos_month'] = np.cos(2 * np.pi * df['month'] / 12.0)
    
    df['lag_1h'] = pm10_series.shift(1)
    df['lag_2h'] = pm10_series.shift(2)
    df['lag_3h'] = pm10_series.shift(3)
    df['lag_6h'] = pm10_series.shift(6)
    df['lag_12h'] = pm10_series.shift(12)
    df['lag_24h'] = pm10_series.shift(24)
    
    df['rolling_mean_3h'] = pm10_series.shift(1).rolling(window=3, min_periods=1).mean()
    df['rolling_std_3h'] = pm10_series.shift(1).rolling(window=3, min_periods=1).std().fillna(0)
    df['rolling_min_3h'] = pm10_series.shift(1).rolling(window=3, min_periods=1).min()
    df['rolling_max_3h'] = pm10_series.shift(1).rolling(window=3, min_periods=1).max()
    
    df['rolling_mean_24h'] = pm10_series.shift(1).rolling(window=24, min_periods=1).mean()
    df['rolling_std_24h'] = pm10_series.shift(1).rolling(window=24, min_periods=1).std().fillna(0)
    
    df['PM10_target'] = df['PM10'].shift(-1)
    df['Category_target'] = df['PM10_target'].apply(get_pm10_category_label)
    
    return df

FEATURE_COLUMNS = [
    'year', 'month', 'day', 'hour', 'dayofweek', 'dayofyear', 'weekofyear', 'is_weekend',
    'sin_hour', 'cos_hour', 'sin_month', 'cos_month',
    'lag_1h', 'lag_2h', 'lag_3h', 'lag_6h', 'lag_12h', 'lag_24h',
    'rolling_mean_3h', 'rolling_std_3h', 'rolling_min_3h', 'rolling_max_3h',
    'rolling_mean_24h', 'rolling_std_24h'
]
