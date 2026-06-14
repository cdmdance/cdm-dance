"""Simple staff authentication via password + JWT."""
import os
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Header, HTTPException

STAFF_PASSWORD = os.environ.get('STAFF_PASSWORD', 'cdm2025')
JWT_SECRET = os.environ.get('JWT_SECRET', 'cdm-dance-crm-secret-change-me')
JWT_ALGO = 'HS256'
JWT_TTL_DAYS = 14


def verify_password(password: str) -> bool:
    return password == STAFF_PASSWORD


def create_token() -> dict:
    exp = datetime.now(timezone.utc) + timedelta(days=JWT_TTL_DAYS)
    payload = {'role': 'staff', 'exp': int(exp.timestamp())}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    return {'token': token, 'expires_at': exp.isoformat()}


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')


async def require_staff(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Missing token')
    token = authorization.split(' ', 1)[1]
    return decode_token(token)
