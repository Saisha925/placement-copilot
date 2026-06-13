import json
from core.llm import get_llm
from langchain_core.messages import HumanMessage

def generate_system_design_challenge(target_role: str) -> dict:
    """
    Generates a system design challenge tailored to the target role.
    """
    llm = get_llm(temperature=0.7)
    
    prompt = f"""You are a staff engineer at a top tech company.
The candidate is applying for a {target_role} role. 
Generate a realistic system design challenge for them.
The challenge should be challenging but standard (e.g. Design Twitter, Design a URL shortener, Design a parking lot).

Return ONLY valid JSON with this structure:
{{
  "title": "Design a URL Shortener",
  "description": "Design a service like Bitly that can take long URLs and generate short aliases...",
  "requirements": [
    "High availability",
    "Low latency",
    "100 million new URLs per month"
  ]
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"[system_design_agent] generate challenge failed: {e}")
        return {
            "title": "Design a URL Shortener",
            "description": "Design a service that generates short aliases for long URLs.",
            "requirements": ["High availability", "Low latency read"]
        }

def evaluate_system_design(challenge: dict, user_solution: str) -> dict:
    """
    Evaluates a user's system design solution.
    """
    llm = get_llm(temperature=0.2, model="llama-3.3-70b-versatile")
    
    prompt = f"""You are a strict staff engineer evaluating a system design interview.
Challenge Title: {challenge.get('title')}
Challenge Description: {challenge.get('description')}
Requirements: {', '.join(challenge.get('requirements', []))}

User's Architecture Solution:
"{user_solution}"

Evaluate the solution based on core system design principles (scalability, database choices, APIs, bottlenecks).
Return ONLY valid JSON with this structure:
{{
  "score": 8, // 0-10
  "feedback": "Overall feedback on the architecture.",
  "strengths": ["Good database choice", "Clear API"],
  "improvements": ["Did not discuss caching", "Single point of failure in load balancer"]
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"[system_design_agent] evaluate failed: {e}")
        return {
            "score": 5,
            "feedback": "Evaluation failed due to an error.",
            "strengths": [],
            "improvements": []
        }
