"""Parse calendar events into income records.

Recognized patterns (based on real CDM Dance calendar data):
- Hostings:
    "Hosting Cabaret Mandy, Nair, Ester"
    "Hosting Mandy, Nair, Ester"
    "Hosting Mandy"
    "Hosting Pam's Party"
    "Hosting Sarasota Cynthia, Arleen"
    "Hosting Bobby & Arleen, Mandy"
    "Cabaret Kay, Diane, Lynda"          (Cabaret implies hosting if 2+ names)
    "Ester Hosting Event"
- Lessons:
    "Private Lesson Justine"
    "Private lesson Ester"   (lowercase)
    "Prívate lesson Deb Daly"  (Spanish accent)
    "Private Arleen"
    "Maukie & Balina Lesson"
    "Alina Lyashenko"        (bare known student name)

Rates:
    Hosting: $HOSTING_RATE_PER_PERSON per attendee
    Lesson: $LESSON_RATE_DEFAULT (or per-student override via STUDENT_RATES env)
"""
import os
import re
from datetime import datetime
from collections import defaultdict

HOSTING_RATE = int(os.environ.get('HOSTING_RATE_PER_PERSON', '80'))
LESSON_RATE_DEFAULT = int(os.environ.get('LESSON_RATE_DEFAULT', '75'))

_STUDENT_RATES_RAW = os.environ.get('STUDENT_RATES', '')
_HOST_RATES_RAW = os.environ.get('HOST_RATES', '')
_NAME_ALIASES_RAW = os.environ.get('NAME_ALIASES', '')
try:
    import json as _json
    STUDENT_RATES = _json.loads(_STUDENT_RATES_RAW) if _STUDENT_RATES_RAW else {}
    HOST_RATES = _json.loads(_HOST_RATES_RAW) if _HOST_RATES_RAW else {}
    NAME_ALIASES = _json.loads(_NAME_ALIASES_RAW) if _NAME_ALIASES_RAW else {}
except Exception:
    STUDENT_RATES = {}
    HOST_RATES = {}
    NAME_ALIASES = {}


def canonical_name(name: str) -> str:
    """Apply NAME_ALIASES mapping (case-insensitive) to merge name variants."""
    if not name:
        return name
    key = name.strip()
    # exact match first
    if key in NAME_ALIASES:
        return NAME_ALIASES[key]
    # case-insensitive match
    lower = key.lower()
    for alias, canonical in NAME_ALIASES.items():
        if alias.lower() == lower:
            return canonical
    return key


def host_rate_for(name: str) -> int:
    """Per-host rate override, falling back to HOSTING_RATE default."""
    canonical = canonical_name(name)
    if canonical in HOST_RATES:
        return HOST_RATES[canonical]
    if name in HOST_RATES:
        return HOST_RATES[name]
    return HOSTING_RATE


def lesson_rate_for(name: str) -> int:
    """Per-student lesson rate override, falling back to LESSON_RATE_DEFAULT."""
    canonical = canonical_name(name)
    if canonical in STUDENT_RATES:
        return STUDENT_RATES[canonical]
    if name in STUDENT_RATES:
        return STUDENT_RATES[name]
    return LESSON_RATE_DEFAULT

# Known location/venue keywords that should NOT be counted as names
LOCATION_KEYWORDS = [
    'cabaret', 'sarasota', 'rhapsody', 'rhapshody', 'bradenton',
    'dynasty', 'sara dance', "st petersburg", 'st. petersburg',
    "pam's party", 'pams party', 'party', 'event',
    'usa dance', 'illumina', 'sara',
]
# Words that indicate a hosting event
HOSTING_KEYWORDS = ['hosting']
# Words that indicate a lesson
LESSON_KEYWORDS = ['private', 'lesson', 'prívate']

# Words we drop entirely from the names portion
DROP_TOKENS = set(['hosting', 'lesson', 'private', 'prívate', 'event', "'s", 'and',
                   'party', 'cabaret', 'sarasota', 'rhapsody', 'rhapshody',
                   'bradenton', 'dynasty', 'sara', 'dance', 'st', 'petersburg', 'pams',
                   "pam's", 'usa', 'illumina'])

# Things that are clearly not income events
EXCLUDE_PHRASES = [
    'therapy', 'hearing', 'workout', 'pick up', 'pick', 'lunch',
    'concert', 'volleyball', 'school', 'volunteer', 'airport',
    'showcase', 'jotform', 'costa rica', 'california', 'bali',
    'orlando', 'francois', 'myriah', 'charleston', 'illumina dance classes',
    'cassandra', 'soul in motion',
]


