from langgraph.graph import StateGraph, END
from graph.state import PlacementState
from graph.supervisor import supervisor_node, route_after_supervisor
from graph.nodes import (
    resume_node,
    aggregate_node,
    skill_gap_node,
    career_planner_node,
    dsa_node,
)

AGENT_NODES: dict = {
    "resume_agent": resume_node,
    "skill_gap_agent": skill_gap_node,
    "career_planner": career_planner_node,
    "dsa_agent": dsa_node,                      
    # "project_recommender": project_recommender_node, ← Sprint 5
    # "interview_agent": interview_node,               ← Sprint 6
}


def build_graph():
    g = StateGraph(PlacementState)

    g.add_node("supervisor", supervisor_node)
    g.add_node("aggregate", aggregate_node)

    for name, fn in AGENT_NODES.items():
        g.add_node(name, fn)

    g.add_conditional_edges(
        "supervisor",
        _safe_route,
        {**{name: name for name in AGENT_NODES}, "aggregate": "aggregate"},
    )

    for name in AGENT_NODES:
        g.add_edge(name, "supervisor")

    g.add_edge("aggregate", END)
    g.set_entry_point("supervisor")
    return g.compile()


def _safe_route(state: dict) -> str:
    """
    Routes to the next registered agent.
    If the agent isn't built yet, goes to aggregate instead of crashing.
    This function lives here (not in supervisor.py) so it always has
    access to the current AGENT_NODES dict.
    """
    next_agents = state.get("next_agents", [])
    if not next_agents:
        return "aggregate"

    for agent in next_agents:
        if agent in AGENT_NODES:
            return agent

    print(f"[workflow] agent(s) {next_agents} not yet built — routing to aggregate")
    return "aggregate"


placement_graph = build_graph()