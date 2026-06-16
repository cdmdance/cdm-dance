"""CDM Dance CRM - FastAPI Backend.

Stack:
- Staff auth via password + JWT
- Google OAuth (Sheets + Calendar) for cdmdanceservices@gmail.com
- Sheets are source of truth; Calendar mirrors Lessons & Hostings
"""
import os
import logging
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

# Load .env BEFORE importing local modules so they can read env at module level
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse, HTMLResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

import auth as auth_mod
import google_oauth
import sheets_client
import calendar_client
import calendar_income
import pdf_generator
import email_sender


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Mongo
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'cdm_crm')]

app = FastAPI(title='CDM Dance CRM')
api = APIRouter(prefix='/api')


# --------- Models ---------
class LoginIn(BaseModel):
    password: str


class StudentIn(BaseModel):
    id: str | None = None
    name: str
    relationship: str | None = ''  # Both | Teach | Host
    lastSeen: str | None = ''
    nextScheduled: str | None = ''
    lessons6mo: int | float | None = 0
    hostings6mo: int | float | None = 0
    phone: str | None = ''
    email: str | None = ''
    notes: str | None = ''


class LessonIn(BaseModel):
    id: str | None = None
    studentId: str | None = ''
    studentName: str | None = ''
    date: str
    time: str | None = ''
    style: str | None = ''
    location: str | None = ''
    status: str | None = 'Scheduled'
    price: int | float | None = 0
    notes: str | None = ''
    gcalEventId: str | None = ''


class HostingIn(BaseModel):
    id: str | None = None
    date: str
    location: str | None = ''
    names: str | None = ''
    income: int | float | None = 0
    notes: str | None = ''
    gcalEventId: str | None = ''


class PackageIn(BaseModel):
    id: str | None = None
    name: str
    lessons: int | float
    price: int | float
    description: str | None = ''
    active: bool | str | None = True


class PaymentIn(BaseModel):
    id: str | None = None
    date: str | None = None
    studentId: str
    studentName: str | None = ''
    packageId: str | None = ''
    packageName: str | None = ''
    lessons: int | float | None = 0
    amount: int | float
    method: str | None = 'Cash'
    notes: str | None = ''


class EnrollmentIn(BaseModel):
    id: str | None = None
    type: str  # 'Program' or 'Event'
    date: str | None = None
    studentId: str
    studentName: str | None = ''
    status: str | None = 'Pending'
    # Program-specific
    programTier: str | None = ''  # Bronze | Silver | Gold | Open
    lessonsCount: int | float | None = 0
    pricePerLesson: int | float | None = 0
    totalValue: int | float | None = 0
    expirationDate: str | None = ''
    # Event-specific
    eventName: str | None = ''
    eventType: str | None = ''  # Showcase | Competition | Mini Match | Social | Other
    eventLocation: str | None = ''
    eventDate: str | None = ''
    totalCost: int | float | None = 0
    # Shared
    paymentMethod: str | None = 'Cash'
    amountPaid: int | float | None = 0
    notes: str | None = ''
    signedBy: str | None = ''
    signedAt: str | None = ''


class EnrollmentSignIn(BaseModel):
    signedBy: str
    sendEmail: bool = True


# --------- Auth routes ---------
@api.post('/auth/login')
async def login(body: LoginIn):
    if not auth_mod.verify_password(body.password):
        raise HTTPException(status_code=401, detail='Incorrect password')
    return auth_mod.create_token()


@api.get('/auth/me')
async def me(user=Depends(auth_mod.require_staff)):
    return {'role': user.get('role'), 'authed': True}


# --------- Google OAuth routes ---------
@api.get('/oauth/google/status')
async def oauth_status(user=Depends(auth_mod.require_staff)):
    return await google_oauth.get_status(db)


@api.get('/oauth/google/login')
async def oauth_login():
    """Browser-initiated OAuth start. Returns a 302 redirect to Google."""
    if not google_oauth.is_configured():
        return HTMLResponse(
            "<h2>Google OAuth not configured</h2><p>GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and PUBLIC_BACKEND_URL must be set.</p>",
            status_code=500,
        )
    url, state, code_verifier = google_oauth.build_auth_url()
    await db.oauth_states.insert_one({
        'state': state,
        'code_verifier': code_verifier,
        'created_at': datetime.utcnow(),
    })
    return RedirectResponse(url)


