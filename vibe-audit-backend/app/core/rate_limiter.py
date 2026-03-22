"""
Rate limiting middleware using an in-memory sliding-window counter.
No external dependencies required.
"""

import time
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Limits each client IP to `max_requests` per `window_seconds`.
    Returns 429 Too Many Requests when the limit is exceeded.
    """

    def __init__(self, app, max_requests: int = 10, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clients: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup(self, ip: str, now: float):
        cutoff = now - self.window_seconds
        self.clients[ip] = [t for t in self.clients[ip] if t > cutoff]

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for badge endpoint and health check
        if request.url.path in ("/", "/api/badge", "/docs", "/openapi.json"):
            return await call_next(request)

        ip = self._get_client_ip(request)
        now = time.time()
        self._cleanup(ip, now)

        if len(self.clients[ip]) >= self.max_requests:
            remaining = self.window_seconds - (now - self.clients[ip][0])
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again in {int(remaining)} seconds."
            )

        self.clients[ip].append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(self.max_requests - len(self.clients[ip]))
        return response
