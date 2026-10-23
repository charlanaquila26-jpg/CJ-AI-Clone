# CJ AI Clone — Cloudflare Python Worker

Python FastAPI app running on Cloudflare Workers. Light-themed browser dashboard with Supabase login and persistent tasks, memory, approval readout, activities, and usage readout.

## Deploy
1. Set up Python 3.13+, uv, Node. `uv run pywrangler deploy` (see Cloudflare Python Workers docs).
2. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as Worker environment variables. These are public keys, not service-role secrets.
3. Configure Supabase Auth email/password for your personal login, restrict signups, verify all nine RLS tables from prior database migration. Set Site URL and permitted redirect URLs.
4. AI chat stays disabled until authenticated OpenAI backend and cost tracking are implemented; do not expose a raw OpenAI key in the browser.

The app does NOT yet perform autonomous work or actions. Approval queue is read-only and requires a separate action policy/executor. Don't connect sensitive records until isolation and protections are tested.
