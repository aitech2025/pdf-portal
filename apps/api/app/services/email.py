import aiosmtplib
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import logging

logger = logging.getLogger(__name__)

async def send_email(to: str, subject: str, html: str):
    """Send email via SMTP or Builder Mailer API fallback."""
    if settings.SMTP_HOST:
        await _send_via_smtp(to, subject, html)
    elif settings.BUILDER_MAILER_API_URL:
        await _send_via_builder_mailer(to, subject, html)
    else:
        logger.warning(f"No email provider configured. Would send to {to}: {subject}")

async def _send_via_smtp(to: str, subject: str, html: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            use_tls=False,
            start_tls=True,
        )
    except Exception as e:
        logger.error(f"SMTP send failed: {e}")

async def _send_via_builder_mailer(to: str, subject: str, html: str):
    payload = {
        "subject": subject,
        "content": {"html": html, "type": "plain"},
        "from": settings.BUILDER_MAILER_SENDER_ADDRESS,
        "replyTo": settings.BUILDER_MAILER_SENDER_ADDRESS,
        "to": to,
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.BUILDER_MAILER_API_URL}/api/v2/email",
                json=payload,
                headers={"Authorization": f"Bearer {settings.BUILDER_MAILER_API_KEY}"},
            )
            if resp.status_code != 200:
                logger.error(f"Builder Mailer failed: {resp.text}")
    except Exception as e:
        logger.error(f"Builder Mailer send failed: {e}")

# --- Notification helpers ---

async def send_onboarding_request_email(school_name: str, location: str, email: str, mobile: str, grades: str):
    html = f"""<h2>New School Onboarding Request</h2>
    <p><strong>School Name:</strong> {school_name}</p>
    <p><strong>Location:</strong> {location}</p>
    <p><strong>Email:</strong> {email}</p>
    <p><strong>Mobile:</strong> {mobile}</p>
    <p><strong>Grades:</strong> {grades}</p>"""
    await send_email(settings.SMTP_FROM_EMAIL, "New School Onboarding Request", html)

async def send_onboarding_approval_email(to: str, school_name: str, contact_name: str):
    html = f"""<h2>Onboarding Approval Confirmation</h2>
    <p>Dear {contact_name or 'School Administrator'},</p>
    <p>Your school <strong>{school_name}</strong> has been approved. Your account is now active.</p>"""
    await send_email(to, "School Onboarding Approved", html)

async def send_user_request_email(school_name: str, user_name: str, email: str, role: str):
    html = f"""<h2>New User Request</h2>
    <p><strong>School:</strong> {school_name}</p>
    <p><strong>User Name:</strong> {user_name}</p>
    <p><strong>Email:</strong> {email}</p>
    <p><strong>Role:</strong> {role}</p>"""
    await send_email(settings.SMTP_FROM_EMAIL, f"New User Request from {school_name}", html)

async def send_user_request_approval_email(to: str, user_name: str):
    html = f"""<h2>User Request Approved</h2>
    <p>Dear {user_name}, your account is now active.</p>"""
    await send_email(to, "User Request Approved", html)

async def send_pdf_approval_email(to: str, file_name: str):
    html = f"""<h2>Your PDF has been approved!</h2>
    <p><strong>PDF Name:</strong> {file_name}</p>
    <p>Your PDF is now available in the system.</p>"""
    await send_email(to, f"PDF Approved: {file_name}", html)

async def send_pdf_rejection_email(to: str, file_name: str, reason: str):
    html = f"""<h2>Your PDF Submission Was Not Approved</h2>
    <p><strong>PDF Name:</strong> {file_name}</p>
    <p><strong>Rejection Reason:</strong> {reason}</p>"""
    await send_email(to, f"PDF Rejected: {file_name}", html)
