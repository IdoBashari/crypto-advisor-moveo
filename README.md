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

Server:

| Variable | Description |
| --- | --- |
| DATABASE_URL | PostgreSQL connection string (Supabase session pooler) |
| CLIENT_ORIGIN | Comma-separated list of allowed CORS origins |
| PORT | Optional. Defaults to 3000. Injected by Render in production |

Client:

| Variable | Description |
| --- | --- |
| VITE_API_URL | Base URL of the API |

## Status

Phase 1 complete: infrastructure, deployment, and database connectivity.
