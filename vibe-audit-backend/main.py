from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from app.api import router
from app.core.rate_limiter import RateLimitMiddleware

app = FastAPI(title="Vibe-Audit API", description="Production-Ready Gatekeeper for Vibe Coding")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting: 10 requests per 60 seconds per IP
app.add_middleware(RateLimitMiddleware, max_requests=10, window_seconds=60)

app.include_router(router)

@app.get("/")
def read_root():
    return {"message": "Vibe-Audit API is running! 🚀"}

@app.get("/api/badge")
def get_badge(score: int = Query(default=0, ge=0, le=100)):
    """Returns a shields.io-style SVG security badge."""
    if score >= 85:
        color = "#10b981"  # emerald
        label = "Production Ready"
    elif score >= 60:
        color = "#f59e0b"  # amber
        label = "Audit Suggested"
    else:
        color = "#ef4444"  # red
        label = "Not Production Ready"

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="220" height="24">
  <linearGradient id="bg" x2="0" y2="100%">
    <stop offset="0" stop-color="#1e293b" stop-opacity=".9"/>
    <stop offset="1" stop-color="#0f172a" stop-opacity="1"/>
  </linearGradient>
  <rect rx="4" width="220" height="24" fill="url(#bg)"/>
  <rect rx="4" x="0" width="100" height="24" fill="#0f172a"/>
  <rect rx="4" x="100" width="120" height="24" fill="{color}"/>
  <!-- rounded fix for left segment -->
  <rect x="96" width="4" height="24" fill="{color}"/>
  <g fill="#fff" font-family="Inter,DejaVu Sans,sans-serif" font-size="11" font-weight="700">
    <text x="6" y="16" fill="#94a3b8">🛡 Vibe-Audit</text>
    <text x="106" y="16">{score}/100 · {label}</text>
  </g>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml",
                    headers={"Cache-Control": "max-age=3600"})

