# Architecture

> One paragraph: what the system does and the shape of it (e.g. "Next.js app with
> route-handler API, Prisma/Postgres data layer, Redis for sessions").

## Module map

See `docs/nodes.md` (generated). This document explains the *why* behind those
boundaries; the map shows the *what*.

## Layers & responsibilities

| Layer | Owns | Must not |
|---|---|---|
| ui | <pages/components, rendering> | <reach into the DB directly> |
| api | <request handling, validation> | <contain business rules> |
| domain | <business logic, use cases> | <know about HTTP or the DB driver> |
| data | <persistence, queries> | <import ui/api> |

## Key flows

- **<e.g. Login>**: ui → api/auth → domain → data. <one line per critical path>

## Cross-cutting concerns

- Auth/session: <where, how>
- Error handling: <pattern>
- Config/env: <where validated>
- Logging/observability: <what, where>

## Decisions (and why)

- <ADR-style: chose X over Y because Z. Keep these; they prevent re-litigating.>

## Known constraints / debt

- <Things a contributor will hit. Be honest.>
