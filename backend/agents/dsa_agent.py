import json
from datetime import datetime, timezone, date
from core.llm import get_llm
from core.database import get_supabase_client
from langchain_core.messages import HumanMessage


# ── Problem tracking ──────────────────────────────────────────────────────────

MAX_LOGS_PER_PROBLEM = 3


def log_problem(
    user_id: str,
    topic: str,
    problem_name: str,
    difficulty: str,
    platform: str = "LeetCode",
    time_taken_mins: int = None,
    notes: str = None,
    is_revision: bool = False,
) -> dict:
    """
    Log a solved DSA problem to Supabase.
    Raises ValueError if the same problem has been logged MAX_LOGS_PER_PROBLEM times.
    """
    client = get_supabase_client()

    # ── Dedup check: max 3 logs per problem name per user ──
    existing = (
        client.table("dsa_problems")
        .select("id")
        .eq("user_id", user_id)
        .ilike("problem_name", problem_name.strip())
        .execute()
    )

    if len(existing.data) >= MAX_LOGS_PER_PROBLEM:
        raise ValueError(
            f"'{problem_name}' already logged {len(existing.data)} times (max {MAX_LOGS_PER_PROBLEM})"
        )

    client.table("dsa_problems").insert({
        "user_id": user_id,
        "topic": topic,
        "problem_name": problem_name.strip(),
        "difficulty": difficulty,
        "platform": platform,
        "time_taken_mins": time_taken_mins,
        "notes": notes,
        "is_revision": is_revision,
    }).execute()

    # Recompute and upsert progress after every log
    return _recompute_progress(user_id)


