from langchain_groq import ChatGroq
from core.config import GROQ_API_KEY

def get_llm(temperature: float = 0.3, model: str = "llama-3.1-8b-instant") -> ChatGroq:
    """
    Single LLM provider for all agents.
    - Default : llama-3.1-8b-instant   → fast, routing + JSON generation
    - Complex : llama-3.3-70b-versatile → Career Planner, Interview eval
    """
    return ChatGroq(
        model=model,
        temperature=temperature,
        groq_api_key=GROQ_API_KEY,
        timeout=15,
        max_retries=1
    )