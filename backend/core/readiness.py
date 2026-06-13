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

    raw = (
        resume_score    * 0.15 +
        dsa_score       * 0.20 +
        cs_score        * 0.15 +
        sd_score        * 0.15 +
        interview_score * 0.15 +
        comm_score      * 0.10 +
        project_score   * 0.10
    )

    return max(0, min(100, int(raw)))