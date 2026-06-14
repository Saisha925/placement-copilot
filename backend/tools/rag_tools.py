from langchain_core.tools import tool
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
import os

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
        url = os.environ.get("QDRANT_URL")
        api_key = os.environ.get("QDRANT_API_KEY")
        hf_token = os.environ.get("HF_TOKEN")
        
        if not url or not api_key:
            return ["Error: Qdrant credentials not configured in environment."]
        if not hf_token:
            return ["Error: HF_TOKEN not configured in environment."]

        import requests
        api_url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
        headers = {"Authorization": f"Bearer {hf_token}"}
        
        # Get embedding from API
        response = requests.post(api_url, headers=headers, json={"inputs": query})
        
        if response.status_code != 200:
            return [f"Error from HF API: {response.text}"]
            
        vector = response.json()


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
