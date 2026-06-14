from langchain_groq import ChatGroq
from core.config import GROQ_API_KEY

def get_llm(temperature: float = 0.3, model: str = "llama-3.1-8b-instant", max_tokens: int = 4096) -> ChatGroq:
    """
    Single LLM provider for all agents.
    - Default : llama-3.1-8b-instant   → fast, routing + JSON generation
    - Complex : llama-3.3-70b-versatile → Career Planner, Interview eval
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY environment variable is not set.")
    
    return ChatGroq(
        api_key=GROQ_API_KEY,
        model=model,
        temperature=temperature,
        timeout=60,
        max_retries=2,
        max_tokens=max_tokens
    )