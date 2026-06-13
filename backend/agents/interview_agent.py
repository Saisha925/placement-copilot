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

def generate_questions(resume_text: str, target_role: str, round_type: str, experience_level: str = "Student / Fresher", target_company: str = None) -> list:
    """
    Generates 3-5 interview questions tailored to the user's resume, target role, round type, and experience level.
    If target_company is provided, questions are tailored to that company's specific interview culture.
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

{f"Use these verified reference materials to craft accurate technical questions:\\n{chr(10).join(search_knowledge_base.invoke({'query': target_role + ' interview questions', 'subject': 'all', 'top_k': 3}))}" if round_type == 'Technical' else ""}


CRITICAL RULE: DO NOT mix question types.
- If '{round_type}' is 'HR / Behavioral', ask ONLY about past experiences, teamwork, conflict resolution, leadership, and soft skills. DO NOT ask any technical, coding, or system design questions.
- If '{round_type}' is 'Technical', ask ONLY about coding concepts, algorithms, debugging, and frameworks.
- If '{round_type}' is 'System Design', ask ONLY about architecture, scalability, databases, and high-level system design.

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
    Returns a score (0-10) and feedback.
    """
    llm = get_llm(temperature=0.3)

    prompt = f"""You are a technical interviewer for a {target_role} role.
You asked the candidate: "{question}"
The candidate answered: "{answer}"

Evaluate their answer based on accuracy, clarity, and completeness.
Return ONLY valid JSON with this structure:
{{
  "score": 8, // Integer from 0 to 10
  "feedback": "Detailed feedback explaining what was good and what could be improved.",
  "strengths": ["Clear explanation", "Good example"],
  "improvements": ["Could mention edge cases", "Missed a key detail"]
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
            "improvements": ["Try providing a more detailed response next time"]
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
