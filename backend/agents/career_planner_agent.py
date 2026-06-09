import json
from core.llm import get_llm
from langchain_core.messages import HumanMessage


def generate_career_plan(state: dict) -> dict:
    """
    Generates a personalised 30/60/90 day placement plan.
    Reads ALL agent outputs from shared state — fully context-aware.
    Uses 70b model for better reasoning quality on complex planning.
    """
    # Use smarter model for planning — this justifies the extra latency
    llm = get_llm(temperature=0.4, model="llama-3.3-70b-versatile")

    # Pull everything from shared state
    target_role = state.get("target_role", "Software Engineer")
    target_company = state.get("target_company")
    target_date = state.get("target_date")
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
    date_context = f"Target Placement Date: {target_date}" if target_date else ""
    cgpa_context = f"CGPA: {cgpa}" if cgpa else ""
    grad_context = f"Graduation Year: {graduation_year}" if graduation_year else ""

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

Create a realistic 30/60/90 day placement preparation plan calibrated to {daily_hours} hours/day.
Be specific — name actual topics, not vague advice.

Return ONLY valid JSON, no explanation:
{{
  "executive_summary": "2 sentence overview of the plan",
  "plan_30_day": [
    {{
      "week": 1,
      "focus_area": "Specific topic name",
      "daily_tasks": [
        {{"task": "Solve 3 easy array problems on LeetCode", "category": "dsa", "priority": "high"}},
        {{"task": "Read OS process scheduling notes", "category": "fundamentals", "priority": "medium"}}
      ],
      "milestone": "What student completes by end of this week",
      "estimated_daily_hours": {daily_hours}
    }}
  ],
  "plan_60_day": [
    {{
      "week": 5,
      "focus_area": "Specific topic name",
      "daily_tasks": [
        {{"task": "...", "category": "...", "priority": "..."}}
      ],
      "milestone": "...",
      "estimated_daily_hours": {daily_hours}
    }}
  ],
  "plan_90_day": [
    {{
      "week": 9,
      "focus_area": "Specific topic name",
      "daily_tasks": [
        {{"task": "...", "category": "...", "priority": "..."}}
      ],
      "milestone": "...",
      "estimated_daily_hours": {daily_hours}
    }}
  ],
  "key_priorities": ["Priority 1", "Priority 2", "Priority 3"],
  "risk_areas": ["Risk 1 with mitigation", "Risk 2 with mitigation"],
  "daily_schedule": {{
    "morning": "What to do in the morning session",
    "evening": "What to do in the evening session",
    "weekend": "What to do on weekends"
  }}
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        plan = json.loads(text)
    except Exception as e:
        print(f"[career_planner] generation failed: {e}")
        plan = {
            "executive_summary": "Plan generation failed. Please retry.",
            "plan_30_day": [],
            "plan_60_day": [],
            "plan_90_day": [],
            "key_priorities": [],
            "risk_areas": [],
            "daily_schedule": {}
        }

    return plan