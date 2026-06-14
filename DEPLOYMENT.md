# Deployment Guide

This app has two services that need to be deployed:
- **Backend** (FastAPI + MongoDB) - serves the `/api/*` endpoints
- **Frontend** (React) - the user interface

## Option 1: Deploy via Emergent (Simplest)

Click **Deploy** in the Emergent UI. Emergent will give you a public URL automatically. After deploy:

1. Update `PUBLIC_BACKEND_URL` in backend `.env` to the new URL
2. Update **Authorized redirect URI** in Google Cloud OAuth credentials to:
   `https://<your-emergent-url>/api/oauth/google/callback`
3. Update **Authorized JavaScript origins** to: `https://<your-emergent-url>`
4. Re-connect Google in the app (one-time)

## Option 2: Deploy from GitHub

### A. Push code to GitHub

```bash
cd /app
git init
git add .
git commit -m "Initial CDM Dance CRM"
git branch -M main
git remote add origin https://github.com/<your-username>/cdm-dance-crm.git
git push -u origin main
```

### B. Deploy backend (Render / Railway / Fly.io)

**Render (recommended)**:
1. Sign up at https://render.com
2. **New Web Service** -> connect your GitHub repo
3. Configuration:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Add a **MongoDB** database (or use MongoDB Atlas free tier)
5. Add environment variables (all from `backend/.env.example`):
   - `MONGO_URL`, `DB_NAME`, `STAFF_PASSWORD`, `JWT_SECRET`
   - `GOOGLE_SHEET_ID`, `GOOGLE_CALENDAR_ID`
   - `PUBLIC_BACKEND_URL` -> Render auto-assigns; set to your Render URL
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `HOSTING_RATE_PER_PERSON`, `LESSON_RATE_DEFAULT`
   - `STUDENT_RATES`, `HOST_RATES`, `NAME_ALIASES`
6. Click **Deploy**

### C. Deploy frontend (Vercel - recommended)

1. Sign up at https://vercel.com
2. **Import Project** -> select your GitHub repo
3. Configuration:
   - Root Directory: `frontend`
   - Build Command: `yarn build`
   - Output Directory: `build`
4. Environment variables:
   - `REACT_APP_BACKEND_URL` = your Render backend URL
5. Click **Deploy**

### D. Wire up Google OAuth

Go back to Google Cloud Console -> Credentials -> your OAuth client:

**Authorized JavaScript origins** (add both):
- `https://your-frontend.vercel.app`
- `https://your-backend.onrender.com`

**Authorized redirect URIs** (add):
- `https://your-backend.onrender.com/api/oauth/google/callback`

Click **Save**. Then visit your frontend, log in, click "Sign in with Google".

## Custom domain (optional)

Both Vercel and Render support custom domains. After pointing your DNS:
- Add the custom domain in each platform's settings
- Re-update the OAuth authorized origins/redirect URIs in Google Cloud
- Re-update `PUBLIC_BACKEND_URL` env var if backend domain changes

## Security checklist

- [ ] Change `STAFF_PASSWORD` from the default `cdm2025`
- [ ] Generate a strong `JWT_SECRET` (at least 32 random chars)
- [ ] Never commit `.env` files
- [ ] Keep `GOOGLE_CLIENT_SECRET` private
- [ ] In Google Cloud OAuth consent screen, you can stay in Testing mode (limits to test users) - or submit for verification if you want unrestricted access
