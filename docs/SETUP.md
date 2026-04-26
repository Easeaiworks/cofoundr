# SETUP — Cofoundr (EaseAI)

A step-by-step. Treat each numbered step as a thing you actually do; don't skip ahead.

All cloud resources live under the **EaseAI** organization / team (GitHub org `EaseAI`, Supabase org `EaseAI`, Vercel team `EaseAI`). When prompted by any provider for "owner" or "organization", choose EaseAI — never your personal account.

---

## 1. Local prerequisites

- Node.js 20+ (`node -v`)
- npm 10+ (`npm -v`)
- Git
- A Chrome browser signed in to GitHub, Supabase, Vercel, and Anthropic Console

```bash
cd ~/cofoundr
npm install
```

## 2. Environment variables

Copy and fill in:

```bash
cp .env.example .env.local
```

Each value, where to get it:

| Variable                            | Where                                                              |
| ----------------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`              | `https://cofoundr.ca` for prod, `http://localhost:3000` for dev    |
| `NEXT_PUBLIC_SUPABASE_URL`          | Supabase project → Settings → API → Project URL                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Supabase project → Settings → API → `anon public` key              |
| `SUPABASE_SERVICE_ROLE_KEY`         | Supabase project → Settings → API → `service_role` (server only)   |
| `ANTHROPIC_API_KEY`                 | console.anthropic.com → Settings → API Keys (use the EaseAI org)   |

> **Never commit `.env.local`.** It's in `.gitignore`.

## 3. Supabase project (EaseAI)

1. Sign in at https://supabase.com.
2. Switch organization to **EaseAI**.
3. **New project** → name `cofoundr-prod`, region `ca-central-1` (Toronto), strong DB password, Pro plan when ready (free is fine for dev).
4. Wait for provisioning, then go to **SQL Editor** and paste the contents of `supabase/migrations/20260426000000_init.sql`. Run.
5. **Authentication → Providers**: enable Email, **disable** "Confirm email" only if you want to ship the magic link without confirmation prompts.
6. **Authentication → URL Configuration**: set Site URL to `https://cofoundr.ca`, add `http://localhost:3000` and your Vercel preview domain to Redirect URLs.
7. **Settings → API**: copy the three keys into `.env.local` (and later, into Vercel).

## 4. Anthropic Console (EaseAI)

1. https://console.anthropic.com → switch to the **EaseAI** organization.
2. **Settings → API Keys** → create one named `cofoundr-prod`. Save it to `.env.local` as `ANTHROPIC_API_KEY`.
3. **Settings → Billing**: add a card. Set a monthly spend limit (start at $200) and email alerts at 50% / 80% / 100%.

## 5. GitHub repo (EaseAI org)

1. https://github.com/organizations/EaseAI/repositories/new
2. Name `cofoundr`, visibility **Private**, do NOT initialize with README (we already have one).
3. Push:
   ```bash
   cd ~/cofoundr
   git init -b main
   git add .
   git commit -m "chore: initial scaffold"
   git remote add origin git@github.com:EaseAI/cofoundr.git
   git push -u origin main
   ```

## 6. Vercel project (EaseAI team)

1. https://vercel.com → switch to the **EaseAI** team.
2. **Add New… → Project** → import `EaseAI/cofoundr`.
3. Framework preset: Next.js (auto-detected). Root directory: `./`.
4. **Environment Variables** (Production + Preview + Development):

   - `NEXT_PUBLIC_SITE_URL` = `https://cofoundr.ca`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark "Sensitive")
   - `ANTHROPIC_API_KEY` (mark "Sensitive")
   - `NEXT_PUBLIC_SITE_NAME` = `Cofoundr`

5. Deploy. First build takes ~2 minutes.

## 7. Domain (cofoundr.ca)

1. In Vercel project → **Domains** → add `cofoundr.ca` and `www.cofoundr.ca`.
2. At your registrar, follow Vercel's DNS instructions (CNAME for `www`, A or ALIAS for apex).
3. Once `www.cofoundr.ca` resolves, Vercel auto-issues an SSL cert.
4. When `cofoundr.com` is acquired, just update `NEXT_PUBLIC_SITE_URL` in Vercel env vars and add the new domain. The middleware redirect is already wired.

## 8. Smoke test

- Visit your deploy URL → see the Cofoundr landing.
- Submit the waitlist form → check the `waitlist` row in Supabase.
- Visit `/login` → enter your email → click the magic link in the inbox → land on `/dashboard`.
- Hit `/api/chat` while signed in → the Cofoundr persona responds.

If any of the above fails, check Vercel logs (Project → Logs) and Supabase logs (Project → Logs).

---

## What's next (Week 2)

- Workspace creation flow on first login.
- Onboarding wizard (the 6-question idea-discovery from `business_ideas`).
- Connect tool use to the chat endpoint.

See `../AI-Business-OS-Strategic-MVP-Plan.docx` (in your outputs folder) for the full 90-day plan.
