from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from agents.dsa_agent import (
    log_problem, get_progress, get_problems,
    mark_for_revision, update_notes,
    generate_daily_plan, _recompute_progress,
)
from core.state_manager import load_state

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
        )

        # Save to dsa_progress
        updated_progress = _recompute_progress(req.user_id, daily_plan=daily_plan)
        updated_progress["daily_plan"] = daily_plan

        return {"success": True, "progress": updated_progress}
    except Exception as e:
        print(f"[dsa] refresh-plan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))