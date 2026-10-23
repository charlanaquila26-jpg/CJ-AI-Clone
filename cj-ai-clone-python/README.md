# CJ AI Clone — Cloudflare Python Worker

Python FastAPI app hosted on Cloudflare Workers, with Supabase authentication and a private dashboard.

## Security

Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as runtime bindings. Add `OPENAI_API_KEY` only as an encrypted Cloudflare **Secret**, never as a plaintext variable. Rotate a key that was mistakenly added as plaintext.

AI chat and autonomous actions remain disabled in the current backend. Do not consider the OpenAI integration complete until the backend implements session verification, budget enforcement, persisted conversations, and approval gating.

## Deployment

Run `uvx --from workers-py pywrangler deploy` from the `cj-ai-clone-python` directory.
