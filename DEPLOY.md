# Deploy naar Vercel

Publieke deployment van de Herqua Schoenadviseur demo.

## Architectuur op Vercel

```
https://herqua-schoenadviseur.vercel.app
├── /                  → frontend/index.html (rewrite)
├── /frontend/*        → statische JS/CSS/HTML
├── /architecture      → frontend/architecture.html
├── /api/recommend     → serverless function
├── /api/scan/foot     → serverless function
└── /api/scan/gait     → serverless function
```

Alles same-origin → geen CORS-gedoe. Node proxy.js is vervangen door drie Vercel serverless functions die de bestaande handlers hergebruiken.

## Eenmalige setup

### 1. Push naar GitHub

Als je nog geen eigen repo hebt voor dit project:

```bash
cd /Users/plaizier/Documents/claude/herqua-schoenadviseur

# Nieuwe git-repo (los van de monorepo)
git init
git add .
git commit -m "Initial import — Herqua Schoenadviseur v2c"

# Maak op GitHub.com een privé-repo 'herqua-schoenadviseur' (leeg, zonder README)
# Dan:
git remote add origin https://github.com/<jouw-user>/herqua-schoenadviseur.git
git branch -M main
git push -u origin main
```

**Belangrijk:** `.env` is al in `.gitignore` — jouw ANTHROPIC_API_KEY wordt NIET gepusht.

### 2. Verbind Vercel met GitHub

1. Ga naar https://vercel.com/new
2. Kies je nieuwe GitHub-repo
3. **Root Directory:** leeg laten (repo-root)
4. **Framework Preset:** "Other"
5. **Build Command:** leeg laten
6. **Output Directory:** leeg laten
7. Klik **Deploy** — faalt op missende API key, dat is verwacht

### 3. Environment variables

Vercel dashboard → jouw project → **Settings → Environment Variables**:

| Variable | Value | Omgevingen |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (uit `.env`) | Production, Preview, Development |
| `HERQUA_SHARED_TOKEN` | (leeg, of genereer met `openssl rand -hex 32`) | Production |
| `ALLOWED_ORIGINS` | (leeg, of `https://herqua.nl`) | Production |

Na instellen: **Redeploy** via Deployments-tab.

### 4. Test

Open de Vercel-URL (bijv. `https://herqua-schoenadviseur.vercel.app`):
- Wizard doorlopen → Herman adviseert
- Voetscan met A4 testen
- Loopanalyse (werkt op HTTPS, vereist om camera te openen)

## Updates deployen

Elke `git push` op main-branch triggert automatisch een nieuwe Vercel-deploy.

## Lokale dev met Vercel CLI

Eenmalig:
```bash
npm install -g vercel
cd /Users/plaizier/Documents/claude/herqua-schoenadviseur
vercel link  # koppelt aan Vercel project
vercel env pull .env.local  # haalt env vars op
```

Dan:
```bash
vercel dev
# → draait op http://localhost:3000 met zowel frontend als /api/*
```

## Custom domein

Vercel dashboard → **Settings → Domains** → bijv. `demo.herqua.nl`:
1. Voeg domein toe
2. Vercel geeft DNS-records (CNAME of A-record)
3. Configureer deze bij je DNS-provider
4. SSL wordt automatisch geregeld (Let's Encrypt)

## Kosten

Vercel Hobby-plan is gratis voor:
- 100GB bandwidth/maand
- 100GB·uur serverless execution
- Unlimited static requests

Voor deze demo ruim voldoende. Anthropic API-verbruik staat los (betaal je direct aan Anthropic).

## Troubleshooting

**"ANTHROPIC_API_KEY niet geconfigureerd" (500):** env vars niet ingesteld of project niet opnieuw deployed na instellen.

**CORS-fout in browser-console:** check `ALLOWED_ORIGINS` env var — laat leeg voor publieke demo.

**MediaPipe Pose laadt niet:** check browser-console. MediaPipe CDN wordt live opgehaald; HTTPS vereist voor camera-access (Vercel levert HTTPS automatisch).

**Loopanalyse werkt niet op iPhone Safari:** bekend — iOS camera-permissies hebben expliciete user-gesture nodig. Werk via upload-mode als fallback.
