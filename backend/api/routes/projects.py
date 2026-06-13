from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.database import get_supabase_client
from core.state_manager import load_state, save_state
from agents.project_recommender import recommend_projects

router = APIRouter()


class StatusUpdateRequest(BaseModel):
    user_id: str
    status: str  # suggested | in_progress | completed


class RefreshRequest(BaseModel):
    user_id: str


# ── Get projects for a user ───────────────────────────────────────────────────

@router.get("/user/{user_id}")
async def get_projects(user_id: str):
    """
    Fetch project recommendations from Supabase.
    Falls back to agent_state if the projects table is empty.
    """
    try:
        client = get_supabase_client()

        result = (
            client.table("project_recommendations")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        if result.data:
            return {"projects": result.data}

        # Fallback: read from agent_state
        state = load_state(user_id)
        projects = state.get("project_recommendations") or []
        return {"projects": projects}

    except Exception as e:
        print(f"[projects] get_projects failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Update project status ────────────────────────────────────────────────────

@router.patch("/{project_id}/status")
async def update_project_status(project_id: str, req: StatusUpdateRequest):
    """
    Update project status: suggested → in_progress → completed.
    Also updates the project_recommendations list in agent_state
    so the readiness calculator can pick up completed projects.
    """
    valid_statuses = {"suggested", "in_progress", "completed"}
    if req.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{req.status}'. Must be one of: {valid_statuses}"
        )

    try:
        client = get_supabase_client()

        # Try updating in project_recommendations table (may fail for non-DB IDs)
        try:
            client.table("project_recommendations").update({
                "status": req.status,
            }).eq("id", project_id).eq("user_id", req.user_id).execute()
        except Exception as db_err:
            print(f"[projects] DB update skipped (non-DB project): {db_err}")

        # Always update agent_state so readiness score reflects changes
        state = load_state(req.user_id)
        projects = state.get("project_recommendations") or []
        for p in projects:
            if p.get("id") == project_id:
                p["status"] = req.status
        state["project_recommendations"] = projects
        save_state(req.user_id, state, "project_status_update")

        return {"success": True, "status": req.status}

    except Exception as e:
        print(f"[projects] update_status failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Refresh project recommendations ──────────────────────────────────────────

@router.post("/refresh")
async def refresh_projects(req: RefreshRequest):
    """
    Re-run the project recommender from current state.
    Deletes old suggestions and inserts new ones.
    """
    try:
        import uuid
        client = get_supabase_client()
        state = load_state(req.user_id)

        if not state.get("skill_gap"):
            raise HTTPException(
                status_code=400,
                detail="Run the Copilot first to generate skill gap analysis."
            )

        # Generate new recommendations
        projects = recommend_projects(state)

        # Try DB operations (best-effort)
        saved_projects = []
        try:
            # Delete old recommendations
            client.table("project_recommendations").delete().eq(
                "user_id", req.user_id
            ).execute()

            # Insert new ones
            for project in projects:
                row = {
                    "user_id": req.user_id,
                    "title": project["title"],
                    "description": project["description"],
                    "tech_stack": project.get("tech_stack", []),
                    "step_by_step": project.get("step_by_step", []),
                    "skills_addressed": project.get("skills_addressed", []),
                    "difficulty": project.get("difficulty", "intermediate"),
                    "estimated_hours": project.get("estimated_hours", 20),
                    "why_this_project": project.get("why_this_project", ""),
                    "status": "suggested",
                }
                result = client.table("project_recommendations").insert(row).execute()
                if result.data:
                    saved_projects.append(result.data[0])
        except Exception as db_err:
            print(f"[projects] DB refresh failed, falling back to state: {db_err}")

        # If DB ops failed, use LLM output with generated UUIDs
        if not saved_projects:
            for project in projects:
                saved_projects.append({
                    "id": str(uuid.uuid4()),
                    **project,
                    "status": "suggested",
                })

        # Update agent_state
        state["project_recommendations"] = saved_projects
        save_state(req.user_id, state, "project_recommender_refresh")

        return {"success": True, "projects": saved_projects}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[projects] refresh failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
