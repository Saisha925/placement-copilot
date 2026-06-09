import json
from core.llm import get_llm
from langchain_core.messages import HumanMessage


def analyze_skill_gap(
    resume_analysis: dict,
    target_role: str,
    user_profile: dict | None,
    role_data: dict
) -> dict:
    """
    Compares resume skills against role requirements.
    Reads resume_analysis from shared state — no manual skill input needed.
    Categorises gaps so downstream agents (DSA, Interview, Projects) can read them directly.
    """
    llm = get_llm(temperature=0.3)

    # Extract what we already know from the resume agent
    resume_skills = resume_analysis.get("strengths", [])
    missing_from_resume = resume_analysis.get("missing_skills", [])
    ats_score = resume_analysis.get("ats_score", 0)

    # Role requirements from role_requirements.json
    required_skills = role_data.get("required_skills", [])
    preferred_skills = role_data.get("preferred_skills", [])

    # Deterministic matching — no LLM needed for this part
    resume_lower = [s.lower() for s in resume_skills]
    matched = [s for s in required_skills if any(s.lower() in r for r in resume_lower)]
    missing_required = list(set(
        [s for s in required_skills if s not in matched] + missing_from_resume
    ))

    readiness_pct = int(len(matched) / max(len(required_skills), 1) * 100)

    # Categorise missing skills for downstream agents
    dsa_keywords = ["dsa", "algorithm", "data structure", "leetcode",
                    "tree", "graph", "dynamic programming", "recursion", "sorting"]
    project_keywords = ["docker", "kubernetes", "fastapi", "django", "react",
                        "sql", "redis", "aws", "gcp", "azure", "mongodb", "kafka"]
    interview_keywords = ["system design", "oops", "dbms", "os",
                          "computer networks", "cn", "operating system"]

    dsa_priority_topics = [s for s in missing_required
                           if any(k in s.lower() for k in dsa_keywords)]
    project_gaps = [s for s in missing_required
                    if any(k in s.lower() for k in project_keywords)]
    interview_focus_areas = [s for s in missing_required
                             if any(k in s.lower() for k in interview_keywords)]

    # User context for personalised roadmap
    daily_hours = (user_profile or {}).get("daily_hours", 2)
    graduation_year = (user_profile or {}).get("graduation_year", "")
    cgpa = (user_profile or {}).get("cgpa", "")

    profile_context = ""
    if daily_hours:
        profile_context += f"Daily hours available: {daily_hours}\n"
    if graduation_year:
        profile_context += f"Graduation year: {graduation_year}\n"
    if cgpa:
        profile_context += f"CGPA: {cgpa}\n"

    # LLM generates the roadmap only — everything else is deterministic
    prompt = f"""You are an expert placement coach.
A student targeting {target_role} has these skill gaps:
Missing required skills: {', '.join(missing_required[:10])}
Current ATS score: {ats_score}/100

{profile_context}

Create a focused week-by-week preparation roadmap (max 6 weeks).
Return ONLY a JSON array, no explanation:
[
  {{
    "week": 1,
    "focus": "Topic name",
    "tasks": ["Task 1", "Task 2", "Task 3"],
    "resources": ["Resource 1", "Resource 2"],
    "goal": "What student should achieve by end of week"
  }}
]"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        roadmap = json.loads(text)
    except Exception as e:
        print(f"[skill_gap_agent] roadmap generation failed: {e}")
        roadmap = []

    return {
        "readiness_percentage": readiness_pct,
        "matched_skills": matched,
        "missing_required": missing_required,
        "missing_preferred": [s for s in preferred_skills if s not in matched],
        "dsa_priority_topics": dsa_priority_topics,    # → DSA Agent reads this
        "project_gaps": project_gaps,                  # → Project Recommender reads this
        "interview_focus_areas": interview_focus_areas, # → Interview Agent reads this
        "roadmap": roadmap,
    }