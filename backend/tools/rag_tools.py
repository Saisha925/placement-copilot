from langchain_core.tools import tool
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
import os

# Lazy load model
_embed_model = None

@tool
def search_knowledge_base(query: str, subject: str = "all", top_k: int = 3) -> list:
    """Search the placement knowledge base for CS fundamentals study material.
    
    Args:
        query:   What to search for, e.g. "explain DBMS indexing"
        subject: Filter — "dbms", "os", "cn", "oops", "ml", or "all"
        top_k:   Number of results
    Returns:
        List of relevant text chunks
    """
    try:
        global _embed_model
        if _embed_model is None:
            _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
            
        vector = _embed_model.encode(query).tolist()
        
        url = os.environ.get("QDRANT_URL")
        api_key = os.environ.get("QDRANT_API_KEY")
        if not url or not api_key:
            return ["Error: Qdrant credentials not configured in environment."]

        client = QdrantClient(url=url, api_key=api_key)

        flt = None
        if subject != "all":
            flt = Filter(must=[FieldCondition(key="subject", match=MatchValue(value=subject))])

        results = client.query_points(
            collection_name="placement_knowledge",
            query=vector,
            limit=top_k,
            query_filter=flt
        ).points
        return [r.payload.get("text", "") for r in results if r.payload]
    except Exception as e:
        print(f"[rag_tools] Search failed: {e}")
        return [f"Search failed: {str(e)}"]
