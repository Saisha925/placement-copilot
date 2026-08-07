from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from agents.resource_agent import fetch_resources, fetch_resources_bulk

router = APIRouter()


class SearchResourcesRequest(BaseModel):
    topic: str
    category: str = "general"  # dsa | fundamentals | projects | video | general
    max_results: int = 3


class BulkSearchRequest(BaseModel):
    topics: list[dict]  # [{"topic": "Binary Search", "category": "dsa"}, ...]
    max_per_topic: int = 2


@router.post("/search")
async def search_resources(req: SearchResourcesRequest):
    """Fetch real, validated learning resources for a topic using Tavily AI search."""
    try:
        resources = fetch_resources(req.topic, req.category, req.max_results)
        return {"topic": req.topic, "resources": resources}
    except Exception as e:
        print(f"[resources api] search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk")
async def bulk_search_resources(req: BulkSearchRequest):
    """Fetch resources for multiple topics at once."""
    try:
        results = fetch_resources_bulk(req.topics, req.max_per_topic)
        return {"results": results}
    except Exception as e:
        print(f"[resources api] bulk search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