def _norm(s: str) -> str:
    return re.sub(r'\s+', ' ', s.strip().lower())


def _extract_names_blob(title: str) -> str:
    """Strip known keywords and locations from title, returning the names-portion only."""
    t = title
    # Remove apostrophe constructs like "Pam's Party"
    t = re.sub(r"[\u2019']s\s+party", '', t, flags=re.IGNORECASE)
    # Remove location keywords (longest first to handle "Sara Dance" before "Sara")
    for loc in sorted(LOCATION_KEYWORDS, key=len, reverse=True):
        t = re.sub(rf'\b{re.escape(loc)}\b', '', t, flags=re.IGNORECASE)
    # Remove the action keywords
    t = re.sub(r'\b(hosting|private|prívate|lesson|event)\b', '', t, flags=re.IGNORECASE)
    # Clean punctuation except commas, &, accents
    t = re.sub(r'[!?\.;:]', '', t)
    return re.sub(r'\s+', ' ', t).strip(' ,&-')


def _split_names(blob: str, known_names: list[str] | None = None) -> list[str]:
    if not blob:
        return []
    # Split on commas, & and "and"
    parts = re.split(r'[,&]|\band\b', blob, flags=re.IGNORECASE)
    cleaned = []
    for p in parts:
        name = p.strip(' ,&-\'"')
        if not name:
            continue
        # Drop tokens that are dropwords
        if _norm(name) in DROP_TOKENS:
            continue
        # Drop very short (<2 chars) or obvious garbage
        if len(name) < 2:
            continue
        # Title-case (preserve original-ish but normalize)
        cleaned.append(' '.join(w[:1].upper() + w[1:] for w in name.split()))
    return cleaned


def _is_excluded(title: str) -> bool:
    low = title.lower()
    for ph in EXCLUDE_PHRASES:
        if ph in low:
            return True
    return False


def classify_event(title: str, known_names: list[str] | None = None) -> dict:
    """Return {type, location, names, student, income}."""
    if not title:
        return {'type': 'other', 'location': '', 'names': [], 'student': '', 'income': 0}

    if _is_excluded(title):
        return {'type': 'other', 'location': '', 'names': [], 'student': '', 'income': 0}

    low = title.lower()
    has_hosting = any(k in low for k in HOSTING_KEYWORDS)
    has_lesson = ('private' in low) or ('lesson' in low) or ('prívate' in low)
    has_cabaret = 'cabaret' in low

    # Detect location from the title (the first location keyword found)
    location = ''
    for loc in sorted(LOCATION_KEYWORDS, key=len, reverse=True):
        if re.search(rf'\b{re.escape(loc)}\b', title, re.IGNORECASE):
            location = loc.title()
            break

    blob = _extract_names_blob(title)
    names = _split_names(blob, known_names)

    # If we have known names, also detect known students mentioned anywhere
    detected_known = []
    if known_names:
        # Sort known names by length descending so we match "Deb Daly" before "Deb"
        for kn in sorted(known_names, key=len, reverse=True):
            if re.search(rf'\b{re.escape(kn)}\b', title, re.IGNORECASE):
                detected_known.append(kn)
        # If detected_known is non-empty AND we couldn't parse names cleanly, use detected
        if detected_known and not names:
            names = detected_known

    # Classification
    if has_hosting:
        if not names:
            return {'type': 'hosting', 'location': location, 'names': [],
                    'student': '', 'income': 0}
        canonical_names = [canonical_name(n) for n in names]
        income = sum(host_rate_for(n) for n in canonical_names)
        return {'type': 'hosting', 'location': location, 'names': canonical_names,
                'student': '', 'income': income}

    if has_cabaret and len(names) >= 1 and not has_lesson:
        canonical_names = [canonical_name(n) for n in names]
        income = sum(host_rate_for(n) for n in canonical_names)
        return {'type': 'hosting', 'location': 'Cabaret', 'names': canonical_names,
                'student': '', 'income': income}

    if has_lesson:
        if not names and not detected_known:
            return {'type': 'lesson', 'location': '', 'names': [], 'student': '', 'income': 0}
        # If multiple students in one lesson, count each
        if names and len(names) > 1:
            canonical_names = [canonical_name(n) for n in names]
            total = sum(lesson_rate_for(n) for n in canonical_names)
            return {'type': 'lesson', 'location': '', 'names': canonical_names,
                    'student': ', '.join(canonical_names), 'income': total}
        raw_student = names[0] if names else detected_known[0]
        student = canonical_name(raw_student)
        rate = lesson_rate_for(student)
        return {'type': 'lesson', 'location': '', 'names': [],
                'student': student, 'income': rate}

    # Title that is just a known student name => lesson
    if known_names:
        norm_title = _norm(title)
        for kn in known_names:
            if _norm(kn) == norm_title:
                canonical = canonical_name(kn)
                return {'type': 'lesson', 'location': '', 'names': [],
                        'student': canonical, 'income': lesson_rate_for(canonical)}

    # "X Hosting Event" pattern
    if 'hosting event' in low:
        if detected_known:
            canonical_names = [canonical_name(n) for n in detected_known]
            income = sum(host_rate_for(n) for n in canonical_names)
            return {'type': 'hosting', 'location': '', 'names': canonical_names,
                    'student': '', 'income': income}

    return {'type': 'other', 'location': '', 'names': [], 'student': '', 'income': 0}


