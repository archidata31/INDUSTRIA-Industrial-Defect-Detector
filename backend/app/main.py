
import base64
import json
from io import BytesIO
from pathlib import Path
from typing import List
from fastapi.openapi.utils import get_openapi

import cv2
import numpy as np
import torch
import torch.nn as nn

from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware


# =====================================
# 1. CONFIGURATION
# =====================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    BASE_DIR / "models" /
    "industrial_defect_autoencoder.pth"
)

THRESHOLD_PATH = BASE_DIR / "models" / "threshold.json"

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# =====================================
# 2. AUTOENCODER MODEL
# Same architecture as your notebook
# =====================================

class Autoencoder(nn.Module):

    def __init__(self):
        super(Autoencoder, self).__init__()

        self.encoder = nn.Sequential(
            nn.Conv2d(3, 32, 3, stride=2, padding=1),
            nn.ReLU(),

            nn.Conv2d(32, 64, 3, stride=2, padding=1),
            nn.ReLU(),

            nn.Conv2d(64, 128, 3, stride=2, padding=1),
            nn.ReLU()
        )

        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(
                128, 64, 3,
                stride=2,
                padding=1,
                output_padding=1
            ),
            nn.ReLU(),

            nn.ConvTranspose2d(
                64, 32, 3,
                stride=2,
                padding=1,
                output_padding=1
            ),
            nn.ReLU(),

            nn.ConvTranspose2d(
                32, 3, 3,
                stride=2,
                padding=1,
                output_padding=1
            ),
            nn.Sigmoid()
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded


# =====================================
# 3. LOAD TRAINED MODEL
# =====================================

model = Autoencoder().to(device)
model_loaded = False


def load_model():

    global model_loaded

    if not MODEL_PATH.exists():
        print("ERROR: Model file not found!")
        print("Expected location:", MODEL_PATH)
        return

    state_dict = torch.load(
        MODEL_PATH,
        map_location=device,
        weights_only=True
    )

    model.load_state_dict(state_dict)
    model.eval()

    model_loaded = True

    print("Autoencoder loaded successfully!")
    print("Using device:", device)


load_model()


# =====================================
# 4. CREATE FASTAPI APP
# =====================================

app = FastAPI(
    title="Industrial Defect Detection API",
    description="AI-powered industrial surface defect detection",
    version="1.0"
)


# =====================================
# 5. CONNECT REACT FRONTEND
# =====================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =====================================
# 6. HOME ROUTE
# =====================================

@app.get("/")
def home():

    return {
        "message": "Industrial Defect Detection API is running!"
    }


# =====================================
# 7. HEALTH CHECK
# =====================================

@app.get("/health")
def health():

    return {
        "status": "running",
        "model_loaded": model_loaded,
        "device": str(device)
    }

# =====================================
# 8. THRESHOLD CALIBRATION
# =====================================

@app.post("/calibrate")
async def calibrate(
    files: list[UploadFile] = File(
        ...,
        description="Upload multiple NORMAL validation images"
    ),
    percentile: float = Form(99.0)
):
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if len(files) < 5:
        raise HTTPException(
            status_code=400,
            detail="Upload at least 5 normal images"
        )

    if not 0 < percentile <= 100:
        raise HTTPException(
            status_code=400,
            detail="Percentile must be between 0 and 100"
        )

    scores = []

    try:
        model.eval()

        for file in files:
            contents = await file.read()

            image = Image.open(
                BytesIO(contents)
            ).convert("RGB").resize((128, 128))

            image_array = (
                np.asarray(image, dtype=np.float32) / 255.0
            )

            image_tensor = torch.from_numpy(
                image_array
            ).permute(2, 0, 1).unsqueeze(0).to(device)

            with torch.no_grad():
                reconstructed = model(image_tensor)

                score = torch.mean(
                    (image_tensor - reconstructed) ** 2
                ).item()

            scores.append(score)

        threshold = float(np.percentile(scores, percentile))

        threshold_data = {
            "threshold": threshold,
            "percentile": percentile,
            "number_of_images": len(scores),
            "calibration_type": "normal_validation_only"
        }

        THRESHOLD_PATH.parent.mkdir(
            parents=True, exist_ok=True
        )

        with open(THRESHOLD_PATH, "w") as f:
            json.dump(threshold_data, f, indent=4)

        return {
            "message": "Threshold calibrated successfully!",
            **threshold_data
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



# =====================================
# 8. IMAGE PREDICTION
# =====================================

@app.post("/predict")
async def predict(file: UploadFile = File(...)):

    if not model_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded"
        )

    try:

        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty"
            )

        image = Image.open(
            BytesIO(contents)
        ).convert("RGB")

        image = image.resize((128, 128))

        image_array = (
            np.asarray(image, dtype=np.float32) / 255.0
        )

        image_tensor = torch.from_numpy(
            image_array
        ).permute(2, 0, 1).unsqueeze(0).to(device)

        # Model prediction
        model.eval()

        with torch.no_grad():
            reconstructed = model(image_tensor)

        # Calculate reconstruction error
        anomaly_score = torch.mean(
            (image_tensor - reconstructed) ** 2
        ).item()

        # Generate defect heatmap
        original = image_tensor[0].cpu().numpy()

        reconstructed_img = (
            reconstructed[0].cpu().numpy()
        )

        difference = np.mean(
            np.abs(original - reconstructed_img),
            axis=0
        )

        heatmap = np.uint8(
            255 * difference / (difference.max() + 1e-8)
        )

        colored_heatmap = cv2.applyColorMap(
            heatmap,
            cv2.COLORMAP_JET
        )

        _, encoded_image = cv2.imencode(
            ".png",
            colored_heatmap
        )

        heatmap_base64 = base64.b64encode(
            encoded_image.tobytes()
        ).decode("utf-8")

        # Classification requires a calibrated threshold
        classification = "Threshold not configured"

        if THRESHOLD_PATH.exists():

            with open(THRESHOLD_PATH, "r") as f:
                threshold_data = json.load(f)

            threshold = float(
                threshold_data["threshold"]
            )

            classification = (
                "Defective"
                if anomaly_score > threshold
                else "Normal"
            )

        return {
            "filename": file.filename,
            "anomaly_score": round(anomaly_score, 6),
            "classification": classification,
            "heatmap": heatmap_base64
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

# =====================================
# FIX SWAGGER FILE UPLOAD DISPLAY
# =====================================

def custom_openapi():

    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        openapi_version="3.0.3"
    )

    # Convert file schemas to Swagger-compatible binary format
    def fix_file_schema(schema):

        if isinstance(schema, dict):

            if (
                schema.get("type") == "string"
                and schema.get("contentMediaType")
                == "application/octet-stream"
            ):
                schema.pop("contentMediaType", None)
                schema["format"] = "binary"

            for value in schema.values():
                fix_file_schema(value)

        elif isinstance(schema, list):

            for item in schema:
                fix_file_schema(item)

    fix_file_schema(openapi_schema)

    app.openapi_schema = openapi_schema

    return app.openapi_schema


app.openapi = custom_openapi
