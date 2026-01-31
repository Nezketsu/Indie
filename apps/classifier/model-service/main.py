"""
Clothes Image Detection Model Service
Uses dima806/clothes_image_detection for clothing classification
"""

import io
import logging
from contextlib import asynccontextmanager
from typing import Optional

import httpx
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel, HttpUrl
from transformers import AutoImageProcessor, AutoModelForImageClassification

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instances
model: Optional[AutoModelForImageClassification] = None
processor: Optional[AutoImageProcessor] = None
device: str = "cpu"

# Model labels (from the model)
LABELS = [
    "Blazer", "Coat", "Denim Jacket", "Dresses", "Hoodie",
    "Jacket", "Jeans", "Long Pants", "Polo", "Shirt",
    "Shorts", "Skirt", "Sports Jacket", "Sweater", "T-shirt"
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup"""
    global model, processor, device

    logger.info("Loading clothes_image_detection model...")

    # Use CUDA if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    model_name = "dima806/clothes_image_detection"

    try:
        processor = AutoImageProcessor.from_pretrained(model_name)
        model = AutoModelForImageClassification.from_pretrained(model_name).to(device)
        model.eval()
        logger.info("Clothes detection model loaded successfully")
        logger.info(f"Model labels: {model.config.id2label}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

    yield

    # Cleanup
    logger.info("Shutting down model service")


app = FastAPI(
    title="Clothes Image Detection Service",
    description="Image classification for clothing items using ViT",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClassifyRequest(BaseModel):
    """Request for classification"""
    image_url: HttpUrl
    labels: list[str] = []  # Optional, ignored for this model


class LabelScore(BaseModel):
    """Score for a single label"""
    name: str
    score: float


class ClassifyResponse(BaseModel):
    """Response with classification results"""
    labels: list[LabelScore]


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    device: str


async def download_image(url: str) -> Image.Image:
    """Download and open image from URL"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(str(url), follow_redirects=True)
            response.raise_for_status()
            return Image.open(io.BytesIO(response.content)).convert("RGB")
        except httpx.HTTPError as e:
            raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")


def classify_image(image: Image.Image) -> list[LabelScore]:
    """Run classification on image"""
    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Process image
    inputs = processor(images=image, return_tensors="pt").to(device)

    # Get predictions
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=1)

    # Build results with all labels
    results = []
    probs_list = probs[0].cpu().tolist()
    
    # Get label mapping from model
    id2label = model.config.id2label

    for idx, score in enumerate(probs_list):
        label = id2label.get(idx, f"unknown_{idx}")
        results.append(LabelScore(name=label, score=round(score, 4)))

    # Sort by score descending
    results.sort(key=lambda x: x.score, reverse=True)

    return results


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if model is not None else "loading",
        model_loaded=model is not None,
        device=device
    )


@app.post("/classify", response_model=ClassifyResponse)
async def classify(request: ClassifyRequest):
    """
    Classify a clothing image.

    Returns probability scores for each clothing category:
    Blazer, Coat, Denim Jacket, Dresses, Hoodie, Jacket, Jeans,
    Long Pants, Polo, Shirt, Shorts, Skirt, Sports Jacket, Sweater, T-shirt
    """
    logger.info(f"Classifying image: {request.image_url}")

    # Download image
    image = await download_image(str(request.image_url))

    # Classify
    results = classify_image(image)

    logger.info(f"Classification complete. Top result: {results[0].name} ({results[0].score})")

    return ClassifyResponse(labels=results)


@app.post("/classify/batch")
async def classify_batch(requests: list[ClassifyRequest]) -> list[ClassifyResponse]:
    """
    Classify multiple images in batch.
    """
    if len(requests) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 images per batch")

    results = []
    for req in requests:
        try:
            image = await download_image(str(req.image_url))
            labels = classify_image(image)
            results.append(ClassifyResponse(labels=labels))
        except HTTPException as e:
            results.append(ClassifyResponse(labels=[]))
            logger.warning(f"Failed to classify {req.image_url}: {e.detail}")

    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
