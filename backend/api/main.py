from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import resume

app = FastAPI(title="Placement Copilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/api/resume", tags=["resume"])

@app.get("/health")
def health_check():
    return {"status": "ok"}