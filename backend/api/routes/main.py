from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import resume
from api.routes.copilot import router as copilot_router
from api.routes import dsa
from api.routes.projects import router as projects_router
from api.routes.interview import router as interview_router
from api.routes import cs_fundamentals
from api.routes import system_design
from api.routes import settings

app = FastAPI(title="Placement Copilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/api/resume", tags=["resume"])
app.include_router(copilot_router, prefix="/api/copilot", tags=["copilot"])
app.include_router(dsa.router, prefix="/api/dsa", tags=["dsa"])
app.include_router(projects_router, prefix="/api/projects", tags=["projects"])
app.include_router(interview_router, prefix="/api/interview", tags=["interview"])
app.include_router(cs_fundamentals.router, prefix="/api/cs_fundamentals", tags=["CS Fundamentals"])
app.include_router(system_design.router, prefix="/api/system_design", tags=["system_design"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

@app.get("/health")
def health_check():
    return {"status": "ok"}