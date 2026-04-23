from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routes.auth import router as auth_router
from routes.history import router as history_router
from routes.settings import router as settings_router

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Copy History Manager API")

# CORS (keep open for extension)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router)
app.include_router(history_router)
app.include_router(settings_router)


@app.get("/")
def root():
    return {"message": "Copy History Manager API running"}

@app.head("/")
def root_head():
    return Response(status_code=200)