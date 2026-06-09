---
name: detect-project
description: Classify a codebase's stack, layout, and conventions before doing anything else. Use this whenever you start working in an unfamiliar repository, when the user asks "what kind of project is this", when bootstrapping context files, or before generating a project map — even if the user doesn't explicitly ask for detection. Run it before scaffold-context or project-map so downstream steps are accurate.
---

# Detect Project

Produce a short, accurate classification of the current project. Do **not** guess
from the directory name — read evidence files.

## Procedure

1. Read manifests and lockfiles that exist (do not assume):
   - `package.json` (scripts, dependencies, `workspaces`, `packageManager`)
   - Lockfile: `pnpm-lock.yaml` | `package-lock.json` | `yarn.lock` | `bun.lockb`
   - Monorepo: `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`
   - Framework configs: `next.config.*`, `vite.config.*`, `nuxt.config.*`,
     `astro.config.*`, `remix.config.*`, `electron-builder.*`
   - Backend/data: `prisma/schema.prisma`, `drizzle.config.*`, `docker-compose.*`
   - Other ecosystems: `*.csproj`/`*.sln` (C#/Unity), `pyproject.toml`,
     `go.mod`, `Cargo.toml`, `pom.xml`

2. Derive, and state your confidence for each:
   - **Primary language(s)** and **runtime**
   - **Framework(s)** and rendering model (SSR/CSR/ISR/static) if a web app
   - **Package manager** (from the lockfile, not from docs)
   - **Repo shape**: single package vs monorepo (and workspace tool)
   - **Layers present**: ui / api / domain / data / config / infra
   - **Notable conventions**: TS strictness, path aliases (`tsconfig.json`
     `paths`), test runner, lint/format setup

3. Flag anything you could not determine. Never invent a dependency or version —
   quote the manifest.

## Output

A compact summary (not a wall of prose):

```
Language:      TypeScript (strict)
Runtime:       Node 20
Framework:     Next.js 15 (App Router, RSC)
Package mgr:   pnpm (pnpm-lock.yaml)
Repo shape:    monorepo — turborepo, pnpm workspaces (apps/*, packages/*)
Data:          Prisma + PostgreSQL
Layers:        ui, api (route handlers), data (prisma), lib
Path aliases:  @/* -> ./src/*
Unknown:       deployment target (no vercel.json / Dockerfile found)
```

This classification is the input to `scaffold-context` and `project-map`.
