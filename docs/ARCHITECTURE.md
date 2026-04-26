# Cofoundr — architecture

A 5-minute orientation for any future engineer (including future-you) opening this repo.

## High-level shape

```
Browser
   │
   ▼
Cloudflare (WAF, DDoS, CDN; production only)
   │
   ▼
Vercel (Next.js 15 App Router)
   │   ├── Server Components (RSC) — initial render with user-scoped Supabase
   │   ├── Server Actions       — mutations from forms
   │   ├── Route Handlers       — /api/* (waitlist, chat, callback)
   │   └── Edge Middleware      — canonical-host redirect + auth-session refresh
   │
   ▼
Supabase
   ├── Postgres (RLS on every tenant table)
   ├── Auth (magic-link OTP, JWT in cookies)
   ├── Storage (Document Vault)
   └── pgvector (jurisdiction KB; added in Week 5)

Anthropic Claude API
   ├── Sonnet 4.6 — default chat
   ├── Opus 4.6 — strategy turns
   └── Haiku 4.5 — cheap classification + redaction
```

## Auth flow (magic link)

1. User enters email at `/login`.
2. Browser client calls `supabase.auth.signInWithOtp(...)` → Supabase emails a link to `/auth/callback?code=...`.
3. The `/auth/callback` route handler exchanges the code server-side via `supabase.auth.exchangeCodeForSession(code)`. Cookies are set on the response.
4. Subsequent requests pass through `middleware.ts`, which calls `updateSession()` to refresh the access token automatically.

## Multi-tenancy

- **Tenant unit:** `workspaces`. One business = one workspace.
- **Membership:** `workspace_members(workspace_id, user_id, role)`.
- **RLS pattern:** every tenant-owned table uses

  ```sql
  using  (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id))
  ```

  No code path bypasses RLS except explicit `createAdminClient()` use.
- **Owner is invariant:** `workspaces.owner_id` is the only path to deletion / member management.

## AI gateway

`src/lib/anthropic.ts` is the single chokepoint for Claude calls:

- `getAnthropic()` — singleton SDK client, throws if key missing.
- `pickModel(tier)` — `fast` / `default` / `strategy` route to Haiku / Sonnet / Opus.
- `cofoundrSystem({ jurisdiction, userName })` — versioned system prompt.

`src/app/api/chat/route.ts` is the auth-gated streaming endpoint. Future tool-use (search_jurisdiction, draft_legal_document, etc.) will be injected here, with each tool's effects logged to `ai_messages` and `audit_log`.

## Observability (planned)

- **Sentry** — uncaught exceptions, traces.
- **PostHog** — product analytics, feature flags.
- **Logflare or Axiom** — structured logs from server actions and API routes.
- **Stripe + Anthropic dashboards** — cost.

## What is intentionally out of scope (and why)

- **Native bookkeeping / payroll** — regulated, low-margin, QuickBooks already excellent. Integrate, don't compete.
- **Multi-agent orchestration** — premature. One persona with role-switching beats 15 half-baked agents until customer demand pulls more.
- **Direct ad spend management** — high fraud + policy risk; we generate creative, hand off execution.
- **More than ON + DE jurisdictions in Phase 1** — every province/state has unique forms; ship two well, expand serially.
