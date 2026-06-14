# CDM Dance CRM

A modern, dark + gold themed CRM for managing dance students, hostings, lessons, and projected income for [CDM Dance](https://cdm.dance).

## Features

- **Staff password login** (JWT-based session)
- **Google Sheets sync** - real students/lessons/hostings stored in your sheet
- **Google Calendar two-way sync** - new lessons & hostings auto-create events on a dedicated calendar (read-only on your primary calendar so work events are never touched)
- **Income analysis** - parses calendar events to compute past 6-month earnings + next 6-month projections
- **Calendar view** - monthly grid showing lessons, hostings, and other Google Calendar events
- **Configurable per-student / per-host rates** and name aliases for merging duplicates

## Tech stack

- **Frontend**: React + Tailwind + shadcn/ui + Recharts
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (only stores OAuth tokens - your CRM data lives in Google Sheets)
- **Auth**: Password + JWT; Google OAuth 2.0 for Sheets/Calendar access

## Local development

### Prerequisites
- Node.js 18+, Yarn, Python 3.11+, MongoDB
- A Google Cloud project with Sheets API + Calendar API enabled
- An OAuth 2.0 Web Application client (Client ID + Secret)

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your real values
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
cp .env.example .env
# Edit .env: REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

## Google Cloud setup (one-time)

1. Go to https://console.cloud.google.com - create a project
2. **APIs & Services - Library**: enable **Google Sheets API** and **Google Calendar API**
3. **APIs & Services - OAuth consent screen**: External, app name, support email, scopes for `spreadsheets`, `calendar`, `userinfo.email`, `userinfo.profile`, `openid`. Add yourself as a Test user.
4. **APIs & Services - Credentials**: Create OAuth client ID -> Web application
   - **Authorized JavaScript origins**: `https://your-frontend-domain.com`
   - **Authorized redirect URIs**: `https://your-backend-domain.com/api/oauth/google/callback`
5. Copy the Client ID + Secret into `backend/.env`

## Dedicated Calendar (recommended)

In Google Calendar, create a new calendar (e.g. "CDM Lessons") so the app only writes there and never touches your primary calendar. Open the calendar's Settings -> Integrate calendar, copy the **Calendar ID** (ends in `@group.calendar.google.com`), paste it into `GOOGLE_CALENDAR_ID` in `backend/.env`.

The app still READS your primary calendar (for income analysis from existing bookings) but never writes to it.

## Default staff password

After first deploy, log in with the password from `STAFF_PASSWORD` env var (default: `cdm2025`). **Change this** to something secure in production.

## Deployment

See `DEPLOYMENT.md` for step-by-step deployment instructions to Vercel + Render, Railway, or any other platform.

## License

Private / proprietary.
