"""Google Sheets read/write wrapper for CDM Dance CRM.

Designed to be schema-flexible: we read the first row as headers and map
to a normalised dictionary. Writes use the same header order.

Expected tabs (created automatically if missing): Students, Lessons, Hostings.
"""
import os
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

SHEET_ID = os.environ.get('GOOGLE_SHEET_ID', '1RDgxYt5NcrqwME5LT9vrBg29pGi3ue4yFNPDXA02u8w')

STUDENT_HEADERS = ['id', 'name', 'relationship', 'lastSeen', 'nextScheduled',
                   'lessons6mo', 'hostings6mo', 'phone', 'email', 'notes']
LESSON_HEADERS = ['id', 'studentId', 'studentName', 'date', 'time', 'style', 'location',
                  'status', 'price', 'notes', 'gcalEventId']
HOSTING_HEADERS = ['id', 'date', 'location', 'names', 'income', 'notes', 'gcalEventId']

TAB_HEADERS = {
    'Students': STUDENT_HEADERS,
    'Lessons': LESSON_HEADERS,
    'Hostings': HOSTING_HEADERS,
}


def _service(creds):
    return build('sheets', 'v4', credentials=creds, cache_discovery=False)


async def _to_thread(fn, *args, **kwargs):
    return await asyncio.to_thread(fn, *args, **kwargs)


async def ensure_tabs(creds) -> None:
    """Create missing tabs and write header rows if absent."""
    svc = _service(creds)
    meta = await _to_thread(lambda: svc.spreadsheets().get(spreadsheetId=SHEET_ID).execute())
    existing = {s['properties']['title'] for s in meta.get('sheets', [])}
    requests = []
    for tab in TAB_HEADERS.keys():
        if tab not in existing:
            requests.append({'addSheet': {'properties': {'title': tab}}})
    if requests:
        await _to_thread(lambda: svc.spreadsheets().batchUpdate(
            spreadsheetId=SHEET_ID, body={'requests': requests}).execute())
    # Ensure headers on row 1
    for tab, headers in TAB_HEADERS.items():
        rng = f"{tab}!A1:{chr(ord('A') + len(headers) - 1)}1"
        res = await _to_thread(lambda r=rng: svc.spreadsheets().values().get(
            spreadsheetId=SHEET_ID, range=r).execute())
        if not res.get('values'):
            await _to_thread(lambda r=rng, h=headers: svc.spreadsheets().values().update(
                spreadsheetId=SHEET_ID, range=r, valueInputOption='RAW',
                body={'values': [h]}).execute())


def _rows_to_dicts(rows: list, default_headers: list) -> list[dict]:
    if not rows:
        return []
    headers = rows[0]
    # Use the actual headers from the sheet; map unknown cells safely
    out = []
    for row in rows[1:]:
        if not row or not any((c or '').strip() for c in row):
            continue
        d = {}
        for i, h in enumerate(headers):
            d[h] = row[i] if i < len(row) else ''
        # Ensure expected keys exist
        for h in default_headers:
            d.setdefault(h, '')
        out.append(d)
    return out


async def read_tab(creds, tab: str) -> list[dict]:
    svc = _service(creds)
    headers = TAB_HEADERS.get(tab, [])
    try:
        res = await _to_thread(lambda: svc.spreadsheets().values().get(
            spreadsheetId=SHEET_ID, range=f"{tab}!A1:ZZ").execute())
        return _rows_to_dicts(res.get('values', []), headers)
    except HttpError as e:
        logger.warning(f'Could not read tab {tab}: {e}')
        return []


async def read_all(creds) -> dict:
    out = {}
    for tab in TAB_HEADERS.keys():
        out[tab.lower()] = await read_tab(creds, tab)
    return out


async def get_headers(creds, tab: str) -> list[str]:
    svc = _service(creds)
    res = await _to_thread(lambda: svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID, range=f"{tab}!1:1").execute())
    rows = res.get('values', [])
    if rows:
        return rows[0]
    return TAB_HEADERS.get(tab, [])


