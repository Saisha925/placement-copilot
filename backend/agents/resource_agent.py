"""
Resource Agent — Fetches real, validated learning resources using Tavily AI Search.

Architecture:
1. Check cache (resource_cache table in Supabase) for existing results
2. If cache miss → call Tavily Search API
3. Filter results to trusted educational domains
4. Use LLM to rank and pick top resources
5. Store in cache with 7-day TTL
6. Return structured resource objects
"""

import json
import hashlib
import os
from datetime import datetime, timezone, timedelta
from core.llm import get_llm
from core.database import get_supabase_client
from langchain_core.messages import HumanMessage

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

TRUSTED_DOMAINS = [
    "youtube.com", "leetcode.com", "geeksforgeeks.org",
    "takeuforward.org", "neetcode.io", "freecodecamp.org",
    "w3schools.com", "javatpoint.com", "tutorialspoint.com",
    "hackerrank.com", "codeforces.com", "interviewbit.com",
    "educative.io", "programiz.com", "cp-algorithms.com",
    "github.com", "medium.com", "dev.to", "realpython.com",
    "baeldung.com", "digitalocean.com", "docs.python.org",
    "developer.mozilla.org", "cs.stanford.edu",
]

# ── Cache helpers ─────────────────────────────────────────────────────────────

def _cache_key(topic: str, category: str) -> str:
    """Generate a deterministic cache key."""
    raw = f"{topic.lower().strip()}:{category.lower().strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _check_cache(topic: str, category: str) -> list | None:
    """Check Supabase resource_cache for unexpired results."""
    try:
        client = get_supabase_client()
        key = _cache_key(topic, category)
        now = datetime.now(timezone.utc).isoformat()

        result = (
            client.table("resource_cache")
            .select("resources")
            .eq("cache_key", key)
            .gt("expires_at", now)
            .execute()
        )

        if result.data and result.data[0].get("resources"):
            print(f"[resource_agent] cache hit for '{topic}' ({category})")
            return result.data[0]["resources"]
    except Exception as e:
        print(f"[resource_agent] cache check failed: {e}")

    return None


def _save_cache(topic: str, category: str, resources: list) -> None:
    """Save resources to Supabase cache with 7-day TTL."""
    try:
        client = get_supabase_client()
        key = _cache_key(topic, category)
        expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

        client.table("resource_cache").upsert({
            "cache_key": key,
            "topic": topic,
            "category": category,
            "resources": resources,
            "expires_at": expires,
        }, on_conflict="cache_key").execute()
    except Exception as e:
        print(f"[resource_agent] cache save failed: {e}")


# ── Tavily Search ─────────────────────────────────────────────────────────────

def _build_search_queries(topic: str, category: str) -> list[str]:
    """Build targeted search queries for different resource types."""
    base = topic.replace("_", " ").strip()

    queries = []
    if category in ("dsa", "practice"):
        queries.append(f"best {base} data structures algorithms tutorial")
        queries.append(f"{base} leetcode problems tutorial takeuforward neetcode")
    elif category in ("fundamentals", "concepts"):
        queries.append(f"{base} computer science concepts explained tutorial")
        queries.append(f"best {base} interview preparation guide")
    elif category in ("projects",):
        queries.append(f"{base} project tutorial step by step guide")
        queries.append(f"{base} portfolio project github tutorial")
    elif category in ("video",):
        queries.append(f"{base} complete course tutorial youtube")
    else:
        queries.append(f"best {base} tutorial guide for placement preparation")
        queries.append(f"{base} learning resources programming")

    return queries


def _search_tavily(queries: list[str], max_results: int = 8) -> list[dict]:
    """Call Tavily Search API and aggregate results."""
    import httpx

    if not TAVILY_API_KEY:
        print("[resource_agent] TAVILY_API_KEY not set — skipping search")
        return []

    all_results = []
    seen_urls = set()

    for query in queries:
        try:
            resp = httpx.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": TAVILY_API_KEY,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": max_results,
                    "include_domains": TRUSTED_DOMAINS,
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            for result in data.get("results", []):
                url = result.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_results.append({
                        "title": result.get("title", ""),
                        "url": url,
                        "snippet": result.get("content", "")[:200],
                        "score": result.get("score", 0),
                    })
        except Exception as e:
            print(f"[resource_agent] Tavily search failed for '{query}': {e}")

    return all_results


# ── LLM Ranking ───────────────────────────────────────────────────────────────

