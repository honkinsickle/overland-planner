# Claud v1.0 — Overlanding Trip Planner

AI-powered overlanding itinerary generator built on the Claud v1.0 master prompt.
Runs as a Node.js/Express app with a server-side Anthropic API proxy.

---

## Project Structure

```
overland-planner/
├── server.js          ← Express server + Anthropic proxy
├── package.json
├── .env.example       ← Copy to .env with your API key
├── .gitignore
└── public/
    └── index.html     ← Full frontend (no build step needed)
```

---

## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API key
```bash
cp .env.example .env
```
Open `.env` and replace the placeholder with your real Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```
Get your key at: https://console.anthropic.com/

### 3. Run locally
```bash
npm start
```
Open http://localhost:3000

For auto-restart on file changes during development:
```bash
npm run dev
```

---

## Deploy to Render (Free Tier)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/overland-planner.git
git push -u origin main
```

### Step 2 — Create a Render Web Service
1. Go to https://render.com and sign in (free account is fine)
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Configure the service:
   - **Name**: `overland-planner` (or anything you like)
   - **Region**: Oregon (US West) — closest to LA/Alaska route
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### Step 3 — Add your API key as an environment variable
1. In your Render service, go to **Environment**
2. Click **Add Environment Variable**
3. Key: `ANTHROPIC_API_KEY`
4. Value: your key from https://console.anthropic.com/
5. Click **Save Changes** — Render will redeploy automatically

### Step 4 — Open your app
Render gives you a URL like: `https://overland-planner-xxxx.onrender.com`
Your app is live. Share it with anyone.

---

## Notes

- **Free tier cold starts**: Render's free tier spins down after 15 minutes of inactivity.
  First request after idle takes ~30 seconds to wake up. Upgrade to Starter ($7/mo) to avoid this.

- **API costs**: Each generation call uses ~2,000–4,000 tokens. At Claude Sonnet pricing,
  this is roughly $0.003–$0.012 per generation. Very cheap for personal use.

- **File uploads**: The app accepts `.txt` and `.md` files. If your reference doc is a `.docx`,
  open it, select all, paste into a text editor, and save as `.txt` before uploading.

- **API key security**: Your key never touches the browser — all Anthropic calls go through
  the `/api/plan` server endpoint. Safe to share the app URL publicly.

---

## Upgrading

To update the app after making changes:
```bash
git add .
git commit -m "Update"
git push
```
Render auto-deploys on every push to `main`.
# overland-planner