def _record_to_row(record: dict, headers: list[str]) -> list[Any]:
    return [str(record.get(h, '')) if record.get(h) is not None else '' for h in headers]


async def append_row(creds, tab: str, record: dict) -> dict:
    svc = _service(creds)
    headers = await get_headers(creds, tab)
    if 'id' in headers and not record.get('id'):
        record['id'] = str(uuid.uuid4())
    row = _record_to_row(record, headers)
    await _to_thread(lambda: svc.spreadsheets().values().append(
        spreadsheetId=SHEET_ID, range=f"{tab}!A:A",
        valueInputOption='USER_ENTERED', insertDataOption='INSERT_ROWS',
        body={'values': [row]}).execute())
    return record


async def update_row_by_id(creds, tab: str, record_id: str, patch: dict) -> dict | None:
    svc = _service(creds)
    headers = await get_headers(creds, tab)
    if 'id' not in headers:
        return None
    res = await _to_thread(lambda: svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID, range=f"{tab}!A1:ZZ").execute())
    rows = res.get('values', [])
    if not rows:
        return None
    id_col = headers.index('id')
    for i, row in enumerate(rows[1:], start=2):
        if id_col < len(row) and row[id_col] == record_id:
            current = {h: (row[j] if j < len(row) else '') for j, h in enumerate(headers)}
            current.update(patch)
            new_row = _record_to_row(current, headers)
            await _to_thread(lambda r=i: svc.spreadsheets().values().update(
                spreadsheetId=SHEET_ID,
                range=f"{tab}!A{r}:{chr(ord('A') + len(headers) - 1)}{r}",
                valueInputOption='USER_ENTERED', body={'values': [new_row]}).execute())
            return current
    return None


async def delete_row_by_id(creds, tab: str, record_id: str) -> bool:
    svc = _service(creds)
    meta = await _to_thread(lambda: svc.spreadsheets().get(spreadsheetId=SHEET_ID).execute())
    sheet_id = None
    for s in meta.get('sheets', []):
        if s['properties']['title'] == tab:
            sheet_id = s['properties']['sheetId']
            break
    if sheet_id is None:
        return False
    headers = await get_headers(creds, tab)
    if 'id' not in headers:
        return False
    res = await _to_thread(lambda: svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID, range=f"{tab}!A1:ZZ").execute())
    rows = res.get('values', [])
    id_col = headers.index('id')
    for i, row in enumerate(rows[1:], start=1):
        if id_col < len(row) and row[id_col] == record_id:
            requests = [{'deleteDimension': {'range': {
                'sheetId': sheet_id, 'dimension': 'ROWS',
                'startIndex': i, 'endIndex': i + 1}}}]
            await _to_thread(lambda: svc.spreadsheets().batchUpdate(
                spreadsheetId=SHEET_ID, body={'requests': requests}).execute())
            return True
    return False


async def clear_tab_keep_header(creds, tab: str) -> None:
    """Wipe all data rows from tab but keep header row 1."""
    svc = _service(creds)
    headers = await get_headers(creds, tab)
    if not headers:
        return
    last_col = chr(ord('A') + len(headers) - 1)
    await _to_thread(lambda: svc.spreadsheets().values().clear(
        spreadsheetId=SHEET_ID, range=f"{tab}!A2:{last_col}").execute())


async def bulk_append(creds, tab: str, records: list[dict]) -> int:
    """Append multiple records at once, assigning IDs."""
    if not records:
        return 0
    svc = _service(creds)
    headers = await get_headers(creds, tab)
    rows = []
    for rec in records:
        if 'id' in headers and not rec.get('id'):
            rec['id'] = str(uuid.uuid4())
        rows.append(_record_to_row(rec, headers))
    await _to_thread(lambda: svc.spreadsheets().values().append(
        spreadsheetId=SHEET_ID, range=f"{tab}!A:A",
        valueInputOption='USER_ENTERED', insertDataOption='INSERT_ROWS',
        body={'values': rows}).execute())
    return len(rows)