def _rank_with_llm(results: list[dict], topic: str, category: str, max_results: int = 3) -> list[dict]:
    """Use LLM to pick the best resources from search results."""
    if not results:
        return []

    # If we have 3 or fewer, skip LLM ranking
    if len(results) <= max_results:
        return [
            {
                "title": r["title"],
                "url": r["url"],
                "type": _infer_type(r["url"]),
                "platform": _infer_platform(r["url"]),
            }
            for r in results
        ]

    llm = get_llm(temperature=0.1)

    results_text = "\n".join([
        f"{i+1}. [{r['title']}]({r['url']}) — {r['snippet']}"
        for i, r in enumerate(results[:12])
    ])

    prompt = f"""You are a learning resource curator for placement preparation.

Topic: {topic}
Category: {category}

Here are search results. Pick the {max_results} BEST resources for a student preparing for placements.
Prioritize: tutorials with clear explanations > practice problems > reference docs.
Prefer: YouTube playlists > individual videos. TakeUForward/NeetCode > random blogs.

Results:
{results_text}

Return ONLY a valid JSON array of the selected resources (by their number):
[
  {{"index": 1, "type": "video|practice|article|course|docs", "platform": "YouTube|LeetCode|GeeksforGeeks|etc"}}
]"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        picks = json.loads(text)

        ranked = []
        for pick in picks[:max_results]:
            idx = pick.get("index", 1) - 1
            if 0 <= idx < len(results):
                r = results[idx]
                ranked.append({
                    "title": r["title"],
                    "url": r["url"],
                    "type": pick.get("type", _infer_type(r["url"])),
                    "platform": pick.get("platform", _infer_platform(r["url"])),
                })
        return ranked if ranked else _fallback_rank(results, max_results)

    except Exception as e:
        print(f"[resource_agent] LLM ranking failed: {e}")
        return _fallback_rank(results, max_results)


def _fallback_rank(results: list[dict], max_results: int = 3) -> list[dict]:
    """Fallback ranking by Tavily score when LLM fails."""
    sorted_results = sorted(results, key=lambda r: r.get("score", 0), reverse=True)
    return [
        {
            "title": r["title"],
            "url": r["url"],
            "type": _infer_type(r["url"]),
            "platform": _infer_platform(r["url"]),
        }
        for r in sorted_results[:max_results]
    ]


def _infer_type(url: str) -> str:
    """Infer resource type from URL."""
    if "youtube.com" in url or "youtu.be" in url:
        return "video"
    if "leetcode.com" in url or "hackerrank.com" in url or "codeforces.com" in url:
        return "practice"
    if "github.com" in url:
        return "code"
    if "docs." in url or "developer." in url:
        return "docs"
    return "article"


def _infer_platform(url: str) -> str:
    """Infer platform name from URL."""
    platform_map = {
        "youtube.com": "YouTube",
        "leetcode.com": "LeetCode",
        "geeksforgeeks.org": "GeeksforGeeks",
        "takeuforward.org": "TakeUForward",
        "neetcode.io": "NeetCode",
        "hackerrank.com": "HackerRank",
        "freecodecamp.org": "freeCodeCamp",
        "github.com": "GitHub",
        "medium.com": "Medium",
        "dev.to": "DEV",
        "programiz.com": "Programiz",
        "w3schools.com": "W3Schools",
        "interviewbit.com": "InterviewBit",
        "educative.io": "Educative",
        "codeforces.com": "Codeforces",
    }
    for domain, name in platform_map.items():
        if domain in url:
            return name
    return "Web"


# ── Public API ────────────────────────────────────────────────────────────────

def fetch_resources(topic: str, category: str = "general", max_results: int = 3) -> list[dict]:
    """
    Fetch real, validated learning resources for a topic.

    Args:
        topic: The learning topic (e.g., "Binary Search", "OOPs Concepts")
        category: Resource category — "dsa", "fundamentals", "projects", "video", "general"
        max_results: Max resources to return (default 3)

    Returns:
        List of resource dicts: [{"title", "url", "type", "platform"}]
    """
    # 1. Check cache
    cached = _check_cache(topic, category)
    if cached:
        return cached[:max_results]

    # 2. Search via Tavily
    queries = _build_search_queries(topic, category)
    raw_results = _search_tavily(queries, max_results=8)

    if not raw_results:
        print(f"[resource_agent] no results for '{topic}' ({category})")
        return []

    # 3. Rank with LLM
    ranked = _rank_with_llm(raw_results, topic, category, max_results)

    # 4. Cache results
    if ranked:
        _save_cache(topic, category, ranked)

    return ranked


def fetch_resources_bulk(topics: list[dict], max_per_topic: int = 2) -> dict[str, list]:
    """
    Fetch resources for multiple topics at once.

    Args:
        topics: List of {"topic": "...", "category": "..."} dicts
        max_per_topic: Max resources per topic

    Returns:
        Dict mapping "topic" -> [resources]
    """
    result = {}
    for item in topics:
        topic = item.get("topic", "")
        category = item.get("category", "general")
        if topic:
            result[topic] = fetch_resources(topic, category, max_per_topic)
    return result
