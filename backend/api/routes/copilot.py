from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from graph.workflow import placement_graph
from core.state_manager import load_state, save_state

router = APIRouter()


class GoalRequest(BaseModel):
    user_id: str
    goal: str
    target_role: str
    target_company: Optional[str] = None
    target_date: Optional[str] = None
    resume_text: Optional[str] = None
    user_profile: Optional[dict] = None


@router.post("/run")
async def run_copilot(req: GoalRequest):
    try:
        # Load any existing state (preserves prior agent outputs)
        state = load_state(req.user_id)

        # Update with this request's context
        state.update({
            "user_goal": req.goal,
            "target_role": req.target_role,
            "target_company": req.target_company,
            "target_date": req.target_date,
            "completed_agents": [],    # reset for this run
            "next_agents": [],
            "iteration_count": 0,      # reset loop counter
            "plan_revision_needed": False,
            "messages": [],
        })

        if req.resume_text:
            state["resume_text"] = req.resume_text
        if req.user_profile:
            state["user_profile"] = req.user_profile

        result = await placement_graph.ainvoke(state)

        return {
            "success": True,
            "readiness_score": result.get("readiness_score", 0),
            "resume_analysis": result.get("resume_analysis"),
            "skill_gap": result.get("skill_gap"),
            "career_plan": result.get("career_plan"),
            "project_recommendations": result.get("project_recommendations"),
            "dsa_progress": result.get("dsa_progress"),
            "messages": [
                m if isinstance(m, dict) else {"role": "assistant", "content": str(m)}
                for m in result.get("messages", [])
            ],
        }

    except Exception as e:
        print(f"[copilot] run failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))