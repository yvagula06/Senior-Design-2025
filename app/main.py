from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import ping_db
from app.api import dishes_router, label_router, feedback_router
from app.utils.embeddings import warm

app = FastAPI(title="Nutrition Label API", version="0.1.0")

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
app.include_router(feedback_router.router, prefix="/feedback", tags=["feedback"])

@app.get("/health")
def health():
    """Health check endpoint."""
    db_status = ping_db()
    return {"status": "ok", "db_connected": db_status}

@app.on_event("startup")
def startup_event():
    warm()
