# Personal AI OS — starter v0.1

Standalone **Next.js + Supabase + OpenAI** personal workspace designed for future Slack / Discord adapters. Existing business projects are not modified.

## Current scope

- Supabase email/password sign-in, owner-scoped data via PostgreSQL Row Level Security.
- AI chat via OpenAI API with conversations and user-managed workspace memory.
- Tasks, approvals (manual record only), activity logs, usage estimates, and scheduled task creation.
- Light dashboard. Workspaces keep sensitive contexts separate.
- Budget gate before AI requests at $25 recorded estimated usage per UTC calendar month. **This is an approximate app-level gate, not a guaranteed hard cap**; concurrent calls and provider pricing can cause differences.

**Not yet included:** outbound email, connected Google/Slack/Discord actions, browser/computer use, autonomous complex AI workflows, actual execution of approved actions, or reliable production-grade background workers. Scheduled endpoint only creates task records when an authorized external scheduler calls it. Do not treat approvals as executing external actions.

## Create your personal infrastructure

1. Create a *new personal Supabase project*. In the SQL editor, run `supabase/schema.sql` **only in the new project**.
2. In Supabase Auth, use an email/password account for yourself; confirm the email as configured, and **disable new signups after** creating your account. Enable MFA where supported. For strict single-user operation, also add an owner allowlist to API routes and Auth policies.
3. Copy `.env.example` to `.env.local` and set Supabase project URL, publishable key, **server-only** Supabase service-role key, and OpenAI API key. Never commit `.env.local` or expose service-role key with `NEXT_PUBLIC_`.
4. Install Node 20+ and run `npm install`, `npm run typecheck`, `npm run dev`.
5. Create a new **private personal GitHub repository**, push these files, and connect that repository to a **new Vercel project**. Set matching production env vars in Vercel. Do not connect a business dashboard repository.
6. Create a strong random `CRON_SECRET`; configure an authorized scheduler to call `GET /api/cron` with `Authorization: Bearer <CRON_SECRET>` when desired. This creates reminder records; it does not run AI commands.

## Architecture to extend

`Web UI -> authenticated Next.js API -> AI orchestrator / tool registry -> approval policy -> worker queue / external connectors`.

Chat today runs through `/api/chat`. A future orchestration worker should take jobs from a durable queue, provide short-lived scoped tool credentials, validate tools per workspace, require approval for outbound or destructive actions, log every attempt and result, and enforce per-job/token cost ceilings. Slack and Discord adapters should only authenticate inbound events, resolve the owner's identity and workspace, and submit tasks to the *same* orchestrator. Never create separate agent memories per messaging platform.

## Security / spend cautions

- `SUPABASE_SERVICE_ROLE_KEY` is only used server-side by `/api/cron` and bypasses RLS: protect `CRON_SECRET`, authorize job data carefully, and restrict scheduling to task creation.
- API routes authenticate a Supabase access token. Disable public signup and implement a strict owner allowlist before opening to the internet.
- App API calls are not production rate-limited yet; add per-owner and IP throttling.
- Pricing rates in `.env.example` are placeholders for the configured model. Verify live pricing and replace them so the usage dashboard estimates are meaningful.
- For highly sensitive business and health records, build data classification, consent and compliance safeguards before connecting data sources.
