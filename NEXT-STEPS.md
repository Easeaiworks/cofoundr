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

## What I built in build cycle 2 (after the GitHub push)

While you set up Vercel, I shipped the next layer of product. **You'll need to commit + push these changes to redeploy on Vercel** (one command at the bottom).

### New
- **Chat persistence** — every turn (user, assistant, tool) is saved to `ai_messages` with model name, token counts, and cost in cents. Audit-log mirror writes for every turn. (`src/lib/ai-messages.ts`)
- **Cost accounting** — pricing table for Sonnet 4.6 / Opus 4.6 / Haiku 4.5; rounds up to the cent. (`src/lib/cost.ts`)
- **First two tools** — Cofoundr can now call them mid-conversation:
  - `check_business_name(name)` — real DNS lookup of `.com` / `.ca` / `.ai` availability, plus USPTO / CIPO / IG / X / TikTok / LinkedIn search URLs and an honest "not authoritative" disclaimer.
  - `search_jurisdiction(jurisdiction, topic)` — curated, citation-bearing snippets for Ontario incorporation/taxes and Delaware incorporation/taxes. Other jurisdictions return a partial-coverage warning so the model degrades gracefully.
  - Tools live in `src/lib/tools.ts` with Zod input validation, hard timeouts, and a clean dispatcher.
- **Agentic chat loop** — `/api/chat` was rewritten to run a Claude tool-use loop (max 4 iterations) instead of pure streaming. Multiple tool calls per turn supported. Persistence happens at every step.
- **History restored on refresh** — the dashboard now hydrates the chat from `ai_messages` so a page reload doesn't wipe the conversation.

### Changed request shape (chat endpoint)
The chat client now sends `{ workspace_id, message }` instead of a full messages array. Server pulls history from the DB. This makes the client simpler and the audit trail authoritative.

### Commit & push the cycle 2 work

```bash
cd ~/cofoundr
git add .
git commit -m "feat: chat persistence + tool use (check_business_name, search_jurisdiction)

- Save every user/assistant/tool turn to ai_messages with cost accounting
- Anthropic tool-use loop in /api/chat (max 4 iterations)
- check_business_name: live DNS heuristic + trademark and social-handle search URLs
- search_jurisdiction: curated KB snippets for ON + DE; graceful degradation elsewhere
- Restore chat history on dashboard refresh
- Audit-log every chat turn"
git push
```

If Vercel is connected to the repo, the push will auto-trigger a redeploy. ~2 minutes later, sign in on the live site and try asking Cofoundr "Is the name 'Mariposa Candle Co.' available?" — it should call the `check_business_name` tool and come back with real DNS results.

## Build cycle 3 (next, in priority order)

1. **Document Vault — first 3 templates** (NDA, contractor agreement, ToS) rendered server-side from MDX with the disclaimer footer baked in; stored in `documents`. Two-button UI: "Generate" and "Download PDF".
2. **Rate limit `/api/chat`** — Upstash or Vercel KV with a per-user daily cap to keep AI spend predictable in private beta.
3. **Workspace switcher** — currently we always show the first workspace; need a dropdown once a user has more than one.
4. **Eval harness** — small Vitest suite of 20 prompts so prompt or model changes can't silently regress.
5. **Streaming UI for tool-free turns** — keep the agentic loop, but stream when the model returns text-only.
6. **Domain-availability tool upgrade** — go from DNS heuristic to a real registrar API (Namecheap or Porkbun) so we can quote prices and hand off the buy.
