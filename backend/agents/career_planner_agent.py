import json
from datetime import date, timedelta
from core.llm import get_llm
from langchain_core.messages import HumanMessage
import re

def _extract_days_from_goal(goal: str) -> dict:
    """Extract duration from goal text using regex and convert to days. Returns dict with unit."""
    goal_lower = goal.lower()
    patterns = [
        (r'(\d+)\s*(?:week|wk)s?', 7, "weeks"),
        (r'(\d+)\s*(?:month|mo)s?', 30, "months"),
        (r'(\d+)\s*(?:year|yr)s?', 365, "years"),
        (r'(\d+)\s*(?:day)s?', 1, "days"),
    ]
    for pattern, multiplier, unit in patterns:
        match = re.search(pattern, goal_lower)
        if match:
            val = int(match.group(1))
            return {"value": val, "unit": unit, "total_days": val * multiplier}
    return {"value": 90, "unit": "unknown", "total_days": 90}

# ── Intensity configuration ───────────────────────────────────────────────────

def _compute_intensity(total_days: int, daily_hours: int) -> dict:
    """
    Compute plan intensity based on duration.
    Short durations → intensive/focused. Long durations → versatile/exploratory.
    """
    if total_days <= 21:
        return {
            "mode": "sprint",
            "label": "Sprint Mode 🔥",
            "phases": 3,
            "description": "Ruthlessly focused on highest-impact topics only",
            "prompt_instruction": (
                "This is a SPRINT plan. Be ruthlessly focused. ONLY the highest-impact topics.\n"
                "- Focus ONLY on: most-asked DSA patterns, core CS fundamentals (OOPs, DBMS, OS, CN), resume polish\n"
                "- Aim for 6-8 problems/day\n"
                "- Skip: system design deep dives, advanced projects, broad exploration\n"
                "- Every task must directly contribute to interview readiness"
            ),
            "problems_per_day": max(6, daily_hours * 3),
        }
    elif total_days <= 60:
        return {
            "mode": "focused",
            "label": "Focused Plan",
            "phases": 3,
            "description": "Balanced depth with interview-critical coverage",
            "prompt_instruction": (
                "This is a FOCUSED plan. Balance depth with coverage.\n"
                "- Cover: DSA (heavy), CS fundamentals, 1 portfolio project, interview prep\n"
                "- Aim for 3-5 problems/day\n"
                "- Prioritize interview-critical topics first\n"
                "- Include behavioral interview prep in later phases"
            ),
            "problems_per_day": max(3, daily_hours * 2),
        }
    elif total_days <= 120:
        return {
            "mode": "standard",
            "label": "Standard Plan",
            "phases": 3,
            "description": "Comprehensive placement preparation",
            "prompt_instruction": (
                "This is a STANDARD comprehensive plan.\n"
                "- Full coverage: DSA, CS fundamentals, 2 projects, system design intro, interview prep\n"
                "- Aim for 2-3 problems/day\n"
                "- Build strong foundations first, then specialize\n"
                "- Include mock interview practice sessions"
            ),
            "problems_per_day": max(2, daily_hours),
        }
    else:
        return {
            "mode": "marathon",
            "label": "Marathon Plan",
            "phases": 4,
            "description": "Long-horizon plan with exploration and depth",
            "prompt_instruction": (
                "This is a MARATHON long-horizon plan. Explore widely.\n"
                "- Versatile: DSA progression, CS deep dives, 2-3 projects, system design, mock interviews\n"
                "- Aim for 2 problems/day\n"
                "- Include competitive programming, open source contributions\n"
                "- Reserve the LAST 30 days for intensive interview sprint mode"
            ),
            "problems_per_day": max(2, daily_hours),
        }


# Phase calculation removed.


# ── Main plan generation ──────────────────────────────────────────────────────

