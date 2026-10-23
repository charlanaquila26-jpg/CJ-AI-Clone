"""CJ AI Clone — Cloudflare Python Worker (FastAPI)."""
import json
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from workers import asgi

app = FastAPI(title='CJ AI Clone')
Default = asgi.entrypoint(app)

@app.get('/api/health')
async def health():
    return {'ok': True, 'service': 'cj-ai-clone', 'python': True}

@app.get('/api/config')
async def config(request: Request):
    env = request.scope['env']
    return {'supabase_url': str(getattr(env, 'SUPABASE_URL', '')), 'supabase_key': str(getattr(env, 'SUPABASE_PUBLISHABLE_KEY', ''))}

@app.post('/api/chat')
async def chat(request: Request):
    # Fail closed until the owner and provider secrets have been configured.
    env = request.scope['env']
    if not getattr(env, 'OPENAI_API_KEY', None):
        raise HTTPException(status_code=503, detail='OpenAI API key has not been configured yet.')
    raise HTTPException(status_code=503, detail='AI messaging is disabled until verified server-side authentication and budget accounting are configured.')

@app.get('/{path:path}')
async def frontend(path: str, request: Request):
    env = request.scope['env']
    url = f'https://assets.local/{path or "index.html"}'
    response = await env.ASSETS.fetch(url)
    from fastapi.responses import Response
    return Response(content=await response.bytes(), status_code=response.status, headers=dict(response.headers))