@api.get('/oauth/google/callback')
async def oauth_callback(code: str = Query(...), state: str | None = Query(None), error: str | None = Query(None)):
    if error:
        return HTMLResponse(f"<h2>Google sign-in cancelled</h2><p>{error}</p>")
    info = {}
    try:
        info = await google_oauth.handle_callback(db, code, state) or {}
    except Exception as e:
        logger.exception('OAuth callback failed')
        return HTMLResponse(f"<h2>Connection failed</h2><pre>{e}</pre>")
    try:
        creds = await google_oauth.get_credentials(db)
        if creds:
            await sheets_client.ensure_tabs(creds)
    except Exception as e:
        logger.warning(f'Could not ensure tabs after connect: {e}')
    return HTMLResponse(f"""
        <html><body style='font-family: -apple-system, sans-serif; background:#0a0a0c; color:#ece6d5; padding:40px; text-align:center;'>
        <h1 style='color:#c8a55b; font-family: Georgia, serif;'>Connected</h1>
        <p>Signed in as <b>{info.get('email', 'your Google account')}</b></p>
        <p style='color:#a59f8e; font-size:13px;'>You can close this window. The CRM is now connected to Google Sheets &amp; Calendar.</p>
        <script>setTimeout(()=>{{ if(window.opener){{ window.opener.postMessage('gcal-connected','*'); window.close(); }} else {{ window.location.href = '/'; }} }}, 1500);</script>
        </body></html>
    """)


@api.post('/oauth/google/disconnect')
async def oauth_disconnect(user=Depends(auth_mod.require_staff)):
    await google_oauth.disconnect(db)
    return {'ok': True}


# --------- Data routes ---------
async def _require_creds():
    creds = await google_oauth.get_credentials(db)
    if not creds:
        raise HTTPException(status_code=409, detail='Google not connected. Connect via /api/oauth/google/login')
    return creds


