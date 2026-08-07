import json
from datetime import datetime, timezone, date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from core.llm import get_llm
from core.database import get_supabase_client
from langchain_core.messages import HumanMessage
from agents.resource_agent import fetch_resources


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

# ── Calendar and Dual-Mode Plan generation ────────────────────────────────────

def sync_from_career_plan(user_id: str, career_plan: dict) -> dict:
    """
    Extracts DSA tasks from the career plan and writes them to the calendar.
    """
    client = get_supabase_client()
    
    entries = []
    
    def process_day(date_str, morning, evening):
        dsa_task = None
        if morning and morning.get("category") == "dsa":
            dsa_task = morning
        elif evening and evening.get("category") == "dsa":
            dsa_task = evening
            
        if dsa_task and date_str:
            topic = dsa_task.get("topics", ["General DSA"])[0]
            entries.append({
                "user_id": user_id,
                "date": date_str,
                "topic": topic,
                "source": "career_plan",
                "problems": []
            })
            
    plan_format = career_plan.get("format")
    
    if plan_format == "days":
        for day in career_plan.get("days", []):
            process_day(day.get("date"), day.get("morning"), day.get("evening"))
            
    elif plan_format == "weeks":
        for week in career_plan.get("weeks", []):
            for day in week.get("days", []):
                process_day(day.get("date"), day.get("morning"), day.get("evening"))
                
    elif plan_format == "weekly_summary":
        import datetime
        for week in career_plan.get("weeks", []):
            tasks = [t for t in week.get("weekly_tasks", []) if t.get("category") == "dsa"]
            if not tasks:
                continue
            start_date_str = week.get("start_date")
            if not start_date_str:
                continue
            try:
                start_date = datetime.date.fromisoformat(start_date_str)
            except ValueError:
                continue
            
            # Distribute tasks uniformly over the 7 days
            for i, task in enumerate(tasks):
                offset = int((i / len(tasks)) * 7)
                date_str = (start_date + datetime.timedelta(days=offset)).isoformat()
                topic = task.get("topics", ["General DSA"])[0]
                entries.append({
                    "user_id": user_id,
                    "date": date_str,
                    "topic": topic,
                    "source": "career_plan",
                    "problems": []
                })
                
    else:
        # Legacy fallback
        found_any = False
        
        # Check plan_30_day, plan_60_day, plan_90_day
        for legacy_key in ["plan_30_day", "plan_60_day", "plan_90_day"]:
            for week in career_plan.get(legacy_key, []):
                found_any = True
                for day in week.get("days", []):
                    process_day(day.get("date"), day.get("morning"), day.get("evening"))
                    
        # Check phases
        phases = career_plan.get("phases", [])
        if phases:
            found_any = True
            for phase in phases:
                for week in phase.get("weeks", []):
                    for day in week.get("days", []):
                        process_day(day.get("date"), day.get("morning"), day.get("evening"))
                        
        if not found_any:
            return {"success": False, "message": "No recognized plan format or phases found"}
    
    # We will enrich each entry with problems using a fast LLM call
    if entries:
        llm = get_llm(temperature=0.3)
        for entry in entries:
            topic = entry["topic"]
            prompt = f"Provide 3 LeetCode problems for the DSA topic: {topic}. Return ONLY valid JSON array of objects: [{{\"problem\": \"Name\", \"difficulty\": \"easy|medium|hard\", \"link\": \"https://leetcode.com/...\"}}]"
            try:
                response = llm.invoke([HumanMessage(content=prompt)])
                text = response.content.strip().replace("```json", "").replace("```", "").strip()
                problems = json.loads(text)
                for p in problems:
                    p["solved"] = False
                    p["notes_link"] = fetch_resources(p["problem"] + " " + topic, category="dsa", max_results=1)[0]["url"] if fetch_resources(p["problem"] + " " + topic, category="dsa", max_results=1) else ""
                entry["problems"] = problems
            except:
                entry["problems"] = []
                
        # Upsert entries
        for entry in entries:
            try:
                # Use a combined unique key or delete existing for this user/date/source
                client.table("dsa_calendar_entries").delete().eq("user_id", user_id).eq("date", entry["date"]).eq("source", "career_plan").execute()
                client.table("dsa_calendar_entries").insert(entry).execute()
            except Exception as e:
                print(f"[dsa_agent] sync entry failed: {e}")
                
    return {"success": True, "entries_synced": len(entries)}


