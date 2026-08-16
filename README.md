# Crypto Advisor

A personalized crypto investor dashboard. Users complete a short onboarding quiz, and the dashboard serves daily AI-curated content tailored to their profile.

Built as a coding assignment for Moveo Group.

## Live

- App: https://crypto-advisor-moveo.vercel.app
- API: https://crypto-advisor-moveo.onrender.com/health

> The backend runs on Render's free tier, which spins down after 15 minutes of inactivity. The first request after an idle period may take up to a minute to respond. This is a known limitation of the free plan and is handled with an explicit loading state in the UI.

## Stack

- Frontend: React, TypeScript, Vite -- deployed on Vercel
- Backend: Node, Express, TypeScript -- deployed on Render
- Database: PostgreSQL (Supabase)

## Structure

crypto-advisor-moveo/
  client/    React frontend
  server/    Express API
  docs/      Project documentation

## Running locally

Requires Node 22+.

Server:

    cd server
    npm install
    cp .env.example .env    # fill in DATABASE_URL
    npm run dev

Client:

    cd client
    npm install
    cp .env.example .env
    npm run dev

The client runs on http://localhost:5173 and expects the API on http://localhost:3000.

## Environment variables

Each side has its own `.env`, created by copying the neighbouring `.env.example`. Neither `.env` is committed. The server validates its variables at startup and refuses to boot if a required one is missing, so a misconfigured deploy fails immediately rather than on the first request.

### Server (`server/.env`, set in the Render dashboard for production)

| Variable | Required | Local value | Production value |
| --- | --- | --- | --- |
| DATABASE_URL | yes | Supabase session pooler connection string | same |
| DIRECT_URL | yes | Supabase direct connection string, or the session pooler string where the direct host is unreachable over IPv6 | same |
| CLIENT_ORIGIN | yes | `http://localhost:5173` | the deployed Vercel origin, e.g. `https://crypto-advisor-moveo.vercel.app` |
| JWT_SECRET | yes | any long random hex string | a different long random hex string, never the local one |
| JWT_EXPIRES_IN | yes | `24h` | `24h` |
| PORT | no | `3000` | injected by Render; leave unset |
| NODE_ENV | no | unset (defaults to `development`) | `production` |

`DIRECT_URL` is used only for migrations and is read by `prisma.config.ts`; the running server uses `DATABASE_URL`. See `docs/decisions.md` for why both may point at the pooler.

### Client (`client/.env`, set in the Vercel project settings for production)

| Variable | Required | Local value | Production value |
| --- | --- | --- | --- |
| VITE_API_URL | yes | `http://localhost:3000` | the deployed Render URL, e.g. `https://crypto-advisor-moveo.onrender.com` |

Vite inlines `VITE_*` variables at build time, so changing this in Vercel requires a redeploy to take effect. Never put a secret in a `VITE_*` variable — anything prefixed this way ships to the browser.

## Status

Phase 1 complete: infrastructure, deployment, and database connectivity.
