from fastapi import FastAPI
from app.db.session import ping_db
from app.api import dishes_router, label_router, feedback_router
from app.utils.embeddings import warm

app = FastAPI(title="Nutrition Label API", version="0.1.0")

app.include_router(dishes_router.router, prefix="/dishes", tags=["dishes"])
app.include_router(label_router.router, prefix="/label", tags=["label"])
app.include_router(feedback_router.router, prefix="/feedback", tags=["feedback"])

@app.get("/health")
def health():
    return {"ok": True, "db": ping_db()}

@app.on_event("startup")
def startup_event():
    warm()