def generate_daily_plan(
    weak_topics: list,
    skill_gap_priorities: list,
    career_plan_week: dict,
    user_profile: dict | None,
    target_date: str | None = None,
    solved_problems: list | None = None,
    custom_prompt: str | None = None,
    plan_duration_days: int = 7,
    specific_topics: list = None,
    mode: str = "custom"
) -> dict:
    """
    Generate a personalised daily DSA practice plan.
    Supports 'custom' independent mode.
    """
    llm = get_llm(temperature=0.4)

    # Specific topics override others
    if specific_topics and len(specific_topics) > 0:
        priority_topics = specific_topics[:6]
    else:
        priority_topics = list(dict.fromkeys(skill_gap_priorities + weak_topics))[:6]
        if not priority_topics:
            priority_topics = ["Arrays", "Strings", "Binary Search"]

    daily_hours = (user_profile or {}).get("daily_hours", 2)
    urgency = _compute_urgency(target_date, daily_hours)

    solved_list = solved_problems or []
    exclusion_text = ""
    if solved_list:
        exclusion_text = f"\n\nALREADY SOLVED (do NOT recommend these): {', '.join(solved_list[:30])}"

    urgency_text = ""
    if urgency["weeks_remaining"]:
        urgency_text = f"Urgency: {urgency['urgency'].upper()} — {urgency['weeks_remaining']} weeks until placement!\nDifficulty distribution: {urgency['difficulty_guidance']}"

    today_date = date.today()
    custom_prompt_text = ""
    if custom_prompt:
        custom_prompt_text = f"\n\nUSER'S CUSTOM REQUEST: {custom_prompt}\nCRITICAL: You MUST strictly tailor this plan to the user's custom request above."

    prompt = f"""You are a DSA coach preparing a student for placement interviews.

Priority topics: {', '.join(priority_topics)}
Problems per day: {urgency['problems_per_day']}
Plan duration: {plan_duration_days} days
{urgency_text}
{exclusion_text}

Generate a focused daily DSA practice plan with SPECIFIC real LeetCode problem names.
{custom_prompt_text}

IMPORTANT:
1. Recommend REAL problems that exist on LeetCode/GFG (e.g., "Two Sum").
2. Include proper LeetCode URLs (e.g., "https://leetcode.com/problems/two-sum/").
3. Generate exactly {plan_duration_days} days of problems. Use EXACT calendar dates starting from {today_date.isoformat()} sequentially.
4. Do NOT recommend any problems from the already-solved list.
5. Provide a brief explanation for why each problem is recommended.

Return ONLY valid JSON:
{{
  "mode": "{mode}",
  "duration_days": {plan_duration_days},
  "calendar_entries": [
    {{
      "date": "{today_date.isoformat()}",
      "topic": "Arrays",
      "problems": [
        {{"problem": "Two Sum", "difficulty": "easy", "link": "https://leetcode.com/problems/two-sum/", "notes_link": "", "solved": false}}
      ]
    }}
  ],
  "focus_message": "One encouraging sentence about this week's focus",
  "tip": "One specific technical tip relevant to the priority topics"
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        plan = json.loads(text)
        
        # Enrich with resource_agent concurrently
        def fetch_for_prob(prob, topic):
            prob_name = prob.get("problem", "")
            # Fetch 2 resources to give options
            resources = fetch_resources(f"{prob_name} {topic}", category="dsa", max_results=2)
            if resources:
                prob["notes_link"] = resources[0]["url"]
            else:
                prob["notes_link"] = f"https://www.google.com/search?q=site:takeuforward.org+{prob_name.replace(' ', '+')}"

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for entry in plan.get("calendar_entries", []):
                for prob in entry.get("problems", []):
                    topic = entry.get("topic", "")
                    futures.append(executor.submit(fetch_for_prob, prob, topic))
            for future in as_completed(futures):
                future.result() # Catch exceptions if any
                
        return plan
    except Exception as e:
        print(f"[dsa_agent] daily plan generation failed: {e}")
        return {
            "mode": mode,
            "duration_days": plan_duration_days,
            "calendar_entries": [],
            "focus_message": "Could not generate plan.",
            "tip": "Try refreshing again."
        }