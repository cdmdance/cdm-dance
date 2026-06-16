"""PDF generator for CDM Dance Services enrollment receipts."""
import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

GOLD = HexColor('#a67e2e')
DARK = HexColor('#222')


def _styles():
    base = getSampleStyleSheet()
    return {
        'h1': ParagraphStyle('h1', parent=base['Heading1'], fontName='Times-Italic',
                             fontSize=22, textColor=GOLD, alignment=TA_CENTER, spaceAfter=4),
        'tag': ParagraphStyle('tag', parent=base['Normal'], fontName='Helvetica',
                              fontSize=9, alignment=TA_CENTER, textColor=HexColor('#888'),
                              spaceAfter=18),
        'h2': ParagraphStyle('h2', parent=base['Heading2'], fontName='Times-Roman',
                             fontSize=13, textColor=DARK, spaceBefore=12, spaceAfter=6,
                             borderBottomWidth=1, borderBottomColor=GOLD, borderBottomPadding=2),
        'h3': ParagraphStyle('h3', parent=base['Heading3'], fontName='Times-Bold',
                             fontSize=11, textColor=DARK, spaceBefore=8, spaceAfter=2),
        'body': ParagraphStyle('body', parent=base['Normal'], fontName='Helvetica',
                               fontSize=10, leading=14, alignment=TA_JUSTIFY, spaceAfter=6),
        'small': ParagraphStyle('small', parent=base['Normal'], fontName='Helvetica',
                                fontSize=8.5, textColor=HexColor('#555'), leading=11),
        'sig': ParagraphStyle('sig', parent=base['Normal'], fontName='Times-Italic',
                              fontSize=14, textColor=DARK, spaceAfter=2),
    }


REFUND_POLICY_HTML = """
<b>Lesson Packages</b><br/>
All lesson packages are non-refundable once purchased. Unused lessons hold their monetary value for one (1) year from the date of purchase, after which they expire with no cash value. Lesson packages are non-transferable and may only be used by the enrolled student.<br/><br/>
<b>Event Enrollments</b><br/>
Event fees (showcases, competitions, mini matches, and other events) are non-refundable once paid. If a student is unable to attend a registered event, fees may be applied as a credit toward a future event at the instructor's discretion, provided written notice is given at least 14 days before the event date.<br/><br/>
<b>Medical &amp; Emergency Exceptions</b><br/>
In the case of a documented medical condition or family emergency that prevents a student from continuing lessons, unused lesson value may be frozen and held for up to six (6) months upon submission of supporting documentation.<br/><br/>
<b>No-Shows &amp; Cancellations</b><br/>
Lessons cancelled with less than 24 hours' notice are forfeited. Lessons cancelled with 24 hours' notice or more will be rescheduled at the instructor's availability.<br/><br/>
<b>Changes to Packages</b><br/>
CDM Dance Services LLC reserves the right to adjust pricing for future packages. Purchased packages are honored at the rate agreed upon at time of purchase.
"""

LIABILITY_RELEASE_HTML = """
I, the undersigned, hereby acknowledge and agree to the following terms as a condition of participating in dance lessons, events, and activities offered by CDM Dance Services LLC.<br/><br/>
<b>Assumption of Risk</b><br/>
I understand that dance instruction and related physical activities involve inherent risks, including but not limited to muscle strains, sprains, falls, and other physical injuries. I voluntarily assume all such risks associated with my participation in any program or event offered by CDM Dance Services LLC.<br/><br/>
<b>Release of Liability</b><br/>
I hereby release, waive, and discharge CDM Dance Services LLC, its instructors, staff, agents, and representatives from any and all claims, demands, losses, or liability arising out of or related to any injury, accident, illness, or damage I may sustain during participation in any lesson, event, or activity, whether caused by negligence or otherwise.<br/><br/>
<b>Medical Disclosure</b><br/>
I confirm that I am in adequate physical health to participate in dance activities. I agree to inform CDM Dance Services LLC of any medical conditions, physical limitations, or injuries that may affect my participation prior to beginning lessons or attending events.<br/><br/>
<b>Photo &amp; Video Consent</b><br/>
I grant CDM Dance Services LLC permission to photograph and/or record video of me during lessons, events, and performances for use in promotional materials, social media, and studio documentation, unless I provide written notice otherwise.<br/><br/>
<b>Acknowledgment</b><br/>
I have read and fully understand this Liability Release and Waiver. I agree that this release is binding upon me, my heirs, assigns, and legal representatives. I am signing this agreement voluntarily and of my own free will.
"""


