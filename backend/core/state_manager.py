from core.database import get_supabase_client


def load_state(user_id: str) -> dict:
    """
    Load the user's last saved agent state from Supabase.
    Returns a clean blank state if this is their first session.
    """
    client = get_supabase_client()

    try:
        result = (
            client.table("agent_state")
            .select("state")
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return result.data[0]["state"]
    except Exception as e:
        print(f"[state_manager] load failed: {e}")

    return _blank_state(user_id)


def save_state(user_id: str, state: dict, last_agent: str = "") -> None:
    """
    Upsert the full agent state after every node completes.
    Strips 'messages' — LangGraph message objects aren't JSON serialisable.
    """
    client = get_supabase_client()

    serialisable = {k: v for k, v in state.items() if k != "messages"}

    try:
        client.table("agent_state").upsert({
            "user_id": user_id,
            "state": serialisable,
            "last_agent": last_agent,
            "iteration_count": state.get("iteration_count", 0),
        },
        on_conflict="user_id"
        ).execute()
        
    except Exception as e:
        print(f"[state_manager] save failed for {user_id}: {e}")


def _blank_state(user_id: str) -> dict:
    return {
        "user_id": user_id,
        "target_role": "",
        "target_company": None,
        "target_date": None,
        "user_goal": "",
        "resume_text": None,
        "user_profile": None,
        "resume_analysis": None,
        "skill_gap": None,
        "career_plan": None,
        "dsa_progress": None,
        "interview_scores": None,
        "communication_scores": None,
        "project_recommendations": None,
        "cs_fundamentals_scores": None,
        "system_design_scores": None,
        "readiness_score": 0,
        "next_agents": [],
        "completed_agents": [],
        "iteration_count": 0,
        "feedback_triggers": [],
        "plan_revision_needed": False,
        "messages": [],
    }
