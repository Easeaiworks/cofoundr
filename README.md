# Cofoundr

> Your AI co-founder. Build, launch, run, and grow any business with the leverage of an entire team.

A Next.js 15 + Supabase + Anthropic Claude application. Multi-tenant, RLS-enforced, magic-link auth, streaming AI chat. Phase 1 scope: AI Launch Wizard for Ontario + Delaware founders, light CRM, document vault, $499 setup + $49/mo subscription, plus a $1,499 Done-For-You SKU.

**Owner:** EaseAI
**Working domain:** `cofoundr.ca` (canonical)
**Upgrade path:** `cofoundr.com` (offer pending), `cofoundr.studio` / `cofoundr.org` (fallback)

## Quickstart

```bash
npm install
cp .env.example .env.local      # then fill in the keys
npm run dev
# → http://localhost:3000
```

Full setup (Supabase project, Vercel deploy, Anthropic key, etc.) lives in `docs/SETUP.md`.

## Stack

| Layer       | Choice                                                              |
| ----------- | ------------------------------------------------------------------- |
| Frontend    | Next.js 15 App Router · TypeScript · Tailwind · shadcn-style UI     |
| Auth + DB   | Supabase — Postgres, Row-Level Security, magic-link auth, Storage |
| AI          | Anthropic Claude — Sonnet 4.6 default, Opus for strategy turns       |
| Validation  | Zod                                                                  |
| Hosting     | Vercel (with Cloudflare in front in production)                     |
| Payments    | Stripe (wired up in Week 11)                                        |
| Email       | Resend (wired up when Cofoundr starts sending transactional mail)    |

## Repo layout

```
cofoundr/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── page.tsx         # Landing page V1 with waitlist
│   │   ├── (auth)/login/    # Magic-link login
│   │   ├── auth/callback/   # Supabase OAuth callback
│   │   ├── (app)/dashboard/ # Auth-gated stub
│   │   └── api/
│   │       ├── waitlist/    # Public waitlist insert
│   │       └── chat/        # Claude streaming chat (auth-gated)
│   ├── components/          # UI primitives + features
│   ├── lib/
│   │   ├── env.ts           # Zod-validated env access
│   │   ├── utils.ts         # cn() helper
│   │   ├── anthropic.ts     # Claude client + Cofoundr system prompt
│   │   └── supabase/        # Browser, server, and middleware clients
│   └── types/database.ts    # Generated DB types (placeholder)
├── supabase/migrations/     # SQL migrations (RLS-first)
├── middleware.ts            # Canonical-host redirect + auth refresh
├── docs/                    # SETUP, ARCHITECTURE, SECURITY
└── .env.example             # All env vars, documented
```

## Security posture (day 1)

- All tables use Row-Level Security; tenant isolation via `workspace_members`.
- Service-role key is server-only; admin client is gated behind explicit code paths.
- HSTS, X-Frame-Options DENY, strict referrer policy, locked-down permissions.
- Audit-log table from day one; mutations are logged.
- No PII or government IDs touch the LLM without explicit, scoped, redacted consent.

The full security plan (SOC 2 path, GDPR/PIPEDA, AI-specific risks) is in `docs/SECURITY.md`.

## License

Proprietary. © EaseAI.
