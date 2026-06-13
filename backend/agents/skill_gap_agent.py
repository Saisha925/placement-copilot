import json
from core.llm import get_llm
from langchain_core.messages import HumanMessage
from tools.rag_tools import search_knowledge_base


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

    # We will use the LLM for semantic matching instead of deterministic substring matching,
    # because "DSA" matches "Data Structures" semantically but not deterministically.


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

    # RAG lookup for resources
    rag_resources = []
    if missing_from_resume:
        query = " ".join(missing_from_resume[:3]) # take top 3 missing to query
        rag_resources = search_knowledge_base.invoke({"query": query, "subject": "all", "top_k": 3})

    prompt = f"""You are an expert placement coach.
A student targeting {target_role} has these skills extracted from their resume: {', '.join(resume_skills)}
The target role has these REQUIRED skills: {', '.join(required_skills)}
The target role has these PREFERRED skills: {', '.join(preferred_skills)}

Here is some internal verified knowledge you can use to recommend resources:
{chr(10).join(rag_resources)}


Task 1: Semantic Skill Match
Determine which required and preferred skills the student ALREADY possesses based on their resume skills. Understand semantic equivalents (e.g., "DSA" = "Data Structures", "OOP" = "OOPs", "Node" = "Node.js").
Output the exact names from the required/preferred lists that are matched.

Task 2: Skill Gap Analysis
Identify the missing required and preferred skills.

Task 3: Roadmap
Create a focused week-by-week preparation roadmap (max 6 weeks) focusing on the missing REQUIRED skills.

Current ATS score: {ats_score}/100
{profile_context}

Return ONLY a JSON object with this exact structure, no markdown, no explanation:
{{
  "matched_skills": ["List of matched required/preferred skills"],
  "missing_required": ["List of missing required skills"],
  "missing_preferred": ["List of missing preferred skills"],
  "roadmap": [
    {{
      "week": 1,
      "focus": "Topic name",
      "tasks": ["Task 1", "Task 2", "Task 3"],
      "resources": ["Resource 1", "Resource 2"],
      "goal": "What student should achieve by end of week"
    }}
  ]
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        
        matched = result.get("matched_skills", [])
        missing_required = result.get("missing_required", required_skills)
        missing_preferred = result.get("missing_preferred", preferred_skills)
        roadmap = result.get("roadmap", [])
    except Exception as e:
        print(f"[skill_gap_agent] roadmap generation failed: {e}")
        matched = []
        missing_required = required_skills
        missing_preferred = preferred_skills
        roadmap = []

    # Calculate percentage based on required skills matched
    required_matched = [s for s in matched if s in required_skills]
    readiness_pct = int(len(required_matched) / max(len(required_skills), 1) * 100)

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

    return {
        "readiness_percentage": readiness_pct,
        "matched_skills": matched,
        "missing_required": missing_required,
        "missing_preferred": missing_preferred,
        "dsa_priority_topics": dsa_priority_topics,    # → DSA Agent reads this
        "project_gaps": project_gaps,                  # → Project Recommender reads this
        "interview_focus_areas": interview_focus_areas, # → Interview Agent reads this
        "roadmap": roadmap,
    }