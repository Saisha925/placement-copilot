from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from agents.helpdesk_agent import ask_helpdesk
from core.database import get_supabase_client

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class HelpDeskRequest(BaseModel):
    user_id: str
    message: str
    page_context: str = ""
    history: List[ChatMessage] = []

@router.post("/ask")
async def ask_helpdesk_route(req: HelpDeskRequest):
    try:
        # Convert Pydantic models to dicts for the agent
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in req.history]
        
        answer = ask_helpdesk(
            user_id=req.user_id,
            message=req.message,
            page_context=req.page_context,
            history=history_dicts
        )
        return {"answer": answer}
    except Exception as e:
        print(f"Helpdesk error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