def _fmt_money(n):
    try:
        return f"${float(n):,.2f}"
    except Exception:
        return f"${n}"


def _fmt_date(s):
    if not s:
        return ''
    try:
        if 'T' in str(s):
            return datetime.fromisoformat(str(s).replace('Z', '+00:00')).strftime('%B %d, %Y')
        return datetime.fromisoformat(str(s)[:10]).strftime('%B %d, %Y')
    except Exception:
        return str(s)


def generate_enrollment_pdf(enrollment: dict) -> bytes:
    """Build a PDF receipt/enrollment document and return raw bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            rightMargin=0.7 * inch, leftMargin=0.7 * inch,
                            topMargin=0.6 * inch, bottomMargin=0.6 * inch)
    s = _styles()
    story = []

    # Header
    story.append(Paragraph('CDM', s['h1']))
    story.append(Paragraph('DANCE SERVICES LLC', s['tag']))
    title = 'Program Enrollment' if enrollment.get('type') == 'Program' else 'Event Enrollment'
    story.append(Paragraph(f'<para alignment="center"><b>{title} - Receipt</b></para>',
                           ParagraphStyle('hdr', fontName='Times-Roman', fontSize=14,
                                          textColor=DARK, alignment=TA_CENTER)))
    story.append(Spacer(1, 14))

    # Enrollment Details Table
    info_rows = [
        ['Enrollment ID', enrollment.get('id', '')[:13] + '...'],
        ['Date', _fmt_date(enrollment.get('date'))],
        ['Student', enrollment.get('studentName', '')],
        ['Status', enrollment.get('status', 'Pending')],
    ]
    if enrollment.get('type') == 'Program':
        info_rows += [
            ['Program Tier', enrollment.get('programTier', '')],
            ['Lessons', str(enrollment.get('lessonsCount', ''))],
            ['Price per Lesson', _fmt_money(enrollment.get('pricePerLesson', 0))],
            ['Total Value', _fmt_money(enrollment.get('totalValue', 0))],
            ['Expiration', _fmt_date(enrollment.get('expirationDate'))],
        ]
    else:
        info_rows += [
            ['Event Name', enrollment.get('eventName', '')],
            ['Event Type', enrollment.get('eventType', '')],
            ['Event Date', _fmt_date(enrollment.get('eventDate'))],
            ['Location', enrollment.get('eventLocation', '')],
            ['Total Cost', _fmt_money(enrollment.get('totalCost', 0))],
        ]
    info_rows += [
        ['Payment Method', enrollment.get('paymentMethod', '')],
        ['Amount Paid', _fmt_money(enrollment.get('amountPaid', 0))],
    ]
    if enrollment.get('notes'):
        info_rows.append(['Notes', enrollment.get('notes', '')])

    tbl = Table(info_rows, colWidths=[1.6 * inch, 4.6 * inch])
    tbl.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#666')),
        ('TEXTCOLOR', (1, 0), (1, -1), DARK),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.4, HexColor('#ddd')),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 18))

    # Refund Policy
    story.append(Paragraph('Refund Policy', s['h2']))
    story.append(Paragraph(REFUND_POLICY_HTML, s['small']))
    story.append(Spacer(1, 8))

    # Liability Release
    story.append(PageBreak())
    story.append(Paragraph('Liability Release & Waiver', s['h2']))
    story.append(Paragraph(LIABILITY_RELEASE_HTML, s['small']))
    story.append(Spacer(1, 22))

    # Signature
    signed_by = enrollment.get('signedBy') or ''
    signed_at = enrollment.get('signedAt') or ''
    if signed_by:
        story.append(Paragraph(f'<u>&nbsp;&nbsp;{signed_by}&nbsp;&nbsp;</u>', s['sig']))
        story.append(Paragraph(f'Signed by (typed full name) - {_fmt_date(signed_at)}', s['small']))
        story.append(Spacer(1, 6))
        story.append(Paragraph('<i>By signing above, the student agrees to the Refund Policy and Liability Release stated in this document.</i>', s['small']))
    else:
        story.append(Paragraph('Signature: ___________________________________', s['body']))
        story.append(Paragraph('Date: _____________________', s['body']))

    story.append(Spacer(1, 20))
    story.append(Paragraph('CDM Dance Services LLC - cdmdanceservices@gmail.com - cdm.dance',
                           ParagraphStyle('foot', fontName='Helvetica', fontSize=8,
                                          textColor=HexColor('#999'), alignment=TA_CENTER)))

    doc.build(story)
    return buf.getvalue()
