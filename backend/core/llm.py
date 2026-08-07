from langchain_groq import ChatGroq
from core.config import GROQ_API_KEY

def get_llm(temperature: float = 0.3, model: str = "openai/gpt-oss-20b", max_tokens: int = 4096, json_mode: bool = False) -> ChatGroq:
    """
    Single LLM provider for all agents.
    - Default : openai/gpt-oss-20b   → fast, routing + JSON generation
    - Complex : llama-3.3-70b-versatile → Career Planner, Interview eval
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY environment variable is not set.")
    
    kwargs = {
        "api_key": GROQ_API_KEY,
        "model": model,
        "temperature": temperature,
        "timeout": 120,
        "max_retries": 2,
        "max_tokens": max_tokens
    }
    if json_mode:
        kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
    
    return ChatGroq(**kwargs)