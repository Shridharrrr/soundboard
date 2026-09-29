# Architectural Decisions Log

This document records architectural decisions made following Rule 1 of `PLAN.md`.

## 1. Locked Decisions Reference
- **Voice Stack**: AssemblyAI Voice Agent API with WebSocket speech-to-speech, browser direct connection via server-minted ephemeral tokens.
- **Voice Model**: Inline configuration via `session.update`, voice `ivy`.
- **Tool Execution**: Client-side execution in browser reacting to `tool.call`, returning `tool.result` after `reply.done`.
- **Backend**: Fastify 5 + TypeScript + Zod + `pg` + `yaml`.
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Zustand + Recharts + Framer Motion.
- **Database**: PostgreSQL 16 compatible schema with read-only role `voice_ro` constrained to view `analytics.fact_orders`.
- **In-Memory / PGlite Fallback**: When external PostgreSQL is not running during local dev/tests, `@electric-sql/pglite` can provide full in-process PostgreSQL 16 execution seamlessly with identical SQL behavior, while maintaining standard `pg` connection capability when `DATABASE_URL` is active.
- **Testing**: Vitest for unit & integration testing.
- **Demo As-Of Date**: Pinned to `2026-09-29`.
