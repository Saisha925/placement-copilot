from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from core.database import get_supabase_client
from core.state_manager import load_state, save_state
from agents.interview_agent import generate_questions, evaluate_answer, analyze_communication

router = APIRouter()

class GenerateQuestionsRequest(BaseModel):
    user_id: str
    resume_text: str
    target_role: str
    round_type: str
    experience_level: str = "Student / Fresher"

class EvaluateAnswerRequest(BaseModel):
    question: str
    answer: str
    target_role: str

class AnalyzeCommunicationRequest(BaseModel):
    transcript: str

class SaveHistoryRequest(BaseModel):
    user_id: str
    target_role: str
    round_type: str
    questions_and_answers: List[Dict[str, Any]]
    overall_score: int
    feedback: str

@router.post("/questions")
async def api_generate_questions(req: GenerateQuestionsRequest):
    """Generates interview questions based on resume, role, round type, and optional target company from state."""
    try:
        state = load_state(req.user_id)
        target_company = state.get("target_company")

        questions = generate_questions(
            req.resume_text, req.target_role, req.round_type, req.experience_level, target_company
        )
        return {"questions": questions}
    except Exception as e:
        print(f"[interview api] generate_questions failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe")
async def api_transcribe_audio(file: UploadFile = File(...)):
    """Transcribes an audio file using Groq Whisper API."""
    try:
        from groq import Groq
        from core.config import GROQ_API_KEY
        import tempfile
        import os

        client = Groq(api_key=GROQ_API_KEY)

        # Save uploaded file temporarily
        suffix = os.path.splitext(file.filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            with open(tmp_path, "rb") as f:
                transcription = client.audio.transcriptions.create(
                    file=(os.path.basename(tmp_path), f.read()),
                    model="whisper-large-v3",
                )
        finally:
            os.remove(tmp_path)

        return {"text": transcription.text}
    except Exception as e:
        print(f"[interview api] transcribe failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate")
async def api_evaluate_answer(req: EvaluateAnswerRequest):
    """Evaluates an answer and provides a score and feedback."""
    try:
        evaluation = evaluate_answer(req.question, req.answer, req.target_role)
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-communication")
async def api_analyze_communication(req: AnalyzeCommunicationRequest):
    """Analyzes the communication style of an answer."""
    try:
        analysis = analyze_communication(req.transcript)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{user_id}")
async def get_history(user_id: str):
    """Fetches past mock interviews from Supabase."""
    try:
        client = get_supabase_client()
        result = (
            client.table("mock_interviews")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"history": result.data or []}
    except Exception as e:
        print(f"[interview api] get_history failed: {e}")
        return {"history": []} # Fallback to empty

@router.post("/history")
async def save_history(req: SaveHistoryRequest):
    """Saves interview result to Supabase and updates readiness history in state."""
    try:
        client = get_supabase_client()
        row = {
            "user_id": req.user_id,
            "target_role": req.target_role,
            "round_type": req.round_type,
            "questions_and_answers": req.questions_and_answers,
            "overall_score": req.overall_score,
            "feedback": req.feedback,
        }
        
        # Save to DB
        db_result = None
        try:
            result = client.table("mock_interviews").insert(row).execute()
            if result.data:
                db_result = result.data[0]
        except Exception as db_err:
            print(f"[interview api] insert to mock_interviews failed: {db_err}")
            # we continue to save to state even if db fails
        
        # Update agent_state
        state = load_state(req.user_id)
        current_scores = state.get("interview_scores") or {}
        history = current_scores.get("history") or []
        
        history_entry = {
            "id": db_result["id"] if db_result else None,
            "round_type": req.round_type,
            "overall_score": req.overall_score,
            "feedback": req.feedback
        }
        history.append(history_entry)
        
        current_scores["history"] = history
        state["interview_scores"] = current_scores
        save_state(req.user_id, state, "mock_interview_complete")
        
        return {"success": True, "saved": db_result or row}

    except Exception as e:
        print(f"[interview api] save_history failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
