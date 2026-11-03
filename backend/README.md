# aniBet — API

FastAPI backend and PostgreSQL schema of [aniBet](../README.md).

```bash
cp .env.example .env
docker compose up --build    # API on :5000, Adminer on :8081, test report on :8082
```

- `app/routes/`: HTTP layer (validation, permissions)
- `app/utils/`: business logic and SQL, one module per domain
- `migrations/`: schema and PL/pgSQL functions (bets, payouts, disputes, rewards), applied in order
- `tests/`: end-to-end pytest suite against a real Postgres. See [tests/README.md](tests/README.md)

See the [root README](../README.md) for the architecture, environment variables and deployment.
