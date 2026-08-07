import json
from core.llm import get_llm
from langchain_core.messages import HumanMessage
from agents.resource_agent import fetch_resources


def recommend_projects(state: dict) -> list:
    """
    Generate 3 tailored portfolio project recommendations.
    Reads skill_gap.project_gaps from state; falls back to missing_required.
    """
    skill_gap = state.get("skill_gap") or {}
    target_role = state.get("target_role", "Software Engineer")
    user_profile = state.get("user_profile") or {}

    # Primary: project-specific gaps; fallback: all missing skills
    project_gaps = skill_gap.get("project_gaps", [])
    if not project_gaps:
        project_gaps = skill_gap.get("missing_required", [])

    if not project_gaps:
        project_gaps = ["React", "Node.js", "REST API"]

    # User context
    daily_hours = user_profile.get("daily_hours", 2)
    graduation_year = user_profile.get("graduation_year", "")

    profile_context = ""
    if daily_hours:
        profile_context += f"Daily hours available: {daily_hours}\n"
    if graduation_year:
        profile_context += f"Graduation year: {graduation_year}\n"

    # Resume strengths for smarter recommendations
    resume_analysis = state.get("resume_analysis") or {}
    existing_skills = resume_analysis.get("strengths", [])

    llm = get_llm(temperature=0.5)

    prompt = f"""You are a senior engineering mentor helping a student build portfolio projects for placement interviews.

Target role: {target_role}
Skill gaps to address: {', '.join(project_gaps[:10])}
Skills the student already has: {', '.join(existing_skills[:10])}
{profile_context}

Generate exactly 3 portfolio projects that:
1. Directly address the skill gaps listed above
2. Are extremely UNIQUE, INNOVATIVE, and out-of-the-box. Do NOT recommend standard CRUD apps, generic to-do lists, or basic chat apps.
3. Think about cutting-edge technologies or interesting niches (e.g., AI tools, Web3, creative coding, devtools, IoT integrations, complex data visualizations).
4. Progress in difficulty (beginner → intermediate → advanced)
5. Can realistically be completed by a student but look very impressive.

Return ONLY valid JSON — an array of 3 objects:
[
  {{
    "title": "Project Name",
    "description": "2-3 sentence description of what the project does and why it's highly innovative.",
    "tech_stack": ["Tech1", "Tech2", "Tech3"],
    "step_by_step": [
      "Step 1: ...",
      "Step 2: ..."
    ],
    "skills_addressed": ["Skill1", "Skill2"],
    "difficulty": "beginner",
    "estimated_hours": 15,
    "why_this_project": "One sentence explaining why this project stands out to recruiters.",
    "inspiration_keywords": "github open source project name to search for inspiration"
  }}
]

Difficulty must be one of: beginner, intermediate, advanced.
Each project should have 5-8 clear steps.
estimated_hours should be realistic (10-40 hours range).
CRITICAL: The projects must be innovative. Avoid generic projects at all costs."""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        projects = json.loads(text)

        # Validate structure
        if not isinstance(projects, list) or len(projects) == 0:
            raise ValueError("LLM returned invalid project list")

        # Ensure all required fields exist
        required_fields = [
            "title", "description", "tech_stack", "step_by_step",
            "skills_addressed", "difficulty", "estimated_hours", "why_this_project"
        ]
        for project in projects:
            for field in required_fields:
                if field not in project:
                    raise ValueError(f"Missing field: {field}")
            
            # Fetch inspiration link
            try:
                search_query = project.get("inspiration_keywords", project["title"]) + " github repository"
                resources = fetch_resources(search_query, category="general", max_results=1)
                if resources:
                    project["inspiration_link"] = resources[0]["url"]
                else:
                    project["inspiration_link"] = f"https://github.com/search?q={project['title'].replace(' ', '+')}"
            except Exception:
                project["inspiration_link"] = ""

        return projects[:3]

    except Exception as e:
        print(f"[project_recommender] LLM generation failed: {e}")
        return _fallback_projects(project_gaps, target_role)


def _fallback_projects(gaps: list, target_role: str) -> list:
    """Hardcoded fallback projects when LLM fails."""
    return [
        {
            "title": "AI-Powered Resume Analyzer",
            "description": "A web app that takes a PDF resume and a job description, then uses an LLM API to score the match and suggest missing keywords. Highly relevant to HR tech.",
            "tech_stack": ["React", "FastAPI", "OpenAI API", "PyPDF2"],
            "step_by_step": [
                "Set up React frontend and FastAPI backend",
                "Implement PDF upload and text extraction in Python",
                "Integrate with OpenAI API to analyze text against JD",
                "Build a scoring algorithm based on keyword matches",
                "Create a dashboard to visualize score and missing skills",
                "Deploy backend to Render and frontend to Vercel"
            ],
            "skills_addressed": gaps[:3] if gaps else ["React", "Python", "AI Integration"],
            "difficulty": "beginner",
            "estimated_hours": 15,
            "why_this_project": f"Shows you can integrate modern AI tools into practical web applications.",
            "inspiration_link": "https://github.com/search?q=resume+analyzer+ai"
        },
        {
            "title": "Distributed Task Queue Visualizer",
            "description": "A real-time dashboard that visualizes background jobs processing across multiple workers, simulating a distributed system. Includes intentional failure handling.",
            "tech_stack": ["Node.js", "Redis", "BullMQ", "React", "Socket.io"],
            "step_by_step": [
                "Set up a Redis instance and BullMQ for task queueing",
                "Create a producer script that generates random jobs (e.g. image processing, emails)",
                "Create multiple worker nodes that process and occasionally fail jobs",
                "Build an Express API to expose queue stats",
                "Implement WebSocket connection to push live updates to the frontend",
                "Build a React dashboard to visualize queue length, active workers, and failure rates",
                "Dockerize the entire setup"
            ],
            "skills_addressed": gaps[:3] if gaps else ["Redis", "Distributed Systems", "WebSockets"],
            "difficulty": "intermediate",
            "estimated_hours": 25,
            "why_this_project": f"Proves you understand asynchronous processing and distributed architectures, a must for {target_role}.",
            "inspiration_link": "https://github.com/search?q=bullmq+dashboard+react"
        },
        {
            "title": "Git Internal Visualizer / Clone",
            "description": "A CLI tool built from scratch that implements core Git commands (init, add, commit, log) to demonstrate deep understanding of hashes, trees, and blobs.",
            "tech_stack": ["Python", "CLI Design", "Hashing (SHA-1)", "File I/O"],
            "step_by_step": [
                "Implement the 'init' command to create the .mygit directory structure",
                "Implement the 'hash-object' command to store file contents as blobs",
                "Implement the 'add' command to stage files to an index",
                "Implement the 'commit' command to create tree objects and commit objects",
                "Implement the 'log' command to traverse the commit history",
                "Write extensive unit tests for core hashing and tree logic"
            ],
            "skills_addressed": gaps[:3] if gaps else ["Python", "System Design", "Low-level Concepts"],
            "difficulty": "advanced",
            "estimated_hours": 40,
            "why_this_project": f"Rebuilding standard developer tools from scratch shows incredible depth of knowledge for a {target_role}.",
            "inspiration_link": "https://github.com/search?q=build+git+from+scratch"
        },
    ]
