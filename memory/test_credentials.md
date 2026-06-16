# Test Credentials

## Staff Login (CRM)
- **Staff Password**: `cdm2025` (from backend/.env `STAFF_PASSWORD`)

## Google OAuth
- Required for Sheets/Calendar data access
- User must click "Sign in with Google" button to authenticate with their Google account
- Configured via `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend/.env

## Notes
- The CRM uses Google Sheets as the primary database (not MongoDB)
- After deployment, OAuth Redirect URI in Google Cloud Console must be updated to match the new production URL: `<PROD_URL>/api/oauth/google/callback`
