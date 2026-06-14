"""Google OAuth flow for Sheets + Calendar access.

OAuth tokens are stored in MongoDB under collection 'google_tokens'.
We use a single key 'primary' since this is a single-tenant CRM.
"""
import os
import logging
from datetime import datetime, timezone
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
import warnings

logger = logging.getLogger(__name__)

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
]
REQUIRED_SCOPES = {
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
}
TOKEN_KEY = 'primary'


def _client_config():
    cid = os.environ.get('GOOGLE_CLIENT_ID')
    csec = os.environ.get('GOOGLE_CLIENT_SECRET')
    if not cid or not csec:
        return None
    return {
        'web': {
            'client_id': cid,
            'client_secret': csec,
            'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
            'token_uri': 'https://oauth2.googleapis.com/token',
        }
    }


def _redirect_uri():
    base = os.environ.get('PUBLIC_BACKEND_URL', '').rstrip('/')
    return f"{base}/api/oauth/google/callback"


def is_configured() -> bool:
    return _client_config() is not None and bool(os.environ.get('PUBLIC_BACKEND_URL'))


def build_auth_url() -> tuple[str, str, str]:
    cfg = _client_config()
    if not cfg:
        raise RuntimeError('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured')
    flow = Flow.from_client_config(cfg, scopes=SCOPES, redirect_uri=_redirect_uri())
    url, state = flow.authorization_url(access_type='offline', prompt='consent', include_granted_scopes='true')
    code_verifier = getattr(flow, 'code_verifier', None) or ''
    return url, state, code_verifier


async def handle_callback(db, code: str, state: str | None) -> dict:
    cfg = _client_config()
    if not cfg:
        raise RuntimeError('OAuth not configured')
    flow = Flow.from_client_config(cfg, scopes=SCOPES, redirect_uri=_redirect_uri())
    # Restore code_verifier saved during auth start (required for PKCE)
    if state:
        rec = await db.oauth_states.find_one({'state': state})
        if rec and rec.get('code_verifier'):
            flow.code_verifier = rec['code_verifier']
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        flow.fetch_token(code=code)
    creds = flow.credentials
    granted = set(creds.scopes or [])
    missing = REQUIRED_SCOPES - granted
    if missing:
        raise RuntimeError(f"Missing required Google scopes: {', '.join(missing)}")

    # Fetch user email
    email = None
    try:
        from googleapiclient.discovery import build
        oauth_svc = build('oauth2', 'v2', credentials=creds, cache_discovery=False)
        info = oauth_svc.userinfo().get().execute()
        email = info.get('email')
    except Exception as e:
        logger.warning(f'Could not fetch user email: {e}')

    expires = creds.expiry
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    doc = {
        '_id': TOKEN_KEY,
        'access_token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': list(creds.scopes or []),
        'expires_at': expires,
        'email': email,
        'connected_at': datetime.now(timezone.utc),
    }
    await db.google_tokens.replace_one({'_id': TOKEN_KEY}, doc, upsert=True)
    return {'email': email}


async def get_credentials(db) -> Credentials | None:
    token = await db.google_tokens.find_one({'_id': TOKEN_KEY})
    if not token:
        return None
    creds = Credentials(
        token=token['access_token'],
        refresh_token=token.get('refresh_token'),
        token_uri=token['token_uri'],
        client_id=token['client_id'],
        client_secret=token['client_secret'],
        scopes=token.get('scopes'),
    )
    expires = token.get('expires_at')
    if expires and not isinstance(expires, datetime):
        try:
            expires = datetime.fromisoformat(str(expires))
        except Exception:
            expires = None
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    needs_refresh = (not creds.token) or (expires and datetime.now(timezone.utc) >= expires)
    if needs_refresh and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            new_expiry = creds.expiry
            if new_expiry and new_expiry.tzinfo is None:
                new_expiry = new_expiry.replace(tzinfo=timezone.utc)
            await db.google_tokens.update_one(
                {'_id': TOKEN_KEY},
                {'$set': {'access_token': creds.token, 'expires_at': new_expiry}}
            )
        except Exception as e:
            logger.error(f'Token refresh failed: {e}')
            return None
    return creds


async def get_status(db) -> dict:
    token = await db.google_tokens.find_one({'_id': TOKEN_KEY})
    return {
        'configured': is_configured(),
        'connected': bool(token),
        'email': token.get('email') if token else None,
        'connected_at': token['connected_at'].isoformat() if token and token.get('connected_at') else None,
    }


async def disconnect(db) -> None:
    await db.google_tokens.delete_one({'_id': TOKEN_KEY})
