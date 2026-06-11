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

def skill_gap_node(state: dict) -> dict:
    """
    Skill Gap Agent node.
    Reads resume_analysis from shared state — no manual input needed.
    Writes categorised gaps so DSA, Interview, and Project agents can read them.
    """
    import json, time
    from agents.skill_gap_agent import analyze_skill_gap

    start = time.time()
    resume_analysis = state.get("resume_analysis")
    if not resume_analysis:
        print("[skill_gap_node] no resume_analysis in state — skipping")
        return {
            "completed_agents": state.get("completed_agents", []) + ["skill_gap_agent"],
        }
    resume_analysis = state.get("resume_analysis", {})
    target_role = state.get("target_role", "Software Engineer")
    user_profile = state.get("user_profile")

    # Load role requirements from JSON — no scraping, no API call
    try:
        with open("data/role_requirements.json") as f:
            roles = json.load(f)
        role_data = roles.get(target_role, roles.get("Software Engineer", {}))
    except Exception as e:
        print(f"[skill_gap_node] could not load role_requirements.json: {e}")
        role_data = {}

    result = analyze_skill_gap(resume_analysis, target_role, user_profile, role_data)

    updated = {
        "skill_gap": result,
        "completed_agents": state.get("completed_agents", []) + ["skill_gap_agent"],
    }

    _log_run(state["user_id"], "skill_gap_agent", time.time() - start)
    save_state(state["user_id"], {**state, **updated}, "skill_gap_agent")
    return updated

def career_planner_node(state: dict) -> dict:
    """
    Career Planner node.
    Reads resume_analysis + skill_gap + user_profile from state.
    Generates 30/60/90 day plan and saves back to state.
    """
    import time
    from agents.career_planner_agent import generate_career_plan

    start = time.time()
    if not state.get("resume_analysis"):
        print("[career_planner_node] no resume_analysis in state — skipping")
        return {
            "completed_agents": state.get("completed_agents", []) + ["career_planner"],
        }
    result = generate_career_plan(state)

    updated = {
        "career_plan": result,
        "plan_revision_needed": False,   # reset after replanning
        "feedback_triggers": [],          # clear triggers after processing
        "completed_agents": state.get("completed_agents", []) + ["career_planner"],
    }

    _log_run(state["user_id"], "career_planner", time.time() - start)
    save_state(state["user_id"], {**state, **updated}, "career_planner")
    return updated

def dsa_node(state: dict) -> dict:
    import time
    from agents.dsa_agent import get_progress, get_problems, generate_daily_plan, _recompute_progress

    start = time.time()
    user_id = state["user_id"]

    skill_gap = state.get("skill_gap") or {}
    skill_gap_priorities = skill_gap.get("dsa_priority_topics", [])

    career_plan_week = {}
    if cp := state.get("career_plan"):
        weeks = cp.get("plan_30_day", [])
        if weeks:
            career_plan_week = weeks[0]

    # Get existing progress first
    progress = get_progress(user_id)
    weak_topics = progress.get("weak_topics", [])

    # Get already-solved problem names for exclusion
    all_problems = get_problems(user_id)
    solved_names = list({p["problem_name"] for p in all_problems})

    # Generate daily plan with urgency and exclusions
    daily_plan = generate_daily_plan(
        weak_topics,
        skill_gap_priorities,
        career_plan_week,
        state.get("user_profile"),
        target_date=state.get("target_date"),
        solved_problems=solved_names,
    )

    # Save daily_plan into dsa_progress table so the DSA page can read it
    full_progress = _recompute_progress(user_id, daily_plan=daily_plan)
    full_progress["daily_plan"] = daily_plan

    updated = {
        "dsa_progress": full_progress,
        "completed_agents": state.get("completed_agents", []) + ["dsa_agent"],
    }

    _log_run(user_id, "dsa_agent", time.time() - start)
    save_state(user_id, {**state, **updated}, "dsa_agent")
    return updated