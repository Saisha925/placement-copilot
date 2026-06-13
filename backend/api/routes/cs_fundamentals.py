from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from core.database import get_supabase_client
from agents.cs_fundamentals_agent import generate_study_guide, generate_questions, evaluate_answer

router = APIRouter()

class GuideRequest(BaseModel):
    target_role: str

class QuestionsRequest(BaseModel):
    subject: str
    topic: str

class EvaluateRequest(BaseModel):
    question: str
    answer: str

class SaveHistoryRequest(BaseModel):
    user_id: str
    subject: str
    topic: str
    question: str
    answer: str
    score: int
    feedback: str
    missing_points: List[str]

@router.post("/guide")
async def api_generate_guide(req: GuideRequest):
    try:
        guide = generate_study_guide(req.target_role)
        return {"guide": guide}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/questions")
async def api_generate_questions(req: QuestionsRequest):
    try:
        questions = generate_questions(req.subject, req.topic)
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate")
async def api_evaluate_answer(req: EvaluateRequest):
    try:
        evaluation = evaluate_answer(req.question, req.answer)
        return {"evaluation": evaluation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/history")
async def api_save_history(req: SaveHistoryRequest):
    try:
        client = get_supabase_client()
        # Save to DB if table exists (will gracefully fail or save to state)
        data = {
            "user_id": req.user_id,
            "subject": req.subject,
            "topic": req.topic,
            "question": req.question,
            "answer": req.answer,
            "score": req.score,
            "feedback": req.feedback,
            "missing_points": req.missing_points
        }
        res = client.table("cs_fundamentals_history").insert(data).execute()
        return {"success": True, "data": res.data}
    except Exception as e:
        print(f"[cs_fundamentals] failed to save to db: {e}")
        # Fallback to agent_state if we want, but DB is better
        return {"success": False, "error": str(e)}

@router.get("/history/{user_id}")
async def api_get_history(user_id: str):
    try:
        client = get_supabase_client()
        res = client.table("cs_fundamentals_history").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"history": res.data}
    except Exception as e:
        print(f"[cs_fundamentals] get history failed: {e}")
        return {"history": []}
