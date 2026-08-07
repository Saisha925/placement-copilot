import json
from core.llm import get_llm
from langchain_core.messages import HumanMessage
from tools.rag_tools import search_knowledge_base
import os

def generate_prep_kit(state: dict) -> dict:
    """
    Generates a tailored interview prep guide based on the user's skill gaps.
    This runs as a node in the Copilot graph.
    """
    skill_gap = state.get("skill_gap") or {}
    focus_areas = skill_gap.get("interview_focus_areas", [])
    target_role = state.get("target_role", "Software Engineer")
    
    if not focus_areas:
        focus_areas = ["System Design", "Behavioral", "Data Structures"]

    llm = get_llm(temperature=0.5)

    prompt = f"""You are an expert technical interviewer.
A candidate for a {target_role} role needs to prepare for interviews.
Based on their skill gaps, they need to focus on these areas: {', '.join(focus_areas)}

Generate a structured interview prep kit.
Return ONLY valid JSON with this structure:
{{
  "focus_areas": [
    {{
      "topic": "Topic Name",
      "tips": ["Tip 1", "Tip 2"],
      "common_questions": ["Question 1", "Question 2"]
    }}
  ],
  "general_tips": ["Tip 1", "Tip 2", "Tip 3"]
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        kit = json.loads(text)
        return kit
    except Exception as e:
        print(f"[interview_agent] prep kit generation failed: {e}")
        return {
            "focus_areas": [{"topic": area, "tips": ["Review basics"], "common_questions": ["What is " + area + "?"]} for area in focus_areas],
            "general_tips": ["Stay calm", "Think out loud", "Clarify requirements"]
        }

def generate_questions(resume_text: str, target_role: str, round_type: str, experience_level: str = "Student / Fresher", target_company: str = None, past_questions: list = None) -> list:
    """
    Generates 3-5 interview questions tailored to the user's resume, target role, round type, and experience level.
    Supports round types: 'HR / Behavioral', 'Technical', 'System Design', 'Resume'.
    """
    llm = get_llm(temperature=0.7)
    
    company_context = ""
    if target_company:
        try:
            profile_path = os.path.join(os.path.dirname(__file__), "..", "config", "company_profiles.json")
            if os.path.exists(profile_path):
                with open(profile_path, "r") as f:
                    profiles = json.load(f)
                company_culture = profiles.get(target_company)
            else:
                company_culture = None
                
            if company_culture:
                company_context = f"\nThe target company is {target_company}. Their interview culture is known to be: {company_culture}. Tailor your questions heavily to reflect this exact culture and expectation."
            else:
                company_context = f"\nThe target company is {target_company}. Use your pre-trained knowledge to infer this company's unique engineering culture, values, and interview style, and tailor the questions to heavily reflect it."
        except Exception:
            company_context = f"\nThe target company is {target_company}. Tailor the questions to match this company's culture."

    # ── Round-specific prompts ────────────────────────────────────────────

    round_instructions = ""

    if round_type == "Technical":
        round_instructions = f"""
For this 'Technical' round, ask questions from core CS domains. 
Pick 1 question from EACH of 3 DIFFERENT domains from this list:

MANDATORY DOMAINS TO COVER:
- OOPs: 4 pillars of OOP, SOLID principles, design patterns, abstraction vs interface,
  inheritance vs composition, method overloading vs overriding, encapsulation examples
- DSA: Time/space complexity analysis, explain your approach to solving a problem,
  when to use which data structure, BFS vs DFS tradeoffs, sorting algorithm comparisons,
  hash table internals, tree traversals, dynamic programming approach
- DBMS & SQL: Normalization (1NF, 2NF, 3NF, BCNF), ACID properties, indexing types,
  SQL JOINs, write SQL queries, transactions, NoSQL vs SQL tradeoffs, ER diagrams
- Operating Systems: Process vs thread, deadlocks (conditions + prevention), memory management,
  paging vs segmentation, CPU scheduling algorithms, virtual memory, mutex vs semaphore
- Computer Networks: OSI layers, TCP vs UDP, HTTP methods and status codes, DNS resolution,
  REST vs GraphQL, WebSockets, how does HTTPS work, load balancing, CDN
