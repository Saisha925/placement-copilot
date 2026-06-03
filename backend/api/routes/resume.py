from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from agents.resume_agent import extract_text_from_pdf, analyze_resume

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

    return {
        "success": True,
        "data": result,
        "resume_text": resume_text
    }