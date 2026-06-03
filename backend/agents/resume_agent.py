import os
import io
import json
import pdfplumber
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from core.config import GROQ_API_KEY

os.environ["GROQ_API_KEY"] = GROQ_API_KEY

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from PDF bytes using pdfplumber."""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

def analyze_resume(resume_text: str, target_role: str) -> dict:
    """
    Analyze resume text for a given target role.
    Returns structured JSON with ATS score, issues, suggestions, missing skills.
    """
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.3)
    system_prompt = """You are an expert ATS and resume reviewer.
Analyze the resume for the given target role.

Return ONLY a valid JSON object with this exact structure:
{
    "ats_score": <integer 0-100>,
    "issues": [
        {"type": "error", "description": "..."},
        {"type": "warning", "description": "..."}
    ],
    "suggestions": [
        {"original": "...", "improved": "..."}
    ],
    "missing_skills": ["skill1", "skill2"],
    "strengths": ["strength1", "strength2"]
}

No explanation. No markdown. Just the JSON object."""

    user_message = f"""Target Role: {target_role}

Resume Text:
{resume_text}

Analyze this resume and return the JSON."""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message)
    ])

    text = response.content.strip()
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)