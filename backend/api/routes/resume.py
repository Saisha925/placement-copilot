from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from agents.resume_agent import extract_text_from_pdf, analyze_resume
from core.state_manager import load_state, save_state

router = APIRouter()

@router.post("/analyze")
async def analyze_resume_endpoint(
    file: UploadFile = File(...),
    target_role: str = Form(...),
    user_id: str = Form(...)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")

    file_bytes = await file.read()
    resume_text = extract_text_from_pdf(file_bytes)

    if not resume_text.strip():
        raise HTTPException(400, "Could not extract text from PDF. Ensure it is not a scanned image.")

    result = analyze_resume(resume_text, target_role)

    if user_id and user_id != "anonymous":
        state = load_state(user_id)
        state["resume_text"] = resume_text
        state["resume_analysis"] = result
        save_state(user_id, state, "resume_agent")

    return {
        "success": True,
        "data": result,
        "resume_text": resume_text
    }