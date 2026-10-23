CJ AI Clone — Chat presentation and assistant style patch

1. Open GitHub repository charlanaquila26-jpg/CJ-AI-Clone on branch main.
2. Upload BOTH files preserving their locations:
   - upgrade_cj.py (repository root)
   - .github/workflows/upgrade-cj.yml
3. GitHub Actions triggers on upgrade_cj.py upload. Open Actions tab and verify the workflow succeeded.
4. Wait for Cloudflare Workers & Pages -> cj-ai-clone -> Deployments to succeed.
5. Refresh your CJ site. Ask a longer question. Assistant replies should render paragraphs, bullets, headings, tables and code blocks cleanly.

Notes:
- Does not touch environment variables, secrets, Supabase, or wrangler.jsonc.
- The AI backend model remains gpt-4.1-mini to preserve your spending target.
- ChatGPT's proprietary internal instructions cannot be duplicated. This improves CJ's user-facing style, not its tool capabilities.
- If GitHub Actions blocks pushing, check repository Settings -> Actions -> General -> Workflow permissions -> Read and write permissions.