def analyze_events(events: list[dict], today_iso: str | None = None,
                   known_names: list[str] | None = None) -> dict:
    if today_iso is None:
        today_iso = datetime.utcnow().date().isoformat()

    all_events = []
    by_student = defaultdict(lambda: {'lessons_count': 0, 'lessons_total': 0})
    by_host = defaultdict(lambda: {'hostings_count': 0, 'hostings_total': 0})

    earned_by_month = defaultdict(float)
    projected_by_month = defaultdict(float)
    earned_total = 0
    projected_total = 0
    earned_hostings_amt = 0
    earned_lessons_amt = 0
    projected_hostings_amt = 0
    projected_lessons_amt = 0
    earned_hostings_count = 0
    earned_lessons_count = 0
    projected_hostings_count = 0
    projected_lessons_count = 0

    for e in events:
        date = e.get('date', '')
        if not date:
            continue
        info = classify_event(e.get('summary', ''), known_names=known_names)
        enriched = {
            'id': e.get('id'),
            'date': date,
            'time': e.get('time', ''),
            'summary': e.get('summary', ''),
            'location_raw': e.get('location', ''),
            **info,
        }
        all_events.append(enriched)

        month_key = date[:7]
        is_past = date < today_iso

        if info['type'] == 'hosting':
            if is_past:
                earned_total += info['income']
                earned_hostings_amt += info['income']
                earned_hostings_count += 1
                earned_by_month[month_key] += info['income']
            else:
                projected_total += info['income']
                projected_hostings_amt += info['income']
                projected_hostings_count += 1
                projected_by_month[month_key] += info['income']
            for name in info['names']:
                rate = host_rate_for(name)
                by_host[name]['hostings_count'] += 1
                by_host[name]['hostings_total'] += rate
        elif info['type'] == 'lesson':
            if is_past:
                earned_total += info['income']
                earned_lessons_amt += info['income']
                earned_lessons_count += 1
                earned_by_month[month_key] += info['income']
            else:
                projected_total += info['income']
                projected_lessons_amt += info['income']
                projected_lessons_count += 1
                projected_by_month[month_key] += info['income']
            if info['student']:
                # If multiple students in one lesson, attribute proportionally
                students = info['names'] if info.get('names') else [info['student']]
                per_student_rate = info['income'] / max(1, len(students))
                for s in students:
                    by_student[s]['lessons_count'] += 1
                    by_student[s]['lessons_total'] += per_student_rate

    return {
        'rates': {
            'hosting_per_person': HOSTING_RATE,
            'lesson_default': LESSON_RATE_DEFAULT,
            'student_overrides': STUDENT_RATES,
        },
        'today': today_iso,
        'earned': {
            'total': earned_total,
            'hostings': earned_hostings_amt,
            'lessons': earned_lessons_amt,
            'hostings_count': earned_hostings_count,
            'lessons_count': earned_lessons_count,
            'by_month': dict(earned_by_month),
        },
        'projected': {
            'total': projected_total,
            'hostings': projected_hostings_amt,
            'lessons': projected_lessons_amt,
            'hostings_count': projected_hostings_count,
            'lessons_count': projected_lessons_count,
            'by_month': dict(projected_by_month),
        },
        'by_student': dict(by_student),
        'by_host': dict(by_host),
        'events': sorted(all_events, key=lambda x: (x['date'], x.get('time', ''))),
    }
