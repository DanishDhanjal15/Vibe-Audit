SEVERITY_WEIGHTS = {
    "CRITICAL": 30,
    "HIGH": 20,
    "MEDIUM": 10,
    "LOW": 5,
}

def _raw_score(issues):
    """Calculate raw score from a list of issues."""
    score = 100
    for issue in issues:
        severity = issue.get("severity", "LOW")
        score -= SEVERITY_WEIGHTS.get(severity, 0)
    return max(0, score)

def calculate_vibe_score(issues):
    """Calculates the overall Vibe-to-Value score plus per-issue fix simulation."""
    base_score = _raw_score(issues)
    
    # Enrich each issue with its fix impact (score if that issue alone were fixed)
    enriched = []
    for i, issue in enumerate(issues):
        remaining = [iss for j, iss in enumerate(issues) if j != i]
        fixed_score = _raw_score(remaining)
        impact = fixed_score - base_score  # how many points this fix gives back
        enriched.append({
            **issue,
            "fix_impact": impact,
            "score_after_fix": fixed_score
        })
    
    # Sort by impact descending — greedy priority ordering
    enriched.sort(key=lambda x: x["fix_impact"], reverse=True)
    
    # Tag top 3 highest-impact issues as priority fixes
    for idx, issue in enumerate(enriched):
        issue["priority_rank"] = idx + 1 if idx < 3 else None

    is_go = base_score >= 75
    return {
        "score": base_score,
        "status": "Go" if is_go else "No-Go",
        "message": "Production Ready" if is_go else "Audit Required",
        "enriched_issues": enriched
    }
