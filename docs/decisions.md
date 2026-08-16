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

## DIRECT_URL points at the session pooler

Prisma normally wants a direct connection for migrations and a pooled one for queries. The Supabase direct host resolves to an IPv6 address only, and this machine has no IPv6 route to it, so `DIRECT_URL` holds the session pooler string as well. Migrations were verified to run correctly over the pooler. If IPv4 direct access is added later, only the environment variable needs to change.

## Vote to ContentItem deletes with SET NULL

Vote is an append-only event log, so a vote row has to survive the deletion of whatever it pointed at. `Restrict` would have been the alternative, but it fails on both counts: it would block content cleanup while any vote referenced an item, and it would deadlock user deletion, since deleting a user cascades to their AI insights while their votes still reference them. `SetNull` keeps the event, and the vote stays interpretable without the item because `section`, `userPreferencesId` and `contextSnapshot` already record what was on screen. `contentItemId` was nullable regardless, since PRICES votes never reference a stored item.

## Prisma 7 keeps connection URLs outside the schema

Prisma 7 rejects `url` and `directUrl` inside `schema.prisma` and dropped the `directUrl` concept entirely; connection configuration lives in `prisma.config.ts`, and `PrismaClient` takes a `@prisma/adapter-pg` driver adapter rather than a URL. The pooled/direct split is therefore expressed by pointing the config file and the runtime client at different environment variables. The Prisma CLI also no longer loads `.env` on its own, so `prisma.config.ts` imports `dotenv/config` explicitly.

## Render cold start accepted, not worked around

Render's free tier spins down after 15 minutes of inactivity. Rather than working around this with scheduled pings, the limitation is documented and handled with an explicit loading state in the UI.

## Coin prices are not persisted

Prices change too quickly for a stored row to stay meaningful, so they are
fetched on demand and cached briefly in memory rather than written to the
database. A vote on the prices section therefore has no content item to
reference; it records the assets that were on screen in `contextSnapshot`
instead.

## Token storage: localStorage over httpOnly cookie

**Decision.** The JWT is returned in the login response body, stored in
localStorage on the client, and sent on every request as an
`Authorization: Bearer` header.

**Why not an httpOnly cookie.** The client is deployed on Vercel and the
API on Render — two different registrable domains. Any cookie the API
sets is therefore a third-party cookie and requires `SameSite=None;
Secure`. Safari has blocked all third-party cookies by default since
version 13.1, and Firefox partitions them. A reviewer opening the live
link in Safari would find that login silently does not work, with no
error to explain it. That failure mode is unacceptable for a deployed
app whose public URL is part of the deliverable.

**Two supporting arguments.** First, httpOnly prevents token
*exfiltration*, not session *abuse*: an XSS payload in a SPA can simply
issue authenticated `fetch` calls with `credentials: 'include'`, so the
real security delta is smaller than it is often assumed to be. Second,
`SameSite=None` removes the built-in CSRF defence, which would have
required adding CSRF tokens — scope beyond the "basic authentication"
the brief asked for. A Bearer header is structurally immune to CSRF,
since the browser never attaches it automatically.

**Accepted cost.** An XSS vulnerability would expose the token until it
expires. Mitigations in place: React escapes by default, the project
contains no `dangerouslySetInnerHTML` and no third-party scripts, and
tokens expire after 24 hours. There are no refresh tokens, so logout is
client-side only and an issued token stays valid
