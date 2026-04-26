# Cofoundr — pick up here when you're back

## What I did while you were away

1. **Applied the schema migration** to your Supabase `cofoundr` project (id `htcsrsgduafmynnlrdce`). All 9 tables exist with RLS enabled, all empty.
2. **Hardened the `set_updated_at` trigger function** by pinning its `search_path` (Supabase advisor flagged it).
3. The remaining two advisor flags (`audit_log` no-policy, `waitlist` permissive insert) are **intentional** and documented in the migration — leave them.

## Your Supabase credentials (paste these into `.env.local` and Vercel env vars)

```
NEXT_PUBLIC_SUPABASE_URL=https://htcsrsgduafmynnlrdce.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Y3Nyc2dkdWFmbXlubmxyZGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQzMTEsImV4cCI6MjA5MjgxMDMxMX0.itb2z37YU2jnkIvGiUVm_hza_KszntEvSDi52szm4cE
```

> Note: you'll **also** need the `service_role` key, which I cannot extract through the MCP tools (it's deliberately gated). Get it yourself:
> Supabase project → **Settings → API → Project API keys → service_role → reveal**, copy into `SUPABASE_SERVICE_ROLE_KEY`.

## Steps for you when you're back (in order)

### 1. Get your Anthropic API key
- https://console.anthropic.com → **Settings → API Keys → Create Key** (name: `cofoundr-prod`)
- **Settings → Billing**: set monthly limit to $200 with email alerts at 50/80/100%

### 2. Wire your local `.env.local`
```bash
cd ~/cofoundr
cp .env.example .env.local
```
Then edit `.env.local` and fill in:
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (for local dev)
- `NEXT_PUBLIC_SUPABASE_URL` ← already shown above
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← already shown above
- `SUPABASE_SERVICE_ROLE_KEY` ← from Supabase dashboard
- `ANTHROPIC_API_KEY` ← from Anthropic console

### 3. Configure Supabase auth redirect URLs
Supabase project → **Authentication → URL Configuration**:
- **Site URL:** `http://localhost:3000` (we'll change to `https://cofoundr.ca` after Vercel + DNS)
- **Additional Redirect URLs** (one per line):
  - `http://localhost:3000/auth/callback`
  - `https://cofoundr.ca/auth/callback`
  - `https://*.vercel.app/auth/callback`

### 4. Smoke-test locally
```bash
cd ~/cofoundr
npm run dev
```
Visit http://localhost:3000:
- Submit the waitlist form with a test email → check Supabase **Table Editor → waitlist** to confirm the row.
- Visit `/login` → enter your email → click magic link → land on `/dashboard`.
- Open browser dev tools, paste in the console:
  ```js
  fetch('/api/chat', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({messages:[{role:'user',content:'Hi Cofoundr, suggest 3 business ideas for someone in Toronto with $5k.'}]})
  }).then(r=>r.text()).then(console.log)
  ```
  You should get a Cofoundr-styled response back.

### 5. Push to GitHub (your `cofoundr` repo)
```bash
cd ~/cofoundr
git init -b main
git add .
git commit -m "chore: initial scaffold — landing, auth, RLS schema, Cofoundr persona"
# Replace YOUR_GH_USERNAME_OR_ORG with whatever you used:
git remote add origin git@github.com:YOUR_GH_USERNAME_OR_ORG/cofoundr.git
git push -u origin main
```

### 6. Wire Vercel
1. Vercel project → **Settings → Environment Variables** → add (Production + Preview + Development):
   - `NEXT_PUBLIC_SITE_URL` = `https://cofoundr.ca`
   - `NEXT_PUBLIC_SITE_NAME` = `Cofoundr`
   - `NEXT_PUBLIC_SUPABASE_URL` = (same as `.env.local`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (same as `.env.local`)
   - `SUPABASE_SERVICE_ROLE_KEY` = (same; mark **Sensitive**)
   - `ANTHROPIC_API_KEY` = (same; mark **Sensitive**)
2. Re-deploy: **Deployments** → top-right ⋮ → **Redeploy** the latest one.

### 7. Point cofoundr.ca at Vercel
1. Vercel project → **Settings → Domains** → add `cofoundr.ca` and `www.cofoundr.ca`.
2. At your registrar, follow Vercel's DNS instructions (CNAME for `www`, A or ALIAS for apex).
3. SSL cert auto-issues once DNS resolves.
4. Back in Supabase: change **Site URL** to `https://cofoundr.ca`.

## What I built while you drove

Week 2 milestones from the 90-day plan are in:

### New flows
- **`/onboarding`** — first-login wizard, two steps:
  1. **Workspace name + jurisdiction** (11 jurisdictions to choose from, ON + DE first-class).
  2. **Idea-discovery** — six questions: interests, budget, time, online/local, product/service, ambition. Saved to `business_ideas`.
- **`/dashboard`** — auth-gated, redirects to `/onboarding` if no workspace yet. Shows the workspace header + a full Cofoundr chat panel with sign-out.
- **`/auth/signout`** — POST clears the session and bounces home.

### New library code
- `src/lib/workspace.ts` — `listMyWorkspaces`, `createWorkspace` (atomic with rollback + audit log), `saveBusinessIdea`, slug normalization.
- `src/components/cofoundr-chat.tsx` — streaming chat UI, jurisdiction-aware seed message, persistent disclaimer, error fallback if Claude can't be reached. Hits the existing `/api/chat` endpoint.

### Server actions
- `src/app/(app)/onboarding/actions.ts` — Zod-validated `createWorkspaceAction` and `saveIdeaAction`. Both run server-side, no client-side trust.

### Schema additions in Supabase
- The `set_updated_at` function was hardened — pinned `search_path = public, pg_temp` per Supabase advisor recommendation.
- All 9 tables exist and are empty, RLS on, ready for your first sign-in to populate.

### What still requires you
The "Steps for you when you're back" list above is unchanged: Anthropic key, `.env.local`, Supabase URL config, smoke test, GitHub push, Vercel env wiring, DNS. Once you do those, the entire onboarding + chat loop will work end-to-end on `localhost:3000` and on your Vercel deploy.

## After that's live, the next build cycle (Week 3+)

In priority order:
1. **Persist chat history** — write user/assistant turns to `ai_messages`, scoped by `workspace_id`, costed in `cost_cents`. Hooks the audit log too.
2. **Tool use in chat** — start with `check_business_name(name)` (domain heuristic + USPTO/CIPO link surfacing) and `search_jurisdiction(topic)` against an Ontario + Delaware seed knowledge base.
3. **Document Vault** — first 3 templates (NDA, contractor, ToS) rendered server-side from MDX with the mandatory disclaimer footer; stored in `documents`.
4. **Workspace switcher** — the dashboard currently shows the first workspace. Once a user has more than one, we need a switcher.
5. **Rate limit `/api/chat`** — Upstash or Vercel KV with a per-user cap to control cost during private beta.
6. **Eval harness** — small CI test suite (Vitest) of 20 prompts with expected behaviors so prompt changes can't silently regress.
