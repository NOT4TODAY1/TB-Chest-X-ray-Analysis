from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import numpy as np
import tensorflow as tf
from PIL import Image
import io
import os

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_PATH = os.getenv("MODEL_PATH", "model.h5")   # put your .h5 file here
IMG_SIZE   = (224, 224)                             # must match training size
LABELS     = ["Normal", "Tuberculosis"]

# ── Startup: load model once ──────────────────────────────────────────────────
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    if not os.path.exists(MODEL_PATH):
        print(f"[WARN] Model file '{MODEL_PATH}' not found. Predictions will be disabled.")
    else:
        print(f"[INFO] Loading model from {MODEL_PATH} …")
        model = tf.keras.models.load_model(MODEL_PATH)
        print("[INFO] Model loaded successfully.")
    yield
    model = None

app = FastAPI(title="TB Chest X-ray Detector", lifespan=lifespan)

# ── CORS (allow all origins for local dev) ────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve the frontend ────────────────────────────────────────────────────────
STATIC_DIR = "static"
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", response_class=FileResponse)
def root():
    index = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return {"message": "TB Detector API is running. POST /predict to analyze an image."}

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}

# ── Prediction endpoint ───────────────────────────────────────────────────────
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Check MODEL_PATH.")

    # Validate content type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    # Read and preprocess
    contents = await file.read()
    try:
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        img = img.resize(IMG_SIZE)
        arr = np.array(img, dtype="float32")          # shape (224, 224, 3)
        arr = arr / 255.0                              # normalize to [0, 1]
        arr = np.expand_dims(arr, axis=0)              # shape (1, 224, 224, 3)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process image: {e}")

    # Inference
    preds = model.predict(arr, verbose=0)              # shape (1, 1) or (1, 2)

    # Handle both sigmoid (binary) and softmax (2-class) output
    if preds.shape[-1] == 1:
        tb_prob    = float(preds[0][0])
        normal_prob = 1.0 - tb_prob
    else:
        normal_prob = float(preds[0][0])
        tb_prob     = float(preds[0][1])

    predicted_class = LABELS[1] if tb_prob >= 0.5 else LABELS[0]
    confidence      = tb_prob if tb_prob >= 0.5 else normal_prob

    return {
        "prediction":   predicted_class,
        "confidence":   round(confidence * 100, 2),
        "probabilities": {
            "Normal":       round(normal_prob * 100, 2),
            "Tuberculosis": round(tb_prob    * 100, 2),
        }
    }