@api.get('/data/all')
async def get_all_data(user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    return await sheets_client.read_all(creds)


@api.post('/students')
async def add_student(body: StudentIn, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    rec = body.model_dump()
    return await sheets_client.append_row(creds, 'Students', rec)


@api.put('/students/{student_id}')
async def update_student(student_id: str, body: StudentIn, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    res = await sheets_client.update_row_by_id(creds, 'Students', student_id, patch)
    if not res:
        raise HTTPException(status_code=404, detail='Student not found')
    return res


@api.delete('/students/{student_id}')
async def delete_student(student_id: str, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    ok = await sheets_client.delete_row_by_id(creds, 'Students', student_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Student not found')
    return {'ok': True}


class BonusLessonsIn(BaseModel):
    lessons: int | float
    note: str | None = ''


@api.post('/students/{student_id}/bonus-lessons')
async def add_bonus_lessons(student_id: str, body: BonusLessonsIn, user=Depends(auth_mod.require_staff)):
    """Add bonus (free) lessons to a student. Adds to lessonsTotal but does not affect totalPaid.
    Logs the bonus as a Payment row with amount=0 for audit trail."""
    creds = await _require_creds()
    if not body.lessons or float(body.lessons) <= 0:
        raise HTTPException(status_code=400, detail='Lessons must be a positive number')
    students = await sheets_client.read_tab(creds, 'Students')
    student = next((s for s in students if s.get('id') == student_id), None)
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    try:
        cur_lessons_total = float(student.get('lessonsTotal') or 0)
    except Exception:
        cur_lessons_total = 0
    new_lessons_total = cur_lessons_total + float(body.lessons)
    updated = await sheets_client.update_row_by_id(creds, 'Students', student_id, {
        'lessonsTotal': new_lessons_total,
    })
    # Log as zero-amount payment for audit
    note = body.note.strip() if body.note else 'Bonus lessons added by staff'
    await sheets_client.append_row(creds, 'Payments', {
        'date': datetime.utcnow().date().isoformat(),
        'studentId': student_id,
        'studentName': student.get('name', ''),
        'packageId': '',
        'packageName': 'Bonus',
        'lessons': float(body.lessons),
        'amount': 0,
        'method': 'Bonus',
        'notes': note,
    })
    return {'student_updated': updated, 'added_lessons': float(body.lessons)}


@api.post('/lessons')
async def add_lesson(body: LessonIn, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    rec = body.model_dump()
    title = f"Lesson: {rec.get('studentName') or rec.get('studentId')} - {rec.get('style', '')}"
    gcal_id = await calendar_client.create_event(
        creds, title=title, date=rec['date'], time=rec.get('time') or None,
        location=rec.get('location', ''), description=rec.get('notes', ''),
        duration_minutes=60,
    )
    rec['gcalEventId'] = gcal_id or ''
    return await sheets_client.append_row(creds, 'Lessons', rec)


@api.put('/lessons/{lesson_id}')
async def update_lesson(lesson_id: str, body: LessonIn, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    all_lessons = await sheets_client.read_tab(creds, 'Lessons')
    existing = next((lsn for lsn in all_lessons if lsn.get('id') == lesson_id), None)
    if existing and existing.get('gcalEventId'):
        title = f"Lesson: {patch.get('studentName', existing.get('studentName'))} - {patch.get('style', existing.get('style', ''))}"
        await calendar_client.update_event(
            creds, existing['gcalEventId'], title=title,
            date=patch.get('date', existing['date']),
            time=patch.get('time', existing.get('time')) or None,
            location=patch.get('location', existing.get('location', '')),
            description=patch.get('notes', existing.get('notes', '')),
        )
    res = await sheets_client.update_row_by_id(creds, 'Lessons', lesson_id, patch)
    if not res:
        raise HTTPException(status_code=404, detail='Lesson not found')
    return res


@api.delete('/lessons/{lesson_id}')
async def delete_lesson(lesson_id: str, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    all_lessons = await sheets_client.read_tab(creds, 'Lessons')
    for lsn in all_lessons:
        if lsn.get('id') == lesson_id and lsn.get('gcalEventId'):
            await calendar_client.delete_event(creds, lsn['gcalEventId'])
            break
    ok = await sheets_client.delete_row_by_id(creds, 'Lessons', lesson_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Lesson not found')
    return {'ok': True}


@api.post('/hostings')
async def add_hosting(body: HostingIn, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    rec = body.model_dump()
    title = f"Hosting: {rec.get('location', '')}"
    desc = f"Names: {rec.get('names', '')}\nIncome: ${rec.get('income', 0)}\n{rec.get('notes', '')}"
    gcal_id = await calendar_client.create_event(
        creds, title=title, date=rec['date'], time='20:00',
        location=rec.get('location', ''), description=desc,
        duration_minutes=180,
    )
    rec['gcalEventId'] = gcal_id or ''
    return await sheets_client.append_row(creds, 'Hostings', rec)


@api.put('/hostings/{hosting_id}')
async def update_hosting(hosting_id: str, body: HostingIn, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    res = await sheets_client.update_row_by_id(creds, 'Hostings', hosting_id, patch)
    if not res:
        raise HTTPException(status_code=404, detail='Hosting not found')
    return res


@api.delete('/hostings/{hosting_id}')
async def delete_hosting(hosting_id: str, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    all_h = await sheets_client.read_tab(creds, 'Hostings')
    for h in all_h:
        if h.get('id') == hosting_id and h.get('gcalEventId'):
            await calendar_client.delete_event(creds, h['gcalEventId'])
            break
    ok = await sheets_client.delete_row_by_id(creds, 'Hostings', hosting_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Hosting not found')
    return {'ok': True}


# --------- Calendar routes ---------
@api.get('/calendar/events')
async def get_calendar_events(
    calendar: str = Query('all', description="'all' (primary + app), 'primary', or 'app'"),
    days_back: int = Query(45, ge=1, le=730),
    days_forward: int = Query(180, ge=1, le=730),
    user=Depends(auth_mod.require_staff),
):
    creds = await _require_creds()
    app_cal = os.environ.get('GOOGLE_CALENDAR_ID', 'primary')
    cals_to_read = []
    if calendar == 'primary':
        cals_to_read = ['primary']
    elif calendar == 'app':
        cals_to_read = [app_cal]
    else:  # all
        cals_to_read = ['primary'] if app_cal == 'primary' else ['primary', app_cal]
    all_events = []
    seen_ids = set()
    for cal_id in cals_to_read:
        evs = await calendar_client.list_events(creds, days_back=days_back,
                                                days_forward=days_forward,
                                                calendar_id=cal_id)
        for e in evs:
            if e.get('id') in seen_ids:
                continue
            seen_ids.add(e.get('id'))
            e['calendar'] = cal_id
            all_events.append(e)
    return all_events


@api.post('/calendar/sync')
async def calendar_sync(user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    events = await calendar_client.list_events(creds)
    return {'synced_at': datetime.utcnow().isoformat(), 'count': len(events), 'events': events}


@api.post('/setup/ensure-tabs')
async def setup_ensure_tabs(user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    await sheets_client.ensure_tabs(creds)
    return {'ok': True}


# --------- Packages CRUD ---------
@api.get('/packages')
async def list_packages(user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    pkgs = await sheets_client.read_tab(creds, 'Packages')
    return pkgs


@api.post('/packages')
async def create_package(body: PackageIn, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    rec = body.model_dump()
    rec['active'] = 'TRUE' if (rec.get('active') is True or str(rec.get('active', '')).lower() in ('true', 'yes', '1')) else 'FALSE'
    return await sheets_client.append_row(creds, 'Packages', rec)


@api.put('/packages/{pkg_id}')
async def update_package(pkg_id: str, body: PackageIn, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if 'active' in patch:
        patch['active'] = 'TRUE' if (patch['active'] is True or str(patch['active']).lower() in ('true', 'yes', '1')) else 'FALSE'
    res = await sheets_client.update_row_by_id(creds, 'Packages', pkg_id, patch)
    if not res:
        raise HTTPException(status_code=404, detail='Package not found')
    return res


@api.delete('/packages/{pkg_id}')
async def delete_package(pkg_id: str, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    ok = await sheets_client.delete_row_by_id(creds, 'Packages', pkg_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Package not found')
    return {'ok': True}


# --------- Payments (POS sales) ---------
@api.get('/payments')
async def list_payments(user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    return await sheets_client.read_tab(creds, 'Payments')


@api.post('/payments')
async def record_payment(body: PaymentIn, user=Depends(auth_mod.require_staff)):
    """Record a package sale: writes a Payments row AND updates the student's
    lessonsTotal + totalPaid in the Students tab."""
    creds = await _require_creds()
    rec = body.model_dump()
    if not rec.get('date'):
        rec['date'] = datetime.utcnow().date().isoformat()

    # Fetch student for name + current totals
    students = await sheets_client.read_tab(creds, 'Students')
    student = next((s for s in students if s.get('id') == rec['studentId']), None)
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    if not rec.get('studentName'):
        rec['studentName'] = student.get('name', '')

    # If packageId provided, enrich with package data
    if rec.get('packageId'):
        pkgs = await sheets_client.read_tab(creds, 'Packages')
        pkg = next((p for p in pkgs if p.get('id') == rec['packageId']), None)
        if pkg:
            rec['packageName'] = rec.get('packageName') or pkg.get('name', '')
            if not rec.get('lessons'):
                try:
                    rec['lessons'] = int(float(pkg.get('lessons') or 0))
                except Exception:
                    rec['lessons'] = 0

    # Save payment row
    payment = await sheets_client.append_row(creds, 'Payments', rec)

    # Update student totals
    try:
        cur_total_paid = float(student.get('totalPaid') or 0)
    except Exception:
        cur_total_paid = 0
    try:
        cur_lessons_total = float(student.get('lessonsTotal') or 0)
    except Exception:
        cur_lessons_total = 0
    new_total_paid = cur_total_paid + float(rec.get('amount') or 0)
    new_lessons_total = cur_lessons_total + float(rec.get('lessons') or 0)
    await sheets_client.update_row_by_id(creds, 'Students', rec['studentId'], {
        'totalPaid': new_total_paid,
        'lessonsTotal': new_lessons_total,
    })
    return {'payment': payment, 'student_updated': {
        'totalPaid': new_total_paid, 'lessonsTotal': new_lessons_total,
    }}


@api.delete('/payments/{pay_id}')
async def delete_payment(pay_id: str, user=Depends(auth_mod.require_staff)):
    """Delete a payment AND reverse its impact on the student totals."""
    creds = await _require_creds()
    payments = await sheets_client.read_tab(creds, 'Payments')
    pay = next((p for p in payments if p.get('id') == pay_id), None)
    if not pay:
        raise HTTPException(status_code=404, detail='Payment not found')
    # Reverse student totals
    students = await sheets_client.read_tab(creds, 'Students')
    student = next((s for s in students if s.get('id') == pay.get('studentId')), None)
    if student:
        try:
            cur_paid = float(student.get('totalPaid') or 0)
            cur_lessons = float(student.get('lessonsTotal') or 0)
        except Exception:
            cur_paid = 0
            cur_lessons = 0
        await sheets_client.update_row_by_id(creds, 'Students', student['id'], {
            'totalPaid': max(0, cur_paid - float(pay.get('amount') or 0)),
            'lessonsTotal': max(0, cur_lessons - float(pay.get('lessons') or 0)),
        })
    await sheets_client.delete_row_by_id(creds, 'Payments', pay_id)
    return {'ok': True}


# --------- Student lesson balance (combines purchases with calendar usage) ---------
@api.get('/students/{student_id}/balance')
async def student_balance(student_id: str, user=Depends(auth_mod.require_staff)):
    """Compute lessons used (from calendar) and lessons remaining for a student."""
    creds = await _require_creds()
    students = await sheets_client.read_tab(creds, 'Students')
    student = next((s for s in students if s.get('id') == student_id), None)
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    cal_id = 'primary'
    events = await calendar_client.list_events(creds, days_back=730, days_forward=0, calendar_id=cal_id)
    known_names = [s.get('name', '').strip() for s in students if s.get('name')]
    today = datetime.utcnow().date().isoformat()
    lessons_used = 0
    for e in events:
        if e.get('date', '') >= today:
            continue
        info = calendar_income.classify_event(e.get('summary', ''), known_names=known_names)
        if info['type'] == 'lesson':
            if calendar_income.canonical_name(info.get('student', '')).lower() == student.get('name', '').lower():
                if info.get('names'):
                    lessons_used += sum(1 for n in info['names']
                                        if calendar_income.canonical_name(n).lower() == student.get('name', '').lower())
                else:
                    lessons_used += 1
    try:
        lessons_total = float(student.get('lessonsTotal') or 0)
        total_paid = float(student.get('totalPaid') or 0)
    except Exception:
        lessons_total = 0
        total_paid = 0
    return {
        'studentId': student_id,
        'name': student.get('name'),
        'lessonsTotal': lessons_total,
        'lessonsUsed': lessons_used,
        'lessonsRemaining': max(0, lessons_total - lessons_used),
        'totalPaid': total_paid,
    }


# --------- Enrollments ---------
def _enrollment_total(rec: dict) -> float:
    if rec.get('type') == 'Program':
        try:
            return float(rec.get('lessonsCount') or 0) * float(rec.get('pricePerLesson') or 0)
        except Exception:
            return 0
    try:
        return float(rec.get('totalCost') or 0)
    except Exception:
        return 0


@api.get('/enrollments')
async def list_enrollments(user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    return await sheets_client.read_tab(creds, 'Enrollments')


@api.post('/enrollments')
async def create_enrollment(body: EnrollmentIn, user=Depends(auth_mod.require_staff)):
    creds = await _require_creds()
    rec = body.model_dump()
    if not rec.get('date'):
        rec['date'] = datetime.utcnow().date().isoformat()
    if not rec.get('status'):
        rec['status'] = 'Pending'
    # Validate type
    if rec['type'] not in ('Program', 'Event'):
        raise HTTPException(status_code=400, detail='type must be Program or Event')
    # Enrich student name
    students = await sheets_client.read_tab(creds, 'Students')
    student = next((s for s in students if s.get('id') == rec['studentId']), None)
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    rec['studentName'] = rec.get('studentName') or student.get('name', '')
    # Auto-compute totals
    if rec['type'] == 'Program':
        rec['totalValue'] = _enrollment_total(rec)
        # 1-year expiration from date
        try:
            d = datetime.fromisoformat(rec['date'][:10])
            rec['expirationDate'] = d.replace(year=d.year + 1).date().isoformat()
        except Exception:
            pass
    else:
        rec['totalValue'] = 0
    return await sheets_client.append_row(creds, 'Enrollments', rec)


@api.post('/enrollments/{enrollment_id}/sign')
async def sign_enrollment(enrollment_id: str, body: EnrollmentSignIn,
                          user=Depends(auth_mod.require_staff)):
    """Mark enrollment as signed, update student totals (for Programs),
    optionally email the PDF receipt to the student."""
    creds = await _require_creds()
    enrollments = await sheets_client.read_tab(creds, 'Enrollments')
    enrollment = next((e for e in enrollments if e.get('id') == enrollment_id), None)
    if not enrollment:
        raise HTTPException(status_code=404, detail='Enrollment not found')
    if enrollment.get('status') == 'Signed':
        raise HTTPException(status_code=400, detail='Enrollment already signed')
    if not body.signedBy or len(body.signedBy.strip()) < 2:
        raise HTTPException(status_code=400, detail='Typed full name is required to sign')

    now_iso = datetime.utcnow().isoformat()
    patch = {
        'status': 'Signed',
        'signedBy': body.signedBy.strip(),
        'signedAt': now_iso,
    }
    await sheets_client.update_row_by_id(creds, 'Enrollments', enrollment_id, patch)
    enrollment.update(patch)

    # Update student totals
    students = await sheets_client.read_tab(creds, 'Students')
    student = next((s for s in students if s.get('id') == enrollment.get('studentId')), None)
    if student:
        try:
            cur_paid = float(student.get('totalPaid') or 0)
            cur_lessons = float(student.get('lessonsTotal') or 0)
        except Exception:
            cur_paid = 0
            cur_lessons = 0
        amount_paid = float(enrollment.get('amountPaid') or 0)
        add_lessons = float(enrollment.get('lessonsCount') or 0) if enrollment.get('type') == 'Program' else 0
        await sheets_client.update_row_by_id(creds, 'Students', student['id'], {
            'totalPaid': cur_paid + amount_paid,
            'lessonsTotal': cur_lessons + add_lessons,
        })

    # Try to send email if configured and requested
    email_status = 'skipped'
    email_error = None
    if body.sendEmail and student and student.get('email'):
        try:
            pdf_bytes = pdf_generator.generate_enrollment_pdf(enrollment)
            filename = f"CDM-Enrollment-{enrollment.get('studentName', 'Student').replace(' ', '-')}.pdf"
            email_sender.send_enrollment_email(
                to_email=student['email'],
                student_name=enrollment.get('studentName', ''),
                enrollment_type=enrollment.get('type', 'Program'),
                pdf_bytes=pdf_bytes,
                pdf_filename=filename,
            )
            email_status = 'sent'
        except RuntimeError as e:
            email_status = 'not_configured'
            email_error = str(e)
        except Exception as e:
            email_status = 'failed'
            email_error = str(e)
    elif body.sendEmail and (not student or not student.get('email')):
        email_status = 'no_email_on_file'

    return {
        'enrollment': enrollment,
        'email_status': email_status,
        'email_error': email_error,
    }


@api.delete('/enrollments/{enrollment_id}')
async def cancel_enrollment(enrollment_id: str, user=Depends(auth_mod.require_staff)):
    """Mark an enrollment as cancelled (does NOT reverse student totals -
    if the enrollment was signed, those totals stay; cancelling is for
    administrative tracking only)."""
    creds = await _require_creds()
    res = await sheets_client.update_row_by_id(creds, 'Enrollments', enrollment_id, {'status': 'Cancelled'})
    if not res:
        raise HTTPException(status_code=404, detail='Enrollment not found')
    return {'ok': True}


@api.get('/enrollments/{enrollment_id}/pdf')
async def enrollment_pdf(enrollment_id: str, user=Depends(auth_mod.require_staff)):
    """Generate and stream the PDF for an enrollment."""
    from fastapi.responses import Response
    creds = await _require_creds()
    enrollments = await sheets_client.read_tab(creds, 'Enrollments')
    enrollment = next((e for e in enrollments if e.get('id') == enrollment_id), None)
    if not enrollment:
        raise HTTPException(status_code=404, detail='Enrollment not found')
    pdf_bytes = pdf_generator.generate_enrollment_pdf(enrollment)
    filename = f"CDM-Enrollment-{enrollment.get('studentName', 'Student').replace(' ', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename=\"{filename}\"'},
    )


@api.get('/setup/email-status')
async def email_status(user=Depends(auth_mod.require_staff)):
    return {'configured': email_sender.is_configured()}


@api.post('/setup/import-students')
async def import_students(user=Depends(auth_mod.require_staff)):
    """Reset all CRM tabs (wipe old/incompatible schema) and seed Students with the real data."""
    creds = await _require_creds()
    seed_path = ROOT_DIR / 'seed' / 'students_seed.json'
    if not seed_path.exists():
        raise HTTPException(status_code=404, detail='Seed file not found')
    import json
    with open(seed_path) as f:
        students = json.load(f)
    # Reset all CRM tabs to match the new schema (creates Packages, Payments & Enrollments tabs too)
    for tab in ('Students', 'Lessons', 'Hostings', 'Packages', 'Payments', 'Enrollments'):
        await sheets_client.reset_tab_with_headers(creds, tab)
    count = await sheets_client.bulk_append(creds, 'Students', students)
    return {'ok': True, 'imported': count, 'reset_tabs': ['Students', 'Lessons', 'Hostings', 'Packages', 'Payments', 'Enrollments']}


@api.post('/setup/reset-all-tabs')
async def reset_all_tabs(user=Depends(auth_mod.require_staff)):
    """Wipe Students, Lessons, Hostings tabs completely and write canonical headers.

    Use this when the sheet has incompatible columns from a previous app version.
    """
    creds = await _require_creds()
    for tab in ('Students', 'Lessons', 'Hostings'):
        await sheets_client.reset_tab_with_headers(creds, tab)
    return {'ok': True, 'reset': ['Students', 'Lessons', 'Hostings']}


@api.post('/setup/clear-tab')
async def clear_tab(tab: str, user=Depends(auth_mod.require_staff)):
    """Wipe all data rows from a tab (keeps header). Useful to clear test data."""
    creds = await _require_creds()
    if tab not in ('Students', 'Lessons', 'Hostings'):
        raise HTTPException(status_code=400, detail='Invalid tab')
    await sheets_client.clear_tab_keep_header(creds, tab)
    return {'ok': True, 'cleared': tab}


@api.get('/calendar/info')
async def calendar_info(user=Depends(auth_mod.require_staff)):
    return {
        'calendar_id': os.environ.get('GOOGLE_CALENDAR_ID', 'primary'),
        'is_primary': os.environ.get('GOOGLE_CALENDAR_ID', 'primary') == 'primary',
    }


@api.get('/income/analysis')
async def income_analysis(
    days_back: int = Query(180, ge=1, le=730),
    days_forward: int = Query(180, ge=1, le=730),
    calendar: str = Query('primary', description="'primary' or 'app' (the configured Test CRM cal)"),
    user=Depends(auth_mod.require_staff),
):
    """Analyze events from the chosen calendar and compute income breakdown."""
    creds = await _require_creds()
    if calendar == 'app':
        cal_id = os.environ.get('GOOGLE_CALENDAR_ID', 'primary')
    else:
        cal_id = 'primary'
    # Load known student names so the parser can identify them in event titles
    students = await sheets_client.read_tab(creds, 'Students')
    known_names = [s.get('name', '').strip() for s in students if s.get('name')]
    events = await calendar_client.list_events(creds, days_back=days_back,
                                               days_forward=days_forward,
                                               calendar_id=cal_id)
    analysis = calendar_income.analyze_events(events, known_names=known_names)
    analysis['source_calendar'] = cal_id
    analysis['window'] = {'days_back': days_back, 'days_forward': days_forward}
    return analysis


@api.get('/')
async def root():
    return {'app': 'CDM Dance CRM', 'status': 'ok'}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()