- Programming Languages: Language-specific questions based on the resume skills
  (Java: JVM internals, garbage collection, collections framework;
   Python: GIL, decorators, generators, list vs tuple;
   JavaScript: event loop, closures, prototypal inheritance, promises vs async/await;
   C++: pointers vs references, virtual functions, RAII, STL)
- ML / Deep Learning (if relevant to the target role): Bias-variance tradeoff,
  overfitting solutions, gradient descent variants, CNN vs RNN,
  precision vs recall vs F1, regularization (L1/L2), backpropagation

QUESTION STYLE — ask questions like these:
- "What are the 4 pillars of OOP? Explain each with a real-world example."
- "You have an unsorted array of integers. Walk me through how you'd find the kth largest element. What data structure would you use and why?"
- "Write a SQL query to find the second highest salary from an Employee table."
- "Explain what happens step-by-step when you type a URL in the browser and press Enter."
- "What is a deadlock? Name the 4 necessary conditions and how would you prevent it?"
- "Explain the difference between ArrayList and LinkedList in Java. When would you use each?"

DO NOT ask behavioral, situational, or personality questions in this round.
DO NOT ask vague questions like "Tell me about a technical challenge". Ask SPECIFIC CS concept questions.

{f"Use these reference materials for accuracy:\\n{chr(10).join(search_knowledge_base.invoke({'query': target_role + ' interview questions', 'subject': 'all', 'top_k': 3}))}" if True else ""}
"""

    elif round_type == "Resume":
        resume_snippet = resume_text[:3000] if resume_text else ""
        round_instructions = f"""
For this 'Resume' round, ask questions DIRECTLY based on the candidate's resume content.

CANDIDATE'S RESUME:
{resume_snippet if resume_snippet else "No resume provided — ask about recent projects and skills."}

RULES:
- Every question MUST reference a specific item from the resume (a project, skill, internship, or achievement).
- Parse the resume carefully for: project names, technologies used, skills listed, work experience, internships, certifications.
- Ask deep, project-centric questions like:
  - "I see you built [Project X] using [Tech Y]. What were the core technical challenges you faced while building this, and how did you overcome them?"
  - "You mention [Skill Z] on your resume — can you explain how you applied this specifically in your [Project name]?"
  - "Walk me through the architecture of [Project A]. Why did you choose the technologies you did?"
- DO NOT ask generic questions. DO NOT ask general behavioral questions. Focus purely on their hands-on experience, projects, skills, and the decisions they made while building them.
"""

    elif round_type == "System Design":
        round_instructions = """
For this 'System Design' round, ask ONLY about:
- Designing scalable systems (e.g., "Design a URL shortener", "Design Twitter's feed")
- Database schema design and trade-offs
- Scalability, load balancing, caching strategies
- Microservices vs monolithic architecture
- CAP theorem, consistency models
- API design and rate limiting

DO NOT ask coding, behavioral, or resume-related questions.
"""

    else:  # HR / Behavioral
        resume_snippet = resume_text[:3000] if resume_text else ""
        round_instructions = f"""
For this 'HR / Behavioral' round, you MUST base your questions heavily on the candidate's actual experiences, projects, and skills listed in their resume, rather than generic scenarios.

CANDIDATE'S RESUME:
{resume_snippet if resume_snippet else "No resume provided. Ask about their most recent projects and teamwork."}

RULES:
- Instead of "Tell me about a challenge", ask "What was the biggest non-technical challenge you faced while working on [Project X from resume]?"
- Instead of "Where do you see yourself in 5 years?", ask "Given your experience with [Skill Y] at [Company/Project], how do you want to evolve that skill over the next few years?"
- Tie questions about teamwork, conflict resolution, leadership, and soft skills directly to specific internships, projects, or certifications they have listed.
- DO NOT ask completely generic questions like "What are your strengths and weaknesses?" or "Where do you see yourself in 5 years?". Always contextualize it to their actual resume.
- DO NOT ask any technical, coding, or system design questions.
"""

    prompt = f"""You are a senior hiring manager conducting a {round_type} interview for a {target_role} position.
The candidate's experience level is: {experience_level}.
Here is the candidate's resume summary:
{resume_text[:2000] if resume_text else "No resume provided."}
{company_context}

