from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from agents.dsa_agent import (
    log_problem, get_progress, get_problems,
    mark_for_revision, update_notes,
    generate_daily_plan, _recompute_progress,
    sync_from_career_plan
)
from core.state_manager import load_state
from core.database import get_supabase_client

router = APIRouter()


class LogProblemRequest(BaseModel):
    user_id: str
    topic: str
    problem_name: str
    difficulty: str
    platform: Optional[str] = "LeetCode"
    time_taken_mins: Optional[int] = None
    notes: Optional[str] = None
    is_revision: Optional[bool] = False


class RevisionRequest(BaseModel):
    user_id: str
    problem_id: str
    revision: bool


class NotesRequest(BaseModel):
    user_id: str
    problem_id: str
    notes: Optional[str] = None
    mistakes: Optional[str] = None


class RefreshPlanRequest(BaseModel):
    user_id: str
    custom_prompt: Optional[str] = None
    mode: str = "custom"
    duration_days: int = 7
    specific_topics: Optional[list[str]] = None


# ── Log a solved problem ──────────────────────────────────────────────────────

@router.post("/log")
async def log_dsa_problem(req: LogProblemRequest):
    """Log a solved problem and get updated progress."""
    try:
        progress = log_problem(
            req.user_id,
            req.topic,
            req.problem_name,
            req.difficulty,
            req.platform,
            req.time_taken_mins,
            req.notes,
            req.is_revision,
        )
        return {"success": True, "progress": progress}
    except ValueError as e:
        # Duplicate limit reached — 409 Conflict
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Get progress ──────────────────────────────────────────────────────────────

@router.get("/progress/{user_id}")
async def get_dsa_progress(user_id: str):
    """Get current DSA progress for a user."""
    try:
        return get_progress(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Get all logged problems ───────────────────────────────────────────────────

@router.get("/problems/{user_id}")
async def get_dsa_problems(user_id: str):
    """Get all logged problems for a user (newest first)."""
    try:
        problems = get_problems(user_id)
        return {"problems": problems}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Toggle revision mark ─────────────────────────────────────────────────────

@router.patch("/revision")
async def toggle_revision(req: RevisionRequest):
    """Mark or unmark a problem for revision."""
    try:
        result = mark_for_revision(req.user_id, req.problem_id, req.revision)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Update notes/mistakes ────────────────────────────────────────────────────

@router.patch("/notes")
async def update_problem_notes(req: NotesRequest):
    """Update notes and/or mistakes for a logged problem."""
    try:
        result = update_notes(req.user_id, req.problem_id, req.notes, req.mistakes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Refresh DSA plan independently ────────────────────────────────────────────

@router.post("/refresh-plan")
async def refresh_dsa_plan(req: RefreshPlanRequest):
    """
    Regenerate the daily DSA plan without re-running the full Copilot.
    Reads agent_state for context, excludes already-solved problems.
    """
    try:
        # Load state for context (skill_gap, career_plan, user_profile)
        state = load_state(req.user_id)

        skill_gap = state.get("skill_gap") or {}
        skill_gap_priorities = skill_gap.get("dsa_priority_topics", [])

        career_plan_week = {}
        if cp := state.get("career_plan"):
            plan_format = cp.get("format")
            if plan_format == "days":
                career_plan_week = {"days": cp.get("days", [])[:7]}
            elif plan_format == "weeks" and cp.get("weeks"):
                career_plan_week = cp["weeks"][0]
            elif plan_format == "weekly_summary" and cp.get("weeks"):
                career_plan_week = cp["weeks"][0]
            else:
                weeks = cp.get("plan_30_day", [])
                if weeks:
                    career_plan_week = weeks[0]

        # Get existing progress for weak topics
        progress = get_progress(req.user_id)
        weak_topics = progress.get("weak_topics", [])

        # Get solved problem names for exclusion
        all_problems = get_problems(req.user_id)
        solved_names = list({p["problem_name"] for p in all_problems})

        # Generate fresh plan
        daily_plan = generate_daily_plan(
            weak_topics,
            skill_gap_priorities,
            career_plan_week,
            state.get("user_profile"),
            target_date=state.get("target_date"),
            solved_problems=solved_names,
            custom_prompt=req.custom_prompt,
            plan_duration_days=req.duration_days,
            specific_topics=req.specific_topics,
            mode=req.mode
        )

        # Upsert entries to dsa_calendar_entries
        client = get_supabase_client()
        for entry in daily_plan.get("calendar_entries", []):
            entry["user_id"] = req.user_id
            entry["source"] = req.mode
            client.table("dsa_calendar_entries").delete().eq("user_id", req.user_id).eq("date", entry["date"]).eq("source", req.mode).execute()
            client.table("dsa_calendar_entries").insert(entry).execute()

        # Save legacy progress too just in case
        updated_progress = _recompute_progress(req.user_id, daily_plan=daily_plan)
        updated_progress["daily_plan"] = daily_plan

        return {"success": True, "progress": updated_progress, "plan": daily_plan}
    except Exception as e:
        print(f"[dsa] refresh-plan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SyncPlanRequest(BaseModel):
    user_id: str

@router.post("/sync-career-plan")
async def sync_career_plan(req: SyncPlanRequest):
    """Sync DSA tasks from the user's career plan to the DSA calendar."""
    try:
        state = load_state(req.user_id)
        career_plan = state.get("career_plan")
        if not career_plan:
            return {"success": False, "message": "No career plan found"}
        
        result = sync_from_career_plan(req.user_id, career_plan)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calendar/{user_id}")
async def get_dsa_calendar(user_id: str):
    """Fetch calendar entries for a user."""
    try:
        client = get_supabase_client()
        result = client.table("dsa_calendar_entries").select("*").eq("user_id", user_id).order("date").execute()
        return {"success": True, "entries": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SolveCalendarProblemRequest(BaseModel):
    user_id: str
    date: str
    problem_name: str
    source: str = "custom"
    time_taken_mins: Optional[int] = None

@router.post("/calendar/solve")
async def solve_calendar_problem(req: SolveCalendarProblemRequest):
    """Mark a problem in a calendar entry as solved and log it."""
    try:
        client = get_supabase_client()
        # Find the entry
        result = client.table("dsa_calendar_entries").select("*").eq("user_id", req.user_id).eq("date", req.date).eq("source", req.source).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Calendar entry not found")
            
        entry = result.data[0]
        problems = entry.get("problems", [])
        topic = entry.get("topic", "General")
        
        updated = False
        difficulty = "medium"
        for p in problems:
            if p.get("problem") == req.problem_name:
                p["solved"] = True
                difficulty = p.get("difficulty", "medium")
                updated = True
                
        if updated:
            # Update the entry
            client.table("dsa_calendar_entries").update({"problems": problems}).eq("id", entry["id"]).execute()
            
            # Log it to dsa_problems
            try:
                log_problem(
                    req.user_id,
                    topic,
                    req.problem_name,
                    difficulty,
                    "LeetCode",
                    req.time_taken_mins
                )
            except ValueError:
                pass # Already logged, that's fine
                
        return {"success": True, "problems": problems}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))