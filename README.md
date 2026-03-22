# 🏥 MediScan AI — TB Chest X-ray Detector

> An AI-powered tuberculosis detection system using deep learning on chest radiographs, served via a FastAPI backend and a React medical-grade interface.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15-FF6F00?style=flat&logo=tensorflow&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.3-646CFF?style=flat&logo=vite&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [API Reference](#-api-reference)
- [Model Details](#-model-details)
- [Disclaimer](#%EF%B8%8F-disclaimer)

---

## 🔍 Overview

MediScan AI is a full-stack medical imaging application that classifies chest X-rays as **Normal** or **Tuberculosis** using a VGG16 transfer learning model trained on the [TB Chest Radiography Database](https://www.kaggle.com/datasets/tawsifurrahman/tuberculosis-tb-chest-xray-dataset).

The system consists of:
- A **FastAPI** Python backend that loads the trained Keras model and serves predictions via a REST API
- A **React + Vite** frontend with a hospital-grade UI, animated canvas background, and real-time results

---

## ✨ Features

- 🩻 Drag & drop chest X-ray upload (PNG, JPG, JPEG)
- ⚡ Real-time prediction via FastAPI REST endpoint
- 📊 Probability bars for both Normal and TB classes with animated results
- 🎨 Animated medical background — particle network, ECG heartbeat lines, floating medical crosses
- 🏥 Hospital-grade UI built with React and Plus Jakarta Sans typography
- ⚙️ Configurable API endpoint directly from the UI
- ⚠️ Clinical disclaimer shown on every result

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Model | TensorFlow / Keras — VGG16 Transfer Learning |
| Backend | FastAPI · Uvicorn · Pillow · NumPy |
| Frontend | React 18 · Vite · CSS-in-JS |
| Fonts | Plus Jakarta Sans (Google Fonts) |

---

## 📁 Project Structure

```
Deep_Learning_Project/
│
├── main.py                  # FastAPI app — /predict endpoint
├── requirements.txt         # Python dependencies
├── model.h5                 # Trained model weights (not committed — see note)
│
├── static/
│   └── index.html           # Plain HTML fallback frontend
│
├── src/
│   ├── main.jsx             # React entry point
│   └── TBDetector.jsx       # Main React component
│
├── index.html               # Vite HTML shell
├── package.json             # Node dependencies
└── vite.config.js           # Vite config with API proxy
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Your trained `model.h5` file

---

### Backend Setup

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/tb-detector.git
cd tb-detector
```

**2. Create and activate a virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

**3. Install Python dependencies**
```bash
pip install -r requirements.txt
```

**4. Add your model file**

Place your trained model in the project root:
```
model.h5   ← put it here
```

> ⚠️ The model file is not included in this repository due to GitHub's 100 MB file size limit.
> Download it from the shared Google Drive link, or retrain it using the training notebook.

**5. Start the API server**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

| URL | Description |
|---|---|
| `http://localhost:8000` | Serves the static HTML frontend |
| `http://localhost:8000/docs` | Interactive Swagger API docs |
| `http://localhost:8000/health` | Server + model status |

---

### Frontend Setup

**1. Install Node dependencies**
```bash
npm install
```

**2. Start the development server**
```bash
npm run dev
```

The app opens at `http://localhost:5173`.

> The Vite proxy in `vite.config.js` automatically forwards `/predict` calls to `http://localhost:8000` — no CORS issues in development.

**3. Build for production**
```bash
npm run build
# Output goes to /dist — can be served by FastAPI or any static host
```

---

## 📡 API Reference

### `POST /predict`

Accepts a chest X-ray image and returns a classification result.

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | Image file | PNG, JPG, or JPEG chest radiograph |

**Response** — `application/json`

```json
{
  "prediction": "Normal",
  "confidence": 93.4,
  "probabilities": {
    "Normal": 93.4,
    "Tuberculosis": 6.6
  }
}
```

**cURL example**
```bash
curl -X POST http://localhost:8000/predict \
     -F "file=@chest_xray.jpg"
```

**Python example**
```python
import requests

with open("chest_xray.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8000/predict",
        files={"file": f}
    )

print(response.json())
```

---

### `GET /health`

Returns the current server and model status.

```json
{
  "status": "ok",
  "model_loaded": true
}
```

---

## 🧠 Model Details

| Property | Value |
|---|---|
| Architecture | VGG16 + Dense layers |
| Input shape | 224 × 224 × 3 (RGB) |
| Output activation | Sigmoid (binary) |
| Classes | `0` — Normal · `1` — Tuberculosis |
| Decision threshold | 0.50 |
| Training images | 4,200 chest radiographs |
| Normal cases | 3,500 (83.3%) |
| TB cases | 700 (16.7%) |
| Class imbalance | 5:1 (Normal : TB) |
| Preprocessing | Resize to 224×224 · Normalize to \[0, 1\] |

### Training callbacks

| Callback | Purpose |
|---|---|
| `EarlyStopping` | Stops training when `val_loss` stops improving |
| `ModelCheckpoint` | Saves the best model weights to `model.h5` |
| `ReduceLROnPlateau` | Lowers learning rate when training plateaus |
| `CSVLogger` | Logs metrics per epoch to a CSV file |

---

## ⚠️ Disclaimer

> **This project is a research prototype for educational purposes only.**
>
> MediScan AI is not a certified medical device and must not be used as a standalone diagnostic tool. All predictions generated by this system are indicative only and must be reviewed and confirmed by a licensed radiologist or qualified medical professional before any clinical decision is made.
>
> The authors accept no liability for any clinical or medical decisions made based on the output of this system.

---

## 👤 Author

**Aziz** · Deep Learning Project · 2025

---

*Built with TensorFlow, FastAPI, and React.*