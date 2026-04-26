from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.db.session import ping_db
from app.api import dishes_router, label_router, feedback_router, vision_router
from app.utils.embeddings import warm

app = FastAPI(
    title="Nutrition Label API", 
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "dishes", "description": "Operations with dishes"},
        {"name": "label", "description": "Nutrition label operations"},
        {"name": "meal-logs", "description": "Meal logging and feedback"},
        {"name": "vision", "description": "Image vision operations"},
    ]
)

# Mount static files for logo and assets
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# CORS middleware for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dishes_router.router, prefix="/dishes", tags=["dishes"])
app.include_router(label_router.router, tags=["label"])  # Router already has /label prefix
app.include_router(feedback_router.router, tags=["meal-logs"])
app.include_router(vision_router.router, prefix="/vision", tags=["vision"])

@app.get("/health")
def health():
    """Health check endpoint."""
    db_status = ping_db()
    return {"status": "ok", "db_connected": db_status}

@app.on_event("startup")
def startup_event():
    warm()