def get_progress(user_id: str) -> dict:
    client = get_supabase_client()

    result = (
        client.table("dsa_progress")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    if result.data:
        return result.data[0]

    return {
        "total_solved": 0,
        "easy_solved": 0,
        "medium_solved": 0,
        "hard_solved": 0,
        "topic_scores": {},
        "weak_topics": [],
        "overall_score": 0,
        "daily_plan": None,
    }


def get_problems(user_id: str) -> list:
    """Fetch all logged problems for a user, newest first."""
    client = get_supabase_client()
    result = (
        client.table("dsa_problems")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def mark_for_revision(user_id: str, problem_id: str, revision: bool) -> dict:
    """Toggle the 'marked_for_revision' flag on a logged problem."""
    client = get_supabase_client()
    client.table("dsa_problems").update({
        "marked_for_revision": revision,
    }).eq("id", problem_id).eq("user_id", user_id).execute()
    return {"success": True}


def update_notes(user_id: str, problem_id: str, notes: str = None, mistakes: str = None) -> dict:
    """Update notes and/or mistakes on a logged problem."""
    client = get_supabase_client()
    update_data = {}
    if notes is not None:
        update_data["notes"] = notes
    if mistakes is not None:
        update_data["mistakes"] = mistakes
    if not update_data:
        return {"success": True}
    client.table("dsa_problems").update(update_data).eq("id", problem_id).eq("user_id", user_id).execute()
    return {"success": True}


def _recompute_progress(user_id: str, daily_plan: dict = None) -> dict:
    """Recompute DSA progress from raw problems table."""
    client = get_supabase_client()

    problems = (
        client.table("dsa_problems")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    ).data or []

    # Count unique problems (not revision duplicates)
    unique_names = set()
    for p in problems:
        unique_names.add(p["problem_name"].lower().strip())

    total = len(unique_names)

    # Count by difficulty (unique problems only)
    diff_map = {}
    for p in problems:
        name = p["problem_name"].lower().strip()
        if name not in diff_map:
            diff_map[name] = p["difficulty"]

    easy = sum(1 for d in diff_map.values() if d == "easy")
    medium = sum(1 for d in diff_map.values() if d == "medium")
    hard = sum(1 for d in diff_map.values() if d == "hard")

    topic_counts: dict = {}
    seen_per_topic: dict = {}
    for p in problems:
        topic = p["topic"]
        name = p["problem_name"].lower().strip()
        if topic not in seen_per_topic:
            seen_per_topic[topic] = set()
        if name not in seen_per_topic[topic]:
            seen_per_topic[topic].add(name)
            topic_counts[topic] = topic_counts.get(topic, 0) + 1

    TARGET_PER_TOPIC = 10
    topic_scores = {
        topic: min(100, int(count / TARGET_PER_TOPIC * 100))
        for topic, count in topic_counts.items()
    }

    weighted = (easy * 1) + (medium * 2) + (hard * 3)
    overall_score = min(100, int(weighted / 60 * 100))

    ALL_DSA_TOPICS = [
        "Arrays", "Strings", "Linked Lists", "Stacks", "Queues",
        "Trees", "Graphs", "Dynamic Programming", "Recursion",
        "Binary Search", "Sorting", "Hashing", "Heaps", "Greedy"
    ]
    weak_topics = [t for t in ALL_DSA_TOPICS if topic_scores.get(t, 0) < 40]

    progress = {
        "total_solved": total,
        "easy_solved": easy,
        "medium_solved": medium,
        "hard_solved": hard,
        "topic_scores": topic_scores,
        "weak_topics": weak_topics[:5],
        "overall_score": overall_score,
    }

    # Preserve existing daily_plan if no new one provided
    if daily_plan is None:
        existing = (
            client.table("dsa_progress")
            .select("daily_plan")
            .eq("user_id", user_id)
            .execute()
        ).data
        if existing:
            daily_plan = existing[0].get("daily_plan")

    upsert_data = {"user_id": user_id, **progress, "last_updated": datetime.now(timezone.utc).isoformat()}
    if daily_plan:
        upsert_data["daily_plan"] = daily_plan
        progress["daily_plan"] = daily_plan

    client.table("dsa_progress").upsert(
        upsert_data,
        on_conflict="user_id"
    ).execute()

    return progress


# ── Urgency calculation ───────────────────────────────────────────────────────

def _compute_urgency(target_date: str | None, daily_hours: int) -> dict:
    """
    Compute urgency based on how many weeks remain until placement.
    Returns problem count per day and difficulty distribution guidance.
    """
    if not target_date:
        # No target date — use moderate defaults
        problems_per_day = max(2, daily_hours)
        return {
            "problems_per_day": problems_per_day,
            "weeks_remaining": None,
            "urgency": "moderate",
            "difficulty_guidance": "50% easy, 40% medium, 10% hard",
        }

    try:
        target = date.fromisoformat(target_date)
        today = date.today()
        days_left = (target - today).days
        weeks_left = max(1, days_left // 7)
    except Exception:
        weeks_left = 12  # fallback

    if weeks_left <= 4:
        problems_per_day = max(4, daily_hours * 2)
        urgency = "critical"
        diff_guidance = "30% easy, 40% medium, 30% hard — focus on most-asked problems"
    elif weeks_left <= 8:
        problems_per_day = max(3, int(daily_hours * 1.5))
        urgency = "high"
        diff_guidance = "30% easy, 50% medium, 20% hard"
    elif weeks_left <= 12:
        problems_per_day = max(2, daily_hours)
        urgency = "moderate"
        diff_guidance = "40% easy, 40% medium, 20% hard"
    else:
        problems_per_day = max(2, daily_hours)
        urgency = "relaxed"
        diff_guidance = "60% easy, 30% medium, 10% hard — build strong foundations"

    return {
        "problems_per_day": problems_per_day,
        "weeks_remaining": weeks_left,
        "urgency": urgency,
        "difficulty_guidance": diff_guidance,
    }


# ── Daily plan generation ─────────────────────────────────────────────────────

def generate_daily_plan(
    weak_topics: list,
    skill_gap_priorities: list,
    career_plan_week: dict,
    user_profile: dict | None,
    target_date: str | None = None,
    solved_problems: list | None = None,
) -> dict:
    """
    Generate a personalised daily DSA practice plan.
    - Combines weak_topics + skill_gap_priorities
    - Uses urgency from target_date to calibrate intensity
    - Excludes already-solved problems from recommendations
    - Generates specific problems per day in the weekly plan
    """
    llm = get_llm(temperature=0.4)

    # Skill gap priorities take precedence over general weak topics
    priority_topics = list(dict.fromkeys(skill_gap_priorities + weak_topics))[:6]

    daily_hours = (user_profile or {}).get("daily_hours", 2)
    week_focus = career_plan_week.get("focus_area", "general DSA practice")

    if not priority_topics:
        priority_topics = ["Arrays", "Strings", "Binary Search"]

    # Compute urgency
    urgency = _compute_urgency(target_date, daily_hours)

    # Build exclusion context
    solved_list = solved_problems or []
    exclusion_text = ""
    if solved_list:
        exclusion_text = f"\n\nALREADY SOLVED (do NOT recommend these): {', '.join(solved_list[:30])}"

    urgency_text = ""
    if urgency["weeks_remaining"]:
        urgency_text = f"""
Urgency: {urgency['urgency'].upper()} — only {urgency['weeks_remaining']} weeks until placement!
Difficulty distribution: {urgency['difficulty_guidance']}"""

    prompt = f"""You are a DSA coach preparing a student for placement interviews.

Priority topics (from skill gap analysis): {', '.join(priority_topics)}
Problems student should solve per day: {urgency['problems_per_day']}
Daily hours available: {daily_hours}
Current week focus from career plan: {week_focus}
{urgency_text}
{exclusion_text}

Generate a focused daily DSA practice plan with SPECIFIC real LeetCode problem names.

IMPORTANT:
1. Recommend REAL problems that exist on LeetCode/GFG (e.g., "Two Sum", "Valid Parentheses", "Merge Intervals").
2. Include proper LeetCode URLs (e.g., "https://leetcode.com/problems/two-sum/").
3. For the weekly plan, include {urgency['problems_per_day']} specific problems per day with links.
4. Do NOT recommend any problems from the already-solved list.

Return ONLY valid JSON:
{{
  "today": [
    {{
      "topic": "Arrays",
      "problem": "Two Sum",
      "difficulty": "easy",
      "platform": "LeetCode",
      "link": "https://leetcode.com/problems/two-sum/",
      "why": "Fundamental array+hashmap problem, asked in 90% of interviews"
    }}
  ],
  "this_week": [
    {{
      "day": "Monday",
      "topic": "Arrays",
      "problems": [
        {{"problem": "Two Sum", "difficulty": "easy", "link": "https://leetcode.com/problems/two-sum/"}},
        {{"problem": "Best Time to Buy and Sell Stock", "difficulty": "easy", "link": "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/"}}
      ]
    }},
    {{
      "day": "Tuesday",
      "topic": "Strings",
      "problems": [
        {{"problem": "Valid Anagram", "difficulty": "easy", "link": "https://leetcode.com/problems/valid-anagram/"}},
        {{"problem": "Longest Substring Without Repeating Characters", "difficulty": "medium", "link": "https://leetcode.com/problems/longest-substring-without-repeating-characters/"}}
      ]
    }},
    {{
      "day": "Wednesday",
      "topic": "Binary Search",
      "problems": [
        {{"problem": "Binary Search", "difficulty": "easy", "link": "https://leetcode.com/problems/binary-search/"}}
      ]
    }},
    {{
      "day": "Thursday",
      "topic": "Arrays",
      "problems": [
        {{"problem": "Container With Most Water", "difficulty": "medium", "link": "https://leetcode.com/problems/container-with-most-water/"}},
        {{"problem": "3Sum", "difficulty": "medium", "link": "https://leetcode.com/problems/3sum/"}}
      ]
    }},
    {{
      "day": "Friday",
      "topic": "Linked Lists",
      "problems": [
        {{"problem": "Reverse Linked List", "difficulty": "easy", "link": "https://leetcode.com/problems/reverse-linked-list/"}}
      ]
    }},
    {{
      "day": "Saturday",
      "topic": "Revision",
      "problems": [
        {{"problem": "Merge Intervals", "difficulty": "medium", "link": "https://leetcode.com/problems/merge-intervals/"}},
        {{"problem": "Product of Array Except Self", "difficulty": "medium", "link": "https://leetcode.com/problems/product-of-array-except-self/"}}
      ]
    }},
    {{
      "day": "Sunday",
      "topic": "Mixed Practice",
      "problems": [
        {{"problem": "Valid Parentheses", "difficulty": "easy", "link": "https://leetcode.com/problems/valid-parentheses/"}},
        {{"problem": "Group Anagrams", "difficulty": "medium", "link": "https://leetcode.com/problems/group-anagrams/"}}
      ]
    }}
  ],
  "focus_message": "One encouraging sentence about this week's focus",
  "tip": "One specific technical tip relevant to the priority topics"
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"[dsa_agent] daily plan generation failed: {e}")
        return {
            "today": [],
            "this_week": [],
            "focus_message": "Focus on fundamentals today.",
            "tip": "Solve 2 easy problems before attempting medium ones."
        }