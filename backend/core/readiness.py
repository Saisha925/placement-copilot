def calculate_readiness(state: dict) -> int:
    """
    Deterministic placement readiness score (0-100).
    Pure math — never calls an LLM.

    Weights:
        Resume           15%
        DSA              20%
        CS Fundamentals  15%
        System Design    15%
        Mock Interview   15%
        Communication    10%
        Projects         10%
    """

    def rolling_avg(history: list, key: str, n: int) -> float:
        if not history:
            return 0.0
        last_n = history[-n:]
        return sum(item.get(key, 0) for item in last_n) / len(last_n)

    resume_score = 0
    if ra := state.get("resume_analysis"):
        resume_score = ra.get("ats_score", 0)

    dsa_score = 0
    if dp := state.get("dsa_progress"):
        dsa_score = dp.get("overall_score", 0)

    cs_score = 0
    if cf := state.get("cs_fundamentals_scores"):
        cs_score = rolling_avg(cf.get("history", []), "score", 5)

    interview_score = 0
    if iv := state.get("interview_scores"):
        interview_score = rolling_avg(iv.get("history", []), "overall_score", 3)

    comm_score = 0
    if cs := state.get("communication_scores"):
        comm_score = rolling_avg(cs.get("history", []), "overall_score", 5)

    project_score = 0
    if projects := state.get("project_recommendations"):
        total = len(projects)
        done = sum(1 for p in projects if p.get("status") == "completed")
        project_score = (done / total * 100) if total > 0 else 0

    sd_score = 0
    if sd := state.get("system_design_scores"):
        sd_score = rolling_avg(sd.get("history", []), "score", 5)

    plan_score = 0
    if cp := state.get("career_plan"):
        total_topics = 0
        def count_topics_in_weeks(weeks):
            nonlocal total_topics
            if not weeks: return
            for w in weeks:
                for d in w.get("days") or []:
                    morning = d.get("morning") or {}
                    total_topics += len(morning.get("topics") or [])
                    
                    evening = d.get("evening") or {}
                    total_topics += len(evening.get("topics") or [])
                    
                for t in w.get("weekly_tasks") or []:
                    total_topics += len(t.get("topics") or [])
        
        plan_format = cp.get("format")
        if plan_format == "days":
            count_topics_in_weeks([{"days": cp.get("days", [])}])
        elif plan_format in ["weeks", "weekly_summary"]:
            count_topics_in_weeks(cp.get("weeks", []))
        else:
            # Legacy fallback
            count_topics_in_weeks(cp.get("plan_30_day"))
            count_topics_in_weeks(cp.get("plan_60_day"))
            count_topics_in_weeks(cp.get("plan_90_day"))
            
            for phase in cp.get("phases") or []:
                count_topics_in_weeks(phase.get("weeks") or [])
            
        completed = len(state.get("completed_plan_topics") or [])
        if total_topics > 0:
            plan_score = min(100, (completed / total_topics) * 100)

    raw = (
        resume_score    * 0.10 +
        dsa_score       * 0.15 +
        cs_score        * 0.15 +
        sd_score        * 0.10 +
        interview_score * 0.15 +
        comm_score      * 0.10 +
        project_score   * 0.10 +
        plan_score      * 0.15
    )

    return max(0, min(100, int(raw)))