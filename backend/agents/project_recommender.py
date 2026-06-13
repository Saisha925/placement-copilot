import json
from core.llm import get_llm
from langchain_core.messages import HumanMessage


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
2. Are impressive enough for placement interviews
3. Progress in difficulty (beginner → intermediate → advanced)
4. Use real-world technologies companies actually care about
5. Can realistically be completed by a student

Return ONLY valid JSON — an array of 3 objects:
[
  {{
    "title": "Project Name",
    "description": "2-3 sentence description of what the project does and why it's impressive",
    "tech_stack": ["React", "Node.js", "MongoDB"],
    "step_by_step": [
      "Step 1: Set up the project with Create React App and Express backend",
      "Step 2: Design the database schema",
      "Step 3: Build the REST API endpoints",
      "Step 4: Create the frontend components",
      "Step 5: Add authentication",
      "Step 6: Deploy to Vercel/Railway"
    ],
    "skills_addressed": ["React", "Node.js", "REST API"],
    "difficulty": "beginner",
    "estimated_hours": 15,
    "why_this_project": "One sentence explaining why this project specifically helps with the target role"
  }}
]

Difficulty must be one of: beginner, intermediate, advanced.
Each project should have 5-8 clear steps.
estimated_hours should be realistic (10-40 hours range)."""

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

        return projects[:3]

    except Exception as e:
        print(f"[project_recommender] LLM generation failed: {e}")
        return _fallback_projects(project_gaps, target_role)


def _fallback_projects(gaps: list, target_role: str) -> list:
    """Hardcoded fallback projects when LLM fails."""
    return [
        {
            "title": "Personal Portfolio Website",
            "description": "A responsive portfolio website showcasing your projects, skills, and resume. Includes dark mode, animations, and a contact form with email integration.",
            "tech_stack": ["React", "Tailwind CSS", "Framer Motion", "EmailJS"],
            "step_by_step": [
                "Set up React project with Vite and Tailwind CSS",
                "Design the layout — hero, about, projects, contact sections",
                "Build reusable components (Navbar, ProjectCard, Footer)",
                "Add smooth scroll and page transitions with Framer Motion",
                "Integrate contact form with EmailJS",
                "Deploy to Vercel with custom domain"
            ],
            "skills_addressed": gaps[:3] if gaps else ["React", "CSS", "Deployment"],
            "difficulty": "beginner",
            "estimated_hours": 12,
            "why_this_project": f"Every {target_role} needs a portfolio — this proves you can ship a polished frontend."
        },
        {
            "title": "Task Management API",
            "description": "A full-featured REST API with user authentication, CRUD operations, role-based access control, and real-time notifications. Includes Swagger docs and automated tests.",
            "tech_stack": ["Node.js", "Express", "PostgreSQL", "JWT", "Jest"],
            "step_by_step": [
                "Initialize Express project with TypeScript",
                "Design PostgreSQL schema for users, tasks, and teams",
                "Build CRUD endpoints for tasks with validation",
                "Add JWT-based authentication and role middleware",
                "Write integration tests with Jest and Supertest",
                "Add Swagger/OpenAPI documentation",
                "Deploy to Railway with CI/CD pipeline"
            ],
            "skills_addressed": gaps[:3] if gaps else ["Backend", "SQL", "Authentication"],
            "difficulty": "intermediate",
            "estimated_hours": 20,
            "why_this_project": f"Backend API design is a core skill for {target_role} — this covers auth, testing, and deployment."
        },
        {
            "title": "Real-time Chat Application",
            "description": "A Slack-like chat app with channels, direct messages, file sharing, and online presence indicators. Uses WebSockets for real-time communication and Redis for session management.",
            "tech_stack": ["React", "Socket.io", "Node.js", "Redis", "MongoDB"],
            "step_by_step": [
                "Set up React frontend and Express + Socket.io backend",
                "Design MongoDB schemas for users, channels, and messages",
                "Implement real-time messaging with Socket.io rooms",
                "Add user authentication and session management with Redis",
                "Build channel management (create, join, leave)",
                "Add file upload with cloud storage (S3 or Cloudinary)",
                "Implement typing indicators and online presence",
                "Deploy with Docker Compose"
            ],
            "skills_addressed": gaps[:3] if gaps else ["WebSockets", "Redis", "System Design"],
            "difficulty": "advanced",
            "estimated_hours": 35,
            "why_this_project": f"Real-time systems and infrastructure are interview gold for {target_role} roles."
        },
    ]
