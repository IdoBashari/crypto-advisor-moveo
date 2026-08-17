# Crypto Advisor

A personalised crypto dashboard. A new user answers three short questions — which coins they follow, what kind of investor they are, and what content interests them — and every section of the dashboard is then built around those answers. Two people with different profiles see a different dashboard.

Each section can be rated with a thumbs up or down. Those ratings are stored with the context they were given in, so they can be used later to improve what gets shown.

## Live

| | |
|---|---|
| App | https://crypto-advisor-moveo.vercel.app |
| API | https://crypto-advisor-moveo.onrender.com |

> The API runs on a free Render instance, which sleeps when idle. **The first request after a period of inactivity takes 30–50 seconds.** The dashboard shows a loading state while it wakes; it is not an error.

## Stack

- **Frontend** — React, TypeScript, Vite → Vercel
- **Backend** — Node, Express, TypeScript → Render
- **Database** — PostgreSQL (Supabase), accessed through Prisma
- **Auth** — bcrypt password hashing, JWT

## What it does

**Accounts** — register with name, email and password; log in; protected routes behind a JWT.

**Onboarding** — three questions on first login: assets, investor type, content interests. Saved to the database as preferences. Returning users go straight to the dashboard.

**Dashboard** — four sections, all shaped by those preferences:

| Section | Source |
|---|---|
| Coin Prices | CoinGecko |
| AI Insight of the Day | OpenRouter, free-tier models |
| Market News | Curated static catalog, filtered per profile |
| Fun Crypto Meme | Static catalog, filtered per profile, changes on refresh |

**Personalisation is visible.** The dashboard states the profile it is serving, and prices, news, memes and the insight all respond to it — not only to the coins selected, but to the investor type as well.

**Voting** — every section can be rated. Each vote is stored with the preference version and the content that was on screen at the time.

## Running locally

**Requirements:** Node 22+, and a PostgreSQL database. A free Supabase project works.

```bash
git clone https://github.com/IdoBashari/crypto-advisor-moveo.git
cd crypto-advisor-moveo
```

**1 · Environment files**

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in `server/.env`. Each variable is documented in the example file. The four that need real values:

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Your Postgres connection string |
| `DIRECT_URL` | Same host; used by the Prisma CLI |
| `JWT_SECRET` | Any long random string |
| `COINGECKO_API_KEY` | CoinGecko developer dashboard, demo plan |

`client/.env` works as shipped.

> **No OpenRouter account is needed.** `MOCK_LLM` defaults to true outside production, so the insight section serves canned text instead of calling a model. Set it to `false` and supply `OPENROUTER_API_KEY` to use the real thing.

**2 · Database**

```bash
cd server
npm install
npx prisma migrate deploy
```

This creates the tables. The meme catalog is synced into the database automatically when the server starts.

**3 · Run**

Two terminals.

```bash
cd server && npm run dev      # http://localhost:3000
```

```bash
cd client && npm run dev      # http://localhost:5173
```

> The server allows requests from the origin in `CLIENT_ORIGIN`, which is `http://localhost:5173`. If that port is already taken Vite will move to 5174 and requests will be blocked — free the port, or update `CLIENT_ORIGIN` to match.

## API

Everything except `/health` requires a bearer token.

| Method | Path | |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET` | `/health/db` | Database reachability |
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Obtain a token |
| `GET` | `/auth/me` | Current user |
| `GET` | `/preferences/assets` | Selectable assets |
| `GET` | `/preferences` | Active preferences |
| `POST` | `/preferences` | Save preferences |
| `GET` | `/prices` | Coin prices for the profile |
| `GET` | `/insight` | AI insight of the day |
| `GET` | `/news` | News for the profile |
| `GET` | `/meme` | A meme for the profile |
| `POST` | `/votes` | Record a vote |

## Notable decisions

**CryptoPanic is no longer free.** Its free tier closed during development, so news is served through a `NewsProvider` interface with a curated static catalog behind it. The brief allows a static fallback; the interface means a live source can replace it without touching anything above.

**Content is cached per day, per user.** The free OpenRouter tier allows 50 requests a day across the whole account, so an insight is generated once per user per day and read from the database after that. Prices use a short cache; memes change on every refresh.

**The model has a fallback chain.** Free model identifiers are withdrawn without notice, so the insight tries three models across different providers, then the last stored insight, then static text. The dashboard does not break when a model disappears.

**The client never calls an external API.** Every outbound request goes through the backend. Keys stay server-side, caching is central, and there is no CORS surface to manage.

**Preferences are versioned, not overwritten.** Editing preferences deactivates the current row and inserts a new version, so a vote cast last week still points at the profile that was active when it was cast.

More detail in [`docs/decisions.md`](docs/decisions.md).

## Database access

Reviewers have been invited to the Supabase project. Supabase does not offer a read-only role on the free plan — the roles available are Owner, Administrator and Developer — so the invitation is scoped to **Developer**, which is the narrowest of the three and grants no access to billing or project settings.

## Documents

- [`docs/decisions.md`](docs/decisions.md) — technical decisions and their reasoning
- [`docs/ai-collaboration.md`](docs/ai-collaboration.md) — how AI tools were used, and where their output was rejected
- [`docs/training-loop.md`](docs/training-loop.md) — proposal for using stored feedback to improve recommendations