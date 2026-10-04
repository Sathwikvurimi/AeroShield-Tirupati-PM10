# AEROSHIELD: PM10 AIR ANALYSIS & ML FORECASTING PLATFORM

AeroShield is a college-level, full-stack Machine Learning web application dedicated exclusively to **PM10 (Particulate Matter 10 micrometers)** analysis, live monitoring, next-hour regression forecasting, pollution category classification, and anomaly detection.

---

## 📌 Project Aim & Problem Statement

### **Problem Statement**
> "Real-world PM10 monitoring datasets contain missing observations and significant temporal variation, making PM10 analysis and forecasting challenging. A focused machine-learning framework is required to analyze historical PM10 behavior, forecast future PM10 concentration, classify pollution severity, and identify unusual PM10 observations. Therefore, this project develops a PM10-focused web-based analytical system that combines historical PM10 analysis, live PM10 monitoring, machine-learning prediction, pollution classification, and anomaly detection."

### **Project Aim**
> "To develop a web-based PM10 air-analysis system that integrates live PM10 monitoring with machine-learning-based forecasting, pollution classification, and anomaly detection using historical PM10 time-series data."

---

## 🛠️ Technology Stack

- **Backend Framework**: Python 3.13 / Flask REST API
- **Machine Learning**: `scikit-learn`, `XGBoost`, `pandas`, `NumPy`, `joblib`
- **Database**: SQLite (`database/aeroshield.db`)
- **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphism Design System), JavaScript (ES6+)
- **Visualizations**: `Chart.js`, `Leaflet.js` GIS Map
- **Live Data**: OpenAQ REST Telemetry API (Station AP001)

---

## 🚀 Key Features

1. **Live PM10 Monitoring Stream**: Real-time station telemetry with Leaflet GIS map, 1h/6h/12h/24h/7d range options, staleness detection, and fallback handling.
2. **Next-Hour Regression Forecasting**: Predicts future PM10 using chronological time-series validation with candidate model evaluation (XGBoost Regressor best model RMSE: 14.55).
3. **Pollution Category Classification**: Predicts CPCB official pollution category (Good, Satisfactory, Moderate, Poor, Very Poor, Severe).
4. **Explainable AI (XAI)**: Displays top prediction drivers (lag_1h, rolling 3h/24h averages, diurnal hour cycle).
5. **Isolation Forest Anomaly Detection**: Identifies unusual PM10 observations relative to historical behavior.
6. **Data Quality Audit**: Displays missing records %, valid counts, duplicate timestamps, missing timeline chart, and academic missing-data rules.
7. **Model Leaderboards & Confusion Matrix**: Model comparison tables and interactive confusion matrix with Type I (False Positive) and Type II (False Negative) error analysis.
8. **Prediction History Logs & CSV Export**: Recorded SQLite prediction history, filtering, and instant CSV downloads.
9. **Dark & Light Mode Toggle**: Persisted theme preferences with smooth HSL CSS variables.

---

## 📂 Project Folder Structure

```
AeroShield/
├── app.py                      # Flask Backend & REST API Server
├── requirements.txt            # Python Dependencies
├── .env.example                # Environment Variable Template
├── README.md                   # Project Documentation
│
├── data/
│   └── AP001_PM10_ONLY_DATASET.csv  # Historical Dataset
│
├── models/                     # Saved Trained ML Models & Metadata
│   ├── regression/             # best_regression_model.pkl, scaler.pkl, model_info.json
│   ├── classification/         # best_classification_model.pkl, label_encoder.pkl
│   └── anomaly/                # isolation_forest.pkl, detected_anomalies.json
│
├── training/                   # Machine Learning Model Training Scripts
│   ├── train_regression.py
│   ├── train_classification.py
│   └── train_anomaly.py
│
├── preprocessing/
│   └── preprocess.py           # Feature Engineering & Cleaning (PM10 ONLY)
│
├── services/                   # Business Logic & Telemetry Services
│   ├── live_pm10.py            # Live OpenAQ Telemetry Fetcher
│   ├── prediction.py          # Forecast & XAI Pipeline
│   └── anomaly.py             # Outlier Evaluator
│
├── templates/                  # Jinja2 HTML5 Page Templates
│   ├── base.html
│   ├── dashboard.html
│   ├── live.html
│   ├── prediction.html
│   ├── historical.html
│   ├── data_quality.html
│   ├── models.html
│   ├── anomalies.html
│   ├── history.html
│   └── about.html
│
├── static/                     # Assets (CSS, JS, Images)
│   ├── css/style.css
│   └── js/ (main.js, dashboard.js, live.js, prediction.js, etc.)
│
└── database/
    └── db.py                   # SQLite Schema & Logging Interface
```

---

## 💻 Installation & Quickstart (Windows VS Code)

### 1. Create Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\activate
```

### 2. Install Requirements
```powershell
pip install -r requirements.txt
```

### 3. Train Machine Learning Models
```powershell
python training/train_regression.py
python training/train_classification.py
python training/train_anomaly.py
```

### 4. Launch AeroShield Web Server
```powershell
python app.py
```

### 5. Open Web Browser
Navigate to: **`http://127.0.0.1:5000`**

---

## 🌐 Deploying to Vercel (Production)

The repository includes a ready-to-use [`vercel.json`](file:///c:/Users/Hp/Documents/ML%20PROJECT/vercel.json) configuration for instant Vercel Serverless Python deployment.

### Method 1: Using Vercel CLI (Recommended)
1. Install Vercel CLI:
   ```powershell
   npm install -g vercel
   ```
2. Deploy to Vercel:
   ```powershell
   vercel
   ```
3. For production domain:
   ```powershell
   vercel --prod
   ```

### Method 2: Deploying via GitHub & Vercel Dashboard
1. Initialize Git & push code to GitHub:
   ```powershell
   git init
   git add .
   git commit -m "Deploy AeroShield PM10 to Vercel"
   git branch -M main
   git remote add origin https://github.com/yourusername/aeroshield.git
   git push -u origin main
   ```
2. Log into [Vercel Dashboard](https://vercel.com/new).
3. Click **"Add New" -> "Project"**, select your GitHub repository.
4. Click **Deploy**. Vercel will read `vercel.json` and deploy your live PM10 app globally!

---

## 📊 Official CPCB PM10 Air Quality Index Standards

| Category | PM10 Range (µg/m³) | Color | Health Impact |
|---|---|---|---|
| **Good** | 0 – 50 | Green | Minimal impact |
| **Satisfactory** | 51 – 100 | Lime | Minor breathing discomfort to sensitive people |
| **Moderate** | 101 – 250 | Yellow | Breathing discomfort to people with lung/heart disease |
| **Poor** | 251 – 350 | Orange | Breathing discomfort to most people on prolonged exposure |
| **Very Poor** | 351 – 430 | Red | Respiratory illness on prolonged exposure |
| **Severe** | > 430 | Maroon | Severe health impact on healthy & diseased individuals |

---

## 🔮 Limitations & Future Scope

- **IoT Sensor Integration**: ESP32 / Arduino PM10 optical dust sensors.
- **Deep Learning**: LSTM & Temporal Fusion Transformers (TFT) for multi-step forecasting.
- **Database Scaling**: Upgrading SQLite to PostgreSQL for high-concurrency station networks.
- **Multi-City Network**: Spatial interpolation across regional monitoring stations.

---

## ⚠️ Academic Disclaimer

> *Predicted values are model estimates and should not be treated as direct physical measurements. Current PM10 values are obtained from live station telemetry streams.*
