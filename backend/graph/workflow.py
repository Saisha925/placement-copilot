from langgraph.graph import StateGraph, END
from graph.state import PlacementState
from graph.supervisor import supervisor_node, route_after_supervisor
from graph.nodes import (
    resume_node,
    aggregate_node,
    skill_gap_node,
    career_planner_node,
    dsa_node,
    project_recommender_node,
    project_recommender_node,
    interview_node,
)

AGENT_NODES: dict = {
    "resume_agent": resume_node,
    "skill_gap_agent": skill_gap_node,
    "career_planner": career_planner_node,
    "dsa_agent": dsa_node,
    "project_recommender": project_recommender_node,
    "interview_agent": interview_node,
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


def _safe_route(state: dict) -> list[str]:
    """
    Routes to the next registered agents in parallel!
    If no agents are built yet, goes to aggregate instead of crashing.
    """
    next_agents = state.get("next_agents", [])
    if not next_agents:
        return ["aggregate"]

    valid_agents = [agent for agent in next_agents if agent in AGENT_NODES]
    if valid_agents:
        return valid_agents

    print(f"[workflow] agent(s) {next_agents} not yet built — routing to aggregate")
    return ["aggregate"]


placement_graph = build_graph()