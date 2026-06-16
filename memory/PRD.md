# CDM Dance CRM — Product Requirements Document

## Original Problem Statement
Clone the existing CRM at cdm.dance/crm.html maintaining its dark+gold aesthetic, while adding:
- Calendar view
- Google Calendar integration (sync + income projection)
- POS system (package sales + receipts)
- Enrollments feature (programs/events with liability release, refund policy, digital signature, PDF generation)
- Google Sheets as the primary database

## Tech Stack
- **Frontend**: React 19 (CRA + craco), Tailwind CSS, shadcn/ui, lucide-react
- **Backend**: FastAPI (Python), reportlab (PDF), Google API client
- **Database**: Google Sheets (primary) + MongoDB (minimal/status_checks)
- **Integrations**: Google OAuth 2.0, Google Sheets API, Google Calendar API

## Architecture
```
/app/frontend/src/
  views/ — Dashboard, Students, Lessons, Hostings, POS, CalendarView, Projections, Enrollments
  components/ — ConnectGoogle, Layout, ui/*
  context/ — AuthContext, DataContext

/app/backend/
  server.py — FastAPI main
  sheets_client.py — Google Sheets connector
  calendar_client.py / calendar_income.py — Google Calendar connectors
  pdf_generator.py / email_sender.py — Enrollment utilities
  auth.py / google_oauth.py — OAuth + JWT
```

## Data Model (Google Sheets tabs)
- Students, Lessons, Hostings, Packages, Payments, Enrollments

## Key API Endpoints
- `GET /api/oauth/google/login` & `GET /api/oauth/google/callback`
- `POST /api/setup/import-students`
- `GET /api/income/analyze`
- `POST /api/payments`
- `POST /api/enrollments` & `GET /api/enrollments/{id}/pdf`

## Business Rules (DO NOT OVERWRITE)
- Income analyzer reads from **primary Google Calendar**; writes go to `GOOGLE_CALENDAR_ID` (Test CRM)
- Hardcoded aliases & rates in `calendar_income.py` (e.g., Alina aliases merged, Arleen rate=$0)

## Changelog

### 2026-02 — MVP Complete + Deployment Ready
- Dark/gold UI clone of cdm.dance/crm.html
- Google OAuth (PKCE) + Sheets/Calendar CRUD
- POS, Calendar view, Income Projections analyzer
- Enrollments feature with reportlab PDF (liability release + refund policy + signature)
- SMTP stub in place (download-only mode by user choice)
- Deployment readiness check: PASSED

## Roadmap
### P0 (current)
- [x] Verify deployment readiness
- [ ] User triggers Emergent one-click deploy
- [ ] User updates Google Cloud OAuth Redirect URI to production URL

### P1 (next)
- [ ] SMTP integration for auto-emailing signed PDFs (Gmail App Password or Resend)
- [ ] End-to-end testing of Enrollments (form → Sheet → PDF download)

### P2 (backlog)
- [ ] Enrollment history view per student
- [ ] Bulk import students from CSV
- [ ] Additional program tiers / event templates

## Known Mocks / Stubs
- **SMTP email sending** in `email_sender.py` — stubbed, PDFs are download-only (user preference)
