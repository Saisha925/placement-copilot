import time
from agents.resume_agent import analyze_resume
from core.state_manager import save_state
from core.readiness import calculate_readiness
from core.database import get_supabase_client


def resume_node(state: dict) -> dict:
    """
    Wraps the existing Resume Agent as a LangGraph node.
    Zero changes to resume_agent.py — we just call analyze_resume().
    """
    start = time.time()
    resume_text = state.get("resume_text", "")
    target_role = state.get("target_role", "Software Engineer")

    if not resume_text:
        return {
            "completed_agents": state.get("completed_agents", []) + ["resume_agent"],
            "messages": [{"role": "assistant",
                          "content": "No resume text found. Please upload your resume first."}],
        }

    result = analyze_resume(resume_text, target_role)

    updated = {
        "resume_analysis": result,
        "completed_agents": state.get("completed_agents", []) + ["resume_agent"],
    }

    _log_run(state["user_id"], "resume_agent", time.time() - start)
    save_state(state["user_id"], {**state, **updated}, "resume_agent")
    return updated


def aggregate_node(state: dict) -> dict:
    """Final node — computes readiness and saves state."""
    readiness = calculate_readiness(state)
    save_state(state["user_id"], {**state, "readiness_score": readiness}, "aggregate")
    print(f"[aggregate] final readiness_score={readiness}")
    return {"readiness_score": readiness}


def _log_run(user_id: str, agent_name: str, duration_s: float) -> None:
    try:
        get_supabase_client().table("agent_runs").insert({
            "user_id": user_id,
            "agent_name": agent_name,
            "duration_ms": int(duration_s * 1000),
        }).execute()
    except Exception as e:
        print(f"[nodes] log_run failed: {e}")  # never crash the graph on logging failure