def generate_career_plan(state: dict) -> dict:
    """
    Generates a personalised placement plan.
    - If target_date is provided: calculates exact duration, applies intensity calibration
    - If no target_date: defaults to 90 days with standard 30/60/90 format
    Reads ALL agent outputs from shared state — fully context-aware.
    Uses standard model for plan generation to prevent timeout truncation
    """
    llm = get_llm(temperature=0.4, model="llama-3.3-70b-versatile", max_tokens=4096, json_mode=True)

    # Pull everything from shared state
    target_role = state.get("target_role", "Software Engineer")
    target_company = state.get("target_company")
    target_date_str = state.get("target_date")
    user_profile = state.get("user_profile") or {}

    resume_analysis = state.get("resume_analysis") or {}
    skill_gap = state.get("skill_gap") or {}

    ats_score = resume_analysis.get("ats_score", 0)
    missing_skills = skill_gap.get("missing_required", [])[:8]
    dsa_weak = skill_gap.get("dsa_priority_topics", [])[:5]
    interview_focus = skill_gap.get("interview_focus_areas", [])[:4]
    readiness = state.get("readiness_score", 0)

    daily_hours = user_profile.get("daily_hours", 2)
    cgpa = user_profile.get("cgpa", "")
    graduation_year = user_profile.get("graduation_year", "")

    # Feedback loop — adjust plan if interview scores are low
    feedback_triggers = state.get("feedback_triggers", [])
    adaptations = ""
    for trigger in feedback_triggers:
        if trigger.get("type") == "low_interview_score":
            adaptations += f"\nCRITICAL: {trigger['area']} score is {trigger['value']}% — add intensive practice sessions."
        if trigger.get("type") == "low_communication":
            adaptations += "\nCRITICAL: Add daily behavioral/HR question practice."

    company_context = f"Target Company: {target_company}" if target_company else ""
    cgpa_context = f"CGPA: {cgpa}" if cgpa else ""
    grad_context = f"Graduation Year: {graduation_year}" if graduation_year else ""

    # ── Compute duration and intensity ────────────────────────────────────
    today = date.today()
    user_goal = state.get("user_goal", "")

    if target_date_str:
        try:
            target_dt = date.fromisoformat(target_date_str)
            total_days = max(7, (target_dt - today).days)
            extracted = {"total_days": total_days, "unit": "days", "value": total_days}
        except Exception:
            target_date_str = None
            extracted = _extract_days_from_goal(user_goal)
    else:
        extracted = _extract_days_from_goal(user_goal)
    
    total_days = max(7, extracted["total_days"])

    intensity = _compute_intensity(total_days, daily_hours)

    if total_days > 60:
        plan_format = "weekly_summary"
    elif extracted["unit"] in ["weeks", "months", "years"]:
        plan_format = "weeks"
    else:
        plan_format = "days"

    date_context = f"Target Date: {target_date_str}" if target_date_str else ""

    # ── Build the prompt ──────────────────────────────────────────────────

    if plan_format == "days":
        format_rules = (
            "5. Generate a DAILY planner. You must generate EXACTLY one JSON object for each day, up to the total days.\n"
            "6. Each day has real calendar dates starting from today, with 'morning' and 'evening' splits."
        )
        schema_snippet = """
  "executive_summary": "short overview",
  "key_priorities": ["p1", "p2", "p3"],
  "risk_areas": ["r1", "r2"],
  "daily_schedule": {"morning": "...", "evening": "...", "weekend": "..."},
  "format": "days",
  "days": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "day_label": "Monday",
      "morning": {"task": "short task", "category": "dsa", "priority": "high", "topics": ["t1", "t2"]},
      "evening": {"task": "short task", "category": "fundamentals", "priority": "medium", "topics": ["t1"]},
      "resources": [{"title": "name", "type": "video", "url": "https://...", "platform": "YouTube"}]
    }
  ]"""
    elif plan_format == "weeks":
        format_rules = (
            "5. Generate a WEEKLY planner. You must generate an array of 'weeks'.\n"
            "6. Inside each week, you MUST include EXACTLY 7 days in the 'days' array, with real calendar dates starting from today, with 'morning' and 'evening' splits."
        )
        schema_snippet = """
  "executive_summary": "short overview",
  "key_priorities": ["p1", "p2", "p3"],
  "risk_areas": ["r1", "r2"],
  "daily_schedule": {"morning": "...", "evening": "...", "weekend": "..."},
  "format": "weeks",
  "weeks": [
    {
      "week": 1,
      "focus_area": "topic area",
      "days": [
        {
          "day_number": 1,
          "date": "YYYY-MM-DD",
          "day_label": "Monday",
          "morning": {"task": "short task", "category": "dsa", "priority": "high", "topics": ["t1"]},
          "evening": {"task": "short task", "category": "fundamentals", "priority": "medium", "topics": ["t1"]},
          "resources": [{"title": "name", "type": "video", "url": "https://...", "platform": "YouTube"}]
        }
      ],
      "milestone": "short milestone"
    }
  ]"""
    else: # weekly_summary
        format_rules = (
            "5. Generate a WEEKLY SUMMARY planner. Because the timeline is long (>60 days), DO NOT generate individual days.\n"
            "6. Inside each week, provide a high-level summary of what must be accomplished that week, with an array of weekly_tasks."
        )
        schema_snippet = """
  "executive_summary": "short overview",
  "key_priorities": ["p1", "p2", "p3"],
  "risk_areas": ["r1", "r2"],
  "daily_schedule": {"morning": "...", "evening": "...", "weekend": "..."},
  "format": "weekly_summary",
  "weeks": [
    {
      "week": 1,
      "focus_area": "topic area",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "weekly_tasks": [
        {"task": "short task", "category": "dsa", "priority": "high", "topics": ["t1"], "resources": [{"title": "name", "type": "video", "url": "https://...", "platform": "YouTube"}]}
      ],
      "milestone": "short milestone"
    }
  ]"""

    prompt = f"""You are an expert placement preparation coach at a top engineering college.

Student Profile:
- Target Role: {target_role}
{company_context}
{date_context}
{cgpa_context}
{grad_context}
- Daily hours available: {daily_hours}
- Current readiness score: {readiness}/100
- ATS Score: {ats_score}/100

Skill Gaps to address:
- Missing required skills: {', '.join(missing_skills) if missing_skills else 'None identified'}
- DSA weak areas: {', '.join(dsa_weak) if dsa_weak else 'None identified'}
- Interview focus areas: {', '.join(interview_focus) if interview_focus else 'None identified'}
{adaptations}

Plan Duration: {total_days} days (from {today.isoformat()} to {(today + timedelta(days=total_days)).isoformat()})
Intensity: {intensity['mode'].upper()} — {intensity['description']}
Problems per day target: {intensity['problems_per_day']}

{intensity['prompt_instruction']}

Create a realistic {total_days}-day placement preparation plan calibrated to {daily_hours} hours/day.

IMPORTANT RULES:
1. Be SPECIFIC — name actual topics and techniques, not vague advice.
2. Every task needs a "topics" array (2-3 items).
3. Generate EXACTLY 2-3 high-quality resources per task (under 'resources' array). Resources must use real direct URLs (LeetCode, GFG, YouTube).
4. Cover DSA, OOPs, OS, DBMS, CN, System Design as appropriate.
{format_rules}
7. KEEP TEXT EXTREMELY SHORT. Task descriptions under 10 words. Minimize output size to avoid hitting computing limits.

Return ONLY valid JSON matching this schema:
{{
{schema_snippet}
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        print(f"[career_planner] Raw LLM output length: {len(text)} chars")
        plan = json.loads(text)

        # Ensure format field exists
        if "format" not in plan:
            plan["format"] = plan_format
        
        plan["total_days"] = total_days
        plan["intensity"] = intensity["mode"]
        
        plan["start_date"] = today.isoformat()
        plan["end_date"] = (today + timedelta(days=total_days)).isoformat()

    except Exception as first_err:
        print(f"[career_planner] first attempt failed: {first_err}")
        print("[career_planner] retrying without json_mode...")

        # Retry without strict json_mode — allows partial recovery
        try:
            llm_retry = get_llm(temperature=0.4, model="llama-3.3-70b-versatile", max_tokens=4096, json_mode=False)
            response = llm_retry.invoke([HumanMessage(content=prompt)])
            text = response.content.strip()
            # Extract JSON from possible markdown wrapping
            if "```json" in text:
                text = text.split("```json", 1)[1]
            if "```" in text:
                text = text.split("```", 1)[0]
            text = text.strip()
            print(f"[career_planner] Retry output length: {len(text)} chars")
            plan = json.loads(text)

            # Ensure format field exists
            if "format" not in plan:
                plan["format"] = plan_format
            
            plan["total_days"] = total_days
            plan["intensity"] = intensity["mode"]
            
            plan["start_date"] = today.isoformat()
            plan["end_date"] = (today + timedelta(days=total_days)).isoformat()

        except Exception as e:
            print(f"[career_planner] generation failed: {e}")
            plan = {
                "total_days": total_days,
                "intensity": intensity["mode"],
                "start_date": today.isoformat(),
                "end_date": (today + timedelta(days=total_days)).isoformat(),
                "executive_summary": "Plan generation failed. Please retry.",
                "key_priorities": [],
                "risk_areas": [],
                "daily_schedule": {}
            }
    return plan