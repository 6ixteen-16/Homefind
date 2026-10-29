from fastapi import FastAPI, HTTPException, Request, Response, Header, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Create public image and private verification directories if they don't exist.
os.makedirs("static/uploads", exist_ok=True)

class AgentCreate(BaseModel):
    name: str
    email: str
    phone_number: str
    password: str

class AgentUpdate(BaseModel):
    name: str
    phone_number: str

import pymysql
import pymysql.cursors
import hashlib
import hmac
import math
import re
import secrets
import smtplib
from email.message import EmailMessage
try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
    ph = PasswordHasher()
except ImportError:
    ph = None
    class VerifyMismatchError(Exception): pass
    class VerificationError(Exception): pass
    class InvalidHashError(Exception): pass
from typing import Optional

import datetime
import uuid

# In-memory sessions are process-local. Use Redis or a database for multi-worker production deployments.
sessions = {}
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "3600"))
PRIVATE_UPLOAD_DIR = Path(os.getenv("PRIVATE_UPLOAD_DIR", "private_uploads"))
PRIVATE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# One-time passcode settings
OTP_TTL_SECONDS = int(os.getenv("OTP_TTL_SECONDS", "300"))
OTP_MAX_ATTEMPTS = 5

# Optional SMTP settings used to e-mail one-time passcodes
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@homefind.local")
SMTP_STARTTLS = os.getenv("SMTP_STARTTLS", "1") != "0"
APP_URL = os.getenv("APP_URL", "http://127.0.0.1:8000")
PASSWORD_RESET_TTL_SECONDS = 3600  # 1 hour

from collections import defaultdict, deque
import time

# ---------------------------------------------------------------------------
# In-memory sliding-window rate limiting
# ---------------------------------------------------------------------------
_rate_limits = defaultdict(deque)

def rate_limit(key: str, limit: int, window_seconds: int) -> None:
    now = time.monotonic()
    q = _rate_limits[key]
    while q and now - q[0] > window_seconds:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")
    q.append(now)

def now_ts():
    return datetime.datetime.now(datetime.timezone.utc).timestamp()

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token.strip():
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = token.strip()
    session = sessions.get(token)
    if not session or not session.get('authenticated'):
        raise HTTPException(status_code=401, detail="Invalid session")
    if session.get('expires_at', 0) <= now_ts():
        sessions.pop(token, None)
        raise HTTPException(status_code=401, detail="Session expired")
    session['token'] = token
    return session

def optional_session(authorization: Optional[str]):
    """Return the authenticated session for a Bearer header, or None (never raises)."""
    if not authorization:
        return None
    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token.strip():
        return None
    session = sessions.get(token.strip())
    if not session or not session.get('authenticated') or session.get('expires_at', 0) <= now_ts():
        return None
    return session

def require_roles(*allowed_roles):
    def dependency(user: dict = Depends(get_current_user)):
        if user.get('role') not in allowed_roles:
            roles = ", ".join(allowed_roles)
            raise HTTPException(status_code=403, detail=f"Forbidden: requires {roles} role")
        return user
    return dependency

def get_admin_user(user: dict = Depends(require_roles("Admin"))):
    return user

def get_verification_user(user: dict = Depends(require_roles("Owner", "Agent"))):
    return user

def get_owner_user(user: dict = Depends(require_roles("Owner"))):
    return user

def get_agent_user(user: dict = Depends(require_roles("Agent"))):
    return user

def get_tenant_user(user: dict = Depends(require_roles("Tenant"))):
    return user

DESTINATIONS = {'Owner': 'owner_portal.html', 'Agent': 'agent_portal.html', 'Tenant': 'properties.html', 'Admin': 'dashboard.html'}

def new_session(user_id, role):
    token = secrets.token_urlsafe(32)
    sessions[token] = {
        'user_id': user_id,
        'role': role,
        'authenticated': True,
        'expires_at': now_ts() + SESSION_TTL_SECONDS,
    }
    return token

def purge_user_sessions(user_id):
    for token in [t for t, s in sessions.items() if s.get('user_id') == user_id]:
        sessions.pop(token, None)


# Configuration
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "")
DB_NAME = os.getenv("DB_NAME", "homefinder_db")
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
APP_ENV = os.getenv("APP_ENV", "development").lower()

app = FastAPI(
    docs_url=None if APP_ENV == "production" else "/docs",
    redoc_url=None if APP_ENV == "production" else "/redoc",
    openapi_url=None if APP_ENV == "production" else "/openapi.json",
)
if APP_ENV == "production":
    @app.get("/docs", include_in_schema=False)
    def disabled_docs():
        raise HTTPException(status_code=404, detail="Not found")

    @app.get("/redoc", include_in_schema=False)
    def disabled_redoc():
        raise HTTPException(status_code=404, detail="Not found")

    @app.get("/openapi.json", include_in_schema=False)
    def disabled_openapi():
        raise HTTPException(status_code=404, detail="Not found")

if CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

# Security headers. The pages use inline <script>/<style>, so 'unsafe-inline' is still required;
# the real XSS protection is output escaping in the pages (static/esc.js). This policy still blocks
# external scripts, plugins, framing and cross-site fetch/XHR as defence in depth.
CSP = (
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; object-src 'none'; "
    "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
)
DOC_PATHS = ("/docs", "/redoc", "/openapi.json")

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    if request.url.path not in DOC_PATHS:
        response.headers.setdefault("Content-Security-Policy", CSP)
    return response

# ---------------------------------------------------------------------------
# Passwords: argon2id for new hashes. Legacy unsalted SHA-256 hashes (from the old
# seed data / earlier versions) are still accepted once and are upgraded to argon2
# automatically at the next successful login.
# ---------------------------------------------------------------------------
LEGACY_SHA256 = re.compile(r'^[0-9a-fA-F]{64}$')
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
COMMON_PASSWORDS = {"password", "password1", "password123", "12345678", "123456789", "qwerty123",
                    "admin123", "agent123", "tenant123", "owner123", "letmein123", "homefind123"}

def hash_password(plain_password: str) -> str:
    if ph:
        return ph.hash(plain_password)
    return hashlib.sha256(plain_password.encode()).hexdigest()

def verify_password(plain_password: str, stored_hash: str) -> bool:
    if not stored_hash or plain_password is None:
        return False
    if stored_hash.startswith("$argon2"):
        if ph:
            try:
                return ph.verify(stored_hash, plain_password)
            except (VerifyMismatchError, VerificationError, InvalidHashError):
                return False
        return False
    if LEGACY_SHA256.match(stored_hash):
        sha_hash = hashlib.sha256(plain_password.encode()).hexdigest()
        return hmac.compare_digest(sha_hash, stored_hash.lower())
    return False

def password_needs_upgrade(stored_hash: str) -> bool:
    if not ph:
        return False
    if not stored_hash.startswith("$argon2"):
        return True
    try:
        return ph.check_needs_rehash(stored_hash)
    except Exception:
        return True


def validate_new_password(password, email=None):
    if not isinstance(password, str):
        return "Password is required."
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if len(password) > MAX_PASSWORD_LENGTH:
        return f"Password must be at most {MAX_PASSWORD_LENGTH} characters."
    if password.lower() in COMMON_PASSWORDS or (email and password.lower() == email.lower()):
        return "That password is too easy to guess. Please choose a different one."
    return None


