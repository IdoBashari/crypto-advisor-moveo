# Technical Decisions

A record of non-obvious technical choices and the reasoning behind them.

## Supabase session pooler over direct connection

Supabase direct connections are IPv6-only on the free tier; an IPv4 address is a paid add-on. Render's free tier does not guarantee IPv6 egress, so a direct connection risks failing with an opaque timeout. The session pooler is reachable over IPv4 and behaves like a normal connection, unlike the transaction pooler, which targets serverless workloads and breaks prepared statements used by Prisma.

## Supabase Data API disabled

All database access flows through the backend. The client never talks to Supabase directly, so the auto-generated REST layer would only add an unused public surface over application tables. Authorization is enforced in backend middleware rather than in row-level security.

## Managed Postgres over SQLite

The assignment requires database access for review. SQLite on a free host sits on an ephemeral filesystem and is wiped on every deploy, which would leave reviewers with an empty database.

## Health checks use the raw pg driver

The health endpoint runs SELECT 1 through node-postgres rather than through the ORM, so it reports on database reachability independently of the data layer.

## CORS restricted to an allowlist

Allowed origins are read from CLIENT_ORIGIN rather than hardcoded, since the client origin differs between local development and production. Requests with no Origin header are allowed so that command-line tools and health checks are not blocked.

## Render cold start accepted, not worked around

Render's free tier spins down after 15 minutes of inactivity. Rather than working around this with scheduled pings, the limitation is documented and handled with an explicit loading state in the UI.
