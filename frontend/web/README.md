# aniBet — web app

Next.js 16 (App Router) frontend of [aniBet](../../README.md).

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL
npm ci
npm run dev                  # http://localhost:3000
npx tsc --noEmit             # type check (run in CI)
npm run build                # production build
```

See the [root README](../../README.md) for the architecture, the backend setup and the environment variables.
