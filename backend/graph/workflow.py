from langgraph.graph import StateGraph, END
from graph.state import PlacementState
from graph.supervisor import supervisor_node, route_after_supervisor
from graph.nodes import resume_node, aggregate_node

# ── Add agents here sprint by sprint ──────────────────────────────────────────
# Sprint 2: from graph.nodes import skill_gap_node
# Sprint 3: from graph.nodes import career_planner_node
# Sprint 4: from graph.nodes import dsa_node
# Sprint 5: from graph.nodes import project_recommender_node
# Sprint 6: from graph.nodes import interview_node

AGENT_NODES: dict = {
    "resume_agent": resume_node,
    # "skill_gap_agent": skill_gap_node,    ← Sprint 2
    # "career_planner": career_planner_node, ← Sprint 3
    # "dsa_agent": dsa_node,                ← Sprint 4
    # "project_recommender": project_recommender_node, ← Sprint 5
    # "interview_agent": interview_node,    ← Sprint 6
}


def build_graph():
    g = StateGraph(PlacementState)

    # Core nodes
    g.add_node("supervisor", supervisor_node)
    g.add_node("aggregate", aggregate_node)

    # Agent nodes
    for name, fn in AGENT_NODES.items():
        g.add_node(name, fn)

    # Supervisor routes conditionally to agents or aggregate
    g.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {**{name: name for name in AGENT_NODES}, "aggregate": "aggregate"},
    )

    # Every agent routes back to supervisor
    for name in AGENT_NODES:
        g.add_edge(name, "supervisor")

    # Aggregate ends the graph
    g.add_edge("aggregate", END)

    g.set_entry_point("supervisor")
    return g.compile()


placement_graph = build_graph()