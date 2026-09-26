"""
Limitation de débit en mémoire, par IP, pour les routes sensibles aux abus
(connexion par mot de passe, inscription).

L'IP vient de l'en-tête CF-Connecting-IP ajouté par Cloudflare. C'est fiable
ICI uniquement parce que le backend de prod n'est joignable que par le tunnel
Cloudflare : personne ne peut lui parler en direct avec un en-tête forgé.

Limite connue : les compteurs vivent dans chaque worker uvicorn. Avec 2
workers, un attaquant peut obtenir au pire le double de la limite affichée.
Suffisant pour bloquer la force brute et la création de comptes en masse ;
passer à Redis si un jour il faut une limite exacte.
"""

import os
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status


def client_ip(request: Request) -> str:
    return request.headers.get("cf-connecting-ip") or (request.client.host if request.client else "unknown")


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - self.window:
                hits.popleft()
            if len(hits) >= self.max_requests:
                retry_after = int(self.window - (now - hits[0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many attempts, try again in {retry_after}s",
                    headers={"Retry-After": str(retry_after)},
                )
            hits.append(now)
            if len(self._hits) > 10_000:  # évite que la mémoire grossisse sans fin
                for k in [k for k, v in self._hits.items() if not v or v[-1] <= now - self.window]:
                    del self._hits[k]

    def __call__(self, request: Request) -> None:
        # Désactivé par la suite de tests, qui crée beaucoup de comptes depuis la même "IP".
        if os.getenv("DISABLE_RATE_LIMIT") == "1":
            return
        self.check(client_ip(request))


login_limiter = RateLimiter(max_requests=10, window_seconds=60)      # 10 tentatives / minute
signup_limiter = RateLimiter(max_requests=5, window_seconds=3600)    # 5 inscriptions / heure
