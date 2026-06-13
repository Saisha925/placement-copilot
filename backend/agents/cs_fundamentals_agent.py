import json
from core.llm import get_llm
from langchain_core.messages import HumanMessage

def generate_study_guide(target_role: str) -> dict:
    """
    Generates a targeted study guide for CS Fundamentals (OS, DBMS, CN)
    based on the user's target role.
    """
    llm = get_llm(temperature=0.3)
    prompt = f"""You are an expert CS professor. 
A student is preparing for a {target_role} role. 
Generate a focused CS Fundamentals study guide covering Operating Systems (OS), Database Management Systems (DBMS), and Computer Networks (CN).
Tailor the priorities based on the role (e.g., Backend heavy on DBMS/CN, Frontend heavy on browser networking).

Return ONLY valid JSON with this exact structure:
{{
  "os": {{
    "priority": "High/Medium/Low",
    "topics": ["Topic 1", "Topic 2", "Topic 3"]
  }},
  "dbms": {{
    "priority": "High/Medium/Low",
    "topics": ["Topic 1", "Topic 2", "Topic 3"]
  }},
  "cn": {{
    "priority": "High/Medium/Low",
    "topics": ["Topic 1", "Topic 2", "Topic 3"]
  }}
}}"""
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"[cs_fundamentals] study guide error: {e}")
        return {
            "os": {"priority": "Medium", "topics": ["Processes", "Memory Management", "Concurrency"]},
            "dbms": {"priority": "High", "topics": ["SQL", "Normalization", "Indexing", "ACID"]},
            "cn": {"priority": "Medium", "topics": ["OSI Model", "TCP/UDP", "HTTP", "DNS"]}
        }

def generate_questions(subject: str, topic: str) -> list:
    """
    Generates 3 challenging theoretical questions for a specific subject and topic.
    """
    llm = get_llm(temperature=0.7)
    prompt = f"""Generate exactly 3 standard, frequently asked interview questions for the CS Subject: {subject}, specifically focusing on the topic: {topic}.
Make the questions clear and conceptual (e.g., "Explain the difference between...", "How does X work under the hood?").

Return ONLY valid JSON as a list of strings:
[
  "Question 1",
  "Question 2",
  "Question 3"
]"""
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"[cs_fundamentals] generate_questions error: {e}")
        return [f"Explain the core concepts of {topic}.", f"What are the common pitfalls in {topic}?", f"How is {topic} used in production?"]

def evaluate_answer(question: str, answer: str) -> dict:
    """
    Evaluates a user's answer to a CS theory question.
    """
    llm = get_llm(temperature=0.2, model="llama-3.3-70b-versatile")
    prompt = f"""You are a strict CS professor grading an oral exam.
Question: "{question}"
Student's Answer: "{answer}"

Evaluate the theoretical correctness, depth, and clarity of the answer.
Return ONLY valid JSON:
{{
  "score": <int 1-10>,
  "feedback": "Concise feedback on accuracy",
  "missing_points": ["List of critical points the student forgot to mention"]
}}"""
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"[cs_fundamentals] evaluate_answer error: {e}")
        return {"score": 5, "feedback": "Evaluation failed.", "missing_points": []}