# Connect to Database
def get_db_connection():
    try:
        return pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def log_audit_action(user_id, action, table_name, record_id, old_value, new_value, ip_address):
    conn = get_db_connection()
    if not conn:
        return False
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO audit_logs (log_id, user_id, action, table_name, record_id, old_value, new_value, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (str(uuid.uuid4()), user_id, action, table_name, record_id, old_value, new_value, ip_address))
        conn.commit()
        return True
    except Exception as e:
        print(f"Audit log failed: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

# ---------------------------------------------------------------------------
# Small helpers: consistent error responses and input validation
# ---------------------------------------------------------------------------
def err(message, status=400, **extra):
    return JSONResponse(status_code=status, content={"status": "error", "message": message, **extra})

def server_error(exc, context=""):
    """Log the real error on the server; give the browser a generic message."""
    print(f"Server error {context}: {exc!r}")
    return err("Something went wrong. Please try again.", 500)

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
PROPERTY_STATUSES = {"Draft", "Published", "Archived"}
PROPERTY_TYPES = {"Apartment", "Condominium", "Rental House"}
INQUIRY_STATUSES = {"NEW", "IN_PROGRESS", "RESOLVED", "CLOSED", "READ"}
MAX_MONEY = 9999999999999.99  # DECIMAL(15,2)

async def read_json_object(request: Request):
    try:
        data = await request.json()
    except Exception:
        return None
    return data if isinstance(data, dict) else None

def text_field(data, key, label, max_len, required=True):
    value = data.get(key, '')
    if value is None:
        value = ''
    if not isinstance(value, str):
        return None, f"{label} must be text."
    value = value.strip()
    if required and not value:
        return None, f"{label} is required."
    if len(value) > max_len:
        return None, f"{label} must be at most {max_len} characters."
    return value, None

def email_field(data, key="email", label="Email"):
    value, error = text_field(data, key, label, 255, True)
    if error:
        return None, error
    if not EMAIL_RE.match(value):
        return None, "Please enter a valid email address."
    return value, None

def number_field(value, label, minimum, maximum, integer=False):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None, f"{label} must be a number."
    if not math.isfinite(number):
        return None, f"{label} must be a number."
    if number < minimum or number > maximum:
        return None, f"{label} must be between {minimum:g} and {maximum:g}."
    return (int(number) if integer else number), None

# Models
class LoginRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    otp: Optional[str] = None
    session_token: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    email: str
    current_password: str
    new_password: str

# ---------------------------------------------------------------------------
# SQL fragments shared by the public listing, the tenant portal and the admin editor.
# Each property is joined to exactly ONE unit (its "primary" unit) and ONE image so a
# property can never appear more than once in a result set.
#   primary unit = the unit called MAIN if there is one, otherwise the cheapest unit.
#   listing image = the featured image if there is one, otherwise the first image.
# ---------------------------------------------------------------------------
PRIMARY_UNIT_ORDER = "(u2.unit_number = 'MAIN') DESC, (u2.monthly_rent IS NULL) ASC, u2.monthly_rent ASC, u2.unit_number ASC"
PRIMARY_UNIT_JOIN = f"""
    LEFT JOIN unit u ON u.property_id = p.property_id AND u.unit_number = (
        SELECT u2.unit_number FROM unit u2 WHERE u2.property_id = p.property_id
        ORDER BY {PRIMARY_UNIT_ORDER} LIMIT 1)
"""
FEATURED_MEDIA_JOIN = """
    LEFT JOIN property_media m ON m.media_id = (
        SELECT m2.media_id FROM property_media m2 WHERE m2.property_id = p.property_id
        ORDER BY m2.is_featured DESC, m2.media_id ASC LIMIT 1)
"""

# ---------------------------------------------------------------------------
# Image uploads (public listing photos)
# ---------------------------------------------------------------------------
UPLOAD_DIR = Path("static/uploads")
LISTING_IMAGE_MAX_BYTES = 5 * 1024 * 1024

def detect_image_extension(content: bytes):
    """Decide the file type from the file's own bytes, never from the client-supplied name/type."""
    if content.startswith(b'\xff\xd8\xff'):
        return ".jpg"
    if content.startswith(b'\x89PNG\r\n\x1a\n'):
        return ".png"
    if content[:4] == b'RIFF' and content[8:12] == b'WEBP':
        return ".webp"
    return None

async def read_listing_image(image):
    """Return (content, extension) or (None, None) when no file was sent. Raises ValueError for bad files."""
    if image is None or not image.filename:
        return None, None
    content = await image.read(LISTING_IMAGE_MAX_BYTES + 1)
    if len(content) == 0:
        return None, None
    if len(content) > LISTING_IMAGE_MAX_BYTES:
        raise ValueError("Image must be 5 MB or smaller.")
    extension = detect_image_extension(content)
    if not extension:
        raise ValueError("Image must be a JPEG, PNG or WebP file.")
    return content, extension

def write_listing_image(property_id, content, extension):
    filename = f"{property_id}_{uuid.uuid4().hex}{extension}"
    (UPLOAD_DIR / filename).write_bytes(content)
    return filename

def delete_upload_files(urls):
    """Delete uploaded image files that are no longer referenced by any property_media row."""
    base = UPLOAD_DIR.resolve()
    conn = get_db_connection()
    if not conn:
        return
    cursor = conn.cursor()
    try:
        for url in urls:
            if not url or not url.startswith("/uploads/"):
                continue
            cursor.execute("SELECT COUNT(*) AS n FROM property_media WHERE url = %s", (url,))
            if cursor.fetchone()['n'] > 0:
                continue
            target = (base / url[len("/uploads/"):]).resolve()
            if base in target.parents and target.is_file():
                try:
                    target.unlink()
                except OSError as exc:
                    print(f"Could not delete {target}: {exc}")
    finally:
        cursor.close()
        conn.close()

# API Endpoints
@app.get("/api/get_properties")
def get_properties(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")

    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            SELECT p.property_id, p.property_name, p.price, p.currency, p.description,
                   p.street, p.district, p.city, p.country, p.location,
                   p.latitude, p.longitude, p.is_featured, p.views,
                   u.bedrooms, u.bathrooms, u.square_footage, u.monthly_rent,
                   u.availability_status, m.url AS image_url,
                   (SELECT GROUP_CONCAT(DISTINCT am.name ORDER BY am.name SEPARATOR ', ')
                    FROM property_amenity pam JOIN amenity am ON am.amenity_id = pam.amenity_id
                    WHERE pam.property_id = p.property_id) AS amenities
            FROM property p
            {PRIMARY_UNIT_JOIN}
            {FEATURED_MEDIA_JOIN}
            WHERE p.property_status = 'Published'
            ORDER BY p.is_featured DESC, p.created_at DESC, p.property_id ASC
        """)
        properties = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    return {"status": "success", "data": properties}

@app.get("/api/get_property")
def get_property(id: str, request: Request, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")

    # An authenticated Admin may preview unpublished properties; everyone else sees Published only.
    is_admin_preview = bool(user and user.get('role') == 'Admin')

    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            SELECT p.*, COALESCE(o.name, 'Unknown Owner') AS owner_name,
                   u.bedrooms, u.bathrooms, u.square_footage, u.monthly_rent, u.availability_status
            FROM property p
            LEFT JOIN owner o ON p.owner_id = o.owner_id
            {PRIMARY_UNIT_JOIN}
            WHERE p.property_id = %s
        """, (id,))
        prop = cursor.fetchone()

        if not prop or (prop['property_status'] != 'Published' and not is_admin_preview):
            return err("Property not found.", 404)

        cursor.execute("SELECT url FROM property_media WHERE property_id = %s ORDER BY is_featured DESC, media_id ASC", (id,))
        prop['media'] = cursor.fetchall()

        cursor.execute("""
            SELECT GROUP_CONCAT(DISTINCT am.name ORDER BY am.name SEPARATOR ', ') AS amenities
            FROM property_amenity pam JOIN amenity am ON am.amenity_id = pam.amenity_id
            WHERE pam.property_id = %s
        """, (id,))
        amenities_row = cursor.fetchone()
        prop['amenities'] = amenities_row['amenities'] if amenities_row and amenities_row['amenities'] else None

        cursor.execute("""
            SELECT unit_number, floor, bedrooms, bathrooms, square_footage, monthly_rent, availability_status
            FROM unit WHERE property_id = %s ORDER BY monthly_rent ASC, unit_number ASC
        """, (id,))
        prop['units'] = cursor.fetchall()

        # Count the view (public page views of published properties only).
        if prop['property_status'] == 'Published' and not is_admin_preview:
            cursor.execute("UPDATE property SET views = views + 1 WHERE property_id = %s", (id,))
            conn.commit()
            prop['views'] = (prop.get('views') or 0) + 1
        if prop.get('created_at'):
            prop['created_at'] = str(prop['created_at'])
    finally:
        cursor.close()
        conn.close()

    return {"status": "success", "data": prop}

LOCKED_MESSAGE = "Account locked due to too many failed attempts. Try again later."
INVALID_MESSAGE = "Invalid email or password."

def authenticate(conn, cursor, email, password, ip):
    """Check an email/password pair with lockout handling. Returns (user, error_message)."""
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    if not user:
        return None, INVALID_MESSAGE
    if not user.get('is_active', 1):
        if user.get('role') == 'Tenant':
            return None, "Please verify your email address before signing in. Check your inbox for the verification link."
        return None, "Your account is pending admin approval. You will be notified once it is activated."

    now = datetime.datetime.now()
    locked_until = user['locked_until']
    if locked_until and locked_until > now:
        return None, LOCKED_MESSAGE
    # A lock that has expired starts a fresh set of attempts (the old counter must not carry over).
    attempts_before = 0 if locked_until else (user['failed_login_attempts'] or 0)

    if not verify_password(password, user['password_hash']):
        attempts = attempts_before + 1
        new_lock = (now + datetime.timedelta(minutes=15)) if attempts >= 5 else None
        cursor.execute("UPDATE users SET failed_login_attempts = %s, locked_until = %s WHERE user_id = %s",
                       (attempts, new_lock, user['user_id']))
        conn.commit()
        log_audit_action(user['user_id'], 'LOGIN_FAILED', 'users', user['user_id'], None, f"Attempt {attempts}", ip)
        return None, INVALID_MESSAGE

    if password_needs_upgrade(user['password_hash']):
        cursor.execute("UPDATE users SET password_hash = %s, failed_login_attempts = 0, locked_until = NULL WHERE user_id = %s",
                       (hash_password(password), user['user_id']))
    else:
        cursor.execute("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = %s", (user['user_id'],))
    conn.commit()
    return user, None

def send_otp(email, otp):
    """E-mail the one-time passcode. Returns True when it was delivered (or printed in development)."""
    if SMTP_HOST:
        try:
            message = EmailMessage()
            message["Subject"] = "Your Homefind verification code"
            message["From"] = SMTP_FROM
            message["To"] = email
            message.set_content(f"Your Homefind verification code is {otp}. It expires in {OTP_TTL_SECONDS // 60} minutes. "
                                "If you did not try to sign in, please ignore this message.")
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
                if SMTP_STARTTLS:
                    smtp.starttls()
                if SMTP_USER:
                    smtp.login(SMTP_USER, SMTP_PASS)
                smtp.send_message(message)
            return True
        except Exception as exc:
            print(f"Could not send OTP e-mail: {exc!r}")
            return False
    if APP_ENV != "production":
        # Development convenience: the code appears in the SERVER console only, never in the HTTP response.
        print(f"[DEV ONLY] One-time passcode for {email}: {otp}")
        return True
    return False

def send_password_reset_email(email: str, reset_url: str) -> bool:
    """E-mail a password-reset link. Returns True on success."""
    if SMTP_HOST:
        try:
            message = EmailMessage()
            message["Subject"] = "Homefind - Reset your password"
            message["From"] = SMTP_FROM
            message["To"] = email
            message.set_content(
                f"Hello,\n\n"
                f"Someone requested a password reset for your Homefind account.\n\n"
                f"Click the link below to choose a new password (expires in 1 hour):\n\n"
                f"{reset_url}\n\n"
                f"If you did not request this, you can safely ignore this email.\n\n"
                f"- Homefind"
            )
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
                if SMTP_STARTTLS:
                    smtp.starttls()
                if SMTP_USER:
                    smtp.login(SMTP_USER, SMTP_PASS)
                smtp.send_message(message)
            return True
        except Exception as exc:
            print(f"Could not send reset email: {exc!r}")
            return False
    if APP_ENV != "production":
        print(f"[DEV ONLY] Password reset link for {email}: {reset_url}")
        return True
    return False


def send_verification_email(email: str, name: str, verify_url: str) -> bool:
    """E-mail an account verification link after registration. Returns True on success."""
    if SMTP_HOST:
        try:
            message = EmailMessage()
            message["Subject"] = "Homefind - Verify your email address"
            message["From"] = SMTP_FROM
            message["To"] = email
            message.set_content(
                f"Hi {name},\n\n"
                f"Welcome to Homefind! Please click the link below to verify your email and activate your account:\n\n"
                f"{verify_url}\n\n"
                f"This link expires in 24 hours. If you did not create an account, you can ignore this email.\n\n"
                f"- Homefind"
            )
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
                if SMTP_STARTTLS:
                    smtp.starttls()
                if SMTP_USER:
                    smtp.login(SMTP_USER, SMTP_PASS)
                smtp.send_message(message)
            return True
        except Exception as exc:
            print(f"Could not send verification email: {exc!r}")
            return False
    if APP_ENV != "production":
        print(f"[DEV ONLY] Email verification link for {email}: {verify_url}")
        return True
    return False

def verify_otp_step(req: LoginRequest, request: Request):
    pending = sessions.get(req.session_token)
    if not pending or 'expected_otp' not in pending:
        return {"status": "error", "message": "Verification session not found. Please sign in again.", "restart": True}
    if pending.get('expires_at', 0) <= now_ts():
        sessions.pop(req.session_token, None)
        return {"status": "error", "message": "Verification code expired. Please sign in again.", "restart": True}
    if not hmac.compare_digest(str(req.otp).strip().encode(), pending['expected_otp'].encode()):
        pending['otp_attempts'] = pending.get('otp_attempts', 0) + 1
        if pending['otp_attempts'] >= OTP_MAX_ATTEMPTS:
            sessions.pop(req.session_token, None)
            log_audit_action(pending['user_id'], 'OTP_LOCKED', 'users', pending['user_id'], None, 'Too many OTP attempts', request.client.host)
            return {"status": "error", "message": "Too many incorrect codes. Please sign in again.", "restart": True}
        return {"status": "error", "message": "Invalid OTP. Please try again.", "otp_required": True}

    sessions.pop(req.session_token, None)
    token = new_session(pending['user_id'], pending['role'])
    log_audit_action(pending['user_id'], 'LOGIN_SUCCESS', 'users', pending['user_id'], None, 'OTP Verified', request.client.host)
    return {"status": "success", "redirect": DESTINATIONS.get(pending['role'], 'login.html'), "token": token, "role": pending['role']}

@app.post("/api/login")
def login(req: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    rate_limit(f"login:{client_ip}", 20, 300)

    # OTP Verification Step
    if req.session_token and req.otp:
        rate_limit(f"otp:{client_ip}", 10, 300)
        return verify_otp_step(req, request)

    if not req.email or not req.password:
        return {"status": "error", "message": "Email and password are required."}

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")

    cursor = conn.cursor()
    try:
        user, error = authenticate(conn, cursor, req.email, req.password, request.client.host)
        if error:
            return {"status": "error", "message": error}

        # Password aging: if password is older than 90 days, block login and send a reset link.
        days_old = (datetime.datetime.now() - user['password_last_changed']).days
        if days_old > 90:
            # Issue a reset token and email it automatically
            try:
                token = secrets.token_urlsafe(48)
                expires = datetime.datetime.now() + datetime.timedelta(seconds=PASSWORD_RESET_TTL_SECONDS)
                cursor.execute(
                    "INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (%s, %s, %s)",
                    (token, user['user_id'], expires)
                )
                conn.commit()
                reset_url = f"{APP_URL}/reset_password.html?token={token}"
                send_password_reset_email(user['email'], reset_url)
                log_audit_action(user['user_id'], 'PASSWORD_EXPIRED', 'users', user['user_id'], None, None, request.client.host)
            except Exception:
                pass  # Don't block the response if token insert fails
            return {
                "status": "error",
                "password_change_required": True,
                "message": (
                    "Your password has expired (passwords must be updated every 90 days). "
                    "A reset link has been sent to your email address."
                )
            }

        if user['otp_enabled']:
            otp = str(secrets.randbelow(900000) + 100000)
            if not send_otp(user['email'], otp):
                return JSONResponse(status_code=503, content={
                    "status": "error",
                    "message": "We could not send your verification code. Please try again later or contact support."})
            token = secrets.token_urlsafe(32)
            sessions[token] = {
                'user_id': user['user_id'],
                'role': user['role'],
                'expected_otp': otp,
                'otp_attempts': 0,
                'expires_at': now_ts() + OTP_TTL_SECONDS,
            }
            return {"status": "info", "otp_required": True,
                    "message": "A verification code has been sent to your email address.", "session_token": token}

        token = new_session(user['user_id'], user['role'])
        log_audit_action(user['user_id'], 'LOGIN_SUCCESS', 'users', user['user_id'], None, None, request.client.host)
        return {"status": "success", "redirect": DESTINATIONS.get(user['role'], 'login.html'), "token": token, "role": user['role']}
    finally:
        cursor.close()
        conn.close()

# ---------------------------------------------------------------------------
# Self-registration (Tenant / Owner / Agent)
# ---------------------------------------------------------------------------

REGISTER_ROLES = {"Tenant", "Owner", "Agent"}

@app.post("/api/register")
async def register(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    rate_limit(f"register:{client_ip}", 10, 3600)
    data = await read_json_object(request)
    if not data:
        return err("Invalid request body.")

    role = (data.get('role') or '').strip()
    if role not in REGISTER_ROLES:
        return err(f"Role must be one of: {', '.join(sorted(REGISTER_ROLES))}.")

    name, e1 = text_field(data, 'name', 'Name', 255)
    if e1: return err(e1)
    email, e2 = email_field(data)
    if e2: return err(e2)
    password = data.get('password', '')
    pwd_error = validate_new_password(password, email)
    if pwd_error: return err(pwd_error)

    # Role-specific optional fields
    phone = (data.get('phone_number') or '').strip()[:50]
    dob   = (data.get('date_of_birth') or '').strip() or None

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return err("Email already registered")

        user_id = "USR_" + uuid.uuid4().hex[:12]
        hashed  = hash_password(password)
        # All self-registered accounts start inactive:
        # Tenants activate via email verification link; other roles need admin approval.
        cursor.execute("""
            INSERT INTO users (user_id, email, password_hash, role, is_active)
            VALUES (%s, %s, %s, %s, 0)
        """, (user_id, email, hashed, role))

        if role == 'Tenant':
            tenant_id = "TEN_" + uuid.uuid4().hex[:12]
            cursor.execute("""
                INSERT INTO tenant (tenant_id, user_id, name, email, date_of_birth)
                VALUES (%s, %s, %s, %s, %s)
            """, (tenant_id, user_id, name, email, dob))
        elif role == 'Owner':
            owner_id = "OWN_" + uuid.uuid4().hex[:12]
            cursor.execute("""
                INSERT INTO owner (owner_id, user_id, name, email)
                VALUES (%s, %s, %s, %s)
            """, (owner_id, user_id, name, email))
        elif role == 'Agent':
            agent_id = "AGT_" + uuid.uuid4().hex[:12]
            cursor.execute("""
                INSERT INTO agent (agent_id, user_id, name, email, phone_number)
                VALUES (%s, %s, %s, %s, %s)
            """, (agent_id, user_id, name, email, phone or None))

        conn.commit()
        log_audit_action(user_id, 'REGISTER', 'users', user_id, None, role, request.client.host)
        if role == "Tenant":
            # Send email verification link so tenant can activate their own account
            ver_token = secrets.token_urlsafe(48)
            ver_expires = datetime.datetime.now() + datetime.timedelta(hours=24)
            try:
                cursor.execute(
                    "INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (%s, %s, %s)",
                    (ver_token, user_id, ver_expires)
                )
                conn.commit()
            except Exception as ve:
                print(f"Could not store verification token: {ve!r}")
            verify_url = f"{APP_URL}/api/verify_email?token={ver_token}"
            send_verification_email(email, name, verify_url)
            msg = "Account created. Please check your email to verify your account before signing in."
        else:
            msg = "Account created. An admin will review and activate it shortly."
        return {"status": "success", "message": msg}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Registration failed") from exc
    finally:
        cursor.close()
        conn.close()


@app.get("/api/admin/pending_users")
def get_pending_users(admin: dict = Depends(get_admin_user)):
    """Return all accounts with is_active = 0 awaiting admin approval."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT user_id, email, role, created_at
            FROM users WHERE is_active = 0
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        for row in rows:
            if row.get('created_at'):
                row['created_at'] = str(row['created_at'])
        return {"status": "success", "data": rows}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/admin/users/{user_id}/activate")
async def activate_user(user_id: str, request: Request,
                        admin: dict = Depends(get_admin_user)):
    """Approve (activate=true) or reject (activate=false) a pending registration."""
    data = await read_json_object(request)
    activate = bool(data.get('activate', True)) if data else True

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id, email, role, is_active FROM users WHERE user_id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if activate:
            cursor.execute("UPDATE users SET is_active = 1 WHERE user_id = %s", (user_id,))
            action = 'ACTIVATE_USER'
        else:
            # Rejection: delete the user and their role row (cascade handles role table)
            cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
            action = 'REJECT_USER'

        conn.commit()
        log_audit_action(admin['user_id'], action, 'users', user_id, None, user['email'], request.client.host)
        return {"status": "success", "action": action, "user_id": user_id}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Could not update user status") from exc
    finally:
        cursor.close()
        conn.close()


@app.get("/api/verify_email")
async def verify_email(token: str, request: Request):
    """Activate a tenant account via the emailed verification link."""
    if not token:
        return RedirectResponse(url="/verify_email.html?error=invalid", status_code=302)
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT t.user_id, u.email, u.role, t.used, u.is_active, t.expires_at FROM password_reset_tokens t "
            "JOIN users u ON u.user_id = t.user_id "
            "WHERE t.token = %s",
            (token,)
        )
        row = cursor.fetchone()
        if not row:
            return RedirectResponse(url="/verify_email.html?error=invalid", status_code=302)
        if row.get("is_active") == 1:
            return RedirectResponse(url="/verify_email.html?already_verified=1", status_code=302)
        if row.get("used") == 1 or row["expires_at"] <= datetime.datetime.now():
            return RedirectResponse(url="/verify_email.html?error=expired", status_code=302)
        cursor.execute("UPDATE users SET is_active = 1 WHERE user_id = %s", (row["user_id"],))
        cursor.execute("UPDATE password_reset_tokens SET used = 1 WHERE token = %s", (token,))
        conn.commit()
        log_audit_action(row["user_id"], "EMAIL_VERIFIED", "users", row["user_id"], None, None,
                         request.client.host if request.client else "unknown")
        return RedirectResponse(url="/verify_email.html?success=1", status_code=302)
    except Exception as exc:
        conn.rollback()
        return server_error(exc, "verify_email")
    finally:
        cursor.close()
        conn.close()


@app.post("/api/forgot_password")
async def forgot_password(request: Request):
    """Generate a password-reset token and e-mail a link to the user."""
    client_ip = request.client.host if request.client else "unknown"
    rate_limit(f"forgot:{client_ip}", 5, 3600)
    data = await read_json_object(request)
    email = (data.get("email") or "").strip().lower()
    if not email:
        return err("Email is required.")
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id, email FROM users WHERE email = %s AND is_active = 1", (email,))
        user = cursor.fetchone()
        # Always return success to avoid user enumeration
        if user:
            token = secrets.token_urlsafe(48)
            expires = datetime.datetime.now() + datetime.timedelta(seconds=PASSWORD_RESET_TTL_SECONDS)
            cursor.execute(
                "INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (%s, %s, %s)",
                (token, user["user_id"], expires)
            )
            conn.commit()
            reset_url = f"{APP_URL}/reset_password.html?token={token}"
            send_password_reset_email(user["email"], reset_url)
            log_audit_action(user["user_id"], "FORGOT_PASSWORD", "users", user["user_id"], None, None, client_ip)
        return {"status": "success", "message": "If that email is registered, a reset link has been sent."}
    except Exception as exc:
        conn.rollback()
        return server_error(exc, "forgot_password")
    finally:
        cursor.close()
        conn.close()


@app.post("/api/reset_password")
async def reset_password(request: Request):
    """Consume a reset token and set a new password."""
    client_ip = request.client.host if request.client else "unknown"
    rate_limit(f"reset_token:{client_ip}", 10, 3600)
    data = await read_json_object(request)
    token = (data.get("token") or "").strip()
    new_password = data.get("new_password", "")
    if not token or not new_password:
        return err("Token and new password are required.")
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT t.user_id, u.email FROM password_reset_tokens t "
            "JOIN users u ON u.user_id = t.user_id "
            "WHERE t.token = %s AND t.used = 0 AND t.expires_at > NOW()",
            (token,)
        )
        row = cursor.fetchone()
        if not row:
            return err("Reset link is invalid or has expired. Please request a new one.", 400)
        pwd_error = validate_new_password(new_password, row["email"])
        if pwd_error:
            return err(pwd_error)
        cursor.execute(
            "UPDATE users SET password_hash = %s, password_last_changed = NOW(), "
            "failed_login_attempts = 0, locked_until = NULL WHERE user_id = %s",
            (hash_password(new_password), row["user_id"])
        )
        cursor.execute("UPDATE password_reset_tokens SET used = 1 WHERE token = %s", (token,))
        conn.commit()
        purge_user_sessions(row["user_id"])
        log_audit_action(row["user_id"], "PASSWORD_RESET", "users", row["user_id"], None, None, client_ip)
        return {"status": "success", "message": "Password updated. You can now sign in.", "redirect": "login.html"}
    except Exception as exc:
        conn.rollback()
        return server_error(exc, "reset_password")
    finally:
        cursor.close()
        conn.close()


@app.post("/api/change_password")
def change_password(req: ChangePasswordRequest, request: Request):
    problem = validate_new_password(req.new_password, req.email)
    if problem:
        return err(problem)
    if req.new_password == req.current_password:
        return err("Your new password must be different from your current password.")

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        user, error = authenticate(conn, cursor, req.email, req.current_password, request.client.host)
        if error:
            return err(error, 401)
        cursor.execute("UPDATE users SET password_hash = %s, password_last_changed = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE user_id = %s",
                       (hash_password(req.new_password), user['user_id']))
        conn.commit()
        purge_user_sessions(user['user_id'])
        log_audit_action(user['user_id'], 'PASSWORD_CHANGED', 'users', user['user_id'], None, None, request.client.host)
        return {"status": "success", "message": "Password updated. Please sign in with your new password.", "redirect": "login.html"}
    except Exception as exc:
        conn.rollback()
        return server_error(exc, "change_password")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/dashboard")
def get_dashboard(request: Request, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) as cnt FROM property")
        total_listings = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM property WHERE property_status = 'Published'")
        active_listings = cursor.fetchone()['cnt']

        cursor.execute("SELECT SUM(views) as total FROM property")
        res = cursor.fetchone()
        total_views = int(res['total'] or 0)

        # Inquiries count - try, default 0 if table missing
        try:
            cursor.execute("SELECT COUNT(*) as cnt FROM inquiry WHERE status = 'NEW'")
            new_inquiries = cursor.fetchone()['cnt']
            cursor.execute("SELECT COUNT(*) as cnt FROM inquiry")
            total_inquiries = cursor.fetchone()['cnt']

            cursor.execute("""
                SELECT i.inquiry_id, i.name, i.status, i.created_at, p.property_name
                FROM inquiry i
                LEFT JOIN property p ON i.property_id = p.property_id
                ORDER BY i.created_at DESC LIMIT 8
            """)
            recent_inquiries = cursor.fetchall()
            for inq in recent_inquiries:
                if inq.get('created_at'):
                    inq['created_at'] = str(inq['created_at'])
        except Exception as exc:
            print(f"Dashboard inquiry section failed: {exc!r}")
            new_inquiries = 0
            total_inquiries = 0
            recent_inquiries = []

        # Top listings
        cursor.execute("SELECT property_id, property_name, views, created_at FROM property WHERE property_status = 'Published' ORDER BY views DESC LIMIT 5")
        top_listings = cursor.fetchall()
        for t in top_listings:
            if t.get('created_at'):
                t['created_at'] = str(t['created_at'])

        # Recent Audit logs
        cursor.execute("""
            SELECT a.log_id, a.action, a.table_name, a.created_at, u.email as user_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.user_id
            ORDER BY a.created_at DESC LIMIT 5
        """)
        recent_audit_logs = cursor.fetchall()

        # Convert datetime to string for JSON serialization
        for log in recent_audit_logs:
            if log.get('created_at'):
                log['created_at'] = str(log['created_at'])

        return {
            "status": "success",
            "data": {
                "total_listings": total_listings,
                "active_listings": active_listings,
                "total_views": total_views,
                "new_inquiries": new_inquiries,
                "total_inquiries": total_inquiries,
                "recent_inquiries": recent_inquiries,
                "top_listings": top_listings,
                "recent_audit_logs": recent_audit_logs
            }
        }
    except Exception as e:
        return server_error(e, "dashboard")
    finally:
        cursor.close()
        conn.close()

def save_inquiry(data, property_id, subject=None):
    """Validate and store a public message in the inquiry table. Returns an error response or None."""
    name, error = text_field(data, 'name', 'Name', 255)
    if error:
        return err(error)
    email, error = email_field(data)
    if error:
        return err(error)
    phone, error = text_field(data, 'phone', 'Phone', 50, required=False)
    if error:
        return err(error)
    message, error = text_field(data, 'message', 'Message', 5000)
    if error:
        return err(error)
    if subject:
        message = f"[{subject}] {message}"

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        if property_id is not None:
            cursor.execute("SELECT property_id FROM property WHERE property_id = %s AND property_status = 'Published'", (property_id,))
            if not cursor.fetchone():
                return err("Property not found.", 404)
        inquiry_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO inquiry (inquiry_id, property_id, name, email, phone, message, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """, (inquiry_id, property_id, name, email, phone or None, message))
        conn.commit()
        return inquiry_id
    except Exception as exc:
        conn.rollback()
        return server_error(exc, "save_inquiry")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/contact")
async def contact(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    rate_limit(f"inquiry:{client_ip}", 15, 300)
    data = await read_json_object(request)
    if data is None:
        return err("Invalid request.")
    subject, error = text_field(data, 'subject', 'Subject', 200, required=False)
    if error:
        return err(error)

    # Contact-form messages are stored as general inquiries (no property) so the admin inbox shows them.
    result = save_inquiry(data, None, subject or None)
    if isinstance(result, JSONResponse):
        return result
    log_audit_action(None, 'CONTACT_FORM', 'inquiry', result, None, f"From: {data.get('email')}", request.client.host)
    return {"status": "success", "message": "Message received. We will get back to you soon."}

@app.post("/api/submit_inquiry")
async def submit_inquiry(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    rate_limit(f"inquiry:{client_ip}", 15, 300)
    data = await read_json_object(request)
    if data is None:
        return err("Invalid request.")
    property_id, error = text_field(data, 'property_id', 'Property', 50)
    if error:
        return err(error)

    result = save_inquiry(data, property_id)
    if isinstance(result, JSONResponse):
        return result
    log_audit_action(None, 'SUBMIT_INQUIRY', 'inquiry', result, None, f"From: {data.get('email')}", request.client.host)
    return {"status": "success", "message": "Inquiry submitted successfully."}

@app.post("/api/logout")
def logout(user: dict = Depends(get_current_user)):
    sessions.pop(user['token'], None)
    return {"status": "success", "message": "Logged out"}

ALLOWED_IDENTITY_TYPES = {
    "face_photo": {"image/jpeg", "image/png", "image/webp"},
    "national_id_front": {"image/jpeg", "image/png", "image/webp", "application/pdf"},
    "national_id_back": {"image/jpeg", "image/png", "image/webp", "application/pdf"},
    "land_title": {"application/pdf"},
}
MAX_VERIFICATION_FILE_BYTES = 10 * 1024 * 1024

async def save_private_document(document: UploadFile, document_type: str, user_id: str):
    if not document or document.content_type not in ALLOWED_IDENTITY_TYPES[document_type]:
        raise HTTPException(status_code=400, detail=f"Invalid file type for {document_type}")
    content = await document.read(MAX_VERIFICATION_FILE_BYTES + 1)
    if len(content) > MAX_VERIFICATION_FILE_BYTES:
        raise HTTPException(status_code=413, detail="Verification file exceeds 10 MB")
    extension = Path(document.filename or "upload").suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp", ".pdf"}:
        raise HTTPException(status_code=400, detail="Unsupported file extension")
    user_dir = PRIVATE_UPLOAD_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    destination = user_dir / f"{document_type}_{uuid.uuid4().hex}{extension}"
    destination.write_bytes(content)
    return str(destination)

@app.post("/api/verification/documents")
async def upload_verification_documents(
    face_photo: UploadFile = File(...),
    national_id_front: UploadFile = File(...),
    national_id_back: UploadFile = File(...),
    land_title: Optional[UploadFile] = File(None),
    user: dict = Depends(get_verification_user),
):
    if user['role'] == 'Owner' and not land_title:
        raise HTTPException(status_code=400, detail="Owners must upload a land title PDF")
    documents = {
        "face_photo": face_photo,
        "national_id_front": national_id_front,
        "national_id_back": national_id_back,
    }
    if land_title:
        documents["land_title"] = land_title
    saved = []
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        for document_type, document in documents.items():
            path = await save_private_document(document, document_type, user['user_id'])
            cursor.execute(
                "INSERT INTO identity_documents (document_id, user_id, document_type, file_path, uploaded_at) VALUES (%s, %s, %s, %s, NOW())",
                (str(uuid.uuid4()), user['user_id'], document_type, path),
            )
            saved.append(document_type)
        conn.commit()
        log_audit_action(user['user_id'], 'UPLOAD_VERIFICATION_DOCUMENTS', 'identity_documents', user['user_id'], None, ','.join(saved), None)
        return {"status": "success", "documents": saved}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Could not save verification documents") from exc
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/verification/{user_id}")
def get_verification_documents(user_id: str, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT document_id, user_id, document_type, file_path, uploaded_at, verified_at FROM identity_documents WHERE user_id = %s ORDER BY uploaded_at DESC",
            (user_id,),
        )
        return {"status": "success", "data": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/owner/overview")
def get_owner_overview(owner: dict = Depends(get_owner_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT owner_id, name, email FROM owner WHERE user_id = %s", (owner['user_id'],))
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Owner profile not found")
        cursor.execute("""
            SELECT property_id, property_name, city, country, location, latitude, longitude,
                   property_status, price, currency, views, created_at
            FROM property WHERE owner_id = %s ORDER BY created_at DESC
        """, (profile['owner_id'],))
        properties = cursor.fetchall()
        for property_row in properties:
            if property_row.get('created_at'):
                property_row['created_at'] = str(property_row['created_at'])
        cursor.execute("""
            SELECT i.inquiry_id, i.name, i.email, i.message, i.status, i.created_at, p.property_name
            FROM inquiry i JOIN property p ON p.property_id = i.property_id
            WHERE p.owner_id = %s ORDER BY i.created_at DESC LIMIT 20
        """, (profile['owner_id'],))
        inquiries = cursor.fetchall()
        for inquiry in inquiries:
            if inquiry.get('created_at'):
                inquiry['created_at'] = str(inquiry['created_at'])
        cursor.execute("SELECT document_type, uploaded_at, verified_at FROM identity_documents WHERE user_id = %s ORDER BY uploaded_at DESC", (owner['user_id'],))
        documents = cursor.fetchall()
        for document in documents:
            if document.get('uploaded_at'):
                document['uploaded_at'] = str(document['uploaded_at'])
            if document.get('verified_at'):
                document['verified_at'] = str(document['verified_at'])
        return {"status": "success", "data": {"profile": profile, "properties": properties, "inquiries": inquiries, "documents": documents}}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/agent/overview")
def get_agent_overview(agent: dict = Depends(get_agent_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT agent_id, name, email, phone_number FROM agent WHERE user_id = %s", (agent['user_id'],))
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Agent profile not found")
        cursor.execute("""
            SELECT p.property_id, p.property_name, p.city, p.country, p.location,
                   p.latitude, p.longitude, p.property_status, p.price, p.currency,
                   p.views, p.created_at
            FROM listing l
            JOIN advertised_as aa ON aa.listing_id = l.listing_id
            JOIN property p ON p.property_id = aa.property_id
            WHERE l.agent_id = %s ORDER BY p.created_at DESC
        """, (profile['agent_id'],))
        listings = cursor.fetchall()
        for listing in listings:
            if listing.get('created_at'):
                listing['created_at'] = str(listing['created_at'])
        cursor.execute("""
            SELECT i.inquiry_id, i.name, i.email, i.message, i.status, i.created_at, p.property_name
            FROM inquiry i JOIN property p ON p.property_id = i.property_id
            JOIN advertised_as aa ON aa.property_id = p.property_id
            JOIN listing l ON l.listing_id = aa.listing_id
            WHERE l.agent_id = %s ORDER BY i.created_at DESC LIMIT 20
        """, (profile['agent_id'],))
        inquiries = cursor.fetchall()
        for inquiry in inquiries:
            if inquiry.get('created_at'):
                inquiry['created_at'] = str(inquiry['created_at'])
        cursor.execute("SELECT document_type, uploaded_at, verified_at FROM identity_documents WHERE user_id = %s ORDER BY uploaded_at DESC", (agent['user_id'],))
        documents = cursor.fetchall()
        for document in documents:
            if document.get('uploaded_at'):
                document['uploaded_at'] = str(document['uploaded_at'])
            if document.get('verified_at'):
                document['verified_at'] = str(document['verified_at'])
        return {"status": "success", "data": {"profile": profile, "listings": listings, "inquiries": inquiries, "documents": documents}}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/tenant/overview")
def get_tenant_overview(tenant: dict = Depends(get_tenant_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT tenant_id, name, email, date_of_birth, address FROM tenant WHERE user_id = %s", (tenant['user_id'],))
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Tenant profile not found")
        cursor.execute(f"""
            SELECT p.property_id, p.property_name, p.description, p.city, p.country,
                   p.location, p.latitude, p.longitude, p.price, p.currency,
                   p.property_status, p.is_featured, p.views, u.bedrooms, u.bathrooms,
                   u.square_footage, u.monthly_rent, u.availability_status,
                   m.url AS image_url,
                   (SELECT GROUP_CONCAT(DISTINCT am.name ORDER BY am.name SEPARATOR ', ')
                    FROM property_amenity pam JOIN amenity am ON am.amenity_id = pam.amenity_id
                    WHERE pam.property_id = p.property_id) AS amenities
            FROM property p
            {PRIMARY_UNIT_JOIN}
            {FEATURED_MEDIA_JOIN}
            WHERE p.property_status = 'Published'
            ORDER BY p.is_featured DESC, p.created_at DESC, p.property_id ASC
        """)
        properties = cursor.fetchall()
        cursor.execute("""
            SELECT inquiry_id, property_id, name, email, message, status, created_at
            FROM inquiry WHERE email = %s ORDER BY created_at DESC LIMIT 20
        """, (profile['email'],))
        inquiries = cursor.fetchall()
        for inquiry in inquiries:
            if inquiry.get('created_at'):
                inquiry['created_at'] = str(inquiry['created_at'])
        return {"status": "success", "data": {"profile": profile, "properties": properties, "inquiries": inquiries}}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/tenant/viewings")
def get_tenant_viewings(tenant: dict = Depends(get_tenant_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT tenant_id FROM tenant WHERE user_id = %s", (tenant['user_id'],))
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Tenant profile not found")
        cursor.execute("""
            SELECT v.viewing_id, v.property_id, v.unit_number, v.viewing_date,
                   v.viewing_time, v.status, p.property_name, p.city
            FROM viewing v JOIN property p ON p.property_id = v.property_id
            WHERE v.tenant_id = %s ORDER BY v.viewing_date DESC, v.viewing_time DESC
        """, (profile['tenant_id'],))
        rows = cursor.fetchall()
        for row in rows:
            row['viewing_date'] = str(row['viewing_date'])
            row['viewing_time'] = str(row['viewing_time'])
        return {"status": "success", "data": rows}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/tenant/viewings")
async def request_tenant_viewing(request: Request, tenant: dict = Depends(get_tenant_user)):
    data = await request.json()
    required = ('property_id', 'unit_number', 'viewing_date', 'viewing_time')
    if any(not data.get(field) for field in required):
        raise HTTPException(status_code=400, detail="Property, unit, date, and time are required")
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT tenant_id FROM tenant WHERE user_id = %s", (tenant['user_id'],))
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Tenant profile not found")
        # Lock the unit row for the duration of this transaction so two concurrent
        # tenants cannot both read 'Available' and then both succeed in inserting a viewing.
        cursor.execute("""
            SELECT property_id FROM unit
            WHERE property_id = %s AND unit_number = %s AND availability_status = 'Available'
            FOR UPDATE
        """, (data['property_id'], data['unit_number']))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Available unit not found or already booked")
        # Guard against duplicate confirmed/pending viewings on the same unit
        cursor.execute("""
            SELECT viewing_id FROM viewing
            WHERE property_id = %s AND unit_number = %s AND status IN ('pending', 'confirmed')
        """, (data['property_id'], data['unit_number']))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="A viewing for this unit is already pending or confirmed")
        viewing_id = "VIEW_" + uuid.uuid4().hex[:12]
        cursor.execute("""
            INSERT INTO viewing (viewing_id, tenant_id, property_id, unit_number, viewing_date, viewing_time)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (viewing_id, profile['tenant_id'], data['property_id'], data['unit_number'], data['viewing_date'], data['viewing_time']))
        conn.commit()
        log_audit_action(tenant['user_id'], 'REQUEST_VIEWING', 'viewing', viewing_id, None, data['property_id'], request.client.host)
        return {"status": "success", "viewing_id": viewing_id}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Could not request viewing") from exc
    finally:
        cursor.close()
        conn.close()

@app.get("/api/owner/agreements")
def get_owner_agreements(owner: dict = Depends(get_owner_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT owner_id FROM owner WHERE user_id = %s", (owner['user_id'],))
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Owner profile not found")
        cursor.execute("""
            SELECT ra.agreement_id, ra.property_id, ra.unit_number, ra.start_date,
                   ra.end_date, ra.agreed_rent, ra.agreement_status, t.name AS tenant_name,
                   p.property_name
            FROM rental_agreement ra JOIN property p ON p.property_id = ra.property_id
            JOIN tenant t ON t.tenant_id = ra.tenant_id
            WHERE p.owner_id = %s ORDER BY ra.start_date DESC
        """, (profile['owner_id'],))
        rows = cursor.fetchall()
        for row in rows:
            row['start_date'] = str(row['start_date'])
            if row.get('end_date'):
                row['end_date'] = str(row['end_date'])
        return {"status": "success", "data": rows}
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Owner viewing management
# ---------------------------------------------------------------------------

@app.get("/api/owner/viewings")
def get_owner_viewings(owner: dict = Depends(get_owner_user)):
    """Return all viewings for properties owned by this owner."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT owner_id FROM owner WHERE user_id = %s", (owner['user_id'],))
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Owner profile not found")
        cursor.execute("""
            SELECT v.viewing_id, v.property_id, v.unit_number, v.viewing_date,
                   v.viewing_time, v.status, p.property_name, p.city,
                   t.name AS tenant_name, t.email AS tenant_email
            FROM viewing v
            JOIN property p ON p.property_id = v.property_id
            JOIN tenant t ON t.tenant_id = v.tenant_id
            WHERE p.owner_id = %s
            ORDER BY v.viewing_date DESC, v.viewing_time DESC
        """, (profile['owner_id'],))
        rows = cursor.fetchall()
        for row in rows:
            row['viewing_date'] = str(row['viewing_date'])
            row['viewing_time'] = str(row['viewing_time'])
        return {"status": "success", "data": rows}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/viewings/{viewing_id}/status")
async def update_owner_viewing_status(viewing_id: str, request: Request,
                                      owner: dict = Depends(get_owner_user)):
    """Allow an owner to confirm, complete, or cancel a viewing on their property."""
    data = await request.json()
    new_status = (data.get('status') or '').strip()
    allowed = ('Confirmed', 'Completed', 'Cancelled')
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(allowed)}")
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT owner_id FROM owner WHERE user_id = %s", (owner['user_id'],))
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Owner profile not found")
        # Verify the viewing belongs to one of this owner's properties
        cursor.execute("""
            SELECT v.viewing_id, v.status AS old_status
            FROM viewing v JOIN property p ON p.property_id = v.property_id
            WHERE v.viewing_id = %s AND p.owner_id = %s
        """, (viewing_id, profile['owner_id']))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=403, detail="Viewing not found or access denied")
        old_status = row['old_status']
        cursor.execute("UPDATE viewing SET status = %s WHERE viewing_id = %s",
                       (new_status, viewing_id))
        conn.commit()
        log_audit_action(owner['user_id'], 'UPDATE_VIEWING_STATUS', 'viewing',
                         viewing_id, old_status, new_status, request.client.host)
        return {"status": "success", "viewing_id": viewing_id, "new_status": new_status}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Could not update viewing status") from exc
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Owner-managed listings (an Owner can only touch their OWN properties)
# New listings start as 'Draft'; an admin publishes them from admin_listings.html
# ---------------------------------------------------------------------------

def _owner_id_for(cursor, user_id: str) -> str:
    cursor.execute("SELECT owner_id FROM owner WHERE user_id = %s", (user_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Owner profile not found")
    return row['owner_id']

def _assert_owns(cursor, property_id: str, owner_id: str):
    cursor.execute("SELECT property_id FROM property WHERE property_id = %s AND owner_id = %s", (property_id, owner_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Property not found or does not belong to you")

@app.post("/api/owner/listings")
async def owner_create_listing(
    property_name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    property_type: str = Form("Apartment"),
    street: str = Form(""),
    city: str = Form(""),
    country: str = Form("Uganda"),
    district: str = Form(""),
    bedrooms: int = Form(0),
    bathrooms: int = Form(0),
    square_footage: float = Form(0),
    monthly_rent: float = Form(0),
    amenities: str = Form(""),
    image: UploadFile = File(None),
    owner: dict = Depends(get_owner_user)
):
    form = dict(property_name=property_name, description=description, price=price, property_status="Draft",
                property_type=property_type, street=street, city=city, country=country, district=district,
                bedrooms=bedrooms, bathrooms=bathrooms, square_footage=square_footage, monthly_rent=monthly_rent,
                amenities=amenities, owner_id="PENDING")
    clean, error = validate_listing_form(form, creating=True)
    if error:
        return err(error)

    try:
        image_content, image_ext = await read_listing_image(image)
    except ValueError as exc:
        return err(str(exc))

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    saved_file = None
    try:
        owner_id = _owner_id_for(cursor, owner['user_id'])
        property_id = "PROP_" + str(uuid.uuid4())[:8]

        cursor.execute("""
            INSERT INTO property (property_id, property_name, description, price, property_status, street, district, city, country, owner_id)
            VALUES (%s, %s, %s, %s, 'Draft', %s, %s, %s, %s, %s)
        """, (property_id, clean['property_name'], clean['description'], clean['price'],
              clean['street'], clean['district'], clean['city'], clean['country'], owner_id))

        if clean['property_type'] == "Apartment":
            cursor.execute("INSERT INTO apartment (property_id, amenities) VALUES (%s, %s)", (property_id, clean['amenities']))
        elif clean['property_type'] == "Condominium":
            cursor.execute("INSERT INTO condominium (property_id, amenities) VALUES (%s, %s)", (property_id, clean['amenities']))
        elif clean['property_type'] == "Rental House":
            cursor.execute("INSERT INTO rental_house (property_id) VALUES (%s)", (property_id,))

        if clean['bedrooms'] or clean['bathrooms'] or clean['square_footage'] or clean['monthly_rent']:
            cursor.execute("""
                INSERT INTO unit (property_id, unit_number, bedrooms, bathrooms, square_footage, monthly_rent, availability_status)
                VALUES (%s, 'MAIN', %s, %s, %s, %s, 'Available')
            """, (property_id, clean['bedrooms'], clean['bathrooms'], clean['square_footage'], clean['monthly_rent'] or clean['price']))

        if image_content:
            saved_file = write_listing_image(property_id, image_content, image_ext)
            cursor.execute("INSERT INTO property_media (media_id, property_id, url, type, is_featured) VALUES (%s, %s, %s, 'IMAGE', 1)",
                           (str(uuid.uuid4()), property_id, f"/uploads/{saved_file}"))

        conn.commit()
        log_audit_action(owner['user_id'], 'OWNER_CREATE_PROPERTY', 'property', property_id, None, f"Draft: {clean['property_name']}", None)
        return {"status": "success", "message": "Listing saved as Draft. An admin will review and publish it."}
    except HTTPException:
        conn.rollback()
        if saved_file:
            (UPLOAD_DIR / saved_file).unlink(missing_ok=True)
        raise
    except Exception as e:
        conn.rollback()
        if saved_file:
            (UPLOAD_DIR / saved_file).unlink(missing_ok=True)
        return server_error(e, "owner_create_listing")
    finally:
        cursor.close()
        conn.close()

@app.put("/api/owner/listings/{property_id}")
async def owner_update_listing(
    property_id: str,
    property_name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    property_type: str = Form("Apartment"),
    street: str = Form(""),
    city: str = Form(""),
    country: str = Form("Uganda"),
    district: str = Form(""),
    bedrooms: int = Form(0),
    bathrooms: int = Form(0),
    square_footage: float = Form(0),
    monthly_rent: float = Form(0),
    amenities: str = Form(""),
    image: UploadFile = File(None),
    owner: dict = Depends(get_owner_user)
):
    form = dict(property_name=property_name, description=description, price=price, property_status="Draft",
                property_type=property_type, street=street, city=city, country=country, district=district,
                bedrooms=bedrooms, bathrooms=bathrooms, square_footage=square_footage, monthly_rent=monthly_rent,
                amenities=amenities, owner_id="PENDING")
    clean, error = validate_listing_form(form, creating=False)
    if error:
        return err(error)

    try:
        image_content, image_ext = await read_listing_image(image)
    except ValueError as exc:
        return err(str(exc))

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    saved_file = None
    try:
        owner_id = _owner_id_for(cursor, owner['user_id'])
        _assert_owns(cursor, property_id, owner_id)

        cursor.execute("""
            UPDATE property SET property_name=%s, description=%s, price=%s, street=%s, district=%s, city=%s, country=%s
            WHERE property_id=%s AND owner_id=%s
        """, (clean['property_name'], clean['description'], clean['price'], clean['street'], clean['district'], clean['city'], clean['country'], property_id, owner_id))

        cursor.execute("""
            UPDATE unit SET bedrooms=%s, bathrooms=%s, square_footage=%s, monthly_rent=%s
            WHERE property_id=%s AND unit_number='MAIN'
        """, (clean['bedrooms'], clean['bathrooms'], clean['square_footage'], clean['monthly_rent'] or clean['price'], property_id))

        if image_content:
            old_urls = get_property_image_urls(cursor, property_id)
            saved_file = write_listing_image(property_id, image_content, image_ext)
            cursor.execute("DELETE FROM property_media WHERE property_id=%s", (property_id,))
            cursor.execute("INSERT INTO property_media (media_id, property_id, url, type, is_featured) VALUES (%s, %s, %s, 'IMAGE', 1)",
                           (str(uuid.uuid4()), property_id, f"/uploads/{saved_file}"))
            delete_upload_files(old_urls)

        conn.commit()
        log_audit_action(owner['user_id'], 'OWNER_UPDATE_PROPERTY', 'property', property_id, None, f"Updated: {clean['property_name']}", None)
        return {"status": "success", "message": "Listing updated successfully"}
    except HTTPException:
        conn.rollback()
        if saved_file:
            (UPLOAD_DIR / saved_file).unlink(missing_ok=True)
        raise
    except Exception as e:
        conn.rollback()
        if saved_file:
            (UPLOAD_DIR / saved_file).unlink(missing_ok=True)
        return server_error(e, "owner_update_listing")
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/owner/listings/{property_id}")
def owner_delete_listing(property_id: str, owner: dict = Depends(get_owner_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        owner_id = _owner_id_for(cursor, owner['user_id'])
        _assert_owns(cursor, property_id, owner_id)
        old_urls = get_property_image_urls(cursor, property_id)
        cursor.execute("DELETE FROM property WHERE property_id = %s AND owner_id = %s", (property_id, owner_id))
        conn.commit()
        delete_upload_files(old_urls)
        log_audit_action(owner['user_id'], 'OWNER_DELETE_PROPERTY', 'property', property_id, None, "Deleted by owner", None)
        return {"status": "success", "message": "Listing deleted"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        return server_error(e, "owner_delete_listing")
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# Agent viewing management
# ---------------------------------------------------------------------------

@app.get("/api/agent/viewings")
def get_agent_viewings(agent: dict = Depends(get_agent_user)):
    """Return all viewings for properties this agent has a listing for."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT agent_id FROM agent WHERE user_id = %s", (agent['user_id'],))
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Agent profile not found")
        cursor.execute("""
            SELECT DISTINCT v.viewing_id, v.property_id, v.unit_number, v.viewing_date,
                   v.viewing_time, v.status, p.property_name, p.city,
                   t.name AS tenant_name, t.email AS tenant_email
            FROM viewing v
            JOIN property p ON p.property_id = v.property_id
            JOIN advertised_as aa ON aa.property_id = p.property_id
            JOIN listing l ON l.listing_id = aa.listing_id
            JOIN tenant t ON t.tenant_id = v.tenant_id
            WHERE l.agent_id = %s
            ORDER BY v.viewing_date DESC, v.viewing_time DESC
        """, (profile['agent_id'],))
        rows = cursor.fetchall()
        for row in rows:
            row['viewing_date'] = str(row['viewing_date'])
            row['viewing_time'] = str(row['viewing_time'])
        return {"status": "success", "data": rows}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/agent/viewings/{viewing_id}/status")
async def update_agent_viewing_status(viewing_id: str, request: Request,
                                      agent: dict = Depends(get_agent_user)):
    """Allow an agent to confirm, complete, or cancel a viewing on their listed property."""
    data = await request.json()
    new_status = (data.get('status') or '').strip()
    allowed = ('Confirmed', 'Completed', 'Cancelled')
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(allowed)}")
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT agent_id FROM agent WHERE user_id = %s", (agent['user_id'],))
        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Agent profile not found")
        # Verify the viewing belongs to a property this agent manages
        cursor.execute("""
            SELECT v.viewing_id, v.status AS old_status
            FROM viewing v
            JOIN advertised_as aa ON aa.property_id = v.property_id
            JOIN listing l ON l.listing_id = aa.listing_id
            WHERE v.viewing_id = %s AND l.agent_id = %s
            LIMIT 1
        """, (viewing_id, profile['agent_id']))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=403, detail="Viewing not found or access denied")
        old_status = row['old_status']
        cursor.execute("UPDATE viewing SET status = %s WHERE viewing_id = %s",
                       (new_status, viewing_id))
        conn.commit()
        log_audit_action(agent['user_id'], 'UPDATE_VIEWING_STATUS', 'viewing',
                         viewing_id, old_status, new_status, request.client.host)
        return {"status": "success", "viewing_id": viewing_id, "new_status": new_status}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Could not update viewing status") from exc
    finally:
        cursor.close()
        conn.close()


@app.get("/api/admin/agents")
def get_agents(admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT agent_id, user_id, name, phone_number, email FROM agent ORDER BY name ASC")
        agents = cursor.fetchall()
        return {"status": "success", "data": agents}
    except Exception as e:
        return server_error(e, "get_agents")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/admin/agents")
def create_agent(req: AgentCreate, admin: dict = Depends(get_admin_user)):
    data = {"name": req.name, "phone_number": req.phone_number, "email": req.email}
    name, error = text_field(data, 'name', 'Name', 255)
    if error:
        return err(error)
    phone, error = text_field(data, 'phone_number', 'Phone number', 50)
    if error:
        return err(error)
    email, error = email_field(data)
    if error:
        return err(error)
    problem = validate_new_password(req.password, email)
    if problem:
        return err(problem)

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return err("Email already registered")

        user_id = "AGT_U_" + str(uuid.uuid4())[:8]
        agent_id = "AGT_" + str(uuid.uuid4())[:8]
        password_hash = hash_password(req.password)

        cursor.execute("INSERT INTO users (user_id, email, password_hash, role) VALUES (%s, %s, %s, 'Agent')", (user_id, email, password_hash))
        cursor.execute("INSERT INTO agent (agent_id, user_id, name, email, phone_number) VALUES (%s, %s, %s, %s, %s)", (agent_id, user_id, name, email, phone))
        conn.commit()

        log_audit_action(admin['user_id'], 'CREATE_AGENT', 'agent', agent_id, None, f"Name: {name}", None)
        return {"status": "success", "message": "Agent created successfully"}
    except Exception as e:
        conn.rollback()
        return server_error(e, "create_agent")
    finally:
        cursor.close()
        conn.close()

@app.put("/api/admin/agents/{agent_id}")
def update_agent(agent_id: str, req: AgentUpdate, admin: dict = Depends(get_admin_user)):
    data = {"name": req.name, "phone_number": req.phone_number}
    name, error = text_field(data, 'name', 'Name', 255)
    if error:
        return err(error)
    phone, error = text_field(data, 'phone_number', 'Phone number', 50)
    if error:
        return err(error)

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT agent_id FROM agent WHERE agent_id = %s", (agent_id,))
        if not cursor.fetchone():
            return err("Agent not found", 404)
        cursor.execute("UPDATE agent SET name = %s, phone_number = %s WHERE agent_id = %s", (name, phone, agent_id))
        conn.commit()
        log_audit_action(admin['user_id'], 'UPDATE_AGENT', 'agent', agent_id, None, f"Updated name/phone", None)
        return {"status": "success", "message": "Agent updated"}
    except Exception as e:
        conn.rollback()
        return server_error(e, "update_agent")
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/admin/agents/{agent_id}")
def delete_agent(agent_id: str, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id, name FROM agent WHERE agent_id = %s", (agent_id,))
        agent = cursor.fetchone()
        if not agent:
            return err("Agent not found", 404)

        # Remove the agent record AND the login in one transaction (listings keep existing; their agent_id becomes NULL).
        cursor.execute("DELETE FROM agent WHERE agent_id = %s", (agent_id,))
        if agent['user_id']:
            cursor.execute("DELETE FROM users WHERE user_id = %s", (agent['user_id'],))
        conn.commit()
        if agent['user_id']:
            purge_user_sessions(agent['user_id'])

        log_audit_action(admin['user_id'], 'DELETE_AGENT', 'agent', agent_id, agent['name'], None, None)
        return {"status": "success", "message": "Agent deleted"}
    except Exception as e:
        conn.rollback()
        return server_error(e, "delete_agent")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/owners")
def get_owners(admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT owner_id, name, email FROM owner ORDER BY name ASC")
        return {"status": "success", "data": cursor.fetchall()}
    except Exception as e:
        return server_error(e, "get_owners")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/listings")
def get_admin_listings(admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT p.property_id, p.property_name, p.city, p.price, p.property_status, p.created_at, p.views
            FROM property p ORDER BY p.created_at DESC
        """)
        listings = cursor.fetchall()
        for l in listings:
            if l.get('created_at'):
                l['created_at'] = str(l['created_at'])
        return {"status": "success", "data": listings}
    finally:
        cursor.close()
        conn.close()

def validate_listing_form(f, creating):
    """Validate the raw admin listing form values. Returns (clean_dict, error_message)."""
    clean = {}
    for key, label, max_len, required in [
        ('property_name', 'Property title', 255, True), ('description', 'Description', 10000, True),
        ('street', 'Street', 255, False), ('district', 'District', 255, False),
        ('city', 'City', 255, False), ('country', 'Country', 255, False),
        ('amenities', 'Amenities', 2000, False)]:
        value, error = text_field(f, key, label, max_len, required)
        if error:
            return None, error
        clean[key] = value

    status = (f.get('property_status') or '').strip()
    if status not in PROPERTY_STATUSES:
        return None, "Status must be one of: " + ", ".join(sorted(PROPERTY_STATUSES)) + "."
    clean['property_status'] = status

    if creating:
        ptype = (f.get('property_type') or 'Apartment').strip()
        if ptype not in PROPERTY_TYPES:
            return None, "Property type must be one of: " + ", ".join(sorted(PROPERTY_TYPES)) + "."
        clean['property_type'] = ptype

    for key, label, low, high, integer in [
        ('price', 'Price', 0.01, MAX_MONEY, False), ('bedrooms', 'Bedrooms', 0, 100, True),
        ('bathrooms', 'Bathrooms', 0, 100, True), ('square_footage', 'Size', 0, 10000000, False),
        ('monthly_rent', 'Monthly rent', 0, MAX_MONEY, False)]:
        value, error = number_field(f.get(key, 0), label, low, high, integer)
        if error:
            return None, error
        clean[key] = value
    clean['owner_id'] = (f.get('owner_id') or '').strip()
    return clean, None

@app.post("/api/admin/listings")
async def create_admin_listing(
    property_name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    property_status: str = Form(...),
    property_type: str = Form("Apartment"),
    street: str = Form(""),
    city: str = Form(""),
    country: str = Form(""),
    district: str = Form(""),
    bedrooms: int = Form(0),
    bathrooms: int = Form(0),
    square_footage: float = Form(0),
    monthly_rent: float = Form(0),
    amenities: str = Form(""),
    owner_id: str = Form(""),
    image: UploadFile = File(None),
    admin: dict = Depends(get_admin_user)
):
    form = dict(property_name=property_name, description=description, price=price, property_status=property_status,
                property_type=property_type, street=street, city=city, country=country, district=district,
                bedrooms=bedrooms, bathrooms=bathrooms, square_footage=square_footage, monthly_rent=monthly_rent,
                amenities=amenities, owner_id=owner_id)
    clean, error = validate_listing_form(form, creating=True)
    if error:
        return err(error)
    if not clean['owner_id']:
        return err("Please choose the owner of this listing.")
    try:
        image_content, image_ext = await read_listing_image(image)
    except ValueError as exc:
        return err(str(exc))

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    saved_file = None
    try:
        cursor.execute("SELECT owner_id FROM owner WHERE owner_id = %s", (clean['owner_id'],))
        if not cursor.fetchone():
            return err("The selected owner does not exist.")

        property_id = "PROP_" + str(uuid.uuid4())[:8]
        cursor.execute("""
            INSERT INTO property (property_id, property_name, description, price, property_status, street, district, city, country, owner_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (property_id, clean['property_name'], clean['description'], clean['price'], clean['property_status'],
              clean['street'], clean['district'], clean['city'], clean['country'], clean['owner_id']))

        # Insert into subtype table
        if clean['property_type'] == "Apartment":
            cursor.execute("INSERT INTO apartment (property_id, amenities) VALUES (%s, %s)", (property_id, clean['amenities']))
        elif clean['property_type'] == "Condominium":
            cursor.execute("INSERT INTO condominium (property_id, amenities) VALUES (%s, %s)", (property_id, clean['amenities']))
        elif clean['property_type'] == "Rental House":
            cursor.execute("INSERT INTO rental_house (property_id) VALUES (%s)", (property_id,))

        # Insert a unit record with room/size details
        if clean['bedrooms'] or clean['bathrooms'] or clean['square_footage'] or clean['monthly_rent']:
            cursor.execute("""
                INSERT INTO unit (property_id, unit_number, bedrooms, bathrooms, square_footage, monthly_rent, availability_status)
                VALUES (%s, 'MAIN', %s, %s, %s, %s, 'Available')
            """, (property_id, clean['bedrooms'], clean['bathrooms'], clean['square_footage'], clean['monthly_rent'] or clean['price']))

        # Save image if provided (type already verified from the file's own bytes)
        if image_content:
            saved_file = write_listing_image(property_id, image_content, image_ext)
            cursor.execute("INSERT INTO property_media (media_id, property_id, url, type, is_featured) VALUES (%s, %s, %s, 'IMAGE', 1)",
                           (str(uuid.uuid4()), property_id, f"/uploads/{saved_file}"))

        conn.commit()
        log_audit_action(admin['user_id'], 'CREATE_PROPERTY', 'property', property_id, None, f"Name: {clean['property_name']}", None)
        return {"status": "success", "message": "Property added successfully"}
    except Exception as e:
        conn.rollback()
        if saved_file:
            (UPLOAD_DIR / saved_file).unlink(missing_ok=True)
        return server_error(e, "create_admin_listing")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/listings/{property_id}")
def get_admin_listing(property_id: str, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            SELECT p.*, u.bedrooms, u.bathrooms, u.square_footage, u.monthly_rent,
                   COALESCE(a.amenities, c.amenities, '') as amenities
            FROM property p
            {PRIMARY_UNIT_JOIN}
            LEFT JOIN apartment a ON p.property_id = a.property_id
            LEFT JOIN condominium c ON p.property_id = c.property_id
            WHERE p.property_id = %s
        """, (property_id,))
        prop = cursor.fetchone()
        if not prop:
            return err("Not found", 404)
        if prop.get('created_at'):
            prop['created_at'] = str(prop['created_at'])
        return {"status": "success", "data": prop}
    finally:
        cursor.close()
        conn.close()

@app.put("/api/admin/listings/{property_id}")
async def update_admin_listing(
    property_id: str,
    property_name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    property_status: str = Form(...),
    street: str = Form(""),
    city: str = Form(""),
    country: str = Form(""),
    district: str = Form(""),
    bedrooms: int = Form(0),
    bathrooms: int = Form(0),
    square_footage: float = Form(0),
    monthly_rent: float = Form(0),
    amenities: str = Form(""),
    owner_id: str = Form(""),
    image: UploadFile = File(None),
    admin: dict = Depends(get_admin_user)
):
    form = dict(property_name=property_name, description=description, price=price, property_status=property_status,
                street=street, city=city, country=country, district=district, bedrooms=bedrooms, bathrooms=bathrooms,
                square_footage=square_footage, monthly_rent=monthly_rent, amenities=amenities, owner_id=owner_id)
    clean, error = validate_listing_form(form, creating=False)
    if error:
        return err(error)
    try:
        image_content, image_ext = await read_listing_image(image)
    except ValueError as exc:
        return err(str(exc))

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    saved_file = None
    replaced_urls = []
    try:
        cursor.execute("SELECT property_id FROM property WHERE property_id = %s", (property_id,))
        if not cursor.fetchone():
            return err("Property not found.", 404)
        if clean['owner_id']:
            cursor.execute("SELECT owner_id FROM owner WHERE owner_id = %s", (clean['owner_id'],))
            if not cursor.fetchone():
                return err("The selected owner does not exist.")
            cursor.execute("UPDATE property SET owner_id=%s WHERE property_id=%s", (clean['owner_id'], property_id))

        cursor.execute("""
            UPDATE property SET property_name=%s, description=%s, price=%s, property_status=%s,
            street=%s, district=%s, city=%s, country=%s
            WHERE property_id=%s
        """, (clean['property_name'], clean['description'], clean['price'], clean['property_status'],
              clean['street'], clean['district'], clean['city'], clean['country'], property_id))

        # Update ONLY the property's primary unit (the one shown in the edit form); other units are left untouched.
        cursor.execute(f"""
            SELECT u2.unit_number, u2.monthly_rent FROM unit u2 WHERE u2.property_id = %s
            ORDER BY {PRIMARY_UNIT_ORDER} LIMIT 1
        """, (property_id,))
        primary = cursor.fetchone()
        if primary:
            rent = clean['monthly_rent'] or primary['monthly_rent'] or clean['price']
            cursor.execute("""
                UPDATE unit SET bedrooms=%s, bathrooms=%s, square_footage=%s, monthly_rent=%s
                WHERE property_id=%s AND unit_number=%s
            """, (clean['bedrooms'], clean['bathrooms'], clean['square_footage'], rent, property_id, primary['unit_number']))
        else:
            cursor.execute("""
                INSERT INTO unit (property_id, unit_number, bedrooms, bathrooms, square_footage, monthly_rent, availability_status)
                VALUES (%s, 'MAIN', %s, %s, %s, %s, 'Available')
            """, (property_id, clean['bedrooms'], clean['bathrooms'], clean['square_footage'], clean['monthly_rent'] or clean['price']))

        # Update amenities
        cursor.execute("UPDATE apartment SET amenities=%s WHERE property_id=%s", (clean['amenities'], property_id))
        cursor.execute("UPDATE condominium SET amenities=%s WHERE property_id=%s", (clean['amenities'], property_id))

        # New image: replaces the current featured image only; the rest of the gallery is kept.
        if image_content:
            cursor.execute("SELECT url FROM property_media WHERE property_id=%s AND is_featured=1", (property_id,))
            replaced_urls = [row['url'] for row in cursor.fetchall()]
            saved_file = write_listing_image(property_id, image_content, image_ext)
            cursor.execute("DELETE FROM property_media WHERE property_id=%s AND is_featured=1", (property_id,))
            cursor.execute("INSERT INTO property_media (media_id, property_id, url, type, is_featured) VALUES (%s, %s, %s, 'IMAGE', 1)",
                           (str(uuid.uuid4()), property_id, f"/uploads/{saved_file}"))

        conn.commit()
    except Exception as e:
        conn.rollback()
        if saved_file:
            (UPLOAD_DIR / saved_file).unlink(missing_ok=True)
        return server_error(e, "update_admin_listing")
    finally:
        cursor.close()
        conn.close()

    delete_upload_files(replaced_urls)
    log_audit_action(admin['user_id'], 'UPDATE_PROPERTY', 'property', property_id, None, f"Updated: {clean['property_name']}", None)
    return {"status": "success", "message": "Property updated successfully"}

@app.delete("/api/admin/listings/{property_id}")
def delete_admin_listing(property_id: str, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT property_name FROM property WHERE property_id = %s", (property_id,))
        prop = cursor.fetchone()
        if not prop:
            return err("Property not found.", 404)
        cursor.execute("SELECT url FROM property_media WHERE property_id = %s", (property_id,))
        media_urls = [row['url'] for row in cursor.fetchall()]
        cursor.execute("DELETE FROM property WHERE property_id = %s", (property_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return server_error(e, "delete_admin_listing")
    finally:
        cursor.close()
        conn.close()

    delete_upload_files(media_urls)
    log_audit_action(admin['user_id'], 'DELETE_PROPERTY', 'property', property_id, prop['property_name'], None, None)
    return {"status": "success", "message": "Property deleted successfully"}

@app.get("/api/admin/inquiries")
def get_admin_inquiries(admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT i.inquiry_id, i.name, i.email, i.phone, i.message, i.status, i.created_at,
                   p.property_name, p.property_id
            FROM inquiry i
            LEFT JOIN property p ON i.property_id = p.property_id
            ORDER BY i.created_at DESC
        """)
        inquiries = cursor.fetchall()
        for inq in inquiries:
            if inq.get('created_at'):
                inq['created_at'] = str(inq['created_at'])
        return {"status": "success", "data": inquiries}
    finally:
        cursor.close()
        conn.close()

@app.put("/api/admin/inquiries/{inquiry_id}/status")
async def update_inquiry_status(inquiry_id: str, request: Request, admin: dict = Depends(get_admin_user)):
    data = await read_json_object(request)
    if data is None:
        return err("Invalid request.")
    new_status = data.get('status', 'IN_PROGRESS')
    if new_status == 'READ':
        new_status = 'IN_PROGRESS'
    if new_status not in INQUIRY_STATUSES:
        return err("Status must be one of: " + ", ".join(sorted(INQUIRY_STATUSES)) + ".")
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT inquiry_id FROM inquiry WHERE inquiry_id = %s", (inquiry_id,))
        if not cursor.fetchone():
            return err("Inquiry not found.", 404)
        cursor.execute("UPDATE inquiry SET status=%s WHERE inquiry_id=%s", (new_status, inquiry_id))
        conn.commit()
        return {"status": "success", "message": "Status updated"}
    finally:
        cursor.close()
        conn.close()

# Warn loudly if the well-known demo accounts from seed.sql / test_users.sql exist in production.
DEMO_ACCOUNT_EMAILS = (
    "owner@homefind.com", "admin@homefind.com", "agent@homefind.com", "tenant@homefind.com",
    "test_admin@homefind.com", "test_owner@homefind.com", "test_agent@homefind.com", "test_tenant@homefind.com",
)

def find_demo_accounts():
    conn = get_db_connection()
    if not conn:
        return []
    cursor = conn.cursor()
    try:
        marks = ", ".join(["%s"] * len(DEMO_ACCOUNT_EMAILS))
        cursor.execute(f"SELECT email FROM users WHERE email IN ({marks})", DEMO_ACCOUNT_EMAILS)
        return [row['email'] for row in cursor.fetchall()]
    except Exception as exc:
        print(f"Could not check for demo accounts: {exc!r}")
        return []
    finally:
        cursor.close()
        conn.close()

@app.on_event("startup")
def warn_about_demo_accounts():
    if APP_ENV != "production":
        return
    found = find_demo_accounts()
    if found:
        print("WARNING: demo/test accounts with publicly known passwords exist in this PRODUCTION database: "
              + ", ".join(found) + ". Delete them or change their passwords immediately.")

# Mount static files at root
app.mount("/", StaticFiles(directory="static", html=True), name="static")
