from typing import TypedDict, Optional, Annotated
from langgraph.graph.message import add_messages


class PlacementState(TypedDict):

    # ── User Identity ──────────────────────────────────────────────────────
    user_id: str
    target_role: str
    target_company: Optional[str]
    target_date: Optional[str]
    user_goal: str
    resume_text: Optional[str]

    # ── User Profile ───────────────────────────────────────────────────────
    user_profile: Optional[dict]
    # {
    #   "semester": 6, "cgpa": 8.1, "target_package_lpa": 12,
    #   "preferred_roles": ["Backend"], "daily_hours": 2,
    #   "graduation_year": 2026, "preferred_companies": ["Amazon"]
    # }

    # ── Agent Outputs (each agent writes ONLY to its own key) ──────────────
    resume_analysis: Optional[dict]
    skill_gap: Optional[dict]
    career_plan: Optional[dict]
    dsa_progress: Optional[dict]
    interview_scores: Optional[dict]
    communication_scores: Optional[dict]
    project_recommendations: Optional[list]
    cs_fundamentals_scores: Optional[dict]
    system_design_scores: Optional[dict]

    # ── Aggregate (computed by readiness.py — never by LLM) ───────────────
    readiness_score: int

    # ── Orchestration ──────────────────────────────────────────────────────
    next_agents: list
    completed_agents: list
    iteration_count: int
    messages: Annotated[list, add_messages]

    # ── Feedback Loop ──────────────────────────────────────────────────────
    feedback_triggers: list
    plan_revision_needed: bool