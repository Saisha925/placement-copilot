from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from core.state_manager import load_state, save_state
from core.readiness import calculate_readiness
from core.database import get_supabase_client

router = APIRouter()

class SavePlanRequest(BaseModel):
    user_id: str
    goal: str
    target_role: str
    plan_data: dict

class ActivatePlanRequest(BaseModel):
    user_id: str
    plan_id: str

class ToggleTopicRequest(BaseModel):
    user_id: str
    topic_id: str
    completed: bool

@router.post("/toggle-topic")
def toggle_plan_topic(req: ToggleTopicRequest):
    state = load_state(req.user_id)
    if not state:
        raise HTTPException(status_code=404, detail="State not found")

    completed_topics = state.get("completed_plan_topics") or []
    
    if req.completed and req.topic_id not in completed_topics:
        completed_topics.append(req.topic_id)
    elif not req.completed and req.topic_id in completed_topics:
        completed_topics.remove(req.topic_id)
        
    state["completed_plan_topics"] = completed_topics
    
    # Recalculate readiness score
    state["readiness_score"] = calculate_readiness(state)
    
    save_state(req.user_id, state)
    
    return {"status": "success", "completed_topics": completed_topics, "readiness_score": state["readiness_score"]}

@router.get("/completed-topics")
def get_completed_topics(user_id: str):
    state = load_state(user_id)
    if not state:
        return {"completed_topics": []}
        
    return {"completed_topics": state.get("completed_plan_topics", [])}

@router.post("/save")
def save_career_plan(req: SavePlanRequest):
    client = get_supabase_client()
    
    try:
        # Deactivate existing active plans for this user
        client.table("career_plans").update({"is_active": False}).eq("user_id", req.user_id).execute()
        
        # Insert new plan
        res = client.table("career_plans").insert({
            "user_id": req.user_id,
            "goal": req.goal,
            "target_role": req.target_role,
            "plan_data": req.plan_data,
            "is_active": True
        }).execute()
        
        return {"status": "success", "plan_id": res.data[0]["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/active")
def get_active_plan(user_id: str):
    client = get_supabase_client()
    try:
        res = client.table("career_plans").select("*").eq("user_id", user_id).eq("is_active", True).execute()
        if not res.data:
            return {"status": "not_found", "plan": None}
        return {"status": "success", "plan": res.data[0]}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_plan_history(user_id: str):
    client = get_supabase_client()
    try:
        res = client.table("career_plans").select("id, goal, target_role, is_active, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"status": "success", "history": res.data or []}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activate")
def activate_career_plan(req: ActivatePlanRequest):
    client = get_supabase_client()
    try:
        # Deactivate all
        client.table("career_plans").update({"is_active": False}).eq("user_id", req.user_id).execute()
        
        # Activate selected
        client.table("career_plans").update({"is_active": True}).eq("id", req.plan_id).execute()
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
