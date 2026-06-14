"""Google Calendar two-way sync for CDM Dance CRM."""
import os
import asyncio
import logging
from datetime import datetime, timedelta
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)
CALENDAR_ID = os.environ.get('GOOGLE_CALENDAR_ID', 'primary')


def _service(creds):
    return build('calendar', 'v3', credentials=creds, cache_discovery=False)


async def _to_thread(fn):
    return await asyncio.to_thread(fn)


def _make_event_body(title: str, date: str, time: str | None, duration_minutes: int = 60,
                     location: str = '', description: str = '') -> dict:
    # Local time interpretation - we assume America/New_York (Florida)
    tz = 'America/New_York'
    if time:
        start_dt = f"{date}T{time}:00"
        try:
            t = datetime.fromisoformat(start_dt)
            end_dt = (t + timedelta(minutes=duration_minutes)).isoformat()
        except Exception:
            end_dt = f"{date}T{time}:00"
        return {
            'summary': title,
            'location': location,
            'description': description,
            'start': {'dateTime': start_dt, 'timeZone': tz},
            'end': {'dateTime': end_dt, 'timeZone': tz},
        }
    else:
        # All-day event
        return {
            'summary': title,
            'location': location,
            'description': description,
            'start': {'date': date},
            'end': {'date': date},
        }


async def create_event(creds, title: str, date: str, time: str | None,
                       location: str = '', description: str = '',
                       duration_minutes: int = 60) -> str | None:
    svc = _service(creds)
    body = _make_event_body(title, date, time, duration_minutes, location, description)
    try:
        res = await _to_thread(lambda: svc.events().insert(
            calendarId=CALENDAR_ID, body=body).execute())
        return res.get('id')
    except HttpError as e:
        logger.error(f'create_event failed: {e}')
        return None


async def update_event(creds, event_id: str, title: str, date: str, time: str | None,
                       location: str = '', description: str = '',
                       duration_minutes: int = 60) -> bool:
    svc = _service(creds)
    body = _make_event_body(title, date, time, duration_minutes, location, description)
    try:
        await _to_thread(lambda: svc.events().update(
            calendarId=CALENDAR_ID, eventId=event_id, body=body).execute())
        return True
    except HttpError as e:
        logger.error(f'update_event failed: {e}')
        return False


async def delete_event(creds, event_id: str) -> bool:
    svc = _service(creds)
    try:
        await _to_thread(lambda: svc.events().delete(
            calendarId=CALENDAR_ID, eventId=event_id).execute())
        return True
    except HttpError as e:
        logger.warning(f'delete_event failed: {e}')
        return False


async def list_events(creds, days_back: int = 30, days_forward: int = 90,
                      calendar_id: str | None = None) -> list[dict]:
    svc = _service(creds)
    cal_id = calendar_id or CALENDAR_ID
    now = datetime.utcnow()
    time_min = (now - timedelta(days=days_back)).isoformat() + 'Z'
    time_max = (now + timedelta(days=days_forward)).isoformat() + 'Z'
    try:
        res = await _to_thread(lambda: svc.events().list(
            calendarId=cal_id, timeMin=time_min, timeMax=time_max,
            singleEvents=True, orderBy='startTime', maxResults=2500).execute())
        events = []
        for e in res.get('items', []):
            start = e.get('start', {})
            date_val = start.get('date') or (start.get('dateTime', '')[:10] if start.get('dateTime') else '')
            time_val = ''
            if start.get('dateTime'):
                # Extract HH:MM from dateTime
                try:
                    time_val = start['dateTime'][11:16]
                except Exception:
                    pass
            events.append({
                'id': e.get('id'),
                'summary': e.get('summary', '(no title)'),
                'date': date_val,
                'time': time_val,
                'location': e.get('location', ''),
                'description': e.get('description', ''),
            })
        return events
    except HttpError as ex:
        logger.error(f'list_events failed: {ex}')
        return []