Generate exactly 3 challenging but fair interview questions strictly for the '{round_type}' round type, tailored to their {experience_level} experience level.
- For Student / Fresher: Focus on foundational concepts, academic projects, and basic problem-solving.
- For Early Career: Focus on practical implementation, bug fixing, and team collaboration.
- For Mid Level: Focus on system architecture, code optimization, and leading small features.
- For Senior: Focus on scale, deep system design trade-offs, and mentoring/leadership.

{round_instructions}

{f'''
CRITICAL RULE: DO NOT ASK ANY OF THESE PAST QUESTIONS:
{chr(10).join("- " + q for q in past_questions)}
''' if past_questions else ''}

Return ONLY valid JSON — an array of strings:
[
  "Question 1",
  "Question 2",
  "Question 3"
]"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        questions = json.loads(text)
        if not isinstance(questions, list) or len(questions) == 0:
            raise ValueError("Invalid format")
        return questions[:5]
    except Exception as e:
        print(f"[interview_agent] question generation failed: {e}")
        return [
            f"Can you tell me about yourself and why you're interested in the {target_role} role?",
            "Describe a challenging project you worked on and how you overcame obstacles.",
            "Where do you see yourself in 5 years?"
        ]

def evaluate_answer(question: str, answer: str, target_role: str) -> dict:
    """
    Evaluates a user's answer to an interview question.
    Returns score, feedback, strengths, improvements, ideal answer, and better phrasings.
    """
    llm = get_llm(temperature=0.3)

    prompt = f"""You are a technical interviewer for a {target_role} role.
You asked the candidate: "{question}"
The candidate answered: "{answer}"

Evaluate their answer based on accuracy, clarity, and completeness.

You MUST provide ALL of the following fields:
1. "score": Integer from 0 to 10
2. "feedback": Detailed feedback explaining what was good and what could be improved.
3. "strengths": Array of 2-3 specific things the candidate did well.
4. "improvements": Array of 2-3 specific areas for improvement.
5. "ideal_answer": A concise but comprehensive model answer (3-5 sentences) that would score 10/10. This teaches the user what a perfect answer looks like. Be specific and include technical details.
6. "better_phrasings": Array of exactly 2-3 specific phrasing improvements. Format each as: "Instead of '[what they said or could say]', say '[better professional version]'". Be specific — reference actual phrases or concepts from their answer.

Return ONLY valid JSON with this structure:
{{
  "score": 8,
  "feedback": "Detailed feedback...",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "ideal_answer": "A comprehensive model answer that demonstrates deep understanding...",
  "better_phrasings": [
    "Instead of 'I used React', say 'I architected the frontend using React with custom hooks for state management, reducing prop drilling by 60%'",
    "Instead of 'it was fast', say 'the optimization reduced API response time from 800ms to 120ms, a 6.7x improvement'"
  ]
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        evaluation = json.loads(text)
        return evaluation
    except Exception as e:
        print(f"[interview_agent] evaluation failed: {e}")
        return {
            "score": 5,
            "feedback": "Could not evaluate answer properly due to an error.",
            "strengths": ["Attempted to answer"],
            "improvements": ["Try providing a more detailed response next time"],
            "ideal_answer": "Unable to generate ideal answer due to an error.",
            "better_phrasings": []
        }

def analyze_communication(transcript: str) -> dict:
    """
    Analyzes the communication style, clarity, and confidence of a transcribed answer.
    """
    llm = get_llm(temperature=0.2)

    prompt = f"""You are an expert communication and speech coach for interviews.
Analyze the following interview answer transcript for communication style, clarity, filler words, and confidence.
Do NOT evaluate the technical accuracy—only *how* it was communicated.

Transcript: "{transcript}"

Return ONLY valid JSON with this structure:
{{
  "clarity_score": 8, // 0-10
  "confidence_score": 7, // 0-10
  "filler_words_detected": ["um", "like", "you know"], // List of filler words found
  "feedback": "Detailed feedback on tone, pacing, structure, and clarity."
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        analysis = json.loads(text)
        return analysis
    except Exception as e:
        print(f"[interview_agent] communication analysis failed: {e}")
        return {
            "clarity_score": 5,
            "confidence_score": 5,
            "filler_words_detected": [],
            "feedback": "Could not analyze communication style properly due to an error."
        }
