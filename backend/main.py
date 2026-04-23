from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routes.auth import router as auth_router
from routes.history import router as history_router
from routes.settings import router as settings_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Copy History Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(history_router)
app.include_router(settings_router)


@app.get("/")
def root():
    return {"message": "Copy History Manager API running"}