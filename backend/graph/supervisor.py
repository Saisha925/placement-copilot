import json
from core.llm import get_llm
from core.readiness import calculate_readiness
from langchain_core.messages import SystemMessage, HumanMessage

MAX_ITERATIONS = 10


def _rule_based_route(state: dict) -> list | None:
    """
    Deterministic routing — runs before the LLM.
    Returns None only when rules genuinely can't decide.
    """
    completed = set(state.get("completed_agents", []))

    # Feedback loop: career planner is allowed to rerun
    if state.get("plan_revision_needed") and state.get("feedback_triggers"):
        return ["career_planner"]

    # Dependency chain — strict order
    if state.get("resume_text") and "resume_agent" not in completed:
        return ["resume_agent"]

    if state.get("resume_analysis") and "skill_gap_agent" not in completed:
        return ["skill_gap_agent"]

    if state.get("skill_gap") and "career_planner" not in completed:
        return ["career_planner"]

    if state.get("skill_gap") and "dsa_agent" not in completed:
        return ["dsa_agent"]

    if state.get("skill_gap") and "project_recommender" not in completed:
        return ["project_recommender"]

    # All primary agents done — fall through to LLM for edge cases
    return None


_SUPERVISOR_PROMPT = """You are the Placement Copilot Supervisor.
Available agents: resume_agent, skill_gap_agent, career_planner, dsa_agent,
interview_agent, project_recommender.

Rules:
- Only recommend agents NOT already in completed_agents.
- Exception: career_planner may rerun when plan_revision_needed is true.
- Return at most 2 agents per turn.
- Return empty list if nothing is left to do.

Respond ONLY with valid JSON: {"next_agents": ["agent_name"], "reason": "..."}"""


def _llm_route(state: dict) -> list:
    """LLM routing — fallback only, called when rules return None."""
    llm = get_llm(temperature=0.2)
    summary = {
        "user_goal": state.get("user_goal"),
        "target_role": state.get("target_role"),
        "completed_agents": state.get("completed_agents", []),
        "has_resume_analysis": state.get("resume_analysis") is not None,
        "has_skill_gap": state.get("skill_gap") is not None,
        "has_career_plan": state.get("career_plan") is not None,
        "readiness_score": state.get("readiness_score", 0),
        "feedback_triggers": state.get("feedback_triggers", []),
    }
    try:
        resp = llm.invoke([
            SystemMessage(content=_SUPERVISOR_PROMPT),
            HumanMessage(content=json.dumps(summary, indent=2)),
        ])
        parsed = json.loads(
            resp.content.strip()
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )
        return parsed.get("next_agents", [])
    except Exception as e:
        print(f"[supervisor] LLM routing failed: {e}")
        return []  # safe fallback — stops graph cleanly


def supervisor_node(state: dict) -> dict:
    """
    Main supervisor node.
    - Increments iteration counter (loop guard)
    - Rule-based routing first, LLM fallback second
    - Recomputes readiness score deterministically on every pass
    """
    iteration = state.get("iteration_count", 0)

    if iteration >= MAX_ITERATIONS:
        print(f"[supervisor] max iterations ({MAX_ITERATIONS}) reached")
        return {
            "next_agents": [],
            "iteration_count": iteration + 1,
            "readiness_score": calculate_readiness(state),
        }

    readiness = calculate_readiness(state)

    next_agents = _rule_based_route(state)
    if next_agents is None:
        next_agents = _llm_route(state)

    print(f"[supervisor] iter={iteration+1} readiness={readiness} next={next_agents}")

    return {
        "next_agents": next_agents,
        "iteration_count": iteration + 1,
        "readiness_score": readiness,
    }


def route_after_supervisor(state: dict) -> str:
    """Conditional edge — picks the first agent in next_agents, or goes to aggregate."""
    next_agents = state.get("next_agents", [])
    if not next_agents:
        return "aggregate"
    return next_agents[0]