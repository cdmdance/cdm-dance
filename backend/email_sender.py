"""SMTP email sender for enrollment PDFs.

Reads SMTP creds from env. If not configured, raises a clear error so the
frontend can fall back to download-only.
"""
import os
import smtplib
import logging
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(os.environ.get('SMTP_HOST') and os.environ.get('SMTP_USER') and os.environ.get('SMTP_PASSWORD'))


def send_enrollment_email(to_email: str, student_name: str, enrollment_type: str,
                          pdf_bytes: bytes, pdf_filename: str = 'CDM-Enrollment.pdf') -> bool:
    if not is_configured():
        raise RuntimeError('SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in backend env.')
    if not to_email:
        raise ValueError('No recipient email address provided')

    host = os.environ.get('SMTP_HOST')
    port = int(os.environ.get('SMTP_PORT', '587'))
    user = os.environ.get('SMTP_USER')
    password = os.environ.get('SMTP_PASSWORD')
    from_addr = os.environ.get('SMTP_FROM', user)
    from_name = os.environ.get('SMTP_FROM_NAME', 'CDM Dance Services')

    msg = EmailMessage()
    msg['Subject'] = f'Your CDM Dance {enrollment_type} Enrollment & Receipt'
    msg['From'] = f'{from_name} <{from_addr}>'
    msg['To'] = to_email
    body = f"""Hi {student_name},

Thank you for enrolling with CDM Dance Services LLC. Attached is your enrollment receipt, which includes the program/event details, our refund policy, and the signed liability release.

Please keep this for your records.

If you have any questions, reply to this email.

Warm regards,
CDM Dance Services LLC
cdmdanceservices@gmail.com
"""
    msg.set_content(body)
    msg.add_attachment(pdf_bytes, maintype='application', subtype='pdf', filename=pdf_filename)

    try:
        with smtplib.SMTP(host, port) as srv:
            srv.starttls()
            srv.login(user, password)
            srv.send_message(msg)
        logger.info(f'Sent enrollment email to {to_email}')
        return True
    except Exception as e:
        logger.exception(f'Failed to send email to {to_email}: {e}')
        raise
