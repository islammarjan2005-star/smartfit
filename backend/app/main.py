from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base
from app.routers import auth, clothing, outfits, outfit_logs, locations, suggestions

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered wardrobe tracking and outfit suggestion app",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploaded images
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(clothing.router, prefix="/api")
app.include_router(outfits.router, prefix="/api")
app.include_router(outfit_logs.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(suggestions.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "description": "AI-powered wardrobe tracking and outfit suggestions",
        "features": [
            "📸 Scan wardrobe photos to catalog clothing",
            "👔 Track daily outfits with photos or manual logging",
            "📍 Log locations and track outfit history per place",
            "🤖 AI-powered outfit suggestions based on occasion",
            "📊 Analytics on outfit frequency and wardrobe usage",
            "🛍️ Suggestions for new purchases based on wardrobe gaps",
        ],
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
