from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.system_design_agent import generate_system_design_challenge, evaluate_system_design
from core.state_manager import load_state, save_state
from graph.nodes import aggregate_node

router = APIRouter()

class GenerateChallengeRequest(BaseModel):
    target_role: str

class EvaluateSystemDesignRequest(BaseModel):
    user_id: str
    challenge: dict
    user_solution: str

@router.post("/challenge")
async def api_generate_challenge(req: GenerateChallengeRequest):
    try:
        challenge = generate_system_design_challenge(req.target_role)
        return {"challenge": challenge}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate")
async def api_evaluate_design(req: EvaluateSystemDesignRequest):
    try:
        evaluation = evaluate_system_design(req.challenge, req.user_solution)
        
        # Save to state and update readiness score
        state = load_state(req.user_id)
        sd_scores = state.get("system_design_scores") or {"history": []}
        sd_scores["history"].append({
            "score": evaluation.get("score", 0),
            "feedback": evaluation.get("feedback", ""),
            "timestamp": "now"
        })
        state["system_design_scores"] = sd_scores
        save_state(req.user_id, state, "system_design_agent")
        
        # Force a recalculation of readiness score
        aggregate_node(state)
        
        return {"evaluation": evaluation}
    except Exception as e:
        print(f"Error in api_evaluate_design: {e}")
        raise HTTPException(status_code=500, detail=str(e))
